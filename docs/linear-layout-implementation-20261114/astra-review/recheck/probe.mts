import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import React from 'react';
import {withRestoration} from '../../../../gamepacks/catalog.ts';
import {projectRestorationScene} from '../../../../shared/sceneProjection.ts';
import {decodeSceneReading} from '../../../../shared/sceneReading.ts';
import {selectedClaim,sceneClaim} from '../../../../shared/restorationScene.ts';
import {sceneDigest} from '../../../../shared/restorationIdentity.ts';
import {resolveSceneDisplay,sceneDisplayKey} from '../../../../shared/sceneDisplay.ts';
import {applySceneCommands} from '../../../../server/restorationState.ts';
register('../../../board-story/feedback/skip-css.mjs',import.meta.url);
const {RestorationSceneView}=await import('../../../../src/RestorationSceneView.tsx');
const {PhotoLayoutBoard}=await import('../../../../src/PhotoLayoutBoard.tsx');
const output='docs/linear-layout-implementation-20261114/astra-review/recheck';
const pins=JSON.parse(readFileSync(output+'/source-pins.json','utf8'));
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const guards=[...pins.files,...pins.dependencies,...pins.protectedOriginals];
for(const p of guards)assert.equal(hash(p.path),p.sha256,'start pin '+p.path);
globalThis.fetch=async()=>{throw Error('network/provider forbidden in bounded recheck');};
const fixtureBytes=readFileSync('docs/real-photo-review-20261110/cases/final-pool-04/view.json');
function fixture(count:number){
 const d=JSON.parse(fixtureBytes.toString()),s=d.session,pack=withRestoration(d.pack),a=s.assertions.find((a:any)=>a.basis!=='rule'),r=a.observationReceipts[0],os=r.result.observations.slice(0,count);
 s.assertions=[a];delete s.restoration;a.value.pieces=a.value.pieces.filter((p:any)=>os.some((o:any)=>r.componentRefs[o.ref]===p.id));r.result.observations=os;
 const profile=projectRestorationScene({session:s,pack}).profile;
 r.request.scene={version:'scene-reading-v1',profileSHA:profile.pin.profileSHA,requested:['region','relations'],allowedRoleIds:['fireworks','discard'],roleHints:[],boardComponentIds:[],roleComponentIds:{fireworks:['cards'],discard:['cards']}};
 const payload:any={version:'scene-reading-v1',profileSHA:profile.pin.profileSHA,boardRefs:[],geometry:[],regions:[],relations:[]};
 const decode=()=>{r.result.scene=decodeSceneReading(payload,r.request,r.result,r.transforms);assert.equal(r.result.scene.deferred.length,0);};
 const region=(refs:any[],ref='one',role='fireworks')=>({ref,imageIndex:0,boardRef:null,memberObservationRefs:refs.map(o=>o.ref),roleCandidates:[role]});
 const apply=(c:any)=>{const p=projectRestorationScene({session:s,pack});applySceneCommands(s,pack,[{...c,scopeKey:'public',expectedSceneRevision:p.semanticRevision}]);return s.restoration.partitions.public;};
 return {s,pack,a,r,os,payload,decode,region,apply};
}
const report:any={scope:'R1/R2/C5 followup only; synthetic supported inputs, not photo accuracy',command:'TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-implementation-20261114/astra-review/recheck/probe.mts',providerCalls:0,networkCalls:0,checks:[]};
function check(id:string,run:()=>any){try{report.checks.push({id,status:'VERIFIED',...run()});}catch(e){report.checks.push({id,status:'FAILED',error:(e as Error).stack});}}

check('R1-original-role-competition',()=>{
 const f=fixture(2);f.payload.regions=f.os.map((o:any,i:number)=>f.region([o],'initial-'+i));f.decode();
 let p=projectRestorationScene({session:f.s,pack:f.pack});const ids=f.os.map((o:any)=>p.entities.find(e=>e.observations.some(n=>n.observationRef===o.ref))!.id),groups=[...p.groups];
 for(const [i,roleId] of ['discard','fireworks'].entries())p=f.apply({kind:'set-role',commandId:'recheck-role-'+i,groupId:groups.find(g=>g.entityIds.includes(ids[i]))!.id,roleId});
 const previous=structuredClone(p);f.payload.regions=[f.region(f.os,'combined')];f.decode();const input=sceneDigest(f.s);
 const summarize=(next:any)=>{const g=next.groups.find((g:any)=>g.entityIds.includes(ids[0]));assert.equal(g.role.status,'conflict');assert.equal(selectedClaim(g.role),undefined);assert.deepEqual(g.role.candidates.map((c:any)=>c.value).sort(),['discard','fireworks']);
  const unresolved=next.unappliedEdits.filter((e:any)=>e.kind==='role'&&e.reason==='manual-reconnection-conflict');assert.equal(unresolved.length,2);
  for(const old of previous.groups)assert(unresolved.some((e:any)=>sceneDigest(e.value.claim)===sceneDigest(old.role)&&sceneDigest(e.value.entityIds)===sceneDigest(old.entityIds)));
  return {status:g.role.status,candidates:g.role.candidates.map((c:any)=>c.value).sort(),originalDecisions:unresolved.length};};
 const next=projectRestorationScene({session:f.s,pack:f.pack}),normal=summarize(next),reversed=summarize(projectRestorationScene({session:f.s,pack:f.pack,previous:{...previous,groups:[...previous.groups].reverse()}}));assert.deepEqual(normal,reversed);
 const stable=projectRestorationScene({session:f.s,pack:f.pack,previous:next});assert.equal(sceneDigest(stable.unappliedEdits),sceneDigest(next.unappliedEdits));assert.equal(stable.semanticRevision,next.semanticRevision);assert.equal(sceneDigest(f.s),input);
 return {beforeRoles:['discard','fireworks'],after:normal,iterationOrderIndependent:true,reopenProjectionPreservesDecisions:true,inputUnchanged:true};
});

check('R1-coverage-and-consensus',()=>{
 for(const roles of [['discard'],['discard','discard']]){
  const f=fixture(2);f.payload.regions=f.os.map((o:any,i:number)=>f.region([o],'initial-'+i));f.decode();const initial=projectRestorationScene({session:f.s,pack:f.pack}),ids=initial.groups.map(g=>g.id);
  roles.forEach((roleId,i)=>f.apply({kind:'set-role',commandId:'coverage-'+i,groupId:ids[i],roleId}));f.payload.regions=[f.region(f.os,'combined')];f.decode();const input=sceneDigest(f.s),next=projectRestorationScene({session:f.s,pack:f.pack});
  if(roles.length===1){assert(!(next.groups[0].role.status==='selected'&&next.groups[0].role.chosen.basis==='manual'));const pending=next.unappliedEdits!.filter(e=>e.kind==='role'&&e.reason==='live-group-expanded');assert.equal(pending.length,1);assert.equal((pending[0].value as any).entityIds.length,1);assert.equal(selectedClaim((pending[0].value as any).claim),'discard');}
  else{assert.equal(selectedClaim(next.groups[0].role),'discard');assert.equal(next.groups[0].role.status==='selected'&&next.groups[0].role.chosen.supports.filter(s=>s.kind==='manual').length,2);}
  assert.equal(sceneDigest(f.s),input);
 }
 return {partialCoverage:'original decision unapplied; no manual promotion to extra member',fullAgreement:'selected with both manual supports',inputUnchanged:true};
});

check('R2-latest-observed-order-and-manual-order',()=>{
 const f=fixture(3);f.payload.regions=[f.region(f.os)];f.payload.relations=[{kind:'precedes',fromObservationRef:f.os[0].ref,toObservationRef:f.os[1].ref}];f.decode();
 let p=projectRestorationScene({session:f.s,pack:f.pack});const ids=f.os.map((o:any)=>p.entities.find(e=>e.observations.some(n=>n.observationRef===o.ref))!.id);
 p=f.apply({kind:'split-group',commandId:'recheck-split',groupId:p.groups[0].id,parts:[ids.slice(0,2),ids.slice(2)]});const previous=structuredClone(p);
 f.payload.relations=[{kind:'precedes',fromObservationRef:f.os[1].ref,toObservationRef:f.os[0].ref}];f.decode();const input=sceneDigest(f.s),next=projectRestorationScene({session:f.s,pack:f.pack}),group=next.groups.find(g=>g.entityIds.includes(ids[0]))!;
 assert.deepEqual(group.entityIds,ids.slice(0,2));assert.equal(group.membershipEdit?.commandId,'recheck-split');assert.deepEqual(group.physicalOrder.map(r=>[r.before,r.after]),[[ids[1],ids[0]]]);assert.deepEqual(group.presentation?.orderLevels,[[ids[1]],[ids[0]]]);assert.equal(next.plan.unsatisfiedRelationIds.length,0);
 const freshInput=structuredClone(f.s);delete freshInput.restoration;const fresh=projectRestorationScene({session:freshInput,pack:f.pack});assert.equal(fresh.plan.unsatisfiedRelationIds.length,next.plan.unsatisfiedRelationIds.length);
 const manualPrevious=structuredClone(previous),manual={id:'recheck-manual-order',kind:'precedes' as const,from:ids[0],to:ids[1],claim:sceneClaim('recheck-manual-claim',true,'manual',[{kind:'manual' as const,commandId:'stored-explicit-order'}])};manualPrevious.relations.push(manual);
 const opposed=projectRestorationScene({session:f.s,pack:f.pack,previous:manualPrevious});assert(opposed.relations.some(r=>r.id===manual.id&&sceneDigest(r.claim)===sceneDigest(manual.claim)));assert.equal(opposed.plan.unsatisfiedRelationIds.length,2);assert.equal(opposed.groups.find(g=>g.entityIds.includes(ids[0]))!.presentation?.orderUnresolved?.length,2);assert.equal(sceneDigest(f.s),input);
 f.payload.relations=[];f.decode();const removedInput=sceneDigest(f.s),removed=projectRestorationScene({session:f.s,pack:f.pack,previous:next});assert.equal(removed.groups.find(g=>g.entityIds.includes(ids[0]))!.physicalOrder.length,0);assert.equal(removed.plan.unsatisfiedRelationIds.length,0);assert.equal(sceneDigest(f.s),removedInput);
 return {manualMembershipPreserved:true,latestObservedPhysicalEdges:1,falseCycles:0,removedObservationLeavesEdges:0,explicitManualEdgePreserved:true,genuineManualVsObservedConflict:2,inputUnchanged:true};
});

const nodes=(v:any):any[]=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
function render(component:any,props:any){const internal=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internal.H;internal.H={useState:(v:any)=>[typeof v==='function'?v():v,()=>{}],useRef:(v:any)=>({current:v}),useEffect(){}};try{return component(props);}finally{internal.H=old;}}
function stackFixture(count:number,edges:[number,number][],equalBareIDs=false){
 const f=fixture(count);f.payload.regions=[f.region(f.os,'discard-region','discard')];f.decode();
 const pin='0'.repeat(64);f.r.request.spatial={version:'spatial-request-v1',schemaSHA256:pin,responseSchemaSHA:pin,definitionSHA:pin,spatialDefinitionSHA:pin,sourceSHA:f.r.request.sourceSHA,photoDefinitionSHA:f.r.request.definitionSHA,packVersion:f.pack.version,frames:[],structuralNamespaces:[],prompt:{common:'bounded synthetic relation',gameInstruction:''}};
 f.r.result.spatial={version:'spatial-observation-v1',boardInstances:[],placements:[],cellStates:[],deferred:[],relations:edges.map(([from,to])=>({fromRef:f.os[from].ref,toRef:f.os[to].ref,kind:'same-visible-stack',basis:'observed-visible-relation',partial:true}))};
 if(equalBareIDs){const first=f.a.value.pieces.find((p:any)=>p.id===f.r.componentRefs[f.os[0].ref]),oldId=f.r.componentRefs[f.os[1].ref],second=f.a.value.pieces.find((p:any)=>p.id===oldId),other=structuredClone(f.a);other.id='recheck-other-assertion';other.field='discard.scene';other.value.pieces=[{...second,id:first.id}];other.observationReceipts=[structuredClone(f.r)];other.observationReceipts[0].componentRefs={[f.os[1].ref]:first.id};f.a.value.pieces=f.a.value.pieces.filter((p:any)=>p.id!==oldId);f.r.componentRefs=Object.fromEntries(f.os.filter((_:any,i:number)=>i!==1).map((o:any)=>[o.ref,f.r.componentRefs[o.ref]]));f.s.assertions.push(other);}
 const scene=projectRestorationScene({session:f.s,pack:f.pack});assert.equal(scene.relations.filter(r=>r.kind==='same-visible-stack').length,edges.length);return {...f,scene};
}
function actual(f:ReturnType<typeof stackFixture>,scene=f.scene){
 const selected:any[]=[],tree=render(RestorationSceneView,{scene,pack:f.pack,assertions:f.s.assertions,evidence:f.s.evidence,busy:false,onSelect:(ref:any)=>selected.push(ref),onCommand(){throw Error('display write forbidden');}}),panels=nodes(tree).filter(n=>n.props?.['data-scene-content']),photos=panels.flatMap(p=>nodes(p).filter(n=>n.type===PhotoLayoutBoard)),buttons=[...panels.flatMap(p=>nodes(p).filter(n=>n.props?.['data-drawing-piece'])),...photos.flatMap(p=>nodes(render(PhotoLayoutBoard,p.props)).filter(n=>n.props?.['data-drawing-piece']))];
 const expected=f.s.assertions.flatMap((a:any)=>a.value.pieces.map((p:any)=>sceneDisplayKey({assertionId:a.id,pieceId:p.id}))).sort(),keys=buttons.map(n=>sceneDisplayKey({assertionId:n.props['data-assertion-id'],pieceId:n.props['data-drawing-piece']})).sort();assert.deepEqual(keys,expected);assert.equal(new Set(keys).size,keys.length);
 for(const button of buttons)button.props.onClick();assert.deepEqual(selected.map(sceneDisplayKey).sort(),expected);
 const stacks=panels.flatMap(p=>nodes(p).filter(n=>n.props?.['data-visible-stack']));return {stacks,photos,keys};
}
check('C5-original-stack-actual-component',()=>{
 const f=stackFixture(3,[[0,1]]),input=sceneDigest(f.s),sceneBefore=sceneDigest(f.scene),out=resolveSceneDisplay({scene:f.scene,pack:f.pack,assertions:f.s.assertions,evidence:f.s.evidence}),stack=out.parts.find(p=>p.kind==='visible-stack')!;assert(stack);assert.equal(stack.members.length,2);assert.equal(out.parts.find(p=>p.kind==='photo-rows')!.members.length,1);
 const view=actual(f);assert.equal(view.stacks.length,1);assert.equal(view.photos.length,1);assert.match(JSON.stringify(view.stacks),/내부 순서·숨은 총수 미확정/);
 const without=structuredClone(f.scene);without.relations=without.relations.filter(r=>r.kind!=='same-visible-stack');const noStack=actual(f,without);assert.equal(noStack.stacks.length,0);assert.deepEqual(view.keys,noStack.keys);assert.equal(sceneDigest(f.s),input);assert.equal(sceneDigest(f.scene),sceneBefore);
 return {validatedStackEdges:1,visibleStackMembers:2,unrelatedPhotoMembers:1,actualStackWithRelation:1,actualStackWithoutRelation:0,physicalItemsExactlyOnce:3,allQualifiedClicksCorrect:true,inputUnchanged:true};
});
check('C5-qualified-selection-and-conservative-boundaries',()=>{
 const duplicate=stackFixture(3,[[0,1]],true),input=sceneDigest(duplicate.s),view=actual(duplicate);assert.equal(view.stacks.length,1);assert.equal(view.keys.length,3);assert.equal(new Set(duplicate.s.assertions.flatMap((a:any)=>a.value.pieces.map((p:any)=>p.id))).size,2);assert.equal(sceneDigest(duplicate.s),input);
 const chain=stackFixture(3,[[0,1],[1,2]]),chainInput=sceneDigest(chain.s);assert.equal(actual(chain).stacks.length,0);assert.equal(sceneDigest(chain.s),chainInput);
 const separate=stackFixture(5,[[0,1],[2,3]]),separateInput=sceneDigest(separate.s),separateView=actual(separate);assert.equal(separateView.stacks.length,2);assert.equal(separateView.keys.length,5);assert.equal(separateView.photos.length,1);assert.equal(sceneDigest(separate.s),separateInput);
 const unsupported=structuredClone(duplicate.scene);for(const relation of unsupported.relations)if(relation.kind==='same-visible-stack'&&relation.claim.status==='selected')relation.claim.chosen.supports=[];assert.equal(actual(duplicate,unsupported).stacks.length,0);
 return {equalBareIDsAcrossAssertions:'three qualified selections correct',chain:'deferred; all three remain selectable',independentPairs:2,unrelatedSingletons:1,missingObservationSupport:'deferred',inputUnchanged:true};
});

report.invariance=guards.map((p:any)=>({path:p.path,sha256:p.sha256,unchanged:hash(p.path)===p.sha256}));
report.allInputsAndFrozenSourcesUnchanged=report.invariance.every((p:any)=>p.unchanged);
report.failures=report.checks.filter((r:any)=>r.status==='FAILED').length;
report.status=report.failures===0&&report.allInputsAndFrozenSourcesUnchanged?'VERIFIED — three original corrections accepted':'FAILED';
writeFileSync(output+'/results.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,invariance:undefined},null,2));
if(report.failures||!report.allInputsAndFrozenSourcesUnchanged)process.exitCode=1;
