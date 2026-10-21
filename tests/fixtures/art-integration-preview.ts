// Isolated synthetic browser fixture. Never opens an existing Store or calls AI.
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../../server/index.ts';
import {Store} from '../../server/store.ts';
const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-art-preview-'));
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';
delete process.env.KEEPBOARD_AI_GATEWAY_URL;
const store=new Store(root),app=await createApp({store,ui:true});
const server=app.listen(4381,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const response=await fetch('http://127.0.0.1:4381/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'구성물 연결 합성 검증',example:true,recordingMode:'simple'})});
const {session}=await response.json();await store.saveSession(session);
console.log(JSON.stringify({url:`http://127.0.0.1:4381/?session=${session.id}`,syntheticOnly:true}));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close();server.closeIdleConnections();});
