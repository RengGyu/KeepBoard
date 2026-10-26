import type {NativeObservationReview,ObservationReviewAnswer} from '../shared/observationReview';
import {rummikubAnswers,allRummikubTiles,type RummikubScene} from '../shared/rummikub';

export interface RummikubSaveOptions {acceptCandidate?:boolean}
export const PHOTO_INPUT_SAVE_OPTIONS:RummikubSaveOptions={acceptCandidate:false};
export interface RummikubDraftInput {
 scene:RummikubScene;ownerId?:string;dirty:boolean;candidate:boolean;requiresReview?:boolean;observationReview?:NativeObservationReview;
 opened:{value:string;saved:string};pending:{value:string;saved:string};
}
/** Photo acquisition may preserve edits, but is not confirmation of an untouched AI candidate. */
export function rummikubDraftAnswers(input:RummikubDraftInput,options:RummikubSaveOptions={}){
 const {scene,ownerId,dirty,candidate,opened,pending}=input;
 const answers:ObservationReviewAnswer[]=[];
 if(dirty||(candidate&&options.acceptCandidate!==false)){if(input.requiresReview&&!input.observationReview)throw Error('기존 판과 함께 정정을 선택한 뒤 새 사진 결과를 반영해 주세요. 초안은 남아 있어요.');answers.push(...rummikubAnswers(scene,ownerId).map(a=>input.observationReview?{...a,observationReview:input.observationReview}:a));}
 if(ownerId&&opened.value!==opened.saved)answers.push({field:'opened',ownerId,value:opened.value===''?null:opened.value==='true'});
 if(!ownerId&&pending.value!==pending.saved)answers.push({field:'pending',value:pending.value||null});
 return answers;
}

/** An explicit review draft, not physical identity matching: fresh observations stay loose for correction. */
export function prepareRummikubReview(base:RummikubScene,fresh:RummikubScene):RummikubScene {
 if(base.ownerId!==fresh.ownerId)throw Error('같은 소유 범위의 타일만 함께 정정할 수 있어요.');
 const ids=new Set(allRummikubTiles(base).map(t=>t.id));if(allRummikubTiles(fresh).some(t=>ids.has(t.id)))throw Error('새 사진 후보와 기존 타일 ID가 겹쳐요. 원본 후보를 확인해 주세요.');
 return {...structuredClone(base),coverage:'partial',loose:[...structuredClone(base.loose),...structuredClone(allRummikubTiles(fresh))]};
}
