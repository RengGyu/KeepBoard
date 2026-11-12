import type {ScanProgress} from '../shared/analysisJobs';
import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {SessionView} from '../shared/types';
import {scanReviewValue} from './scanReviewValue';
import {usefulPreviewValues} from '../shared/previewValues';

/** Validated stream values are read-only previews, never a record/answer or board projection. */
export function EarlyScanValues({view,progress,definition,ownerId,jobId}:{view:SessionView;progress:ScanProgress;definition?:PhotoDefinition;ownerId?:string;jobId?:string}){
 if(!definition||progress.captureEpoch!==view.session.captureEpoch||progress.ownerId!==ownerId||jobId&&progress.jobId!==jobId||progress.job&&progress.job.sessionId!==view.session.id)return null;
 const visible=view.session.evidence.filter(e=>e.ownerId===ownerId&&e.scope===(ownerId?'player':'public')&&e.captureEpoch===progress.captureEpoch);
 const units=progress.units.filter(u=>{
  // sourceSHA/inputSHA pin photographic bytes, not the game's specification SHA.
  // The scope-bound progress endpoint validates those pins; the UI has the immutable evidence ID.
  const p=u.preview;return p?.version==='literal-preview-v1'&&p.provisional===true&&p.definitionSHA===definition.definitionSHA&&/^[a-f0-9]{64}$/.test(p.sourceSHA)&&/^[a-f0-9]{64}$/.test(p.inputSHA)&&p.captureEpoch===progress.captureEpoch&&p.ownerId===(ownerId??null)&&visible.some(e=>e.id===p.evidenceId);
 });
 if(!units.length)return null;
 return <section aria-label="먼저 도착한 읽은 값"><p className="small">{progress.job&&['failed','interrupted'].includes(progress.job.state)?'판독이 중단되기 전 도착한 값입니다. 최종 그림에 반영된 결과는 아니에요.':'읽는 중 · 먼저 도착한 값입니다. 최종 그림은 전체 처리가 끝난 뒤 반영돼요.'}</p>
 {units.map(u=>{const p=u.preview!,t=u.timings,first=t?.firstUsefulValueAt??t?.firstReadableItemAt,started=t?.providerRequestAt,finished=t?.generationFinishedAt,observations=p.observations.filter(o=>usefulPreviewValues(o,definition).length);
  return <div key={u.index}><strong>{u.index+1}번째 사진</strong>{first!==undefined&&started!==undefined&&first>=started&&<p className="small">판독 요청 → {t?.firstUsefulValueAt!==undefined?'필요한 값 수신':'첫 미리보기'} {((first-started)/1000).toFixed(1)}초{finished!==undefined&&finished>=started?` · 전체 응답 ${((finished-started)/1000).toFixed(1)}초`:' · 전체 응답 대기'}</p>}
   {!observations.length&&<p className="small">숫자·색 등 필요한 값을 읽는 중이에요.</p>}<ul>{observations.map(o=>{const component=definition.components.find(c=>c.id===o.componentId),name=view.pack.runtime?.components.find(c=>c.id===o.componentId)?.name??'종류 모름';
    const values=usefulPreviewValues(o,definition).map(([id,v])=>{const field=component?.properties.find(f=>f.id===id);return `${field?.label??id}: ${scanReviewValue(v.value,field,value=>field?.options?.find(option=>option.value===value)?.label??(typeof value==='object'?JSON.stringify(value):String(value)))}`;});
    return <li key={o.ref}><b>{name}</b>{values.length?' · '+values.join(' · '):' · 사진 참고'}</li>;
   })}</ul>
  </div>;
 })}</section>;
}
