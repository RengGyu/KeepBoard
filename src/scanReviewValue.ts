import type {PropertySpec} from '../shared/readouts/types';

export const SCAN_REVIEW_NEEDED='사진 참고';
/** Presentation only: null and domain-declared absence/unknown share a label, never a stored value. */
export function scanReviewValue(value:unknown,field?:Pick<PropertySpec,'type'|'options'>,render:(value:unknown)=>string=literal):string {
 const unconfirmed=field?.type==='boolean'&&value===false||field?.type==='enum'&&field.options?.some(o=>o.value===value&&['없음','모름'].includes(o.label));
 if(value===null||value===undefined||unconfirmed)return SCAN_REVIEW_NEEDED;
 return render(value);
}
function literal(value:unknown):string {
 if(typeof value==='boolean')return value?'있음':'false'; // No field domain: do not infer absence.
 return typeof value==='object'?JSON.stringify(value):String(value);
}
