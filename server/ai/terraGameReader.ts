import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import type {ObservationRequest,PhotoDefinition,TerraReaderIdentity,HostedObservationWire,PhysicalUnitClaim} from '../../shared/lightweightRecognition';
import type {Evidence,GamePack,Session} from '../../shared/types';
import type {PhotoTransform} from '../../shared/photoGeometry';
import {buildGeminiGameBody,decodeLiteralObservationPayload} from './geminiGameReader';
import {catanScenePrompt,catanSceneResponseSchema,decodeCatanScenePayload} from './catanSceneReading';
import {parseModelJSON} from './response';
import {COMPACT_TERRA_PROFILE,compactTerraContract,expandCompactTerraPayload} from './terraCompact';
import {DETAIL_TERRA_PROFILE,terraDetailInstructions,normalizeTerraDetailItems} from './terraDetail';
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const TERRA_FILL_SENTENCE='For every returned object, include exactly one attribute row for each listed property of its kind; when a property is not visible use valueJson null with its reason, and when two listed properties describe the same visible fact, fill both.';
export const TERRA_IDENTITY:TerraReaderIdentity={kind:'terra-game-observation-v1',model:'gpt-6.1-terra',api:'responses',reasoningEffort:'low',imageDetail:'high',maxOutputTokens:32768,adapterVersion:'literal-named-fill-unit-marks-v5',automaticRetries:0,timeoutMs:240000};
function validateProfile(profile:unknown):asserts profile is TerraReaderIdentity['adapterVersion']{if(!['literal-named-fill-original-v1','literal-named-fill-unit-original-v2',COMPACT_TERRA_PROFILE,DETAIL_TERRA_PROFILE,'literal-named-fill-unit-marks-v5'].includes(profile as string))throw Error('지원하지 않는 Terra adapter profile입니다.');}
/** Only changes JSON Schema representation. Optional fields become required nullable, never disappear. */
export function strictTerraSchema(raw:any):any{
 if(Array.isArray(raw))return raw.map(strictTerraSchema);if(!object(raw))return raw;
 const out=Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,strictTerraSchema(v)]));
 if(object(out.properties)){
  const required=Array.isArray(raw.required)?raw.required:[];
  for(const [id,field]of Object.entries(out.properties))if(!required.includes(id)){
   const p=field as any;
   if(p.type){p.type=[...new Set([...(Array.isArray(p.type)?p.type:[p.type]),'null'])];if(Array.isArray(p.enum)&&!p.enum.includes(null))p.enum.push(null);}
   else out.properties[id]={anyOf:[p,{type:'null'}]};
  }
  out.required=Object.keys(out.properties);out.additionalProperties=false;
 }
 return out;
}
function body(prompt:string,schema:unknown,image:Buffer,mimeType:string){return {model:TERRA_IDENTITY.model,store:false,service_tier:'default',max_output_tokens:32768,reasoning:{effort:'low'},input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:`data:${mimeType};base64,${image.toString('base64')}`,detail:'high'}]}],text:{format:{type:'json_schema',name:'game_observation',strict:true,schema}}};}
export function buildTerraGameBody(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,profile:TerraReaderIdentity['adapterVersion']=TERRA_IDENTITY.adapterVersion){
 validateProfile(profile);
 const original=buildGeminiGameBody(request,definition,image,mimeType);
 if(profile===COMPACT_TERRA_PROFILE){const compact=compactTerraContract(request,definition,original.contents[0].parts[0].text!);return body(compact.prompt,compact.schema,image,mimeType);}
 let prompt=original.contents[0].parts[0].text!.replace('Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when uncertain.','Box each whole object as box_1000 = {"ymin":…, "xmin":…, "ymax":…, "xmax":…} in coordinates 0..1000 with ymin<ymax and xmin<xmax, or null when uncertain.').replace(' Include no manual properties.',' '+TERRA_FILL_SENTENCE+' Include no manual properties.');
 const schema:any=structuredClone(original.generationConfig.responseFormat.text.schema),coordinate={type:'number',minimum:0,maximum:1000};
 schema.properties.items.items.properties.box_1000={anyOf:[{type:'object',properties:{ymin:coordinate,xmin:coordinate,ymax:coordinate,xmax:coordinate},required:['ymin','xmin','ymax','xmax'],additionalProperties:false},{type:'null'}]};
 if(profile==='literal-named-fill-unit-original-v2'||profile===DETAIL_TERRA_PROFILE||profile==='literal-named-fill-unit-marks-v5'){
  prompt+='\nFor each returned row, report physicalUnit as single when it is one distinguishable physical object, group when the box describes several objects as an inseparable aggregate, or unknown when that distinction cannot be observed. This is separate from physical quantity: do not invent a count for a single or group, and do not split a group using expected inventory. A group can have quantity null. Preserve individually distinguishable neighboring objects separately.';
  schema.properties.items.items.properties.physicalUnit={type:'string',enum:['single','group','unknown']};schema.properties.items.items.required.push('physicalUnit');
 }
 if(profile===DETAIL_TERRA_PROFILE)prompt+=terraDetailInstructions(request,definition);
 return body(prompt,schema,image,mimeType);
}
export function terraResponsePayload(native:unknown):unknown{
 if(!object(native)||native.status!=='completed'||native.error||native.incomplete_details||!Array.isArray(native.output))throw Error('Terra 응답이 완료되지 않았습니다. 원본은 유지됩니다.');
 const messages=native.output.filter((m:any)=>m?.type==='message');
 if(!messages.length||messages.some((m:any)=>m.status&&m.status!=='completed'||!Array.isArray(m.content)||!m.content.length||m.content.some((p:any)=>p?.type!=='output_text'||typeof p.text!=='string')))throw Error('Terra 응답에 판독 결과가 없거나 거절되었습니다. 원본은 유지됩니다.');
 return parseModelJSON(messages.flatMap((m:any)=>m.content).map((p:any)=>p.text).join(''));
}
export function decodeTerraGameObservation(native:unknown,request:ObservationRequest,definition:PhotoDefinition,transforms:PhotoTransform[]=[],profile?:TerraReaderIdentity['adapterVersion']){
 if(profile!==undefined)validateProfile(profile);
 const payload=terraResponsePayload(native),compact=profile===COMPACT_TERRA_PROFILE;
 const sourceItems=compact?expandCompactTerraPayload(payload,request,definition):(()=>{if(!object(payload)||!Array.isArray(payload.items)||Object.keys(payload).length!==1)throw Error('Terra 관측 형식을 확인하세요.');return payload.items;})();
 const physicalUnits:Record<string,PhysicalUnitClaim>={},unitDeferred:HostedObservationWire['deferred']=[];let version2=false;
 const decodingItems=(profile===DETAIL_TERRA_PROFILE||profile==='literal-named-fill-unit-marks-v5')?normalizeTerraDetailItems(sourceItems,request,definition):sourceItems;
 const items=decodingItems.map((source:any,index:number)=>{
  if(!object(source))throw Error('Terra 실물 형식을 확인하세요.');
  const {physicalUnit,...item}=source;const ref='item-'+(index+1);
  if(Object.hasOwn(source,'physicalUnit')){if(!['single','group','unknown'].includes(physicalUnit))throw Error('Terra 실물 단위를 확인하세요.');version2=true;}
  physicalUnits[ref]=physicalUnit??'unknown';
  if(physicalUnit==='single'&&item.quantity!==null&&item.quantity!==1){physicalUnits[ref]='unknown';unitDeferred.push({ref,property:'physicalUnit',reason:'single-quantity-conflict'});}
  if(!object(item))throw Error('Terra 실물 형식을 확인하세요.');const b=item.box_1000;
  if(b===null)return item;
  if(!object(b)||Object.keys(b).length!==4||!['ymin','xmin','ymax','xmax'].every(k=>typeof b[k]==='number'))throw Error('Terra 명명 좌표 형식을 확인하세요.');
  return {...item,box_1000:[b.ymin,b.xmin,b.ymax,b.xmax]};
 });
 const trace:HostedObservationWire={id:'terra-game-wire-v1',items:[],deferred:[],providerResponse:structuredClone(native)};
 const raw=decodeLiteralObservationPayload({items},request,definition,trace,transforms);
 trace.items=structuredClone(sourceItems);if(version2||compact){trace.id=compact?'terra-game-wire-v3':'terra-game-wire-v2';trace.physicalUnits=physicalUnits;trace.deferred.push(...unitDeferred);}return {raw,hostedWire:trace};
}
export function extractOpenAIKey(value:string):string{
 const source=value.trim().replace(/^\ufeff/,'' );let token:unknown=source;
 if(source.startsWith('{')){let parsed:unknown;try{parsed=JSON.parse(source);}catch{throw Error('OpenAI 인증 형식을 확인하세요.');}if(!object(parsed)||Object.keys(parsed).length!==1||!['OPENAI_API_KEY','api_key','apiKey'].includes(Object.keys(parsed)[0]))throw Error('OpenAI 인증 형식을 확인하세요.');token=Object.values(parsed)[0];}
 else{const named=source.match(/^([^:=\n]+)\s*[:=\n]\s*([^\n]+)$/);if(named){if(!['OPENAI','OPENAIKEY','OPENAIAPI','OPENAIAPIKEY'].includes(named[1].replace(/[ _-]/g,'').toUpperCase()))throw Error('OpenAI 인증 형식을 확인하세요.');token=named[2].trim();}}
 if(typeof token==='string'&&['"',"'",'`'].includes(token[0])&&token.at(-1)===token[0])token=token.slice(1,-1);
 if(typeof token!=='string'||!/^sk-[A-Za-z0-9_-]{16,}$/.test(token))throw Error('OpenAI 인증 형식을 확인하세요.');return token;
}
async function configuredKey(){const file=process.env.KEEPBOARD_OPENAI_API_KEY_FILE;return extractOpenAIKey(file?await readFile(file,'utf8'):process.env.OPENAI_API_KEY??'');}
export class TerraGameReader{
 readonly identity:TerraReaderIdentity;
 constructor(private readonly config:{key?:()=>Promise<string>;fetch?:typeof fetch;profile?:TerraReaderIdentity['adapterVersion']}={}){if(config.profile!==undefined)validateProfile(config.profile);this.identity={...TERRA_IDENTITY,...(config.profile?{adapterVersion:config.profile}:{})};}
 async status(){let available=!!this.config.key||!!process.env.OPENAI_API_KEY;const file=process.env.KEEPBOARD_OPENAI_API_KEY_FILE;if(file&&!this.config.key){try{available=(await stat(file)).isFile();}catch{available=false;}}return {kind:this.identity.kind,available,cloudSupported:true as const,identity:available?this.identity:null,...(!available?{reason:'서버에 Terra 게임 사진 판독용 키가 연결되지 않았습니다.'}:{})};}
 private async invoke(request:ObservationRequest,image:Buffer,mimeType:string,requestBody:unknown){
  if(request.images.length!==1||createHash('sha256').update(image).digest('hex')!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw Error('고정한 원본 사진을 확인하세요.');
  const key=await (this.config.key??configuredKey)(),start=performance.now();
  const response=await (this.config.fetch??fetch)('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(requestBody),signal:AbortSignal.timeout(this.identity.timeoutMs),redirect:'error'});
  if(!response.ok)throw Error(`Terra 판독 요청이 실패했습니다 (${response.status}). 원본과 기존 기록은 유지됩니다.`);
  const native:unknown=await response.json();if(object(native)&&native.model!==this.identity.model)throw Error('고정한 Terra 모델과 응답이 다릅니다.');
  return {native,timings:{readerMs:performance.now()-start}};
 }
 async read(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,transforms:PhotoTransform[]=[]){const read=await this.invoke(request,image,mimeType,buildTerraGameBody(request,definition,image,mimeType,this.identity.adapterVersion));return {...decodeTerraGameObservation(read.native,request,definition,transforms,this.identity.adapterVersion),timings:read.timings};}
 async readCatanScene(request:ObservationRequest,definition:PhotoDefinition,session:Session,pack:GamePack,evidence:Evidence[],image:Buffer,mimeType:string){
  const read=await this.invoke(request,image,mimeType,body(catanScenePrompt(session,pack,evidence),strictTerraSchema(catanSceneResponseSchema(evidence)),image,mimeType));
  return {result:decodeCatanScenePayload(terraResponsePayload(read.native),{request,definition,session,pack,evidence,reader:this.identity,sourceImageSHA:request.images[0].sha256},'terra-catan-scene-wire-v1',read.native),timings:read.timings};
 }
}
