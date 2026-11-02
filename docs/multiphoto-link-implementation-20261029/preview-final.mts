// Local browser QA with frozen real responses and a delayed, non-network reader.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {createApp} from '../../server/index.ts';import {Store} from '../../server/store.ts';import {GeminiGameReader,decodeGeminiGameObservation} from '../../server/ai/geminiGameReader.ts';import {decodeCatanSceneReading} from '../../server/ai/catanSceneReading.ts';
const dir=new URL('./',import.meta.url),privateDir=process.env.HOME+'/Library/Application Support/KeepBoard/research/multiphoto-link-live-20261029',plan=JSON.parse(await fs.readFile(new URL('input-plan.json',dir),'utf8'));
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');let reads=0,active=0,peak=0;
class ReplayReader extends GeminiGameReader{
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async read(request:any,definition:any,image:Buffer,_mime:string,transforms:any[]=[]){
  reads++;active++;peak=Math.max(peak,active);const index=plan.inputs.findIndex((x:any)=>x.sha256===sha(image));if(index<1)throw Error('Unknown fixture bytes');
  try{await new Promise(r=>setTimeout(r,500+index*300));const native=JSON.parse(await fs.readFile(privateDir+'/'+index+'.native.json','utf8')),hostedWire={id:'gemini-game-wire-v1' as const,items:[],deferred:[]};return {raw:decodeGeminiGameObservation(native,request,definition,hostedWire,transforms),hostedWire,timings:{readerMs:500+index*300}};}finally{active--;}
 }
 async readCatanScene(request:any,definition:any,session:any,pack:any,evidence:any,image:Buffer){
  reads++;active++;peak=Math.max(peak,active);
  try{await new Promise(r=>setTimeout(r,2500));const native=JSON.parse(await fs.readFile(privateDir+'/0.native.json','utf8'));
   for(const part of native.candidates[0].content.parts)if(part.text&&!part.thought){const value=JSON.parse(part.text);for(const a of value.assertions??[]){a.evidenceIds=[evidence[0].id];for(const o of a.value?.components??[])o.evidenceId=evidence[0].id;}part.text=JSON.stringify(value);}
   return {result:decodeCatanSceneReading(native,{request,definition,session,pack,evidence,reader:this.identity,sourceImageSHA:sha(image)}),timings:{readerMs:2500}};
  }finally{active--;}
 }
}
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kb-fastest-qa-')),store=new Store(root),app=await createApp({store,geminiReader:new ReplayReader(),ui:true,uiHmr:false}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base='http://127.0.0.1:'+(server.address() as any).port,post=async(p:string,b:any)=>{const r=await fetch(base+'/api'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw Error('Fixture HTTP '+r.status);return r.json();};
let view=await post('/sessions',{gamePackId:'catan-base',name:'[자체 검수] 관측 연결 개선 · 저장 응답 재생'});const ids=[];
for(const x of plan.inputs){const b=await fs.readFile(x.path);if(sha(b)!==x.sha256)throw Error('Fixture source drift');view=await post('/sessions/'+view.session.id+'/evidence',{scope:'public',dataUrl:'data:'+x.mimeType+';base64,'+b.toString('base64'),label:x.id,width:x.width,height:x.height,expectedCaptureEpoch:view.session.captureEpoch,...(x.sourceRegion?{sourceEvidenceId:ids[0],sourceRegion:x.sourceRegion}:{})});ids.push(view.createdEvidenceId);}
const info={url:base+'/?session='+view.session.id,base,sessionId:view.session.id,pid:process.pid,root,actualProviderCalls:0};await fs.writeFile(new URL('preview-final.json',dir),JSON.stringify(info,null,2)+'\n');console.log(JSON.stringify(info));
app.get('/qa-metrics',(_q,r)=>r.json({mockReads:reads,peak,active,actualProviderCalls:0}));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
