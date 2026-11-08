import {isHostedReader} from '../shared/lightweightRecognition';
import type {HostedObservationReader} from './ai/hostedReader';
import {createHash} from 'node:crypto';
import type {AnalysisResult,Evidence,GamePack} from '../shared/types';
import {compileObservationTask,type HostedReaderIdentity,type HostedReaderSelection,type ObservationRequest,type PhotoDefinition} from '../shared/lightweightRecognition';
import {validatePhotoFrame,type ConfirmedPhotoFrame} from '../shared/photoGeometry';
import {hostedVisibleProperty} from './ai/geminiGameReader';
import {assembleObservations} from './ai/observationAssembly';
import {photoDefinition} from './photoDefinitions';
import {imageDimensions} from './localObservation';
import {AnalysisJobError} from './analysisJobs';

const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
export interface PinnedHostedObservation {request:ObservationRequest;definition:PhotoDefinition;reader:HostedReaderIdentity;frame?:ConfirmedPhotoFrame;transforms:import('../shared/photoGeometry').PhotoTransform[];sourceImageSHA:string;inputSHA?:string;taskProfile?:undefined}
export async function prepareHostedObservation(input:{pack:GamePack;evidence:Evidence[];captureEpoch:string;selection:unknown;taskId:string;reader:HostedObservationReader;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>}):Promise<PinnedHostedObservation>{
 const s=input.selection as HostedReaderSelection;if(!s||typeof s!=='object'||Object.keys(s).some(k=>!['kind','definitionSHA','areaId','frame'].includes(k))||!isHostedReader(s)||s.kind!==input.reader.identity.kind||input.evidence.length!==1)throw new AnalysisJobError('사진 판독기와 한 촬영 영역·원본 사진을 확인하세요.');
 if(!(await input.reader.status()).available)throw new AnalysisJobError('서버에 선택한 게임 사진 판독용 키가 연결되지 않았습니다.',503);
 const e=input.evidence[0],definition=photoDefinition(input.pack,s.definitionSHA),area=definition.areas.find(a=>a.id===s.areaId);
 if(!area||(area.partition==='owner_private'?(e.scope!=='player'||!e.ownerId):(e.scope!=='public'||!!e.ownerId)))throw new AnalysisJobError('공용·본인 촬영 영역을 확인하세요.');
 if(e.captureEpoch!==input.captureEpoch)throw new AnalysisJobError('현재 촬영 단계의 사진만 읽을 수 있습니다. 과거 사진과 저장 기록은 유지됩니다.',409);
 if(s.frame&&(definition.nativeBridge!=='catan'||area.id!=='board'||area.partition!=='common_public'||e.scope!=='public'||e.ownerId))throw new AnalysisJobError('카탄 공용 판 사진의 기준점만 사용할 수 있습니다.',409);
 const bytes=await input.readImage(e),sourceImageSHA=sha(bytes.data),dimensions=imageDimensions(bytes.data),frame=s.frame?validatePhotoFrame(s.frame,{evidenceId:e.id,sourceSHA:sourceImageSHA,definitionSHA:definition.definitionSHA}):undefined;
 const request=compileObservationTask({pack:input.pack,definition,areaId:s.areaId,taskId:input.taskId,scope:{partition:area.partition,ownerId:e.ownerId??null,captureEpoch:e.captureEpoch},images:[{evidenceId:e.id,inputId:e.id,sha256:sourceImageSHA,...dimensions,transformId:null}],geometryFrameId:frame?.frameId});
 for(const component of definition.components)if(request.allowedPropertyIds[component.id])request.allowedPropertyIds[component.id]=request.allowedPropertyIds[component.id].filter(id=>hostedVisibleProperty(component,id));
 return {request,definition,reader:structuredClone(input.reader.identity),frame,transforms:[],sourceImageSHA};
}
export async function analyzeHostedObservation(input:{plan:PinnedHostedObservation;pack:GamePack;session:import('../shared/types').Session;turnInstanceId:string;evidence:Evidence[];reader:HostedObservationReader;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>;timings?:Record<string,number>;literal?:boolean;onRows?:(count:number)=>void}):Promise<AnalysisResult>{
 const {plan,reader}=input;if(JSON.stringify(plan.reader)!==JSON.stringify(reader.identity))throw new AnalysisJobError('고정한 사진 판독 profile이 바뀌었습니다.',409);
 const bytes=await input.readImage(input.evidence[0]);if(sha(bytes.data)!==(plan.inputSHA??plan.sourceImageSHA))throw new AnalysisJobError('고정한 원본 사진이 바뀌었습니다.',409);
 if(!input.literal&&plan.definition.nativeBridge==='catan'&&plan.request.areaId==='board'&&plan.request.scope.partition==='common_public'){
  const read=await reader.readCatanScene(plan.request,plan.definition,input.session,input.pack,input.evidence,bytes.data,bytes.mimeType);if(input.timings)input.timings.provider=read.timings.readerMs;
  // Keep the pinned request frame in the receipt; native scene slots are separate from manual frame geometry.
  for(const receipt of read.result.observationReceipts??[])receipt.frame=plan.frame??null;
  return read.result;
 }
 const read=await reader.read(plan.request,plan.definition,bytes.data,bytes.mimeType,plan.transforms,input.onRows);if(input.timings)input.timings.provider=read.timings.readerMs;
 return assembleObservations({request:plan.request,result:read.raw,definition:plan.definition,pack:input.pack,turnInstanceId:input.turnInstanceId,reader:plan.reader,frame:plan.frame,transforms:plan.transforms,sourceImageSHA:plan.sourceImageSHA,hostedWire:read.hostedWire});
}
