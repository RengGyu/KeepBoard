import {ScanUnresolvedGroups} from './ScanObservationResults';
import {numericReceiptSummary} from './numericReaderStatus';
import {LocalCatanReview} from './LocalCatanReview';
import {localCatanCandidates} from './catanObservationReviewModel';
import type {RummikubSaveOptions} from './rummikubSavePolicy';
import { useRef, useState } from 'react';
import type { Assertion, Evidence, SessionView } from '../shared/types';
import { sceneAnswers } from '../shared/sceneFields';
import { recordedScene } from '../shared/boardRecording';
import { SceneEditor } from './SceneEditor';
import { sceneWorkspaceData } from './sceneWorkspaceModel';
import { api } from './api';
import { fire, type Mutate } from './Fields';
import { PhotoObservationOverlay } from './PhotoObservationOverlay';
import { usePhotoDefinition } from './photoDefinitions';
import { SCENE_KIND_LABELS, normalizeScene, type SceneKind } from '../shared/scene';
import { isBoardSlotType } from '../shared/scene';
import type { NativeObservationReview } from '../shared/observationReview';

export function SceneWorkspace({ view, ownerId, busy, mutate, onEvidence, onReadyToSave, onReadDetail }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onEvidence: (evidence: Evidence, region?: Assertion['region']) => void; onReadDetail?:(target:import('../shared/scanObservation').ScanTarget)=>void; onReadyToSave?: (save: ((options?:RummikubSaveOptions) => Promise<void>) | null) => void }) {
  const { fields, assertions: sceneAssertions, evidence, catalogOnly, visible } = sceneWorkspaceData(view, ownerId);
  const [reviewSource,setReviewSource]=useState<Assertion|null>(null);
  const {definition:resultDefinition}=usePhotoDefinition(view.pack,!ownerId&&view.pack.id==='catan-base');
  const localCandidates=!ownerId?localCatanCandidates(view):[];
  const ordinaryAssertions=sceneAssertions;
  const [dirty, setDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const visibleField = useRef('');
  const saveEditor = useRef<(() => Promise<void>) | null>(null);
  const reviewBaseline = useRef<{ sourceId: string; baselineId: string | null } | null>(null);
  const newestAccepted = ordinaryAssertions.filter(a => a.status === 'accepted').sort((a,b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
  const newer = (a: Assertion, b?: Assertion) => !b || a.updatedAt > b.updatedAt || a.updatedAt === b.updatedAt && sceneAssertions.indexOf(a) > sceneAssertions.indexOf(b);
  const newestCandidate = ordinaryAssertions.filter(a => a.status !== 'accepted' && newer(a, newestAccepted)).sort((a,b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
  const field = fields.find(item => item.key === (dirty ? visibleField.current : fieldKey)) || fields.find(item => item.key === newestCandidate?.field) || fields.find(item => item.key === newestAccepted?.field) || fields.find(item => item.key === 'board.layout' && sceneAssertions.some(a => a.field === item.key)) || fields.find(item => sceneAssertions.some(a => a.field === item.key)) || fields[0];
  if (!field || !visible) return null;
  visibleField.current = field.key;
  const assertions = view.session.assertions.filter(item => item.field === field.key && item.ownerId === ownerId);
  const accepted = assertions.filter(item => item.status === 'accepted').at(-1);
  const candidate = assertions.filter(item => item.status !== 'accepted' && newer(item, accepted)).at(-1);
  const assertion = showSaved ? accepted || candidate : candidate || accepted;
  const recording = recordedScene(view, field.key, assertion, ownerId);
  const localSource = !showSaved && !ownerId && recording.fieldKey === 'board.layout' && assertion && localCandidates.some(item => item.id === assertion.id) ? assertion : null;
  const boardBaseline = view.session.assertions.filter(item => item.field === 'board.layout' && !item.ownerId && item.status === 'accepted').at(-1);
  if (localSource && (!reviewBaseline.current || reviewBaseline.current.sourceId !== localSource.id) && !dirty) reviewBaseline.current = { sourceId: localSource.id, baselineId: boardBaseline?.id ?? null };
  // The illustrated, editable scene is the result. Keep the original observations available below it.
  const fresh = localCandidates.at(-1)?.observationReceipts?.at(-1);
  const receipt = fresh ?? assertion?.observationReceipts?.at(-1);
  const readCount = receipt?.result.observations.length ?? 0;
  const unplaced = normalizeScene(recording.scene).components.filter(c => c.quantity !== 0 && !isBoardSlotType(c.location.type)).length;
  const kinds = receipt ? Object.entries(receipt.result.observations.reduce<Record<string, number>>((n, o) => { const k = o.componentId ?? '종류 모름'; n[k] = (n[k] ?? 0) + 1; return n; }, {})).map(([k, n]) => `${SCENE_KIND_LABELS[k as SceneKind] ?? k} ${n}`).join(', ') : '';
  const resultView = receipt && !receipt.scanBundle && readCount > 0 && resultDefinition && !catalogOnly ? <PhotoObservationOverlay photos={view.session.evidence} request={receipt.request} result={receipt.result} geometry={receipt.geometryCandidates} transforms={receipt.transforms} definition={resultDefinition} compact open={false}/> : null;
  const otherFields = fields.filter(item => item.key === field.key || view.session.assertions.some(a => a.field === item.key && a.ownerId === ownerId));
  return <section className="scene-workspace" aria-label={catalogOnly ? '개인 사진과 카드' : '그림 고치기'}><div className="section-heading"><h3>{catalogOnly ? '개인 사진과 카드' : ownerId ? '내 부품' : '공용 보드'}</h3>{otherFields.length > 1 && <select aria-label="다른 부품 보기" value={field.key} disabled={busy} onChange={event => { const key = event.target.value; fire((async () => { if (dirty) await saveEditor.current?.(); setFieldKey(key); setShowSaved(false); })()); }}>{otherFields.map(item => <option key={item.key} value={item.key}>{item.key === 'board.layout' ? '전체 판' : item.key === 'components.observed' ? '사진 속 부품' : item.key === 'player.components.observed' ? '내 부품' : item.label}</option>)}</select>}</div>
    {receipt&&!receipt.scanBundle&&readCount>0&&!catalogOnly&&<p role="status" className="scene-read-summary"><b>사진에서 읽은 결과 {readCount}개</b> {kinds}{unplaced>0?` · 위치 미정 ${unplaced}개`:''}</p>}
    {accepted && candidate && <div className="scene-result-choice"><span>{showSaved ? catalogOnly ? '저장한 카드 목록' : '저장한 그림' : catalogOnly ? '새 사진에서 읽은 부품' : '새 사진에서 읽은 그림'}</span><button className="button text small-button" disabled={busy || dirty} onClick={() => { setShowSaved(!showSaved); }}>{showSaved ? '새 사진 결과 보기' : catalogOnly ? '이전 목록 보기' : '이전 그림 보기'}</button></div>}
    <div className="scene-manual-body scene-primary-board"><SceneEditor key={`${view.session.id}:${ownerId || 'public'}:${field.key}:${showSaved ? 'saved' : 'latest'}`} onReadDetail={accepted&&onReadDetail?pieceId=>{if(normalizeScene(accepted.value).components.some(c=>c.id===pieceId))onReadDetail({assertionId:accepted.id,pieceId});}:undefined} game={view.pack.id} value={recording.scene} ownerId={ownerId} catalogOnly={catalogOnly} players={view.session.players} evidence={evidence} busy={busy} onDirtyChange={setDirty} forceSave={recording.forceSave} onReadyToSave={save => { saveEditor.current = save; onReadyToSave?.(save?async options=>{if(options?.acceptCandidate===false&&!dirty)return;await save();}:null); }} onEvidence={(id, region) => { const source = evidence.find(item => item.id === id); if (source) onEvidence(source, region); }} onSave={scene => {
      if (localSource) {
        const pinned = reviewBaseline.current;
        if (!pinned || pinned.sourceId !== localSource.id || !view.session.assertions.some(item => item.id === localSource.id) || (boardBaseline?.id ?? null) !== pinned.baselineId) throw Error('사진 후보나 보드 기록이 바뀌었어요. 현재 정정 초안은 유지됩니다.');
        if (scene.components.filter(component => component.kind === 'robber' && component.quantity !== 0).length > 1) throw Error('도둑이 여러 개예요. 중복을 직접 정리한 뒤 저장해 주세요.');
        const observationReview: NativeObservationReview = { version: 'native-observation-review-v1', sourceAssertionId: localSource.id, expectedBaselineAssertionId: pinned.baselineId };
        return mutate(() => api.update(view.session.id, { answers: sceneAnswers('board.layout', scene, undefined, view.pack.fields).map(answer => answer.field === 'board.layout' ? { ...answer, observationReview } : answer) }));
      }
      return mutate(() => api.update(view.session.id, { answers: sceneAnswers(recording.fieldKey, scene, ownerId, view.pack.fields) }));
    }}/></div>
    <ScanUnresolvedGroups view={view} ownerId={ownerId} assertion={assertion} onEvidence={onEvidence}/>
    {localCandidates.length>0&&<div className="lightweight-reader" aria-label="사진 판독 후보"><p>사진 후보 {localCandidates.length}건 · 그림에서 바로 고칠 수 있어요.</p>{localCandidates.map(a=><button className="button secondary" key={a.id} disabled={busy} onClick={()=>setReviewSource(a)}>{numericReceiptSummary(a.observationReceipts).numeric?'숫자 후보 자세히 보기':'사진 후보 자세히 보기'}</button>)}</div>}
    {reviewSource&&<LocalCatanReview view={view} source={reviewSource} busy={busy} dirty={dirty} mutate={mutate} onClose={()=>setReviewSource(null)} onEvidence={onEvidence}/>}
    {resultView}
  </section>;
}
