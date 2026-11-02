// Independent offline replay of the completed B+D experiment. No provider calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectScanResults,observationObjects} from '../../server/scanObservation';
const dir='docs/terra-quality-iteration-20261030';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const pre=await read(dir+'/crop-high/preflight.json');
const evaluation=await read(dir+'/crop-high/evaluation.json');
for(const f of evaluation.sourceHashes)assert.equal(hash(await fs.readFile(f.path)),f.sha256);
const canonical=(x:any):string=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const stable=(p:any)=>canonical({values:p.assertions.map((a:any)=>a.value),bundle:p.scanBundle,receipts:p.observationReceipts});
const rows:any[]=[];
for(const call of pre.calls){
 const gameId=call.gameId,task=await read(call.taskPath);
 const whole=pre.reuseWhole.find((b:any)=>b.gameId===gameId);
 assert.ok(whole);
 const results=await Promise.all([read(whole.resultPath),read(call.resultPath)]),input=canonical(results);
 const p=projectScanResults(task.session,task.pack,task.scan,results);
 assert.equal(canonical(results),input);
 assert.equal(stable(p),stable(projectScanResults(task.session,task.pack,task.scan,[...results].reverse())));
 assert.equal(stable(p),stable(projectScanResults(task.session,task.pack,task.scan,[results[1],results[0],results[1],results[0]])));
 const saved=await read(pre.privateDir+'/scores/'+gameId+'-BD-candidate.projection.json');
 assert.equal(stable(p),stable(saved));
 const reopened=JSON.parse(JSON.stringify(p));assert.equal(stable(p),stable(reopened));
 const receipts=p.observationReceipts??[],pieces=p.assertions.flatMap((a:any)=>observationObjects(a.value));
 const inputs=results.flatMap((r:any)=>r.observationReceipts??[]);
 const rawCount=inputs.reduce((n:number,r:any)=>n+r.result.observations.length,0);
 assert.equal(rawCount,receipts.reduce((n:number,r:any)=>n+r.result.observations.length,0));
 for(const r of receipts){
  const original=inputs.find((i:any)=>i.scanUnitId===r.scanUnitId)!;
  assert.ok(original);
  assert.equal(canonical(r.result),canonical(original.result));
  assert.equal(canonical(r.request),canonical(original.request));
  assert.equal(canonical(r.transforms),canonical(original.transforms));
 }
 const conflicts=p.scanBundle!.fusion!.decisions.filter((d:any)=>d.conflict);
 const focus=conflicts.filter((d:any)=>d.basis==='focused-provisional');
 rows.push({gameId,conditions:['B','D'],editableObjects:pieces.length,rawObservations:rawCount,
  rawValuesSourceScopePreserved:true,reverseAndRepeatedRedeliveryEqual:true,
  sameAsFrozenWorkerProjection:true,jsonRoundTripEqual:true,
  conflictingFields:conflicts.length,focusedProvisionalConflicts:focus.length,
  focusedNumericConflicts:focus.filter((d:any)=>d.fieldPath.endsWith('.dieValue')).length,
  unresolvedGroups:p.scanBundle!.unresolvedGroups?.length??0,projectionSHA:hash(stable(p))});
}
for(const f of evaluation.sourceHashes)assert.equal(hash(await fs.readFile(f.path)),f.sha256);
const report={verifiedAt:new Date().toISOString(),newProviderCalls:0,productWrites:0,sourceHashes:evaluation.sourceHashes,rows,
 limits:['JSON round-trip is not a new HTTP/UI save-resume test.',
 'Correct preservation/idempotence does not establish visual truth.',
 'No new manual correction timing measurement.',
 'B responses are reused from the earlier completed experiment; this is not a fresh simultaneous B+D run.']};
await fs.writeFile(dir+'/independent-crop-high-replay.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
