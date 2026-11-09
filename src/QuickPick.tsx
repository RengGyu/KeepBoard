import { useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

// Tap-to-set controls shared by every game's correction sheet: a value is one tap, never a dropdown.

export interface PickOption<T> { value: T; label: string; art?: ReactNode }

/** A row (or grid, when options carry art) of choices; the current one is pressed. "?" sets unknown. */
export function ChipPick<T extends string | number | boolean>({ label, options, value, onChange, disabled = false, unknown = true, onNone }: { onNone?: () => void; label: string; options: PickOption<T>[]; value: T | null | undefined; onChange: (value: T | null) => void; disabled?: boolean; unknown?: boolean }) {
  const withArt = options.some(option => option.art);
  // Long lists (a few games have 17+ shapes) show the first row or two; the current value always stays visible.
  const [all, setAll] = useState(false);
  const limit = 11, long = options.length > limit + 1;
  const shown = !long || all ? options : options.filter((option, index) => index < limit || option.value === value);
  return <fieldset className={`qp ${withArt ? 'qp-art' : 'qp-chips'}`}><legend>{label}</legend><div>
    {shown.map(option => <button type="button" key={String(option.value)} aria-pressed={value === option.value} aria-label={withArt ? option.label : undefined} disabled={disabled} onClick={() => onChange(option.value)}>{option.art}<span>{option.label}</span></button>)}
    {long && <button type="button" className="qp-more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? '접기' : `+${options.length - shown.length}`}</button>}
    {unknown && <button type="button" className="qp-unknown" aria-pressed={value == null} aria-label={`${label} 모름`} disabled={disabled} onClick={() => onChange(null)}>?</button>}
    {onNone && <button type="button" className="qp-none" disabled={disabled} onClick={onNone}>없음</button>}
  </div></fieldset>;
}

/** A count: minus, the number, plus. "?" keeps it unknown (never silently 0). */
export function Stepper({ label, value, onChange, min = 0, max, disabled = false }: { label: string; value: number | null; onChange: (value: number | null) => void; min?: number; max?: number; disabled?: boolean }) {
  const step = (delta: number) => { const base = value ?? (delta > 0 ? min - 1 : min + 1); const next = base + delta; if (next < min || (max !== undefined && next > max)) return; onChange(next); };
  return <fieldset className="qp qp-stepper"><legend>{label}</legend><div>
    <button type="button" aria-label={`${label} 하나 줄이기`} disabled={disabled || (value !== null && value <= min)} onClick={() => step(-1)}><Minus size={18} aria-hidden="true"/></button>
    <output aria-live="polite">{value ?? '?'}</output>
    <button type="button" aria-label={`${label} 하나 늘리기`} disabled={disabled || (value !== null && max !== undefined && value >= max)} onClick={() => step(1)}><Plus size={18} aria-hidden="true"/></button>
    <button type="button" className="qp-unknown" aria-pressed={value === null} aria-label={`${label} 모름`} disabled={disabled} onClick={() => onChange(null)}>?</button>
  </div></fieldset>;
}
