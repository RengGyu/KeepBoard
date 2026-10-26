import {createHash} from 'node:crypto';
import {mkdir,open,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import type {ObservationRequest,PhotoDefinition,ReaderIdentity,LocalTaskProfile,LocalReaderTaskCapability,LocalReaderCapabilities} from '../../shared/lightweightRecognition';
import {verifiedNumeralProfile} from './localTaskProfile';
import {QWEN_NUMBER_PROMPT,QWEN_NUMBER_SCHEMA} from './qwenNumberGrounding';
export interface LocalReaderConfig {version:1;endpoint:string;modelAlias:string;identity:ReaderIdentity;receiptDirectory:string;timeoutMs:number;runtimeReceiptFile?:string}
const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
export function observationResponseSchema(request:ObservationRequest){
 const property={oneOf:[{type:'object',properties:{state:{const:'observed'},value:{type:['string','number','boolean','array','object']}},required:['state','value'],additionalProperties:false},{type:'object',properties:{state:{const:'unknown'},value:{type:'null'},reason:{enum:['unreadable','occluded','out-of-frame','not-present-unconfirmed','wrong-face','ambiguous','unsupported']}},required:['state','value','reason'],additionalProperties:false}]};
 return {type:'object',properties:{version:{const:'lightweight-observation-v1'},coverage:{const:'partial'},completion:{const:'complete'},observations:{type:'array',items:{type:'object',properties:{ref:{type:'string'},imageIndex:{const:0},panelRef:{type:['string','null']},componentId:{enum:[...(request.allowedComponents??[]),null]},bbox:{anyOf:[{type:'null'},{type:'object',properties:{x:{type:'number'},y:{type:'number'},width:{type:'number'},height:{type:'number'}},required:['x','y','width','height'],additionalProperties:false}]},face:{enum:['front','back','unknown']},quantity:{type:['integer','null']},rotationDegrees:{type:['number','null']},properties:{type:'object',properties:Object.fromEntries([...new Set(Object.values(request.allowedPropertyIds??{}).flat())].map(key=>[key,property])),additionalProperties:false},referenceCandidates:{type:'array',maxItems:0,items:{type:'object'}}},required:['ref','imageIndex','panelRef','componentId','bbox','face','quantity','rotationDegrees','properties','referenceCandidates'],additionalProperties:false}}},required:['version','observations','coverage','completion'],additionalProperties:false};
}
export function observationReaderPrompt(request:ObservationRequest,definition:PhotoDefinition,panels:{panelRef:string;inputRectangle:unknown}[]=[]){
 const components=definition.components.filter(c=>(request.allowedComponents??[]).includes(c.id)).map(c=>({id:c.id,properties:c.properties.filter(f=>request.allowedPropertyIds[c.id]?.includes(f.id)).map(f=>({id:f.id,label:f.label,type:f.type,...(f.options?{options:f.options.map(o=>o.value)}:{}),...(f.min!==undefined?{min:f.min}:{}),...(f.max!==undefined?{max:f.max}:{}),...(f.faceOnly?{frontOnly:true}:{})}))}));
 return 'Read visible physical objects in this image only. Return JSON with individual observations. No game rules, owner, turn, history, totals, stock correction, expected layout, or inferred hidden faces. Preserve separate identical physical copies. Observations are always partial; never create a missing object from inventory. bbox is normalized xywh in the transmitted image; null if uncertain. Give each object a unique ref. Read actual printed values, colours and front/back. A colour does not identify an owner. Unknown properties use {state:"unknown",value:null,reason:"unreadable"} or another permitted reason; omitted properties stay unknown. Physical quantity is independent of printed cost, points or dice face. Marks arrays contain only explicitly legible symbol/value pairs; omitted symbols are unknown, not zero. Face-only properties require a visible front. Do not return manual coordinates, board slots or private history. Catan terrain and printed number token are separate observations; do not duplicate a token inside terrain. Return completion:"complete", coverage:"partial", version:"lightweight-observation-v1". referenceCandidates is always empty. One image, imageIndex=0. panelRef=null for a normal original; for a panel atlas use only a supplied panelRef and that panel bbox. Allowed literal components/properties: '+JSON.stringify(components)+'. Panels: '+JSON.stringify(panels)+'.';
}
export class LocalReader {
 private busy=false;
 constructor(readonly config:LocalReaderConfig){
  const u=new URL(config.endpoint);
  if(config.version!==1||u.protocol!=='http:'||!['127.0.0.1','[::1]','localhost'].includes(u.hostname)||u.username||u.password||u.search||u.hash||!config.modelAlias||!path.isAbsolute(config.receiptDirectory)||config.identity.kind!=='local-observation-v1'||!Number.isInteger(config.identity.contextTokens)||!Number.isInteger(config.identity.maxOutputTokens)||config.identity.maxOutputTokens<128||config.identity.maxOutputTokens>=config.identity.contextTokens||!Number.isFinite(config.timeoutMs)||config.timeoutMs<100||config.timeoutMs>1200000)throw new Error('로컬 리더 설정을 확인하세요.');
 }
 static async fromFile(file:string){return new LocalReader(JSON.parse(await readFile(file,'utf8')));}
 async numeralCapability():Promise<LocalReaderTaskCapability>{
  try{if(!this.config.runtimeReceiptFile||!path.isAbsolute(this.config.runtimeReceiptFile))throw Error('No pinned runtime receipt');const receipt=JSON.parse(await readFile(this.config.runtimeReceiptFile,'utf8'));if(!Number.isSafeInteger(receipt.pid)||receipt.pid<1)throw Error('Invalid runtime pid');const {stdout}=await promisify(execFile)('ps',['-ww','-p',String(receipt.pid),'-o','command='],{timeout:2000});return {task:'catan-numerals-v1',available:true,profile:verifiedNumeralProfile(this.config,receipt,stdout)};}catch{return {task:'catan-numerals-v1',available:false,profile:null,reason:'숫자 전용 실행 설정(image-min 1024)과 모델 pin을 확인할 수 없습니다.'};}
 }
 async status():Promise<LocalReaderCapabilities['readers'][number]>{
  try{const [h,m]=await Promise.all([fetch(this.config.endpoint+'/health',{signal:AbortSignal.timeout(2000),redirect:'error'}),fetch(this.config.endpoint+'/v1/models',{signal:AbortSignal.timeout(2000),redirect:'error'})]);const data=await m.json()as any;if(h.ok&&m.ok&&data.data?.some((m:any)=>m.id===this.config.modelAlias))return {kind:'local-observation-v1',available:true,cloudSupported:false,identity:this.config.identity,tasks:[await this.numeralCapability()]};}catch{}
  return {kind:'local-observation-v1',available:false,cloudSupported:false,identity:this.config.identity,reason:'로컬 리더 모델이 아직 준비되지 않았습니다.',tasks:[{task:'catan-numerals-v1',available:false,profile:null,reason:'로컬 리더 모델이 아직 준비되지 않았습니다.'}]};
 }
 async read(request:ObservationRequest,definition:PhotoDefinition,image:Buffer,mimeType:string,panels:{panelRef:string;inputRectangle:unknown}[]=[],taskProfile?:LocalTaskProfile){
  if(this.busy)throw new Error('로컬 리더가 다른 사진을 읽고 있습니다. 자동 재시도하지 않습니다.');
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(request.taskId)||request.images.length!==1||sha(image)!==request.images[0].sha256||!['image/jpeg','image/png','image/webp'].includes(mimeType))throw new Error('로컬 리더의 고정 원본을 확인하세요.');
  const identity={...this.config.identity,...(taskProfile?{maxOutputTokens:taskProfile.maxOutputTokens}:{})};
  this.busy=true;const begin=performance.now(),prefix=path.join(this.config.receiptDirectory,request.taskId);
  try{
   if(taskProfile){const capability=await this.numeralCapability();if(!capability.available||JSON.stringify(capability.profile)!==JSON.stringify(taskProfile))throw Error('고정한 숫자 리더 profile이 바뀌었습니다. 자동 재요청하지 않습니다.');}
   await mkdir(this.config.receiptDirectory,{recursive:true,mode:0o700});
   const claim=await open(prefix+'.attempt.json','wx',0o600);await claim.writeFile(JSON.stringify({request,reader:identity,taskProfile,startedAt:new Date().toISOString(),automaticRetries:0}));await claim.close();
   const prompt=taskProfile?QWEN_NUMBER_PROMPT:observationReaderPrompt(request,definition,panels),body={model:this.config.modelAlias,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:'data:'+mimeType+';base64,'+image.toString('base64')}}]}],response_format:{type:'json_schema',json_schema:{name:taskProfile?'qwen_number_grounding':'keepboard_observation',strict:true,schema:taskProfile?QWEN_NUMBER_SCHEMA:observationResponseSchema(request)}},temperature:0,max_tokens:identity.maxOutputTokens,stream:false,...(taskProfile?{cache_prompt:false}:{})};
   await writeFile(prefix+'.request-metadata.json',JSON.stringify({request,reader:identity,taskProfile,promptSHA:sha(prompt),schemaSHA:sha(JSON.stringify(body.response_format.json_schema.schema)),bodySHA:sha(JSON.stringify(body)),imageSHA:sha(image),imageBytes:image.length,promptBytes:Buffer.byteLength(prompt)}),{mode:0o600});
   const response=await fetch(this.config.endpoint+'/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(this.config.timeoutMs),redirect:'error'}),bytes=Buffer.from(await response.arrayBuffer());
   await writeFile(prefix+'.response.json',bytes,{mode:0o600});const payload=JSON.parse(bytes.toString()),choice=payload.choices?.[0];
   const receipt={status:response.status,readerMs:performance.now()-begin,usage:payload.usage??null,timings:payload.timings??null,finishReason:choice?.finish_reason??null,bodySHA:sha(bytes)};
   await writeFile(prefix+'.completion.json',JSON.stringify(receipt),{mode:0o600});
   if(!response.ok)throw new Error('로컬 리더 요청이 실패했습니다. 원본과 기존 기록은 유지됩니다.');
   if(choice?.finish_reason!=='stop')throw new Error('로컬 리더 응답이 완료되지 않았거나 잘렸습니다(truncated). 자동 재요청하지 않습니다.');
   if(typeof choice.message?.content!=='string')throw new Error('로컬 리더의 JSON 응답이 없습니다.');
   const raw=JSON.parse(choice.message.content.trim());await writeFile(prefix+'.decoded.json',JSON.stringify(raw),{mode:0o600});
   return {raw,timings:{readerMs:receipt.readerMs},usage:receipt.usage,privateReceiptPrefix:prefix};
  }finally{this.busy=false;}
 }
}
