import type {Assertion} from './types.ts';
import type {ObservationUnknownReason} from './lightweightRecognition.ts';

/** Why a reader left a value empty, in the words the correction screen shows. The reason comes from the reader's own receipt, never from a guess. */
export const GAP_REASON:Record<ObservationUnknownReason|'quantity',string>={unreadable:'읽기 어려움',occluded:'가림','out-of-frame':'사진 밖','not-present-unconfirmed':'유무 미확인','wrong-face':'앞면 아님',ambiguous:'구분 어려움',unsupported:'관측 미지원',quantity:'수량 모름'};
export interface ObservationGap {property:string|null;reason:ObservationUnknownReason|'quantity'}

/** Per assembled piece: the properties the reader reported as unknown, plus an unknown quantity. Keys are the candidate's piece IDs (receipt componentRefs). */
export function observationGaps(assertion:Pick<Assertion,'observationReceipts'>):Map<string,ObservationGap[]>{
 const gaps=new Map<string,ObservationGap[]>();
 for(const receipt of assertion.observationReceipts??[])for(const o of receipt?.result?.observations??[]){
  const id=receipt.componentRefs?.[o.ref];if(!id)continue;
  const list:ObservationGap[]=Object.entries(o.properties??{}).filter(([,value])=>!!value).flatMap(([property,value])=>value.state==='unknown'?[{property,reason:value.reason}]:[]);
  if(o.quantity===null)list.push({property:null,reason:'quantity'});
  if(list.length)gaps.set(id,list);
 }
 return gaps;
}
