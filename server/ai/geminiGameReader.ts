import type {Session,GamePack,Evidence} from '../../shared/types';
import {catanScenePrompt,catanSceneResponseSchema,decodeCatanSceneReading} from './catanSceneReading';
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import type {GeminiReaderIdentity,HostedObservationWire,ObservationRequest,ObservationResult,PhotoDefinition,PhotoComponentDefinition,ObservationUnknownReason} from '../../shared/lightweightRecognition';
import {OBSERVATION_VERSION,validateObservationResult} from '../../shared/lightweightRecognition';
import {validateDetailValue} from '../../shared/readouts/registry';
import {bareVisibleText} from './bareVisibleText';

const MODEL='gemini-3.8-flash';
const reasons=['unreadable','occluded','out-of-frame','not-present-unconfirmed','wrong-face','ambiguous','unsupported'] as const;
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const invalid=():never=>{throw new Error('Gemini 관측 형식·범위를 확인할 수 없습니다. 원본과 기존 기록은 유지됩니다.');};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[]):v is Record<string,any>=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export const hostedVisibleProperty=(component:PhotoComponentDefinition,id:string)=>{const p=component.properties.find(p=>p.id===id);return !!p&&p.acquisition==='visible'&&p.type!=='player'&&!component.manualPropertyIds.includes(id)&&!/(owner|player|role|turn|hidden|secret)/i.test(id);};

export function buildGeminiGameBody(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string){
 const components=definition.components.filter(c=>request.allowedComponents.includes(c.id)).map(c=>({id:c.id,...(request.componentLabels?.[c.id]??{}),properties:c.properties.filter(p=>request.allowedPropertyIds[c.id]?.includes(p.id)&&hostedVisibleProperty(c,p.id)).map(p=>({id:p.id,label:p.label,type:p.type,...(p.min!==undefined?{min:p.min}:{}),...(p.max!==undefined?{max:p.max}:{}),...(p.options?{options:p.options.map(o=>o.value)}:{}),...(p.faceOnly?{frontOnly:true}:{})}))}));
 const terrainGuide=definition.nativeBridge==='catan'&&request.areaId==='board'&&request.allowedComponents.includes('terrain')?'For this Catan board, terrain means each visible hexagonal land region, including printed regions as well as separate tiles. Observe its visible terrain illustration independently of any number disc or playing piece on it. A number-token is the disc on a land region, not a replacement for that terrain observation. Do not infer hidden terrain or an expected count.\n':'';
 const prompt=`Observe this ${request.gameId} photograph, selected area ${request.areaId} (${request.scope.partition}). The allowed physical kinds and their own visible properties are ${JSON.stringify(components)}. Use each component's name and physicalType to interpret its id; the output kind is that id, not physicalType.
${terrainGuide}First inspect the whole photographed area for physical objects of EACH allowed kind, including small, overlapping and edge objects. Movable pieces, tokens, tiles and cards are distinct from the printed board and its illustrations. Return their visible presence and boxes even when their names, numbers or colours cannot be read. A board-only result must not replace pieces visibly lying on it. Do not invent missing kinds or expected inventory.
Then read only the listed properties belonging to that object's kind. Keep a visible value even if other properties are unreadable. Unknown, absent-unconfirmed or occluded properties use valueJson:null with the matching reason; an unreadable label must not remove the physical object. Use each listed property's type: integer values are JSON numbers; text values are JSON strings, including printed digits and ranges. Booleans are JSON booleans. Unknown uses actual null, never the string "null". No attribute may use another kind's property.
Use no owner, turn, role, hidden face, board slot, rules inference, or off-area information. A colour alone does not prove an owner. Read face-only properties only when the front is visible. A printed number is a property, not the physical quantity. One row is one physical object; if a visible inseparable group is returned, quantity is its visible count or null when uncountable, never 1 just because it is one box. Do not guess a total or game state. Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when uncertain. Each attribute has id, valueJson (a JSON literal encoded as a string for an observed value, otherwise null), and unknownReason (null for observed, otherwise unreadable/occluded/out-of-frame/not-present-unconfirmed/wrong-face/ambiguous/unsupported). Include no manual properties. Return only JSON {"items":[...]}; an empty list is valid when no allowed physical objects can be identified.`;
 // Keep the proven flat wire schema; component-specific alternatives were rejected by the live endpoint.
 const ids=[...new Set(components.flatMap(c=>c.properties.map(p=>p.id)))];
 const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{kind:{type:'string',enum:components.map(c=>c.id)},box_1000:{type:['array','null'],items:{type:'number',minimum:0,maximum:1000},minItems:4,maxItems:4},face:{type:'string',enum:['front','back','unknown']},quantity:{type:['integer','null'],minimum:0},attributes:{type:'array',items:{type:'object',properties:{id:ids.length?{type:'string',enum:ids}:{type:'string'},valueJson:{type:['string','null']},unknownReason:{type:['string','null'],enum:[...reasons,null]}},required:['id','valueJson','unknownReason'],additionalProperties:false}}},required:['kind','box_1000','face','quantity','attributes'],additionalProperties:false}}},required:['items'],additionalProperties:false};
 return {contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:image.toString('base64')}}]}],generationConfig:{candidateCount:1,maxOutputTokens:32768,thinkingConfig:{thinkingLevel:'LOW'},mediaResolution:'MEDIA_RESOLUTION_HIGH',responseFormat:{text:{mimeType:'APPLICATION_JSON',schema}}}};
}

export function decodeGeminiGameObservation(native:unknown,request:ObservationRequest,definition:PhotoDefinition,trace?:HostedObservationWire,transforms:import('../../shared/photoGeometry').PhotoTransform[]=[]):ObservationResult{
 if(!record(native)||!Array.isArray(native.candidates)||native.candidates.length!==1||native.promptFeedback&&record(native.promptFeedback)&&native.promptFeedback.blockReason)throw new Error('Gemini 응답이 완료되지 않았거나 잘렸습니다. 원본은 유지됩니다.');
 const candidate=native.candidates[0];if(!record(candidate)||candidate.finishReason!=='STOP'||!record(candidate.content)||!Array.isArray(candidate.content.parts))throw new Error('Gemini 응답이 완료되지 않았거나 잘렸습니다. 원본은 유지됩니다.');
 const parts=candidate.content.parts;if(!parts.length||parts.some((p:unknown)=>!record(p)||p.thought===true||typeof p.text!=='string'))return invalid();
 let wire:unknown;try{wire=JSON.parse(parts.map((p:{text:string})=>p.text).join(''));}catch{return invalid();}
 return decodeLiteralObservationPayload(wire,request,definition,trace,transforms);
}

/** Provider-neutral visible payload decoder; envelopes remain the adapter's responsibility. */
export function decodeLiteralObservationPayload(wire:unknown,request:ObservationRequest,definition:PhotoDefinition,trace?:HostedObservationWire,transforms:import('../../shared/photoGeometry').PhotoTransform[]=[]):ObservationResult{
 if(!exact(wire,['items'])||!Array.isArray(wire.items)||wire.items.length>512)return invalid();
 const deferred:HostedObservationWire['deferred']=[];
 // One row that breaks the contract costs only that row; the rest of a paid response is kept and the loss recorded.
 const dropRow=(index:number)=>{deferred.push({ref:'item-'+(index+1),property:'row',reason:'invalid-row'});return null;};
 const observations=wire.items.map((raw:unknown,index:number)=>{
  if(!exact(raw,['kind','box_1000','face','quantity','attributes'])||typeof raw.kind!=='string'||!request.allowedComponents.includes(raw.kind)||!['front','back','unknown'].includes(raw.face as string)||raw.quantity!==null&&(!Number.isSafeInteger(raw.quantity)||(raw.quantity as number)<0)||!Array.isArray(raw.attributes))return dropRow(index);
  const component=definition.components.find(c=>c.id===raw.kind)!;
  const properties:ObservationResult['observations'][number]['properties']={},seen=new Set<string>();
  const unknown=(id:string,reason:ObservationUnknownReason)=>{properties[id]={state:'unknown',value:null,reason};};
  const defer=(id:string,reason:string)=>deferred.push({ref:'item-'+(index+1),property:id,reason});
  for(const a of raw.attributes){
   if(!exact(a,['id','valueJson','unknownReason'])||typeof a.id!=='string'||seen.has(a.id))return dropRow(index);
   seen.add(a.id);
   if(!request.allowedPropertyIds[raw.kind]?.includes(a.id)||!hostedVisibleProperty(component,a.id)){
    const visibleElsewhere=definition.components.some(c=>request.allowedComponents.includes(c.id)&&request.allowedPropertyIds[c.id]?.includes(a.id)&&hostedVisibleProperty(c,a.id));
    if(!visibleElsewhere)return invalid();
    defer(a.id,'property-belongs-to-another-component');continue;
   }
   const field=component.properties.find(p=>p.id===a.id)!;
   if(a.valueJson===null){
    if(reasons.includes(a.unknownReason as ObservationUnknownReason))unknown(a.id,a.unknownReason as ObservationUnknownReason);
    else {unknown(a.id,'unreadable');defer(a.id,'unknown-value-encoding');}
   }
   else {
    if(typeof a.valueJson!=='string'){unknown(a.id,'unreadable');defer(a.id,'invalid-json-literal');continue;}
    let value:unknown;try{value=JSON.parse(a.valueJson);}catch{
     const text=field.type==='text'&&a.unknownReason===null?bareVisibleText(a.valueJson):undefined;
     if(text===undefined){unknown(a.id,'unreadable');defer(a.id,'invalid-json-literal');continue;}
     value=text;
    }
    if(value===null||a.unknownReason!==null){unknown(a.id,reasons.includes(a.unknownReason as ObservationUnknownReason)?a.unknownReason as ObservationUnknownReason:'unreadable');defer(a.id,'unknown-value-encoding');continue;}
    if(field.faceOnly&&raw.face!=='front'){unknown(a.id,'wrong-face');defer(a.id,'front-not-visible');continue;}
    if(field.type==='text'&&field.literalNumberText===true&&typeof value==='number'&&Number.isSafeInteger(value))value=String(value);
    try{validateDetailValue(value,field);if(field.options&&field.type!=='marks'&&!field.options.some(o=>o.value===value))throw Error();
     if(a.id==='face'&&value!==raw.face||a.id==='quantity'&&value!==raw.quantity)throw Error();
     properties[a.id]={state:'observed',value:value as never};
    }catch{unknown(a.id,'unreadable');defer(a.id,'invalid-visible-value');}
   }
  }
  for(const field of component.properties)if(request.allowedPropertyIds[component.id]?.includes(field.id)&&hostedVisibleProperty(component,field.id)&&!Object.hasOwn(properties,field.id))unknown(field.id,field.faceOnly&&raw.face!=='front'?'wrong-face':'not-present-unconfirmed');
  let bbox:null|{x:number;y:number;width:number;height:number}=null;
  if(raw.box_1000!==null){const b=raw.box_1000;if(!Array.isArray(b)||b.length!==4||b.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000)||b[0]>=b[2]||b[1]>=b[3])defer('box_1000','invalid-box-geometry');else bbox={x:b[1]/1000,y:b[0]/1000,width:(b[3]-b[1])/1000,height:(b[2]-b[0])/1000};}
  return {ref:'item-'+(index+1),imageIndex:0,panelRef:null,componentId:raw.kind,bbox,face:raw.face as 'front'|'back'|'unknown',quantity:raw.quantity as number|null,rotationDegrees:null,properties,referenceCandidates:[]};
 }).filter(o=>o!==null);
 if(wire.items.length&&!observations.length)return invalid();
 const result=validateObservationResult({version:OBSERVATION_VERSION,observations,coverage:'partial',completion:'complete'},request,definition,transforms);
 if(trace){trace.items=structuredClone(wire.items);trace.deferred=deferred;}
 return result;
}

export function extractGeminiKey(value:string):string{
 const source=value.trim().replace(/^\ufeff/,'');
 let token:unknown=source;
 if(source.startsWith('{')){
  let parsed:unknown;try{parsed=JSON.parse(source);}catch{return invalid();}
  if(!record(parsed)||Object.keys(parsed).length!==1)return invalid();
  const key=Object.keys(parsed)[0];if(!['GEMINI_API_KEY','api_key','apiKey'].includes(key))return invalid();
  token=parsed[key];
 }else{
  const named=source.match(/^([^:=\n]+)\s*[:=\n]\s*([^\n]+)$/);
  if(named){
   const label=named[1].replace(/[ _-]/g,'').toUpperCase();
   if(!['GEMINI','GEMINIKEY','GEMINIAPI','GEMINIAPIKEY','GOOGLEAPIKEY'].includes(label))return invalid();
   token=named[2].trim();
  }
  if(typeof token==='string'&&token.length>1&&['"',"'",'`'].includes(token[0])&&token.at(-1)===token[0])token=token.slice(1,-1);
 }
 if(typeof token!=='string'||!/^[A-Za-z0-9._~-]{1,1024}$/.test(token))return invalid();
 return token;
}
export class GeminiGameReader{
 readonly identity:GeminiReaderIdentity={kind:'gemini-game-observation-v1',model:MODEL,thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768};
 async status(){const file=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;let available=!!process.env.GEMINI_API_KEY;if(file){try{available=(await stat(file)).isFile();}catch{available=false;}}
  return {kind:'gemini-game-observation-v1' as const,available,cloudSupported:true as const,identity:available?this.identity:null,...(!available?{reason:'서버에 Gemini 게임 사진 판독용 키가 연결되지 않았습니다.'}:{})};}
 async readCatanScene(request:ObservationRequest,definition:PhotoDefinition,session:Session,pack:GamePack,evidence:Evidence[],image:Buffer,mimeType:string){
  if(request.images.length!==1||sha(image)!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new Error('고정한 원본 사진을 확인하세요.');
  const file=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE,key=extractGeminiKey(file?await readFile(file,'utf8'):process.env.GEMINI_API_KEY??'');
  const body={contents:[{role:'user',parts:[{text:catanScenePrompt(session,pack,evidence)},{inlineData:{mimeType,data:image.toString('base64')}}]}],generationConfig:{candidateCount:1,maxOutputTokens:32768,thinkingConfig:{thinkingLevel:'LOW'},mediaResolution:'MEDIA_RESOLUTION_HIGH',responseFormat:{text:{mimeType:'APPLICATION_JSON',schema:catanSceneResponseSchema(evidence)}}}},start=performance.now();
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(180_000),redirect:'error'});
  if(!response.ok)throw new Error(`Gemini 판독 요청이 실패했습니다 (${response.status}). 원본과 기존 기록은 유지됩니다.`);
  const result=decodeCatanSceneReading(await response.json(),{request,definition,session,pack,evidence,reader:this.identity,sourceImageSHA:sha(image)});
  return {result,timings:{readerMs:performance.now()-start}};
 }
 async read(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,transforms:import('../../shared/photoGeometry').PhotoTransform[]=[],_onRows?:(count:number)=>void){
  if(request.images.length!==1||sha(image)!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new Error('고정한 원본 사진을 확인하세요.');
  const file=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE,key=extractGeminiKey(file?await readFile(file,'utf8'):process.env.GEMINI_API_KEY??'');
  const body=buildGeminiGameBody(request,definition,image,mimeType),start=performance.now();
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(180_000),redirect:'error'});
  if(!response.ok)throw new Error(`Gemini 판독 요청이 실패했습니다 (${response.status}). 원본과 기존 기록은 유지됩니다.`);
  const native=await response.json() as unknown,hostedWire:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]},raw=decodeGeminiGameObservation(native,request,definition,hostedWire,transforms);
  return {raw,hostedWire,timings:{readerMs:performance.now()-start}};
 }
}
