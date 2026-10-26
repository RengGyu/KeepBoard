import {captureFields,captureComponentIds,capturePrompt,validateCaptureObservation} from '../../shared/photoCapture.ts';
import {normalizeGameModelRecord,gameReadoutPrompt,gameReadoutExample} from './gameReadouts.ts';
import {randomUUID} from 'node:crypto';
import {normalizeSplendorModelRecord} from './splendor.ts';
import {emptySplendorObservation} from '../../shared/splendor.ts';
import type {Assertion,Evidence,GamePack,Session,Value} from '../../shared/types.ts';
import {effectiveRecognitionPack,recognitionFields,recognizedVariants,observationTray} from '../../shared/recognition.ts';
import {runtimeBinding} from '../../shared/gameEssentials.ts';
import {validateGenericRecord,type GenericRecord} from '../../shared/genericRecord.ts';

/** The model observes a new candidate; it never assigns a stored physical identity or board coordinate. */
export function genericCandidateValue(value:unknown,rawPack:GamePack,field:string,evidence:Evidence[],ownerId?:string,freshIds=false,warnings?:string[]):Value{
 const pack=effectiveRecognitionPack(rawPack),definition=recognitionFields(pack,ownerId).find(f=>f.key===field);
 if(!definition)throw new Error('사진 관측이 허용되지 않은 필드입니다.');
 // Stored candidates passed the analysis target; the original upload target can differ.
 if(freshIds)validateCaptureObservation(pack,field,value as Value,evidence);
 if(definition.type!=='json'){if(typeof value!=='number'||!Number.isFinite(value))throw new Error('보이는 숫자만 기록하세요.');return value;}
 const sources=evidence.filter(e=>e.kind==='photo'&&(ownerId?e.ownerId===ownerId&&e.scope==='player':!e.ownerId&&e.scope==='public'));
 const prepared=freshIds?((pack.runtime?.source.gameId??pack.id)==='splendor'?normalizeSplendorModelRecord(value,warnings):normalizeGameModelRecord(value,pack,warnings,sources.filter(e=>e.captureEpoch===sources[0]?.captureEpoch).map(e=>e.id))):value;
 const record=validateGenericRecord(prepared as Value,pack,field,sources.map(e=>e.id),{mode:'ai'});
 if(!record.pieces.length)throw new Error('확인한 실물이 없는 결과입니다. 기존 기록을 비우지 않았어요.');
 const crops=new Set<string>();
 const pieces=record.pieces.map(p=>{
  if(p.componentId!==null&&!pack.runtime!.components.some(c=>c.id===p.componentId))throw new Error('알 수 없는 구성물 종류입니다.');
  if(p.variant!==null&&(!p.componentId||!recognizedVariants(pack,p.componentId).includes(p.variant)))throw new Error('알 수 없는 대표 그림입니다.');
  if(!p.evidenceId||!sources.some(e=>e.id===p.evidenceId))throw new Error('실제 읽은 원본을 연결해 주세요.');
  if(Object.hasOwn(p,'placement'))throw new Error('사진 좌표를 게임판 자리로 추정하지 않습니다.');
  if(p.region){const key=JSON.stringify([p.evidenceId,p.region]);if(crops.has(key))throw new Error('동일 원본 영역이 중복된 결과입니다.');crops.add(key);}
  if(p.label.length>500||p.anchor.length>300)throw new Error('관측 설명이 너무 깁니다.');
  const clearSingle=freshIds&&(pack.runtime?.source.gameId??pack.id)==='splendor'&&p.readout&&['development','noble'].includes(p.readout.kind??'')&&!/더미|뒷면|pile|stack|back|deck|추정|불확실|정체\s*불명|종류\s*불명|가려|가림/i.test(p.label);
  return {id:freshIds?randomUUID():p.id,componentId:p.componentId,variant:p.variant,quantity:clearSingle&&p.quantity===null?1:p.quantity,label:p.label,anchor:p.anchor,evidenceId:p.evidenceId,region:p.region??null,...(p.readout?{readout:p.readout}:{})};
 });
 return {version:'game-component-record-v1',pieces} as unknown as Value;
}
export function genericObservationPrompt(session:Session,rawPack:GamePack,evidence:Evidence[],instruction?:string,purpose='capture'){
 const pack=effectiveRecognitionPack(rawPack),ownerId=evidence[0]?.ownerId,fields=captureFields(pack,evidence,recognitionFields(pack,ownerId));
 const splendor=(pack.runtime?.source.gameId??pack.id)==='splendor';
 const definitions=fields.map(f=>{const b=runtimeBinding(pack,f.key)!;return {field:f.key,label:f.label,type:f.type,scope:f.scope,visibility:f.visibility,areaIds:b.areaIds,unassignedTray:observationTray(f.key),components:pack.runtime!.components.filter(c=>b.componentIds.includes(c.id)&&(!captureComponentIds(pack,evidence)||captureComponentIds(pack,evidence)!.includes(c.id))).map(c=>({id:c.id,name:c.name,kind:c.kind}))};});
 const typed=gameReadoutExample(pack,definitions.flatMap(d=>d.components.map(c=>c.id)));
 return `You read visible physical board-game components for KeepBoard. Return Korean JSON only. Game ${pack.title}, edition ${pack.edition}, pinned source ${pack.runtime!.source.sha256}.
${capturePrompt(pack,evidence)}
Read the ${purpose==='restore'?'CURRENT restored table, never the expected saved state':'current paused table'}. Multiple photographs in this request have been explicitly confirmed as ONE paused state, not turns. captureEpoch alone is not that confirmation. Read jointly: do not count the same object twice across views. If identity across views is uncertain, give conservative visible observations and a warning, never invent a match/history. Never copy existing accepted IDs or values.
Photos (region coordinates belong to each piece.evidenceId): ${JSON.stringify(evidence.map(e=>({id:e.id,ownerId:e.ownerId,label:e.label})))}
Authorized context is ${ownerId?'only this owner '+ownerId:'public'}. Fields and permitted components: ${JSON.stringify(definitions)}
Do not infer another owner from seat, color, position or handwriting. For public photos, visible public objects without an exact field/owner go to __photo.public if allowed. For owner photos, public holdings cannot cite a private photo in a public field: put them in __photo.owner if allowed; actual private fields such as reserved cards use their own allowed owner field. A tray is an access context, NOT a claim of physical ownership. Do not collect own-hidden/role-limited identities or draw pile interiors. A visible back may only be described as a back with identity unknown. Never output excluded fields, current player, round, phase, past purchases, completed effects, hidden score, derived totals, inferred costs or plausible rules corrections.
Only one assertion per field. One physical item per piece; multiple identical items retain separate IDs. A clearly counted homogeneous pile may have quantity N, occluded or unknown quantity is null, unseen is not 0. Card costs/bonuses, dice faces and material colors may be transcribed in Korean label only when actually legible. No invented commercial card IDs. componentId is one permitted id or null. variant MUST be null: the app's art choices are representative illustrations, not printed physical subtypes. Never output placement/game-slot geometry: photo crop coordinates are not board coordinates. An uncertain item retains its original crop and truthful label. Do not output empty records as instructions to clear old data.
${gameReadoutPrompt(pack,definitions.flatMap(d=>d.components.map(c=>c.id)))}
${splendor?`SPLENDOR REQUIRED READOUT: Every piece MUST additionally include readout=${JSON.stringify(emptySplendorObservation())}. kind is development (one visible FRONT card), noble (one visible tile), token, deck (stack/back) or null. Use componentId development for development/deck, nobles for noble, chips for token. Read the actually printed points, top-right permanent bonus gem, and each printed purchase cost on development fronts. These are the primary requested information: do not return only object positions when these printed symbols are legible. Noble requirements are OWNED CARD BONUS counts, not a payment cost. Token color/physical quantity is NOT card bonus/cost. level is only explicit visible level marking, never inferred from row or prestige points. Full maps have exactly white,blue,green,red,black with integer or null values. Missing/unreadable panels are null, unreadable colours are null. Zero only when the entire panel is visible and that colour is positively absent. Never derive a cost from bonus/holdings/rules. Card/noble front kind means one distinct visible instance: quantity=1; deck/pile/uncertain/back counts stay null unless explicitly counted. For a back/pile use kind deck, points/bonus/cost/requirements null. Distinguish front/back instead of assigning development to a deck. readout.schema is splendor-v1. All enum VALUES MUST be canonical English, never Korean translations: bonus=white|blue|green|red|black|null, color=white|blue|green|red|black|gold|null. kind=development|noble|token|deck|null. Korean is only for label, anchor and summary. Preserve whole-card evidence crop INCLUDING all cost circles and bonus/points; do not crop out the lower part. Costs/points/bonus belong in readout, not just label; keep label short. UNKNOWN IS NULL, never substitute plausible card data.`:''}
Return {"summary":"short facts only","warnings":[],"assertions":[{"field":"one authorized field","value":{"version":"game-component-record-v1","pieces":[{"id":"new-local-physical-1","componentId":${typed?JSON.stringify(typed.componentId):'null'},"variant":null,"quantity":null,"label":"visible item / unknown detail","anchor":"visible relative location","evidenceId":"actual source id","region":{"x":0.1,"y":0.2,"width":0.2,"height":0.3}${splendor?',"readout":'+JSON.stringify(emptySplendorObservation()):typed?',"readout":'+JSON.stringify(typed.readout):''}}]},"evidenceIds":["actual source id"],"confidence":0.7,"reason":"visible basis"}]}.
Every piece must cite one attached original. region is normalized0..1 in THAT original or null if no reliable crop. Include all used photo ids at assertion level. Scalar number fields are only allowed when listed and the number is explicitly printed/written, not calculated or inferred. Unknowns stay unknown. User focus: ${instruction??'Identify visible components and preserve their sources for correction.'}`;
}

/** Only exact same source/crop/category across dedicated field and tray; never match similar physical copies. */
export function deduplicateGenericObservationCrops(assertions:Assertion[]):Assertion[]{
 const key=(a:Assertion,p:any)=>p.componentId&&p.evidenceId&&p.region?JSON.stringify([a.ownerId??null,p.evidenceId,p.componentId,p.region.x,p.region.y,p.region.width,p.region.height]):null;
 const dedicated=new Set(assertions.filter(a=>!observationTray(a.field)).flatMap(a=>{const v=a.value as unknown as GenericRecord;return v?.version==='game-component-record-v1'?v.pieces.flatMap(p=>{const k=key(a,p);return k?[k]:[];}):[];}));
 return assertions.flatMap(a=>{const v=a.value as unknown as GenericRecord;if(!observationTray(a.field)||v?.version!=='game-component-record-v1')return [a];const pieces=v.pieces.filter(p=>{const k=key(a,p);return !k||!dedicated.has(k);});return pieces.length?[{...a,value:{version:v.version,pieces} as unknown as Value}]:[];});
}
/** Call only after validation/CAS. Empty/failure paths never reach this replacement. */
export function appendGenericObservation(session:Session,pack:GamePack,assertion:Assertion){
 const v=assertion.value as unknown as GenericRecord,b=runtimeBinding(pack,assertion.field),sameEvidence=(a:Assertion)=>JSON.stringify([...new Set(a.evidenceIds)].sort())===JSON.stringify([...new Set(assertion.evidenceIds)].sort());
 if(pack.runtime?.support.recording==='generic'&&b?.editor==='component-catalog'&&v?.version==='game-component-record-v1'&&v.pieces.length)session.assertions=session.assertions.filter(a=>!(a.status==='candidate'&&a.field===assertion.field&&a.ownerId===assertion.ownerId&&sameEvidence(a)));
 session.assertions.push(assertion);
}
