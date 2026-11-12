import type {LiteralObservation,ObservationRequest,PhotoDefinition} from './lightweightRecognition';
import {observationPropertyApplicable} from './observationGaps';

/** A face/back marker alone is not a game value. Availability does not certify truth. */
export function usefulPreviewValues(observation:LiteralObservation,definition:PhotoDefinition,request?:ObservationRequest){
 const properties=definition.components.find(c=>c.id===observation.componentId)?.properties??[];
 return Object.entries(observation.properties).filter(([id,p])=>
  id!=='face'&&properties.some(f=>f.id===id)&&p.state==='observed'&&
  p.value!==null&&p.value!==undefined&&(typeof p.value!=='string'||p.value.trim().length>0)&&
  (!request||observationPropertyApplicable(request,observation,id,definition))
 );
}
