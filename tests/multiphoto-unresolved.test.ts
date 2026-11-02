import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {prepareScanObservation,projectScanResults} from '../server/scanObservation';import {decodeGeminiGameObservation} from '../server/ai/geminiGameReader';import {assembleObservations} from '../server/ai/observationAssembly';
import type {Session,Evidence,AnalysisResult} from '../shared/types';
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack),image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const harbor=(x:number,width=.1,extra:any={})=>({kind:'harbor',box_1000:[100,x*1000,200,(x+width)*1000],face:'front',quantity:1,attributes:[{id:'variant',valueJson:'"brick"',unknownReason:null},{id:'ratio',valueJson:'2',unknownReason:null}],...extra});
async function fixture(items:any[][],extra?:{detail?:boolean;baseline?:any[];failedAnchor?:boolean}){
 const evidence=items.map((_,i)=>({id:'e'+i,url:'/synthetic/'+i,kind:'photo',scope:'public',captureEpoch:'epoch',label:'synthetic',...(i&&!extra?.detail?{sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:1,height:1}}:{})}) as Evidence);
 const session={id:'synthetic',name:'synthetic',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:[],evidence,assertions:[],notes:{},activity:[],preservations:[],snapshots:[]} as unknown as Session;
 if(extra?.baseline)session.assertions.push({id:'manual',field:'board.layout',value:{version:2,coverage:'partial',components:extra.baseline},basis:'user',status:'accepted',evidenceIds:[],updatedAt:'before'} as any);
 const reader={identity:{kind:'gemini-game-observation-v1',model:'synthetic',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},status:async()=>({available:true})} as any;
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'board'},taskId:'scan',reader,cloud:false,readImage:async()=>({data:image,mimeType:'image/png'})});
 const results=scan.units.map((u,i)=>{if(i===0&&extra?.failedAnchor)return {assertions:[],warnings:[],summary:'failed',mode:'live',scanBundle:{plan:scan.plan,units:[{unitId:u.id,state:'failed',observationCount:0}],links:[]}} as AnalysisResult;
  const p=u.hosted!,native={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:items[i]})}]}}]},raw=decodeGeminiGameObservation(native,p.request,p.definition,undefined,p.transforms),result=assembleObservations({request:p.request,result:raw,pack,definition:p.definition,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA});
  result.observationReceipts![0].scanUnitId=u.id;result.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:raw.observations.length}],links:[]};return result;
 });return {session,scan,results,project:(rs=results)=>projectScanResults(session,pack,scan,rs)};
}
const components=(r:AnalysisResult)=>(r.assertions[0].value as any).components;
test('intermediate overlapping crops keep both source observations in one unresolved relation, not a physical piece',async()=>{
 const f=await fixture([[],[harbor(.1)],[harbor(.12,.12)]]),before=JSON.stringify(f.results),r=f.project(),groups=r.scanBundle!.unresolvedGroups;
 assert.equal(components(r).length,0);assert.equal(groups?.length,1);assert.equal(groups[0].reason,'possible-same-object');assert.equal(groups[0].members.length,2);assert.deepEqual(groups[0].relatedPieceIds,[]);assert.equal(JSON.stringify(f.results),before);
 assert.deepEqual(f.project([...f.results].reverse()).scanBundle,r.scanBundle);assert.deepEqual(f.project([...f.results,f.results[1]]).scanBundle,r.scanBundle,'same durable unit redelivery is idempotent');
 assert(r.observationReceipts!.every(receipt=>Object.keys(receipt.componentRefs).length===0));
});
test('failed anchor and unrelated manual baseline do not hide a disjoint same-root crop-only record',async()=>{
 const road={id:'manual-road',kind:'road',quantity:0,ownerId:null,variant:null,location:{type:'edge',id:'h:r1c1:e0'},evidenceId:null,region:null};
 const f=await fixture([[],[harbor(.1)]],{baseline:[road],failedAnchor:true}),r=f.project();assert.equal(components(r).length,2);assert.deepEqual(components(r)[0],road);assert.equal(components(r)[1].kind,'harbor');assert.equal(components(r)[1].location.type,'unplaced');assert.equal(r.scanBundle!.unresolvedGroups?.length??0,0);
});
test('transitive overlap retains every claim for review without turning the relation into one physical object',async()=>{
 const f=await fixture([[],[harbor(.1)],[harbor(.11)],[harbor(.12)]]),r=f.project();
 assert.equal(components(r).length,0);assert.equal(r.scanBundle!.unresolvedGroups?.length,1);assert.equal(r.scanBundle!.unresolvedGroups![0].members.length,3);
 assert(r.scanBundle!.links.every(link=>link.status==='conflict'&&!link.targetPieceId));
 assert.deepEqual(f.project([...f.results].reverse()).scanBundle,r.scanBundle);
});
test('boxless, unregistered views and same-kind unknown baseline remain groups rather than inventory',async()=>{
 const f=await fixture([[],[harbor(.1, .1,{box_1000:null,quantity:null})]]),r=f.project();assert.equal(components(r).length,0);assert.equal(r.scanBundle!.unresolvedGroups?.[0].reason,'missing-source-box');assert.equal(r.observationReceipts![1].result.observations[0].quantity,null);
 const d=await fixture([[],[harbor(.1)]],{detail:true}),rd=d.project();assert.equal(components(rd).length,0);assert.equal(rd.scanBundle!.unresolvedGroups?.[0].reason,'unregistered-view');
 const b=await fixture([[],[harbor(.1)]],{baseline:[{id:'old',kind:'harbor',ratio:3,quantity:0,variant:'generic',location:{type:'unplaced',id:null},evidenceId:null,region:null,ownerId:null}]}),rb=b.project();assert.equal(components(rb).length,1);assert.equal(components(rb)[0].ratio,3);assert.equal(components(rb)[0].quantity,0);assert.equal(rb.scanBundle!.unresolvedGroups?.[0].reason,'unregistered-view');
});
test('adjacent same-value objects remain separate, and cross owner/epoch/area receipts cannot create relationships',async()=>{
 const f=await fixture([[],[harbor(.1),harbor(.5)]]),r=f.project();assert.equal(components(r).length,2);assert.equal(r.scanBundle!.unresolvedGroups?.length??0,0);
 for(const change of [r=>{r.request.scope.ownerId='other';},r=>{r.request.scope.captureEpoch='old';},r=>{r.request.areaId='other';}] as ((r:any)=>void)[]){const wrong=structuredClone(f.results);change(wrong[1].observationReceipts![0]);assert.throws(()=>f.project(wrong),/범위|scope|영역/);}
});
test('manual save and JSON reopen preserve optional groups and immutable source observations; legacy absent optional still saves',async()=>{
 const {answerField}=await import('../server/engine');const f=await fixture([[],[harbor(.1)],[harbor(.12,.12)]]),r=f.project();f.session.assertions=r.assertions;const savedGroups=structuredClone(r.scanBundle!.unresolvedGroups),raw=JSON.stringify(r.observationReceipts!.map(x=>x.result));assert.equal(savedGroups?.length,1);
 answerField(f.session,pack,'board.layout',r.assertions[0].value);let opened=JSON.parse(JSON.stringify(f.session));assert.deepEqual(opened.assertions[0].observationReceipts[0].scanBundle.unresolvedGroups,savedGroups);assert.equal(JSON.stringify(opened.assertions[0].observationReceipts.map((x:any)=>x.result)),raw);
 for(const a of f.session.assertions)for(const receipt of a.observationReceipts??[])delete receipt.scanBundle!.unresolvedGroups;answerField(f.session,pack,'board.layout',f.session.assertions[0].value);opened=JSON.parse(JSON.stringify(f.session));assert.equal(opened.assertions[0].observationReceipts[0].scanBundle.unresolvedGroups,undefined);
});
test('same-source boxless anchor makes crop identity unresolved without merging values or adding another physical object',async()=>{
 const f=await fixture([[harbor(.1,.1,{box_1000:null})],[harbor(.5,.1,{attributes:[{id:'variant',valueJson:'"generic"',unknownReason:null},{id:'ratio',valueJson:'3',unknownReason:null}]})]]),before=JSON.stringify(f.results),r=f.project(),anchor=r.observationReceipts![0],crop=r.observationReceipts![1];
 assert.equal(components(r).length,1);assert.equal(components(r)[0].ratio,2,'known anchor value stays unchanged');
 assert.equal(crop.result.observations[0].properties.ratio.state,'observed');assert.equal(crop.componentRefs['item-1'],undefined,'same kind is not proof of identity');
 assert.equal(r.scanBundle!.unresolvedGroups?.length,1);assert.equal(r.scanBundle!.unresolvedGroups![0].reason,'missing-source-box');
 assert.deepEqual(r.scanBundle!.unresolvedGroups![0].relatedPieceIds,[anchor.componentRefs['item-1']]);assert.equal(r.scanBundle!.unresolvedGroups![0].members[0].unitId,crop.scanUnitId);assert.equal(JSON.stringify(f.results),before);
});
test('different layers or demonstrably disjoint source regions still allow crop-only supplementation',async()=>{
 const different=await fixture([[harbor(.1,.1,{kind:'terrain',box_1000:null,attributes:[{id:'variant',valueJson:'"forest"',unknownReason:null}]})],[harbor(.5)]]),a=different.project();
 assert.deepEqual(components(a).map((x:any)=>x.kind),['terrain','harbor']);assert.equal(a.scanBundle!.unresolvedGroups?.length,0);
 const disjoint=await fixture([[harbor(.1)],[harbor(.5)]]),b=disjoint.project();assert.equal(components(b).length,2);assert.equal(b.scanBundle!.unresolvedGroups?.length,0);
});
test('boxless building kind uncertainty keeps city and settlement claims separate but related',async()=>{
 const f=await fixture([[harbor(.1,.1,{kind:'city',box_1000:null,attributes:[]})],[harbor(.5,.1,{kind:'settlement',attributes:[]})]]),r=f.project();
 assert.equal(components(r).length,1);assert.equal(components(r)[0].kind,'city');assert.equal(r.scanBundle!.unresolvedGroups?.[0].members.length,1);assert.deepEqual(r.scanBundle!.unresolvedGroups![0].relatedPieceIds,[components(r)[0].id]);
});
