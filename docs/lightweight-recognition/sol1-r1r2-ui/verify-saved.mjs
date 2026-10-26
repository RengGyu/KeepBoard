import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolveSlotId} from '/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-lightweight-recognition-vyzn4xm9/app/shared/scene.ts';
import {createRummikubTile} from '/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-lightweight-recognition-vyzn4xm9/app/shared/rummikub.ts';
const base='http://127.0.0.1:51328';
const cases=[{game:'catan-base',id:'67a487d3-7d32-4ff6-94e8-02b08d9a6d7b',field:'board.layout'},{game:'rummikub',id:'b55c59af-fc70-49ae-afad-ee46aaa696e5',field:'table.scene'}];
const results=[],hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
for(const c of cases){
 const response=await fetch(`${base}/api/sessions/${c.id}`);assert.equal(response.status,200);
 const {session:s}=await response.json(),accepted=s.assertions.findLast(a=>a.field===c.field&&a.status==='accepted'),snapshot=s.snapshots.at(-1)?.assertions.findLast(a=>a.field===c.field&&a.status==='accepted');
 assert(accepted&&snapshot);assert.deepEqual(snapshot.value,accepted.value);assert.deepEqual(snapshot.observationReceipts,accepted.observationReceipts);assert(accepted.observationReceipts?.length);
 const receipts=accepted.observationReceipts,usedTaskIds=receipts.map(r=>r.request.taskId);
 assert(!s.assertions.some(a=>a.status==='candidate'&&a.observationReceipts?.some(r=>usedTaskIds.includes(r.request.taskId))));
 let detail;
 if(c.game==='catan-base'){
  const cs=accepted.value.components,road=cs.find(c=>c.id==='manual-road');
  assert.deepEqual({kind:road.kind,quantity:road.quantity,variant:road.variant,ownerId:road.ownerId,evidenceId:road.evidenceId,region:road.region,location:road.location},{kind:'road',quantity:1,variant:null,ownerId:null,evidenceId:null,region:null,location:{type:'edge',id:resolveSlotId('edge','r1c1.E')}});
  const pending=cs.filter(c=>c.quantity===null&&c.location.type==='unplaced');assert.equal(pending.length,1);assert.equal(cs.filter(c=>c.id!=='manual-road'&&c.location.type!=='unplaced').length,3);
  detail={totalComponents:cs.length,independentPlaced:3,unresolved:pending.map(c=>({id:c.id,kind:c.kind,quantity:c.quantity,location:c.location})),manualRoadPreserved:true};
 }else{
  const v=accepted.value,tile=(id,number)=>createRummikubTile(id,{number,color:'red',note:'수동 정정 합성'});
  assert.deepEqual(v.groups,[{id:'manual-order',label:'수동 순서 유지',tiles:[tile('old-A',9),tile('old-B',5)]}]);assert.deepEqual(v.loose[0],tile('old-loose',3));
  assert.deepEqual(v.loose.slice(1).map(t=>[t.color,t.number]),[['blue',8],['blue',9]]);
  const rawNums=receipts.flatMap(r=>r.result.observations.map(o=>o.properties.number?.value));assert.deepEqual(rawNums,[7,9]);
  detail={oldOrderedGroupPreserved:true,oldLooseAndManualNotePreserved:true,looseNumbers:v.loose.map(t=>t.number),newObservationCount:2,originalReceiptNumbers:rawNums,userCorrection:'7→8'};
 }
 results.push({game:c.game,sessionId:c.id,status:'VERIFIED',acceptedSnapshotEqual:true,receiptSnapshotEqual:true,receiptResultSHA:receipts.map(r=>hash(r.result)),usedSourceProjectionConsumed:true,otherPendingPreservation:'Not present in these CUA fixtures; separately backend regression evidence, not claimed here',detail});
}
await fs.writeFile(new URL('./saved-api.json',import.meta.url),JSON.stringify({results,realModelCalls:0,method:'Read-only API supplement after actual CUA save/reload; no state injection or API writes'},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({game:r.game,status:r.status,detail:r.detail,usedSourceProjectionConsumed:true})),null,2));
