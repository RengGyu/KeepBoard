import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import packs from '../gamepacks/generated/game-essentials.json';import {effectiveRecognitionPack} from '../shared/recognition';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:SessionWorkspace}=await import('../src/SessionWorkspace');const {PhotoCaptureGuide,captureGuideText}=await import('../src/PhotoCaptureGuide');const {CameraDialog}=await import('../src/Capture');const {LightweightReaderControls}=await import('../src/LightweightReaderControls');const {api}=await import('../src/api');
// Controlled actual component events/effects; not a DOM renderer or a browser-click claim.
function mount(component:(props:any)=>any,initial:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let props=initial,cursor=0,pending:(()=>void)[]=[],tree:any;
 const dispatcher={
  useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useRef(value:any){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j]))){pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}}
 };
 function render(next=props){props=next;cursor=0;pending=[];const previous=internals.H;internals.H=dispatcher;try{tree=component(props);}finally{internals.H=previous;}for(const effect of pending)effect();return tree;}
 render();return {render,get tree(){return tree;},dispose(){for(const slot of slots)slot?.cleanup?.();}};
}
function nodes(tree:any):any[]{if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
const find=(tree:any,predicate:(node:any)=>boolean)=>{const node=nodes(tree).find(predicate);assert(node,'actual component control missing');return node;};



function view(){const pack=effectiveRecognitionPack(structuredClone((packs as any[]).find(p=>p.id==='splendor')));return {pack:{...pack,releaseTier:'drawing'},session:{id:'synthetic-photo-ui',name:'합성',players:[{id:'p1',name:'시험',color:'red'}],stage:'capture',captureEpoch:'epoch',turnInstanceId:'turn',assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[]},questions:[],briefing:[]};}
test('photo region re-read is an explicit click, crops original pixels without upscale, and is absent without a ready callback',async()=>{
 const {PhotoDialog}=await import('../src/Capture');let received:any,calls=0,closed=0,draw:any;
 const previous=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(...args:any[])=>{draw=args;}}),toDataURL:()=> 'data:image/jpeg;base64,synthetic'})} as any;
 const props={evidence:{id:'source',url:'/source.jpg',label:'원본',kind:'photo'},region:{x:.1,y:.25,width:.2,height:.25},onClose(){closed++;},onReread:async(input:any)=>{calls++;received=input;}};
 const ui=mount(PhotoDialog,props);
 try{
  const image=find(ui.tree,n=>n.type==='img');image.props.ref.current={naturalWidth:1000,naturalHeight:800};assert.equal(calls,0);
  find(ui.tree,n=>n.type==='button'&&n.props.children==='이 부분 다시 읽기').props.onClick();await new Promise(r=>setTimeout(r,0));
  assert.equal(calls,1);assert.equal(closed,1);assert.deepEqual([received.width,received.height],[200,200]);assert.deepEqual(received.sourceRegion,props.region);assert.deepEqual(draw.slice(1),[100,200,200,200,0,0,200,200]);
  ui.render({...props,onReread:undefined});assert(!nodes(ui.tree).some(n=>n.type==='button'&&n.props.children==='이 부분 다시 읽기'));
 }finally{ui.dispose();globalThis.document=previous;}
});
test('current ready workspace exposes explicit region read and repeated clicks share the existing upload/intent/job flow',async()=>{
 const {PhotoDialog}=await import('../src/Capture'),{GameEssentials}=await import('../src/GameEssentials'),{loadPhotoDefinitions}=await import('../src/photoDefinitions');
 const old={jobs:api.analysisJobs,readers:api.recognitionReaders,evidence:api.evidence,commit:api.commit,start:api.startAnalysisJob};
 const current:any=view(),source:any={id:'original',kind:'photo',scope:'public',captureEpoch:'epoch',width:1000,height:800,url:'/source.jpg'};current.session.evidence.push(source);await loadPhotoDefinitions(current.pack);
 let uploads=0,starts=0,body:any;api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({readers:[{kind:'terra-high-game-observation-v1',available:true}]} as any);
 api.evidence=async()=>{uploads++;return {...current,createdEvidenceId:'crop',session:{...current.session,evidence:[source,{...source,id:'crop',sourceEvidenceId:source.id}]}};};
 api.commit=async(_id,_incomplete,reading)=>{assert.deepEqual(reading!.evidenceIds,['crop']);return {...current,saveIntentId:'crop-intent'};};
 api.startAnalysisJob=async(_id,b)=>{starts++;body=b;return {job:{id:'crop-job',sessionId:current.session.id,captureEpoch:'epoch',state:'queued',createdAt:new Date().toISOString(),updatedAt:'',evidenceIds:['crop'],reader:{kind:'terra-high-game-observation-v1'}}} as any;};
 const ui=mount(SessionWorkspace,{view:current,busy:false,status:{configured:false},mutate:async(task:any)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
 try{
  await new Promise(r=>setTimeout(r,0));ui.render();
  find(ui.tree,n=>n.type===GameEssentials).props.onEvidence(source,{x:.1,y:.25,width:.2,height:.25});ui.render();
  const dialog=find(ui.tree,n=>n.type===PhotoDialog);assert.equal(typeof dialog.props.onReread,'function');assert.equal(starts,0);
  const crop={dataUrl:'data:image/jpeg;base64,synthetic',width:200,height:200,sourceRegion:{x:.1,y:.25,width:.2,height:.25}};
  await Promise.all([dialog.props.onReread(crop),dialog.props.onReread(crop)]);assert.equal(uploads,1);assert.equal(starts,1);assert.equal(body.saveIntentId,'crop-intent');assert.deepEqual(body.evidenceIds,['crop']);
  ui.render();assert.equal(find(ui.tree,n=>n.type===PhotoDialog).props.onReread,undefined,'running job cannot start another region request');
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.recognitionReaders=old.readers;api.evidence=old.evidence;api.commit=old.commit;api.startAnalysisJob=old.start;}
});
test('camera starts with manual photos and automatic capture requires an explicit choice',()=>{
 const previous=globalThis.document;globalThis.document={addEventListener(){},removeEventListener(){}} as unknown as Document;
 const ui=mount(CameraDialog,{onClose(){},async onCapture(){throw new Error('No capture expected');}});
 try{
  assert.equal(find(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').props.checked,false);
  assert.equal(find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.includes('사진 찍기')).props.className,'button primary');
  find(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});ui.render();
  assert.equal(find(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').props.checked,true);
  find(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:false}});ui.render();
  assert.equal(find(ui.tree,n=>n.type==='input'&&n.props.type==='checkbox').props.checked,false);
 }finally{ui.dispose();globalThis.document=previous;}
});
test('capture stores selected-part photos first and existing Save is the only automatic analysis trigger',async()=>{
 const old={jobs:api.analysisJobs,evidence:api.evidence,start:api.startAnalysisJob,commit:api.commit};api.analysisJobs=async()=>({jobs:[]});let count=0,starts:any[]=[],uploads:any[]=[];const current=view() as unknown as import('../shared/types').SessionView;
 api.evidence=async(_id,body)=>{uploads.push(body);const id='synthetic-'+(++count);current.session.evidence.push({id,...body,captureEpoch:'epoch',kind:'photo'} as any);return {...current,createdEvidenceId:id};};api.commit=async()=>current;
 api.startAnalysisJob=async(_id,body)=>{starts.push(body);return {job:{id:'synthetic-job',sessionId:'synthetic-photo-ui',evidenceIds:body.evidenceIds,captureEpoch:'epoch',state:'queued'}} as any;};
 const ui=mount(SessionWorkspace,{view:current,busy:false,status:{configured:true},mutate:async(task:()=>Promise<any>)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
 try{
  find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('existing');ui.render();
  find(ui.tree,n=>n.type===PhotoCaptureGuide).props.onChange('player');ui.render();find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='판 찍기').props.onClick();await new Promise(r=>setTimeout(r,0));ui.render();
  const camera=find(ui.tree,n=>n.type===CameraDialog);assert.match(camera.props.guidance,/구매 카드/);await camera.props.onCapture({dataUrl:'synthetic',label:'one'});await camera.props.onCapture({dataUrl:'synthetic',label:'two'});await camera.props.onClose();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(starts.length,0);assert(uploads.every(b=>b.captureTarget.areaId==='player'));await (await import('../src/photoDefinitions')).loadPhotoDefinitions(current.pack);
  assert(!nodes(ui.tree).some(n=>n.type==='button'&&n.props.children==='네, 함께 읽기'));find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary quick-save-button').props.onClick();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(starts.length,1);assert.equal(starts[0].sameStaticState,true);assert.equal(starts[0].captureTarget.areaId,'player');assert.deepEqual(starts[0].evidenceIds,['synthetic-1','synthetic-2']);
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.evidence=old.evidence;api.startAnalysisJob=old.start;api.commit=old.commit;}
});

test('Catan user guidance is Korean shooting help while machine profile and prompt remain unchanged',async()=>{
 const {captureProfile,captureAreas,capturePrompt}=await import('../shared/photoCapture');
 const all=packs as any[];const p=all.find(p=>p.id==='catan-base'),profile=captureProfile(p)!,before=structuredClone(profile);
 for(const a of [...captureAreas(p),...captureAreas(p,'p1')]){const text=captureGuideText(p,a);assert.doesNotMatch(text,/canonical|Owner-scoped|null|vertices|edges|hex|ID/);assert.match(text,/찍어/);}
 assert.deepEqual(captureProfile(p),before);const area=profile.areas.find(a=>a.id==='board')!;
 assert.match(capturePrompt(p,[{id:'synthetic',scope:'public',kind:'photo',captureTarget:{version:1,gameId:'catan',sourceSHA:profile.sourceSHA,areaId:area.id}} as any]),/Existing canonical/);
 for(const pack of all)for(const a of captureProfile(pack)!.areas)assert.doesNotMatch(captureGuideText(pack,a),/\b(?:null|ID|controllers|identity|axial|hex|layer|footprint|local)\b/);
});
