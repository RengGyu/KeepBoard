import {captureProfile} from '../../shared/photoCapture.ts';
import type {GamePack} from '../../shared/types.ts';
import {readoutDefinition,emptyGameReadout,validateGameReadout,validateDetailValue,isObject} from '../../shared/readouts/registry.ts';
import type {DetailValue,PropertySpec} from '../../shared/readouts/types.ts';
/** Fresh provider output ONLY. Never call this for saved/imported/manual data. */
export function normalizeGameModelRecord(value:unknown,pack:GamePack,warnings:string[]=[],allowedEvidenceIds:readonly string[]=[]):unknown {
 const d=readoutDefinition(pack);if(!d||!isObject(value)||!Array.isArray(value.pieces))return value;
 return {...value,pieces:value.pieces.map((raw:unknown)=>{
  if(!isObject(raw))throw new Error('사진 실물 후보 형식을 확인하세요.');
  const kind=raw.componentId as string|null,out=emptyGameReadout(pack,kind),spec=d.components.find(c=>c.id===kind);
  if(!Object.hasOwn(raw,'readout')){warnings.push(`${d.title}: 상세값을 받지 못해 미확인으로 남겼습니다.`);return {...raw,readout:out};}
  const r=raw.readout;
  if(!isObject(r)||r.schema!==d.schema||r.kind!==kind||Object.keys(r).some(k=>!['schema','kind','values','sources'].includes(k))||!isObject(r.values))throw new Error('알 수 없는 사진 상세 스키마/종류입니다.');
  if(Object.keys(r.values).some(k=>!spec?.fields.some(f=>f.id===k)))throw new Error('허용하지 않은 사진 상세 필드입니다.');
  const actualSource=typeof raw.evidenceId==='string'&&allowedEvidenceIds.includes(raw.evidenceId)?raw.evidenceId:undefined;
  if(r.sources!==undefined&&(!isObject(r.sources)||Object.keys(r.sources).some(k=>!spec?.fields.some(f=>f.id===k))||Object.values(r.sources).some(v=>v!==null&&v!=='observation'&&(!actualSource||v!==actualSource))))throw new Error('사진 판독을 사용자 수동 확인으로 표시하지 않습니다.');
  for(const f of spec?.fields??[]){let v=r.values[f.id];if(v===undefined||v===null)continue;
   if(f.acquisition!=='visible'||captureProfile(pack)&&!captureProfile(pack)!.visible[kind??'']?.includes(f.id))throw new Error('사진 판독으로 수동 필드를 입력하지 않습니다.');
   // Canonical synonyms only, not inference from the picture/other numbers/illustration variants.
   if(f.type==='enum'&&typeof v==='string'){const options=f.options?.filter(o=>o.value===v||o.label===v);if(options?.length===1)v=options[0].value;}
   if(f.type==='boolean'&&(v==='있음'||v==='없음'))v=v==='있음';
   if(f.type==='integer'&&typeof v==='string'&&/^-?\d+$/.test(v))v=Number(v);
   try{out.values[f.id]=validateDetailValue(v,f);out.sources[f.id]=v===null?null:'observation';}
   catch{warnings.push(`${d.title} · ${f.label}: 읽히지 않은 값은 미확인으로 남겼습니다.`);}
  }
  for(const f of spec?.fields??[])if(f.faceOnly&&out.values.face!=='front'&&out.values[f.id]!==null){out.values[f.id]=null;out.sources[f.id]=null;warnings.push(`${d.title}: 앞면 미확인 세부값을 확정하지 않았습니다.`);}
  validateGameReadout(out,pack,kind,raw.evidenceId as string|null,{mode:'ai'});
  return {...raw,readout:out};
 })};
}
export function gameReadoutExample(pack:GamePack,componentIds:readonly string[]){const d=readoutDefinition(pack),c=d?.components.find(c=>componentIds.includes(c.id));return c?{componentId:c.id,readout:emptyGameReadout(pack,c.id)}:null;}
export function gameReadoutPrompt(pack:GamePack,componentIds:readonly string[]):string {
 const d=readoutDefinition(pack);if(!d)return '';
 const definitions=d.components.filter(c=>componentIds.includes(c.id)).map(c=>({componentId:c.id,readout:emptyGameReadout(pack,c.id),fields:c.fields.filter(f=>f.acquisition==='visible'&&(!captureProfile(pack)||captureProfile(pack)!.visible[c.id]?.includes(f.id))).map(f=>({key:f.id,label:f.label,type:f.type,mode:f.acquisition,unit:f.unit,min:f.min,max:f.max,options:f.options,faceOnly:!!f.faceOnly,meaning:f.sourceText}))}));
 return `REQUIRED GAME-SPECIFIC DETAIL CONTRACT (every piece must include its matching readout): ${JSON.stringify({gameId:d.gameId,schema:d.schema,edition:d.editionId,sourceSHA:d.sourceSHA,components:definitions})}
For each visible piece, include its own matching readout, including values AND sources. sources values are ONLY observation|null basis labels, NEVER image IDs. The actual image ID goes in outer piece.evidenceId. Unknowns stay null; no label-to-value guessing. Read visible individual fields instead of stuffing them into label. Use null for unknowns, never fill a likely value. Never output non-null manual fields, including player IDs, tile/grid placement, attachment IDs, past actions or score wraps. Manual fields remain null even when game rules suggest an answer. Sources are observation for actually read non-null fields, otherwise null. Face-only values require a clearly visible front; do not reveal or infer hidden backs. Symbols/marks: record only legible symbol labels and explicit numbers, unknown value null; missing rows are unknown, not zero. Empty symbol list is allowed only when full panel is positively observed empty. Physical quantity remains the OUTER piece.quantity; it is not points, cost, die face, movement distance or resource denomination. Do not make commercial card IDs or copy illustrative art variants. Keep original label/anchor and full source crop. kind matches componentId or both null (empty values/sources).`;
}
