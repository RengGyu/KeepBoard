import {createHash} from 'node:crypto';
import type {GamePack,Evidence,AnalysisResult} from '../shared/types';
import {compileObservationTask,validateObservationResult,type LocalReaderSelection,type ObservationRequest,type PhotoDefinition,type ReaderIdentity,type LocalTaskProfile} from '../shared/lightweightRecognition';
import {validatePhotoFrame,type ConfirmedPhotoFrame,type PhotoTransform} from '../shared/photoGeometry';
import {photoDefinition} from './photoDefinitions';
import {LocalReader} from './ai/localReader';
import {assembleObservations} from './ai/observationAssembly';
import {AnalysisJobError} from './analysisJobs';
import {buildCatanAtlas} from './ai/catanAtlas';
import {qwenNumberGrounding} from './ai/qwenNumberGrounding';
export interface PinnedLocalObservation {request:ObservationRequest;definition:PhotoDefinition;reader:ReaderIdentity;frame?:ConfirmedPhotoFrame;transforms:PhotoTransform[];taskProfile?:LocalTaskProfile;sourceImageSHA?:string}
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export function imageDimensions(data:Buffer):{width:number;height:number}{
 if(data.length>24&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
 if(data.length>4&&data[0]===255&&data[1]===216){let i=2;while(i+8<data.length){if(data[i]!==255){i++;continue;}const marker=data[i+1];if(marker===216||marker===217){i+=2;continue;}const length=data.readUInt16BE(i+2);if(length<2||i+length+2>data.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:data.readUInt16BE(i+7),height:data.readUInt16BE(i+5)};i+=length+2;}}
 if(data.length>=30&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'){
  const kind=data.toString('ascii',12,16);if(kind==='VP8X')return {width:data.readUIntLE(24,3)+1,height:data.readUIntLE(27,3)+1};
  if(kind==='VP8L'&&data[20]===47){const n=data.readUInt32LE(21);return {width:(n&16383)+1,height:((n>>>14)&16383)+1};}
  if(kind==='VP8 '&&data.length>=30)return {width:data.readUInt16LE(26)&16383,height:data.readUInt16LE(28)&16383};
 }
 throw new AnalysisJobError('로컬 리더가 원본 사진의 실제 크기를 확인하지 못했습니다. JPEG/PNG/WebP 원본을 확인하세요.');
}
export async function prepareLocalObservation(input:{pack:GamePack;evidence:Evidence[];captureEpoch:string;selection:unknown;taskId:string;reader?:LocalReader;cloud:boolean;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>}):Promise<PinnedLocalObservation>{
 if(input.cloud)throw new AnalysisJobError('클라우드에는 이 로컬 모델이 없습니다. 유료 모델로 자동 전환하지 않습니다.',409);
 if(!input.reader||(await input.reader.status()).available!==true)throw new AnalysisJobError('로컬 리더가 준비되지 않았습니다. 원본과 기존 기록은 유지됩니다.',503);
 const s=input.selection as LocalReaderSelection;if(!s||typeof s!=='object'||Object.keys(s).some(k=>!['kind','task','definitionSHA','areaId','frame','inputMode'].includes(k))||s.kind!=='local-observation-v1'||s.task!==undefined&&s.task!=='catan-numerals-v1'||!['original','catan-atlas',undefined].includes(s.inputMode)||input.evidence.length!==1)throw new AnalysisJobError('로컬 리더와 촬영할 한 영역·한 사진을 확인하세요.');
 const e=input.evidence[0],definition=photoDefinition(input.pack,s.definitionSHA),area=definition.areas.find(a=>a.id===s.areaId);if(!area||(area.partition==='owner_private'?(e.scope!=='player'||!e.ownerId):(e.scope!=='public'||!!e.ownerId)))throw new AnalysisJobError('공용·본인 촬영 영역을 확인하세요.');
 if(e.captureEpoch!==input.captureEpoch)throw new AnalysisJobError('현재 촬영 단계의 사진만 로컬로 읽을 수 있습니다. 과거 사진과 저장 기록은 유지됩니다.',409);
 let taskProfile:LocalTaskProfile|undefined;
 if(s.task){if(definition.gameId!=='catan'||definition.packId!=='catan-base'||definition.nativeBridge!=='catan'||area.id!=='board'||area.partition!=='common_public'||e.scope!=='public'||e.ownerId)throw new AnalysisJobError('숫자만 읽기는 카탄 기본판 공용 판에서만 사용할 수 있습니다.',409);const capability=await input.reader.numeralCapability();if(!capability.available||!capability.profile)throw new AnalysisJobError('숫자 전용 실행 설정을 확인할 수 없습니다. 기본 AI로 자동 전환하지 않습니다.',503);taskProfile=capability.profile;}
 if((s.frame||s.inputMode==='catan-atlas')&&(definition.gameId!=='catan'||area.id!=='board'||area.partition!=='common_public'||e.scope!=='public'||e.ownerId))throw new AnalysisJobError('사진 기준점과 atlas는 카탄 공용 판 촬영에서만 사용할 수 있습니다.',409);
 const bytes=await input.readImage(e),dimensions=imageDimensions(bytes.data),sourceSHA=sha(bytes.data),frame=s.frame?validatePhotoFrame(s.frame,{evidenceId:e.id,sourceSHA,definitionSHA:definition.definitionSHA}):undefined;
 if(s.inputMode==='catan-atlas'&&!frame)throw new AnalysisJobError('atlas는 확인한 카탄 기준점이 필요합니다. 원본은 기준점 없이 읽을 수 있습니다.',409);
 const atlas=s.inputMode==='catan-atlas'?await buildCatanAtlas(bytes.data,frame!):undefined,transforms=atlas?[atlas.transform]:[];
 const request=compileObservationTask({pack:input.pack,definition,areaId:s.areaId,taskId:input.taskId,scope:{partition:area!.partition,ownerId:e.ownerId??null,captureEpoch:e.captureEpoch},images:[atlas?{evidenceId:e.id,inputId:atlas.transform.transformId,sha256:atlas.transform.inputSHA,...atlas.transform.inputDimensions,transformId:atlas.transform.transformId}:{evidenceId:e.id,inputId:e.id,sha256:sourceSHA,...dimensions,transformId:null}],geometryFrameId:frame?.frameId,transforms});
 if(atlas){request.allowedComponents=request.allowedComponents.filter(id=>['terrain','number-token','robber'].includes(id));request.allowedPropertyIds=Object.fromEntries(Object.entries(request.allowedPropertyIds).filter(([id])=>request.allowedComponents.includes(id)));}
 if(taskProfile){if(!request.allowedComponents.includes('number-token')||!request.allowedPropertyIds['number-token']?.includes('number'))throw new AnalysisJobError('이 판본의 숫자 촬영 정의가 없습니다.',409);request.allowedComponents=['number-token'];request.allowedPropertyIds={'number-token':['number']};}
 return {request,definition,reader:{...structuredClone(input.reader.config.identity),...(taskProfile?{maxOutputTokens:taskProfile.maxOutputTokens}:{})},frame,transforms,taskProfile,sourceImageSHA:sourceSHA};
}
export async function analyzeLocalObservation(input:{plan:PinnedLocalObservation;pack:GamePack;turnInstanceId:string;evidence:Evidence[];reader:LocalReader;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>;timings?:Record<string,number>}):Promise<AnalysisResult>{
 const {plan,reader}=input;if(JSON.stringify({...reader.config.identity,...(plan.taskProfile?{maxOutputTokens:plan.taskProfile.maxOutputTokens}:{})})!==JSON.stringify(plan.reader))throw new AnalysisJobError('고정한 로컬 모델이 바뀌었습니다. 자동 재요청하지 않습니다.',409);
 if(plan.taskProfile){const capability=await reader.numeralCapability();if(!capability.available||JSON.stringify(capability.profile)!==JSON.stringify(plan.taskProfile))throw new AnalysisJobError('고정한 숫자 작업 profile이 바뀌었습니다. 자동 재요청하지 않습니다.',409);}
 const bytes=await input.readImage(input.evidence[0]),atlas=plan.transforms.length?await buildCatanAtlas(bytes.data,plan.frame!):undefined;
 if(plan.sourceImageSHA&&sha(bytes.data)!==plan.sourceImageSHA)throw new AnalysisJobError('고정한 원본 사진이 바뀌었습니다.',409);
 if(atlas&&JSON.stringify(atlas.transform)!==JSON.stringify(plan.transforms[0]))throw new AnalysisJobError('고정한 atlas 변환이 바뀌었습니다. 자동 재요청하지 않습니다.',409);
 const read=await reader.read(plan.request,plan.definition,atlas?.data??bytes.data,atlas?.mimeType??bytes.mimeType,plan.transforms.flatMap(t=>t.panels.map(p=>({panelRef:p.panelRef,inputRectangle:p.inputRectangle}))),plan.taskProfile);
 if(input.timings)input.timings.provider=read.timings.readerMs;
 const native=plan.taskProfile?qwenNumberGrounding(read.raw,plan.request,plan.definition,plan.transforms):undefined,result=native?.result??validateObservationResult(read.raw,plan.request,plan.definition,plan.transforms);
 return assembleObservations({request:plan.request,result,definition:plan.definition,pack:input.pack,turnInstanceId:input.turnInstanceId,reader:plan.reader,frame:plan.frame,transforms:plan.transforms,taskProfile:plan.taskProfile,sourceImageSHA:plan.sourceImageSHA,nativeWire:native?.nativeWire});
}
