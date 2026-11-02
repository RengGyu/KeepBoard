// Named box contract for Terra: {ymin,xmin,ymax,xmax}. Converted mechanically to the decoder's [ymin,xmin,ymax,xmax].
// No reordering, sorting, clamping or inference: an invalid named box stays invalid and the decoder rejects it.
export const OLD_BOX_SENTENCE='Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when uncertain.';
export const NEW_BOX_SENTENCE='Box each whole object as box_1000 = {"ymin":…, "xmin":…, "ymax":…, "xmax":…} in coordinates 0..1000 with ymin<ymax and xmin<xmax, or null when uncertain.';
const coord={type:'number',minimum:0,maximum:1000};
export const NAMED_BOX_SCHEMA={anyOf:[{type:'object',properties:{ymin:coord,xmin:coord,ymax:coord,xmax:coord},required:['ymin','xmin','ymax','xmax'],additionalProperties:false},{type:'null'}]};
/** Same schema except items.box_1000. Throws if the frozen schema shape is not the expected one. */
export function withNamedBox(schema:any){
 const s=structuredClone(schema),item=s?.properties?.items?.items;
 if(!item?.properties?.box_1000||JSON.stringify(item.properties.box_1000.type)!==JSON.stringify(['array','null']))throw new Error('Unexpected frozen schema');
 item.properties.box_1000=NAMED_BOX_SCHEMA;return s;
}
export function withNamedBoxPrompt(prompt:string){
 if(prompt.split(OLD_BOX_SENTENCE).length!==2)throw new Error('Frozen box sentence not found exactly once');
 return prompt.replace(OLD_BOX_SENTENCE,NEW_BOX_SENTENCE);
}
const KEYS=['ymin','xmin','ymax','xmax'] as const;
/** Returns decoder wire items plus a contract report. Non-conforming boxes are passed through unchanged so the decoder rejects them. */
export function namedToDecoderItems(items:any[]){
 let named=0,nulls=0,malformed=0,orderViolations=0;
 const out=items.map(i=>{
  const b=i?.box_1000;
  if(b===null){nulls++;return i;}
  if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==4||!KEYS.every(k=>typeof b[k]==='number')){malformed++;return i;}
  named++;if(!(b.ymin<b.ymax&&b.xmin<b.xmax))orderViolations++;
  return {...i,box_1000:KEYS.map(k=>b[k])};
 });
 return {items:out,report:{named,nulls,malformed,orderViolations}};
}
