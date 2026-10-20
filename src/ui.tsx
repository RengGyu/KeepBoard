import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ArrowRight, Hexagon, LoaderCircle, X } from 'lucide-react';
import type { Value } from '../shared/types';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
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
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'modal-wide' : ''}`} ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={21}/></button></header>
      {children}
    </div>
  </div>;
}

export function Busy({ label = '처리하고 있어요' }: { label?: string }) { return <span className="busy"><LoaderCircle size={16} className="spin"/>{label}</span>; }
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty"><div className="empty-mark"><Hexagon size={30}/></div><h3>{title}</h3><p>{children}</p>{action}</div>; }
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
