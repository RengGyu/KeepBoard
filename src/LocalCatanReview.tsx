import {numericReceiptSummary} from './numericReaderStatus';
import {useState} from 'react';
import type {Assertion,Evidence,SessionView} from '../shared/types';
import {normalizeScene,type ComponentScene} from '../shared/scene';
import {sceneAnswers} from '../shared/sceneFields';
import {SceneEditor} from './SceneEditor';
import {Modal} from './ui';
import {PhotoObservationOverlay} from './PhotoObservationOverlay';
import {usePhotoDefinition} from './photoDefinitions';
import {catanReviewScene} from './catanObservationReviewModel';
import {api} from './api';
import type {NativeObservationReview} from '../shared/observationReview';
import type {Mutate} from './Fields';
import {GAP_REASON,observationGaps} from '../shared/observationGaps';

export function LocalCatanReview({view,source,busy,dirty,mutate,onClose,onEvidence}:{view:SessionView;source:Assertion;busy:boolean;dirty:boolean;mutate:Mutate;onClose:()=>void;onEvidence:(e:Evidence,region?:Assertion['region'])=>void}){
 const [useLocations,setUseLocations]=useState(false),[error,setError]=useState(''),[reviewDirty,setReviewDirty]=useState(false);
 const {definition,loading:definitionLoading,error:definitionError}=usePhotoDefinition(view.pack,true);
 const receipts=source.observationReceipts??[],locations=receipts.reduce((n,r)=>n+r.geometryCandidates.length,0);
 const numeric=numericReceiptSummary(receipts),gaps=observationGaps(source);
 const accepted=view.session.assertions.filter(a=>a.field==='board.layout'&&!a.ownerId&&a.status==='accepted').at(-1);
 const [openedBaseId]=useState(accepted?.id??null);
 const [review,setReview]=useState(()=>{try{return catanReviewScene(source,normalizeScene(accepted?.value),false);}catch{return {scene:normalizeScene(accepted?.value),placedRefs:[],unresolved:[]};}});
 const [previewRevision,setPreviewRevision]=useState(0),[placementFailure,setPlacementFailure]=useState('');
 let currentPlacementError='';
 try{catanReviewScene(source,normalizeScene(accepted?.value),locations>0);}catch(e){currentPlacementError=e instanceof Error?e.message:'위치 후보를 계산하지 못했어요.';}
 const placementError=placementFailure||currentPlacementError;
 async function save(value:ComponentScene){
  if(placementError)throw Error('위치 후보를 반영할 수 없어요. 현재 초안은 유지됩니다. 원본·기준점을 다시 확인해 주세요.');
  if(!view.session.assertions.some(a=>a.id===source.id))throw Error('사진 후보가 바뀌었어요. 현재 정정 초안은 남아 있으니 새 후보를 확인한 뒤 적용해 주세요.');
  if(dirty)throw Error('보드에 저장하지 않은 수정이 있어요. 먼저 반영하거나 되돌린 뒤 후보를 적용해 주세요.');
  const latest=view.session.assertions.filter(a=>a.field==='board.layout'&&!a.ownerId&&a.status==='accepted').at(-1);
  if((latest?.id??null)!==openedBaseId)throw Error('보드 기록이 바뀌었어요. 새 기록을 확인한 뒤 적용해 주세요.');
  if(value.components.filter(c=>c.kind==='robber'&&c.quantity!==0).length>1){const message='도둑이 여러 개 기록돼 있어요. 기존 위치를 지우지 않도록 저장을 보류했어요. 후보와 기존 기록 중 중복을 직접 삭제하거나 수량을 정리한 뒤 반영해 주세요.';setError(message);throw Error(message);}
  try{const observationReview:NativeObservationReview={version:'native-observation-review-v1',sourceAssertionId:source.id,expectedBaselineAssertionId:openedBaseId};await mutate(()=>api.update(view.session.id,{answers:sceneAnswers('board.layout',value,undefined,view.pack.fields).map(a=>a.field==='board.layout'?{...a,observationReview}:a)}));onClose();}catch(e){setError(e instanceof Error?e.message:'후보를 반영하지 못했어요.');throw e;}
 }
 return <Modal title={numeric.numeric?'읽은 숫자 후보 확인':'읽은 사진 후보'} onClose={onClose} wide><div className="modal-body lightweight-review">
  <p className="small muted">{numeric.numeric?`숫자 후보 ${numeric.candidates}개 · 보류 ${numeric.deferred}개. 전체 판을 읽은 결과가 아니에요. `:''}기존 도로·건물·항구는 남겨요. 읽은 값과 위치를 확인한 뒤 ‘반영’을 눌러 주세요.</p>
  {gaps.size>0&&<p className="gap-note" role="note"><b>읽지 못한 값 ?</b><span>{gaps.size}개 실물</span>{[...new Set([...gaps.values()].flat().map(g=>GAP_REASON[g.reason]))].map(r=><span key={r}>{r}</span>)}<span>필요하면 미배치 목록에서 고칠 수 있어요.</span></p>}
  {definitionLoading&&<p role="status">촬영 정의를 준비하고 있어요…</p>}{definitionError&&<p role="alert">{definitionError}</p>}
  {definition&&receipts.map((r,i)=><PhotoObservationOverlay key={i} photos={view.session.evidence} request={r.request} result={r.result} geometry={r.geometryCandidates} transforms={r.transforms} definition={definition}/>)}
  {locations>0&&!useLocations&&<button className="button secondary" disabled={busy||dirty||reviewDirty} onClick={()=>{try{const next=catanReviewScene(source,normalizeScene(accepted?.value),true);setReview(next);setPreviewRevision(n=>n+1);setUseLocations(true);setPlacementFailure('');setError('');}catch(e){setPlacementFailure(e instanceof Error?e.message:'위치 후보를 확인해 주세요.');}}}>계산된 위치 {locations}개를 정정 그림에서 확인</button>}
  {reviewDirty&&!useLocations&&locations>0&&<p className="small muted">정정 중인 값이 있어 위치 후보로 화면을 교체하지 않아요. 직접 자리를 옮기거나 되돌린 뒤 확인해 주세요.</p>}
  <p role="status">{placementError?'위치 후보 계산에 실패했어요. 현재 정정 초안은 남아 있고 반영은 차단했어요.':useLocations?`배치 ${review.placedRefs.length}개 · 위치 확인 ${review.unresolved.length}개. 미배치 실물도 고치거나 그대로 반영할 수 있어요.`:'위치 미확정 · 읽은 값이 있어도 아직 보드 칸을 확정하지 않았어요.'}</p>
  {placementError&&<div role="alert"><p>{placementError}</p></div>}
  {useLocations&&review.unresolved.length>0&&<details><summary>위치 확인이 필요한 실물 {review.unresolved.length}개</summary>{review.unresolved.map((u,i)=><p className="small muted" key={u.observationRef}>실물 {i+1} · {u.reason}</p>)}</details>}
  {error&&<p role="alert">{error}</p>}{dirty&&<p role="alert">보드에 저장하지 않은 수정이 있어요. 그 초안을 먼저 반영하거나 되돌려 주세요.</p>}
  <SceneEditor key={`${source.id}:${previewRevision}`} value={review.scene} players={view.session.players} busy={busy||dirty} evidence={view.session.evidence} game={view.pack.id} forceSave onDirtyChange={setReviewDirty} onSave={save} onEvidence={(id,region)=>{const e=view.session.evidence.find(p=>p.id===id);if(e)onEvidence(e,region);}}/>
 </div></Modal>;
}
