import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kb-number-comparison-ui-'));await fs.chmod(dir,0o700);
const cases=[['N1','ca7aad5a-dcda-4697-9612-6befc9283769'],['N2','d77545f9-5f9c-4f4b-996d-380fa199c66a']];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),rows=[];
for(const [condition,id]of cases){
 const r=await fetch(`http://127.0.0.1:56275/api/sessions/${id}`);assert.equal(r.status,200);const view=await r.json();
 const source=view.session.assertions.findLast(a=>a.status==='candidate'&&a.observationReceipts?.some(r=>r.taskProfile?.id==='catan-numerals-v1'));assert(source);
 const baseline=view.session.assertions.findLast(a=>a.field==='board.layout'&&a.status==='accepted');assert(baseline);
 await fs.writeFile(path.join(dir,condition+'-before.json'),JSON.stringify(view),{mode:0o600});
 rows.push({condition,sessionId:id,sourceAssertionId:source.id,baselineAssertionId:baseline.id,receiptSHA:hash(source.observationReceipts),rawResultSHA:source.observationReceipts.map(r=>hash(r.result)),nativeWireSHA:source.observationReceipts.map(r=>hash(r.nativeWire)),baselineSHA:hash(baseline.value),baselineComponentCount:baseline.value.components.length});
}
const report={privateRoot:dir,preparedAtUTC:new Date().toISOString(),rows,modelCalls:0,APIMethod:'GET only; no model/job writes'};
await fs.writeFile(new URL('./preflight.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
