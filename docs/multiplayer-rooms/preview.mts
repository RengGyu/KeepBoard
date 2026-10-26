import {mkdtemp,writeFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const project=process.cwd(),root=process.env.ROOM_PREVIEW_DATA_DIR??await mkdtemp(path.join(os.tmpdir(),'kb-rooms-preview-'));
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','DEEPSEEK_API_KEY','AI_PROVIDER','AI_MODEL','AI_BASE_URL','AI_GATEWAY_URL','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS'])delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';process.chdir(root);const {createApp}=await import('../../server/index.ts');const {Store}=await import('../../server/store.ts');process.chdir(project);
const app=await createApp({store:new Store(root,path.join(project,'public')),ui:false});const {createServer}=await import('vite');const vite=await createServer({root:project,envDir:false,server:{middlewareMode:true,hmr:false},appType:'spa'});app.use(vite.middlewares);
const server=app.listen(4403,'127.0.0.1');await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail);});
const info={base:'http://127.0.0.1:4403',dataDir:root,synthetic:true,ai:false,dev:true};await writeFile(path.join(project,'docs/multiplayer-rooms/preview.json'),JSON.stringify(info,null,2)+'\n');console.log(JSON.stringify(info));
