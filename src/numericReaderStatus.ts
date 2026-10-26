import type {AnalysisJob} from '../shared/analysisJobs';
import type {ObservationReceipt} from '../shared/lightweightRecognition';

export function numericReceiptSummary(receipts:ObservationReceipt[]=[]){
 const numeric=receipts.filter(r=>r.taskProfile?.id==='catan-numerals-v1');
 return {numeric:numeric.length>0,candidates:numeric.reduce((n,r)=>n+r.result.observations.length,0),deferred:numeric.reduce((n,r)=>n+(r.nativeWire?.deferred.length??0),0)};
}
/** Label the persisted job intent, never the controls' current selection. */
export function numericJobMessage(job:AnalysisJob):string|undefined{
 const summary=numericReceiptSummary(job.observationReceipts);
 if(job.taskProfile?.id!=='catan-numerals-v1'&&!summary.numeric)return;
 if(job.state==='queued')return '숫자 판독 작업을 기다리고 있어요.';
 if(job.state==='running')return '숫자 후보를 읽고 있어요. 전체 판을 판독하는 작업은 아니에요.';
 if(job.state==='failed')return '숫자 읽기에 실패했어요. 원본과 기존 판은 그대로예요.';
 if(job.state==='stale')return '숫자 판독 중 기록이 바뀌어 반영하지 않았어요. 현재 초안은 그대로예요.';
 if(job.state==='interrupted')return '숫자 판독 작업이 중단됐어요. 자동으로 다시 요청하지 않아요.';
 if(!summary.numeric)return '숫자 읽기는 끝났지만 결과 영수증을 확인하지 못했어요. 기존 판은 그대로예요.';
 return summary.candidates?`숫자 후보 ${summary.candidates}개 · 보류 ${summary.deferred}개. 확인·정정 후 명시적으로 반영해 주세요.`:`적용할 수 있는 숫자 후보가 없어요. 보류 ${summary.deferred}개 · 원본과 기존 판은 그대로예요.`;
}
