import type {GamePack} from './types';
import type {ObservationRequest,ObservationPartition,PhotoDefinition} from './lightweightRecognition';
export interface SpatialAddress {address:string;slotId:string;x:number;y:number;w:number;h:number}
export interface SpatialArea {id:string;label:string;mode:string;fieldKey:string;sourceAreaIds:string[];scope:string;visibility:string;acceptedComponents:string[];captureAreaIds:string[];matchingBasis:string;orientation:string;requiresScopedFieldBinding:boolean;activation?:{areaHiddenForPlayerCounts:number[];perSlotPlayerCounts:{slotId:string;playerCounts:number[]}[]};addressing:Record<string,any>;addresses:SpatialAddress[];nameBasis:string;slotNameOverrides:unknown[]}
export interface SpatialFrame {id:string;sourceSHA:string;placementFrame:string;viewBox:[number,number,number,number];areas:SpatialArea[]}
export interface SpatialNamespace {id:string;kind:string;fieldKey:string;sourceAreaIds:string[];entries:{address:string;sourceId:string;label:string}[];policy?:string}
export interface SpatialDefinition {version:'spatial-definition-v1';gameId:string;packId:string;packVersion:string;sourceSHA:string;photoDefinitionSHA:string;spatialDefinitionSHA:string;researchFileSHA:string;schemaSHA256:string;responseSchemaSHA:string;definitionSHA:string;status:string;editionId:string;frames:SpatialFrame[];structuralNamespaces:SpatialNamespace[];prompt:{common:string;gameInstruction:string}}
export interface SpatialRequest {version:'spatial-request-v1';schemaSHA256:string;responseSchemaSHA:string;playerCount?:number;definitionSHA:string;spatialDefinitionSHA:string;sourceSHA:string;photoDefinitionSHA:string;packVersion:string;frames:SpatialFrame[];structuralNamespaces:SpatialNamespace[];prompt:{common:string;gameInstruction:string}}
/** Exact source numbering: masks, signed tracks and named IDs are data, never inferred rectangles. */
export function expandSpatialAddresses(a:Record<string,any>):[string,string][]{
 if(a.kind==='none')return [];
 if(a.kind==='named-enumeration')return a.entries.map((e:any)=>[e.address,e.slotId]);
 const pairs:[string,string][]=[];
 if(a.kind==='row-column')for(const row of a.rows)for(const [lo,hi]of row.columnRanges)for(let c=lo;c<=hi;c++){const fill=(s:string)=>s.replaceAll('{row}',String(row.row)).replaceAll('{column}',String(c));pairs.push([fill(a.address),fill(a.template)]);}
 else if(a.kind==='number-series')for(const seq of a.series)for(const [lo,hi]of seq.ranges)for(let n=lo;n<=hi;n++)pairs.push([seq.addressPrefix+':'+n,seq.prefix+'-'+(n<0?seq.negativePrefix:'')+String(Math.abs(n)).padStart(seq.padding,'0')]);
 else throw Error('알 수 없는 공간 주소 형식입니다.');
 return pairs;
}
export function spatialPartition(a:Pick<SpatialArea,'scope'|'visibility'>):ObservationPartition|null{return a.visibility==='public'?(a.scope==='player'?'player_public':'common_public'):a.scope==='player'&&a.visibility==='owner'?'owner_private':null;}
export function selectSpatialRequest(d:SpatialDefinition,pack:GamePack,photo:PhotoDefinition,request:ObservationRequest,playerCount?:number):SpatialRequest|undefined{
 if(d.status==='excluded')return undefined;
 if(d.packId!==pack.id||d.packVersion!==pack.version||d.sourceSHA!==pack.runtime?.source.sha256||d.photoDefinitionSHA!==photo.definitionSHA||request.definitionSHA!==photo.definitionSHA||d.editionId!==photo.editionId)throw Error('공간 정의의 판본·source·사진 정의가 달라졌습니다.');
 const knownCount=Number.isSafeInteger(playerCount)&&playerCount!>0?playerCount:undefined;
 const frames=d.frames.map(f=>({...f,areas:f.areas.filter(a=>a.mode!=='excluded'&&(!knownCount||!a.activation?.areaHiddenForPlayerCounts.includes(knownCount))&&a.captureAreaIds.includes(request.areaId)&&spatialPartition(a)===request.scope.partition&&a.acceptedComponents.some(id=>request.allowedComponents.includes(id))).map(a=>({...a,addresses:a.addresses.filter(s=>{const counts=a.activation?.perSlotPlayerCounts.find(p=>p.slotId===s.slotId)?.playerCounts;return !knownCount||!counts?.length||counts.includes(knownCount);})}))})).filter(f=>f.areas.length);
 const structuralNamespaces=d.structuralNamespaces.filter(n=>frames.some(f=>f.areas.some(a=>a.fieldKey===n.fieldKey&&a.sourceAreaIds.some(id=>n.sourceAreaIds.includes(id)))));
 return frames.length?{version:'spatial-request-v1',schemaSHA256:d.schemaSHA256,responseSchemaSHA:d.responseSchemaSHA,...(knownCount?{playerCount:knownCount}:{}),definitionSHA:d.definitionSHA,spatialDefinitionSHA:d.spatialDefinitionSHA,sourceSHA:d.sourceSHA,photoDefinitionSHA:d.photoDefinitionSHA,packVersion:d.packVersion,frames:structuredClone(frames),structuralNamespaces:structuredClone(structuralNamespaces),prompt:structuredClone(d.prompt)}:undefined;
}
export function spatialArea(request:SpatialRequest,frameId:string,areaId:string){const frame=request.frames.find(f=>f.id===frameId),area=frame?.areas.find(a=>a.id===areaId);return frame&&area?{frame,area}:undefined;}
