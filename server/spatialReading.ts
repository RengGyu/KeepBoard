import {createHash} from 'node:crypto';
import data from '../game-photo-definitions/spatial/index.json';
import {canonicalJSON} from './photoDefinitions';
import {selectSpatialRequest,type SpatialDefinition} from '../shared/spatialDefinition';
import type {GamePack} from '../shared/types';
import type {PhotoDefinition,ObservationRequest} from '../shared/lightweightRecognition';
export const spatialReadingEnabled=()=>process.env.KEEPBOARD_SPATIAL_READING==='1';
/** One opt-in switch. Off means the old compiled request is returned untouched. */
export function attachSpatialReading(request:ObservationRequest,pack:GamePack,definition:PhotoDefinition,playerCount?:number):ObservationRequest{
 if(request.readMode==='values'||request.readMode==='boxes')return request;
 if(request.readMode!=='cells'&&!spatialReadingEnabled()&&!(request.readingTarget?.mode==='public-scene'&&pack.restorationPolicy?.canonicalSpatial&&pack.restorationPolicy.definitionSHA===definition.definitionSHA))return request;
 const d=(data.definitions as unknown as SpatialDefinition[]).find(d=>d.gameId===request.gameId&&d.packVersion===pack.version&&d.sourceSHA===request.sourceSHA&&d.photoDefinitionSHA===request.definitionSHA);
 if(!d||d.status==='excluded'){if(request.readMode==='cells')throw Error('이 영역에 호환되는 고정 칸 template가 없습니다.');return request;}
 const {definitionSHA,...body}=d;if(createHash('sha256').update(canonicalJSON(body)).digest('hex')!==definitionSHA)throw Error('공간 정의 해시가 다릅니다. 기존 기록은 보존됩니다.');
 if(createHash('sha256').update(canonicalJSON(data.responseSchema)).digest('hex')!==d.responseSchemaSHA)throw Error('공간 응답 스키마 해시가 다릅니다.');
 let spatial=selectSpatialRequest(d,pack,definition,request,playerCount);
 if(request.readMode==='cells'){
  if(!spatial?.frames.some(f=>f.areas.some(a=>a.mode==='slot'&&a.addresses.length)))throw Error('이 영역에 호환되는 고정 칸 template가 없습니다.');
  spatial={...spatial,frames:spatial.frames.map(f=>({...f,areas:f.areas.filter(a=>a.mode==='slot'&&a.addresses.length)})).filter(f=>f.areas.length),structuralNamespaces:[]};
 }
 return spatial?{...request,spatial}:request;
}
