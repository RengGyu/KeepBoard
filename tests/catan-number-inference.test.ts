import test from 'node:test';
import assert from 'node:assert/strict';
import {catanPack} from '../gamepacks/catan';
import {catalogPacks} from '../gamepacks/catalog';
import {recompute,answerField} from '../server/engine';
import {CATAN_TOPOLOGY,normalizeScene,type ComponentScene} from '../shared/scene';
import type {Session,Assertion,Value} from '../shared/types';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {decodeCatanScenePayload} from '../server/ai/catanSceneReading';
import {projectScanResults,type PinnedScanObservation} from '../server/scanObservation';
import {sceneWorkspaceData} from '../src/sceneWorkspaceModel';
import {recordedScene} from '../shared/boardRecording';
import {canonicalBoard} from '../shared/catanSummary';

const values=[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
function scene():ComponentScene{
 const components=CATAN_TOPOLOGY.hexes.map((hex,i)=>({id:'terrain-'+i,kind:'terrain' as const,variant:i===18?'desert':'forest',number:null,quantity:1,ownerId:null,location:{type:'hex' as const,id:hex.id},region:null,evidenceId:'photo',face:'front' as const}));
 return {version:2,coverage:'full',coverageByLayer:{numbers:'complete'},components:[...components,...values.map((number,i)=>({...components[i],id:'number-'+i,kind:'number-token' as const,variant:null,number:i===2?null:number}))]};
}
function fixture(value=scene()){
 const pack=structuredClone(catanPack);
 const source:Assertion={id:'reading',field:'board.layout',value:value as unknown as Value,basis:'observation',status:'accepted',evidenceIds:['photo'],confidence:0,updatedAt:'2026-11-02'};
 const session:Session={id:'synthetic',name:'test',gamePackId:pack.id,gamePackVersion:pack.version,createdAt:'2026-11-02',updatedAt:'2026-11-02',captureEpoch:'epoch',turnInstanceId:'turn',stage:'questions',players:[],assertions:[source],evidence:[{id:'photo',url:'/synthetic',kind:'photo',scope:'public',captureEpoch:'epoch',capturedAt:'2026-11-02',label:'synthetic'}],preservations:[],snapshots:[],notes:{},activity:[],example:false};
 return {pack,source,session};
}
const inference=(s:ReturnType<typeof fixture>)=>recompute(s.session,s.pack).derived.find(a=>a.id.startsWith('rule:catan-single-number:'));
test('complete multiset subtracts duplicates once, assumes low-confidence known values and preserves the observation',()=>{
 const f=fixture(),raw=JSON.stringify(f.source),derived=inference(f)!;
 assert(derived);assert.equal(normalizeScene(derived.value).components.find(c=>c.id==='number-2')!.number,3);
 assert.equal(derived.basis,'rule');assert.match(derived.reason!,/다른 판독값은 맞다고 가정/);assert.match(derived.reason!,/직접 읽은 값이 아닙니다/);
 assert.equal(JSON.stringify(f.source),raw);
 const restored=JSON.parse(JSON.stringify(f.session));const again=recompute(restored,f.pack).derived.find(a=>a.id===derived.id)!;
 assert.deepEqual(again.value,derived.value);assert.equal(restored.assertions.filter((a:Assertion)=>a.id===derived.id).length,1);
 answerField(restored,f.pack,'board.layout',derived.value);const saved=recompute(JSON.parse(JSON.stringify(restored)),f.pack);
 assert.equal(normalizeScene(saved.session.assertions.filter(a=>a.field==='board.layout'&&a.status==='accepted').at(-1)!.value).components.find(c=>c.id==='number-2')!.number,3);
});
test('partial coverage, several slots, missing objects and invalid multiset cannot deduce a number',()=>{
 const mutations:[string,(s:ComponentScene)=>void][]=[
  ['partial',s=>{s.coverage='partial';}],['numbers unknown',s=>{s.coverageByLayer!.numbers='unknown';}],
  ['two unknown slots',s=>{s.components.find(c=>c.id==='number-3')!.number=null;}],
  ['missing token',s=>{s.components=s.components.filter(c=>c.id!=='number-0');}],
  ['missing terrain',s=>{s.components=s.components.filter(c=>c.id!=='terrain-0');}],
  ['duplicate slot',s=>{s.components.find(c=>c.id==='number-1')!.location.id='r1c1';}],
  ['unknown count',s=>{s.components.find(c=>c.id==='number-1')!.quantity=null;}],
  ['explicit zero',s=>{s.components.find(c=>c.id==='number-1')!.quantity=0;}],
  ['extra duplicate value',s=>{s.components.find(c=>c.id==='number-0')!.number=12;}],
 ];
 for(const [label,mutate]of mutations){const value=scene();mutate(value);const f=fixture(value),before=JSON.stringify(f.source);assert.equal(inference(f),undefined,label);assert.equal(JSON.stringify(f.source),before,label);}
 const f=fixture();delete f.pack.catanNumberInventory;assert.equal(inference(f),undefined,'historical pack without inventory');
});
test('single native scan retains complete-source proof and immutable unknown receipt through editable projection/reopen',async()=>{
 const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack),f=fixture(),session=f.session;
 const request=compileObservationTask({pack,definition,areaId:'board',taskId:'unit',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]});
 const reader={kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768} as const;
 const payload={assertions:[{field:'board.layout',value:scene(),evidenceIds:['photo']}],summary:'synthetic',warnings:[]};
 const result=decodeCatanScenePayload(payload,{request,definition,pack,session,evidence:session.evidence,reader,sourceImageSHA:'a'.repeat(64)});
 const plan={version:'scan-observation-plan-v1' as const,id:'scan',gameId:'catan',definitionSHA:definition.definitionSHA,scope:request.scope,anchorEvidenceId:'photo',units:[{id:'unit',evidenceId:'photo',sourceEvidenceId:'photo',sourceSHA:'a'.repeat(64),inputSHA:'a'.repeat(64),areaId:'board',role:'anchor' as const,target:null}]};
 result.observationReceipts![0].scanUnitId='unit';result.scanBundle={plan,units:[{unitId:'unit',state:'completed',observationCount:37}],links:[]};
 const before=JSON.stringify(result),scan={plan,units:[{id:'unit',evidenceId:'photo',hosted:{definition}}]} as unknown as PinnedScanObservation;
 session.assertions=[];
 const projected=projectScanResults(session,pack,scan,[result]);session.assertions=projected.assertions.map(a=>({...a,status:'accepted'}));
 assert.equal(normalizeScene(session.assertions[0].value).coverage,'partial');
 const receiptBefore=JSON.stringify(session.assertions[0].observationReceipts);
 const view=recompute(session,pack),derived=view.derived.find(a=>a.id.startsWith('rule:catan-single-number:'))!;
 assert(derived,'the current native scan path, not only the helper, deduces the residual');
 assert.equal(normalizeScene(derived.value).components.filter(c=>c.kind==='number-token'&&c.number===3).length,2);
 assert.equal(JSON.stringify(result),before);assert.equal(JSON.stringify(derived.observationReceipts),receiptBefore);
 assert(derived.observationReceipts![0].result.observations.some(o=>o.componentId==='number-token'&&o.properties.number.state==='unknown'));
 const reopened=JSON.parse(JSON.stringify(session));reopened.captureEpoch='resumed-epoch';
 const resumed=recompute(reopened,pack),chosen=sceneWorkspaceData(resumed).assertions.filter(a=>a.field==='board.layout'&&a.status==='accepted').at(-1)!;
 assert.equal(chosen.basis,'rule','SceneWorkspace chooses the last accepted result, not engine currentFacts');
 const editable=recordedScene(resumed,'board.layout',chosen).scene;
 assert.equal(editable.components.filter(c=>c.kind==='number-token'&&c.number===3).length,2);
 assert.deepEqual(canonicalBoard(resumed.session).scene,editable);
 // Render the actual workspace/editor selection, not just the derived array.
 const {register}=await import('node:module');register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
 const priorWindow=globalThis.window;globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
 const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{SceneWorkspace}=await import('../src/SceneWorkspace');
 const html=renderToStaticMarkup(React.createElement(SceneWorkspace,{view:resumed,busy:false,mutate:async()=>{},onEvidence(){}}));
 if(priorWindow===undefined)Reflect.deleteProperty(globalThis,'window');else globalThis.window=priorWindow;
 assert.match(html,/aria-label="카탄 보드 그림"/);
 assert.equal((html.match(/aria-label="[^"]* 3, /g)??[]).length,2,'both physical 3 discs are drawn in the actual editor');
 // Exercise the real local save/reload/resume endpoints with a synthetic store, no reader call.
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');
 const {Store}=await import('../server/store'),{createApp}=await import('../server/index');
 const directory=await mkdtemp(join(tmpdir(),'kb-number-inference-')),store=new Store(directory);
 const persisted=JSON.parse(JSON.stringify(session));persisted.gamePack=pack;persisted.gamePackVersion=pack.version;
 await store.saveSession(persisted);
 const app=await createApp({store,ui:false,runtimePacks:[pack],analyzer:async()=>{throw Error('No model call allowed');}}),server=app.listen(0,'127.0.0.1');
 try{
  await new Promise<void>((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  const address=server.address();assert(address&&typeof address!=='string');
  const call=async(suffix='',method='GET',body?:unknown)=>{const response=await fetch(`http://127.0.0.1:${address.port}/api/sessions/${persisted.id}${suffix}`,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(response.status,200);return response.json();};
  await call('/commit','POST',{allowIncomplete:true});
  const saved=await call();assert.equal(canonicalBoard(saved.session).scene.components.filter(c=>c.kind==='number-token'&&c.number===3).length,2);
  await call('/resume','POST',{});const reloaded=await call();assert.notEqual(reloaded.session.captureEpoch,persisted.captureEpoch);
  assert.equal(canonicalBoard(reloaded.session).scene.components.filter(c=>c.kind==='number-token'&&c.number===3).length,2);
  const savedSource=reloaded.session.assertions.find((a:Assertion)=>a.basis==='observation')!;
  assert.equal(JSON.stringify(savedSource.observationReceipts),receiptBefore);
  assert.equal(normalizeScene(savedSource.value).components.filter(c=>c.kind==='number-token'&&c.number==null).length,1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(directory,{recursive:true,force:true});}
 for(const mutate of [(a:Assertion)=>{a.observationReceipts![0].request.scope.captureEpoch='old';},(a:Assertion)=>{normalizeScene(a.value);(a.value as any).components.pop();},(a:Assertion)=>{a.observationReceipts![0].hostedWire!.id='gemini-game-wire-v1';}]){
  const changed=JSON.parse(JSON.stringify(session));changed.assertions=changed.assertions.filter((a:Assertion)=>a.basis!=='rule');mutate(changed.assertions[0]);assert(!recompute(changed,pack).derived.some(a=>a.id.startsWith('rule:catan-single-number:')));
 }
});
