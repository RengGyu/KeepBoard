import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {genericObservationPrompt,genericCandidateValue} from '../../server/ai/generic.ts';
import {effectiveRecognitionPack,recognitionFields} from '../../shared/recognition.ts';
import {readoutDefinition,emptyGameReadout} from '../../shared/readouts/registry.ts';
import {emptySplendorObservation} from '../../shared/splendor.ts';
import type {GamePack,Session,Evidence} from '../../shared/types.ts';
const packs=JSON.parse(await readFile('gamepacks/generated/game-essentials.json','utf8')) as GamePack[];
const session={players:[],assertions:[],turnInstanceId:'synthetic-turn'} as unknown as Session;
const evidence=[{id:'synthetic-source',label:'synthetic',kind:'photo',scope:'public',captureEpoch:'synthetic-epoch'}] as Evidence[];
const rows=[];
for(const id of ['splendor','carcassonne']){
 const pack=effectiveRecognitionPack(packs.find(p=>p.id===id)!);let started=performance.now();const prompt=genericObservationPrompt(session,pack,evidence);const buildMs=performance.now()-started;
 const definition=readoutDefinition(pack);const schemas=[...new Set([...prompt.matchAll(/"schema":"([^"]+)"/g)].map(m=>m[1]))];
 const fields=recognitionFields(pack),field=fields.find(f=>f.type==='json')!,b=pack.runtime!.fieldBindings.find(b=>b.key===field.key)!,component=b.componentIds[0];
 const pieces=Array.from({length:50},(_,i)=>({id:'synthetic-'+i,componentId:component,variant:null,quantity:null,label:'synthetic observation',anchor:'synthetic',evidenceId:evidence[0].id,region:null,readout:id==='splendor'?emptySplendorObservation('development'):emptyGameReadout(pack,component)}));
 const value={version:'game-component-record-v1',pieces};started=performance.now();const decoded=JSON.parse(JSON.stringify(value));const jsonRoundtripMs=performance.now()-started;started=performance.now();genericCandidateValue(decoded,pack,field.key,evidence,undefined,true);const validateMs=performance.now()-started;
 rows.push({gameId:id,photos:1,promptChars:prompt.length,promptUTF8Bytes:Buffer.byteLength(prompt),schemas,otherGameSchemas:schemas.filter(s=>s!==id+'-v1'),allowedFields:fields.length,detailComponents:definition?.components.filter(c=>fields.some(f=>pack.runtime!.fieldBindings.find(b=>b.key===f.key)?.componentIds.includes(c.id))).length??3,buildMs,jsonRoundtripMs,syntheticPieces:50,syntheticValueBytes:Buffer.byteLength(JSON.stringify(value)),validationMs:validateMs,modelCalls:0});
}
await writeFile('docs/photo-read-latency/offline.json',JSON.stringify({scope:'2 representative source-only synthetic probes; not current user request or model benchmark',rows},null,2)+'\n');console.log(JSON.stringify(rows));
