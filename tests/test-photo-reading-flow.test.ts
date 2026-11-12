import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';
import {catalogPacks} from '../gamepacks/catalog';
import {drawingEnabled} from '../shared/releaseSupport';
import {publicSceneTarget} from '../shared/restoration';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);register('./fixtures/testOnlyViteEnv.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:Workspace}=await import('../src/SessionWorkspace');
// A distinct URL compiles exactly the same component with Vite's DEV=false branch for non-exposure checks.
const {default:ProductionWorkspace}=await import('../src/SessionWorkspace.tsx?test-dev=false' as string);
const {ClipboardPhotoPaste}=await import('../src/testOnly/ClipboardPhotoPaste');const {LightweightReaderControls}=await import('../src/LightweightReaderControls');
const {api}=await import('../src/api');const {loadPhotoDefinitions,photoDefinitionFor,observablePhotoArea}=await import('../src/photoDefinitions');await loadPhotoDefinitions();
function mount(component:any,props:any){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const render=(next=props)=>{props=next;cursor=0;pending=[];const old=internals.H;internals.H={useMemo(fn:any){return fn();},useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(n:any)=>slots[i]=typeof n==='function'?n(slots[i]):n];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps?:any[]){const i=cursor++,prior=slots[i];if(!prior||!deps||deps.some((d,j)=>!Object.is(d,prior.deps?.[j])))pending.push(()=>{prior?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=component(props);}finally{internals.H=old;}pending.forEach(f=>f());return tree;};render();return{render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const find=(t:any,p:(n:any)=>boolean)=>{const n=nodes(t).find(p);assert(n,'actual control missing');return n;};
const tick=()=>new Promise(r=>setImmediate(r));const settle=async(ui:ReturnType<typeof mount>)=>{for(let i=0;i<4;i++){await tick();ui.render();}};
function fixture(gameId='sagrada'){return {pack:catalogPacks.find(p=>p.id===gameId)!,session:{id:'test-reading',name:'test',players:[],assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[],stage:'capture',captureEpoch:'epoch',turnInstanceId:'turn'},questions:[],briefing:[] } as any;}
function mocks(){const old={...api},fetch=globalThis.fetch,reader=globalThis.FileReader,img=globalThis.Image;let readerCalls=0,starts:any[]=[];
 api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>{readerCalls++;return {readers:[{kind:'terra-high-game-observation-v1',available:true,identity:null,cloudSupported:true}],definitions:{}} as any;};api.startAnalysisJob=async(_id,body)=>{starts.push(body);return{job:{id:'fresh-job',sessionId:'test-reading',state:'completed',ownerId:body.ownerId,captureEpoch:'epoch'}} as any;};
 globalThis.fetch=async()=>{throw Error('No external fetch in UI test');};
 (globalThis as any).FileReader=class{result='data:image/png;base64,dGVzdA==';onload?:()=>void;readAsDataURL(){queueMicrotask(()=>this.onload?.());}};(globalThis as any).Image=class{naturalWidth=100;naturalHeight=100;onload?:()=>void;set src(_value:string){queueMicrotask(()=>this.onload?.());}};
 return {starts,get readerCalls(){return readerCalls;},restore(){Object.assign(api,old);globalThis.fetch=fetch;globalThis.FileReader=reader;globalThis.Image=img;}};
}
function props(view:any){return {view,busy:false,status:{configured:true},mutate:async(task:any)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}};}

test('all120 pinned products use the common reader path without a test capability or quality-tier rewrite',async()=>{
 const m=mocks();try{assert.equal(catalogPacks.length,120);for(const pack of catalogPacks){assert(drawingEnabled(pack),pack.id);assert(publicSceneTarget(pack),pack.id);}
  for(const id of ['sagrada','rummikub','hanabi','blokus','dominion']){const view=fixture(id),before=JSON.stringify(view.pack),ui=mount(Workspace,props(view));try{await settle(ui);assert(nodes(ui.tree).some(n=>n.type===LightweightReaderControls),id);assert.equal(JSON.stringify(view.pack),before);}finally{ui.dispose();}}
  assert.equal(m.starts.length,0);
 }finally{m.restore();}
});
test('production supports the same product reader without the development clipboard UI; old unsupported packs keep photos',async()=>{
 const m=mocks();try{const ui=mount(ProductionWorkspace,props(fixture()));try{await settle(ui);assert(!nodes(ui.tree).some(n=>n.type===ClipboardPhotoPaste));assert(nodes(ui.tree).some(n=>n.type===LightweightReaderControls));assert.equal(m.starts.length,0);}finally{ui.dispose();}
  const view=fixture();view.pack={...view.pack,releaseTier:'photo',restorationPolicy:undefined};const legacy=mount(Workspace,props(view));try{await settle(legacy);assert(!nodes(legacy.tree).some(n=>n.type===LightweightReaderControls));}finally{legacy.dispose();}
 }finally{m.restore();}
});

test('missing reader saves the photo record but never starts analysis or exposes another execution button',async()=>{
 const m=mocks();api.recognitionReaders=async()=>({readers:[{kind:'terra-high-game-observation-v1',available:false,reason:'Terra high 미설정'}]} as any);
 const view=fixture();view.session.evidence=[{id:'source',kind:'photo',scope:'public',captureEpoch:'epoch'}];let commits=0;api.commit=async()=>{commits++;return view;};const ui=mount(Workspace,props(view));let area:any;
 try{await settle(ui);const panel=find(ui.tree,n=>n.type===ClipboardPhotoPaste);const reader=find(ui.tree,n=>n.type===LightweightReaderControls);assert.equal(reader.props.terraAvailable,false);assert.match(JSON.stringify(LightweightReaderControls(reader.props)),/미설정/);area=mount(ClipboardPhotoPaste,panel.props);assert(!nodes(area.tree).some(n=>n.type==='button'));find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button').props.onClick();await settle(ui);assert.equal(commits,1);assert.equal(m.starts.length,0);}
 finally{area?.dispose();ui.dispose();m.restore();}
});

test('product paste stores photos first; one Save carries its intent into a single job and the result remains editable',async()=>{
 const m=mocks(),view=fixture(),writes:any[]=[];let uploads=0,commits=0,ui:any;
 const p=props(view);p.mutate=async(task:any)=>{const result=await task();if(result?.session){p.view=result;ui?.render(p);}return result;};
 api.evidence=async(_id,body)=>{uploads++;view.session.evidence.push({id:'source',url:'/synthetic.png',kind:'photo',captureEpoch:'epoch',...body});return{...view,createdEvidenceId:'source'};};
 api.scanUploadTickets=async(_id,_run,_epoch,items)=>({items:items.map(i=>({clientPhotoId:i.clientPhotoId as string,evidenceId:'source'}))});
 api.stageScanPhoto=async(_id,_run,clientPhotoId)=>{uploads++;return{uploadReady:true,clientPhotoId,evidenceId:'source'};};
 api.registerScanPhotos=async()=>{view.session.evidence.push({id:'source',url:'/synthetic.png',kind:'photo',scope:'public',captureEpoch:'epoch',width:100,height:100});return{...view,createdEvidenceIds:['source'],excludedClientPhotoIds:[]};};
 const readout=setReadoutValue(view.pack,emptyGameReadout(view.pack,'dice'),'dieValue',2);
 const definition=photoDefinitionFor(view.pack)!,request=compileObservationTask({pack:view.pack,definition,areaId:'draft',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},taskId:'fresh-task',images:[{evidenceId:'source',sha256:'a'.repeat(64),width:100,height:100,inputId:'source',transformId:null}]});
 const observation={ref:'literal',imageIndex:0,panelRef:null,componentId:'dice',bbox:{x:.1,y:.1,width:.2,height:.2},face:'front',quantity:1,rotationDegrees:null,properties:{dieValue:{state:'observed',value:2}},referenceCandidates:[]};
 const unit={id:'unit',evidenceId:'source',sourceEvidenceId:'source',sourceSHA:'a'.repeat(64),inputSHA:'a'.repeat(64),areaId:'draft',role:'anchor',target:null};
 const receipt:any={request,result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[observation]},reader:{kind:'terra-high-game-observation-v1'},transforms:[],geometryCandidates:[],componentRefs:{literal:'die'},scanUnitId:'unit',scanBundle:{plan:{id:'mock-scan',scope:request.scope,definitionSHA:definition.definitionSHA,anchorEvidenceId:'source',units:[unit]},units:[{unitId:'unit',state:'completed',observationCount:1}],links:[]}};
 const rawBefore=JSON.stringify(receipt);
 const fact:any={id:'fresh-result',field:'draft.scene',ownerId:undefined,status:'accepted',basis:'observation',evidenceIds:['source'],updatedAt:'now',observationReceipts:[receipt],value:{version:'game-component-record-v1',pieces:[{id:'die',componentId:'dice',variant:null,quantity:1,label:'',anchor:'',evidenceId:'source',region:{x:.1,y:.1,width:.2,height:.2},readout}]}};
 api.session=async()=>{view.session.assertions=[fact];return view;};api.update=async(_id,body)=>{writes.push(body);for(const a of body.answers??[])if(a.field===fact.field)fact.value=a.value;return view;};api.commit=async(_id,_incomplete,reading)=>{commits++;if(commits===1){assert(reading);assert.deepEqual(reading.evidenceIds,['source']);}return {...view,saveIntentId:'save-frozen'};};
 ui=mount(Workspace,p);let area:any,essentials:any,editor:any,sources:any,overlay:any;
 try{await settle(ui);find(ui.tree,n=>n.type?.name==='PhotoCaptureGuide').props.onChange('draft');ui.render(p);find(ui.tree,n=>n.type?.name==='GameEssentials').props.onReadDetail({assertionId:'previous-assertion',pieceId:'existing-object'});area=mount(ClipboardPhotoPaste,find(ui.tree,n=>n.type===ClipboardPhotoPaste).props);const event={clipboardData:{files:[new File(['test'],'copy.png',{type:'image/png'})],items:[]},preventDefault(){}};await area.tree.props.onPaste(event);await settle(ui);
  assert.equal(uploads,1);assert.equal(m.starts.length,0);assert.equal(view.session.evidence[0].scope,'public');assert.equal(drawingEnabled(view.pack),true);
  area.render(find(ui.tree,n=>n.type===ClipboardPhotoPaste).props);assert(!nodes(area.tree).some(n=>n.type==='button'),'no new execution button');const button=find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button');assert.equal(button.props.disabled,false);button.props.onClick();button.props.onClick();await settle(ui);assert.equal(commits,1,'inflight Save is one commit and one analysis claim');
  assert.equal(m.starts.length,1);assert.deepEqual(m.starts[0].evidenceIds,['source']);assert.equal(m.starts[0].reader.kind,'terra-high-game-observation-v1');assert.equal(m.starts[0].saveIntentId,'save-frozen');assert.deepEqual(m.starts[0].reader.target,{assertionId:'previous-assertion',pieceId:'existing-object'});assert.equal(m.starts[0].scope,'public');assert.equal(m.starts[0].expectedCaptureEpoch,'epoch');assert(view.session.assertions.some((a:any)=>a.id==='fresh-result'));find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button').props.onClick();await settle(ui);assert.equal(m.starts.length,1);assert.equal(commits,2);
  const source=find(ui.tree,n=>n.type?.name==='ScanObservationResults');sources=mount(source.type,source.props);const o=find(sources.tree,n=>n.type?.name==='PhotoObservationOverlay');overlay=mount(o.type,o.props);const outline=find(overlay.tree,n=>n.props?.className==='lw-source-box');assert.equal(outline.props.children,undefined);outline.props.onClick();overlay.render();assert.match(JSON.stringify(find(overlay.tree,n=>n.props?.role==='status').props.children),/2/);
  const e=find(ui.tree,n=>n.type?.name==='GameEssentials');essentials=mount(e.type,e.props);const g=find(essentials.tree,n=>n.type?.name==='GenericComponents'&&n.props.field.key==='draft.scene');editor=mount(g.type,g.props);
  const board=()=>find(editor.tree,n=>n.type?.name==='GameBoardRecord');board().props.onSelect('die');editor.render();const fields=find(board().props.editor,n=>n.type?.name==='GameDetailFields');const {GameDetailFields}=await import('../src/readouts/GameDetailFields');const controls=GameDetailFields(fields.props);find(controls,n=>n.type?.name==='ChipPick'&&n.props.label==='윗면 눈').props.onChange(5);editor.render();
  find(editor.tree,n=>n.type==='button'&&n.props.children==='구성물 기록').props.onClick();await tick();assert.equal(writes.at(-1).answers[0].value.pieces[0].readout.values.dieValue,5);
  ui.render(p);find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button').props.onClick();await tick();assert.equal(commits,3);assert.equal(m.starts.length,1);assert.equal(fact.value.pieces[0].readout.values.dieValue,5);assert.equal(JSON.stringify(receipt),rawBefore);assert.equal(drawingEnabled(view.pack),true);
 }finally{overlay?.dispose();sources?.dispose();editor?.dispose();essentials?.dispose();area?.dispose();ui.dispose();m.restore();}
});


test('saving after remount reuses a current running job or a matching original receipt without another model job',async()=>{
 const m=mocks();try{for(const prior of ['running','receipt'] as const){const view=fixture();view.session.evidence=[{id:'source',kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic.png'}];const definition=photoDefinitionFor(view.pack)!,areaId=definition.areas.find(a=>a.partition!=='owner_private'&&observablePhotoArea(definition,a))!.id;
  api.analysisJobs=async()=>({jobs:prior==='running'?[{id:'already-reading',sessionId:view.session.id,ownerId:undefined,captureEpoch:'epoch',state:'running',evidenceIds:['source']}]:[]} as any);
  if(prior==='receipt')view.session.assertions=[{id:'read',ownerId:undefined,field:'__photo.public',observationReceipts:[{request:{definitionSHA:definition.definitionSHA,readingTarget:publicSceneTarget(view.pack),scope:{ownerId:null,captureEpoch:'epoch'},areaId,images:[{evidenceId:'source'}]},result:{observations:[]}}]}];
  api.commit=async()=>view;const ui=mount(Workspace,props(view));try{await settle(ui);find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button').props.onClick();await settle(ui);assert.equal(m.starts.length,0,prior);}finally{ui.dispose();}
 }}finally{m.restore();}
});
