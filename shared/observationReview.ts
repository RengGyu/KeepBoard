import type {Value} from './types';
/** Explicit native whole-draft review. Existing HTTP storage revision / room revisions still apply. */
export interface NativeObservationReview {
 version:'native-observation-review-v1';
 sourceAssertionId:string;
 expectedBaselineAssertionId:string|null;
}
export interface ObservationReviewAnswer {
 field:string;
 value:Value;
 ownerId?:string;
 observationReview?:NativeObservationReview;
}
