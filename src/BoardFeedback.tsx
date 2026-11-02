import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import './board-feedback.css';
import { BRAND_IMAGES } from './brandImages';

/** Decorative mark: the surrounding Busy or loading message owns the announcement. */
export function LoaderMark({ size = 20 }: { size?: number }) {
  return <svg className="board-loader-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path className="board-loader-hex" d="m16 1 13 7.5v15L16 31 3 23.5v-15Z"/>
    <g className="board-loader-die"><rect x="7" y="7" width="18" height="18" rx="4"/>
      <circle cx="12" cy="12" r="1.7"/><circle cx="20" cy="12" r="1.7"/><circle cx="16" cy="16" r="1.7"/><circle cx="12" cy="20" r="1.7"/><circle cx="20" cy="20" r="1.7"/>
    </g>
  </svg>;
}

export type EmptyScene = 'boards' | 'search' | 'trash' | 'quiet';
export function EmptyBoardArt({ scene = 'boards' }: { scene?: EmptyScene }) {
  return <svg className="board-empty-art" viewBox="0 0 240 132" aria-hidden="true" focusable="false">
    <ellipse className="bf-ground" cx="119" cy="117" rx="91" ry="8"/>
    <path className="bf-table" d="m27 63 130-9 56 30-131 12Z"/>
    <path className="bf-wood" d="m27 63 55 33 131-12v8L82 105 27 72Z"/>
    <path className="bf-leg" d="m43 81 6 30m140-13-4 17M87 104v14"/>
    {scene === 'boards' ? <g className="bf-box-scene">
      <path className="bf-paper" d="m75 47 45-10 33 18-45 12Z"/>
      <path className="bf-box" d="m75 47 33 20v26L75 73Zm33 20 45-12v26l-45 12Z"/>
      <path className="bf-paper" d="m75 47-13-15 46-10 12 15m33 18 12-15-33-18-12 15"/>
      <path className="bf-seam" d="m108 67 12-30m-12 30v26"/>
      <path className="bf-accent-piece" d="m167 64 9-9 9 9v13h-18Z"/>
      <rect className="bf-paper" x="53" y="75" width="15" height="20" rx="2" transform="rotate(-12 53 75)"/>
    </g> : scene === 'search' ? <g>
      <path className="bf-paper" d="m74 53 52-5 25 17-52 6Z"/>
      <circle className="bf-glass" cx="133" cy="49" r="22"/><path className="bf-handle" d="m150 66 19 20"/>
      <path className="bf-seam" d="m122 48 7-7m-16 39 13-1"/>
    </g> : scene === 'trash' ? <g>
      <path className="bf-box" d="m80 44 58-5 17 17-58 6Z"/><path className="bf-paper" d="m80 44 17 18v28L80 74Zm17 18 58-6v28l-58 6Z"/>
      <path className="bf-return" d="M115 48a18 18 0 1 1-8 22m8-22-1 12 12-2"/>
    </g> : <g><path className="bf-paper" d="m81 62 50-7 26 16-50 7Z"/><path className="bf-seam" d="m107 68 25-3m-15 11 14-2"/></g>}
  </svg>;
}

/** Kept beside the instructions, outside the live camera frame. */
export function CaptureHelp() {
  return <figure className="board-capture-help has-photo"><img src={BRAND_IMAGES.captureGuide} alt="휴대폰을 판 위에 평행하게 들고 판 전체를 찍는 모습" width={900} height={900} loading="lazy" decoding="async"/><figcaption><strong>휴대폰을 판 위에서 평행하게</strong><span>흔들림과 빛 반사를 피하고 숫자·말이 선명하게 보이도록 찍어 주세요.</span></figcaption></figure>;
}

export function CurrentTurnMark() {
  return <span className="board-turn-mark" role="img" aria-label="현재 차례" title="현재 차례"><svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="4"/><circle cx="6.5" cy="6.5" r="1.3"/><circle cx="10" cy="10" r="1.3"/><circle cx="13.5" cy="13.5" r="1.3"/></svg></span>;
}

// Mount on a successful event, keyed by its event counter; never mount for pending or failed work.
// The visible toast/status owns the announcement, so this card stays decorative.
export function BoardEvent({ kind }: { kind: 'save' | 'reopen' }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 2200); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div className={`board-event board-event-${kind} has-photo`} aria-hidden="true">
    <img src={BRAND_IMAGES.saveBox} alt="" width={720} height={720} decoding="async"/>
    <span className="board-event-label"><b className="board-event-check-dot"><Check size={14} strokeWidth={3}/></b>{kind === 'save' ? '상자에 담았어요' : '그대로 꺼냈어요'}</span>
  </div>;
}
