// Blind key installation. Prints paths/status only, never the credential or a digest.
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./.local/',import.meta.url));
try {
  if(!process.argv[2])throw new Error('source-path-required');
  const secret=await readFile(process.argv[2]);
  if(!secret.toString().trim()||/[\r\n]/.test(secret.toString().trim()))throw new Error('invalid-credential');
  await mkdir(path.join(root,'secrets'),{recursive:true,mode:0o700});
  await chmod(root,0o700);await chmod(path.join(root,'secrets'),0o700);
  await writeFile(path.join(root,'secrets/deepseek.key'),secret,{flag:'wx',mode:0o600});
  const config={version:1,port:4330,providers:{deepseek:{kind:'deepseek',apiKeyFile:'secrets/deepseek.key'}},aliases:{'board-vision':{provider:'deepseek',model:'deepseek-flash',effort:'high',vision:true,timeoutMs:180000}}};
  await writeFile(path.join(root,'config.json'),JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({installed:true,config:'gateway/.local/config.json',port:4330}));
}catch{console.error('Local setup failed; existing files are never overwritten.');process.exitCode=1;}
