import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import type {HostedReaderIdentity,ObservationRequest,ObservationResult,PhotoDefinition,PhotoComponentDefinition,ObservationUnknownReason} from '../../shared/lightweightRecognition';
import {OBSERVATION_VERSION,validateObservationResult} from '../../shared/lightweightRecognition';

const MODEL='gemini-3.8-flash';
const reasons=['unreadable','occluded','out-of-frame','not-present-unconfirmed','wrong-face','ambiguous','unsupported'] as const;
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const invalid=():never=>{throw new Error('Gemini 관측 형식·범위를 확인할 수 없습니다. 원본과 기존 기록은 유지됩니다.');};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[]):v is Record<string,any>=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export const hostedVisibleProperty=(component:PhotoComponentDefinition,id:string)=>{const p=component.properties.find(p=>p.id===id);return !!p&&p.acquisition==='visible'&&p.type!=='player'&&!component.manualPropertyIds.includes(id)&&!/(owner|player|role|turn|hidden|secret)/i.test(id);};

export function buildGeminiGameBody(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string){
 const components=definition.components.filter(c=>request.allowedComponents.includes(c.id)).map(c=>({id:c.id,properties:c.properties.filter(p=>request.allowedPropertyIds[c.id]?.includes(p.id)&&hostedVisibleProperty(c,p.id)).map(p=>({id:p.id,label:p.label,type:p.type,...(p.options?{options:p.options.map(o=>o.value)}:{}),...(p.faceOnly?{frontOnly:true}:{})}))}));
 const ids=[...new Set(components.flatMap(c=>c.properties.map(p=>p.id)))];
 const prompt=`Read only separately visible physical objects in this ${request.gameId} photograph, area ${request.areaId} (${request.scope.partition}). Return individual objects, not totals or a guessed game state. The allowed components and visible properties are ${JSON.stringify(components)}. Use no owner, turn, role, hidden face, board slot, expected inventory, rules inference, or off-area information. A colour alone does not prove an owner. Unknown or occluded values are null with a reason; zero is a value, not unknown. One row is one physical object; quantity is 1 unless a physical group is visibly inseparable. Read face-only properties only when the front is visible. A printed number is a property of the physical number token, not a quantity or terrain property. Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when its location is uncertain. Each attribute has id, valueJson (a JSON literal encoded as a string for an observed value, otherwise null), and unknownReason (null for observed, otherwise unreadable/occluded/out-of-frame/not-present-unconfirmed/wrong-face/ambiguous/unsupported). Omit properties not visible in this photograph. Include no manual properties. Return only JSON {"items":[...]}; an empty list is valid.`;
 const schema={type:'object',properties:{items:{type:'array',items:{type:'object',properties:{kind:{type:'string',enum:request.allowedComponents},box_1000:{type:['array','null'],items:{type:'number',minimum:0,maximum:1000},minItems:4,maxItems:4},face:{type:'string',enum:['front','back','unknown']},quantity:{type:['integer','null'],minimum:0},attributes:{type:'array',items:{type:'object',properties:{id:{type:'string',enum:ids},valueJson:{type:['string','null']},unknownReason:{type:['string','null'],enum:[...reasons,null]}},required:['id','valueJson','unknownReason'],additionalProperties:false}}},required:['kind','box_1000','face','quantity','attributes'],additionalProperties:false}}},required:['items'],additionalProperties:false};
 return {contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:image.toString('base64')}}]}],generationConfig:{candidateCount:1,maxOutputTokens:32768,thinkingConfig:{thinkingLevel:'LOW'},mediaResolution:'MEDIA_RESOLUTION_HIGH',responseFormat:{text:{mimeType:'APPLICATION_JSON',schema}}}};
}

export function decodeGeminiGameObservation(native:unknown,request:ObservationRequest,definition:PhotoDefinition):ObservationResult{
 if(!record(native)||!Array.isArray(native.candidates)||native.candidates.length!==1||native.promptFeedback&&record(native.promptFeedback)&&native.promptFeedback.blockReason)throw new Error('Gemini 응답이 완료되지 않았거나 잘렸습니다. 원본은 유지됩니다.');
 const candidate=native.candidates[0];if(!record(candidate)||candidate.finishReason!=='STOP'||!record(candidate.content)||!Array.isArray(candidate.content.parts))throw new Error('Gemini 응답이 완료되지 않았거나 잘렸습니다. 원본은 유지됩니다.');
 const parts=candidate.content.parts;if(!parts.length||parts.some((p:unknown)=>!record(p)||p.thought===true||typeof p.text!=='string'))return invalid();
 let wire:unknown;try{wire=JSON.parse(parts.map((p:{text:string})=>p.text).join(''));}catch{return invalid();}
 if(!exact(wire,['items'])||!Array.isArray(wire.items)||wire.items.length>512)return invalid();
 const observations=wire.items.map((raw:unknown,index:number)=>{
  if(!exact(raw,['kind','box_1000','face','quantity','attributes'])||typeof raw.kind!=='string'||!request.allowedComponents.includes(raw.kind)||!['front','back','unknown'].includes(raw.face as string)||raw.quantity!==null&&(!Number.isSafeInteger(raw.quantity)||(raw.quantity as number)<0)||!Array.isArray(raw.attributes))return invalid();
  const component=definition.components.find(c=>c.id===raw.kind)!;
  const properties:ObservationResult['observations'][number]['properties']={};
  for(const a of raw.attributes){
   if(!exact(a,['id','valueJson','unknownReason'])||typeof a.id!=='string'||Object.hasOwn(properties,a.id)||!request.allowedPropertyIds[raw.kind]?.includes(a.id)||!hostedVisibleProperty(component,a.id))return invalid();
   if(a.valueJson===null){if(!reasons.includes(a.unknownReason as ObservationUnknownReason))return invalid();properties[a.id]={state:'unknown',value:null,reason:a.unknownReason as ObservationUnknownReason};}
   else {if(typeof a.valueJson!=='string'||a.unknownReason!==null)return invalid();let value:unknown;try{value=JSON.parse(a.valueJson);}catch{return invalid();}if(value===null)return invalid();properties[a.id]={state:'observed',value:value as never};}
  }
  let bbox:null|{x:number;y:number;width:number;height:number}=null;
  if(raw.box_1000!==null){const b=raw.box_1000;if(!Array.isArray(b)||b.length!==4||b.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000)||b[0]>=b[2]||b[1]>=b[3])return invalid();bbox={x:b[1]/1000,y:b[0]/1000,width:(b[3]-b[1])/1000,height:(b[2]-b[0])/1000};}
  return {ref:'item-'+(index+1),imageIndex:0,panelRef:null,componentId:raw.kind,bbox,face:raw.face,quantity:raw.quantity,rotationDegrees:null,properties,referenceCandidates:[]};
 });
 return validateObservationResult({version:OBSERVATION_VERSION,observations,coverage:'partial',completion:'complete'},request,definition);
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
 readonly identity:HostedReaderIdentity={kind:'gemini-game-observation-v1',model:MODEL,thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768};
 async status(){const file=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE;let available=!!process.env.GEMINI_API_KEY;if(file){try{available=(await stat(file)).isFile();}catch{available=false;}}
  return {kind:'gemini-game-observation-v1' as const,available,cloudSupported:true as const,identity:available?this.identity:null,...(!available?{reason:'서버에 Gemini 게임 사진 판독용 키가 연결되지 않았습니다.'}:{})};}
 async read(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string){
  if(request.images.length!==1||sha(image)!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new Error('고정한 원본 사진을 확인하세요.');
  const file=process.env.KEEPBOARD_GEMINI_GAME_API_KEY_FILE,key=extractGeminiKey(file?await readFile(file,'utf8'):process.env.GEMINI_API_KEY??'');
  const body=buildGeminiGameBody(request,definition,image,mimeType),start=performance.now();
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(180_000),redirect:'error'});
  if(!response.ok)throw new Error(`Gemini 판독 요청이 실패했습니다 (${response.status}). 원본과 기존 기록은 유지됩니다.`);
  const native=await response.json() as unknown,raw=decodeGeminiGameObservation(native,request,definition);
  return {raw,timings:{readerMs:performance.now()-start}};
 }
}
