import type {ObservationRequest,PhotoDefinition} from '../../shared/lightweightRecognition';
import {validateDetailValue} from '../../shared/readouts/registry';
export const DETAIL_TERRA_PROFILE='literal-named-detail-unit-original-v4' as const;
/** Describes value syntax from the runtime property types, never from a game's expected answers. */
export function terraDetailInstructions(request:ObservationRequest,definition:PhotoDefinition):string{
 const formats={integer:'JSON integer',boolean:'JSON boolean',text:'JSON string',enum:'one of the listed option values',marks:'JSON array of {"symbol":string,"value":nonnegative integer or null}; distinct symbols, at most 32 rows; not a symbol-to-value object',features:'JSON array of {"id":string,"kind":"city"|"road"|"field"|"monastery"|"other"|null,"label":string,"x":number|null,"y":number|null}; x/y are both null or both in 0..1; unique ids, at most 32 rows',reference:'JSON object {"pieceId":string,"featureId":string|null}',player:'not observable'};
 const contracts=definition.components.filter(c=>request.allowedComponents.includes(c.id)).flatMap(c=>c.properties.filter(p=>request.allowedPropertyIds[c.id]?.includes(p.id)&&p.acquisition==='visible'&&!c.manualPropertyIds.includes(p.id)&&p.type!=='player').map(p=>({kind:c.id,property:p.id,format:formats[p.type]})));
 return '\nBefore finalizing each object, inspect its own visible face and orientation. Read small symbols by counting individual visible marks rather than matching a familiar overall pattern. For a visible grid-based shape, trace the occupied cells row by row and include that row pattern in its shape text; do not infer covered cells, expected shape names, stock counts or values from game rules. If detail cannot be resolved, keep the object and report unknown rather than a confident approximation.\nEach observed valueJson must encode the following property-specific JSON format exactly once (unknown stays actual null): '+contracts.map(c=>JSON.stringify(c.kind)+'.'+JSON.stringify(c.property)+': '+c.format).join('; ');
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Lossless syntactic normalization only. No string-number coercion, missing entries, inferred zeros or game-specific keys. */
export function normalizeTerraDetailItems(items:any[],request:ObservationRequest,definition:PhotoDefinition):any[]{
 return items.map(item=>{
  if(!object(item)||!Array.isArray(item.attributes)||typeof item.kind!=='string')return item;
  const component=definition.components.find(c=>c.id===item.kind);
  return {...item,attributes:item.attributes.map(a=>{
   if(!object(a)||typeof a.id!=='string'||typeof a.valueJson!=='string'||a.unknownReason!==null)return a;
   const field=component?.properties.find(p=>p.id===a.id);
   if(field?.type!=='marks'||field.acquisition!=='visible'||!request.allowedPropertyIds[item.kind as string]?.includes(field.id))return a;
   let v:unknown;try{v=JSON.parse(a.valueJson);}catch{return a;}
   if(!object(v))return a;
   const marks=Object.entries(v).map(([symbol,value])=>({symbol,value}));
   try{validateDetailValue(marks,field);}catch{return a;}
   return {...a,valueJson:JSON.stringify(marks)};
  })};
 });
}
