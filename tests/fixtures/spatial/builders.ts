import assert from 'node:assert/strict';
import {catalogPacks} from '../../../gamepacks/catalog';import {effectiveRecognitionPack} from '../../../shared/recognition';import {photoDefinition} from '../../../server/photoDefinitions';import {attachSpatialReading} from '../../../server/spatialReading';
import {compileObservationTask,type ObservationRequest} from '../../../shared/lightweightRecognition';import {decodeLiteralObservationPayload} from '../../../server/ai/geminiGameReader';import {TERRA_HIGH_IDENTITY} from '../../../server/ai/terraGameReader';import {assembleObservations} from '../../../server/ai/observationAssembly';import type {GenericRecord} from '../../../shared/genericRecord';import {createHash} from 'node:crypto';
export const image={evidenceId:'synthetic-photo',inputId:'synthetic-photo',sha256:'a'.repeat(64),width:1000,height:800,transformId:null};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function fixture(gameId='blokus',areaId='board'){
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===gameId)!),definition=photoDefinition(pack),a=definition.areas.find(a=>a.id===areaId)!;
 const request=compileObservationTask({pack,definition,areaId,taskId:'off-fixture',scope:{partition:a.partition,ownerId:a.partition==='owner_private'?'synthetic-owner':null,captureEpoch:'synthetic-epoch'},images:[image]});return {pack,definition,request};
}
export function spatialFixture(gameId='blokus',areaId='board'){
 const f=fixture(gameId,areaId);const before=process.env.KEEPBOARD_SPATIAL_READING;try{process.env.KEEPBOARD_SPATIAL_READING='1';f.request=attachSpatialReading(f.request,f.pack,f.definition);}finally{if(before===undefined)delete process.env.KEEPBOARD_SPATIAL_READING;else process.env.KEEPBOARD_SPATIAL_READING=before;}assert(f.request.spatial);return f;
}
export const board=(request:ObservationRequest,areaId?:string,ref='board-1')=>({ref,imageIndex:0,panelRef:null,sourceRegion:{x:.1,y:.1,width:.7,height:.7},templateFrameId:request.spatial!.frames[0].id,templateAreaIds:[areaId??request.spatial!.frames[0].areas[0].id],registrationRef:null,bindingBasis:'visible-landmarks',orientationDegrees:0,visibleIdentifier:'visible printed edge',unknownReasons:[]});
export const placement=(areaId:string,address:string,overrides:Record<string,unknown>={})=>({observationRef:'item-1',boardInstanceRef:'board-1',areaId,namespace:'area-slots',anchorAddress:address,coveredAddresses:[address],coverageComplete:true,boardRotationDegrees:null,reflected:null,unknowns:[],...overrides});
export const spatial=(boards:unknown[],placements:unknown[],extra:Record<string,unknown>={})=>({version:'spatial-observation-v1',boardInstances:boards,placements,relations:[],cellStates:[],...extra});
export const item=(kind='pieces',attributes:unknown[]=[])=>({kind,box_1000:[100,100,200,200],face:'front',quantity:null,attributes});
export function assemble(f:ReturnType<typeof fixture>,raw:unknown){const result=decodeLiteralObservationPayload(raw,f.request,f.definition);const assembled=assembleObservations({request:f.request,result,pack:f.pack,definition:f.definition,reader:TERRA_HIGH_IDENTITY,turnInstanceId:'turn'});return {result,assembled,pieces:assembled.assertions.flatMap(a=>(a.value as unknown as GenericRecord).pieces)};}

