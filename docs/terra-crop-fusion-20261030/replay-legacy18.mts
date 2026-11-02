import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {builtinPacks,legacyPack} from '../../gamepacks/catalog';import {effectiveRecognitionPack} from '../../shared/recognition';
import {decodeTerraGameObservation,TERRA_IDENTITY} from '../../server/ai/terraGameReader';import {assembleObservations} from '../../server/ai/observationAssembly';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const plan=JSON.parse(await fs.readFile('docs/terra-accuracy-20261030/plan-heldout.json','utf8')),rows=[];
for(const call of plan.calls){
 const bytes=await fs.readFile(call.taskPath);assert.equal(sha(bytes),call.taskSHA);const task=JSON.parse(bytes.toString());
 const nativeBytes=await fs.readFile(plan.privateDir+'/'+call.id+'.native.json'),native=JSON.parse(nativeBytes.toString());
 const decoded=decodeTerraGameObservation(native,task.request,task.definition),frozen=JSON.parse(await fs.readFile(plan.privateDir+'/'+call.id+'.decoded.json','utf8'));assert.deepEqual(decoded.raw,frozen);
 const pack=effectiveRecognitionPack(builtinPacks().find(p=>p.id===task.definition.packId&&p.version===task.definition.packVersion)??legacyPack(task.definition.packId,task.definition.packVersion)!);
 const before=JSON.stringify(native),result=assembleObservations({request:task.request,result:decoded.raw,definition:task.definition,pack,turnInstanceId:'offline-replay',reader:TERRA_IDENTITY,hostedWire:decoded.hostedWire});assert.equal(JSON.stringify(native),before);
 const pieces=result.assertions.flatMap(a=>(a.value as any).pieces??[]),receipt=result.observationReceipts![0];let known=0,preserved=0,faces=0;
 for(const o of decoded.raw.observations){const p=pieces.find(p=>p.id===receipt.componentRefs[o.ref]);if(!p)continue;for(const [key,value]of Object.entries(o.properties)){if(value.state!=='observed')continue;known++;if(JSON.stringify(p.readout.values[key])===JSON.stringify(value.value))preserved++;}if(o.properties.face?.state==='unknown'&&o.face!=='unknown'&&p.readout.values.face===o.face)faces++;}
 assert.equal(preserved,known);assert.deepEqual(receipt.hostedWire!.providerResponse,native);assert.equal(receipt.reader.kind,'terra-game-observation-v1');
 rows.push({id:call.id,taskSHA:sha(bytes),nativeSHA:sha(nativeBytes),observations:decoded.raw.observations.length,known,preserved,faces,immutable:true,receiptProvider:'terra'});
}
const result={providerCalls:0,scope:'saved responses through actual Terra decoder and current assembly; accuracy unscored',rows,totals:{responses:rows.length,known:rows.reduce((n,r)=>n+r.known,0),preserved:rows.reduce((n,r)=>n+r.preserved,0),faces:rows.reduce((n,r)=>n+r.faces,0)}};
await fs.writeFile('docs/terra-crop-fusion-20261030/legacy18-replay.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.totals));
