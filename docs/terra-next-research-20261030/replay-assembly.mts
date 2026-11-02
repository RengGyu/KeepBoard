// Read-only product function replay. No server, store, credentials, provider, or network is invoked.
// Only this research directory receives aggregate results; private observations are never copied.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {builtinPacks,legacyPack} from '../../gamepacks/catalog.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
import {assembleObservations} from '../../server/ai/observationAssembly.ts';
import {decodeGeminiGameObservation} from '../../server/ai/geminiGameReader.ts';
import {namedToDecoderItems} from '../ten-games-closeup-20261029/terra-fix/namedBox.mts';

const out=path.dirname(new URL(import.meta.url).pathname);
const experiment=path.resolve(out,'../terra-accuracy-20261030');
const plan=JSON.parse(await fs.readFile(path.join(experiment,'plan-heldout.json'),'utf8'));
const sha=(s:Buffer|string)=>createHash('sha256').update(s).digest('hex');
const rows=[];
for(const call of plan.calls){
 const task=JSON.parse(await fs.readFile(call.taskPath,'utf8'));
 const taskHash=sha(await fs.readFile(call.taskPath));
 if(taskHash!==call.taskSHA)throw Error('Task hash changed: '+call.id);
 const original=builtinPacks().find(p=>p.id===task.definition.packId&&p.version===task.definition.packVersion)??legacyPack(task.definition.packId,task.definition.packVersion);
 if(!original)throw Error('Pinned pack unavailable: '+call.id);
 const pack=effectiveRecognitionPack(original);
 const decoded=JSON.parse(await fs.readFile(path.join(plan.privateDir,call.id+'.decoded.json'),'utf8'));
 const row:any={id:call.id,taskHash,observations:decoded.observations.length,packVersionMatch:pack.version===task.definition.packVersion,sourceSHAMatch:pack.runtime?.source.sha256===task.definition.sourceSHA};
 try{
  const native=JSON.parse(await fs.readFile(path.join(plan.privateDir,call.id+'.native.json'),'utf8'));
  const parsed=JSON.parse(native.output.filter((x:any)=>x.type==='message').flatMap((m:any)=>m.content).map((p:any)=>p.text).join(''));
  const named=namedToDecoderItems(parsed.items);
  const fresh=decodeGeminiGameObservation({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({items:named.items})}]}}]},task.request,task.definition);
  row.currentDecoderMatchesFrozen=JSON.stringify(fresh)===JSON.stringify(decoded);
  if(!row.currentDecoderMatchesFrozen)throw Error('Current decoder differs from frozen decoded response');
  // Replays the existing provider-independent assembly only. This supported fixture identity does
  // not purport to be a working Terra adapter, live job, end-to-end save test, or new model output.
  const result=assembleObservations({request:task.request,result:decoded,definition:task.definition,pack,turnInstanceId:'research-replay',reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768}});
  const pieces=result.assertions.flatMap(a=>(a.value as any).pieces??[]);
  const refs=result.observationReceipts![0].componentRefs;
  let knownInputProperties=0,knownPreserved=0,explicitFaceRecovered=0,quantityNullPreserved=0;
  for(const o of decoded.observations){
   const p=pieces.find(p=>p.id===refs[o.ref]);
   if(!p)continue;
   if(o.quantity===null&&p.quantity===null)quantityNullPreserved++;
   for(const [key,value]of Object.entries(o.properties) as [string,any][]){
    if(value.state!=='observed')continue;
    knownInputProperties++;
    if(JSON.stringify(p.readout?.values[key])===JSON.stringify(value.value))knownPreserved++;
   }
   if(o.properties.face?.state==='unknown'&&o.face!=='unknown'&&p.readout?.values.face===o.face)explicitFaceRecovered++;
  }
  Object.assign(row,{assembled:true,pieces:pieces.length,assertions:result.assertions.length,knownInputProperties,knownPreserved,explicitFaceRecovered,quantityNullPreserved});
 }catch(e){Object.assign(row,{assembled:false,error:e instanceof Error?e.message:String(e)});}
 rows.push(row);
}
const sources=['server/ai/observationAssembly.ts','server/ai/geminiGameReader.ts','docs/ten-games-closeup-20261029/terra-fix/namedBox.mts','shared/readouts/registry.ts','shared/lightweightRecognition.ts','shared/genericRecord.ts','shared/recognition.ts','gamepacks/catalog.ts','gamepacks/generated/game-essentials.json','shared/readouts/catalog.ts'];
const hashes=await Promise.all(sources.map(async file=>({file,sha256:sha(await fs.readFile(path.resolve(out,'../..',file)))})));
const result={kind:'offline-current-generic-assembly-only',providerCalls:0,serverStarted:false,productWrites:0,scope:'18 saved decoded responses; current exact pack/source; no end-to-end Terra/save/UI claim',rows,sourceHashes:hashes};
await fs.writeFile(path.join(out,'assembly-replay.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,assembled:rows.filter(r=>r.assembled).length,knownPreserved:rows.reduce((s,r)=>s+(r.knownPreserved??0),0),knownInputProperties:rows.reduce((s,r)=>s+(r.knownInputProperties??0),0),explicitFaceRecovered:rows.reduce((s,r)=>s+(r.explicitFaceRecovered??0),0),errors:rows.filter(r=>!r.assembled).map(r=>({id:r.id,error:r.error}))}));
