// Read-only product inspection. No Store, settings, network, model, or user data imports.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {recognitionCapability,recognitionFields,effectiveRecognitionPack} from '../../shared/recognition.ts';
import {observableFields} from '../../server/ai/fields.ts';
import {genericObservationPrompt} from '../../server/ai/generic.ts';
import {readoutDefinition} from '../../shared/readouts/registry.ts';
import type {GamePack,Session,Evidence} from '../../shared/types.ts';

const root=new URL('../../',import.meta.url);
const bytes=await readFile(new URL('gamepacks/generated/game-essentials.json',root));
const packs=JSON.parse(bytes.toString()) as GamePack[];
const rows=[];
for(const pack of packs){
 const cap=recognitionCapability(pack),def=readoutDefinition(pack);
 const publicFields=cap.mode==='native'?observableFields(pack).filter(f=>f.scope==='public'):recognitionFields(pack);
 const ownerFields=cap.mode==='native'?observableFields(pack).filter(f=>f.scope==='player'&&f.visibility!=='public'):recognitionFields(pack,'synthetic-owner');
 const fixture={id:'synthetic-only',players:[{id:'synthetic-owner',name:'시험',color:'#123456'}],turnInstanceId:'synthetic-turn'} as Session;
 const photo={id:'synthetic-photo',kind:'photo',scope:'public',captureEpoch:'synthetic-epoch',label:'합성 참조 ID, 사진 없음',url:'data:image/jpeg;base64,',createdAt:'2026-10-23T00:00:00Z'} as Evidence;
 const started=performance.now();
 const prompt=cap.mode==='assisted'?genericObservationPrompt(fixture,pack,[photo]):null;
 const elapsed=performance.now()-started;
 rows.push({game_id:pack.runtime!.source.gameId,pack_id:pack.id,version:pack.version,source:pack.runtime!.source,mode:cap.mode,
  readout_schema:def?.schema??null,readout_verification:def?.sourceVerification??null,
  collectable_bindings:cap.bindings,excluded_bindings:cap.excluded,
  public_photo_fields:publicFields.map(f=>({key:f.key,scope:f.scope,visibility:f.visibility})),owner_photo_fields:ownerFields.map(f=>({key:f.key,scope:f.scope,visibility:f.visibility})),
  effective_bindings:effectiveRecognitionPack(pack).runtime!.fieldBindings,
  offline_prompt:prompt?{utf8_bytes:Buffer.byteLength(prompt),characters:prompt.length,assembly_ms:elapsed,fixture_images:1,real_images:0}:null});
}
await writeFile(new URL('runtime-audit.json',import.meta.url),JSON.stringify({checked_at:new Date().toISOString(),status:'VERIFIED_CODE_ONLY',pack_sha256:createHash('sha256').update(bytes).digest('hex'),games:rows,real_model_calls:0,settings_reads:0,meaning:'Pure current functions; timing is local prompt assembly, not upload/model latency or recognition accuracy.'},null,2)+'\n');
console.log(JSON.stringify({games:rows.length,typed_readouts:rows.filter(r=>r.readout_schema).length,bindings:rows.reduce((n,r)=>n+r.collectable_bindings.length,0),native:rows.filter(r=>r.mode==='native').map(r=>r.game_id),exit:0}));
