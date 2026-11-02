// Recover the exact deployed source; reuse local bytes only on a SHA-1 match.
// Credentials stay in memory. No production state is changed.
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
const root=process.cwd(),deployment='dpl_8iE2xExHSSzYUS8ExjZK7xVKpmzf';
const project=JSON.parse(await readFile(path.join(root,'.vercel/project.json'),'utf8'));
const auth=JSON.parse(await readFile(path.join(os.homedir(),'Library/Application Support/com.vercel.cli/auth.json'),'utf8'));
const headers={Authorization:`Bearer ${auth.token}`};
const api=`https://api.vercel.com`;
const treeResponse=await fetch(`${api}/v6/deployments/${deployment}/files?teamId=${project.orgId}`,{headers});
if(!treeResponse.ok)throw Error(`Source tree HTTP ${treeResponse.status}`);
const tree=await treeResponse.json(),source=tree.find(n=>n.name==='src'&&n.type==='directory');
if(!source)throw Error('No deployment source tree');
const files=[];
function walk(nodes,parent=''){
 for(const n of nodes){
  const relative=path.join(parent,n.name);
  if(path.isAbsolute(relative)||relative.split(path.sep).includes('..'))throw Error('Invalid source path');
  if(n.type==='directory')walk(n.children??[],relative);
  else if(n.type==='file')files.push({path:relative,sha1:n.uid});
  else throw Error('Unexpected source entry');
 }
}
walk(source.children);
const stage=await mkdtemp(path.join(os.tmpdir(),'kb-source-recovered-20261029-'));
const digest=bytes=>createHash('sha1').update(bytes).digest('hex');
let cursor=0,reused=0,downloaded=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<files.length){
  const f=files[cursor++];let bytes;
  try{const local=await readFile(path.join(root,f.path));if(digest(local)===f.sha1){bytes=local;reused++;}}catch{}
  if(!bytes){
   const response=await fetch(`${api}/v8/deployments/${deployment}/files/${f.sha1}?teamId=${project.orgId}`,{headers});
   if(!response.ok)throw Error(`Source file HTTP ${response.status}: ${f.path}`);
   const wire=await response.json();
   if(typeof wire.data!=='string')throw Error(`Unexpected payload: ${f.path}`);
   const text=Buffer.from(wire.data),base64=Buffer.from(wire.data,'base64');
   bytes=digest(text)===f.sha1?text:base64;
   if(digest(bytes)!==f.sha1)throw Error(`Source digest mismatch: ${f.path}`);
   downloaded++;
  }
  const target=path.join(stage,f.path);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);
 }
}));
await mkdir(path.join(stage,'.vercel'),{recursive:true});
await writeFile(path.join(stage,'.vercel/project.json'),JSON.stringify(project),{mode:0o600});
const result={at:new Date().toISOString(),deployment,stage,fileCount:files.length,reused,downloaded,files};
await writeFile(path.join(root,'docs/release-next-20261029/recovered-production-source.json'),JSON.stringify(result,null,2)+'\n');
await writeFile('/private/tmp/kb-release-stage-20261029',stage,{mode:0o600});
console.log(JSON.stringify({stage,fileCount:files.length,reused,downloaded,allFilesSHA1Verified:true}));
