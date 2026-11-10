import {observationPropertyApplicable} from '../shared/observationGaps';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {Assertion} from '../shared/types';
const UNREADABLE=new Set(['unreadable','occluded','ambiguous']);
const MIN_OBJECTS=3,MIN_SHARE=1/3;
// Side notes about a piece; not knowing them is no reason to ask for another photo.
const DESCRIPTIVE=new Set(['observedColor','face','quantity']);
/** Common rule for every game: ask for another photo when a real share of what was read could not be made out. */
export function readingGaps(assertions:readonly Assertion[],ownerId?:string,definition?:PhotoDefinition){
 let total=0,unread=0;
 for(const a of assertions){
  if(a.ownerId!==ownerId)continue;
  const receipt=a.observationReceipts?.at(-1);for(const o of receipt?.result?.observations??[]){total++;if(o.componentId===null||Object.entries(o.properties).some(([id,p])=>(!receipt?.request||observationPropertyApplicable(receipt.request,o,id,definition))&&!DESCRIPTIVE.has(id)&&p.state==='unknown'&&UNREADABLE.has(p.reason)))unread++;}
 }
 return unread>=MIN_OBJECTS&&unread/total>=MIN_SHARE?{unread,total}:null;
}
