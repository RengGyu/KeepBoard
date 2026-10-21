// Explicit, non-retrying two-call connection probe. Run smoke first, then photo.
import { readFile,writeFile,mkdir,mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { analyzeEvidence } from '../server/ai/index.ts';
import { catanPack } from '../gamepacks/catan.ts';
import { Store } from '../server/store.ts';
import type { Session,Evidence } from '../shared/types.ts';
const directory=path.resolve('gateway/.local'),reportDir=path.resolve('docs/ai-gateway-trial');
const mode=process.argv[2];
if(!['smoke','photo'].includes(mode))throw new Error('Use smoke or photo');
await mkdir(reportDir,{recursive:true});
const ledgerFile=path.join(directory,'live-ledger.json');
let ledger:{mode:string;at:string;ok?:boolean}[]=[];
try{ledger=JSON.parse(await readFile(ledgerFile,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(ledger.length>=2||ledger.some(x=>x.mode===mode)||mode==='photo'&&!ledger.some(x=>x.mode==='smoke'&&x.ok))throw new Error('Call budget or smoke prerequisite prevents this request');
ledger.push({mode,at:new Date().toISOString()});await writeFile(ledgerFile,JSON.stringify(ledger),{mode:0o600});
const report:any={mode,attempt:ledger.length,requestedModel:'deepseek-flash',requestedEffort:'high',startedAt:new Date().toISOString()};
const start=performance.now(),originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const response=await originalFetch(input,init);
 if(String(input).endsWith('/v1/json')){const body=await response.clone().json();report.httpStatus=response.status;report.target=body.target;report.diagnostics=body.diagnostics;report.errorCode=body.error?.code;}
 return response;
};
try{
 if(mode==='smoke'){
  const response=await fetch('http://127.0.0.1:4330/v1/json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alias:'board-vision',prompt:'Return only JSON: {"ok":true,"purpose":"connection-test"}',images:[]})});
  const body=await response.json();if(!response.ok||body.data?.ok!==true)throw new Error('smoke-failed');report.finalJSONValid=true;
 }else{
  const temp=await mkdtemp(path.join(os.tmpdir(),'keepboard-gateway-live-'));process.env.KEEPBOARD_DATA_DIR=temp;
  await writeFile(path.join(temp,'ai-routing.json'),JSON.stringify({mode:'gateway',url:'http://127.0.0.1:4330',alias:'board-vision'}));
  const store=new Store(temp),photo=await readFile('assets/research/catan-new-photo/catan-korean-progress.jpg');
  const url=await store.saveEvidence('data:image/jpeg;base64,'+photo.toString('base64'));
  const evidence:Evidence={id:'public-research-photo',kind:'photo',scope:'public',url,label:'Public research Catan photograph',capturedAt:new Date().toISOString(),captureEpoch:'trial'};
  const session:Session={id:'gateway-public-trial',name:'Gateway connection trial',gamePackId:catanPack.id,gamePackVersion:catanPack.version,gamePack:catanPack,players:[{id:'red',name:'빨강',color:'#bd5144'},{id:'blue',name:'파랑',color:'#467b9c'},{id:'white',name:'하양',color:'#eee8da'}],stage:'capture',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),captureEpoch:'trial',turnInstanceId:'trial-turn',evidence:[evidence],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false};
  const timings:Record<string,number>={};const result=await analyzeEvidence({session,pack:catanPack,evidence:[evidence],timings});
  session.assertions=result.assertions;await store.saveSession(session);
  report.finalJSONValid=true;report.mode=result.mode;report.assertions=result.assertions.length;report.fields=result.assertions.map(a=>a.field);report.warningCount=result.warnings?.length??0;report.stageMs=timings;report.imageBytes=photo.length;report.temporaryStore=temp;
  report.recognitionAccuracy='Not independently evaluated; structure/connection trial only';
 }
 report.ok=true;ledger.at(-1)!.ok=true;
}catch{report.ok=false;report.failure='See safe status/errorCode metadata. No retry or fallback.';}
finally{globalThis.fetch=originalFetch;report.elapsedMs=Math.round(performance.now()-start);await writeFile(ledgerFile,JSON.stringify(ledger),{mode:0o600});await writeFile(path.join(reportDir,mode+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.ok)process.exitCode=1;}
