import type {GamePack} from '../types.ts';
import {GAME_READOUTS} from './catalog.ts';
import retired from './retired.json';
import type {ComponentSpec,DetailValue,GameReadout,GameReadoutDefinition,PropertySpec,ReadoutContext} from './types.ts';
export type {GameReadout,GameReadoutDefinition,PropertySpec,DetailValue,ReadoutContext} from './types.ts';
const fail=(message:string):never=>{throw new Error(message);};
export const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const exact=(v:unknown,keys:readonly string[],name:string):Record<string,unknown>=>{
 if(!isObject(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return fail(name+'의 필드를 확인하세요.');return v;
};
const nonempty=(v:unknown,max=160)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export function readoutDefinition(pack:GamePack):GameReadoutDefinition|undefined {
 const s=pack.runtime?.source;
 if(!s)return undefined;
 const matches=(d:GameReadoutDefinition|undefined)=>d&&s.editionId===d.editionId&&s.sha256===d.sourceSHA&&pack.id===d.runtimePackId&&pack.version===d.packVersion;
 const current=GAME_READOUTS[s.gameId],old=(retired as Record<string,GameReadoutDefinition>)[s.gameId];
 return matches(current)?current:matches(old)?old:undefined;
}
export function componentDefinition(pack:GamePack,componentId:string|null):ComponentSpec|undefined{return readoutDefinition(pack)?.components.find(c=>c.id===componentId);}
export function emptyGameReadout(pack:GamePack,kind:string|null):GameReadout {
 const d=readoutDefinition(pack);if(!d)return fail('판본·원명세에 맞는 상세 양식이 없습니다. 기존 기록은 보존됩니다.');
 const c=d.components.find(c=>c.id===kind);if(kind!==null&&!c)return fail('상세 양식의 구성물 종류를 확인하세요.');
 return {schema:d.schema,kind,values:Object.fromEntries((c?.fields??[]).map(f=>[f.id,null])),sources:Object.fromEntries((c?.fields??[]).map(f=>[f.id,null]))};
}
export function validateDetailValue(value:unknown,f:PropertySpec,context:ReadoutContext={}):DetailValue {
 if(value===null)return null;
 const invalid=()=>fail(f.label+' 값을 확인하세요. 모름과 0은 다릅니다.');
 if(f.type==='integer'){if(typeof value!=='number'||!Number.isSafeInteger(value)||f.min!==undefined&&value<f.min||f.max!==undefined&&value>f.max)return invalid();}
 else if(f.type==='boolean'){if(typeof value!=='boolean')return invalid();}
 else if(f.type==='enum'){if(!f.options?.some(o=>o.value===value))return invalid();}
 else if(f.type==='text'){if(!nonempty(value))return invalid();}
 else if(f.type==='player'){if(!nonempty(value)||!context.playerIds?.includes(value as string))return invalid();}
 else if(f.type==='marks'){
  if(!Array.isArray(value)||value.length>32)return invalid();const seen=new Set<string>();
  for(const row of value){const o=exact(row,['symbol','value'],f.label);if(!nonempty(o.symbol,64)||seen.has(o.symbol as string)||o.value!==null&&(typeof o.value!=='number'||!Number.isSafeInteger(o.value)||o.value<0))return invalid();seen.add(o.symbol as string);}
 }else if(f.type==='features'){
  if(!Array.isArray(value)||value.length>32)return invalid();const ids=new Set<string>();
  for(const row of value){const o=exact(row,['id','kind','label','x','y'],f.label);if(!nonempty(o.id,80)||ids.has(o.id as string)||typeof o.label!=='string'||o.label.length>120||![null,'city','road','field','monastery','other'].includes(o.kind as any)||(o.x===null)!==(o.y===null))return invalid();
   for(const a of [o.x,o.y])if(a!==null&&(typeof a!=='number'||!Number.isFinite(a)||a<0||a>1))return invalid();ids.add(o.id as string);}
 }else if(f.type==='reference'){
  const o=exact(value,['pieceId','featureId'],f.label);if(!nonempty(o.pieceId,160)||o.featureId!==null&&!nonempty(o.featureId,80))return invalid();
 }else return invalid();
 return structuredClone(value) as DetailValue;
}
export function validateGameReadout(value:unknown,pack:GamePack,componentId:string|null,evidenceId:string|null,context:ReadoutContext={}):GameReadout {
 const v=exact(value,['schema','kind','values','sources'],'상세 판독'),d=readoutDefinition(pack);
 if(!d||v.schema!==d.schema)return fail('이 게임·판본·원명세의 상세 판독이 아닙니다.');
 if(v.kind!==componentId)return fail('구성물과 상세 판독 종류가 다릅니다.');
 const component=d.components.find(c=>c.id===componentId);if(componentId!==null&&!component)return fail('허용되지 않은 구성물입니다.');
 const fields=component?.fields??[],values=exact(v.values,fields.map(f=>f.id),'상세 값'),sources=exact(v.sources,fields.map(f=>f.id),'상세 근거');
 for(const f of fields){const x=validateDetailValue(values[f.id],f,context),basis=sources[f.id];
  if(x===null){if(basis!==null)return fail('미확인 값에는 확정 근거를 붙이지 않습니다.');continue;}
  if(basis!=='observation'&&basis!=='user')return fail('관측 또는 직접 확인 근거가 필요합니다.');
  if(basis==='observation'&&(f.acquisition!=='visible'||!evidenceId))return fail('사진으로 알 수 없는 값이거나 원본 근거가 없습니다.');
  if(context.mode==='ai'&&(f.acquisition!=='visible'||basis!=='observation'))return fail('사진 판독으로 수동 입력을 확정하지 않습니다.');
  if(f.faceOnly&&values.face!=='front')return fail('앞면을 확인하지 않은 구성물의 앞면 정보를 넣을 수 없습니다.');
 }
 return structuredClone(v) as unknown as GameReadout;
}
/** Reading an old record does NOT create structured facts or parse an illustrative label. */
export function gameReadoutView(pack:GamePack,piece:{componentId:string|null;evidenceId:string|null;readout?:unknown}) {
 if(!Object.hasOwn(piece,'readout'))return {status:'legacy' as const,readout:null};
 try{return {status:'structured' as const,readout:validateGameReadout(piece.readout,pack,piece.componentId,piece.evidenceId,{playerIds:extractOwnerIds(pack,piece.componentId,piece.readout)})};}
 catch{return {status:'invalid' as const,readout:null};}
}
// Display only; server validation uses actual Session.players instead of this helper.
function extractOwnerIds(pack:GamePack,kind:string|null,readout:unknown):string[]{
 if(!isObject(readout)||!isObject(readout.values))return [];const values=readout.values;
 return (componentDefinition(pack,kind)?.fields??[]).filter(f=>f.type==='player').flatMap(f=>typeof values[f.id]==='string'?[values[f.id] as string]:[]);
}
export function readoutForGameComponent(pack:GamePack,piece:{componentId:string|null;readout?:unknown},componentId:string|null):{componentId:string|null;readout?:GameReadout}{
 if(piece.componentId===componentId)return {componentId};
 return {componentId,...(readoutDefinition(pack)?{readout:emptyGameReadout(pack,componentId)}:{})};
}
export function setReadoutValue(pack:GamePack,readout:GameReadout,key:string,value:DetailValue,context:ReadoutContext={}):GameReadout {
 const f=componentDefinition(pack,readout.kind)?.fields.find(f=>f.id===key);if(!f)return fail('수정 필드를 확인하세요.');
 const next=structuredClone(readout);next.values[key]=validateDetailValue(value,f,context);next.sources[key]=value===null?null:'user';
 // Hiding a face is explicit, but cannot leave front identity in the typed payload.
 if(key==='face'&&value!=='front')for(const f of componentDefinition(pack,next.kind)?.fields??[])if(f.faceOnly){next.values[f.id]=null;next.sources[f.id]=null;}
 return next;
}

/** A photo change must not relabel existing observation facts as evidence from a new image.
 * Legacy/manual-only records keep the old source-selection flow. No state is changed here. */
export function canRelinkReadoutEvidence(pack:GamePack,piece:{componentId:string|null;evidenceId:string|null;readout?:unknown}):boolean {
 if(!readoutDefinition(pack))return true;
 const view=gameReadoutView(pack,piece);
 if(view.status==='invalid')return false;
 return !view.readout||!Object.values(view.readout.sources).includes('observation');
}

/** Keep already observed values tied to their original photo; explicit manual rechecks may relink. */
export function validateReadoutEvidenceChanges(pack:GamePack,previous:readonly {id:string;evidenceId:string|null;componentId:string|null;readout?:unknown}[],next:readonly {id:string;evidenceId:string|null;componentId:string|null;readout?:unknown}[]) {
 if(!readoutDefinition(pack))return;
 for(const p of next){const now=gameReadoutView(pack,p).readout;if(!now)continue;
  for(const old of previous){if(old.id!==p.id||old.evidenceId===p.evidenceId)continue;const before=gameReadoutView(pack,old).readout;if(!before)continue;
   for(const key of Object.keys(now.sources))if(now.sources[key]==='observation'&&before.sources[key]==='observation'&&JSON.stringify(now.values[key])===JSON.stringify(before.values[key]))throw new Error('사진 관측값의 원본을 바꿀 수 없어요. 값을 직접 확인하거나 새 사진을 후보로 읽어 주세요.');
  }
 }
}
