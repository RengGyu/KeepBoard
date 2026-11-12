import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {setTimeout as wait} from 'node:timers/promises';
import type {ObservationRequest,PhotoDefinition,TerraReaderIdentity,LunaReaderIdentity,TerraHighReaderIdentity,HostedObservationWire,PhysicalUnitClaim,ObservationProgressCallback} from '../../shared/lightweightRecognition';
import type {Evidence,GamePack,Session} from '../../shared/types';
import type {PhotoTransform} from '../../shared/photoGeometry';
import {buildGeminiGameBody,decodeLiteralObservationPayload} from './geminiGameReader';
import {catanScenePrompt,catanSceneResponseSchema,decodeCatanScenePayload} from './catanSceneReading';
import {parseModelJSON} from './response';
import {COMPACT_TERRA_PROFILE,LEAN_TERRA_PROFILE,compactTerraContract,expandCompactTerraPayload} from './terraCompact';
import {DETAIL_TERRA_PROFILE,terraDetailInstructions,normalizeTerraDetailItems} from './terraDetail';
import {visibleUnitContract,type VisibleUnitOptions} from './visibleUnitContract';
import {usefulPreviewValues} from '../../shared/previewValues';
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const TERRA_FILL_SENTENCE='For every returned object, include exactly one attribute row for each listed property of its kind; when a property is not visible use valueJson null with its reason, and when two listed properties describe the same visible fact, fill both. Exception: omit front-only properties on an explicitly back-facing object; unknown face is not confirmed back.';
export const TERRA_IDENTITY:TerraReaderIdentity={kind:'terra-game-observation-v1',model:'gpt-6.1-terra',api:'responses',reasoningEffort:'low',imageDetail:'high',maxOutputTokens:32768,adapterVersion:'literal-named-fill-unit-marks-v5',automaticRetries:0,timeoutMs:240000};
export const LUNA_IDENTITY:LunaReaderIdentity={...TERRA_IDENTITY,kind:'luna-game-observation-v1',model:'gpt-6-luna',reasoningEffort:'high',automaticRetries:1};
// Default service reader. Deadline stays inside the 300s function limit, leaving room to save the result.
export const TERRA_HIGH_IDENTITY:TerraHighReaderIdentity={...LUNA_IDENTITY,kind:'terra-high-game-observation-v1',model:'gpt-6.1-terra',adapterVersion:LEAN_TERRA_PROFILE,timeoutMs:285000};
type OpenAIReaderIdentity=LunaReaderIdentity|TerraHighReaderIdentity;
// The provider answered that it produced nothing. A lost connection may have been accepted and billed, so it is never replayed.
const RETRYABLE_STATUS=new Set([500,502,503,504]);
function validateProfile(profile:unknown):asserts profile is TerraReaderIdentity['adapterVersion']{if(!['literal-named-fill-original-v1','literal-named-fill-unit-original-v2',COMPACT_TERRA_PROFILE,LEAN_TERRA_PROFILE,DETAIL_TERRA_PROFILE,'literal-named-fill-unit-marks-v5'].includes(profile as string))throw Error('지원하지 않는 Terra adapter profile입니다.');}
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
function body(identity:OpenAIReaderIdentity,prompt:string,schema:unknown,image:Buffer,mimeType:string){return {model:identity.model,store:false,service_tier:'default',max_output_tokens:identity.maxOutputTokens,reasoning:{effort:identity.reasoningEffort},input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:`data:${mimeType};base64,${image.toString('base64')}`,detail:identity.imageDetail}]}],text:{format:{type:'json_schema',name:'game_observation',strict:true,schema}}};}
export function buildTerraGameBody(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,profile:TerraReaderIdentity['adapterVersion']=LUNA_IDENTITY.adapterVersion,options:VisibleUnitOptions={},identity:OpenAIReaderIdentity=LUNA_IDENTITY){
 validateProfile(profile);
 const unitContract=visibleUnitContract(options);
 if(options.unitContract!==undefined&&(profile==='literal-named-fill-original-v1'||profile===COMPACT_TERRA_PROFILE))throw Error('이 관측 단위 계약은 named physicalUnit profile에서만 사용할 수 있습니다.');
 const original=buildGeminiGameBody(request,definition,image,mimeType);
 if(profile===COMPACT_TERRA_PROFILE||profile===LEAN_TERRA_PROFILE){const compact=compactTerraContract(request,definition,original.contents[0].parts[0].text!,profile);return body(identity,compact.prompt,compact.schema,image,mimeType);}
 let prompt=original.contents[0].parts[0].text!.replace('Box each whole object in [ymin,xmin,ymax,xmax] coordinates 0..1000, or null when uncertain.','Box each whole object as box_1000 = {"ymin":…, "xmin":…, "ymax":…, "xmax":…} in coordinates 0..1000 with ymin<ymax and xmin<xmax, or null when uncertain.').replace(' Include no manual properties.',' '+TERRA_FILL_SENTENCE+' Include no manual properties.');
 const schema:any=structuredClone(original.generationConfig.responseFormat.text.schema),coordinate={type:'number',minimum:0,maximum:1000};
 if(request.readMode!=='values'&&request.readMode!=='cells')schema.properties.items.items.properties.box_1000={anyOf:[{type:'object',properties:{ymin:coordinate,xmin:coordinate,ymax:coordinate,xmax:coordinate},required:['ymin','xmin','ymax','xmax'],additionalProperties:false},{type:'null'}]};
 if(profile==='literal-named-fill-unit-original-v2'||profile===DETAIL_TERRA_PROFILE||profile==='literal-named-fill-unit-marks-v5'){
  prompt+='\n'+unitContract;
  schema.properties.items.items.properties.physicalUnit={type:'string',enum:['single','group','unknown']};schema.properties.items.items.required.push('physicalUnit');
 }
 if(profile===DETAIL_TERRA_PROFILE)prompt+=terraDetailInstructions(request,definition);
 return body(identity,prompt,schema,image,mimeType);
}
function scanCompleteItems(text:string){
 const key=text.indexOf('"items"'),open=key<0?-1:text.indexOf('[',key);if(open<0)return {end:-1,count:0};
 let depth=0,inString=false,escaped=false,end=-1,count=0;
 for(let i=open+1;i<text.length;i++){
  const c=text[i];
  if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;continue;}
  if(c==='"')inString=true;else if(c==='{'||c==='[')depth++;
  else if(c==='}'||c===']'){if(!depth)break;if(!--depth){end=i+1;count++;}}
 }
 return {end,count};
}
/** Complete rows of output that was cut off. The unfinished last row is discarded, never guessed at. */
export function completeItemsPrefix(text:string):unknown|null{
 const {end}=scanCompleteItems(text);if(end<0)return null;try{return JSON.parse(text.slice(0,end)+']}');}catch{return null;}
}
/** Reads a Responses stream into the same final object as a plain reply. If it breaks after text arrived, what arrived is kept: replaying could bill twice. */
export async function readResponseStream(stream:AsyncIterable<Uint8Array>,model:string,onRows?:(count:number)=>void,observer?:{mark:(name:string,at:number)=>void;prefix?:(payload:any,count:number)=>void}){
 const decoder=new TextDecoder();let buffer='',text='',final:unknown=null,last=0,reported=0,complete=0;
 const marks=new Set<string>(),mark=(name:string)=>{if(!marks.has(name)){marks.add(name);observer?.mark(name,Date.now());}};
 const report=(now:number)=>{last=now;const n=scanCompleteItems(text).count;if(n!==reported){reported=n;onRows?.(n);}};
 try{
  for await(const chunk of stream){
   mark('firstChunkAt');buffer+=decoder.decode(chunk,{stream:true});
   for(let cut=buffer.indexOf('\n\n');cut>=0;cut=buffer.indexOf('\n\n')){
    const data=buffer.slice(0,cut).split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('');buffer=buffer.slice(cut+2);
    if(!data||data==='[DONE]')continue;
    let event:any;try{event=JSON.parse(data);}catch{continue;}
    if(event.type==='response.output_text.delta'&&typeof event.delta==='string'){mark('firstTextDeltaAt');text+=event.delta;const n=scanCompleteItems(text).count;if(n>complete){complete=n;mark('firstCompleteItemAt');const prefix=observer?.prefix?completeItemsPrefix(text):null;if(prefix)observer?.prefix?.(prefix,n);}if(onRows&&Date.now()-last>1000)report(Date.now());}
    else if(['response.completed','response.incomplete','response.failed'].includes(event.type)){mark('generationFinishedAt');final=event.response;}
    else if(event.type==='error')final={model,status:'failed',error:event};
   }
  }
 }catch(error){mark('streamInterruptedAt');if(!text)throw error;}
 mark('streamEndedAt');if(final)return final;
 if(!text)throw Error('판독 응답을 받지 못했습니다. 원본은 유지됩니다.');
 return {model,status:'incomplete',incomplete_details:{reason:'stream-interrupted'},output:[{type:'message',status:'incomplete',content:[{type:'output_text',text}]}]};
}
function readTerraResponse(native:unknown):{payload:unknown;truncated:boolean}{
 const truncated=object(native)&&native.status==='incomplete'&&['max_output_tokens','stream-interrupted'].includes(native.incomplete_details?.reason);
 if(!object(native)||native.error||!Array.isArray(native.output)||!truncated&&(native.status!=='completed'||native.incomplete_details))throw Error('Terra 응답이 완료되지 않았습니다. 원본은 유지됩니다.');
 const messages=native.output.filter((m:any)=>m?.type==='message');
 if(!messages.length||messages.some((m:any)=>m.status&&m.status!=='completed'&&!(truncated&&m.status==='incomplete')||!Array.isArray(m.content)||!m.content.length||m.content.some((p:any)=>p?.type!=='output_text'||typeof p.text!=='string')))throw Error('Terra 응답에 판독 결과가 없거나 거절되었습니다. 원본은 유지됩니다.');
 const text=messages.flatMap((m:any)=>m.content).map((p:any)=>p.text).join('');
 if(!truncated)return {payload:parseModelJSON(text),truncated:false};
 const payload=completeItemsPrefix(text);if(payload===null)throw Error('Terra 응답이 완료되지 않았습니다. 원본은 유지됩니다.');
 return {payload,truncated:true};
}
export function terraResponsePayload(native:unknown):unknown{return readTerraResponse(native).payload;}
export function decodeTerraGameObservation(native:unknown,request:ObservationRequest,definition:PhotoDefinition,transforms:PhotoTransform[]=[],profile?:TerraReaderIdentity['adapterVersion']){
 if(profile!==undefined)validateProfile(profile);
 const {payload,truncated}=readTerraResponse(native);return decodeTerraPayload(payload,request,definition,transforms,profile,native,truncated);
}
function decodeTerraPayload(payload:unknown,request:ObservationRequest,definition:PhotoDefinition,transforms:PhotoTransform[],profile:TerraReaderIdentity['adapterVersion']|undefined,native?:unknown,truncated=false){
 const compact=profile===COMPACT_TERRA_PROFILE||profile===LEAN_TERRA_PROFILE;
 const sourceItems=compact?expandCompactTerraPayload(payload,request,definition,profile as typeof COMPACT_TERRA_PROFILE):(()=>{if(!object(payload)||!Array.isArray(payload.items)||Object.keys(payload).some(k=>!['items',...(request.spatial?['spatial']:[])].includes(k)))throw Error('Terra 관측 형식을 확인하세요.');return payload.items;})();
 const physicalUnits:Record<string,PhysicalUnitClaim>={},unitDeferred:HostedObservationWire['deferred']=[];let version2=false;
 const decodingItems=(profile===DETAIL_TERRA_PROFILE||profile==='literal-named-fill-unit-marks-v5'||profile===LEAN_TERRA_PROFILE)?normalizeTerraDetailItems(sourceItems,request,definition):sourceItems;
 const items=decodingItems.map((source:any,index:number)=>{
  // Rows that break the contract pass through unchanged for the literal decoder to drop and record.
  if(!object(source))return source;
  const {physicalUnit,...item}=source;const ref='item-'+(index+1);
  if(Object.hasOwn(source,'physicalUnit')){if(!['single','group','unknown'].includes(physicalUnit))return null;version2=true;}
  physicalUnits[ref]=physicalUnit??'unknown';
  if(physicalUnit==='single'&&item.quantity!==null&&item.quantity!==1){physicalUnits[ref]='unknown';unitDeferred.push({ref,property:'physicalUnit',reason:'single-quantity-conflict'});}
  const b=item.box_1000;if(b===undefined&&(request.readMode==='values'||request.readMode==='cells'))return {...item,box_1000:null};if(b===null)return item;
  // A malformed box, including a positional array whose order cannot be trusted, loses only the placement; the literal decoder records it.
  if(!object(b)||Object.keys(b).length!==4||!['ymin','xmin','ymax','xmax'].every(k=>typeof b[k]==='number'))return {...item,box_1000:'invalid'};
  return {...item,box_1000:[b.ymin,b.xmin,b.ymax,b.xmax]};
 });
 const trace:HostedObservationWire={id:'terra-game-wire-v1',items:[],deferred:[],...(native!==undefined?{providerResponse:structuredClone(native)}:{})};
 const raw=decodeLiteralObservationPayload({items,...(request.spatial?{spatial:(payload as any)?.spatial}: {})},request,definition,trace,transforms);
 const kept=new Set(raw.observations.map(o=>o.ref));
 trace.items=structuredClone(sourceItems);if(version2||compact){trace.id=compact?'terra-game-wire-v3':'terra-game-wire-v2';trace.physicalUnits=Object.fromEntries(Object.entries(physicalUnits).filter(([ref])=>kept.has(ref)));trace.deferred.push(...unitDeferred);}
 if(truncated)trace.deferred.push({ref:'response',property:'items',reason:'provider-output-truncated'});
 return {raw,hostedWire:trace};
}
export function extractOpenAIKey(value:string):string{
 const source=value.trim().replace(/^\ufeff/,'' );let token:unknown=source;
 if(source.startsWith('{')){let parsed:unknown;try{parsed=JSON.parse(source);}catch{throw Error('OpenAI 인증 형식을 확인하세요.');}if(!object(parsed)||Object.keys(parsed).length!==1||!['OPENAI_API_KEY','api_key','apiKey'].includes(Object.keys(parsed)[0]))throw Error('OpenAI 인증 형식을 확인하세요.');token=Object.values(parsed)[0];}
 else{const named=source.match(/^([^:=\n]+)\s*[:=\n]\s*([^\n]+)$/);if(named){if(!['OPENAI','OPENAIKEY','OPENAIAPI','OPENAIAPIKEY'].includes(named[1].replace(/[ _-]/g,'').toUpperCase()))throw Error('OpenAI 인증 형식을 확인하세요.');token=named[2].trim();}}
 if(typeof token==='string'&&['"',"'",'`'].includes(token[0])&&token.at(-1)===token[0])token=token.slice(1,-1);
 if(typeof token!=='string'||!/^sk-[A-Za-z0-9_-]{16,}$/.test(token))throw Error('OpenAI 인증 형식을 확인하세요.');return token;
}
async function configuredKey(){const file=process.env.KEEPBOARD_OPENAI_API_KEY_FILE;return extractOpenAIKey(file?await readFile(file,'utf8'):process.env.OPENAI_API_KEY??'');}
export class LunaGameReader{
 readonly identity:OpenAIReaderIdentity;
 private get label(){return this.identity.kind==='terra-high-game-observation-v1'?'Terra high':'Luna high';}
 constructor(private readonly config:{key?:()=>Promise<string>;fetch?:typeof fetch;identity?:OpenAIReaderIdentity;profile?:TerraReaderIdentity['adapterVersion'];automaticRetries?:LunaReaderIdentity['automaticRetries'];retryDelayMs?:number}={}){if(config.profile!==undefined)validateProfile(config.profile);this.identity={...(config.identity??LUNA_IDENTITY),...(config.profile?{adapterVersion:config.profile}:{}),...(config.automaticRetries!==undefined?{automaticRetries:config.automaticRetries}:{})};}
 async status(){let available=!!this.config.key||!!process.env.OPENAI_API_KEY;const file=process.env.KEEPBOARD_OPENAI_API_KEY_FILE;if(file&&!this.config.key){try{available=(await stat(file)).isFile();}catch{available=false;}}return {kind:this.identity.kind,available,cloudSupported:true as const,identity:available?this.identity:null,...(!available?{reason:`서버에 ${this.label} 게임 사진 판독용 키가 연결되지 않았습니다.`}:{})};}
 private async invoke(request:ObservationRequest,image:Buffer,mimeType:string,requestBody:Record<string,unknown>,onRows?:ObservationProgressCallback,onPrefix?:(payload:any,count:number)=>void){
  if(request.images.length!==1||createHash('sha256').update(image).digest('hex')!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw Error('고정한 원본 사진을 확인하세요.');
  const key=await (this.config.key??configuredKey)(),start=performance.now();
  const streaming=this.identity.kind==='terra-high-game-observation-v1';
  // Both attempts share one deadline, so a retry can never extend the pinned timeout.
  const timings:Record<string,number>={},mark=(name:string,at=Date.now())=>{if(timings[name]===undefined)timings[name]=at;onRows?.(0,{timings:{...timings}});};
  const signal=AbortSignal.timeout(this.identity.timeoutMs),send=()=>{mark('providerRequestAt');return (this.config.fetch??fetch)('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(streaming?{...requestBody,stream:true}:requestBody),signal,redirect:'error'});};
  let response=await send();mark('providerHttpAt');
  for(let retry=0;retry<this.identity.automaticRetries&&RETRYABLE_STATUS.has(response.status);retry++){await response.body?.cancel();await wait(this.config.retryDelayMs??2000,undefined,{signal});response=await send();}
  if(!response.ok)throw Error(`${this.label} 판독 요청이 실패했습니다 (${response.status}). 원본과 기존 기록은 유지됩니다.`);
  const native:unknown=streaming&&response.body&&response.headers.get('content-type')?.includes('text/event-stream')?await readResponseStream(response.body as unknown as AsyncIterable<Uint8Array>,this.identity.model,onRows,{mark,prefix:onPrefix}):await response.json();if(object(native)&&native.model!==this.identity.model)throw Error(`고정한 ${this.label} 모델과 응답이 다릅니다.`);
  return {native,timings:{...timings,readerMs:performance.now()-start}};
 }
 async read(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,transforms:PhotoTransform[]=[],onRows?:ObservationProgressCallback){
  let firstReadableItemAt:number|undefined,firstUsefulValueAt:number|undefined,full=false;
  const read=await this.invoke(request,image,mimeType,buildTerraGameBody(request,definition,image,mimeType,this.identity.adapterVersion,{},this.identity),onRows,(payload,count)=>{
   if(!onRows||full||!Array.isArray(payload?.items))return;
   try{
    const previewRequest={...request};delete previewRequest.spatial;
    const result=decodeTerraPayload({...(payload.v!==undefined?{v:payload.v}:{}),items:payload.items},previewRequest,definition,transforms,this.identity.adapterVersion);
    const preview=[];let size=0;
    for(const o of result.raw.observations){if(!Object.values(o.properties).some(p=>p.state==='observed'))continue;const bytes=Buffer.byteLength(JSON.stringify(o));if(bytes>16384)continue;if(preview.length>=64||size+bytes>65536){full=true;break;}preview.push(o);size+=bytes;}
    if(preview.length){firstReadableItemAt??=Date.now();if(preview.some(o=>usefulPreviewValues(o,definition,request).length))firstUsefulValueAt??=Date.now();onRows(count,{preview,timings:{firstReadableItemAt,...(firstUsefulValueAt!==undefined?{firstUsefulValueAt}:{})}});}
   }catch{/* An incomplete/invalid row is not a fact preview. Final decode remains authoritative. */}
  });
  const decoded=decodeTerraGameObservation(read.native,request,definition,transforms,this.identity.adapterVersion);
  if(object(read.native)&&read.native.status!=='completed')decoded.raw.completion='truncated';
  const timings={...read.timings,...(firstReadableItemAt!==undefined?{firstReadableItemAt}:{}),...(firstUsefulValueAt!==undefined?{firstUsefulValueAt}:{}),readerDoneAt:Date.now()};onRows?.(decoded.raw.observations.length,{timings});return {...decoded,timings};
 }
 async readCatanScene(request:ObservationRequest,definition:PhotoDefinition,session:Session,pack:GamePack,evidence:Evidence[],image:Buffer,mimeType:string){
  const read=await this.invoke(request,image,mimeType,body(this.identity,catanScenePrompt(session,pack,evidence),strictTerraSchema(catanSceneResponseSchema(evidence)),image,mimeType));
  return {result:decodeCatanScenePayload(terraResponsePayload(read.native),{request,definition,session,pack,evidence,reader:this.identity,sourceImageSHA:request.images[0].sha256},'terra-catan-scene-wire-v1',read.native),timings:read.timings};
 }
}
// Backward-compatible source imports; this alias does not restore the retired Terra service model.
export {LunaGameReader as TerraGameReader,buildTerraGameBody as buildLunaGameBody};
