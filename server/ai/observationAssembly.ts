import {randomUUID} from 'node:crypto';
import type {Assertion,AnalysisResult,GamePack,Value} from '../../shared/types';
import {normalizeSceneDetailed,type SceneComponent,type SceneKind} from '../../shared/scene';
import {normalizeRummikubDetailed,type RummikubTile,type RummikubScene} from '../../shared/rummikub';
import {PHOTO_PUBLIC,PHOTO_OWNER} from '../../shared/recognition';
import {runtimeBinding} from '../../shared/gameEssentials';
import {emptyGameReadout,validateGameReadout} from '../../shared/readouts/registry';
import {emptySplendorObservation,unknownGemCounts,validateSplendorObservation,SPLENDOR_GEMS,type SplendorGem,type SplendorKind} from '../../shared/splendor';
import {validateGenericRecord,type GenericPiece} from '../../shared/genericRecord';
import {validateObservationResult,OBSERVATION_VERSION,type ObservationRequest,type ObservationResult,type PhotoDefinition,type ObservationReaderIdentity,type ObservationReceipt,type LiteralObservation,type LocalTaskProfile,type NativeNumeralWire,type HostedObservationWire} from '../../shared/lightweightRecognition';
import {geometryCandidates,mapObservationRegion,type ConfirmedPhotoFrame,type PhotoTransform} from '../../shared/photoGeometry';
export interface AssemblyInput {request:ObservationRequest;result:ObservationResult;definition:PhotoDefinition;pack:GamePack;turnInstanceId:string;reader:ObservationReaderIdentity;frame?:ConfirmedPhotoFrame;transforms?:PhotoTransform[];taskProfile?:LocalTaskProfile;sourceImageSHA?:string;nativeWire?:NativeNumeralWire;hostedWire?:HostedObservationWire}
const literal=(o:LiteralObservation,key:string)=>o.properties[key]?.state==='observed'?o.properties[key].value:null;
export function assembleObservations(input:AssemblyInput):AnalysisResult {
 const {request,definition,pack}=input,transforms=input.transforms??[],result=validateObservationResult(input.result,request,definition,transforms),ownerId=request.scope.ownerId??undefined,area=definition.areas.find(a=>a.id===request.areaId)!,groups=new Map<string,any[]>(),refs:Record<string,string>={},warnings:string[]=[];
 const add=(field:string,value:any)=>{groups.set(field,[...(groups.get(field)??[]),value]);};
 for(const o of result.observations){
  if(definition.nativeBridge==='rummikub'&&o.componentId==='racks'){
   warnings.push(`${o.ref}: 받침대 관측은 원관측으로 보존하며 타일로 추가하지 않습니다.`);
   continue;
  }
  const image=request.images[o.imageIndex],region=mapObservationRegion(o,request,transforms),evidenceId=image.evidenceId,id=randomUUID();refs[o.ref]=id;
  if(definition.nativeBridge==='catan'){
   const kind=(o.componentId??'unknown') as SceneKind,c:SceneComponent={id,kind,variant:literal(o,'variant') as string|null,ownerId:null,quantity:o.quantity,location:{type:'unplaced',id:null},region,evidenceId,face:o.face==='unknown'?null:o.face,observedColor:literal(o,'observedColor') as string|null};
   if(kind==='number-token')c.number=literal(o,'number') as number|null;
   if(kind==='harbor')c.ratio=literal(o,'ratio') as number|null;
   add(ownerId?'player.components.observed':'components.observed',c);
  }else if(definition.nativeBridge==='rummikub'){
   const tile:RummikubTile={id,kind:o.componentId==='numbers'?'number':o.componentId==='jokers'?'joker':'unknown',color:literal(o,'color') as RummikubTile['color'],number:o.componentId==='numbers'?literal(o,'number') as number|null:null,face:o.face,representedColor:null,representedNumber:null,evidenceIds:[evidenceId],region,note:''};
   add(ownerId?'rack.scene':'table.scene',tile);
  }else{
   const field=area.fields.find(key=>{const f=pack.fields.find(f=>f.key===key),b=runtimeBinding(pack,key);return f&&b?.editor==='component-catalog'&&(!o.componentId||b.componentIds.includes(o.componentId))&&(ownerId?f.scope==='player'&&f.visibility==='owner':f.scope==='public'&&f.visibility==='public');})??(ownerId?PHOTO_OWNER:PHOTO_PUBLIC);
   if(!runtimeBinding(pack,field))throw new Error('사진 실물의 허용 목적지 양식이 없습니다. 기존 기록은 보존됩니다.');
   const piece:GenericPiece={id,componentId:o.componentId,variant:null,quantity:o.quantity,label:o.componentId?'':'미확인 실물',anchor:'',evidenceId,region};
   if(definition.nativeBridge==='splendor'){
    const fallback:SplendorKind=o.componentId==='nobles'?'noble':o.componentId==='chips'?'token':o.componentId==='development'?o.face==='back'?'deck':o.face==='front'?'development':null:null;
    let kind=(literal(o,'kind') as SplendorKind)??fallback;
    if(kind==='deck'&&o.face==='front'||kind==='development'&&o.face==='back'){kind=null;warnings.push(`${o.ref} · kind: 관측 종류와 앞·뒤가 충돌해 종류 확인을 보류했습니다. 원관측은 보존됩니다.`);}
    const readout=emptySplendorObservation(kind),compatible:Record<string,boolean>={points:kind==='development'||kind==='noble',bonus:kind==='development',cost:kind==='development',requirements:kind==='noble',color:kind==='token'||kind==='deck',level:o.componentId==='development'};
    const deferred=(key:string)=>warnings.push(`${o.ref} · ${key}: 확인된 종류와 함께 표현할 수 없어 이 속성만 보류했습니다. 원관측은 보존됩니다.`);
    for(const key of ['points','bonus','level','color']as const){const value=literal(o,key);if(value!==null){if(compatible[key])(readout as any)[key]=value;else deferred(key);}}
    for(const key of ['cost','requirements']as const){
     const value=literal(o,key);
     if(value!==null){const counts=unknownGemCounts();for(const row of value as {symbol:string;value:number|null}[]){if(!SPLENDOR_GEMS.includes(row.symbol as SplendorGem))throw new Error('관측 보석 기호를 확인하세요.');counts[row.symbol as SplendorGem]=row.value;}if(compatible[key])readout[key]=counts;else deferred(key);}
    }
    piece.readout=validateSplendorObservation(readout,piece.componentId);
   }else{
    const readout=emptyGameReadout(pack,o.componentId);
    for(const [key,property]of Object.entries(o.properties))if(property.state==='observed'){readout.values[key]=property.value as any;readout.sources[key]='observation';}
    if(Object.hasOwn(readout.values,'face')&&readout.values.face===null&&o.face!=='unknown'){readout.values.face=o.face;readout.sources.face='observation';}
    piece.readout=validateGameReadout(readout,pack,o.componentId,evidenceId,{mode:'ai'});
   }
   add(field,piece);
  }
 }
 const receipt:ObservationReceipt={version:OBSERVATION_VERSION,request:structuredClone(request),result,reader:structuredClone(input.reader),frame:input.frame??null,transforms:structuredClone(transforms),geometryCandidates:input.frame?geometryCandidates(request,result,input.frame,transforms):[],componentRefs:refs,...(input.taskProfile?{taskProfile:structuredClone(input.taskProfile)}:{}),...(input.sourceImageSHA?{sourceImageSHA:input.sourceImageSHA}:{}),...(input.nativeWire?{nativeWire:structuredClone(input.nativeWire)}:{}),...(input.hostedWire?{hostedWire:structuredClone(input.hostedWire)}:{})};
 const assertions:Assertion[]=[];
 for(const [field,items]of groups){
  let value:unknown;
  if(definition.nativeBridge==='catan')value=normalizeSceneDetailed({version:2,coverage:'partial',coverageByLayer:{},components:items},request.images.map(i=>i.evidenceId)).scene;
  else if(definition.nativeBridge==='rummikub'){
   const raw:RummikubScene={version:'rummikub-classic-v1',ownerId:ownerId??null,coverage:'partial',groups:[],loose:items},n=normalizeRummikubDetailed(raw,{ownerId,evidenceIds:request.images.map(i=>i.evidenceId),colorPolicy:'classic'});
   if(!n.recognized)throw new Error('타일 관측 형식을 확인하세요.');value=n.scene;
  }else value=validateGenericRecord({version:'game-component-record-v1',pieces:items}as unknown as Value,pack,field,request.images.map(i=>i.evidenceId),{mode:'ai'});
  assertions.push({id:randomUUID(),field,value:value as Value,ownerId,basis:'observation',status:'candidate',evidenceIds:[...new Set(items.flatMap((v:any)=>v.evidenceId?[v.evidenceId]:v.evidenceIds??[]))],updatedAt:new Date().toISOString(),turnInstanceId:input.turnInstanceId,observationReceipts:[receipt]});
 }
 if(!result.observations.length)warnings.push('확정할 관측값이 없습니다. 원본과 기존 기록은 유지됩니다.');
 const dropped=input.hostedWire?.deferred.filter(d=>d.property==='row').length??0;if(dropped)warnings.push('형식이 맞지 않는 실물 '+dropped+'개는 제외했습니다. 원응답은 보존됩니다.');
 if(input.hostedWire?.deferred.some(d=>d.reason==='provider-output-truncated'))warnings.push('답이 길어 사진의 일부 실물만 읽었습니다. 나머지는 직접 추가하거나 사진을 나눠 찍어 주세요.');
 const deferred=input.nativeWire?.deferred.length??0;if(deferred)warnings.push('패널 경계를 확인할 수 없는 숫자 관측 '+deferred+'개를 보류했습니다. 원응답은 보존됩니다.');
 const candidateObjects=[...groups.values()].reduce((n,items)=>n+items.length,0);
 return {assertions,summary:(input.reader.kind==='local-observation-v1'?'로컬':input.reader.kind==='terra-high-game-observation-v1'?'Terra high':input.reader.kind==='luna-game-observation-v1'?'Luna high':input.reader.kind==='terra-game-observation-v1'?'Terra':'Gemini')+' 사진 관측으로 '+candidateObjects+'개 '+(input.taskProfile?'숫자':'실물')+' 후보를 만들었습니다. 읽지 못한 값은 ?로 표시됩니다.'+(warnings.length?'\n'+warnings.join('\n'):''),mode:'live',warnings,observationReceipts:[receipt]};
}
