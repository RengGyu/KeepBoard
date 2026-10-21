import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, BookOpen, Check, ChevronRight, Clock3, FolderOpen, Hexagon, LayoutGrid, LoaderCircle, Plus, RefreshCw, Search, MoreHorizontal, Trash2, Undo2, Sparkles, Users, X } from 'lucide-react';
import type { AIStatus, GamePack, Session, SessionView } from '../shared/types';
import { api } from './api';
import { CreateDialog, LibraryDialog } from './Dialogs';
import { fire, type Mutate } from './Fields';
import SessionWorkspace from './SessionWorkspace';
import { Busy, Empty, formatDate } from './ui';

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
  const setOwnerId = (id?: string) => { setOwnerIdState(id); updateUrl(view?.session.id, id); };
  const receive = (next: SessionView) => {
    liveView.current = next;
    setView(next);
    setSessions(current => [{ ...next.session, deletedAt: current.find(item => item.id === next.session.id)?.deletedAt }, ...current.filter(item => item.id !== next.session.id)]);
  };
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { const next = await api.session(id); receive(next); updateUrl(id, ownerId); requestAnimationFrame(() => window.scrollTo({ top: 0 })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '기록을 열지 못했습니다.'); } finally { setBusy(false); }
  };
  const created = async (next: SessionView) => { await leaveWorkspace.current?.(); receive(next); setDialog(null); setOwnerIdState(undefined); updateUrl(next.session.id); requestAnimationFrame(() => window.scrollTo({ top: 0 })); };
  const mutate: Mutate = async (task, message) => {
    pending.current += 1; setBusy(true); setError('');
    try { receive(await task()); if (message) showToast(message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '변경 내용을 저장하지 못했습니다.'); throw reason; }
    finally { pending.current -= 1; setBusy(pending.current > 0); }
  };
  const back = () => fire((async () => { await leaveWorkspace.current?.(); setView(null); setOwnerIdState(undefined); updateUrl(); setSessions(await api.sessions(true)); })());

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
        if (id) { const next = await api.session(id); if (!cancelled) setView(next); }
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
        if (!cancelled && !pending.current && liveView.current?.session.id === next.session.id && liveView.current.session.updatedAt !== next.session.updatedAt) receive(next);
      } catch { /* Keep local work visible; a subsequent mutation reports server errors. */ }
      finally { inFlight = false; }
    }, 4500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [view?.session.id, dialog]);

  const liveSessions = sessions.filter(session => !session.deletedAt);
  const visibleSessions = sessions.filter(session => (filter === 'trash' ? !!session.deletedAt : !session.deletedAt) && (!search || `${session.name} ${packs.find(pack => pack.id === session.gamePackId)?.title || ''}`.toLowerCase().includes(search.toLowerCase())) && (filter !== 'saved' || session.snapshots.length > 0));
  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={back} aria-label="KeepBoard 내 보드"><span className="brand-icon"><Hexagon size={27} strokeWidth={2.5}/><span/></span>KeepBoard<span className="brand-period">.</span></button><span className="sidebar-caption">멈춘 판도, 이어지는 즐거움.</span><nav aria-label="메인 메뉴"><span className="nav-label">메뉴</span><button className={!view ? 'active' : ''} onClick={back}><LayoutGrid size={19}/>내 보드<span className="nav-count">{liveSessions.length}</span></button><button onClick={() => setDialog('library')}><BookOpen size={19}/>게임 목록</button></nav></aside>
    <main className={`main-content ${view ? 'in-session' : ''}`}>
      {loading ? <div className="loading-screen"><LoaderCircle className="spin" size={30}/><p>보드를 불러오고 있어요</p></div> : view ? <SessionWorkspace key={view.session.id} view={view} busy={busy} status={status} mutate={mutate} onBack={back} ownerId={ownerId} setOwnerId={setOwnerId} onToast={showToast} onReadyToLeave={save => { leaveWorkspace.current = save; }}/> : <>
        <header className="home-topbar"><span>나의 플레이 공간</span><div><span className="today">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</span></div></header>
        <section className="home-hero"><div className="hero-copy"><span className="eyebrow">보드게임 기록</span><h1>오늘의 판을,<br/>다음으로<span>.</span></h1><p>잠깐 멈춰도 괜찮아요.<br/>사진으로 남기고, 그대로 열어 고쳐요.</p><div className="button-row"><button className="button primary" disabled={busy || !packs.length} onClick={() => setDialog('create')}><Plus size={18}/>새 판 기록하기</button><button className="button hero-example" disabled={busy || !packs.length} onClick={() => fire(mutate(() => api.create({ example: true }), '카탄 예시를 열었어요').then(() => { const next = liveView.current; if (next) updateUrl(next.session.id); }))}><PlayIcon/>카탄 예시 둘러보기<ArrowRight size={15}/></button></div></div><div className="hero-art"><div className="art-circle"/><img src="/demo-board.svg" alt="육각형 타일과 길, 마을이 놓인 카탄 예시 보드"/></div></section>
        <section className="boards-section"><div className="boards-heading"><div><h2>내 보드 <span>{liveSessions.length}</span></h2></div><div className="board-tools"><details className="board-menu"><summary aria-label="보드 메뉴"><MoreHorizontal size={20}/></summary><button disabled={busy || !liveSessions.length} onClick={() => void hideBoards()}><Trash2 size={15}/>전체 삭제</button></details><button className="icon-button" aria-label="보드 목록 새로고침" disabled={busy} onClick={() => fire(api.sessions(true).then(setSessions).catch(reason => setError(String(reason))))}><RefreshCw size={17}/></button></div></div>
          <div className="board-filters"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 보드</button><button className={filter === 'saved' ? 'active' : ''} onClick={() => setFilter('saved')}>저장한 판<span>{liveSessions.filter(session => session.snapshots.length).length}</span></button><button className={filter === 'trash' ? 'active' : ''} onClick={() => setFilter('trash')}>삭제한 보드</button></div><label className="search-box"><Search size={16}/><input aria-label="보드 검색" placeholder="보드 검색" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="검색 지우기" onClick={() => setSearch('')}><X size={14}/></button>}</label></div>
          {visibleSessions.length ? <div className="session-list">{visibleSessions.map(session => {
            const pack = packs.find(item => item.id === session.gamePackId);
            const evidence = session.evidence.find(item => item.scope === 'public' && !item.ownerId);
            return <article className="session-card" key={session.id}><button className="session-open" disabled={busy || !!session.deletedAt} onClick={() => void open(session.id)}><div className="session-card-image"><img src={evidence?.url || '/demo-board.svg'} alt={`${session.name} 보드 미리보기`} loading="lazy"/><span className={`session-status ${session.snapshots.length ? 'is-saved' : ''}`}>{session.snapshots.length ? <Check size={11}/> : <Clock3 size={11}/>} {session.snapshots.length ? '저장됨' : '기록 중'}</span></div><div className="session-card-body"><div className="session-card-meta">{pack?.title || session.gamePackId}{session.example && <span>예시</span>}</div><h3>{session.name}</h3><p><Clock3 size={13}/>{formatDate(session.updatedAt)}</p><div className="session-card-footer"><div className="player-colors">{session.players.map(player => <span key={player.id} title={player.name} style={{ background: player.color }}/>)}</div><span>{session.players.length}명<span className="dot-divider">·</span>{session.snapshots.length ? '저장한 판' : '기록 중'}</span><ChevronRight size={17}/></div></div></button>{session.deletedAt ? <button className="button secondary small-button restore-board" disabled={busy} onClick={() => void restoreBoards([session.id])}><Undo2 size={15}/>복원</button> : <button className="icon-button session-delete" aria-label={`${session.name} 삭제`} disabled={busy} onClick={() => void hideBoards(session.id)}><Trash2 size={16}/></button>}</article>;
          })}<button className="new-board-tile" disabled={busy || !packs.length} onClick={() => setDialog('create')}><span><Plus size={25}/></span><strong>새로운 판 기록</strong><small>다음 플레이를 준비하세요</small></button></div> : <Empty title={search ? '검색 결과가 없어요' : filter === 'trash' ? '삭제한 보드가 없어요' : filter === 'saved' ? '아직 저장한 판이 없어요' : '첫 번째 판을 기록해 보세요'} action={<button className="button secondary" disabled={!packs.length || busy} onClick={() => setDialog('create')}><Plus size={16}/>새 판 기록</button>}>{search ? '다른 이름이나 게임으로 찾아보세요.' : '새 판을 만들거나 카탄 예시로 전체 흐름을 경험해 보세요.'}</Empty>}
        </section><footer className="home-footer"><span><Hexagon size={15}/>모든 판에는, 다음이 있으니까.</span><button onClick={() => setDialog('library')}>게임 살펴보기 <ArrowRight size={14}/></button></footer>
      </>}
      {error && <div className="error-banner" role="alert"><div><strong>요청을 완료하지 못했어요</strong><p>{error}</p></div><button className="icon-button" aria-label="오류 닫기" onClick={() => setError('')}><X size={18}/></button></div>}
    </main>
    <nav className="mobile-nav" aria-label="모바일 메뉴"><button className={!view ? 'active' : ''} onClick={back}><LayoutGrid size={20}/><span>내 보드</span></button><button onClick={() => setDialog('create')} disabled={!packs.length}><Plus size={22}/><span>새 기록</span></button><button onClick={() => setDialog('library')}><BookOpen size={20}/><span>게임팩</span></button></nav>
    {dialog === 'create' && <CreateDialog packs={packs} onClose={() => setDialog(null)} onCreated={created}/>}

    {dialog === 'library' && <LibraryDialog packs={packs} onClose={() => setDialog(null)} onChanged={refreshPacks}/>}

    {deleteUndo.length > 0 && <div className="delete-undo" role="status"><span>보드 {deleteUndo.length}개를 삭제했어요.</span><button disabled={busy} onClick={() => void restoreBoards(deleteUndo)}><Undo2 size={15}/>되돌리기</button></div>}
    {toast && !deleteUndo.length && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {busy && !view && <div className="mutation-indicator" role="status"><Busy/></div>}
  </div>;
}

function PlayIcon() { return <Sparkles size={17}/>; }
