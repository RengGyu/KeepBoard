import type {Value} from '../shared/types';
import {rummikubAnswers,type RummikubScene} from '../shared/rummikub';

export interface RummikubSaveOptions {acceptCandidate?:boolean}
export const PHOTO_INPUT_SAVE_OPTIONS:RummikubSaveOptions={acceptCandidate:false};
export interface RummikubDraftInput {
 scene:RummikubScene;ownerId?:string;dirty:boolean;candidate:boolean;
 opened:{value:string;saved:string};pending:{value:string;saved:string};
}
/** Photo acquisition may preserve edits, but is not confirmation of an untouched AI candidate. */
export function rummikubDraftAnswers(input:RummikubDraftInput,options:RummikubSaveOptions={}){
 const {scene,ownerId,dirty,candidate,opened,pending}=input;
 const answers:{field:string;value:Value;ownerId?:string}[]=[];
 if(dirty||(candidate&&options.acceptCandidate!==false))answers.push(...rummikubAnswers(scene,ownerId));
 if(ownerId&&opened.value!==opened.saved)answers.push({field:'opened',ownerId,value:opened.value===''?null:opened.value==='true'});
 if(!ownerId&&pending.value!==pending.saved)answers.push({field:'pending',value:pending.value||null});
 return answers;
}
