import { useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Focus, Image as ImageIcon, MapPin, Package, ScanLine } from 'lucide-react';
import type { Evidence, Player, SessionView } from '../shared/types';
import { api } from './api';
import { SceneEditor } from './SceneEditor';
import { toComponentScene } from '../shared/sceneBridge';
import { isSceneField, sceneAnswers } from '../shared/sceneFields';
import type { Value } from '../shared/types';
import { FieldEditor, fire, type Mutate } from './Fields';
import { PreservationItem } from './Packing';
import { previewValue, regionsForEvidence, surroundingRegion, targetLocation, type PhotoTarget, type TargetLocation } from './presentation';
import { Modal } from './ui';

export interface TargetSelection { key: string; locationId?: string; preservationId?: string }

export function TargetCrop({ location, label, thumbnail = false }: { location?: TargetLocation; label: string; thumbnail?: boolean }) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | undefined>();
  if (!location) return <span className="target-no-photo"><ImageIcon size={thumbnail ? 21 : 32}/><span>연결된 사진 없음</span></span>;
  const { evidence, region } = location;
  const crop = region ? surroundingRegion(region) : { x: 0, y: 0, width: 1, height: 1 };
  const size = dimensions || { width: evidence.width || 4, height: evidence.height || 3 };
  return <div className={`target-crop ${thumbnail ? 'target-thumbnail' : ''}`} style={{ aspectRatio: `${size.width * crop.width} / ${size.height * crop.height}` }}>
    <img src={evidence.url} alt={`${label} · ${region ? '주변을 포함한 근거 영역' : '위치 미지정 원본 전체'}`} loading={thumbnail ? 'lazy' : undefined} onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} style={{ width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%` }}/>
    {region && <span className="target-crop-outline" style={{ left: `${(region.x - crop.x) / crop.width * 100}%`, top: `${(region.y - crop.y) / crop.height * 100}%`, width: `${region.width / crop.width * 100}%`, height: `${region.height / crop.height * 100}%` }}/>} 
    {!thumbnail && <span className="target-crop-caption">{location.contextOnly ? '참고 원본 · 대상 영역 미연결' : region ? '주변과 함께 보기' : '영역 미지정 · 원본 전체'}</span>}
  </div>;
}

function EvidenceCanvas({ evidence, targets, selectedKey, onSelect }: { evidence: Evidence; targets: PhotoTarget[]; selectedKey?: string; onSelect: (selection: TargetSelection) => void }) {
  const regions = regionsForEvidence(targets, evidence.id);
  return <div className="target-original"><img src={evidence.url} alt={evidence.label || '게임판 원본 사진'}/>{regions.map(location => {
    const target = targets.find(item => item.key === location.targetKey)!;
    const region = location.region!;
    const style: CSSProperties = { left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` };
    return <button key={location.id} type="button" className={`target-region ${selectedKey === target.key ? 'selected' : ''}`} style={style} aria-label={`${target.field.label} 영역 선택`} aria-pressed={selectedKey === target.key} onClick={() => onSelect({ key: target.key, locationId: location.id })}><span>{targets.indexOf(target) + 1}</span><span className="region-label">{target.field.label}</span></button>;
  })}</div>;
}

export function PhotoTargetBrowser({ targets, evidence, players, selectedKey, evidenceId, owner, onEvidenceChange, onSelect, onOriginal }: { targets: PhotoTarget[]; evidence: Evidence[]; players: Player[]; selectedKey?: string; evidenceId?: string; owner: string; onEvidenceChange: (id: string) => void; onSelect: (selection: TargetSelection) => void; onOriginal: (evidence: Evidence) => void }) {
  const selectedEvidence = evidence.find(item => item.id === evidenceId) ?? evidence[0];
  if (!targets.length && !evidence.length) return null;
  const select = (selection: TargetSelection) => {
    const target = targets.find(target => target.key === selection.key);
    const location = target && targetLocation(target, selection.locationId, selectedEvidence?.id);
    if (location) onEvidenceChange(location.evidence.id);
    onSelect({ ...selection, locationId: location?.id });
  };
  return <section className="photo-target-browser" id="photo-target-browser" aria-label={`${owner} 사진과 상태 대상`}>
    <div className="target-browser-heading"><div><span className="eyebrow">사진에서 찾아 확인</span><h3>{owner} 판과 상태</h3></div><span className="small muted">영역이나 항목을 눌러 선택</span></div>
    {evidence.length > 1 && <div className="target-photo-tabs" aria-label="원본 선택">{evidence.map((photo, index) => <button key={photo.id} className={photo.id === selectedEvidence?.id ? 'active' : ''} aria-pressed={photo.id === selectedEvidence?.id} onClick={() => onEvidenceChange(photo.id)}><img src={photo.url} alt="" loading="lazy"/><span>{photo.label || `사진 ${index + 1}`}</span></button>)}</div>}
    <div className="target-browser-layout"><div className="target-photo-panel">{selectedEvidence ? <><EvidenceCanvas evidence={selectedEvidence} targets={targets} selectedKey={selectedKey} onSelect={select}/><div className="target-photo-caption"><span>{selectedEvidence.label || '게임판 원본'}{selectedEvidence.kind === 'example' && ' · 예시 도식'}</span><button className="button text small-button" onClick={() => onOriginal(selectedEvidence)}><Focus size={14}/>원본 확대</button></div></> : <div className="target-photo-empty"><ImageIcon size={30}/><p>연결된 사진이 없습니다.<br/>항목을 선택해 직접 확인할 수 있어요.</p></div>}
      <p className="target-browser-help">선택만으로 기록은 바뀌지 않아요. 표시된 영역이 없는 항목은 원본 전체와 함께 확인합니다.</p></div>
    <div className="target-list" aria-label="사진에 연결된 상태 항목">{targets.map((target, index) => {
      const location = targetLocation(target, undefined, selectedEvidence?.id);
      const value = target.accepted?.value ?? target.candidates[0]?.value;
      return <button type="button" key={target.key} className={`target-list-item ${target.key === selectedKey ? 'selected' : ''}`} aria-pressed={target.key === selectedKey} onClick={() => select({ key: target.key, locationId: location?.id })}><span className="target-list-crop"><TargetCrop location={location} label={target.field.label} thumbnail/></span><span className="target-list-text"><span className="target-list-label"><span className="target-index">{index + 1}</span><strong>{target.ownerId ? `${players.find(p=>p.id===target.ownerId)?.name??target.ownerId} · ` : ''}{target.field.label}</strong></span><span className="target-list-value">{value === undefined ? target.question ? '확인 필요' : '실물 보관 연결' : previewValue(value, target.field, players)}</span><span className="target-list-status">{target.candidates.length ? '상태 후보' : target.accepted ? '기록됨' : '미확인'} · {location?.contextOnly ? '참고 원본 · 대상 영역 미연결' : location?.region ? '사진 영역 연결' : location ? '원본 전체' : '사진 없음'}</span></span><ChevronRight size={14}/></button>;
    })}{!targets.length && <p className="target-list-empty">사진을 분석하거나 상태를 기록하면 대상이 표시됩니다.</p>}</div></div>
  </section>;
}

export function PreservationTargets({ targets, restoring, onSelect }: { targets: PhotoTarget[]; restoring?: boolean; onSelect: (selection: TargetSelection) => void }) {
  if (!targets.length) return null;
  return <div className="preservation-targets"><span className="preservation-targets-label"><MapPin size={13}/>{restoring ? '이 보관함에서 원래 위치로' : '이 묶음과 연결된 대상'}</span><div>{targets.map(target => {
    const location = targetLocation(target);
    return <button key={target.key} className="preservation-target" type="button" onClick={() => onSelect({ key: target.key, locationId: location?.id })}><span className="preservation-target-crop"><TargetCrop location={location} label={target.field.label} thumbnail/></span><span><strong>{target.ownerId ? `${target.ownerId} · ` : ''}{target.field.label}</strong><small>{location?.contextOnly ? '참고 원본 · 대상 영역 미연결' : location?.region ? '근거 영역 → 원본 위치' : location ? '영역 미지정 · 원본 전체' : '연결된 원본 없음'}</small></span><ArrowRight size={14}/></button>;
  })}</div></div>;
}

export function TargetDetail({ target, selection, view, owner, busy, mutate, onClose, onSelect, onPreserve }: { target: PhotoTarget; selection: TargetSelection; view: SessionView; owner: string; busy: boolean; mutate: Mutate; onClose: () => void; onSelect: (selection: TargetSelection) => void; onPreserve: (id: string) => void }) {
  const [wholeOriginal, setWholeOriginal] = useState(false);
  const location = targetLocation(target, selection.locationId);
  const linked = view.session.preservations.filter(item => target.preservationIds.includes(item.id));
  const preservation = linked.find(item => item.id === selection.preservationId);
  const [candidateId, setCandidateId] = useState(target.candidates.find(item => item.id === location?.assertionId)?.id);
  const candidate = target.candidates.find(item => item.id === candidateId) ?? target.candidates[0];
  const value = candidate?.value ?? target.accepted?.value;
  const [error, setError] = useState('');
  const editableField = { ...target.field, id: `target-detail-${target.key}`, reason: target.question?.reason || '', acquisition: target.question?.acquisition || target.field.acquisition, preservationId: target.question?.preservationId || target.field.preservationId };
  const editor = <FieldEditor key={`${target.key}-${candidate?.id || 'recorded'}`} field={editableField} value={value} busy={busy} compact onPreserve={linked.length ? () => onPreserve(preservation?.id || linked[0].id) : undefined} onSave={next => mutate(() => api.update(view.session.id, { answers: [{ field: target.field.key, ownerId: target.ownerId, value: next }] }), next === null ? '미확인 상태로 남겼어요' : '선택한 대상의 상태를 기록했어요')}/>;
  return <Modal title={target.field.label} onClose={onClose} wide><div className="target-detail">
    <div className="target-detail-context"><span>{owner}</span>{preservation && <><ChevronRight size={12}/><Package size={13}/><strong>{preservation.container || '보관 위치 미기록'}</strong><ChevronRight size={12}/></>}<span>{target.field.label}</span>{location?.snapshot && <span className="tag">저장 당시 원본</span>}</div>
    <div className="target-detail-layout"><div className="target-detail-photo">{wholeOriginal && location ? <EvidenceCanvas evidence={location.evidence} targets={[target]} selectedKey={target.key} onSelect={item => onSelect({ ...item, preservationId: selection.preservationId })}/> : <TargetCrop location={location} label={target.field.label}/>}
      {location && <><button className="button secondary small-button full" onClick={() => setWholeOriginal(!wholeOriginal)}>{wholeOriginal ? <><ArrowLeft size={14}/>주변 영역으로 돌아가기</> : <><ScanLine size={14}/>원본에서 같은 위치 보기</>}</button><p className="target-detail-provenance">{location.evidence.label || '원본 사진'}{location.evidence.kind === 'example' && ' · 예시 도식'}{location.contextOnly ? ' · 이 항목의 사진 위치는 아직 연결되지 않았어요.' : !location.region ? ' · 지정된 영역이 없어 원본 전체를 보여드려요.' : ' · 강조 영역과 주변 배치를 함께 확인하세요.'}</p></>}
      {target.locations.length > 1 && <label className="target-location-select">근거 사진<select value={location?.id || ''} onChange={event => onSelect({ ...selection, locationId: event.target.value })}>{target.locations.map((item, index) => <option key={item.id} value={item.id}>{item.snapshot ? '저장 당시 · ' : ''}{item.evidence.label || `사진 ${index + 1}`}{item.region ? ' · 영역 있음' : ' · 원본 전체'}</option>)}</select></label>}
    </div><div className="target-detail-input"><div className="target-only-heading"><span className="eyebrow">선택한 대상만 확인</span><p>{target.question?.reason || target.field.description}</p></div>
      {target.baseline && <div className="target-baseline"><span>저장 당시 기록</span><pre>{previewValue(target.baseline.value, target.field, view.session.players)}</pre></div>}
      {candidate && <div className="target-candidate"><span className="eyebrow">{candidate.basis === 'example' ? '예시 상태 후보' : '사진에서 제안한 상태'}</span>{target.candidates.length > 1 && <select aria-label="확인할 상태 후보" value={candidate.id} onChange={event => setCandidateId(event.target.value)}>{target.candidates.map((item, index) => <option key={item.id} value={item.id}>후보 {index + 1} · {previewValue(item.value, target.field, view.session.players).slice(0, 70)}</option>)}</select>}<pre>{previewValue(candidate.value, target.field, view.session.players)}</pre>{candidate.reason && <p>{candidate.reason}</p>}<button className="button primary small-button" disabled={busy} onClick={() => { setError(''); fire(mutate(() => api.accept(view.session.id, candidate.id), '선택한 상태를 확인했어요').catch(reason => { setError(reason instanceof Error ? reason.message : '확인하지 못했습니다.'); })); }}><Check size={15}/>이 후보 확인</button></div>}
      {target.derived ? <div className="target-derived"><strong>확인된 기록에서 도출된 상태</strong><pre>{previewValue(target.accepted?.value, target.field, view.session.players)}</pre><p>{target.accepted?.reason || '관련 상태를 확인하면 자동으로 안내합니다.'}</p></div> : isSceneField(target.field) ? <SceneEditor value={toComponentScene(value, location?.evidence.id)} players={view.session.players} evidence={view.session.evidence.filter(item => item.scope === 'public' || item.ownerId === target.ownerId)} busy={busy} onSave={scene => mutate(() => api.update(view.session.id, { answers: sceneAnswers(target.field.key, scene, target.ownerId, view.pack.fields) }), '구성물과 배치를 저장했어요')}/> : target.field.type === 'json' && editableField.acquisition !== 'preserve' && !['resource-counts','development-counts'].includes(target.field.ui?.editor??'') && !['player.resources.counts','player.development.handCounts','player.pieces.remaining'].includes(target.field.key) ? <details className="target-advanced-editor"><summary>구조화된 기록 편집 <span>{previewValue(value, target.field)}</span></summary>{editor}</details> : editor}
      {linked.length > 0 && <div className="target-linked-preservations"><h4><Package size={14}/>연결된 보관·복원</h4>{linked.map(item => <div key={item.id}><strong>{item.label}</strong><p>{item.container || '아직 보관 위치를 기록하지 않았어요'}</p><button className="button text small-button" disabled={busy} onClick={() => onPreserve(item.id)}>이 묶음 {selection.preservationId ? '복원 항목' : '보관 항목'}으로 이동 <ArrowRight size={13}/></button></div>)}</div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </div></div>
  </div></Modal>;
}
