import { useRef, useState } from 'react';
import type { Assertion, Evidence, SessionView } from '../shared/types';
import { isSceneField, sceneAnswers } from '../shared/sceneFields';
import { toComponentScene } from '../shared/sceneBridge';
import { SceneEditor } from './SceneEditor';
import { api } from './api';
import { fire, type Mutate } from './Fields';

export function SceneWorkspace({ view, ownerId, busy, mutate, onEvidence, onReadyToSave }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onEvidence: (evidence: Evidence, region?: Assertion['region']) => void; onReadyToSave?: (save: (() => Promise<void>) | null) => void }) {
  const fields = view.pack.fields.filter(field => field.scope === (ownerId ? 'player' : 'public') && isSceneField(field));
  const [dirty, setDirty] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const visibleField = useRef('');
  const saveEditor = useRef<(() => Promise<void>) | null>(null);
  const sceneAssertions = view.session.assertions.filter(a => a.ownerId === ownerId && fields.some(f => f.key === a.field));
  const newestAccepted = sceneAssertions.filter(a => a.status === 'accepted').reduce((at, a) => a.updatedAt > at ? a.updatedAt : at, '');
  const newestCandidate = sceneAssertions.filter(a => a.status === 'candidate' && a.updatedAt > newestAccepted).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const field = fields.find(item => item.key === (dirty ? visibleField.current : fieldKey)) || fields.find(item => item.key === newestCandidate?.field) || fields.find(item => item.key === 'board.layout' && sceneAssertions.some(a => a.field === item.key)) || fields.find(item => sceneAssertions.some(a => a.field === item.key)) || fields[0];
  if (!field) return null;
  visibleField.current = field.key;
  const assertions = view.session.assertions.filter(item => item.field === field.key && item.ownerId === ownerId);
  const accepted = assertions.filter(item => item.status === 'accepted').at(-1);
  const candidate = assertions.filter(item => item.status !== 'accepted' && (!accepted || item.updatedAt > accepted.updatedAt)).at(-1);
  const assertion = showSaved ? accepted || candidate : candidate || accepted;
  const evidence = [...(view.session.snapshots.at(-1)?.evidence || []), ...view.session.evidence].filter(item => item.scope === 'public' || item.ownerId === ownerId);
  const otherFields = fields.filter(item => item.key === field.key || view.session.assertions.some(a => a.field === item.key && a.ownerId === ownerId));
  return <section className="scene-workspace" aria-label="그림 고치기"><div className="section-heading"><h3>{ownerId ? '내 부품' : '그림판'}</h3>{otherFields.length > 1 && <select aria-label="다른 부품 보기" value={field.key} disabled={busy} onChange={event => { const key = event.target.value; fire((async () => { await saveEditor.current?.(); setFieldKey(key); setShowSaved(false); })()); }}>{otherFields.map(item => <option key={item.key} value={item.key}>{item.key === 'board.layout' ? '전체 판' : item.key === 'components.observed' ? '사진 속 부품' : item.key === 'player.components.observed' ? '내 부품' : item.label}</option>)}</select>}</div>
    {accepted && candidate && <div className="scene-result-choice"><span>{showSaved ? '저장한 그림' : '새 사진에서 읽은 그림'}</span><button className="button text small-button" disabled={busy || dirty} onClick={() => { setShowSaved(!showSaved); }}>{showSaved ? '새 사진 결과 보기' : '이전 그림 보기'}</button></div>}
    <SceneEditor key={`${view.session.id}:${ownerId || 'public'}:${field.key}:${showSaved ? 'saved' : 'latest'}`} value={toComponentScene(assertion?.value, assertion?.evidenceIds[0])} ownerId={ownerId} players={view.session.players} evidence={evidence} busy={busy} onDirtyChange={setDirty} forceSave={!!assertion && assertion.status !== 'accepted'} onReadyToSave={save => { saveEditor.current = save; onReadyToSave?.(save); }} onEvidence={(id, region) => { const source = evidence.find(item => item.id === id); if (source) onEvidence(source, region); }} onSave={scene => mutate(() => api.update(view.session.id, { answers: sceneAnswers(field.key, scene, ownerId, view.pack.fields) }))}/>
  </section>;
}
