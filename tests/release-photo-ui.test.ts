import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog';
import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameDetailReadout}=await import('../src/readouts/GameDetailReadout');
const {GapNote,gapReasons}=await import('../src/GapNote');
const pack=catalogPacks.find(p=>p.id==='carcassonne')!;
const piece={id:'literal',componentId:'tiles',variant:null,quantity:null,label:'',anchor:'',evidenceId:null,region:null};
test('result exposes observed values and one photo-reference label, without field-by-field unknowns or diagnostic reasons',()=>{
 const readout=setReadoutValue(pack,setReadoutValue(pack,emptyGameReadout(pack,'tiles'),'face','front'),'shields',0);
 const before=JSON.stringify(readout),html=renderToStaticMarkup(React.createElement(GameDetailReadout,{pack,piece:{...piece,readout},compact:true}));
 assert.match(html,/>0</);assert.doesNotMatch(html,/\?/);assert.equal(JSON.stringify(readout),before);
 const unknown=renderToStaticMarkup(React.createElement(GameDetailReadout,{pack,piece:{...piece,readout:emptyGameReadout(pack,'tiles')},compact:true}));
 assert.match(unknown,/사진 참고/);assert.doesNotMatch(unknown,/\?/);
 const gaps=[{property:'shields',reason:'occluded' as const},{property:null,reason:'quantity' as const}],note=renderToStaticMarkup(React.createElement(GapNote,{pack,piece,gaps}));
 assert.match(note,/사진 참고/);assert.doesNotMatch(note,/가림|수량|\?/);assert.deepEqual(gapReasons(gaps),{shields:'사진 참고'});
});

(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const {default:SessionWorkspace}=await import('../src/SessionWorkspace');
const {CameraDialog}=await import('../src/Capture');
const {LightweightReaderControls}=await import('../src/LightweightReaderControls');
const {api}=await import('../src/api');
function mount(component:(props:any)=>any,initial:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,props=initial,tree:any,pending:(()=>void)[]=[];
 const render=(next=props)=>{props=next;cursor=0;pending=[];const previous=internals.H;internals.H={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(n:any)=>slots[i]=typeof n==='function'?n(slots[i]):n];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((d,j)=>!Object.is(d,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=component(props);}finally{internals.H=previous;}pending.forEach(f=>f());return tree;};render();return{render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const find=(t:any,p:(n:any)=>boolean)=>{const n=nodes(t).find(p);assert(n,'control missing');return n;};
const tick=()=>new Promise(r=>setImmediate(r));
function workspaceFixture(tier:'photo'|'drawing'='photo'){
 const view:any={pack:{...catalogPacks.find(p=>p.id==='sagrada')!,releaseTier:tier,...(tier==='photo'?{restorationPolicy:undefined}:{})},session:{id:'synthetic-release',name:'paused',gamePackId:'sagrada',gamePackVersion:'current',players:[],evidence:[{id:'source',kind:'photo',scope:'public',url:'/uploads/fake.png',captureEpoch:'epoch',capturedAt:new Date().toISOString(),label:''}],snapshots:[],assertions:[],notes:{public:'saved memo'},preservations:[],activity:[],captureEpoch:'epoch',turnInstanceId:'turn'},questions:[],briefing:[]};
 const originals={jobs:api.analysisJobs,readers:api.recognitionReaders,update:api.update,start:api.startAnalysisJob,evidence:api.evidence};
 const job:any={id:'pending',sessionId:view.session.id,captureEpoch:'epoch',state:'failed',ownerId:undefined};
 api.analysisJobs=async()=>({jobs:[job]});api.recognitionReaders=async()=>({readers:[]} as any);let starts=0,updates:any[]=[];
 api.startAnalysisJob=async()=>{starts++;throw Error('No provider should be requested');};api.update=async(_id,body)=>{updates.push(body);return view;};
 const props={view,busy:false,status:{configured:true},mutate:async(task:()=>Promise<any>)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}};
 return {view,job,props,updates,get starts(){return starts;},restore(){api.analysisJobs=originals.jobs;api.recognitionReaders=originals.readers;api.update=originals.update;api.startAnalysisJob=originals.start;api.evidence=originals.evidence;}};
}

test('uploaded photo is visibly saved while analysis failed/pending, and photo-only capture cannot request a reader',async()=>{
 const f=workspaceFixture(),ui=mount(SessionWorkspace,f.props);try{
  await tick();ui.render();assert.match(find(ui.tree,n=>n.props?.className==='cw-saved').props.children,/사진 저장됨/);
  assert(!nodes(ui.tree).some(n=>n.type===LightweightReaderControls));
  find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='판 찍기').props.onClick();await tick();ui.render();
  const camera=find(ui.tree,n=>n.type===CameraDialog);assert.equal(camera.props.parallelUpload,false);
  api.evidence=async()=>({createdEvidenceId:'new',...f.view,session:{...f.view.session,evidence:[...f.view.session.evidence,{...f.view.session.evidence[0],id:'new'}]}} as any);
  await camera.props.onCapture({dataUrl:'synthetic'});await camera.props.onClose();assert.equal(f.starts,0);
 }finally{ui.dispose();f.restore();}
});

test('active analysis does not disable memo editing and a later result cannot replace a dirty note',async()=>{
 const f=workspaceFixture('drawing');f.job.state='running';const ui=mount(SessionWorkspace,f.props);let context:any;try{
  await tick();ui.render();const e=find(ui.tree,n=>n.type?.name==='QuickContext');assert.equal(e.props.busy,false);
  let save:any;const props={...e.props,onReadyToSave:(fn:any)=>save=fn};context=mount(e.type,props);
  find(context.tree,n=>n.type==='textarea').props.onChange({target:{value:'my in-flight memo'}});context.render();
  context.render({...props,view:{...f.view,session:{...f.view.session,notes:{public:'late response old memo'}}}});
  assert.equal(find(context.tree,n=>n.type==='textarea').props.value,'my in-flight memo');await save();assert.equal(f.updates.at(-1).notes.public,'my in-flight memo');
 }finally{context?.dispose();ui.dispose();f.restore();}
});

test('reference-only photos from snapshots retain the selected original source region and do not claim a saved empty board',async()=>{
 const {PhotoReference}=await import('../src/PhotoReference'),{recordPhotos,PhotoRecordPanel}=await import('../src/PhotoRecordPanel');
 const f=workspaceFixture(),photo=f.view.session.evidence[0],region={x:.1,y:.2,width:.3,height:.4};
 const html=renderToStaticMarkup(React.createElement(PhotoReference,{photo,region}));assert.match(html,/href="\/uploads\/fake.png"/);assert.match(html,/viewBox="100 200 300 400"/);assert.doesNotMatch(html,/\?/);
 f.view.session.snapshots=[{evidence:[photo]}];f.view.session.evidence=[];assert.equal(recordPhotos(f.view.session).length,1);
 let opened:any;const panel=PhotoRecordPanel({view:f.view,onEvidence:(p:any)=>opened=p});find(panel,n=>n.type==='button').props.onClick();assert.equal(opened.id,'source');
 f.view.session.snapshots=[];assert.doesNotMatch(renderToStaticMarkup(React.createElement(PhotoRecordPanel,{view:f.view,onEvidence(){}})),/写真保存|사진 저장됨/);f.restore();
});


test('photo-tier legacy values and native drawings stay accessible without enabling a fresh read',async()=>{
 const f=workspaceFixture();f.view.pack={...catalogPacks.find(p=>p.id==='rummikub')!,restorationPolicy:undefined};
 f.view.session.assertions=[{id:'manual',ownerId:undefined,field:'table.scene',status:'accepted',value:{version:2,components:[]}}];
 const before=structuredClone(f.view.session),ui=mount(SessionWorkspace,f.props);
 try{await tick();ui.render();const legacy=find(ui.tree,n=>n.type==='details'&&n.props.className==='photo-legacy-drawing');assert(legacy);
  const native=find(legacy,n=>n.type?.name==='RummikubWorkspace');assert.equal(native.props.onReread,undefined);assert.equal(native.props.view.session.assertions[0].id,'manual');
  assert(!nodes(ui.tree).some(n=>n.type===LightweightReaderControls));assert.deepEqual(f.view.session,before);assert.equal(f.starts,0);
 }finally{ui.dispose();f.restore();}
});

test('save remains available during a running analysis and reopening keeps the durable photo',async()=>{
 const f=workspaceFixture('drawing');f.job.state='running';const original=api.commit;let committed:any;
 api.commit=async(id)=>{assert.equal(id,f.view.session.id);committed=structuredClone(f.view);return committed;};
 const ui=mount(SessionWorkspace,f.props);let reopened:any;
 try{await tick();ui.render();const button=find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button');assert.equal(button.props.disabled,false);
  button.props.onClick();await tick();assert(committed);reopened=mount(SessionWorkspace,{...f.props,view:committed});await tick();reopened.render();
  const panel=find(reopened.tree,n=>n.type?.name==='PhotoRecordPanel');assert.equal(panel.props.view.session.evidence[0].id,'source');assert.match(find(reopened.tree,n=>n.props?.className==='cw-saved').props.children,/사진 저장됨/);
 }finally{ui.dispose();reopened?.dispose();api.commit=original;f.restore();}
});

test('needed-photo summary uses the same applicability as object gaps, without treating back-face or unasked fields as missing',async()=>{
 const {readingGaps}=await import('../src/readingGaps'),{observationGaps}=await import('../shared/observationGaps');
 const request={allowedPropertyIds:{cards:['printed']},propertyApplicability:{frontOnlyPropertyIds:{cards:['printed']}}};
 const result={observations:Array.from({length:3},(_,i)=>({ref:String(i),componentId:'cards',face:'back',quantity:1,properties:{printed:{state:'unknown',reason:'unreadable'}}}))};
 const assertion:any={ownerId:undefined,observationReceipts:[{request,result,componentRefs:{0:'a',1:'b',2:'c'}}]};
 assert.equal(readingGaps([assertion]),null);assert.equal(observationGaps(assertion).size,0);
 result.observations.forEach(o=>o.face='unknown');assert.deepEqual(readingGaps([assertion]),{unread:3,total:3});assert.equal(observationGaps(assertion).size,3);
 request.allowedPropertyIds.cards=[];assert.equal(readingGaps([assertion]),null);assert.equal(observationGaps(assertion).size,0);
});
