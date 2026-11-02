import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {list,get} from '@vercel/blob';
import {SupabaseObjects} from '../../server/supabaseObjects.ts';

// No delete, overwrite, fallback, or deployment. Run with writes paused.
const [mode,archiveArg]=process.argv.slice(2);
if(!['export','check','import'].includes(mode)||!archiveArg)throw Error('Usage: migrate.mts export|check|import PRIVATE_ARCHIVE_DIR');
const archive=resolve(archiveArg),prefix='production-release-20261023/';
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const safe=(key:string)=>key.length>0&&!key.startsWith('/')&&key.split('/').every(s=>s&&s!=='.'&&s!=='..');
type Item={key:string;size:number;sha256:string;contentType:string;sourceEtag:string};
type Archive={namespace:string;items:Item[]};
let phase='preflight';
try{
 if(mode==='export'){
  if(!process.env.BLOB_READ_WRITE_TOKEN)throw Error('Source credential missing');
  await mkdir(archive,{recursive:true,mode:0o700});
  const inventory=async()=>{let cursor:string|undefined;const entries=[];do{const page=await list({prefix,cursor,limit:1000});entries.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);return entries.sort((a,b)=>a.pathname.localeCompare(b.pathname));};
  phase='source-list';const before=await inventory();if(!before.length)throw Error('Empty source');
  const items:Item[]=[];
  for(const entry of before){
   const key=entry.pathname.slice(prefix.length);if(!safe(key))throw Error('Invalid source key');
   phase='source-download';const object=await get(entry.pathname,{access:'private',useCache:false,headers:{'Accept-Encoding':'identity'}});
   if(!object?.stream||object.blob.etag!==entry.etag)throw Error('Missing or changed source');
   const body=Buffer.from(await new Response(object.stream).arrayBuffer());if(body.length!==entry.size)throw Error('Source size changed');
   const file=resolve(archive,'objects',key);await mkdir(dirname(file),{recursive:true,mode:0o700});await writeFile(file,body,{mode:0o600,flag:'wx'});
   items.push({key,size:body.length,sha256:sha(body),contentType:object.blob.contentType??'application/octet-stream',sourceEtag:entry.etag});
  }
  phase='source-stability';const after=await inventory();const signature=(rows:typeof before)=>rows.map(x=>[x.pathname,x.etag,x.size]);
  if(JSON.stringify(signature(before))!==JSON.stringify(signature(after)))throw Error('Source changed during export');
  await writeFile(resolve(archive,'manifest.json'),JSON.stringify({namespace:prefix,items} satisfies Archive,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify({operation:'export',objects:items.length,bytes:items.reduce((n,x)=>n+x.size,0)}));
 }else{
  phase='archive-check';const manifestBytes=await readFile(resolve(archive,'manifest.json'));const manifest=JSON.parse(manifestBytes.toString()) as Archive;
  if(manifest.namespace!==prefix||!manifest.items.length||new Set(manifest.items.map(x=>x.key)).size!==manifest.items.length)throw Error('Invalid archive');
  // Validate EVERY original before the first destination write.
  for(const item of manifest.items){if(!safe(item.key))throw Error('Invalid archive key');const body=await readFile(resolve(archive,'objects',item.key));if(body.length!==item.size||sha(body)!==item.sha256)throw Error('Archive integrity mismatch');}
  const summary={objects:manifest.items.length,bytes:manifest.items.reduce((n,x)=>n+x.size,0),manifestSHA256:sha(manifestBytes)};
  if(mode==='import'){
   phase='destination-connect';const target=SupabaseObjects.fromEnv();if(target.prefix!==prefix)throw Error('Destination namespace mismatch');
   // Existing equal objects permit resuming. Conflicting bytes stop without overwrite.
   for(const item of manifest.items){phase='destination-import';const body=await readFile(resolve(archive,'objects',item.key));let saved=await target.read(item.key);if(!saved){await target.write(item.key,body,null,item.contentType);saved=await target.read(item.key);}if(!saved||saved.contentType!==item.contentType||sha(saved.data)!==item.sha256)throw Error('Destination integrity mismatch');}
   phase='destination-count';const keys=await target.list('');if(keys.length!==manifest.items.length||keys.some(k=>!manifest.items.some(x=>x.key===k)))throw Error('Destination key set mismatch');
   await writeFile(resolve(archive,'import-verified.json'),JSON.stringify({verifiedAt:new Date().toISOString(),...summary},null,2)+'\n',{mode:0o600});
  }
  console.log(JSON.stringify({operation:mode,...summary}));
 }
}catch{console.error(JSON.stringify({operation:mode,failedPhase:phase,destinationNotActivated:true}));process.exitCode=1;}
