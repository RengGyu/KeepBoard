// Read-only loopback/immutable-artifact accounting after UI work. No model calls or API corrections.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const out='docs/terra-integration-20261030',pre=JSON.parse(await fs.readFile(out+'/v1-preflight.json','utf8')),run=JSON.parse(await fs.readFile(out+'/v1-execution.json','utf8'));
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex'),rows=[];
for(const c of pre.cases){
 const before=JSON.parse(await fs.readFile(pre.privateDir+'/'+c.id+'.after.json','utf8')),r=await fetch(run.base+'/api/sessions/'+c.sessionId);assert(r.ok);const current=await r.json();await fs.writeFile(pre.privateDir+'/'+c.id+'.ui-reopened.json',JSON.stringify(current,null,2)+'\n',{mode:0o600});
 const assertions=before.session.assertions.filter((a:any)=>a.status==='accepted'&&a.observationReceipts?.length),fresh=current.session.assertions.filter((a:any)=>a.status==='accepted'&&a.observationReceipts?.length),receipts=assertions.flatMap((a:any)=>a.observationReceipts),latest=fresh.flatMap((a:any)=>a.observationReceipts);
 assert.deepEqual(latest,receipts);const native=JSON.parse(await fs.readFile(pre.privateDir+'/'+c.id+'.native.json','utf8'));assert.deepEqual(receipts[0].hostedWire.providerResponse,native);
 const pieces=assertions.flatMap((a:any)=>a.value.pieces??[]),afterPieces=fresh.flatMap((a:any)=>a.value.pieces??[]);let known=0,preserved=0,quantities=0,nativeFaceRepresentations=0;const deferred=[];
 for(const receipt of receipts)for(const o of receipt.result.observations){
  const p=pieces.find((p:any)=>p.id===receipt.componentRefs[o.ref]);assert(p,'Observation has editable object');if(p.quantity===o.quantity)quantities++;
  for(const [key,property]of Object.entries(o.properties) as [string,any][]){if(property.state!=='observed')continue;known++;let value=property.value;if(c.id==='splendor'&&['cost','requirements'].includes(key))value=Object.fromEntries(value.map((v:any)=>[v.symbol,v.value]));
   let actual=c.id==='splendor'?p.readout[key]:p.readout.values[key];if(c.id==='splendor'&&key==='face'){actual=p.readout.kind==='deck'?'back':['development','noble','token'].includes(p.readout.kind)?'front':undefined;if(actual===value)nativeFaceRepresentations++;}if(c.id==='splendor'&&['cost','requirements'].includes(key))actual=Object.fromEntries(Object.keys(value).map(k=>[k,actual[k]]));
   if(JSON.stringify(actual)===JSON.stringify(value))preserved++;else deferred.push({ref:o.ref,property:key,reason:'native representation or explicit assembly deferral; raw is retained'});
  }
 }
 const changes=afterPieces.filter((p:any)=>JSON.stringify(p)!==JSON.stringify(pieces.find((x:any)=>x.id===p.id))).map((p:any)=>({pieceId:p.id,before:pieces.find((x:any)=>x.id===p.id)?.readout,after:p.readout,placement:p.placement??null}));
 const snapshot=current.session.snapshots?.at(-1)??current.session.snapshots?.[0];
 rows.push({gameId:c.id,inputSHA:c.inputSHA,referenceSHA:c.referenceSHA,referenceUnchanged:sha(await fs.readFile(c.referencePath))===c.referenceSHA,nativeSHA:sha(await fs.readFile(pre.privateDir+'/'+c.id+'.native.json')),rawItems:receipts[0].hostedWire.items.length,observations:receipts[0].result.observations.length,editableObjects:pieces.length,quantityPreserved:quantities,observedAttributes:known,representedAttributes:preserved,nativeFaceRepresentations,deferred,receiptUnchangedAfterUI:true,providerResponsePreserved:true,manualChangedPieceIds:changes.map((p:any)=>p.pieceId),manualChangeDetailsPrivate:true,snapshotPresent:!!snapshot,snapshots:current.session.snapshots?.length??0});
 await fs.writeFile(pre.privateDir+'/'+c.id+'.ui-changes.json',JSON.stringify(changes,null,2)+'\n',{mode:0o600});
}
await fs.writeFile(out+'/v1-storage-verification.json',JSON.stringify({providerCalls:0,readOnlyGETs:2,rows,limits:'Raw-to-editable accounting is not accuracy. UI actions and viewport recorded separately; snapshots may be absent for unfinished UI cases.'},null,2)+'\n');console.log(JSON.stringify(rows));
