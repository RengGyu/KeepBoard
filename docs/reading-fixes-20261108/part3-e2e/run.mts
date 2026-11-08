/** Real provider through the real local app path: upload -> analysis job -> saved record. Isolated temp store. Retries only as the reader allows. */
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createApp} from '../../../server/index';import {Store} from '../../../server/store';import defs from '../../../game-photo-definitions/index.json';
const D=path.dirname(fileURLToPath(import.meta.url)),root=await fs.mkdtemp('/private/tmp/kb-reading-fixes-part3-');await fs.chmod(root,0o700);
const R='/Users/jeonggyuju/Library/Application Support/KeepBoard/research',catan=R+'/catan-user-20261029/823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6.jpg',sagrada=R+'/twenty-games-pack-study-20261029/sagrada.jpg';
const app=await createApp({store:new Store(root)}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+(server.address() as any).port;let revision:string|undefined;
async function call(route:string,body?:unknown,method=body?'POST':'GET'){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body)}),v:any=await r.json();if(v.session?.storageRevision)revision=v.session.storageRevision;return {status:r.status,body:v};}
const rows:any[]=[];
try{
 const caps=(await call('/recognition/readers')).body.readers.map((r:any)=>[r.kind,r.available]);
 for(const [gameId,file,areaId,kind,tag] of [['catan',catan,'board','terra-high-game-observation-v1','terra-r1'],['catan',catan,'board','terra-high-game-observation-v1','terra-r2'],['catan',catan,'board','luna-game-observation-v1','luna-r1'],['sagrada',sagrada,'window','terra-high-game-observation-v1','terra-r1']] as const){
  revision=undefined;const d=defs.games.find((x:any)=>x.gameId===gameId)!,bytes=await fs.readFile(file),dataUrl='data:image/jpeg;base64,'+bytes.toString('base64');
  const made=await call('/sessions',{gamePackId:d.packId,name:'reading fixes e2e'}),p='/sessions/'+made.body.session.id,at=performance.now();
  const up=await call(p+'/evidence',{scope:'public',dataUrl});if(up.status!==200)throw Error('upload '+up.status+' '+JSON.stringify(up.body).slice(0,200));const uploadMs=performance.now()-at;
  const task={requestId:'e2e-'+tag,evidenceIds:[up.body.createdEvidenceId],expectedCaptureEpoch:up.body.session.captureEpoch,reader:{kind,definitionSHA:d.definitionSHA,areaId}},start=performance.now(),first=await call(p+'/analysis-jobs',task);
  const row:any={gameId,tag,kind,startStatus:first.status,startError:first.status===202?undefined:JSON.stringify(first.body).slice(0,200),uploadMs:Math.round(uploadMs)};rows.push(row);
  if(first.status===202){let job:any;for(let n=0;n<620;n++){job=(await call(p+'/analysis-jobs')).body.jobs[0];if(!['queued','running'].includes(job.state))break;await new Promise(r=>setTimeout(r,500));}
   row.totalMsObserved=Math.round(performance.now()-start);Object.assign(row,{state:job.state,error:job.error,timings:job.timings,candidateCount:job.candidateCount,readerModel:job.reader?.model,readerEffort:job.reader?.reasoningEffort,adapter:job.reader?.adapterVersion});
   const view=(await call(p)).body,a=view.session.assertions.find((x:any)=>x.observationReceipts?.length);await fs.writeFile(root+`/${gameId}-${tag}.view.json`,JSON.stringify({session:view.session,job}),{mode:0o600});
   if(a){const v=a.value,items=v.components??v.pieces??v.tiles??[],count:Record<string,number>={};for(const i of items){const k=i.kind??i.componentId??'?';count[k]=(count[k]??0)+1;}Object.assign(row,{field:a.field,status:a.status,savedItems:items.length,kinds:count,located:items.filter((i:any)=>i.location&&i.location.type!=='unplaced').length,summary:String(view.session.analysisSummary??'').slice(0,240)});}
  }
  console.log(JSON.stringify(row));await fs.writeFile(D+'/result.json',JSON.stringify({root,caps,rows},null,2)+'\n');
 }
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
