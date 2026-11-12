import type {Assertion} from './types.ts';
import type {ObservationUnknownReason,ObservationRequest,LiteralObservation,PhotoDefinition} from './lightweightRecognition.ts';

/** Why a reader left a value empty, in the words the correction screen shows. The reason comes from the reader's own receipt, never from a guess. */
export const GAP_REASON:Record<ObservationUnknownReason|'quantity',string>={unreadable:'읽기 어려움',occluded:'가림','out-of-frame':'사진 밖','not-present-unconfirmed':'유무 미확인','wrong-face':'앞면 아님',ambiguous:'구분 어려움',unsupported:'관측 미지원',quantity:'수량 모름'};
export interface ObservationGap {property:string|null;reason:ObservationUnknownReason|'quantity'}

/** Whether a requested value is needed for the observed area and face. Unknown area/face never proves inapplicability.
 * New receipts carry front-only IDs. A caller may pass the exact pinned definition for older receipts.
 */
export function observationPropertyApplicable(request:Pick<ObservationRequest,'allowedPropertyIds'|'propertyApplicability'>&Partial<Pick<ObservationRequest,'definitionSHA'|'readingTarget'>>,observation:Pick<LiteralObservation,'componentId'|'face'|'properties'>&Partial<Pick<LiteralObservation,'sourceAreaId'>>,property:string,definition?:PhotoDefinition):boolean{
 const component=observation.componentId,asked=component?request.allowedPropertyIds?.[component]:undefined;
 if(request.allowedPropertyIds&&(!asked||!asked.includes(property)))return false;
 const sourceAreaId=observation.sourceAreaId,target=request.readingTarget;
 // Only a validated explicit scene area can narrow a union. Unassigned and historical observations retain the union.
 const areaFields=sourceAreaId&&target?.mode==='public-scene'&&target.areaIds.includes(sourceAreaId)&&component?request.propertyApplicability?.areaPropertyIds?.[sourceAreaId]?.[component]:undefined;
 if(areaFields&&!areaFields.includes(property))return false;
 const pinnedDefinition=definition&&request.definitionSHA===definition.definitionSHA?definition:undefined;
 const frontOnly=component&&(request.propertyApplicability?.frontOnlyPropertyIds[component]?.includes(property)||pinnedDefinition?.components.find(c=>c.id===component)?.properties.find(p=>p.id===property)?.faceOnly);
 const value=observation.properties[property];
 // Historical wrong-face diagnostics explicitly encode the same applicability without changing the old receipt.
 return !(observation.face==='back'&&(frontOnly||value?.state==='unknown'&&value.reason==='wrong-face'));
}

/** Per assembled piece: the properties the reader reported as unknown, plus an unknown quantity. Keys are the candidate's piece IDs (receipt componentRefs). */
export function observationGaps(assertion:Pick<Assertion,'observationReceipts'>,definition?:PhotoDefinition):Map<string,ObservationGap[]>{
 const gaps=new Map<string,ObservationGap[]>();
 for(const receipt of assertion.observationReceipts??[])for(const o of receipt?.result?.observations??[]){
  const id=receipt.componentRefs?.[o.ref];if(!id)continue;
  const list:ObservationGap[]=Object.entries(o.properties??{}).filter(([property,value])=>!!value&&observationPropertyApplicable(receipt.request,o,property,definition)).flatMap(([property,value])=>value.state==='unknown'?[{property,reason:value.reason}]:[]);
  if(o.quantity===null)list.push({property:null,reason:'quantity'});
  if(list.length)gaps.set(id,list);
 }
 return gaps;
}
