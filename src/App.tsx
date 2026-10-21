import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Clock3, Hexagon, LayoutGrid, MoreHorizontal, Plus, RefreshCw, Search, Trash2, Undo2, X } from 'lucide-react';
import type { AIStatus, GamePack, Session, SessionView } from '../shared/types';
import { api } from './api';
import { CreateDialog, LibraryDialog } from './Dialogs';
import { fire, type Mutate } from './Fields';
import SessionWorkspace from './SessionWorkspace';
import { Busy, Empty, PlayerPiece, formatDate } from './ui';
import {redactSession,redactView} from '../shared/privacy';
import { BRAND_IMAGES } from './brandImages';
import {GameCover} from './GameCover';
import {BoardEvent, LoaderMark} from './BoardFeedback';

type Dialog = 'create' | 'library' | null;

export default function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [packs, setPacks] = useState<GamePack[]>([]);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [ownerId, setOwnerIdState] = useState<string | undefined>(new URLSearchParams(location.search).get('player') || undefined);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [reopenFeedback, setReopenFeedback] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'saved' | 'trash'>('all');
  const [deleteUndo, setDeleteUndo] = useState<string[]>([]);
  const leaveWorkspace = useRef<(() => Promise<void>) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(0);
  const liveView = useRef(view); liveView.current = view;
  const showToast = useCallback((message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4200); }, []);
  const refreshPacks = async () => setPacks(await api.packs());
  const updateUrl = (sessionId?: string, playerId?: string) => {
    const url = new URL(location.href);
    url.searchParams.delete('step');
    if (sessionId) url.searchParams.set('session', sessionId); else url.searchParams.delete('session');
    if (sessionId && playerId) url.searchParams.set('player', playerId); else url.searchParams.delete('player');
    history.replaceState({}, '', url);
  };
  const setOwnerId = async (id?: string) => {
    if(!view)return;
    const sessionId=view.session.id;
    const locking=api.lockPrivate(sessionId);
    receive(redactView(view,new Set(view.privacy?.protectedOwnerIds??[]),new Set()));
    setOwnerIdState(id);updateUrl(sessionId,id);setBusy(true);
    try{await locking;receive(await api.session(sessionId));}finally{setBusy(false);}
  };
  const receive = (next: SessionView) => {
    liveView.current = next;
    setView(next);
    const listSession=redactSession(next.session,next.pack,new Set(next.privacy?.protectedOwnerIds??[]),new Set());
    setSessions(current => [{ ...listSession, deletedAt: current.find(item => item.id === next.session.id)?.deletedAt }, ...current.filter(item => item.id !== next.session.id)]);
  };
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { await api.lockPrivate(view?.session.id);const next = await api.session(id); receive(next); if (next.session.snapshots.length) setReopenFeedback(current => current + 1); updateUrl(id, ownerId); requestAnimationFrame(() => window.scrollTo({ top: 0 })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '기록을 열지 못했습니다.'); } finally { setBusy(false); }
  };
  const created = async (next: SessionView) => { await leaveWorkspace.current?.();await api.lockPrivate(view?.session.id); receive(next); setDialog(null); setOwnerIdState(undefined); updateUrl(next.session.id); requestAnimationFrame(() => window.scrollTo({ top: 0 })); };
  const mutate: Mutate = async (task, message, options) => {
    pending.current += 1; setBusy(true); setError('');
    try { receive(await task()); if (message) showToast(message); }
    catch (reason) { if(!options?.localError)setError(reason instanceof Error ? reason.message : '변경 내용을 저장하지 못했습니다.'); throw reason; }
    finally { pending.current -= 1; setBusy(pending.current > 0); }
  };
  const back = () => fire((async () => { await leaveWorkspace.current?.();await api.lockPrivate(view?.session.id); setView(null); setOwnerIdState(undefined); updateUrl(); setSessions(await api.sessions(true)); })());

  async function hideBoards(id?: string) {
    setBusy(true); setError(''); setToast('');
    try { const result = id ? await api.removeSession(id) : await api.archiveSessions(); setDeleteUndo(result.ids); setSessions(await api.sessions(true)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '보드를 삭제하지 못했어요.'); }
    finally { setBusy(false); }
  }
  async function restoreBoards(ids: string[]) {
    setBusy(true); setError('');
    try { await api.restoreSessions(ids); setSessions(await api.sessions(true)); setDeleteUndo([]); showToast('보드를 복원했어요'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '보드를 복원하지 못했어요.'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      setLoading(true); setError('');
      try {
        const results = await Promise.all([api.sessions(true), api.packs(), api.status()]);
        if (cancelled) return;
        setSessions(results[0]); setPacks(results[1]); setStatus(results[2]);
        const id = new URLSearchParams(location.search).get('session');
        if (id) { const next = await api.session(id); if (!cancelled) { setView(next); if (next.session.snapshots.length) setReopenFeedback(current => current + 1); } }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : '서버에 연결하지 못했습니다.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (view && ownerId && !view.session.players.some(player => player.id === ownerId)) {
      setOwnerIdState(undefined);
      updateUrl(view.session.id);
    }
  }, [view?.session.id, ownerId]);

  useEffect(() => {
    if (!view?.session.id) return;
    let cancelled = false;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight || pending.current || dialog || document.hidden || document.querySelector('[role="dialog"]')) return;
      const active = document.activeElement;
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
      inFlight = true;
      try {
        const next = await api.session(view.session.id);
        if (!cancelled && !pending.current && liveView.current?.session.id === next.session.id && (liveView.current.session.updatedAt !== next.session.updatedAt||JSON.stringify(liveView.current.privacy)!==JSON.stringify(next.privacy))) receive(next);
      } catch { /* Keep local work visible; a subsequent mutation reports server errors. */ }
      finally { inFlight = false; }
    }, 4500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [view?.session.id, dialog]);

  const liveSessions = sessions.filter(session => !session.deletedAt);
  const visibleSessions = sessions.filter(session => (filter === 'trash' ? !!session.deletedAt : !session.deletedAt) && (!search || `${session.name} ${packs.find(pack => pack.id === session.gamePackId)?.title || ''}`.toLowerCase().includes(search.toLowerCase())) && (filter !== 'saved' || session.snapshots.length > 0));
  const savedCount = liveSessions.filter(session => session.snapshots.length).length;
  const openExample = () => fire(mutate(() => api.create({ example: true }), '카탄 예시를 열었어요').then(() => { const next = liveView.current; if (next) updateUrl(next.session.id); }));
  return <div className="app-shell">
    <header className="app-bar">
      <button className="brand" onClick={back} aria-label="KeepBoard 내 보드로"><span className="brand-icon" aria-hidden="true"><Hexagon size={26} strokeWidth={2.4}/><span/></span>KeepBoard</button>
      <nav className="app-nav" aria-label="메인 메뉴"><button className={!view ? 'active' : ''} aria-current={!view ? 'page' : undefined} onClick={back}><LayoutGrid size={18}/><span>내 보드</span></button><button onClick={() => setDialog('library')}><BookOpen size={18}/><span>게임</span></button></nav>
      <button className="button primary small-button app-new" aria-label="새 보드" disabled={busy || !packs.length} onClick={() => setDialog('create')}><Plus size={18}/><span>새 보드</span></button>
    </header>
    <main className={`main-content ${view ? 'in-session' : ''}`}>
      {loading ? <div className="loading-screen" role="status"><LoaderMark size={32}/><p>보드를 불러오고 있어요</p></div> : view ? <SessionWorkspace key={`${view.session.id}:${ownerId||'public'}:${view.privacy?.unlockedOwnerIds.join(',')||'locked'}`} view={view} busy={busy} status={status} mutate={mutate} onBack={back} ownerId={ownerId} setOwnerId={setOwnerId} onToast={showToast} onReadyToLeave={save => { leaveWorkspace.current = save; }}/> : <div className="home">
        <header className="home-head has-photo"><div className="home-head-photo" aria-hidden="true"><img src={BRAND_IMAGES.homeHero} srcSet={`${BRAND_IMAGES.homeHeroSmall} 900w, ${BRAND_IMAGES.homeHero} 1600w`} sizes="(max-width: 760px) 100vw, 1360px" alt="" width={1600} height={1066} fetchPriority="high" decoding="async"/></div><div className="home-head-copy"><span className="eyebrow">KeepBoard · 보드게임 기록</span><h1>내 보드</h1><p>판을 사진으로 남기고, 그림에서 고쳐 이어가요.</p><div className="home-stats"><span className="stat-chip stat-all">전체 판<b>{liveSessions.length}</b></span><span className="stat-chip stat-saved">저장한 판<b>{savedCount}</b></span><span className="stat-chip stat-games">게임<b>{packs.length}</b></span></div><button className="button home-example" disabled={busy || !packs.length} onClick={openExample}>카탄 예시 열기</button></div></header>
        <div className="board-filters"><div className="filter-tabs" role="tablist" aria-label="보드 보기"><button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button><button role="tab" aria-selected={filter === 'saved'} className={filter === 'saved' ? 'active' : ''} onClick={() => setFilter('saved')}>저장한 판<span>{savedCount}</span></button><button role="tab" aria-selected={filter === 'trash'} className={filter === 'trash' ? 'active' : ''} onClick={() => setFilter('trash')}>삭제한 보드</button></div><div className="board-tools"><label className="search-box"><Search size={17}/><input aria-label="보드 검색" placeholder="보드 검색" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="검색 지우기" onClick={() => setSearch('')}><X size={15}/></button>}</label><button className="icon-button" aria-label="보드 목록 새로고침" disabled={busy} onClick={() => fire(api.sessions(true).then(setSessions).catch(reason => setError(String(reason))))}><RefreshCw size={18}/></button><details className="board-menu"><summary aria-label="보드 메뉴"><MoreHorizontal size={20}/></summary><button disabled={busy || !liveSessions.length} onClick={() => void hideBoards()}><Trash2 size={15}/>전체 삭제</button></details></div></div>
        {visibleSessions.length ? <div className="session-list">{visibleSessions.map(session => {
          const pack = packs.find(item => item.id === session.gamePackId);
          const evidence = session.evidence.find(item => item.scope === 'public' && !item.ownerId);
          return <article className="session-card" key={session.id}><button className="session-open" disabled={busy || !!session.deletedAt} onClick={() => void open(session.id)}><div className="session-card-image">{evidence?.url ? <img src={evidence.url} alt={`${session.name} 보드 미리보기`} loading="lazy"/> : <GameCover gameId={session.gamePackId} label={`${pack?.title ?? '게임'} · 대표 표지 그림`}/>}<span className={`session-status ${session.snapshots.length ? 'is-saved' : 'is-recording'}`}>{session.snapshots.length ? <Check size={13}/> : <Clock3 size={13}/>}{session.snapshots.length ? '저장됨' : '기록 중'}</span></div><div className="session-card-body"><h3>{session.name}</h3><p className="session-card-meta">{pack?.title || session.gamePackId}{session.example && <span>예시</span>}<span className="dot-divider" aria-hidden="true">·</span>{formatDate(session.updatedAt)}</p><div className="session-card-footer"><div className="player-colors" aria-label={`${session.players.length}명: ${session.players.map(player => player.name).join(', ')}`}>{session.players.map(player => <PlayerPiece key={player.id} color={player.color} game={session.gamePackId} size={26}/>)}</div>{!session.deletedAt && <span className="session-go">이어하기<ArrowRight size={16}/></span>}</div></div></button>{session.deletedAt ? <button className="button secondary small-button restore-board" disabled={busy} onClick={() => void restoreBoards([session.id])}><Undo2 size={15}/>복원</button> : <button className="icon-button session-delete" aria-label={`${session.name} 삭제`} disabled={busy} onClick={() => void hideBoards(session.id)}><Trash2 size={16}/></button>}</article>;
        })}</div> : <Empty title={search ? '검색 결과가 없어요' : filter === 'trash' ? '삭제한 보드가 없어요' : filter === 'saved' ? '아직 저장한 판이 없어요' : '첫 번째 판을 기록해 보세요'} action={filter === 'trash' ? undefined : <div className="button-row empty-actions"><button className="button primary" disabled={!packs.length || busy} onClick={() => setDialog('create')}><Plus size={17}/>새 보드</button><button className="button secondary" disabled={!packs.length || busy} onClick={openExample}>카탄 예시 열기</button></div>}>{search ? '다른 이름이나 게임으로 찾아보세요.' : filter === 'trash' ? '삭제한 보드는 여기에서 복원할 수 있어요.' : '게임판 사진을 찍으면 그림으로 바꿔 고칠 수 있어요.'}</Empty>}
      </div>}
      {error && <div className="error-banner" role="alert"><div><strong>요청을 완료하지 못했어요</strong><p>{error}</p></div><button className="icon-button" aria-label="오류 닫기" onClick={() => setError('')}><X size={18}/></button></div>}
    </main>
    {dialog === 'create' && <CreateDialog packs={packs} onClose={() => setDialog(null)} onCreated={created}/>}
    {dialog === 'library' && <LibraryDialog packs={packs} onClose={() => setDialog(null)} onChanged={refreshPacks}/>}
    {deleteUndo.length > 0 && <div className="delete-undo" role="status"><span>보드 {deleteUndo.length}개를 삭제했어요.</span><button disabled={busy} onClick={() => void restoreBoards(deleteUndo)}><Undo2 size={15}/>되돌리기</button></div>}
    {toast && !deleteUndo.length && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {reopenFeedback > 0 && <BoardEvent key={reopenFeedback} kind="reopen"/>}
    {busy && !view && <div className="mutation-indicator" role="status"><Busy/></div>}
  </div>;
}
