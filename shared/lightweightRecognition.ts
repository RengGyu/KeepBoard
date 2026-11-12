import {readingAreas,compatibleRestoration,type ReadingTarget} from './restoration';
import {validateSpatialResult} from './spatialObservation';
import type {GamePack} from './types';
import type {PropertySpec} from './readouts/types';
export const OBSERVATION_VERSION='lightweight-observation-v1' as const;
export type ObservationPartition='common_public'|'player_public'|'owner_private';
export interface PhotoComponentDefinition {id:string;properties:PropertySpec[];manualPropertyIds:string[];variants?:string[]}
export interface PhotoDefinition {version:'game-photo-definition-v1';gameId:string;packId:string;packVersion:string;editionId:string;sourceSHA:string;definitionSHA:string;nativeBridge:'catan'|'rummikub'|'splendor'|null;readoutSchema:string|null;areas:{id:string;partition:ObservationPartition;fields:string[];componentIds:string[]}[];components:PhotoComponentDefinition[]}
export interface ObservationScope {partition:ObservationPartition;ownerId:string|null;captureEpoch:string}
export interface ObservationImage {evidenceId:string;sha256:string;width:number;height:number;inputId:string;transformId:string|null}
export type ObservationReadMode='values'|'cells'|'boxes';
export const validObservationReadMode=(v:unknown):v is ObservationReadMode=>['values','cells','boxes'].includes(v as string);
export interface ObservationRequest {readModePolicy?:'visible-values-v1';readMode?:ObservationReadMode;readingTarget?:ReadingTarget;propertyApplicability?:{frontOnlyPropertyIds:Record<string,string[]>;areaPropertyIds?:Record<string,Record<string,string[]>>;policySHA?:string};spatial?:import('./spatialDefinition').SpatialRequest;version:typeof OBSERVATION_VERSION;taskId:string;gameId:string;packId:string;editionId:string;sourceSHA:string;definitionSHA:string;areaId:string;scope:ObservationScope;images:ObservationImage[];allowedComponents:string[];allowedPropertyIds:Record<string,string[]>;componentLabels?:Record<string,{name:string;physicalType:string}>;referenceSetId:string|null;geometryFrameId:string|null}
export type ObservationUnknownReason='unreadable'|'occluded'|'out-of-frame'|'not-present-unconfirmed'|'wrong-face'|'ambiguous'|'unsupported';
export type ObservationProperty={state:'observed';value:string|number|boolean|unknown[]|Record<string,unknown>}|{state:'unknown';value:null;reason:ObservationUnknownReason};
export interface ObservationBox {x:number;y:number;width:number;height:number}
export interface LiteralObservation {sourceAreaId?:string|null;ref:string;imageIndex:number;panelRef:string|null;componentId:string|null;bbox:ObservationBox|null;face:'front'|'back'|'unknown';quantity:number|null;rotationDegrees:number|null;properties:Record<string,ObservationProperty>;referenceCandidates:{referenceId:string;assetSHA:string}[]}
export interface ObservationProgressUpdate {timings?:Record<string,number>;preview?:LiteralObservation[]}
export type ObservationProgressCallback=(count:number,update?:ObservationProgressUpdate)=>void;
export interface ObservationResult {spatial?:import('./spatialObservation').SpatialResult;version:typeof OBSERVATION_VERSION;observations:LiteralObservation[];coverage:'partial';completion:'complete'|'truncated'|'failed'}
export interface GeometryCandidate {observationRef:string;frameId:string;locationCandidate:{type:'hex'|'edge'|'vertex';id:string};method:'confirmed-frame';status:'candidate'}
export interface LocalReaderSelection {kind:'local-observation-v1';task?:'catan-numerals-v1';definitionSHA:string;areaId:string;frame?:import('./photoGeometry').ConfirmedPhotoFrame;inputMode?:'original'|'catan-atlas'}
export interface HostedReaderSelection {readMode?:ObservationReadMode;readingTarget?:ReadingTarget;kind:'gemini-game-observation-v1'|'terra-game-observation-v1'|'luna-game-observation-v1'|'terra-high-game-observation-v1';definitionSHA:string;areaId:string;frame?:import('./photoGeometry').ConfirmedPhotoFrame;target?:import('./scanObservation').ScanTarget}
export type PhotoReaderSelection=LocalReaderSelection|HostedReaderSelection;
export interface LocalTaskProfile {id:'catan-numerals-v1';wire:'qwen-number-grounding-v1';promptSHA256:string;schemaSHA256:string;runtimeSettingsSHA256:string;contextTokens:8192;maxOutputTokens:1024;imageMinTokens:1024;temperature:0;cachePrompt:false;stream:false;automaticRetries:0;parallelRequests:1}
export interface LocalReaderTaskCapability {task:'catan-numerals-v1';available:boolean;reason?:string;profile:LocalTaskProfile|null}
export interface NativeNumeralWire {id:'qwen-number-grounding-v1';result:{items:{bbox_2d:number[];text:string|null}[]};deferred:{ref:string;reason:string}[]}
/** Original visible-only provider wire, separate from the validated facts used by the game. */
export type PhysicalUnitClaim='single'|'group'|'unknown';
export interface HostedObservationWire {id:'gemini-game-wire-v1'|'gemini-catan-scene-wire-v1'|'terra-game-wire-v1'|'terra-catan-scene-wire-v1'|'terra-game-wire-v2'|'terra-game-wire-v3';physicalUnits?:Record<string,PhysicalUnitClaim>;providerResponse?:unknown;spatial?:unknown;items:unknown[];deferred:{ref:string;property:string;reason:string}[]}
export interface ReaderIdentity {kind:'local-observation-v1';model:string;modelRevision:string;weightSHA:string;projectorSHA:string;runtimeRevision:string;contextTokens:number;maxOutputTokens:number}
export interface GeminiReaderIdentity {kind:'gemini-game-observation-v1';model:'gemini-3.8-flash';thinkingLevel:'LOW';mediaResolution:'MEDIA_RESOLUTION_HIGH';maxOutputTokens:32768}
export interface TerraReaderIdentity {kind:'terra-game-observation-v1';model:'gpt-6.1-terra';api:'responses';reasoningEffort:'low';imageDetail:'high';maxOutputTokens:32768;adapterVersion:'literal-named-fill-original-v1'|'literal-named-fill-unit-original-v2'|'literal-compact-unit-original-v3'|'literal-named-detail-unit-original-v4'|'literal-named-fill-unit-marks-v5'|'literal-compact-visible-instance-v7';automaticRetries:0;timeoutMs:240000}
/** Terra remains a readable historical receipt identity; new service scans use Luna/high. */
export interface LunaReaderIdentity extends Omit<TerraReaderIdentity,'kind'|'model'|'reasoningEffort'|'automaticRetries'> {kind:'luna-game-observation-v1';model:'gpt-6-luna';reasoningEffort:'high';automaticRetries:0|1}
export interface TerraHighReaderIdentity extends Omit<LunaReaderIdentity,'kind'|'model'|'timeoutMs'> {kind:'terra-high-game-observation-v1';model:'gpt-6.1-terra';timeoutMs:285000}
export type HostedReaderIdentity=GeminiReaderIdentity|TerraReaderIdentity|LunaReaderIdentity|TerraHighReaderIdentity;
export const isHostedReader=(value:unknown):value is {kind:HostedReaderIdentity['kind']}=>!!value&&typeof value==='object'&&'kind' in value&&['gemini-game-observation-v1','terra-game-observation-v1','luna-game-observation-v1','terra-high-game-observation-v1'].includes(String(value.kind));
export type ObservationReaderIdentity=ReaderIdentity|HostedReaderIdentity;
export interface CompileObservationInput {readMode?:ObservationReadMode;readingTarget?:ReadingTarget;pack:GamePack;definition:PhotoDefinition;areaId:string;scope:ObservationScope;images:ObservationImage[];taskId:string;geometryFrameId?:string;referenceSetId?:string;transforms?:import('./photoGeometry').PhotoTransform[]}
// Pure compilation/validation functions are implemented below after focused RED tests.
import {isObject,validateDetailValue} from './readouts/registry';
import {mapObservationRegion,validCropTransform,type PhotoTransform} from './photoGeometry';
const fail=(m:string):never=>{throw new Error(m);};
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const nonempty=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200;
function exact(v:unknown,keys:string[],label:string):Record<string,unknown>{if(!isObject(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))return fail(label+' 형식을 확인하세요.');return v;}
export function compileObservationTask(input:CompileObservationInput):ObservationRequest {
 const {pack,definition:d,areaId,scope,images,taskId}=input,s=pack.runtime?.source;
 if(input.readMode!==undefined&&!validObservationReadMode(input.readMode))return fail('판독 모드를 확인하세요.');
 if(d.version!=='game-photo-definition-v1'||!s||d.gameId!==s.gameId||d.packId!==pack.id||d.packVersion!==pack.version||d.editionId!==s.editionId||d.sourceSHA!==s.sha256||!hash(d.definitionSHA))return fail('게임 판본·source·촬영 정의가 일치하지 않습니다. 기존 기록은 보존됩니다.');
 const areas=readingAreas(pack,d,areaId,input.readingTarget),area=areas[0],scene=input.readingTarget?.mode==='public-scene';if(!area||(!scene&&area.partition!==scope.partition)||(scene&&(scope.partition!=='common_public'||scope.ownerId!==null))||!nonempty(scope.captureEpoch)||(scope.partition==='owner_private'?!nonempty(scope.ownerId):scope.ownerId!==null))return fail('촬영 영역(scope)과 소유 범위를 확인하세요.');
 if(!nonempty(taskId)||images.length!==1||images.some(i=>!nonempty(i.evidenceId)||!nonempty(i.inputId)||!hash(i.sha256)||!Number.isInteger(i.width)||!Number.isInteger(i.height)||i.width<1||i.height<1))return fail('한 원본 사진의 해시·크기를 확인하세요.');
 for(const i of images)if(i.transformId!==null){const t=input.transforms?.find(t=>t.transformId===i.transformId);if(t?.kind==='crop'){if(!validCropTransform(t)||t.inputSHA!==i.sha256||t.inputDimensions.width!==i.width||t.inputDimensions.height!==i.height)return fail('원본 crop 변환을 확인하세요.');continue;}if(d.nativeBridge!=='catan'||area.id!=='board'||scope.partition!=='common_public'||!input.geometryFrameId||!t||t.inputSHA!==i.sha256||!hash(t.sourceSHA)||t.inputDimensions.width!==i.width||t.inputDimensions.height!==i.height||!t.panels.length||new Set(t.panels.map(p=>p.panelRef)).size!==t.panels.length)return fail('확인한 카탄 frame·atlas 해시·패널을 확인하세요.');}
 if(input.referenceSetId)return fail('허용된 실물 참조 집합이 없습니다.');
 const areaComponents=[...new Set(areas.flatMap(a=>a.componentIds))];const components=areaComponents.filter(id=>d.components.some(c=>c.id===id));if(components.length!==areaComponents.length||!components.length)return fail('촬영 정의의 구성물 연결을 확인하세요.');
 for(const id of components){const c=d.components.find(c=>c.id===id)!;if(new Set(c.properties.map(f=>f.id)).size!==c.properties.length||c.properties.some(f=>f.acquisition!=='visible'||c.manualPropertyIds.includes(f.id)))return fail('관측과 수동 입력 정의가 섞여 있습니다.');}
 const restoration=scene?compatibleRestoration(pack):undefined,policy=restoration?{...restoration}:pack.photoReadingPolicy;
 if(policy&&(policy.definitionSHA!==d.definitionSHA||!hash(policy.policySHA)||!policy.areas[areaId]))return fail('게임 판독 정책의 정의·영역이 일치하지 않습니다.');
 if(policy)for(const a of areas)for(const id of a.componentIds){const selected=policy.areas[a.id]?.[id],fields=d.components.find(c=>c.id===id)!.properties;if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(p=>!fields.some(f=>f.id===p)))return fail('게임 판독 정책의 영역별 속성을 확인하세요.');}
 const allowedPropertyIds=Object.fromEntries(components.map(id=>{
  const fields=d.components.find(c=>c.id===id)!.properties,selected=policy?[...new Set(areas.flatMap(a=>policy.areas[a.id]?.[id]??[]))]:fields.map(f=>f.id);
  if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(p=>!fields.some(f=>f.id===p)))return fail('게임 판독 정책 속성을 확인하세요.');
  return [id,[...selected]];
 }));
 const areaPropertyIds=scene&&policy?Object.fromEntries(areas.map(a=>[a.id,Object.fromEntries(a.componentIds.map(id=>[id,[...(policy.areas[a.id]?.[id]??[])]]))])):undefined;
 const propertyApplicability={...(areaPropertyIds?{areaPropertyIds}:{}),frontOnlyPropertyIds:Object.fromEntries(components.map(id=>[id,d.components.find(c=>c.id===id)!.properties.filter(f=>f.faceOnly&&allowedPropertyIds[id].includes(f.id)).map(f=>f.id)])),...(policy?{policySHA:policy.policySHA}:{})};
 const componentLabels=Object.fromEntries((pack.runtime?.components??[]).filter(c=>components.includes(c.id)).map(c=>[c.id,{name:c.name,physicalType:c.kind}]));
 return {...(input.readMode?{readMode:input.readMode,readModePolicy:'visible-values-v1' as const}:{}),...(input.readingTarget?{readingTarget:structuredClone(input.readingTarget)}:{}),version:OBSERVATION_VERSION,taskId,gameId:d.gameId,packId:d.packId,editionId:d.editionId,sourceSHA:d.sourceSHA,definitionSHA:d.definitionSHA,areaId,scope:structuredClone(scope),images:structuredClone(images),allowedComponents:[...components],allowedPropertyIds,propertyApplicability,componentLabels,referenceSetId:null,geometryFrameId:input.geometryFrameId??null};
}
export function validateObservationResult(raw:unknown,request:ObservationRequest,definition:PhotoDefinition,transforms:PhotoTransform[]=[]):ObservationResult {
 const r=exact(raw,['version','observations','coverage','completion',...(isObject(raw)&&Object.hasOwn(raw,'spatial')?['spatial']:[])],'관측 응답');if(r.version!==OBSERVATION_VERSION||r.coverage!=='partial'||r.completion!=='complete')return fail('관측 응답이 완료되지 않았거나 잘렸습니다(truncated). 기존 기록은 보존됩니다.');
 if(request.definitionSHA!==definition.definitionSHA||!Array.isArray(r.observations)||r.observations.length>512)return fail('관측 정의와 결과를 확인하세요.');const seen=new Set<string>();
 for(const item of r.observations){const o=exact(item,['ref','imageIndex','panelRef','componentId','bbox','face','quantity','rotationDegrees','properties','referenceCandidates',...(isObject(item)&&Object.hasOwn(item,'sourceAreaId')?['sourceAreaId']:[])],'실물 관측');
  if(o.sourceAreaId!==undefined&&o.sourceAreaId!==null&&(!request.readingTarget||request.readingTarget.mode!=='public-scene'||!request.readingTarget.areaIds.includes(o.sourceAreaId as string)||!definition.areas.some(a=>a.id===o.sourceAreaId&&a.partition!=='owner_private'&&a.componentIds.includes(o.componentId as string))))return fail('관측 영역의 연결을 확인하세요.');
  if(!nonempty(o.ref)||seen.has(o.ref as string))return fail('실물 관측 ref가 중복됐습니다.');seen.add(o.ref as string);
  if(!Number.isInteger(o.imageIndex)||(o.imageIndex as number)<0||!request.images[o.imageIndex as number])return fail('보낸 원본/패널만 관측할 수 있습니다.');
  const image=request.images[o.imageIndex as number],transform=image.transformId?transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256):undefined;
  if(image.transformId?(!transform||(transform.kind==='crop'?(!validCropTransform(transform)||o.panelRef!==null):(typeof o.panelRef!=='string'||!transform.panels.some(p=>p.panelRef===o.panelRef)))):o.panelRef!==null)return fail('보낸 원본/패널만 관측할 수 있습니다.');
  if(o.componentId!==null&&!request.allowedComponents.includes(o.componentId as string)||!['front','back','unknown'].includes(o.face as string)||o.quantity!==null&&(!Number.isSafeInteger(o.quantity)||(o.quantity as number)<0)||o.rotationDegrees!==null&&(typeof o.rotationDegrees!=='number'||!Number.isFinite(o.rotationDegrees)))return fail('관측 종류·면·수량을 확인하세요. 모름은 null입니다.');
  if(o.bbox!==null){const b=exact(o.bbox,['x','y','width','height'],'원본 bbox');if(!Object.values(b).every(v=>typeof v==='number'&&Number.isFinite(v))||(b.x as number)<0||(b.y as number)<0||(b.width as number)<=0||(b.height as number)<=0||(b.x as number)+(b.width as number)>1.00000001||(b.y as number)+(b.height as number)>1.00000001)return fail('원본 bbox 범위를 확인하세요.');}
  if(image.transformId&&o.bbox!==null)mapObservationRegion(o as unknown as LiteralObservation,request,transforms);
  if(!isObject(o.properties)||!Array.isArray(o.referenceCandidates)||o.referenceCandidates.length)return fail('관측 속성/실물 참조를 확인하세요.');
  const c=definition.components.find(c=>c.id===o.componentId);
  for(const [id,rawProperty]of Object.entries(o.properties)){const f=c?.properties.find(f=>f.id===id);if(!f||!request.allowedPropertyIds[c!.id]?.includes(id)||f.acquisition!=='visible'||c!.manualPropertyIds.includes(id))return fail('사진으로 수동 필드 또는 다른 영역을 확정할 수 없습니다.');
   if(!isObject(rawProperty))return fail('관측 속성 형식을 확인하세요.');
   if(rawProperty.state==='unknown'){const u=exact(rawProperty,['state','value','reason'],'미확인 속성');if(u.value!==null||!['unreadable','occluded','out-of-frame','not-present-unconfirmed','wrong-face','ambiguous','unsupported'].includes(u.reason as string))return fail('미확인 이유를 확인하세요.');}
   else{const p=exact(rawProperty,['state','value'],'관측 속성');if(p.state!=='observed'||p.value===null||f.faceOnly&&o.face!=='front')return fail('보이지 않는 앞면/속성은 확정할 수 없습니다.');validateDetailValue(p.value,f);if(f.options&&f.type!=='marks'&&!f.options.some(x=>x.value===p.value))return fail('관측 값 도메인을 확인하세요.');if(id==='face'&&p.value!==o.face||id==='quantity'&&p.value!==o.quantity)return fail('면/수량 중복 값이 일치하지 않습니다.');}
  }
 }
 if(Object.hasOwn(r,'spatial')&&!request.spatial)return fail('요청하지 않은 공간 응답입니다.');
 const checked=structuredClone(raw) as ObservationResult;
 if(checked.spatial){const {deferred,...payload}=checked.spatial;const validated=validateSpatialResult(payload,request,checked);validated.deferred=[...new Map([...(Array.isArray(deferred)?deferred.filter(d=>d&&typeof d.section==='string'&&Number.isSafeInteger(d.index)&&typeof d.reason==='string'):[]),...validated.deferred].map(d=>[JSON.stringify(d),d])).values()];checked.spatial=validated;}
 return checked;
}
export interface ObservationReceipt {version:typeof OBSERVATION_VERSION;request:ObservationRequest;result:ObservationResult;reader:ObservationReaderIdentity;frame:import('./photoGeometry').ConfirmedPhotoFrame|null;transforms:import('./photoGeometry').PhotoTransform[];geometryCandidates:GeometryCandidate[];componentRefs:Record<string,string>;taskProfile?:LocalTaskProfile;sourceImageSHA?:string;nativeWire?:NativeNumeralWire;hostedWire?:HostedObservationWire;scanBundle?:import('./scanObservation').ScanBundleReceipt;scanUnitId?:string}
export interface LocalReaderCapabilities {version:'local-reader-capabilities-v1';readers:({kind:'local-observation-v1';available:boolean;cloudSupported:false;reason?:string;identity:ReaderIdentity|null;tasks?:LocalReaderTaskCapability[]}|{kind:HostedReaderIdentity['kind'];available:boolean;cloudSupported:true;reason?:string;identity:HostedReaderIdentity|null})[];definitions:{indexSHA:string;version:'game-photo-definitions-v1';count:number}}
