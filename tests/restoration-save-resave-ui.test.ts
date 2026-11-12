import test from 'node:test';import assert from 'node:assert/strict';import {register} from 'node:module';import React from 'react';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createApp} from '../server/index';import {Store} from '../server/store';import {TERRA_HIGH_IDENTITY,buildTerraGameBody,decodeTerraGameObservation} from '../server/ai/terraGameReader';import {LEAN_TERRA_PROFILE,compactTerraKinds} from '../server/ai/terraCompact';import {photoDefinition} from '../server/photoDefinitions';import {publicSceneTarget} from '../shared/restoration';import type {HostedObservationReader} from '../server/ai/hostedReader';import type {ObservationRequest,PhotoDefinition} from '../shared/lightweightRecognition';import type {SessionView} from '../shared/types';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const {default:Workspace}=await import('../src/SessionWorkspace');const {api}=await import('../src/api');const {loadPhotoDefinitions}=await import('../src/photoDefinitions');
function mount(component:any,props:any){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const render=(next=props)=>{props=next;cursor=0;pending=[];const old=internals.H;internals.H={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((d,j)=>!Object.is(d,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=component(props);}finally{internals.H=old;}pending.forEach(f=>f());return tree;};render();return{render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};}
const nodes=(n:any):any[]=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
const find=(n:any,p:(n:any)=>boolean)=>{const found=nodes(n).find(p);assert(found,'actual UI control missing');return found;};
const tick=()=>new Promise(r=>setImmediate(r));
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
class DelayedReader implements HostedObservationReader{
 identity=TERRA_HIGH_IDENTITY;calls=0;started=()=>{};gate:Promise<void>=Promise.resolve();
 async status(){return{kind:this.identity.kind,available:true,cloudSupported:true as const,identity:this.identity};}
 async readCatanScene():Promise<any>{throw Error('not Catan');}
 async read(request:ObservationRequest,definition:PhotoDefinition,bytes:Buffer,mime:string,transforms:any[]=[]){this.calls++;this.started();await this.gate;
  const body=buildTerraGameBody(request,definition,bytes,mime,LEAN_TERRA_PROFILE,{},this.identity);assert.equal(body.max_output_tokens,32768);
  const kind=compactTerraKinds(request,definition,LEAN_TERRA_PROFILE).find(k=>k.id==='dice')!,value=kind.properties.find(p=>p.id==='dieValue')!;
  const payload={v:3,items:[{k:kind.k,b:[100,100,200,200],f:'f',q:null,u:'s',a:[{p:value.p,v:'0'}],x:kind.properties.filter(p=>p.p!==value.p).map(p=>p.p),ar:'window'}],...(request.spatial?{spatial:{version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[],cellStates:[]}}:{})};
  const native={status:'completed',model:this.identity.model,output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}]};return{...decodeTerraGameObservation(native,request,definition,transforms,LEAN_TERRA_PROFILE),timings:{readerMs:1}};
 }
}
async function setup(){const root=await mkdtemp(path.join(os.tmpdir(),'kb-ui-resave-')),reader=new DelayedReader(),app=await createApp({store:new Store(root),terraHighReader:reader}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address()as any).port}/api`;
 const call=async(p:string,body?:any,method=body?'POST':'GET')=>{const response=await fetch(base+p,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const value=await response.json();assert(response.ok,`HTTP ${response.status}: ${value.error??'request failed'}`);return value;};
 const view=await call('/sessions',{gamePackId:'sagrada',recordingMode:'simple'}),p='/sessions/'+view.session.id,photo=await call(p+'/evidence',{scope:'public',dataUrl:image}),definition=photoDefinition(photo.pack),target=publicSceneTarget(photo.pack)!;
 const reading={reader:{kind:reader.identity.kind,definitionSHA:definition.definitionSHA,areaId:target.mode==='public-scene'?target.areaIds[0]:'',readingTarget:target},evidenceIds:[photo.createdEvidenceId]};const saved=await call(p+'/commit',{reading});let release=()=>{};reader.gate=new Promise<void>(r=>release=r);const started=new Promise<void>(r=>reader.started=r);
 const job=(await call(p+'/analysis-jobs',{...reading,saveIntentId:saved.saveIntentId,requestId:'original-save',expectedCaptureEpoch:saved.session.captureEpoch})).job;await started;
 return{root,reader,call,p,reading,saved,job,release,close:async()=>{release();for(let n=0;n<200;n++){const jobs=(await call(p+'/analysis-jobs')).jobs;if(jobs.some((j:any)=>j.id===job.id&&!['queued','running'].includes(j.state)))break;await new Promise(r=>setTimeout(r,5));}server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}};
}

test('UI memo resave retains actual running intent, starts no job, and real HTTP completion snapshot/reopen/resume preserves it',async()=>{
 const f=await setup(),old={...api};let ui:any,context:any;const commits:any[]=[];let starts=0;
 try{await loadPhotoDefinitions(f.saved.pack);let current:SessionView=await f.call(f.p);
  api.analysisJobs=async()=>f.call(f.p+'/analysis-jobs');api.recognitionReaders=async()=>({readers:[await f.reader.status()]} as any);api.scanProgress=async(_id,job)=>f.call(f.p+'/analysis-jobs/'+job+'/progress');api.session=async()=>f.call(f.p);api.update=async(_id,body)=>f.call(f.p,body,'PATCH');api.commit=async(_id,allowIncomplete,reading,ownerId)=>{commits.push(reading);return f.call(f.p+'/commit',{allowIncomplete,reading,ownerId});};api.startAnalysisJob=async()=>{starts++;throw Error('Resave must not start another job');};
  const props:any={view:current,busy:false,status:{configured:true},mutate:async(task:any)=>{current=await task();props.view=current;ui?.render(props);},onBack(){},setOwnerId:async()=>{},onToast(){}};
  ui=mount(Workspace,props);for(let i=0;i<4;i++){await tick();ui.render();}const c=find(ui.tree,n=>n.type?.name==='QuickContext');context=mount(c.type,c.props);find(context.tree,n=>n.type==='textarea').props.onChange({target:{value:'판독 중 최신 메모'}});context.render();
  const button=find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button');button.props.onClick();
  for(let n=0;n<100&&!commits.length;n++)await new Promise(r=>setTimeout(r,5));for(let n=0;n<100&&current.session.notes.public!=='판독 중 최신 메모';n++)await new Promise(r=>setTimeout(r,5));
  assert.equal(commits.length,1);assert.deepEqual(commits[0],f.reading);assert.equal(starts,0);const resaved=await f.call(f.p);assert.equal(resaved.session.snapshots.at(-1).saveIntentId,f.saved.saveIntentId);
  f.release();let completed:any;for(let n=0;n<200;n++){completed=(await f.call(f.p+'/analysis-jobs')).jobs.find((j:any)=>j.id===f.job.id);if(!['queued','running'].includes(completed.state))break;await new Promise(r=>setTimeout(r,5));}assert.equal(completed.state,'completed',JSON.stringify(completed));
  const reopened=await f.call(f.p),snapshots=reopened.session.snapshots.filter((s:any)=>s.analysisJobId===f.job.id);assert.equal(snapshots.length,1);assert.equal(snapshots[0].saveIntentId,f.saved.saveIntentId);assert.equal(snapshots[0].notes.public,'판독 중 최신 메모');assert.equal(f.reader.calls,1);
  const resumed=await f.call(f.p+'/resume',{scope:'public'});assert.equal(resumed.session.notes.public,'판독 중 최신 메모');assert(resumed.session.assertions.some((a:any)=>a.analysisJobId===f.job.id));assert.equal(resumed.session.assertions.find((a:any)=>a.analysisJobId===f.job.id).value.pieces[0].readout.values.dieValue,0);
 }finally{context?.dispose();ui?.dispose();Object.assign(api,old);await f.close();}
});
