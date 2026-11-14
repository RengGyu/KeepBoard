import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {withRestoration} from '../../../gamepacks/catalog.ts';
import {projectRestorationScene} from '../../../shared/sceneProjection.ts';
import {decodeSceneReading} from '../../../shared/sceneReading.ts';
import {selectedClaim} from '../../../shared/restorationScene.ts';
import {sceneDigest} from '../../../shared/restorationIdentity.ts';
import {applySceneCommands} from '../../../server/restorationState.ts';

// Existing photo values stay in memory. Only supported scene payloads and commands
// are synthesized. These probes measure refresh behavior, not photo correctness.
const input='docs/real-photo-review-20261110/cases/final-pool-04/view.json';
const diskBefore=readFileSync(input);
function fixture(count:number){
 const d=JSON.parse(diskBefore.toString()),s=d.session,pack=withRestoration(d.pack),a=s.assertions.find((a:any)=>a.basis!=='rule'),r=a.observationReceipts[0],os=r.result.observations.slice(0,count);
 s.assertions=[a];delete s.restoration;a.value.pieces=a.value.pieces.filter((p:any)=>os.some((o:any)=>r.componentRefs[o.ref]===p.id));r.result.observations=os;
 const base=projectRestorationScene({session:s,pack});
 r.request.scene={version:'scene-reading-v1',profileSHA:base.profile.pin.profileSHA,requested:['region','relations'],allowedRoleIds:['fireworks','discard'],roleHints:[],boardComponentIds:[],roleComponentIds:{fireworks:['cards'],discard:['cards']}};
 const payload:any={version:'scene-reading-v1',profileSHA:base.profile.pin.profileSHA,boardRefs:[],geometry:[],regions:[],relations:[]};
 const decode=()=>{r.result.scene=decodeSceneReading(payload,r.request,r.result,r.transforms);assert.equal(r.result.scene.deferred.length,0);};
 const region=(refs:any[],id='one')=>({ref:id,imageIndex:0,boardRef:null,memberObservationRefs:refs.map(o=>o.ref),roleCandidates:['fireworks']});
 const apply=(c:any)=>{const p=projectRestorationScene({session:s,pack});applySceneCommands(s,pack,[{...c,scopeKey:'public',expectedSceneRevision:p.semanticRevision}]);return s.restoration.partitions.public;};
 return {s,pack,a,r,os,payload,decode,region,apply};
}
const results:any={scope:'synthetic bounded refresh probes, not real-photo accuracy',providerCalls:0,checks:[]};
{
 const f=fixture(2);f.payload.regions=f.os.map((o:any,i:number)=>f.region([o],'initial-'+i));f.decode();
 let p=projectRestorationScene({session:f.s,pack:f.pack});const groups=[...p.groups],ids=f.os.map((o:any)=>p.entities.find(e=>e.observations.some(n=>n.observationRef===o.ref))!.id);
 p=f.apply({kind:'set-role',commandId:'review-role-1',groupId:groups.find(g=>g.entityIds.includes(ids[0]))!.id,roleId:'discard'});
 p=f.apply({kind:'set-role',commandId:'review-role-2',groupId:groups.find(g=>g.entityIds.includes(ids[1]))!.id,roleId:'fireworks'});
 const previous=structuredClone(p),roles=(p:any)=>ids.map(id=>selectedClaim(p.groups.find((g:any)=>g.entityIds.includes(id)).role)),before=roles(previous);
 f.payload.regions=[f.region(f.os,'combined')];f.decode();const immutable=sceneDigest(f.s),next=projectRestorationScene({session:f.s,pack:f.pack});
 assert.notEqual(next.sourceDigest,previous.sourceDigest);assert.deepEqual(before,['discard','fireworks']);assert.deepEqual(roles(next),['fireworks','fireworks']);assert.equal(next.unappliedEdits?.length??0,0);assert.equal(sceneDigest(f.s),immutable);
 results.checks.push({id:'R1',result:'FAILED acceptance reproduced',trigger:'two automatic groups receive different set-role commands, then validated region combines their live members',beforeRoles:before,afterRoles:roles(next),unappliedCount:next.unappliedEdits?.length??0,inputUnchanged:true});
}
{
 const f=fixture(3);f.payload.regions=[f.region(f.os)];f.payload.relations=[{kind:'precedes',fromObservationRef:f.os[0].ref,toObservationRef:f.os[1].ref}];f.decode();
 let p=projectRestorationScene({session:f.s,pack:f.pack});const ids=f.os.map((o:any)=>p.entities.find(e=>e.observations.some(n=>n.observationRef===o.ref))!.id),g=p.groups[0];
 p=f.apply({kind:'split-group',commandId:'review-split',groupId:g.id,parts:[ids.slice(0,2),ids.slice(2)]});const previous=structuredClone(p);
 f.payload.relations=[{kind:'precedes',fromObservationRef:f.os[1].ref,toObservationRef:f.os[0].ref}];f.decode();const immutable=sceneDigest(f.s),freshInput=structuredClone(f.s);delete freshInput.restoration;
 const fresh=projectRestorationScene({session:freshInput,pack:f.pack}),next=projectRestorationScene({session:f.s,pack:f.pack}),group=next.groups.find(g=>g.entityIds.includes(ids[0]))!;
 assert.notEqual(next.sourceDigest,previous.sourceDigest);assert.equal(fresh.plan.unsatisfiedRelationIds.length,0);assert.equal(next.relations.filter(r=>r.kind==='precedes').length,1);assert.equal(group.physicalOrder.length,2);assert.equal(group.presentation?.orderUnresolved?.length,2);assert.equal(next.plan.unsatisfiedRelationIds.length,1);assert.equal(sceneDigest(f.s),immutable);
 results.checks.push({id:'R2',result:'FAILED acceptance reproduced',trigger:'manual split retained; source precedes A→B replaced with B→A',freshUnsatisfied:0,reusedSourcePrecedes:1,reusedPhysicalEdges:2,reusedUnresolvedMembers:2,reusedUnsatisfied:1,membershipPreserved:group.entityIds.length===2,inputUnchanged:true});
}
{
 const f=fixture(2);f.payload.regions=[f.region(f.os)];f.payload.relations=[{kind:'precedes',fromObservationRef:f.os[0].ref,toObservationRef:f.os[1].ref}];f.decode();
 const previous=projectRestorationScene({session:f.s,pack:f.pack});f.r.sourceImageSHA='0'.repeat(64);const immutable=sceneDigest(f.s),fresh=projectRestorationScene({session:f.s,pack:f.pack});let error:string|undefined;
 try{projectRestorationScene({session:f.s,pack:f.pack,previous});}catch(e){error=(e as Error).message;}
 results.checks.push({id:'N1-source-mismatch',result:'UNCLEAR supported transition; negative cache probe only',trigger:'transform-free receipt sourceImageSHA changed alone while request image SHA remains unchanged',sourceDigestChanged:fresh.sourceDigest!==previous.sourceDigest,freshPrecedes:fresh.relations.filter(r=>r.kind==='precedes').length,reusedError:error??null,inputUnchanged:sceneDigest(f.s)===immutable});
}
assert.equal(readFileSync(input).equals(diskBefore),true);
results.diskInputUnchanged=true;
writeFileSync('docs/linear-layout-implementation-20261114/astra-review/final-probe-results.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
