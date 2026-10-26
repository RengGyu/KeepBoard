import {OBSERVATION_VERSION,validateObservationResult,type ObservationRequest,type ObservationResult,type PhotoDefinition,type ObservationBox,type NativeNumeralWire} from '../../shared/lightweightRecognition';
import type {PhotoTransform} from '../../shared/photoGeometry';
export const QWEN_NUMBER_WIRE='qwen-number-grounding-v1' as const;
// Exact D2 wire; no game state, frame, panels or expected inventory is sent to the reader.
export const QWEN_NUMBER_PROMPT='Locate visible circular number tokens lying on the hexagonal terrain tiles in this photo. Return one item for each separately visible physical token, not one item per category. Read only the numeral printed on each token; use null when it is not legible. Ignore cards, dice, pip dots, table decorations and spare pieces. Do not infer any missing token, expected count, legal game value, owner or board slot. Return only a JSON object with an items array; each item has bbox_2d and text. bbox_2d is [left,top,right,bottom] in relative image coordinates from 0 to 1000, not pixels. Only include a token when its own box can be localized; an unreadable numeral may still have a box. text must be the literal digit string or JSON null, never an explanation. An empty items array is allowed.';
export const QWEN_NUMBER_SCHEMA={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{bbox_2d:{type:'array',items:{type:'integer',minimum:0,maximum:1000},minItems:4,maxItems:4},text:{anyOf:[{type:'string',pattern:'^[0-9]{1,2}$'},{type:'null'}]}},required:['bbox_2d','text'],additionalProperties:false}}},required:['items'],additionalProperties:false};
function exact(value:unknown,keys:string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw Error('Invalid '+QWEN_NUMBER_WIRE+' shape');return value as Record<string,unknown>;}
export function qwenNumberGrounding(raw:unknown,request:ObservationRequest,definition:PhotoDefinition,transforms:PhotoTransform[]=[]){
 if(request.gameId!=='catan'||request.packId!=='catan-base'||request.areaId!=='board'||request.scope.partition!=='common_public'||request.scope.ownerId!==null||request.images.length!==1||!request.allowedComponents.includes('number-token'))throw Error('Numeral task requires Catan public board scope');
 const image=request.images[0],transform=image.transformId?transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256):undefined;
 if(image.transformId&&(!transform||!request.geometryFrameId||!transform.panels.length||transform.inputDimensions.width!==image.width||transform.inputDimensions.height!==image.height))throw Error('Pinned numeral atlas transform mismatch');
 const body=exact(raw,['items']);if(!Array.isArray(body.items)||body.items.length>512)throw Error('Invalid numeral items');
 const domain=definition.components.find(c=>c.id==='number-token')?.properties.find(f=>f.id==='number')?.options?.map(o=>o.value);if(!domain?.length)throw Error('Pinned numeral domain missing');
 const diagnostics:{ref:string;reason:'unreadable'|'out-of-domain'}[]=[],deferred:NativeNumeralWire['deferred']=[];
 const result:ObservationResult={version:OBSERVATION_VERSION,coverage:'partial',completion:'complete',observations:body.items.flatMap((value,index)=>{
  const item=exact(value,['bbox_2d','text']),b=item.bbox_2d;
  if(!Array.isArray(b)||b.length!==4||b.some(n=>typeof n!=='number'||!Number.isInteger(n)||n<0||n>1000)||b[0]>=b[2]||b[1]>=b[3])throw Error('Invalid native0..1000 xyxy bbox; no unit guessing or clamping');
  if(item.text!==null&&(typeof item.text!=='string'||!/^[0-9]{1,2}$/.test(item.text)))throw Error('Literal numeral must be digits or null');
  const ref='number-'+String(index+1).padStart(4,'0'),number=item.text===null?null:Number(item.text),valid=number!==null&&domain.includes(number);
  const bbox={x:b[0]/1000,y:b[1]/1000,width:(b[2]-b[0])/1000,height:(b[3]-b[1])/1000};let panelRef:string|null=null;
  if(transform){const panels=transform.panels.filter(p=>{const r=p.inputRectangle;return bbox.x>=r.x&&bbox.y>=r.y&&bbox.x+bbox.width<=r.x+r.width+1e-10&&bbox.y+bbox.height<=r.y+r.height+1e-10;});if(panels.length!==1){deferred.push({ref,reason:panels.length?'multiple-panels':'outside-single-panel'});return [];}panelRef=panels[0].panelRef;}
  if(!valid)diagnostics.push({ref,reason:item.text===null?'unreadable':'out-of-domain'});
  return [{ref,imageIndex:0,panelRef,componentId:'number-token',bbox,face:valid?'front':'unknown',quantity:1,rotationDegrees:null,properties:{number:valid?{state:'observed',value:number}:{state:'unknown',value:null,reason:item.text===null?'unreadable':'unsupported'}},referenceCandidates:[]}];
 })};
 const nativeWire:NativeNumeralWire={id:QWEN_NUMBER_WIRE,result:structuredClone(raw) as NativeNumeralWire['result'],deferred};
 return {result:validateObservationResult(result,request,definition,transforms),diagnostics,deferred,nativeWire};
}
export interface NumberGT {id:string;center:{x:number;y:number};number:number}
export interface NumberPrediction {bbox:ObservationBox;number:number|null}
/** Strict reciprocal center containment, independent of predicted/expected values. No nearest-value assignment. */
export function scoreNumberGrounding(gt:NumberGT[],predictions:NumberPrediction[]){
 const contains=(p:NumberPrediction,g:NumberGT)=>g.center.x>=p.bbox.x&&g.center.x<=p.bbox.x+p.bbox.width&&g.center.y>=p.bbox.y&&g.center.y<=p.bbox.y+p.bbox.height;
 const hits=predictions.map(p=>gt.map((g,i)=>contains(p,g)?i:-1).filter(i=>i>=0));
 const rows=gt.map((g,index)=>{const matches=hits.map((h,i)=>h.includes(index)?i:-1).filter(i=>i>=0),state=matches.length===0?'missing':matches.length!==1||hits[matches[0]].length!==1?'ambiguous':predictions[matches[0]].number===null?'unknown':predictions[matches[0]].number===g.number?'correct':'wrong';return {id:g.id,state,predictionIndices:matches};});
 return {denominator:gt.length,predictions:predictions.length,correct:rows.filter(r=>r.state==='correct').length,wrong:rows.filter(r=>r.state==='wrong').length,unknown:rows.filter(r=>r.state==='unknown').length,missing:rows.filter(r=>r.state==='missing').length,ambiguous:rows.filter(r=>r.state==='ambiguous').length,rows,extras:hits.flatMap((h,i)=>h.length?[]:[{predictionIndex:i,classification:'UNKNOWN' as const,reason:'No frozen island-token center; requires direct source review'}])};
}
