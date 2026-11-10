import {createHash} from 'node:crypto';
import data from '../game-photo-definitions/spatial/index.json';
import {canonicalJSON} from './photoDefinitions';
import {selectSpatialRequest,type SpatialDefinition} from '../shared/spatialDefinition';
import type {GamePack} from '../shared/types';
import type {PhotoDefinition,ObservationRequest} from '../shared/lightweightRecognition';
export const spatialReadingEnabled=()=>process.env.KEEPBOARD_SPATIAL_READING==='1';
/** One opt-in switch. Off means the old compiled request is returned untouched. */
export function attachSpatialReading(request:ObservationRequest,pack:GamePack,definition:PhotoDefinition,playerCount?:number):ObservationRequest{
 if(!spatialReadingEnabled())return request;
 const d=(data.definitions as unknown as SpatialDefinition[]).find(d=>d.gameId===request.gameId&&d.packVersion===pack.version&&d.sourceSHA===request.sourceSHA&&d.photoDefinitionSHA===request.definitionSHA);
 if(!d||d.status==='excluded')return request;
 const {definitionSHA,...body}=d;if(createHash('sha256').update(canonicalJSON(body)).digest('hex')!==definitionSHA)throw Error('공간 정의 해시가 다릅니다. 기존 기록은 보존됩니다.');
 if(createHash('sha256').update(canonicalJSON(data.responseSchema)).digest('hex')!==d.responseSchemaSHA)throw Error('공간 응답 스키마 해시가 다릅니다.');
 const spatial=selectSpatialRequest(d,pack,definition,request,playerCount);return spatial?{...request,spatial}:request;
}
