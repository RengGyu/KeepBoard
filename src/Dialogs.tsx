import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import type {GameCatalogEntry} from '../shared/gameEssentials';
import type { Player, SessionView } from '../shared/types';
import { DEFAULT_PLAYERS, observedColorCSS } from '../shared/playerColors';
import { api } from './api';
import { Busy, Modal } from './ui';
import {ArtLibrary} from './ArtLibrary';
import {GamePicker} from './GamePicker';
import {createRequest, filterCatalog, supportLabel} from './gamePickerModel';
import {CREATION_COLORS} from './creationPlayers';
import gameThumbs from './gameThumbs.json';

export function CreateDialog({ packs, onClose, onCreated }: { packs: GameCatalogEntry[]; onClose: () => void; onCreated: (view: SessionView) => void }) {
  const [name, setName] = useState('');
  const [packId, setPackId] = useState(packs[0]?.id || '');
  const [players, setPlayers] = useState<Player[]>(() => DEFAULT_PLAYERS.map(player => ({ ...player })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Modal title="새로운 판 기록" onClose={onClose}><form className="modal-body form-stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onCreated(await api.create(createRequest({ name, packId, packs, players }))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '세션 생성 실패'); } finally { setBusy(false); }
  }}>
    <GamePicker packs={packs} value={packId} onChange={setPackId} disabled={busy}/>
    <label>기록 이름<input value={name} onChange={event => setName(event.target.value)} placeholder={`예: 토요일의 ${packs.find(pack => pack.id === packId)?.title || '보드게임'}`} maxLength={100}/></label>
    <PlayerRows game={packId} players={players} onChange={setPlayers}/>

    {error && <p className="inline-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy || !packId}>{busy ? <Busy/> : <><Plus size={17}/>기록 시작</>}</button>
  </form></Modal>;
}

export function PlayerRows({ players, onChange, fixedIds = [], game, fixedCount=false }: { players: Player[]; onChange: (players: Player[]) => void; fixedIds?: string[]; game?: string; fixedCount?:boolean }) {
  const colors = CREATION_COLORS;
  return <fieldset><legend>{game === 'rummikub' ? '플레이어 표시색 · 타일 인쇄색과 별개예요' : '플레이어'}</legend><div className="player-editor">{players.map((player, index) => <div key={player.id}><input type="color" aria-label={`${index + 1}번 플레이어 색상`} value={observedColorCSS(player.color) ?? '#cfcabb'} onInput={event => onChange(players.map(item => item.id === player.id ? { ...item, color: event.currentTarget.value } : item))} onChange={event => onChange(players.map(item => item.id === player.id ? { ...item, color: event.target.value } : item))}/><input maxLength={40} placeholder={`플레이어 ${index + 1}`} aria-label={`${index + 1}번 플레이어 이름`} value={player.name} onChange={event => onChange(players.map(item => item.id === player.id ? { ...item, name: event.target.value } : item))}/>{!fixedCount && !fixedIds.includes(player.id) && <button className="icon-button" type="button" disabled={players.length <= 1} aria-label={`${player.name} 제거`} onClick={() => onChange(players.filter(item => item.id !== player.id))}><Trash2 size={16}/></button>}</div>)}</div>{!fixedCount&&<button type="button" className="button text small-button" disabled={players.length >= 12} onClick={() => onChange([...players, { id: globalThis.crypto.randomUUID(), name: `플레이어 ${players.length + 1}`, color: colors[players.length % colors.length] }])}><Plus size={16}/>플레이어 추가</button>}</fieldset>;
}

export function PlayersDialog({ players, onClose, onSave, game }: { players: Player[]; onClose: () => void; onSave: (players: Player[]) => Promise<void>; game?: string }) {
  const [draft, setDraft] = useState(() => structuredClone(players));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <Modal title="플레이어 이름과 색" onClose={onClose}><form className="modal-body form-stack" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await onSave(draft); onClose(); } catch (reason) { setError(reason instanceof Error ? reason.message : '변경하지 못했어요.'); } finally { setBusy(false); } }}><PlayerRows game={game} players={draft} onChange={setDraft} fixedIds={players.map(p => p.id)}/>{error && <p role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? <Busy/> : <><Check size={16}/>이름·색 반영</>}</button></form></Modal>;
}

export function LibraryDialog({ packs, onClose }: { packs: GameCatalogEntry[]; onClose: () => void; onChanged: () => Promise<void> }) {
  return <Modal title="게임" onClose={onClose} wide><div className="modal-body"><LibraryPanel packs={packs}/></div></Modal>;
}


/** The game list on its own, so the games tab and the dialog share one list. */
export function LibraryPanel({ packs }: { packs: GameCatalogEntry[] }) {
  const [art,setArt]=useState(false),[search,setSearch]=useState('');
  const shown=filterCatalog(packs,search);
  return <div className="library-panel"><div className="art-library-tabs" role="tablist" aria-label="게임 메뉴"><button type="button" role="tab" aria-selected={!art} className={!art?'active':''} onClick={()=>setArt(false)}>기록할 게임</button><button type="button" role="tab" aria-selected={art} className={art?'active':''} onClick={()=>setArt(true)}>구성물 보기</button></div>{art?<ArtLibrary/>:<><input type="search" name="game-search" aria-label="게임 찾기" autoComplete="off" enterKeyHint="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="게임 찾기…"/>{shown.length?<div className="pack-list">{shown.map(pack => { const thumb=(gameThumbs as Record<string,string>)[pack.id]; return <div key={pack.id} className="pack-row"><span className="pack-thumb" aria-hidden="true">{thumb?<img src={thumb} alt="" width={44} height={44} loading="lazy" decoding="async"/>:<b>{pack.title.slice(0,1)}</b>}</span><div><h3>{pack.title}</h3><p className="muted"><span>{pack.edition}</span>{<span className="pack-support">{supportLabel(pack)}</span>}</p></div></div>; })}</div>:<p className="pack-empty muted">‘{search}’에 맞는 게임이 없어요.</p>}</>}</div>;
}
