import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import type { Value } from '../shared/types';
import { ComponentArt } from './ComponentArt';
import { CarcassonneArt } from './CarcassonneArt';
import { EmptyBoardArt, LoaderMark, type EmptyScene } from './BoardFeedback';
import { BRAND_IMAGES } from './brandImages';
import { attachSheetDrag } from './gestures';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handler); prior?.focus(); };
  }, []);
  // On a phone the dialog is a bottom sheet: drag its handle or header down to close it.
  useEffect(() => {
    if (!panel.current || !grip.current || !header.current) return;
    return attachSheetDrag(panel.current, [grip.current, header.current], () => closeRef.current());
  }, []);
  const dialog = <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="sheet-handle" ref={grip} aria-hidden="true"/>
      <header className="modal-header" ref={header}><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={21}/></button></header>
      {children}
    </div>
  </div>;
  // On body: a dialog rendered inside .main-content (its own stacking context) sat under the sticky app bar.
  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}

// A player's colour as that game's own piece; games without piece art keep a plain colour chip.
export function PlayerPiece({ color, game, size = 22 }: { color?: string; game?: string; size?: number }) {
  const art = game === 'catan-base' ? <ComponentArt kind="settlement" color={color} size={size}/> : game?.includes('carcassonne') ? <CarcassonneArt kind="follower" color={color} size={size}/> : <i className="player-chip" style={{ background: color, width: size * .62, height: size * .62 }}/>;
  return <span className="player-piece" aria-hidden="true">{art}</span>;
}
export function Busy({ label = '처리하고 있어요', announce = false }: { label?: string; announce?: boolean }) { return <span className="busy" role={announce ? 'status' : undefined}><LoaderMark size={20}/>{label}</span>; }
export function Empty({ title, children, action, scene }: { title: string; children: ReactNode; action?: ReactNode; scene?: EmptyScene }) {
  const context = scene ?? (title.includes('검색') ? 'search' : title.includes('삭제') ? 'trash' : /보드|저장한 판|첫 번째 판/.test(title) ? 'boards' : 'quiet');
  // A first, empty collection gets the illustrated empty table; search/trash keep the small line art.
  if (context === 'boards') return <div className="empty board-empty has-photo"><img className="empty-photo" src={BRAND_IMAGES.emptyTable} alt="" width={1400} height={933} loading="lazy" decoding="async"/><div className="empty-copy"><h3>{title}</h3><p>{children}</p>{action}</div></div>;
  return <div className="empty board-empty"><div className="empty-mark"><EmptyBoardArt scene={context}/></div><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function SectionHeading({ number, title, description, children }: { number?: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="section-heading"><div>{number && <span className="eyebrow">{number}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</div>;
}
export function NextButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) { return <button className="button primary" onClick={onClick} disabled={disabled}>{children}<ArrowRight size={17}/></button>; }
export function formatValue(value: Value | undefined): string {
  if (value === undefined || value === null) return '미기록';
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
export function formatDate(date: string) { return new Date(date).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
