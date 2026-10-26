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

export function SceneWorkspace({ view, ownerId, busy, mutate, onEvidence, onReadyToSave }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onEvidence: (evidence: Evidence, region?: Assertion['region']) => void; onReadyToSave?: (save: ((options?:RummikubSaveOptions) => Promise<void>) | null) => void }) {
  const { fields, assertions: sceneAssertions, evidence, catalogOnly, visible } = sceneWorkspaceData(view, ownerId);
  const [reviewSource,setReviewSource]=useState<Assertion|null>(null);
  const localCandidates=!ownerId?localCatanCandidates(view):[];
  const ordinaryAssertions=sceneAssertions.filter(a=>ownerId||view.pack.id!=='catan-base'||!a.observationReceipts?.length||a.status==='accepted');
  const [dirty, setDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const visibleField = useRef('');
  const saveEditor = useRef<(() => Promise<void>) | null>(null);
  const newestAccepted = ordinaryAssertions.filter(a => a.status === 'accepted').sort((a,b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
  const newer = (a: Assertion, b?: Assertion) => !b || a.updatedAt > b.updatedAt || a.updatedAt === b.updatedAt && sceneAssertions.indexOf(a) > sceneAssertions.indexOf(b);
  const newestCandidate = ordinaryAssertions.filter(a => a.status !== 'accepted' && newer(a, newestAccepted)).sort((a,b) => a.updatedAt.localeCompare(b.updatedAt)).at(-1);
  const field = fields.find(item => item.key === (dirty ? visibleField.current : fieldKey)) || fields.find(item => item.key === newestCandidate?.field) || fields.find(item => item.key === newestAccepted?.field) || fields.find(item => item.key === 'board.layout' && sceneAssertions.some(a => a.field === item.key)) || fields.find(item => sceneAssertions.some(a => a.field === item.key)) || fields[0];
  if (!field || !visible) return null;
  visibleField.current = field.key;
  const assertions = view.session.assertions.filter(item => item.field === field.key && item.ownerId === ownerId&&(ownerId||view.pack.id!=='catan-base'||!item.observationReceipts?.length||item.status==='accepted'));
  const accepted = assertions.filter(item => item.status === 'accepted').at(-1);
  const candidate = assertions.filter(item => item.status !== 'accepted' && newer(item, accepted)).at(-1);
  const assertion = showSaved ? accepted || candidate : candidate || accepted;
  const recording = recordedScene(view, field.key, assertion, ownerId);
  const otherFields = fields.filter(item => item.key === field.key || view.session.assertions.some(a => a.field === item.key && a.ownerId === ownerId));
  return <section className="scene-workspace" aria-label={catalogOnly ? '개인 사진과 카드' : '그림 고치기'}><div className="section-heading"><h3>{catalogOnly ? '개인 사진과 카드' : ownerId ? '내 부품' : '공용 보드'}</h3>{otherFields.length > 1 && <select aria-label="다른 부품 보기" value={field.key} disabled={busy} onChange={event => { const key = event.target.value; fire((async () => { await saveEditor.current?.(); setFieldKey(key); setShowSaved(false); })()); }}>{otherFields.map(item => <option key={item.key} value={item.key}>{item.key === 'board.layout' ? '전체 판' : item.key === 'components.observed' ? '사진 속 부품' : item.key === 'player.components.observed' ? '내 부품' : item.label}</option>)}</select>}</div>
    {localCandidates.length>0&&<div className="lightweight-reader" aria-label="로컬 판독 후보"><p>읽은 후보 {localCandidates.length}건 · 아직 반영하지 않았어요.</p>{localCandidates.map(a=><button className="button secondary" key={a.id} disabled={busy} onClick={()=>setReviewSource(a)}>{numericReceiptSummary(a.observationReceipts).numeric?'숫자 후보 확인':'지형·숫자 후보 확인'}</button>)}</div>}
    {reviewSource&&<LocalCatanReview view={view} source={reviewSource} busy={busy} dirty={dirty} mutate={mutate} onClose={()=>setReviewSource(null)} onEvidence={onEvidence}/>}
    {accepted && candidate && <div className="scene-result-choice"><span>{showSaved ? catalogOnly ? '저장한 카드 목록' : '저장한 그림' : catalogOnly ? '새 사진에서 읽은 부품' : '새 사진에서 읽은 그림'}</span><button className="button text small-button" disabled={busy || dirty} onClick={() => { setShowSaved(!showSaved); }}>{showSaved ? '새 사진 결과 보기' : catalogOnly ? '이전 목록 보기' : '이전 그림 보기'}</button></div>}
    <SceneEditor key={`${view.session.id}:${ownerId || 'public'}:${field.key}:${showSaved ? 'saved' : 'latest'}`} game={view.pack.id} value={recording.scene} ownerId={ownerId} catalogOnly={catalogOnly} players={view.session.players} evidence={evidence} busy={busy} onDirtyChange={setDirty} forceSave={recording.forceSave} onReadyToSave={save => { saveEditor.current = save; onReadyToSave?.(save?async options=>{if(options?.acceptCandidate===false&&!dirty)return;await save();}:null); }} onEvidence={(id, region) => { const source = evidence.find(item => item.id === id); if (source) onEvidence(source, region); }} onSave={scene => mutate(() => api.update(view.session.id, { answers: sceneAnswers(recording.fieldKey, scene, ownerId, view.pack.fields) }))}/>
  </section>;
}
