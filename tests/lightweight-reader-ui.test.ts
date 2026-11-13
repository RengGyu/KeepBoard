import {validatePhotoFrame} from '../shared/photoGeometry.ts';
import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import {renderToStaticMarkup} from 'react-dom/server';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {CatanPhotoFrame}=await import('../src/CatanPhotoFrame.tsx');
const {LightweightReaderControls}=await import('../src/LightweightReaderControls.tsx');
// Actual React component events/effects, intentionally not a DOM or browser substitute.
function mount(component:any,props:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const dispatcher={useMemo(fn:any){return fn();},useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(value:any){const i=cursor++;return slots[i]??={current:value};},useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}};
 const render=()=>{cursor=0;pending=[];const previous=internals.H;internals.H=dispatcher;try{tree=component(props);}finally{internals.H=previous;}for(const effect of pending)effect();return tree;};render();return{render,get tree(){return tree;},dispose(){for(const slot of slots)slot?.cleanup?.();}};
}
function nodes(t:any):any[]{if(!t||typeof t!=='object')return[];if(Array.isArray(t))return t.flatMap(nodes);return[t,...nodes(t.props?.children)];}
function find(t:any,p:(n:any)=>boolean){const n=nodes(t).find(p);assert(n,'actual UI control missing');return n;}
const photo={id:'photo',url:'/synthetic.png',scope:'public',kind:'photo',width:850,height:637,captureEpoch:'epoch',capturedAt:'',label:'합성'} as const;
test('definitions load only after local feature entry, remain unavailable while pending, and match the pinned pack',async()=>{
 const {usePhotoDefinition,photoDefinitionFor,loadPhotoDefinitions}=await import('../src/photoDefinitions.ts');const {catalogPacks}=await import('../gamepacks/catalog.ts');const pack=catalogPacks.find(p=>p.id==='catan-base')!;
 assert.equal(photoDefinitionFor(pack),undefined);const props={enabled:false},ui=mount(()=>usePhotoDefinition(pack,props.enabled),props);assert.equal(ui.tree.loading,false);assert.equal(ui.tree.definition,undefined);
 props.enabled=true;ui.render();assert.equal(ui.tree.loading,true);assert.equal(ui.tree.definition,undefined);await loadPhotoDefinitions();ui.render();assert.equal(ui.tree.definition.gameId,'catan');assert.equal(ui.tree.loading,false);assert.equal(photoDefinitionFor({...pack,version:'not-pinned'}),undefined);ui.dispose();
 const html=renderToStaticMarkup(React.createElement(LightweightReaderControls,{mode:'local',onMode(){},available:true,busy:false,hasDefinition:false,definitionLoading:true,hasPhotos:true,onRead(){}}));assert.match(html,/정의를 준비/);assert(!html.includes('판본·촬영 정의가 일치하지'));assert.match(html,/<button[^>]*disabled/);
 const failure=renderToStaticMarkup(React.createElement(LightweightReaderControls,{mode:'local',onMode(){},available:true,busy:false,hasDefinition:false,definitionError:'합성 정의 준비 실패',hasPhotos:true,onRead(){}}));assert.match(failure,/합성 정의 준비 실패/);assert.match(failure,/<button[^>]*disabled/);
});
test('frame needs explicit orientation and four photo/topology pairs, passes source identity without modifying photo',async()=>{
 let validated:any,confirmed:any;const ui=mount(CatanPhotoFrame,{photo,sourceSHA:'a'.repeat(64),definitionSHA:'b'.repeat(64),onClose(){},validate:(f:any)=>{validatePhotoFrame(f,{evidenceId:photo.id,sourceSHA:'a'.repeat(64),definitionSHA:'b'.repeat(64)});validated=f;},onConfirm:(f:any)=>confirmed=f});
 const confirm=()=>find(ui.tree,n=>n.type==='button'&&n.props.children==='방향과 기준점 확인');assert(confirm().props.disabled);
 for(const [i,slot]of ['r1c1','r1c3','r5c1','r5c3'].entries()){
  find(ui.tree,n=>n.type==='g'&&n.props['aria-label']===`${slot[1]}행 ${slot[3]}열 기준점 선택`).props.onClick();ui.render();
  find(ui.tree,n=>n.type==='input'&&n.props['aria-label']==='사진 가로 위치 (%)').props.onChange({target:{value:String(i%2?80:20)}});ui.render();
  find(ui.tree,n=>n.type==='input'&&n.props['aria-label']==='사진 세로 위치 (%)').props.onChange({target:{value:String(i<2?20:80)}});ui.render();
  find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('').includes('이 점 연결')).props.onClick();ui.render();
 }
 assert(confirm().props.disabled,'four points do not infer orientation');find(ui.tree,n=>n.type==='select'&&n.props['aria-label']==='판 방향').props.onChange({target:{value:'0'}});ui.render();assert(!confirm().props.disabled);await confirm().props.onClick();
 assert.equal(confirmed,validated);assert.equal(confirmed.correspondences.length,4);assert.equal(confirmed.sourceEvidenceId,photo.id);assert.equal(confirmed.confirmedByUser,true);assert(!('frame' in photo));
 find(ui.tree,n=>n.type==='button'&&n.props.children==='기준점 되돌리기').props.onClick();ui.render();assert(confirm().props.disabled);
});
test('reader choice stays explicit and unavailable local mode cannot claim recognition or change existing model',()=>{
 const html=renderToStaticMarkup(React.createElement(LightweightReaderControls,{mode:'existing',onMode(){},available:false,availabilityMessage:'로컬 판독기에 연결할 수 없어요.',busy:false,hasDefinition:true,onRead(){},hasPhotos:true}));
 assert(!html.includes('로컬 판독기에 연결할 수 없어요.'));assert(!html.includes('사진 읽기 방식'));
 const lost=renderToStaticMarkup(React.createElement(LightweightReaderControls,{mode:'local',onMode(){},available:false,availabilityMessage:'로컬 판독기에 연결할 수 없어요.',busy:false,hasDefinition:true,onRead(){},hasPhotos:true}));assert.match(lost,/기존 AI/);assert.match(lost,/연결할 수 없/);
 let mode:any;const ui=mount(LightweightReaderControls,{mode:'existing',onMode:(m:any)=>mode=m,available:true,busy:false,hasDefinition:true,onRead(){},hasPhotos:true});find(ui.tree,n=>n.type==='select').props.onChange({target:{value:'local'}});assert.equal(mode,'local');
});
const {localCatanCandidates,catanReviewScene}=await import('../src/catanObservationReviewModel.ts');
const {createComponent,CATAN_TOPOLOGY}=await import('../shared/scene.ts');
const {catalogPacks}=await import('../gamepacks/catalog.ts');
const {SceneWorkspace}=await import('../src/SceneWorkspace.tsx');const {SceneEditor}=await import('../src/SceneEditor.tsx');
const {LocalCatanReview}=await import('../src/LocalCatanReview.tsx');
function candidateFixture(){const empty={version:2 as const,coverage:'partial' as const,components:[]};const road=createComponent(empty,'road',{id:'old-road',quantity:1,ownerId:'red',location:{type:'edge',id:'r1c1.NE'}}),city=createComponent(empty,'city',{id:'old-city',quantity:1,ownerId:'red',location:{type:'vertex',id:'r1c1.N'}}),harbor=createComponent(empty,'harbor',{id:'old-harbor',quantity:1,variant:'generic',ratio:3,location:{type:'edge',id:'r1c1.W'}});const base={...empty,components:[road,city,harbor]};const piece=createComponent(empty,'terrain',{id:'new-terrain',variant:null,quantity:1,evidenceId:'photo',region:{x:.1,y:.1,width:.1,height:.1}});const source:any={id:'local',field:'components.observed',ownerId:undefined,status:'candidate',updatedAt:'2026-01-02',evidenceIds:['photo'],value:{...empty,components:[piece]},observationReceipts:[{frame:{frameId:'confirmed',sourceEvidenceId:'photo',sourceSHA:'a'.repeat(64),definitionSHA:'b'.repeat(64),coordinateSpace:'normalized-photo/catan-topology',orientation:0,confirmedByUser:true,correspondences:['r1c1','r1c3','r5c1','r5c3'].map(id=>{const p=CATAN_TOPOLOGY.byId.hex.get(id)!;return{canonicalTopologyId:id,canonicalPoint:{x:p.x,y:p.y},photoPointNormalized:{x:(p.x+3)/6,y:(p.y+3)/6}};})},request:{gameId:'catan',definitionSHA:'b'.repeat(64),geometryFrameId:'confirmed',images:[{evidenceId:'photo',inputId:'original',sha256:'a'.repeat(64),transformId:null}]},result:{observations:[]},componentRefs:{literal:'new-terrain'},geometryCandidates:[{observationRef:'literal',frameId:'confirmed',locationCandidate:{type:'hex',id:'r1c1'},method:'confirmed-frame',status:'candidate'}]}]};const view:any={pack:{...catalogPacks.find(p=>p.id==='catan-base')!,releaseTier:'drawing'},session:{id:'synthetic-local-ui',assertions:[{id:'accepted',status:'accepted',field:'board.layout',evidenceIds:[],updatedAt:'2026-01-01',value:base},source],players:[],evidence:[photo],snapshots:[],preservations:[]}};return{base,source,view};}
test('explicit geometry action changes only the review copy; unknown terrain stays unknown, accepted roads/buildings/harbors survive',()=>{
 const f=candidateFixture(),before=JSON.stringify(f.source),baseBefore=JSON.stringify(f.base);const uncertain=structuredClone(f.source);uncertain.value.components[0].quantity=null;assert.equal(catanReviewScene(uncertain,f.base,true).unresolved.length,1);const loose=catanReviewScene(f.source,f.base,false),placed=catanReviewScene(f.source,f.base,true);
 assert.equal(loose.scene.components.find(c=>c.id==='new-terrain')!.location.type,'unplaced');assert.deepEqual(placed.scene.components.find(c=>c.id==='new-terrain')!.location,{type:'hex',id:'r1c1'});assert.equal(placed.scene.components.find(c=>c.id==='new-terrain')!.variant,null);
 for(const p of f.base.components)assert.deepEqual(placed.scene.components.find(c=>c.id===p.id),p);
 assert.equal(JSON.stringify(f.source),before);assert.equal(JSON.stringify(f.base),baseBefore);
 assert.equal(localCatanCandidates(f.view).length,1);f.view.session.assertions.push({id:'confirmed-board',field:'board.layout',status:'accepted',updatedAt:'2026-01-03',value:placed.scene});assert.equal(localCatanCandidates(f.view).length,0);
});
test('local Catan candidates appear on the board, and direct save uses the pinned native review boundary',async()=>{
 const f=candidateFixture();let save:any,writes=0;
 const {api}=await import('../src/api.ts');const priorUpdate=api.update;let body:any;
 api.update=(async(_id:any,payload:any)=>{body=payload;return f.view;}) as any;
 // Minimal useRef support for the actual workspace wrapper.
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,previous=internals.H,slots:any[]=[];let i=0;
 internals.H={useState(v:any){const n=i++;if(!(n in slots))slots[n]=typeof v==='function'?v():v;return[slots[n],(x:any)=>slots[n]=typeof x==='function'?x(slots[n]):x];},useRef(v:any){const n=i++;return slots[n]??=( {current:v});},useEffect(){i++;}};
 let tree:any;try{tree=SceneWorkspace({view:f.view,busy:false,mutate:async(task:any)=>{await task();writes++;},onEvidence(){},onReadyToSave:fn=>save=fn});}finally{internals.H=previous;}
 const editor=find(tree,n=>n.type===SceneEditor);assert.equal(editor.props.forceSave,true);assert.equal(editor.props.value.components.length,4);assert(editor.props.value.components.some((c:any)=>c.id==='new-terrain'));assert(nodes(tree).some(n=>n.type==='button'&&n.props.children==='사진 후보 자세히 보기'));
 const fieldSwitch=nodes(tree).find(n=>n.type==='select'&&n.props['aria-label']==='다른 부품 보기');if(fieldSwitch){fieldSwitch.props.onChange({target:{value:'board.layout'}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(writes,0,'viewing another field does not accept an untouched photo candidate');}
 await editor.props.onSave(editor.props.value);assert.equal(writes,1);assert.equal(body.answers[0].field,'board.layout');assert.deepEqual(body.answers[0].observationReview,{version:'native-observation-review-v1',sourceAssertionId:'local',expectedBaselineAssertionId:'accepted'});
 const review=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:true,mutate:async()=>{writes++;},onClose(){},onEvidence(){}});const reviewEditor=find(review.tree,n=>n.type===SceneEditor);assert.equal(reviewEditor.props.onReadyToSave,undefined);assert.equal(reviewEditor.props.busy,true);await assert.rejects(reviewEditor.props.onSave(f.base),/저장하지 않은/);assert.equal(writes,1);assert.equal(save,undefined);
 api.update=priorUpdate;
});
test('a changed accepted board cannot be overwritten by an already open local-candidate review',async()=>{
 const f=candidateFixture();let writes=0;const ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async()=>{writes++;},onClose(){},onEvidence(){}});
 f.view.session.assertions.push({id:'other-edit',field:'board.layout',status:'accepted',updatedAt:'2026-01-01T23:59',evidenceIds:[],value:f.base});ui.render();
 await assert.rejects(find(ui.tree,n=>n.type===SceneEditor).props.onSave(f.base),/기록이 바뀌/);assert.equal(writes,0);
});
test('review edits block geometry-preview replacement; removed/re-read candidate cannot overwrite but review draft stays mounted',async()=>{
 const f=candidateFixture(),ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async()=>{throw Error('must not write');},onClose(){},onEvidence(){}});
 find(ui.tree,n=>n.type===SceneEditor).props.onDirtyChange(true);ui.render();assert(find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('').startsWith('계산된 위치')).props.disabled);
 f.view.session.assertions=f.view.session.assertions.filter((a:any)=>a.id!==f.source.id);ui.render();assert(find(ui.tree,n=>n.type===SceneEditor),'actual editor remains in the review tree');await assert.rejects(find(ui.tree,n=>n.type===SceneEditor).props.onSave(f.base),/후보가 바뀌/);
});

test('invalid frame after preview is a hard failure, blocks apply, and preserves manual editor identity/value',async()=>{
 const f=candidateFixture();let writes=0;const ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async()=>{writes++;},onClose(){},onEvidence(){}});
 find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('').startsWith('계산된 위치')).props.onClick();ui.render();const preview=find(ui.tree,n=>n.type===SceneEditor);preview.props.onDirtyChange(true);ui.render();
 f.source.observationReceipts[0].frame.sourceSHA='c'.repeat(64);ui.render();const preserved=find(ui.tree,n=>n.type===SceneEditor);assert.equal(preserved.key,preview.key);assert.deepEqual(preserved.props.value,preview.props.value);assert(nodes(ui.tree).some(n=>n.props?.role==='status'&&String(n.props.children).includes('실패')));await assert.rejects(preserved.props.onSave(f.base),/위치 후보를 반영할 수 없/);assert.equal(writes,0);
 assert(!nodes(ui.tree).some(n=>n.type==='button'&&n.props.children==='현재 초안 유지하고 위치 직접 정정'));ui.dispose();
});
test('original observation display localizes face/colors and preserves literal raw values',async()=>{
 const {PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');const {loadPhotoDefinitions,photoDefinitionFor}=await import('../src/photoDefinitions.ts');const {catalogPacks}=await import('../gamepacks/catalog.ts');await loadPhotoDefinitions();const definition=photoDefinitionFor(catalogPacks.find(p=>p.id==='catan-base')!)!;
 const result:any={observations:[{ref:'road',imageIndex:0,panelRef:null,componentId:'road',bbox:null,properties:{face:{state:'observed',value:'front'},observedColor:{state:'observed',value:'red'}}}]},before=JSON.stringify(result);
 const html=renderToStaticMarkup(React.createElement(PhotoObservationOverlay,{photos:[],request:{images:[{evidenceId:'photo',transformId:null}]} as any,result,definition,geometry:[]}));assert.match(html,/앞면/);assert.match(html,/빨강/);assert(!html.includes(': front'));assert(!html.includes(': red'));assert.equal(JSON.stringify(result),before);
});
test('workspace keeps existing/local area selections separate and local reads only current-epoch same-scope originals',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx');const {PhotoCaptureGuide}=await import('../src/PhotoCaptureGuide.tsx');const {api}=await import('../src/api.ts');const f=candidateFixture();Object.assign(f.view.session,{name:'합성',captureEpoch:'current',notes:{},activity:[],turnInstanceId:'turn'});
 f.view.session.evidence=[{...photo,id:'old',captureEpoch:'past'},{...photo,id:'current',captureEpoch:'current'},{...photo,id:'foreign',scope:'player',ownerId:'other',captureEpoch:'current'}];
 const original={jobs:api.analysisJobs,readers:api.recognitionReaders,start:api.startAnalysisJob};let request:any;api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[{kind:'local-observation-v1',available:true,cloudSupported:false,identity:null}],definitions:{indexSHA:'a'.repeat(64),version:'game-photo-definitions-v1',count:120}});api.startAnalysisJob=async(_id,body)=>{request=body;return{job:{id:'mock-job',sessionId:f.view.session.id,state:'queued',evidenceIds:body.evidenceIds,captureEpoch:'current',createdAt:'',updatedAt:''}};};
 const props={view:f.view,busy:false,status:{configured:true},onBack(){},setOwnerId:async()=>{},onToast(){},mutate:async(task:any)=>{await task();}};const ui=mount(SessionWorkspace,props);
 try{
  await new Promise(r=>setTimeout(r,0));ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('existing');ui.render();find(ui.tree,n=>n.type===PhotoCaptureGuide).props.onChange('board');ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('local');ui.render();await new Promise(r=>setTimeout(r,0));ui.render();
  assert.equal(find(ui.tree,n=>n.type===PhotoCaptureGuide).props.areaId,'board');assert.equal(typeof find(ui.tree,n=>n.type===LightweightReaderControls).props.onFrame,'function');
  find(ui.tree,n=>n.type===PhotoCaptureGuide).props.onChange('not-the-board');ui.render();assert.equal(find(ui.tree,n=>n.type===LightweightReaderControls).props.onFrame,undefined);
  find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('existing');ui.render();assert.equal(find(ui.tree,n=>n.type===PhotoCaptureGuide).props.areaId,'board');
  find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('local');ui.render();assert.equal(find(ui.tree,n=>n.type===PhotoCaptureGuide).props.areaId,'not-the-board');find(ui.tree,n=>n.type===PhotoCaptureGuide).props.onChange('board');ui.render();
  const {photoDefinitionFor}=await import('../src/photoDefinitions.ts');const frame={version:'confirmed-photo-frame-v1',id:'explicit-frame',sourceEvidenceId:'current',sourceSHA:'f'.repeat(64),definitionSHA:photoDefinitionFor(f.view.pack)!.definitionSHA,confirmedByUser:true,orientation:0,correspondences:[]} as any;
  f.source.observationReceipts[0].frame=frame;ui.render();
  find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await new Promise(r=>setTimeout(r,0));assert.deepEqual(request.evidenceIds,['current']);assert.equal(request.reader.areaId,'board');assert.equal(request.expectedCaptureEpoch,'current');assert.equal(request.reader.frame,frame);assert.equal(request.reader.inputMode,'original','confirming a frame must not silently select atlas input');
  f.view.session.evidence=f.view.session.evidence.filter((p:any)=>p.id!=='current');ui.render();assert.equal(find(ui.tree,n=>n.type===LightweightReaderControls).props.hasPhotos,false,'past original is retained but cannot start a new local job');assert(f.view.session.evidence.some((p:any)=>p.id==='old'));
 }finally{ui.dispose();api.analysisJobs=original.jobs;api.recognitionReaders=original.readers;api.startAnalysisJob=original.start;}
});
test('Rummikub retains one reread action rather than a second controls button',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx');const {RummikubWorkspace}=await import('../src/RummikubWorkspace.tsx');const {api}=await import('../src/api.ts');const f=candidateFixture();f.view.pack={...catalogPacks.find(p=>p.id==='rummikub')!,releaseTier:'drawing'};Object.assign(f.view.session,{name:'합성',captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});const old=api.analysisJobs,readers=api.recognitionReaders;api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[],definitions:{version:'game-photo-definitions-v1',count:120,indexSHA:''}});
 const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},onBack(){},setOwnerId:async()=>{},onToast(){},mutate:async()=>{}});try{find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('existing');ui.render();const controls=find(ui.tree,n=>n.type===LightweightReaderControls);assert.equal(controls.props.showReadButton,false);assert(!renderToStaticMarkup(React.createElement(controls.type,controls.props)).includes('사진 읽기</button>'));assert.equal(typeof find(ui.tree,n=>n.type===RummikubWorkspace).props.onReread,'function');}finally{ui.dispose();api.analysisJobs=old;api.recognitionReaders=readers;}
});

test('unresolved local Catan item remains saveable in the explicit baseline-pinned draft; API failure keeps editor draft',async()=>{
 const f=candidateFixture();f.source.value.components[0].quantity=null;const {api}=await import('../src/api.ts'),old=api.update;let request:any,fail=false;api.update=async(_id,body)=>{request=body;if(fail)throw Error('409 synthetic stale');return f.view;};
 const ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async(task:any)=>task(),onClose(){},onEvidence(){}});
 try{find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('').startsWith('계산된 위치')).props.onClick();ui.render();const editor=find(ui.tree,n=>n.type===SceneEditor);assert.equal(editor.props.value.components.find((c:any)=>c.id==='new-terrain').location.type,'unplaced');assert(nodes(ui.tree).some(n=>n.props?.role==='status'&&String(n.props.children).includes('배치 0개 · 위치 확인 1개')));await editor.props.onSave(editor.props.value);assert.deepEqual(request.answers.find((a:any)=>a.field==='board.layout').observationReview,{version:'native-observation-review-v1',sourceAssertionId:f.source.id,expectedBaselineAssertionId:'accepted'});fail=true;editor.props.onDirtyChange(true);ui.render();await assert.rejects(find(ui.tree,n=>n.type===SceneEditor).props.onSave(editor.props.value),/409/);ui.render();assert.equal(find(ui.tree,n=>n.type===SceneEditor).key,editor.key);assert.deepEqual(find(ui.tree,n=>n.type===SceneEditor).props.value,editor.props.value);}finally{ui.dispose();api.update=old;}
});
test('native Rummikub explicit review retains baseline/order and blocks stale/dirty saves without discarding its draft',async()=>{
 const {RummikubWorkspace}=await import('../src/RummikubWorkspace.tsx'),{RummikubBoardView}=await import('../src/RummikubBoard.tsx'),{emptyRummikub,createRummikubTile}=await import('../shared/rummikub.ts'),{api}=await import('../src/api.ts');const old=api.update;let request:any,flush:any;
 const base=emptyRummikub();base.groups=[{id:'ordered',label:'직접 정정',tiles:[createRummikubTile('old',{number:8,color:'blue',note:'수동'})]}];base.loose=[createRummikubTile('old-loose',{number:3,color:'red'})];const fresh=emptyRummikub();fresh.loose=[createRummikubTile('new',{kind:'unknown',number:null,color:null})];
 const accepted:any={id:'old-record',field:'table.scene',status:'accepted',value:base,evidenceIds:[],updatedAt:'2026-01-01'},candidate:any={id:'new-record',field:'table.scene',status:'candidate',value:fresh,evidenceIds:[],updatedAt:'2026-01-02',observationReceipts:[{request:{},componentRefs:{},result:{observations:[]},transforms:[]}]};const props:any={view:{pack:catalogPacks.find(p=>p.id==='rummikub')!,session:{id:'synthetic-rummi',assertions:[accepted,candidate],evidence:[]}},busy:false,mutate:async(task:any)=>task(),onEvidence(){},onReadyToSave:(fn:any)=>flush=fn};api.update=async(_id,body)=>{request=body;return props.view;};
 const ui=mount(RummikubWorkspace,props);try{
  assert.equal(flush,null,'pristine candidate-only draft is not registered as whole-state save');find(ui.tree,n=>n.type==='button'&&n.props.children==='기존 판과 함께 정정').props.onClick();ui.render();const shown=find(ui.tree,n=>n.type===RummikubBoardView).props.scene;assert.deepEqual(shown.groups,base.groups);assert.deepEqual(shown.loose.map((t:any)=>t.id),['old-loose','new']);await (flush as any)();assert.deepEqual(request.answers[0].observationReview,{version:'native-observation-review-v1',sourceAssertionId:'new-record',expectedBaselineAssertionId:'old-record'});
  // Re-open review then change through the actual add-group control; a concurrent base cannot silently rebase it.
  ui.render();find(ui.tree,n=>n.type==='button'&&n.props.children==='기존 판과 함께 정정').props.onClick();ui.render();find(ui.tree,n=>n.type===RummikubBoardView).props.onAddGroup();ui.render();const dirty=JSON.stringify(find(ui.tree,n=>n.type===RummikubBoardView).props.scene);props.view.session.assertions.push({...accepted,id:'concurrent',updatedAt:'2026-01-03'});ui.render();await assert.rejects((flush as any)(),/기존 판이나 새 사진 후보가 바뀌/);ui.render();assert.equal(JSON.stringify(find(ui.tree,n=>n.type===RummikubBoardView).props.scene),dirty);// Portal-only error presentation is checked in CUA, not this hook harness.
 }finally{ui.dispose();api.update=old;}
});

test('local partial typed candidate uses explicit component linking with accepted objects; late accepted state blocks whole replacement',async()=>{
 const {GameEssentials}=await import('../src/GameEssentials.tsx'),{ComponentLinkDialog}=await import('../src/ComponentLinkDialog.tsx');const pack=catalogPacks.find(p=>p.id==='splendor')!;
 const piece=(id:string)=>({id,componentId:'development',variant:null,quantity:1,label:'合成',anchor:'',evidenceId:null,region:null}),record=(id:string)=>({version:'game-component-record-v1',pieces:[piece(id)]});
 const view:any={pack,session:{id:'typed-ui',players:[],evidence:[],snapshots:[],preservations:[],assertions:[{id:'old',field:'market.scene',status:'accepted',value:record('old-card'),evidenceIds:[]},{id:'new',field:'market.scene',status:'candidate',value:record('new-card'),evidenceIds:[],observationReceipts:[{version:'lightweight-observation-v1',reader:{kind:'local-observation-v1'}}]}]},questions:[]};let writes=0;
 const ui=mount(GameEssentials,{view,busy:false,mutate:async()=>{writes++;},onEvidence(){}});try{find(ui.tree,n=>n.type==='button'&&n.props.children==='후보 보기·적용').props.onClick();ui.render();const link=find(ui.tree,n=>n.type===ComponentLinkDialog);assert.deepEqual(link.props.initialIds,['new-card']);assert.equal(link.props.initialTarget.field,'market.scene');assert.equal(writes,0);assert.deepEqual(view.session.assertions[0].value,record('old-card'));}finally{ui.dispose();}
 const baseline=view.session.assertions.shift(),first=mount(GameEssentials,{view,busy:false,mutate:async()=>{writes++;},onEvidence(){}});try{find(first.tree,n=>n.type==='button'&&n.props.children==='후보 보기·적용').props.onClick();first.render();view.session.assertions.unshift(baseline);first.render();const review=find(first.tree,n=>typeof n.type==='function'&&n.type.name==='GenericComponents'&&n.props.review);await assert.rejects(review.props.onSave(review.props.value),/기존 기록/);assert.equal(writes,0);assert.deepEqual(view.session.assertions[0].value,record('old-card'));}finally{first.dispose();}
});

test('malformed local source is visibly blocked without crashing review or exposing a replacement blank-state save',async()=>{
 const f=candidateFixture();f.source.value.version=99;let writes=0;const ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async()=>{writes++;},onClose(){},onEvidence(){}});
 try{const editor=find(ui.tree,n=>n.type===SceneEditor);assert.deepEqual(editor.props.value.components,f.base.components);assert(nodes(ui.tree).some(n=>n.props?.role==='alert'));await assert.rejects(editor.props.onSave(f.base),/위치 후보를 반영할 수 없/);assert.equal(writes,0);}finally{ui.dispose();}
});

test('multiple nonzero robbers cannot silently clear saved anchor; explicit removal permits native reviewed save and keeps source',async()=>{
 const {api}=await import('../src/api.ts'),old=api.update;let writes=0,answer:any;api.update=async(_id,body)=>{writes++;answer=body;return{} as any;};
 try{for(const freshPlaced of [true,false]){
  const f=candidateFixture();f.base.components.push(createComponent(f.base,'robber',{id:'old-robber',quantity:1,location:{type:'hex',id:'r1c2'}}));
  f.view.session.assertions[0].value=f.base;f.view.session.assertions.push({id:'old-anchor',field:'robber.hexAnchor',status:'accepted',value:'r1c2'});const rawBefore=JSON.stringify(f.source);
  const ui=mount(LocalCatanReview,{view:f.view,source:f.source,busy:false,dirty:false,mutate:async(task:any)=>task(),onClose(){},onEvidence(){}});
  try{const editor=find(ui.tree,n=>n.type===SceneEditor),draft=structuredClone(editor.props.value);draft.components.push(createComponent(draft,'robber',{id:'fresh-robber',quantity:freshPlaced?1:null,location:freshPlaced?{type:'hex',id:'r2c2'}:{type:'unplaced',id:null}}));const before=JSON.stringify(draft),count=writes;
   await assert.rejects(editor.props.onSave(draft),/도둑이 여러 개/);assert.equal(writes,count);assert.equal(JSON.stringify(draft),before);ui.render();assert.equal(find(ui.tree,n=>n.type===SceneEditor).key,editor.key);assert(nodes(ui.tree).some(n=>n.props?.role==='alert'&&String(n.props.children).includes('도둑이 여러 개')));assert.equal(f.view.session.assertions.find((a:any)=>a.id==='old-anchor').value,'r1c2');
   const corrected={...draft,components:draft.components.filter((c:any)=>c.id!=='fresh-robber')};await find(ui.tree,n=>n.type===SceneEditor).props.onSave(corrected);assert.equal(writes,count+1);assert.equal(answer.answers.find((a:any)=>a.field==='robber.hexAnchor').value,'r1c2');assert.equal(JSON.stringify(f.source),rawBefore);
  }finally{ui.dispose();}
 }}finally{api.update=old;}
});

test('numeric task is separately unavailable and atlas cannot read without a confirmed frame',()=>{
 const base={mode:'local' as const,onMode(){},available:true,busy:false,hasDefinition:true,hasPhotos:true,onRead(){},numericScope:true,task:'catan-numerals-v1' as const,onTask(){},inputMode:'original' as const,onInputMode(){}};
 const unavailable=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,numberCapability:{task:'catan-numerals-v1',available:false,reason:'합성 pin 미확인',profile:null}}));assert.match(unavailable,/합성 pin 미확인/);assert.match(unavailable,/<button[^>]*disabled[^>]*>숫자만 읽기/);
 const profile:any={id:'catan-numerals-v1'},noFrame=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,inputMode:'catan-atlas',numberCapability:{task:'catan-numerals-v1',available:true,profile}}));assert.match(noFrame,/기준점을 먼저 확인/);assert.match(noFrame,/<button[^>]*disabled[^>]*>숫자만 읽기/);
 const wrong=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,numericScope:false,numberCapability:{task:'catan-numerals-v1',available:true,profile}}));assert.doesNotMatch(wrong,/aria-label="판독할 항목"/);assert.match(wrong,/<button[^>]*disabled[^>]*>숫자만 읽기/);
});
test('workspace explicitly sends task and original or atlas independently of frame, without client task profile',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx'),{api}=await import('../src/api.ts');const {photoDefinitionFor,loadPhotoDefinitions}=await import('../src/photoDefinitions.ts');await loadPhotoDefinitions();const f=candidateFixture();Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});const frame=f.source.observationReceipts[0].frame;frame.definitionSHA=photoDefinitionFor(f.view.pack)!.definitionSHA;
 const old={jobs:api.analysisJobs,status:api.recognitionReaders,start:api.startAnalysisJob};let bodies:any[]=[];
 api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[{kind:'local-observation-v1',available:true,cloudSupported:false,identity:null,tasks:[{task:'catan-numerals-v1',available:true,profile:{id:'catan-numerals-v1'} as any}]}],definitions:{indexSHA:'',version:'game-photo-definitions-v1',count:120}});api.startAnalysisJob=async(_id,body)=>{bodies.push(body);return{job:{id:'job-'+bodies.length,sessionId:f.view.session.id,state:'completed',evidenceIds:body.evidenceIds,captureEpoch:'epoch',createdAt:'',updatedAt:''}};};
 const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}});try{await new Promise(r=>setTimeout(r,0));ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('local');ui.render();await new Promise(r=>setTimeout(r,0));ui.render();let c=find(ui.tree,n=>n.type===LightweightReaderControls);assert.equal(c.props.numericScope,true);c.props.onTask('catan-numerals-v1');ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(bodies[0].reader.task,'catan-numerals-v1');assert.equal(bodies[0].reader.inputMode,'original');assert.equal(bodies[0].reader.frame,frame);assert(!('taskProfile'in bodies[0].reader));
 find(ui.tree,n=>n.type===LightweightReaderControls).props.onInputMode('catan-atlas');ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(bodies[1].reader.inputMode,'catan-atlas');assert.equal(bodies[1].reader.task,'catan-numerals-v1');assert.equal(bodies[1].reader.frame,frame);
 find(ui.tree,n=>n.type===LightweightReaderControls).props.onTask(undefined);ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await new Promise(r=>setTimeout(r,0));assert(!bodies[2].reader.task);assert.equal(bodies[2].reader.inputMode,'original');
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.recognitionReaders=old.status;api.startAnalysisJob=old.start;}
});

// Receipt-based labels must not infer success from the currently selected control.
test('numeric receipt status distinguishes no candidates and deferred output without relabeling old jobs',async()=>{
 const {numericJobMessage,numericReceiptSummary}=await import('../src/numericReaderStatus.ts');const f=candidateFixture();const receipt=structuredClone(f.source.observationReceipts[0]);receipt.taskProfile={id:'catan-numerals-v1'} as any;receipt.nativeWire={id:'qwen-number-grounding-v1',result:{items:[]},deferred:[{ref:'unread',reason:'unreadable'}]};receipt.result.observations=[];
 const job:any={id:'numeric',state:'completed',taskProfile:receipt.taskProfile,observationReceipts:[receipt]};assert.match(numericJobMessage(job)!,/적용할 수 있는 숫자 후보가 없어요.*보류 1개/);assert.equal(numericReceiptSummary([receipt]).candidates,0);assert.equal(numericJobMessage({...job,taskProfile:undefined,observationReceipts:[]}),undefined);assert.match(numericJobMessage({...job,state:'running'})!,/숫자 후보.*전체 판.*아니에요/);assert.match(numericJobMessage({...job,observationReceipts:[]})!,/영수증을 확인하지 못했어요/);
 receipt.result.observations=[{ref:'literal',imageIndex:0,panelRef:null,componentId:'number-token',bbox:null,face:'front',quantity:1,rotationDegrees:null,properties:{number:{state:'observed',value:5}},referenceCandidates:[]}];assert.match(numericJobMessage(job)!,/숫자 후보 1개 · 보류 1개/);
 const {LocalCatanReview}=await import('../src/LocalCatanReview.tsx');const source={...f.source,observationReceipts:[receipt]};const ui=mount(LocalCatanReview,{view:{...f.view,session:{...f.view.session,assertions:[...f.view.session.assertions.filter((a:any)=>a.id!==source.id),source]}},source,busy:false,dirty:false,mutate:async()=>{},onClose(){},onEvidence(){}});try{assert.equal(ui.tree.props.title,'읽은 숫자 후보 확인');assert.match(renderToStaticMarkup(ui.tree),/숫자 후보/);}finally{ui.dispose();}
});

test('numeric raw read callback cannot bypass absent task capability or an unconfirmed atlas frame',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx'),{api}=await import('../src/api.ts'),{loadPhotoDefinitions}=await import('../src/photoDefinitions.ts');await loadPhotoDefinitions();const old={jobs:api.analysisJobs,status:api.recognitionReaders,start:api.startAnalysisJob};let calls=0;api.analysisJobs=async()=>({jobs:[]});api.startAnalysisJob=async()=>{calls++;throw Error('must not start');};
 try{for(const available of [false,true]){api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[{kind:'local-observation-v1',available:true,cloudSupported:false,identity:null,...(available?{tasks:[{task:'catan-numerals-v1',available:true,profile:{id:'catan-numerals-v1'} as any}]}:{})}],definitions:{indexSHA:'',version:'game-photo-definitions-v1',count:120}});const f=candidateFixture();f.source.observationReceipts[0].frame=null;Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[]});const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}});try{await new Promise(r=>setTimeout(r,0));ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onMode('local');ui.render();await new Promise(r=>setTimeout(r,0));ui.render();find(ui.tree,n=>n.type===LightweightReaderControls).props.onTask('catan-numerals-v1');ui.render();if(available){find(ui.tree,n=>n.type===LightweightReaderControls).props.onInputMode('catan-atlas');ui.render();}find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await new Promise(r=>setTimeout(r,0));assert.equal(calls,0);}finally{ui.dispose();}}}finally{api.analysisJobs=old.jobs;api.recognitionReaders=old.status;api.startAnalysisJob=old.start;}
});

// Provider choice: existing / local / Gemini are one select; Gemini sends only the definition-scoped selection for ONE photo.
test('Gemini is offered only when the hosted reader reports available and sends a scoped selection without local-only fields',()=>{
 const base={mode:'existing' as const,onMode(){},available:false,busy:false,hasDefinition:true,hasPhotos:true,onRead(){}};
 const off=renderToStaticMarkup(React.createElement(LightweightReaderControls,base));assert.doesNotMatch(off,/Gemini 판독/);
 const on=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,geminiAvailable:true}));assert.match(on,/<option value="gemini">Gemini 판독/);assert.match(on,/aria-label="사진 읽기 방식"/);assert.match(on,/<button[^>]*>사진 읽기<\/button>/);
 const blocked=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,mode:'gemini' as const,geminiAvailable:false,geminiReason:'합성 Gemini 연결 없음'}));assert.match(blocked,/합성 Gemini 연결 없음/);assert.match(blocked,/<button[^>]*disabled[^>]*>사진 읽기/);
 const ready=renderToStaticMarkup(React.createElement(LightweightReaderControls,{...base,mode:'gemini' as const,geminiAvailable:true}));assert.doesNotMatch(ready,/<p role="status"/,'a ready reader shows no inline notice');assert.match(ready,/<details class="lw-more"><summary>읽기 설정<\/summary>[\s\S]*선택한 현재 사진을 각각/);assert.doesNotMatch(ready,/판독할 항목/);
});
test('workspace sends the chosen provider: Gemini scoped selection, then local, then existing without a reader',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx'),{api}=await import('../src/api.ts'),{photoDefinitionFor,loadPhotoDefinitions}=await import('../src/photoDefinitions.ts');await loadPhotoDefinitions();
 const f=candidateFixture();Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});const definition=photoDefinitionFor(f.view.pack)!;
 const old={jobs:api.analysisJobs,status:api.recognitionReaders,start:api.startAnalysisJob};const bodies:any[]=[];
 api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[{kind:'local-observation-v1',available:true,cloudSupported:false,identity:null},{kind:'gemini-game-observation-v1',available:true,cloudSupported:true,identity:null}],definitions:{indexSHA:'',version:'game-photo-definitions-v1',count:120}} as any);
 api.startAnalysisJob=async(_id,body)=>{bodies.push(body);return{job:{id:'job-'+bodies.length,sessionId:f.view.session.id,state:'completed',evidenceIds:body.evidenceIds,captureEpoch:'epoch',createdAt:'',updatedAt:''}};};
 const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}});
 const controls=()=>find(ui.tree,n=>n.type===LightweightReaderControls);const settle=async()=>{await new Promise(r=>setTimeout(r,0));ui.render();};
 try{await settle();assert.equal(controls().props.geminiAvailable,true);
  controls().props.onMode('gemini');ui.render();await settle();controls().props.onRead();await settle();
  assert.equal(bodies.length,1);assert.deepEqual(Object.keys(bodies[0].reader).sort(),['areaId','definitionSHA','kind','readingTarget'],'explicit public-scene target, no local-only frame/task/input mode');assert.equal(bodies[0].reader.readingTarget.mode,'public-scene');assert.equal(bodies[0].reader.kind,'gemini-game-observation-v1');assert.equal(bodies[0].reader.definitionSHA,definition.definitionSHA);assert.equal(bodies[0].evidenceIds.length,1,'one current-epoch photo');assert(!('task' in bodies[0].reader)&&!('inputMode' in bodies[0].reader));
  controls().props.onMode('local');ui.render();await settle();controls().props.onRead();await settle();assert.equal(bodies[1].reader.kind,'local-observation-v1');
  controls().props.onMode('existing');ui.render();await settle();assert.equal(find(ui.tree,n=>n.type===LightweightReaderControls).props.mode,'existing');
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.recognitionReaders=old.status;api.startAnalysisJob=old.start;}
});
test('turn and memo disclosure keeps its draft mounted while collapsed and toggles independently of the board',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx'),{api}=await import('../src/api.ts');const f=candidateFixture();Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});
 const old={jobs:api.analysisJobs,status:api.recognitionReaders};api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({version:'local-reader-capabilities-v1',readers:[],definitions:{indexSHA:'',version:'game-photo-definitions-v1',count:120}} as any);
 const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}});
 try{await new Promise(r=>setTimeout(r,0));ui.render();const details=()=>find(ui.tree,n=>n.type==='details'&&n.props.className==='cw-context');
  assert.equal(details().props.open,false,'narrow screens start collapsed');const quick=()=>nodes(ui.tree).filter(n=>typeof n.type==='function'&&n.type.name==='QuickContext');assert.equal(quick().length,1,'the editor stays mounted so a draft survives collapse');
  details().props.onToggle({currentTarget:{open:true}});ui.render();assert.equal(details().props.open,true);assert.equal(quick().length,1);
  details().props.onToggle({currentTarget:{open:false}});ui.render();assert.equal(details().props.open,false);assert.equal(quick().length,1);
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.recognitionReaders=old.status;}
});

// ---- Simple photo flow: results first, optional manual board, defaults without a provider chooser, one-tap board creation ----
const textOf=(t:any):string=>typeof t==='string'||typeof t==='number'?String(t):Array.isArray(t)?t.map(textOf).join(''):t&&t.props?textOf(t.props.children):'';
function acceptedResultFixture(placedAt?:{type:'hex';id:string},status:'accepted'|'candidate'='accepted'){
 const f=candidateFixture(),r=f.source.observationReceipts[0];
 const observation=(ref:string,bbox:any,props:any)=>({ref,imageIndex:0,panelRef:null,componentId:'terrain',bbox,face:'front',quantity:1,rotationDegrees:null,properties:props,referenceCandidates:[]});
 const result={version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[observation('a',{x:.1,y:.1,width:.1,height:.1},{variant:{state:'observed',value:'forest'}}),observation('b',{x:.3,y:.3,width:.1,height:.1},{variant:{state:'unknown',value:null,reason:'unreadable'}}),observation('c',{x:.5,y:.5,width:.1,height:.1},{})]};
 const piece=f.source.value.components[0];if(placedAt)piece.location=placedAt;
 const source={...f.source,status,basis:status==='accepted'?'user':'observation',updatedAt:'2026-01-03',observationReceipts:[{...r,frame:null,geometryCandidates:[],result}]};
 f.view.session.assertions=[source];Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});return f;
}
test('the illustrated Catan board leads even when no piece has a confirmed position; original photo stays optional',async()=>{
 const {loadPhotoDefinitions}=await import('../src/photoDefinitions.ts'),{PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');await loadPhotoDefinitions();
 const f=acceptedResultFixture(),ui=mount(SceneWorkspace,{view:f.view,busy:false,mutate:async()=>{},onEvidence(){},onReadyToSave(){}});
 try{
  const overlay=find(ui.tree,n=>n.type===PhotoObservationOverlay);assert.equal(overlay.props.open,false);assert.equal(overlay.props.compact,true);
  assert.match(textOf(find(ui.tree,n=>n.props?.className==='scene-read-summary')),/사진에서 읽은 결과 3개.*위치 미정/);
  const items=nodes(ui.tree),body=find(ui.tree,n=>n.props?.className?.includes?.('scene-primary-board'));
  assert(items.indexOf(body)<items.indexOf(overlay),'the editable board appears before the source photo');
  assert(nodes(body).some(n=>n.type===SceneEditor),'the editor is visible and mounted without a confirmation tap');
  assert(!('hidden' in body.props));assert(!items.some(n=>n.props?.className?.includes?.('scene-manual-toggle')));
 }finally{ui.dispose();}
 const placed=acceptedResultFixture({type:'hex',id:'r1c1'}),ui2=mount(SceneWorkspace,{view:placed.view,busy:false,mutate:async()=>{},onEvidence(){},onReadyToSave(){}});
 try{assert.equal(find(ui2.tree,n=>n.type===PhotoObservationOverlay).props.open,false);assert(nodes(find(ui2.tree,n=>n.props?.className?.includes?.('scene-primary-board'))).some(n=>n.type===SceneEditor));}finally{ui2.dispose();}
});
test('result overlay keeps source boxes empty, folds read values into the list, and never requires a correction',async()=>{
 const {photoDefinitionFor,loadPhotoDefinitions}=await import('../src/photoDefinitions.ts'),{PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');await loadPhotoDefinitions();
 const f=acceptedResultFixture(),r=f.view.session.assertions[0].observationReceipts![0],definition=photoDefinitionFor(f.view.pack)!;
 const html=renderToStaticMarkup(React.createElement(PhotoObservationOverlay,{photos:f.view.session.evidence,request:r.request,result:r.result,geometry:[],definition,compact:true,open:true}));
 assert.match(html,/<details class="lightweight-reader is-result" open="">/);assert.match(html,/lw-photo-review is-compact/);assert.match(html,/class="lw-source-box"[^>]*><\/button>/,'source outlines contain no text');assert.match(html,/사진 참고/);assert.doesNotMatch(html,/읽기 어려움|가림/);
 assert.match(html,/<details class="lw-list-fold"><summary>목록으로 보기 3개/);assert.match(html,/틀린 값이 있으면 아래 ‘직접 고치기’에서 고칠 수 있어요/);assert.doesNotMatch(html,/명시적으로 반영해 주세요/);
});
test('without a chosen provider the photo read stays on Terra high (loading or unavailable): preserved photo, clear blocker, never a silent existing-AI start',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace.tsx'),{api}=await import('../src/api.ts'),{loadPhotoDefinitions}=await import('../src/photoDefinitions.ts');await loadPhotoDefinitions();
 const old={jobs:api.analysisJobs,status:api.recognitionReaders,start:api.startAnalysisJob};
 const terra=(available:boolean)=>async()=>({version:'local-reader-capabilities-v1',readers:[{kind:'terra-high-game-observation-v1',available,cloudSupported:true,identity:null,...(available?{}:{reason:'Terra high 연결 설정이 없어요.'})}],definitions:{indexSHA:'',version:'game-photo-definitions-v1',count:120}} as any);
 for(const [label,readers,wantStart] of [['terra offered',terra(true),true],['terra unavailable',terra(false),false],['capabilities still loading',()=>new Promise<any>(()=>{}),false],['capabilities failed',async()=>{throw new Error('offline');},false]] as const){
  const f=candidateFixture();Object.assign(f.view.session,{captureEpoch:'epoch',notes:{},activity:[],turnInstanceId:'turn'});const bodies:any[]=[];
  api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=readers as any;api.startAnalysisJob=async(_id,body)=>{bodies.push(body);return{job:{id:'job',sessionId:f.view.session.id,state:'completed',evidenceIds:body.evidenceIds,captureEpoch:'epoch',createdAt:'',updatedAt:''}};};
  const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true,provider:'gateway',model:'synthetic'},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}});
  try{await new Promise(r=>setTimeout(r,0));ui.render();await new Promise(r=>setTimeout(r,0));ui.render();
   const c=find(ui.tree,n=>n.type===LightweightReaderControls);assert.equal(c.props.mode,'terra',label);c.props.onRead();await new Promise(r=>setTimeout(r,0));
   assert.equal(bodies.length,wantStart?1:0,label);
   if(wantStart){assert.equal(bodies[0].reader.kind,'terra-high-game-observation-v1',label);assert.deepEqual(Object.keys(bodies[0].reader).sort(),['areaId','definitionSHA','kind','readingTarget']);assert.equal(bodies[0].reader.readingTarget.mode,'public-scene');}
  }finally{ui.dispose();}
 }
 api.analysisJobs=old.jobs;api.recognitionReaders=old.status;api.startAnalysisJob=old.start;
});
test('new board: a game and one button are enough; mode, name, count and colours sit in one optional disclosure with unchanged defaults',async()=>{
 const {RoomEntry}=await import('../src/RoomEntry.tsx'),{GamePicker}=await import('../src/GamePicker.tsx'),{api}=await import('../src/api.ts');
 const packs=[{id:'carcassonne',version:'1.0.0',title:'카르카손',edition:'기본판'}] as any;const old={create:api.create,createRoom:api.createRoom,device:api.roomDevice};const calls:any[]=[];
 api.create=(async(body:any)=>{calls.push(['create',body]);return {session:{}} as any;}) as any;api.createRoom=(async(body:any)=>{calls.push(['room',body]);return {session:{}} as any;}) as any;api.roomDevice=(async()=>{calls.push(['device']);return {ok:true};}) as any;
 const created:any[]=[],ui=mount(RoomEntry,{packs,joining:false,onClose(){},onCreated:async(v:any)=>{created.push(v);}});
 try{
  const form=find(ui.tree,n=>n.type==='form');
  const outside=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(outside):t.type==='details'?[]:[t,...outside(t.props?.children)];
  const main=outside(form.props.children);
  assert(main.some(n=>n.type===GamePicker),'the game picker is in the main flow');assert(!main.some(n=>n.type==='input'),'no input is required up front');assert(!main.some(n=>n.props?.name==='record-mode'));
  const options=find(ui.tree,n=>n.type==='details'&&n.props.className==='room-options');assert.match(textOf(options),/더 설정 · 선택/);assert.match(textOf(options),/기록 방식/);assert.match(textOf(options),/총 플레이어 수/);assert(nodes(options).some(n=>n.type==='input'&&n.props.type==='number'));
  assert.match(textOf(find(ui.tree,n=>n.type==='button'&&n.props.className==='button primary full')),/기록 시작/);
  form.props.onSubmit({preventDefault(){}});await new Promise(r=>setTimeout(r,0));
  assert.equal(calls.length,1);assert.equal(calls[0][0],'create');assert.equal(calls[0][1].gamePackId,'carcassonne');assert.equal(calls[0][1].name,undefined);assert.equal(calls[0][1].players.length,4,'the previous default of four players is kept');assert(!calls.some(c=>c[0]==='device'||c[0]==='room'),'no room or device step for the default path');assert.equal(created.length,1);
 }finally{ui.dispose();api.create=old.create;api.createRoom=old.createRoom;api.roomDevice=old.device;}
});

test('a fresh unaccepted Catan scene appears in the editable board without accepting or mutating it',async()=>{
 const {loadPhotoDefinitions}=await import('../src/photoDefinitions.ts'),{PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');await loadPhotoDefinitions();
 for(const accepted of [false,true]){
  const f=acceptedResultFixture(undefined,'candidate');if(accepted)f.view.session.assertions.unshift({id:'old-board',field:'board.layout',status:'accepted',basis:'user',evidenceIds:[],updatedAt:'2026-01-01',value:{version:2,coverage:'partial',components:[]}} as any);
  const before=JSON.stringify(f.view.session.assertions),writes:any[]=[],ui=mount(SceneWorkspace,{view:f.view,busy:false,mutate:async()=>{writes.push(1);},onEvidence(){},onReadyToSave(){}});
  try{const overlay=find(ui.tree,n=>n.type===PhotoObservationOverlay);assert.equal(overlay.props.open,false,'accepted='+accepted);assert.match(textOf(find(ui.tree,n=>n.props?.className==='scene-read-summary')),/사진에서 읽은 결과 3개/);const editor=find(ui.tree,n=>n.type===SceneEditor);assert(editor.props.value.components.some((c:any)=>c.id===f.source.value.components[0].id));assert.equal(JSON.stringify(f.view.session.assertions),before);assert.equal(writes.length,0);}finally{ui.dispose();}
 }
});
test('the board editor stays visible without a photo definition or read result',async()=>{
 const f=acceptedResultFixture();const view={...f.view,pack:{...f.view.pack,id:'carcassonne'}} as any;
 const ui=mount(SceneWorkspace,{view,busy:false,mutate:async()=>{},onEvidence(){},onReadyToSave(){}});
 try{const body=find(ui.tree,n=>n.props?.className?.includes?.('scene-primary-board'));assert(nodes(body).some(n=>n.type===SceneEditor));assert(!('hidden' in body.props));}finally{ui.dispose();}
});
test('an earlier Catan scene without an observation receipt still opens in the illustrated board',()=>{
 const f=acceptedResultFixture({type:'hex',id:'r1c1'});delete f.source.observationReceipts;
 const ui=mount(SceneWorkspace,{view:f.view,busy:false,mutate:async()=>{},onEvidence(){},onReadyToSave(){}});
 try{const editor=find(ui.tree,n=>n.type===SceneEditor);assert(editor.props.value.components.some((c:any)=>c.id===f.source.value.components[0].id));assert(!nodes(ui.tree).some(n=>n.props?.className?.includes?.('scene-manual-toggle')));}finally{ui.dispose();}
});

test('selected generic observations use pinned request names while null and unrecognized kinds stay unknown',async()=>{
 const {PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');
 const f=acceptedResultFixture(),receipt=f.view.session.assertions[0].observationReceipts![0];
 const request={...receipt.request,allowedComponents:['dice','cards'],componentLabels:{dice:{name:'주사위',physicalType:'die'},cards:{name:'카드',physicalType:'card'}}};
 const result={...receipt.result,observations:['dice','cards',null,'unrecognized'].map((componentId,i)=>({ref:`label-${i}`,componentId,imageIndex:0,panelRef:null,bbox:{x:.1+i*.2,y:.2,width:.1,height:.1},face:'front',quantity:1,rotationDegrees:null,properties:{},referenceCandidates:[]}))};
 const before=structuredClone({request,result});
 for(const compact of [false,true]){
  const ui=mount(PhotoObservationOverlay,{photos:f.view.session.evidence,request,result,geometry:[],definition:{components:[]},compact,open:true});
  try{
   for(const [i,name] of ['주사위','카드','종류 모름','종류 모름'].entries()){
    const boxes=nodes(ui.tree).filter(n=>n.props?.className==='lw-source-box');assert.equal(boxes[i].props.children,undefined);
    boxes[i].props.onClick();ui.render();assert.equal(textOf(find(ui.tree,n=>n.props?.role==='status').props.children[0]),name);
   }
   const list=find(ui.tree,n=>n.props?.className==='lw-observation-list');assert.match(textOf(list),/1\. 주사위/);assert.match(textOf(list),/2\. 카드/);assert.doesNotMatch(textOf(list),/unrecognized/);
  }finally{ui.dispose();}
 }
 assert.deepEqual({request,result},before);
});

test('empty source outlines retain accessible identity and clicking shows values beside the photo without changing raw observations',async()=>{
 const {photoDefinitionFor,loadPhotoDefinitions}=await import('../src/photoDefinitions.ts'),{PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');await loadPhotoDefinitions();
 const f=acceptedResultFixture(),r=f.view.session.assertions[0].observationReceipts![0],definition=photoDefinitionFor(f.view.pack)!;
 const meta=(c:string)=>({observedColor:{state:'observed',value:c},quantity:{state:'observed',value:1},face:{state:'observed',value:'front'}});
 const ob=(ref:string,componentId:string,x:number,props:any)=>({ref,imageIndex:0,panelRef:null,componentId,bbox:{x,y:.2,width:.1,height:.1},face:'front',quantity:1,rotationDegrees:null,properties:props,referenceCandidates:[]});
 const result={...r.result,observations:[ob('n','number-token',.1,{...meta('beige'),number:{state:'observed',value:8}}),ob('t','terrain',.3,{...meta('gray'),variant:{state:'observed',value:'forest'}}),ob('u','number-token',.5,{...meta('beige'),number:{state:'unknown',value:null,reason:'unreadable'}}),ob('m','road',.7,meta('red'))]};
 const before=structuredClone(result);
 for(const compact of [false,true]){
  const ui=mount(PhotoObservationOverlay,{photos:f.view.session.evidence,request:r.request,result,geometry:[],definition,compact,open:true});
  try{const boxes=()=>nodes(ui.tree).filter(n=>n.props?.className==='lw-source-box');assert.equal(boxes().length,4);
   for(const [i,box] of boxes().entries()){assert.equal(box.props.children,undefined,'no number or text covers the original');assert.equal(box.props['aria-label'],`원본 관측 ${i+1}`);assert.equal(box.props.style.left,`${[.1,.3,.5,.7][i]*100}%`);}
   boxes()[0].props.onClick();ui.render();const known=find(ui.tree,n=>n.props?.role==='status');assert.match(textOf(known),/8/);assert.equal(boxes()[0].props['aria-pressed'],true);
   boxes()[2].props.onClick();ui.render();const unknown=find(ui.tree,n=>n.props?.role==='status');assert.match(textOf(unknown),/사진 참고/);assert.doesNotMatch(textOf(unknown),/읽기 어려움|가림|숫자: 0/);assert.equal(boxes()[0].props['aria-pressed'],false);
   assert.match(textOf(ui.tree),/beige|베이지|색/,'raw observed metadata stays available outside the image');
  }finally{ui.dispose();}
 }
 assert.deepEqual(result,before);

});

test('optional structure co-output is selected without starting a job; omitted/default hosted selection stays legacy',async()=>{
 const {default:SessionWorkspace}=await import('../src/SessionWorkspace'),{api}=await import('../src/api'),{loadPhotoDefinitions}=await import('../src/photoDefinitions');await loadPhotoDefinitions();
 const old={jobs:api.analysisJobs,status:api.recognitionReaders,start:api.startAnalysisJob},bodies:any[]=[];const f=candidateFixture();Object.assign(f.view.session,{captureEpoch:'epoch',turnInstanceId:'turn',notes:{},activity:[]});
 api.analysisJobs=async()=>({jobs:[]});api.recognitionReaders=async()=>({readers:[{kind:'terra-high-game-observation-v1',available:true,cloudSupported:true,identity:null}]} as any);api.startAnalysisJob=async(_id,body)=>{bodies.push(body);return{job:{id:'mock-'+bodies.length,sessionId:f.view.session.id,state:'completed',evidenceIds:body.evidenceIds,captureEpoch:'epoch',createdAt:'',updatedAt:''}};};
 const ui=mount(SessionWorkspace,{view:f.view,busy:false,status:{configured:true},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}}),settle=async()=>{await new Promise(r=>setTimeout(r,0));ui.render();};
 try{await settle();await settle();let controls=find(ui.tree,n=>n.type===LightweightReaderControls);assert.equal(controls.props.sceneReading,false);controls.props.onRead();await settle();assert.equal(bodies.length,1);assert(!('scene'in bodies[0].reader));
  controls=find(ui.tree,n=>n.type===LightweightReaderControls);const actual=LightweightReaderControls(controls.props);find(actual,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});ui.render();assert.equal(bodies.length,1,'changing the optional request contract never starts a model');find(ui.tree,n=>n.type===LightweightReaderControls).props.onRead();await settle();assert.equal(bodies.length,2);assert.equal(bodies[1].reader.scene,true);const {scene,...rest}=bodies[1].reader;assert.deepEqual(rest,bodies[0].reader);assert.equal(rest.kind,'terra-high-game-observation-v1');
 }finally{ui.dispose();api.analysisJobs=old.jobs;api.recognitionReaders=old.status;api.startAnalysisJob=old.start;}
});
