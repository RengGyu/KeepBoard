import { useState } from 'react';
import { Check, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { AIStatus, GamePack, Player, SessionView } from '../shared/types';
import { api } from './api';
import { Busy, Modal } from './ui';

export function SettingsDialog({ status, onClose, onSaved }: { status: AIStatus | null; onClose: () => void; onSaved: (status: AIStatus) => void }) {
  const [provider, setProvider] = useState<'gemini' | 'openai'>(status?.provider || 'gemini');
  const [model, setModel] = useState(status?.model || 'gemini-3.8-flash');
  const [key, setKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(status?.baseUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Modal title="AI 연결 설정" onClose={onClose}><form className="modal-body form-stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const next = await api.settings({ provider, model, apiKey: key, baseUrl: baseUrl || undefined }); onSaved(next); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '설정 저장 실패'); } finally { setBusy(false); }
  }}>
    <div className="notice"><KeyRound size={19}/><div><strong>{status?.configured ? 'AI가 연결되어 있어요' : '직접 확인 모드로 사용할 수 있어요'}</strong><p>AI를 연결하면 촬영한 판에서 상태 후보를 추출합니다. 후보는 확인 후 기록에 반영됩니다.</p></div></div>
    <label>제공자<select value={provider} onChange={event => { const value = event.target.value as 'gemini' | 'openai'; setProvider(value); setModel(value === 'gemini' ? 'gemini-3.8-flash' : 'gpt-6.1-sol'); }}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label>
    <label>모델 이름<input required value={model} onChange={event => setModel(event.target.value)} placeholder="이미지 입력을 지원하는 모델"/></label>
    <label>API 키<input type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} placeholder={status?.configured ? '비워두면 기존 키를 유지합니다' : 'API 키를 입력하세요'}/></label>
    <details><summary>고급 연결 설정</summary><label className="mt">API 기본 URL<input type="url" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="제공자의 기본 주소 사용"/></label></details>
    {error && <p className="inline-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy ? <Busy label="연결 설정 저장 중"/> : <><Check size={17}/>설정 저장</>}</button>
  </form></Modal>;
}

export function CreateDialog({ packs, onClose, onCreated }: { packs: GamePack[]; onClose: () => void; onCreated: (view: SessionView) => void }) {
  const [name, setName] = useState('');
  const [packId, setPackId] = useState(packs[0]?.id || '');
  const [players, setPlayers] = useState<Player[]>([{ id: 'red', name: '플레이어 1', color: '#c65d4b' }, { id: 'blue', name: '플레이어 2', color: '#6285aa' }, { id: 'orange', name: '플레이어 3', color: '#d5a44d' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const colors = ['#c65d4b', '#6285aa', '#d5a44d', '#78967a', '#997ba6', '#b68a64'];
  return <Modal title="새로운 판 기록" onClose={onClose}><form className="modal-body form-stack" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onCreated(await api.create({ name: name.trim() || undefined, gamePackId: packId, players })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '세션 생성 실패'); } finally { setBusy(false); }
  }}>
    <label>게임<select required value={packId} onChange={event => setPackId(event.target.value)}>{packs.map(pack => <option key={pack.id} value={pack.id}>{pack.title} · {pack.edition}</option>)}</select></label>
    <label>기록 이름<input value={name} onChange={event => setName(event.target.value)} placeholder="예: 토요일의 카탄" maxLength={100}/></label>
    <fieldset><legend>플레이어 <span className="muted small">개인 기록의 소유자를 구분합니다</span></legend><div className="player-editor">{players.map((player, index) => <div key={player.id}><input type="color" aria-label={`${index + 1}번 플레이어 색상`} value={player.color} onChange={event => setPlayers(players.map(item => item.id === player.id ? { ...item, color: event.target.value } : item))}/><input required aria-label={`${index + 1}번 플레이어 이름`} value={player.name} onChange={event => setPlayers(players.map(item => item.id === player.id ? { ...item, name: event.target.value } : item))}/><button className="icon-button" type="button" disabled={players.length <= 1} aria-label={`${player.name} 제거`} onClick={() => setPlayers(players.filter(item => item.id !== player.id))}><Trash2 size={16}/></button></div>)}</div><button type="button" className="button text small-button" disabled={players.length >= 6} onClick={() => setPlayers([...players, { id: `player-${Date.now()}`, name: `플레이어 ${players.length + 1}`, color: colors[players.length % colors.length] }])}><Plus size={16}/>플레이어 추가</button></fieldset>
    {error && <p className="inline-error" role="alert">{error}</p>}<button className="button primary full" disabled={busy || !packId}>{busy ? <Busy/> : <><Plus size={17}/>기록 시작</>}</button>
  </form></Modal>;
}

export function LibraryDialog({ packs, onClose }: { packs: GamePack[]; onClose: () => void; onChanged: () => Promise<void> }) {
  return <Modal title="게임" onClose={onClose}><div className="modal-body"><div className="pack-list">{packs.map(pack => <div key={pack.id}><h3>{pack.title}</h3><p className="muted">{pack.edition}</p></div>)}</div></div></Modal>;
}
