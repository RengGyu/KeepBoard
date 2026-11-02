import { useState } from 'react';
import { useRealAssets, type RealBoard } from './realBoards';
import { scoreForTrackSlot, scoreTrackValue } from './azulScoreTrackModel';
import './azul-score-track.css';

interface TrackSlot { id: string; value: number; x: number; y: number; w: number; h: number; row: number; column: number }
interface NumericTrack { id: string; field: string; label: string; scope: string; min: number; max: number; bounds: [number, number, number, number]; slots: TrackSlot[] }
interface Props { value: unknown; busy: boolean; onSave: (value: number) => Promise<void> }

/** Edits the existing player.score scalar; unknown values remain unknown until a user selects a space. */
export function AzulScoreTrack({ value, busy, onSave }: Props) {
  const assets = useRealAssets('azul');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const board = assets?.board as (RealBoard & { numericTracks?: NumericTrack[] }) | undefined;
  const track = board?.numericTracks?.find(item => item.id === 'score' && item.field === 'score' && item.scope === 'player');
  if (!track) return null;

  const current = scoreTrackValue(value, track);
  async function choose(slotValue: number) {
    const next = scoreForTrackSlot(slotValue, track!);
    if (next === null || busy || saving) return;
    setSaving(true); setError('');
    try { await onSave(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '점수를 저장하지 못했어요.'); }
    finally { setSaving(false); }
  }

  const [x, y, width, height] = track.bounds;
  return <section className="azul-score-track" aria-label="아줄 개인 점수 트랙">
    <div className="azul-score-track-heading"><strong>{track.label}</strong><span>{current === null ? '현재 점수 미확인' : `${current}점`}</span></div>
    <div className="azul-score-track-scroll" tabIndex={0} aria-label="점수 칸 좌우로 이동">
      <div className="azul-score-track-grid" role="group" aria-label="점수 선택" style={{ aspectRatio: `${width} / ${height}` }}>
        {track.slots.map(slot => <button
          key={slot.id}
          type="button"
          className={current === slot.value ? 'is-current' : ''}
          style={{ left: `${(slot.x - x) / width * 100}%`, top: `${(slot.y - y) / height * 100}%`, width: `${slot.w / width * 100}%`, height: `${slot.h / height * 100}%` }}
          aria-label={`${slot.value}점`}
          aria-pressed={current === slot.value}
          disabled={busy || saving}
          onClick={() => { void choose(slot.value); }}
        >{slot.value % 5 === 0 ? slot.value : ''}</button>)}
      </div>
    </div>
    <p className="azul-score-track-help">칸을 누르면 기존 점수 기록을 바꿔요. ? 값은 직접 확인하기 전까지 그대로 둡니다.</p>
    {error && <p className="inline-error small" role="alert">{error}</p>}
  </section>;
}
