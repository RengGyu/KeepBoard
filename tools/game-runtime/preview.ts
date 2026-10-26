// Dedicated synthetic preview: never reads the project .env or existing Store/settings.
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const project=process.cwd(),root=await mkdtemp(path.join(os.tmpdir(),'keepboard-essentials-preview-'));
for(const key of ['GEMINI_API_KEY','GOOGLE_API_KEY','OPENAI_API_KEY','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS','AI_BASE_URL'])delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';process.chdir(root);
const {createApp}=await import('../../server/index.ts');const {Store}=await import('../../server/store.ts');
process.chdir(project);
const app=await createApp({store:new Store(root,path.join(project,'public')),ui:true});
const server=app.listen(Number(process.env.RUNTIME_PREVIEW_PORT??4396),'127.0.0.1',()=>{console.log(JSON.stringify({url:`http://127.0.0.1:${(server.address() as {port:number}).port}`,synthetic:true,ai:false,dataDir:root}));});
