// Synthetic loopback preview for the mobile game picker and owner tabs. Fresh temp Store, no AI keys, serves the built dist/.
// Run: npm run build && env -u OPENAI_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY npx tsx docs/mobile-picker-tabs/preview-server.ts [port]
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../../server/index.ts';
import {Store} from '../../server/store.ts';
const port=Number(process.argv[2]??4398);
const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-mobile-picker-'));
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','DEEPSEEK_API_KEY','AI_PROVIDER','AI_MODEL','AI_BASE_URL','AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS','KEEPBOARD_AI_GATEWAY_URL'])delete process.env[key];
const app=await createApp({store:new Store(root),ui:true});
const server=app.listen(port,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const players=['빨강 플레이어 이름이 아주 긴 사람','파랑','하린','도윤','서연이와 친구들 팀','민준'].map((name,i)=>({id:`p${i+1}`,name,color:['#c2232f','#2867b2','#e39a14','#158f74','#7b5cf0','#8a5a2b'][i]}));
const response=await fetch(`http://127.0.0.1:${port}/api/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'합성 · 6인 탭 확인',gamePackId:'catan-base',players,recordingMode:'simple'})});
const {session}=await response.json();
console.log(JSON.stringify({home:`http://127.0.0.1:${port}/`,board:`http://127.0.0.1:${port}/?session=${session.id}`,store:root,syntheticOnly:true}));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
