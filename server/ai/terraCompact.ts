import {sceneWireSchema,sceneInstructions} from './sceneWire';
import {spatialWireSchema} from './spatialWire';
import type {ObservationRequest,PhotoDefinition,ObservationUnknownReason} from '../../shared/lightweightRecognition';
import {hostedVisibleProperty} from './geminiGameReader';
import {VISIBLE_INSTANCE_CONTRACT} from './visibleUnitContract';

export const COMPACT_TERRA_PROFILE='literal-compact-unit-original-v3' as const;
export const LEAN_TERRA_PROFILE='literal-compact-visible-instance-v7' as const;
type CompactProfile=typeof COMPACT_TERRA_PROFILE|typeof LEAN_TERRA_PROFILE;
// Asked once and copied back after decoding: the item's own f/q fields, and a free colour note beside a game colour field.
const derivedFrom=(c:{properties:{id:string}[]},id:string):string|null=>id==='face'?'f':id==='quantity'?'q':id==='observedColor'?c.properties.find(p=>p.id!==id&&/color/i.test(p.id))?.id??null:null;
const reasons={u:'unreadable',o:'occluded',f:'out-of-frame',n:'not-present-unconfirmed',w:'wrong-face',a:'ambiguous',s:'unsupported'} as const satisfies Record<string,ObservationUnknownReason>;
const faces={f:'front',b:'back',u:'unknown'} as const;
const units={s:'single',g:'group',u:'unknown'} as const;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const invalid=():never=>{throw Error('Terra compact v3 관측 형식·코드·범위를 확인하세요. 원본과 기존 기록은 유지됩니다.');};
const code=<T extends Record<string,string>>(table:T,value:unknown):T[keyof T]=>typeof value==='string'&&Object.hasOwn(table,value)?table[value as keyof T]:invalid();

/** Codes are determined before inference, scoped to this request, never to returned values. */
export function compactTerraKinds(request:ObservationRequest,definition:PhotoDefinition,profile:CompactProfile=COMPACT_TERRA_PROFILE){
 if(request.definitionSHA!==definition.definitionSHA||!request.allowedComponents.length||new Set(request.allowedComponents).size!==request.allowedComponents.length)return invalid();
 return [...request.allowedComponents].sort().map((id,k)=>{
  const component=definition.components.find(c=>c.id===id);if(!component)return invalid();
  const allowed=request.allowedPropertyIds[id]??[];
  if(new Set(allowed).size!==allowed.length||new Set(component.properties.map(p=>p.id)).size!==component.properties.length)return invalid();
  const properties=component.properties.filter(p=>allowed.includes(p.id)&&hostedVisibleProperty(component,p.id)&&!(profile===LEAN_TERRA_PROFILE&&derivedFrom(component,p.id))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map((p,index)=>({p:index,id:p.id,label:p.label,type:p.type,...(p.min!==undefined?{min:p.min}:{}),...(p.max!==undefined?{max:p.max}:{}),...(p.options?{options:p.options.map(o=>o.value)}:{}),...(p.faceOnly?{frontOnly:true}:{})}));
  return {k,id,...(request.componentLabels?.[id]??{}),properties};
 });
}

/** Sparse attribute rows avoid positional mixed-type tuples, while keeping all value types. */
export function compactTerraContract(request:ObservationRequest,definition:PhotoDefinition,originalPrompt:string,profile:CompactProfile=COMPACT_TERRA_PROFILE){
 const lean=profile===LEAN_TERRA_PROFILE,kinds=compactTerraKinds(request,definition,profile),maxProperties=Math.max(...kinds.map(k=>k.properties.length));
 const coordinate={type:'number',minimum:0,maximum:1000},code_={type:'integer',enum:Array.from({length:maxProperties},(_,i)=>i)};
 // Every listed property is accounted for: a value row in a, or its bare code in x. Forcing the choice stops silently skipped readable values.
 const leanRow=maxProperties?{type:'array',maxItems:maxProperties,items:{type:'object',properties:{p:code_,v:{type:'string'}},required:['p','v'],additionalProperties:false}}:{type:'array',maxItems:0,items:{type:'object',properties:{p:{type:'integer',minimum:0},v:{type:'string'}},required:['p','v'],additionalProperties:false}},leanUnknown=maxProperties?{type:'array',maxItems:maxProperties,items:code_}:{type:'array',maxItems:0,items:{type:'integer',minimum:0}};
 const schema={type:'object',properties:{v:{type:'integer',enum:[3]},items:{type:'array',maxItems:512,items:{type:'object',properties:{
  k:{type:'integer',enum:kinds.map(k=>k.k)},b:{type:['array','null'],items:coordinate,minItems:4,maxItems:4},f:{type:'string',enum:Object.keys(faces)},q:{type:['integer','null'],minimum:0},u:{type:'string',enum:Object.keys(units)},
  ...(lean?{a:leanRow,x:leanUnknown}:{a:{type:'array',maxItems:maxProperties,items:{type:'object',properties:{p:maxProperties?{type:'integer',enum:Array.from({length:maxProperties},(_,i)=>i)}:{type:'integer',minimum:0},v:{type:['string','null']},r:{type:['string','null'],enum:[...Object.keys(reasons),null]}},required:['p','v','r'],additionalProperties:false}}})
 },required:lean?['k','b','f','q','u','a','x']:['k','b','f','q','u','a'],additionalProperties:false}}},required:['v','items'],additionalProperties:false};
 if(request.readMode==='values'||request.readMode==='cells'){delete (schema.properties.items.items.properties as any).b;schema.properties.items.items.required=schema.properties.items.items.required.filter(k=>k!=='b');}
 if(request.readingTarget?.mode==='public-scene'){(schema.properties.items.items.properties as any).ar={type:['string','null'],enum:[...request.readingTarget.areaIds,null]};schema.properties.items.items.required.push('ar');}
 // Reuse the current observation instructions; replace only wire representation, not reading scope.
 const firstBreak=originalPrompt.indexOf('\n');if(firstBreak<0)return invalid();
 let prompt=`Observe this ${request.gameId} photograph, selected area ${request.areaId} (${request.scope.partition}). The allowed physical kinds and their own visible properties are ${JSON.stringify(kinds)}. Use each component's name and physicalType to interpret its id; the output k is its numeric code, not its id or physicalType. Each p code is local to that kind and identifies its listed property. Never invent codes.`+originalPrompt.slice(firstBreak);
 const replace=(from:string,to:string)=>{if(!prompt.includes(from))throw Error('Terra compact 지시문 변환을 확인하세요.');prompt=prompt.replace(from,to);};
 replace('Unknown, absent-unconfirmed or occluded properties use valueJson:null with the matching reason;','Unknown, absent-unconfirmed or occluded properties use v:null with the matching r reason code;');
 // The named and compact transports share the same property-type contract.
 // This sentence needs no wire-name substitution: it applies to the encoded literal in either transport.
 if(!prompt.includes('Use each listed property\'s type: integer values are JSON numbers; text values are JSON strings, including printed digits and ranges.'))throw Error('Terra compact 타입 지시문을 확인하세요.');
 if(request.readMode!=='values'&&request.readMode!=='cells')replace('Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when uncertain.','Box each whole object as b:[ymin,xmin,ymax,xmax] in coordinates 0..1000 with ymin<ymax and xmin<xmax, or b:null when uncertain.');
 replace('Each attribute has id, valueJson (a JSON literal encoded as a string for an observed value, otherwise null), and unknownReason (null for observed, otherwise unreadable/occluded/out-of-frame/not-present-unconfirmed/wrong-face/ambiguous/unsupported).',
  lean?'Account for every listed property of the kind exactly once: a value you can read goes in a as a row with p (the property code) and v (a JSON literal encoded as a string); a property you cannot read goes in x as its bare code. Preserve every read value; do not drop a value because other properties are unknown. The only exception: when f is b, leave frontOnly properties out of both a and x. Do not repeat a property code.':'Each sparse attribute row a has p (the property code), v (a JSON literal encoded as a string for an observed value, otherwise actual null), and r (null for observed, otherwise u=unreadable/o=occluded/f=out-of-frame/n=not-present-unconfirmed/w=wrong-face/a=ambiguous/s=unsupported). Preserve every read value; do not drop a value because other properties are unknown. An explicit unknown needs its reason row. Omit a property row only when making no claim about it; omission is distinct from an explicit unknown. Do not repeat a property code.');
 if(lean&&request.propertyApplicability?.areaPropertyIds)prompt=prompt.replace('The only exception: when f is b, leave frontOnly properties out of both a and x.','Exceptions: when f is b, leave frontOnly properties out of both a and x; omit unread properties inapplicable to the observed area from both a and x. For ar:null use all kind properties. Keep read supplemental values.');
 if(request.spatial){replace('Return only JSON {"items":[...],"spatial":{...}};','Return only JSON {"v":3,"items":[...],"spatial":{...}};');(schema.properties as any).spatial=spatialWireSchema(request.readMode);schema.required.push('spatial');}else replace('Return only JSON {"items":[...]};','Return only JSON {"v":3,"items":[...]};');
 if(request.readingTarget?.mode==='public-scene')prompt+='\nFor this public scene include ar on each item: the observed sourceAreaId or actual null; all other codes are unchanged.';
 if(request.scene){(schema.properties as any).scene=sceneWireSchema();schema.required.push('scene');}
 if(lean){prompt+='\nEach item has exactly k,b,f,q,u,a,x'+(request.readingTarget?.mode==='public-scene'?',ar':'')+'. f is f=front/b=back/u=unknown. q is physical quantity (a visible count or actual null), not a printed value. u is s=single, g=group or u=unknown.\n'+VISIBLE_INSTANCE_CONTRACT.replace('Report physicalUnit from','Report u from').replace('Quantity remains','q remains');if(request.readMode==='values'||request.readMode==='cells')prompt=prompt.replace('exactly k,b,f','exactly k,f');return {prompt,schema};}
 prompt+='\nEach item has exactly k,b,f,q,u,a'+(request.readingTarget?.mode==='public-scene'?',ar':'')+'. f is f=front/b=back/u=unknown. q is physical quantity (a visible count or actual null), not a printed value. Report u as s=single when it is one distinguishable physical object, g=group when the box describes several objects as an inseparable aggregate, or u=unknown when that distinction cannot be observed. This is separate from physical quantity: do not invent a count for a single or group, and do not split a group using expected inventory. A group can have q:null. Preserve individually distinguishable neighboring objects separately.';
 if(request.readMode==='values'||request.readMode==='cells')prompt=prompt.replace('exactly k,b,f','exactly k,f');
 return {prompt,schema};
}

/** Validate the compact transport before the existing semantic validator sees reconstructed rows. */
export function expandCompactTerraPayload(payload:unknown,request:ObservationRequest,definition:PhotoDefinition,profile:CompactProfile=COMPACT_TERRA_PROFILE){
 if(!exact(payload,['v','items',...(request.spatial&&record(payload)&&Object.hasOwn(payload,'spatial')?['spatial']:[]),...(request.scene&&record(payload)&&Object.hasOwn(payload,'scene')?['scene']:[])])||payload.v!==3||!Array.isArray(payload.items)||payload.items.length>512)return invalid();
 const lean=profile===LEAN_TERRA_PROFILE,kinds=compactTerraKinds(request,definition,profile);
 // A row that breaks the contract becomes null, which the literal decoder drops and records.
 return payload.items.map((raw:unknown)=>{try{
  if(!exact(raw,[...(lean?['k','b','f','q','u','a','x']:['k','b','f','q','u','a']).filter(k=>k!=='b'||request.readMode!=='values'&&request.readMode!=='cells'),...(request.readingTarget?.mode==='public-scene'&&record(raw)&&Object.hasOwn(raw,'ar')?['ar']:[])])||!Number.isSafeInteger(raw.k)||typeof raw.k!=='number'||!kinds[raw.k]||raw.q!==null&&(!Number.isSafeInteger(raw.q)||(raw.q as number)<0)||!Array.isArray(raw.a))return invalid();
  const kind=kinds[raw.k],face=code(faces,raw.f),physicalUnit=code(units,raw.u),b=request.readMode==='values'||request.readMode==='cells'?null:raw.b;
  const badBox=b!==null&&(!Array.isArray(b)||b.length!==4||!b.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1000)||b[0]>=b[2]||b[1]>=b[3]);if(badBox&&!lean)return invalid();
  if(raw.a.length>kind.properties.length)return invalid();
  const seen=new Set<number>();
  const attributes=raw.a.map((row:unknown)=>{
   if(lean){
    if(!exact(row,['p','v'])||typeof row.p!=='number'||!Number.isSafeInteger(row.p)||!kind.properties[row.p]||seen.has(row.p)||typeof row.v!=='string')return invalid();
    seen.add(row.p);let literal:unknown;try{literal=JSON.parse(row.v);}catch{return invalid();}if(literal===null)return invalid();
    return {id:kind.properties[row.p].id,valueJson:row.v,unknownReason:null};
   }
   if(!exact(row,['p','v','r'])||typeof row.p!=='number'||!Number.isSafeInteger(row.p)||!kind.properties[row.p]||seen.has(row.p))return invalid();
   seen.add(row.p);const id=kind.properties[row.p].id;
   if(row.v===null)return {id,valueJson:null,unknownReason:code(reasons,row.r)};
   if(typeof row.v!=='string'||row.r!==null)return invalid();
   let literal:unknown;try{literal=JSON.parse(row.v);}catch{return invalid();}if(literal===null)return invalid();
   return {id,valueJson:row.v,unknownReason:null};
  });
  // A value row wins over the same code in x; x carries no reason, so it becomes the generic unreadable.
  if(lean){if(!Array.isArray(raw.x)||raw.x.some((c:unknown)=>typeof c!=='number'||!kind.properties[c]))return invalid();for(const c of new Set(raw.x as number[]))if(!seen.has(c))attributes.push({id:kind.properties[c].id,valueJson:null,unknownReason:'unreadable'});}
  if(lean){
   const component=definition.components.find(c=>c.id===kind.id)!,allowed=request.allowedPropertyIds[kind.id]??[];
   for(const p of component.properties){
    const from=allowed.includes(p.id)&&hostedVisibleProperty(component,p.id)?derivedFrom(component,p.id):null;
    if(from==='f'){if(face!=='unknown')attributes.push({id:p.id,valueJson:JSON.stringify(face),unknownReason:null});}
    else if(from==='q'){if(raw.q!==null)attributes.push({id:p.id,valueJson:JSON.stringify(raw.q),unknownReason:null});}
    else if(from){const source=attributes.find((a:{id:string})=>a.id===from);if(source)attributes.push({...source,id:p.id});}
   }
  }
  return {...(request.readingTarget?.mode==='public-scene'?{sourceAreaId:raw.ar??null}:{}),kind:kind.id,box_1000:badBox?'invalid':b===null?null:{ymin:(b as number[])[0],xmin:(b as number[])[1],ymax:(b as number[])[2],xmax:(b as number[])[3]},face,quantity:raw.q,physicalUnit,attributes};
 }catch{return null;}});
}
