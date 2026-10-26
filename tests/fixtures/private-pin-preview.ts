// Isolated synthetic browser fixture. Never opens an existing Store or calls AI.
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../../server/index.ts';
import {Store} from '../../server/store.ts';
const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-pin-preview-'));
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';
delete process.env.KEEPBOARD_AI_GATEWAY_URL;
const store=new Store(root),app=await createApp({store,ui:true});
const server=app.listen(4341,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const response=await fetch('http://127.0.0.1:4341/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'PIN 합성 검증',example:true,recordingMode:'simple'})});
const {session}=await response.json();session.notes[session.players[0].id]='합성 개인 메모';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
session.evidence.push({id:'synthetic-private-photo',scope:'player',ownerId:session.players[0].id,kind:'photo',label:'합성 손패',url:await store.saveEvidence(png),capturedAt:new Date().toISOString(),captureEpoch:session.captureEpoch});await store.saveSession(session);
console.log(JSON.stringify({url:`http://127.0.0.1:4341/?session=${session.id}&player=${session.players[0].id}`,syntheticOnly:true}));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close();server.closeIdleConnections();});
