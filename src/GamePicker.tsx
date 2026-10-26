import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { GameCatalogEntry } from '../shared/gameEssentials';
import { filterCatalog, supportLabel } from './gamePickerModel';
import './game-picker.css';

/**
 * Inline picker inside the create dialog (no nested modal, so the dialog keeps one focus trap and scroll lock).
 * Typing only filters the list; the selection changes when a game is tapped.
 */
export function GamePicker({ packs, value, onChange, disabled = false, initialOpen = false }: { packs: GameCatalogEntry[]; value: string; onChange: (id: string) => void; disabled?: boolean; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState('');
  const panelId = useId(), listId = useId(), countId = useId();
  const trigger = useRef<HTMLButtonElement>(null), input = useRef<HTMLInputElement>(null), panel = useRef<HTMLDivElement>(null);
  const selected = packs.find(pack => pack.id === value);
  const results = useMemo(() => filterCatalog(packs, query), [packs, query]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    // Keep the panel inside the sheet's own scroll area; never scroll the page behind the dialog.
    requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'nearest' }));
  }, [open]);

  function close(returnFocus = true) { setOpen(false); if (returnFocus) requestAnimationFrame(() => trigger.current?.focus()); }
  function choose(id: string) { onChange(id); close(); }
  function onKey(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (query) setQuery(''); else close(); }
    // Enter in the search box must never submit the surrounding create form.
    if (event.key === 'Enter' && event.target === input.current) { event.preventDefault(); if (results.length === 1) choose(results[0].id); return; }
    if (event.key === 'ArrowDown' && event.target === input.current) { event.preventDefault(); panel.current?.querySelector<HTMLButtonElement>('.game-picker-option')?.focus(); }
  }
  function onListKey(event: KeyboardEvent<HTMLUListElement>) {
    const options = [...(event.currentTarget.querySelectorAll<HTMLButtonElement>('.game-picker-option'))];
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' && index < options.length - 1) { event.preventDefault(); options[index + 1].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); (index > 0 ? options[index - 1] : input.current)?.focus(); }
  }

  return <div className={`game-picker ${open ? 'open' : ''}`} onKeyDown={onKey}>
    <button ref={trigger} type="button" className="game-picker-trigger" aria-expanded={open} aria-controls={panelId} disabled={disabled || !packs.length} onClick={() => open ? close(false) : setOpen(true)}>
      <span className="game-picker-label">게임 선택</span>
      <span className="game-picker-current">
        <strong>{selected ? selected.title : packs.length ? '게임을 골라 주세요' : '게임 목록을 불러오지 못했어요'}</strong>
        {selected && <small>{selected.edition} · {supportLabel(selected)}</small>}
      </span>
      <ChevronDown size={20} aria-hidden="true" className="game-picker-chevron"/>
    </button>
    {open && <div ref={panel} id={panelId} className="game-picker-panel" role="group" aria-label="게임 검색과 목록">
      <div className="game-picker-search">
        <Search size={18} aria-hidden="true"/>
        <input ref={input} type="search" inputMode="search" enterKeyHint="search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} placeholder="게임 이름 검색 (초성도 가능)" aria-label="게임 이름 검색" aria-controls={listId} aria-describedby={countId}/>
        {query && <button type="button" className="icon-button game-picker-clear" aria-label="검색어 지우기" onClick={() => { setQuery(''); input.current?.focus(); }}><X size={18}/></button>}
      </div>
      <p id={countId} className="game-picker-count" aria-live="polite">{query ? `‘${query}’ 검색 결과 ${results.length}개` : `전체 ${packs.length}개`}</p>
      {results.length ? <ul id={listId} className="game-picker-list" role="listbox" aria-label="게임 목록" onKeyDown={onListKey}>
        {results.map(pack => <li key={pack.id} role="none">
          <button type="button" role="option" aria-selected={pack.id === value} className={`game-picker-option ${pack.id === value ? 'selected' : ''}`} onClick={() => choose(pack.id)}>
            <span className="game-picker-option-text"><strong>{pack.title}</strong><small>{pack.edition}</small></span>
            <span className={`game-picker-badge ${pack.support?.recording === 'native' ? 'native' : 'manual'}`}>{supportLabel(pack)}</span>
            {pack.id === value && <Check size={18} className="game-picker-check" aria-hidden="true"/>}
          </button>
        </li>)}
      </ul> : <div className="game-picker-empty" role="status"><p>‘{query}’와 맞는 게임이 없어요.</p><button type="button" className="button text small-button" onClick={() => { setQuery(''); input.current?.focus(); }}>검색어 지우기</button></div>}
      <button type="button" className="button secondary small-button game-picker-close" onClick={() => close()}>닫기{selected ? ` · ${selected.title} 유지` : ''}</button>
    </div>}
  </div>;
}
