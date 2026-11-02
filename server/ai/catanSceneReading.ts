import type {AnalysisResult,Evidence,GamePack,Session} from '../../shared/types';
import {normalizeScene,sceneJSONSchema} from '../../shared/scene';
import {OBSERVATION_VERSION,validateObservationResult,type ObservationReceipt,type ObservationRequest,type PhotoDefinition,type HostedReaderIdentity} from '../../shared/lightweightRecognition';
import {observationPrompt} from './prompt';
import {validateDetailValue} from '../../shared/readouts/registry';
import {decodeProviderJSON} from './response';
import {normalizeObservations} from './index';

/** Convert the existing native schema's Gemini-style nullable/type spelling to the same JSON-schema wire used by the reader. */
export function catanSceneResponseSchema(evidence:Evidence[]){
 const convert=(value:unknown):any=>{if(Array.isArray(value))return value.map(convert);if(!value||typeof value!=='object')return value;const source=value as Record<string,unknown>,out:Record<string,unknown>={};for(const [key,item]of Object.entries(source)){if(key==='nullable'||key==='propertyOrdering')continue;out[key]=key==='type'&&typeof item==='string'?item.toLowerCase():convert(item);}if(source.nullable===true){out.type=[out.type,'null'];if(Array.isArray(out.enum))out.enum=[...out.enum,null];}return out;};
 return {type:'object',properties:{summary:{type:'string'},assertions:{type:'array',maxItems:1,items:{type:'object',properties:{field:{type:'string',enum:['board.layout','components.observed']},value:convert(sceneJSONSchema),evidenceIds:{type:'array',items:{type:'string',enum:evidence.map(e=>e.id)}}},required:['field','value','evidenceIds'],additionalProperties:false}},warnings:{type:'array',items:{type:'string'}}},required:['summary','assertions','warnings'],additionalProperties:false};
}
/** Use the existing native scene contract: unlike literal boxes, it includes editable hex/edge/vertex slots. */
export function catanScenePrompt(session:Session,pack:GamePack,evidence:Evidence[]){
 return observationPrompt({...session,assertions:[]},pack,evidence)+
 '\nThe result is shown immediately in the existing illustrated Catan board editor. Use the canonical location schema above for visible terrain, number discs, robber, buildings and roads. Orient the diagram with the photographed top of the island at the top: terrain rows are 3,4,5,4,3 from top to bottom, columns from left to right within a row. Return a known visible slot when readable; use unplaced/null only for an actually uncertain slot. Include face=front when that face is visible (including readable land illustrations and number discs); leave it null when not visible. Retain observedColor separately from ownerId. Do not invent missing pieces or values. Return only board.layout or components.observed assertions for this public board photograph.';
}
export function decodeCatanSceneReading(native:unknown,input:{request:ObservationRequest;definition:PhotoDefinition;pack:GamePack;session:Session;evidence:Evidence[];reader:HostedReaderIdentity;sourceImageSHA:string}):AnalysisResult{
 const {request,definition,pack,session,evidence,reader}=input;
 if(definition.nativeBridge!=='catan'||request.areaId!=='board'||request.scope.partition!=='common_public'||evidence.some(e=>e.ownerId))throw Error('카탄 공용 판 영역을 확인하세요.');
 return decodeCatanScenePayload(decodeProviderJSON(native,'gemini',200),input);
}
export function decodeCatanScenePayload(payload:unknown,input:Parameters<typeof decodeCatanSceneReading>[1],hostedWireId:NonNullable<ObservationReceipt['hostedWire']>['id']='gemini-catan-scene-wire-v1',providerResponse?:unknown):AnalysisResult{
 const {request,definition,pack,session,evidence,reader}=input;
 if(definition.nativeBridge!=='catan'||request.areaId!=='board'||request.scope.partition!=='common_public'||evidence.some(e=>e.ownerId))throw Error('카탄 공용 판 영역을 확인하세요.');
 const wire=payload as {assertions?:unknown[]};
 const normalized=normalizeObservations(wire,pack,evidence,session.turnInstanceId,session.players.map(p=>p.id));
 normalized.assertions=normalized.assertions.filter(a=>!a.ownerId&&['board.layout','components.observed'].includes(a.field));
 const refs:Record<string,string>={};
 const observations=normalized.assertions.flatMap(a=>normalizeScene(a.value).components.map((c,index)=>{
  const ref=`${a.id}:${index}`,component=definition.components.find(d=>d.id===c.kind);refs[ref]=c.id;
  const properties:Record<string,any>={};
  for(const property of component?.properties??[]){
   if(!request.allowedPropertyIds[c.kind]?.includes(property.id)||property.acquisition!=='visible'||component!.manualPropertyIds.includes(property.id))continue;
   // Native scene face is optional. Do not impose the literal reader's front-only proof on that legacy optional field.
   // Keep the native value/placement and raw wire; omit this literal attribute unless an explicit front is present.
   if(property.faceOnly&&c.face!=='front')continue;
   const value=(c as unknown as Record<string,unknown>)[property.id];
   // The native scene already uses the same domain. Retain null as unknown rather than filling a default.
   if(value===null||value===undefined)properties[property.id]={state:'unknown',value:null,reason:'unreadable'};
   else{try{validateDetailValue(value,property);if(property.options&&property.type!=='marks'&&!property.options.some(o=>o.value===value))throw Error();properties[property.id]={state:'observed',value};}catch{properties[property.id]={state:'unknown',value:null,reason:'unsupported'};}}
  }
  return {ref,imageIndex:0,panelRef:null,componentId:component?c.kind:null,bbox:c.region,face:c.face??'unknown',quantity:c.quantity,rotationDegrees:null,properties,referenceCandidates:[]};
 }));
 const result=validateObservationResult({version:OBSERVATION_VERSION,observations,coverage:'partial',completion:'complete'},request,definition);
 const receipt:ObservationReceipt={version:OBSERVATION_VERSION,request:structuredClone(request),result,reader:structuredClone(reader),frame:null,transforms:[],geometryCandidates:[],componentRefs:refs,sourceImageSHA:input.sourceImageSHA,hostedWire:{id:hostedWireId,...(providerResponse?{providerResponse:structuredClone(providerResponse)}:{}),items:structuredClone(wire.assertions??[]),deferred:[]}};
 for(const assertion of normalized.assertions)assertion.observationReceipts=[receipt];
 return {...normalized,observationReceipts:[receipt]};
}
