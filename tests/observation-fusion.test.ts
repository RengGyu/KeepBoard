import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {effectiveRecognitionPack} from '../shared/recognition';
import {prepareScanObservation,projectScanResults} from '../server/scanObservation';import {decodeGeminiGameObservation} from '../server/ai/geminiGameReader';import {assembleObservations} from '../server/ai/observationAssembly';
import type {Session,Evidence,AnalysisResult} from '../shared/types';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const item=(box:number[],value:number|null=6,quantity:number|null=1)=>({kind:'dice',box_1000:box,face:'front',quantity,attributes:[{id:'dieValue',valueJson:value===null?null:JSON.stringify(value),unknownReason:value===null?'unreadable':null},{id:'dieColor',valueJson:'"yellow"',unknownReason:null},{id:'observedColor',valueJson:'"yellow"',unknownReason:null}]});
async function fixture(items:any[][],options:{session?:Session;id?:string;detail?:boolean;game?:string}={}){
 // Fusion deliberately exercises legacy/free-colour observations as well as typed values.
 // Keep that complete historical request contract; area filtering is tested separately in release-reading-policy.
 const sourcePack={...catalogPacks.find(p=>p.id===(options.game??'sagrada'))!};delete sourcePack.photoReadingPolicy;
 const pack=effectiveRecognitionPack(sourcePack),definition=photoDefinition(pack),area=definition.areas.find(a=>a.id===(options.game==='carcassonne'?'map':'window'))!;
 const evidence=items.map((_,i)=>({id:'e'+i,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic/'+i,label:'synthetic',...(i&&!options.detail?{sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:.5,height:.5}}:{})})as Evidence);
 const session=options.session??({id:'synthetic',name:'synthetic',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:[],evidence,assertions:[],notes:{},activity:[],preservations:[],snapshots:[]}as unknown as Session);
 const reader:any={identity:{kind:'gemini-game-observation-v1',model:'synthetic',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},status:async()=>({available:true})};
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:area.id},taskId:options.id??'scan',reader,cloud:false,readImage:async()=>({data:image,mimeType:'image/png'})});
 const results=scan.units.map((u,i)=>{const p=u.hosted!,native={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:items[i]})}]}}]},raw=decodeGeminiGameObservation(native,p.request,p.definition,undefined,p.transforms),r=assembleObservations({request:p.request,result:raw,pack,definition:p.definition,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA});r.observationReceipts![0].scanUnitId=u.id;r.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:raw.observations.length}],links:[]};return r;});
 return {session,pack,scan,results,project:(rs=results)=>projectScanResults(session,pack,scan,rs)};
}
const pieces=(r:AnalysisResult)=>(r.assertions[0].value as any).pieces;
const stable=(r:AnalysisResult)=>JSON.stringify({values:r.assertions.map(a=>a.value),bundle:r.scanBundle,raw:r.observationReceipts});
test('generic same-unit neighboring individual boxes are not an identity or a veto on detail recovery',async()=>{
 const f=await fixture([[],[item([100,100,300,300]),item([100,290,300,490])]]),r=f.project();assert.equal(pieces(r).length,2);assert.notEqual(pieces(r)[0].id,pieces(r)[1].id);assert(r.scanBundle!.fusion);assert.equal(r.scanBundle!.unresolvedGroups?.length,0);
});
test('individual spatial correspondence preserves the anchor on typed conflicts and retains raw alternatives',async()=>{
 const crop=item([400,400,600,600],9);crop.attributes[2].valueJson='"yellow translucent"';const f=await fixture([[item([200,200,300,300])],[crop]]),before=JSON.stringify(f.results),r=f.project();assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].readout.values.dieValue,6);assert.equal(pieces(r)[0].readout.values.observedColor,'yellow');assert(r.scanBundle!.fusion!.decisions.some(d=>d.fieldPath==='readout.values.dieValue'&&d.basis==='unresolved'&&d.conflict));assert.equal(JSON.stringify(f.results),before);assert.equal(stable(r),stable(f.project([...f.results].reverse())));assert.equal(stable(r),stable(f.project([...f.results,f.results[1]])));
});
test('aggregate refinement is partial and non-additive even when one child is seen; manual aggregate stays protected',async()=>{
 const f=await fixture([[item([100,100,900,900],6,12)],[item([400,400,600,600],9)]]),r=f.project();assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].quantity,1);assert.equal(r.scanBundle!.fusion!.refinements.length,1);assert.equal(r.scanBundle!.fusion!.refinements[0].residualQuantity,null);assert.equal(r.scanBundle!.fusion!.refinements[0].exhaustive,false);assert.equal(r.observationReceipts![0].result.observations[0].quantity,12);
 const first=await fixture([[item([100,100,900,900],6,12)]]),emitted=first.project();first.session.assertions=emitted.assertions;pieces(emitted)[0].quantity=11;const again=await fixture([[item([100,100,900,900],6,12)],[item([400,400,600,600],9)]],{session:first.session,id:'next'}),kept=again.project();assert.equal(pieces(kept).length,1);assert.equal(pieces(kept)[0].quantity,11);assert(kept.scanBundle!.unresolvedGroups?.length);
});
test('next job protects edited null, quantity zero and placement; deletion is not resurrected on subsequent jobs',async()=>{
 const f=await fixture([[item([200,200,300,300])],[item([400,400,600,600],9)]]),r=f.project();f.session.assertions=r.assertions;const p=pieces(r)[0],id=p.id;p.readout.values.dieValue=null;p.readout.sources.dieValue=null;p.quantity=0;p.placement={areaId:'custom',x:.3,y:.4,rotation:0};
 const second=await fixture([[item([200,200,300,300],2)],[item([400,400,600,600],3)]],{session:f.session,id:'second'}),s=second.project();assert.equal(pieces(s).length,1);assert.equal(pieces(s)[0].id,id);assert.equal(pieces(s)[0].readout.values.dieValue,null);assert.equal(pieces(s)[0].quantity,0);assert.deepEqual(pieces(s)[0].placement,p.placement);assert(s.scanBundle!.fusion!.decisions.some(d=>d.basis==='user-protected'));
 second.session.assertions=s.assertions;(s.assertions[0].value as any).pieces=[];const third=await fixture([[item([200,200,300,300],4)]],{session:second.session,id:'third'}),deleted=third.project();assert.equal(pieces(deleted).length,0);third.session.assertions=deleted.assertions;const fourth=await fixture([[item([200,200,300,300],5)]],{session:third.session,id:'fourth'});assert.equal(pieces(fourth.project()).length,0);
});
test('manual false and literal zero are protected while absent source/failed crop leaves useful base',async()=>{
 const tile=(city:boolean,shields:number)=>({kind:'tiles',box_1000:[200,200,300,300],quantity:1,face:'front',attributes:[{id:'city',valueJson:JSON.stringify(city),unknownReason:null},{id:'shields',valueJson:JSON.stringify(shields),unknownReason:null}]});const f=await fixture([[tile(true,1)]],{game:'carcassonne'}),r=f.project();f.session.assertions=r.assertions;pieces(r)[0].readout.values.city=false;pieces(r)[0].readout.values.shields=0;
 const next=await fixture([[tile(true,2)]],{game:'carcassonne',session:f.session,id:'next'}),kept=next.project();assert.equal(pieces(kept)[0].readout.values.city,false);assert.equal(pieces(kept)[0].readout.values.shields,0);
 const failed=await fixture([[item([200,200,300,300])],[]]);failed.results[1].scanBundle!.units[0].state='failed';assert.equal(pieces(failed.project()).length,1);
});
test('subsequent-job aggregate refinement removes only the unedited AI aggregate, including crop-only detail',async()=>{
 for(const repeatAggregate of [false,true]){
  const first=await fixture([[item([100,100,900,900],6,12)]]),initial=first.project();first.session.assertions=initial.assertions;
  const detail=repeatAggregate?[[item([100,100,900,900],6,12)],[item([400,400,600,600],9)]]:[[],[item([400,400,600,600],9)]];
  const next=await fixture(detail,{session:first.session,id:'detail'}),result=next.project();assert.equal(pieces(result).length,1);assert.equal(pieces(result)[0].quantity,1);assert.equal(result.scanBundle!.fusion!.refinements.length,1);assert.notEqual(pieces(result)[0].id,pieces(initial)[0].id);assert.equal(result.assertions[0].observationReceipts![0].result.observations[0].quantity,12);
 }
});
test('overlap chains and two observations from one unit do not collapse identities',async()=>{
 const f=await fixture([[item([100,100,300,300]),item([100,300,300,500])],[item([200,400,600,800])]]),r=f.project();assert.equal(pieces(r).length,2);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);assert.equal(r.scanBundle!.unresolvedGroups![0].members.length,1);assert.equal(stable(r),stable(f.project([...f.results].reverse())));
 const g=await fixture([[item([100,100,300,300])],[item([200,400,600,800])],[item([200,600,600,1000])]]);
 const chained=g.project();assert.equal(pieces(chained).length,1);assert.equal(chained.scanBundle!.unresolvedGroups!.length,2);
});
test('unknown incoming never clears a known value; machine unknown can be filled next job',async()=>{
 const f=await fixture([[item([200,200,300,300],null)]]),r=f.project();f.session.assertions=r.assertions;
 const next=await fixture([[item([200,200,300,300],0)]],{session:f.session,id:'fill'}),filled=next.project();assert.equal(pieces(filled)[0].readout.values.dieValue,0);
 next.session.assertions=filled.assertions;const third=await fixture([[item([200,200,300,300],null)]],{session:next.session,id:'unknown'});assert.equal(pieces(third.project())[0].readout.values.dieValue,0);
});
test('detail competing with two aggregate claims stays non-additive and unresolved',async()=>{
 const f=await fixture([[item([100,100,900,900],6,12),item([100,100,800,800],6,10)],[item([400,400,600,600],9)]]),r=f.project();assert.equal(pieces(r).length,2);assert.deepEqual(pieces(r).map((p:any)=>p.quantity),[12,10]);assert.equal(r.scanBundle!.fusion!.refinements.length,0);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);
});
test('next-job chosen provenance names the raw value actually selected, not an older whole-image value',async()=>{
 const f=await fixture([[item([200,200,300,300],6)],[item([400,400,600,600],9)]]),r=f.project();f.session.assertions=r.assertions;const next=await fixture([[item([200,200,300,300],2)]],{session:f.session,id:'next'}),out=next.project(),d=out.scanBundle!.fusion!.decisions.find(d=>d.fieldPath==='readout.values.dieValue')!;
 assert.equal(pieces(out)[0].readout.values.dieValue,6);const receipt=out.assertions[0].observationReceipts!.find(r=>r.scanUnitId===d.chosenMember?.unitId)!,claim=receipt.result.observations.find(o=>o.ref===d.chosenMember?.observationRef)!.properties.dieValue;assert.equal(claim.state==='observed'?claim.value:null,6);
});
test('unregistered views remain raw; owner, epoch and altered redelivery cannot enter another scope',async()=>{
 const f=await fixture([[item([200,200,300,300],6)],[item([400,400,600,600],9)]],{detail:true}),r=f.project();assert.equal(pieces(r).length,1);assert.equal(pieces(r)[0].readout.values.dieValue,6);assert.equal(r.scanBundle!.unresolvedGroups!.length,1);assert.equal(r.observationReceipts!.length,2);
 for(const attribute of ['ownerId','captureEpoch']as const){const wrong=structuredClone(f.results);(wrong[1].observationReceipts![0].request.scope as any)[attribute]='other';assert.throws(()=>f.project(wrong),/範|領|領域|範囲|영역|범위/);}
 const altered=structuredClone(f.results[1]);altered.summary='altered claim';assert.throws(()=>f.project([...f.results,altered]),/같은 스캔 단위/);
 const old=await fixture([[item([200,200,300,300],6)]]),base=old.project();delete base.assertions[0].observationReceipts;old.session.assertions=base.assertions;const reread=await fixture([[item([200,200,300,300],9)]],{session:old.session,id:'legacy'});assert.equal(pieces(reread.project())[0].readout.values.dieValue,6);assert.equal(pieces(reread.project()).length,1);
});
test('smaller view alone never replaces a known anchor fact, or resolves two conflicting supplements to unknown',async()=>{
 const known=await fixture([[item([200,200,300,300],6)],[item([400,400,600,600],9)]]),r=known.project();assert.equal(pieces(r)[0].readout.values.dieValue,6);assert(r.scanBundle!.fusion!.decisions.some(d=>d.fieldPath==='readout.values.dieValue'&&d.conflict&&d.basis==='unresolved'));
 const absent=await fixture([[item([200,200,300,300],null)],[item([400,400,600,600],9)],[item([400,400,600,600],6)]]),u=absent.project();assert.equal(pieces(u)[0].readout.values.dieValue,null);assert(u.scanBundle!.fusion!.decisions.some(d=>d.fieldPath==='readout.values.dieValue'&&d.conflict&&d.chosenMember===null));
 const noAnchor=await fixture([[],[item([400,400,600,600],9)],[item([400,400,600,600],6)]]),n=noAnchor.project();assert.equal(pieces(n).length,1);assert.equal(pieces(n)[0].readout.values.dieValue,null);assert.equal(stable(n),stable(noAnchor.project([...noAnchor.results].reverse())));
});
