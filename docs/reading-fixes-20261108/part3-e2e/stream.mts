/** One real streamed read through the app path, sampling the live row count that the progress endpoint reports. */
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createApp} from '../../../server/index';import {Store} from '../../../server/store';import defs from '../../../game-photo-definitions/index.json';
const D=path.dirname(fileURLToPath(import.meta.url)),root=await fs.mkdtemp('/private/tmp/kb-reading-fixes-stream-');await fs.chmod(root,0o700);
const app=await createApp({store:new Store(root)}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+(server.address() as any).port;let revision:string|undefined;
async function call(route:string,body?:unknown){const r=await fetch(base+'/api'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body)}),v:any=await r.json();if(v.session?.storageRevision)revision=v.session.storageRevision;return {status:r.status,body:v};}
try{
 const d=defs.games.find((x:any)=>x.gameId==='sagrada')!,bytes=await fs.readFile('/Users/jeonggyuju/Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029/sagrada.jpg');
 const made=await call('/sessions',{gamePackId:d.packId,name:'stream e2e'}),p='/sessions/'+made.body.session.id,up=await call(p+'/evidence',{scope:'public',dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')});
 const start=performance.now(),first=await call(p+'/analysis-jobs',{requestId:'stream-1',evidenceIds:[up.body.createdEvidenceId],expectedCaptureEpoch:up.body.session.captureEpoch,reader:{kind:'terra-high-game-observation-v1',definitionSHA:d.definitionSHA,areaId:'window'}});
 if(first.status!==202)throw Error(JSON.stringify(first.body).slice(0,300));const id=first.body.job.id,samples:[number,number|null][]=[];let job:any;
 for(let n=0;n<620;n++){const g=await call(p+'/analysis-jobs/'+id+'/progress');job=g.body.job;samples.push([Math.round((performance.now()-start)/1000),job?.liveRows??null]);if(!['queued','running'].includes(job.state))break;await new Promise(r=>setTimeout(r,1000));}
 const view=(await call(p)).body,a=view.session.assertions.find((x:any)=>x.observationReceipts?.length),compact=samples.filter((s,i)=>i===0||s[1]!==samples[i-1][1]);
 const out={state:job.state,error:job.error,totalS:Math.round((performance.now()-start)/1000),adapter:job.reader?.adapterVersion,savedItems:a?(a.value.components??a.value.pieces??[]).length:null,liveRowSamples:compact};await fs.writeFile(D+'/stream-result.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
