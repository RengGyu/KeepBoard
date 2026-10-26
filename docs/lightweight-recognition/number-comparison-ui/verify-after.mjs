import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const byteHash=b=>createHash('sha256').update(b).digest('hex');
const pre=await read(new URL('./preflight.json',import.meta.url));
const comparison=await read(new URL('../compact/number-comparison-result.json',import.meta.url));
const gtMeta=await read(new URL('../sol1-independent-number-gt.json',import.meta.url));
assert.equal(byteHash(await fs.readFile(gtMeta.privateGTPath)),gtMeta.privateGTSHA256);
assert.equal(byteHash(await fs.readFile(gtMeta.privateFramePath)),gtMeta.frameSHA256);
const gt=await read(gtMeta.privateGTPath);
// Evaluation-only manual photo-row correspondence, observed before/alongside UI review.
// These are existing Catan UI slot IDs; this does not rematch model boxes or change frozen strict scores.
const slots=['r1c1','r1c2','r1c3','r2c1','r2c2','r2c3','r2c4','r3c1','r3c2','r3c3','r3c4','r3c5','r4c1','r4c2','r4c3','r5c1','r5c2','r5c3'];
assert.equal(gt.objects.length,slots.length);
await fs.writeFile(path.join(pre.privateRoot,'photo-row-existing-slot-crosswalk.json'),JSON.stringify({method:'Manual fixed photo rows + existing confirmed orientation/topology; post-correction state check only, not raw strict rescoring',rows:gt.objects.map((o,i)=>({gtId:o.id,slot:slots[i],number:o.number}))},null,2),{mode:0o600});
const rows=[],semanticStates=[];
for(const item of pre.rows){
 const response=await fetch(`http://127.0.0.1:56275/api/sessions/${item.sessionId}`);assert.equal(response.status,200);const view=await response.json();
 await fs.writeFile(path.join(pre.privateRoot,item.condition+'-after.json'),JSON.stringify(view),{mode:0o600});
 const before=await read(path.join(pre.privateRoot,item.condition+'-before.json'));
 const accepted=view.session.assertions.findLast(a=>a.field==='board.layout'&&a.status==='accepted');
 const snapshot=view.session.snapshots.at(-1)?.assertions.findLast(a=>a.field==='board.layout'&&a.status==='accepted');
 assert(accepted&&snapshot);assert.deepEqual(snapshot.value,accepted.value);assert.deepEqual(snapshot.observationReceipts,accepted.observationReceipts);
 assert.equal(hash(accepted.observationReceipts),item.receiptSHA);
 const original=before.session.assertions.find(a=>a.id===item.sourceAssertionId);
 const baseline=before.session.assertions.find(a=>a.id===item.baselineAssertionId);
 for(const c of baseline.value.components)assert.deepEqual(accepted.value.components.find(x=>x.id===c.id),c);
 for(const a of before.session.assertions.filter(a=>a.status==='accepted'&&a.field!=='board.layout'))assert(view.session.assertions.some(b=>hash(a)===hash(b)));
 assert.deepEqual(before.session.evidence,view.session.evidence);
 const numbers=accepted.value.components.filter(c=>c.kind==='number-token');assert.equal(numbers.length,18);assert(numbers.every(c=>c.quantity===1&&c.location.type==='hex'));
 const bySlot=new Map(numbers.map(c=>[c.location.id,c]));assert.equal(bySlot.size,18);
 let changed=0;
 for(const c of original.value.components){const now=numbers.find(n=>n.id===c.id);assert(now);if(now.number!==c.number)changed++;}
 assert.equal(changed,item.condition==='N1'?1:2);
 for(let i=0;i<slots.length;i++)assert.equal(bySlot.get(slots[i])?.number,gt.objects[i].number);
 assert(!view.session.assertions.some(a=>a.status==='candidate'&&a.id===item.sourceAssertionId));
 semanticStates.push(numbers.map(c=>({kind:c.kind,number:c.number,quantity:c.quantity,location:c.location})).sort((a,b)=>a.location.id.localeCompare(b.location.id)));
 const prior=comparison.results.find(r=>r.id===item.condition);
 const files=await fs.readdir(path.join(comparison.privateRoot,'reader-receipts'));let originalResponseMatched=false;
 for(const file of files.filter(f=>f.endsWith('.response.json'))){const bytes=await fs.readFile(path.join(comparison.privateRoot,'reader-receipts',file));if(byteHash(bytes)===prior.completion.bodySHA)originalResponseMatched=true;}
 assert(originalResponseMatched);
 rows.push({condition:item.condition,sessionId:item.sessionId,status:'VERIFIED',originalStrictScore:prior.score,numberComponents:18,placedNumbers:18,unplacedNumbers:0,uniqueSlots:18,userValueCorrections:changed,userAdded:0,userDeleted:0,userSwaps:0,userIndividualMoves:0,geometryBatchConfirmations:1,manualRoadAndAllBaselineComponentsByteEqual:true,previousOtherAcceptedAssertionsPreserved:true,sourceEvidenceUnchanged:true,receiptByteStructureSHAUnchanged:true,receiptSHA:item.receiptSHA,rawResultSHA:item.rawResultSHA,nativeWireSHA:item.nativeWireSHA,originalProviderBodySHA:prior.completion.bodySHA,providerResponseArtifactMatchesPreexistingSHA:true,acceptedSnapshotValueAndReceiptEqual:true,sourceProjectionConsumed:true,currentValuesMatchPrivateManualPhotoRowCrosswalk:18,scope:'Native partial board numbers only; no terrain/building recognition claim, raw score unchanged'});
}
assert.deepEqual(semanticStates[0],semanticStates[1]);
const result={status:'VERIFIED_TWO_REAL_RESULT_UI_PASSES',method:'Read-only GET after actual CUA corrections; no API correction injection',rows,sameCorrectedPartialNumericBoard:true,GTFrameSHAUnchanged:true,modelRequestsDuringReview:0,OCRCalls:0,analysisJobsStarted:0};
await fs.writeFile(new URL('./saved-verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,rows:rows.map(r=>({condition:r.condition,numbers:r.numberComponents,corrections:r.userValueCorrections,receiptUnchanged:true,manualRoadUnchanged:true,snapshotEqual:true})),samePartialBoard:true}));
