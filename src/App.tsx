import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, BookOpen, Check, ChevronRight, Clock3, FolderOpen, Hexagon, LayoutGrid, LoaderCircle, Plus, RefreshCw, Search, Settings2, Sparkles, Users, X } from 'lucide-react';
import type { AIStatus, GamePack, Session, SessionView } from '../shared/types';
import { api } from './api';
import { CreateDialog, LibraryDialog, SettingsDialog } from './Dialogs';
import { fire, type Mutate } from './Fields';
import SessionWorkspace, { stages } from './SessionWorkspace';
import { Busy, Empty, formatDate } from './ui';

type Dialog = 'create' | 'settings' | 'library' | null;

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
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const leaveWorkspace = useRef<(() => Promise<void>) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(0);
  const liveView = useRef(view); liveView.current = view;
  const showToast = useCallback((message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4200); }, []);
  const refreshPacks = async () => setPacks(await api.packs());
  const updateUrl = (sessionId?: string, playerId?: string) => {
    const url = new URL(location.href);
    if (!sessionId || url.searchParams.get('session') !== sessionId) url.searchParams.delete('step');
    if (sessionId) url.searchParams.set('session', sessionId); else url.searchParams.delete('session');
    if (sessionId && playerId) url.searchParams.set('player', playerId); else url.searchParams.delete('player');
    history.replaceState({}, '', url);
  };
  const setOwnerId = (id?: string) => { setOwnerIdState(id); updateUrl(view?.session.id, id); };
  const receive = (next: SessionView) => {
    liveView.current = next;
    setView(next);
    setSessions(current => [next.session, ...current.filter(item => item.id !== next.session.id)]);
  };
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { const next = await api.session(id); receive(next); updateUrl(id, ownerId); window.scrollTo({ top: 0 }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '기록을 열지 못했습니다.'); } finally { setBusy(false); }
  };
  const created = async (next: SessionView) => { await leaveWorkspace.current?.(); receive(next); setDialog(null); setOwnerIdState(undefined); updateUrl(next.session.id); window.scrollTo({ top: 0 }); };
  const mutate: Mutate = async (task, message) => {
    pending.current += 1; setBusy(true); setError('');
    try { receive(await task()); if (message) showToast(message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '변경 내용을 저장하지 못했습니다.'); throw reason; }
    finally { pending.current -= 1; setBusy(pending.current > 0); }
  };
  const back = () => fire((async () => { await leaveWorkspace.current?.(); setView(null); setOwnerIdState(undefined); updateUrl(); setSessions(await api.sessions()); })());

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      setLoading(true); setError('');
      try {
        const results = await Promise.all([api.sessions(), api.packs(), api.status()]);
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

  const visibleSessions = sessions.filter(session => (!search || `${session.name} ${packs.find(pack => pack.id === session.gamePackId)?.title || ''}`.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || session.snapshots.length > 0));
  return <div className="app-shell">
    <aside className="sidebar"><button className="brand" onClick={back} aria-label="KeepBoard 내 보드"><span className="brand-icon"><Hexagon size={27} strokeWidth={2.5}/><span/></span>KeepBoard<span className="brand-period">.</span></button><span className="sidebar-caption">멈춘 판도, 이어지는 즐거움.</span><nav aria-label="메인 메뉴"><span className="nav-label">메뉴</span><button className={!view ? 'active' : ''} onClick={back}><LayoutGrid size={19}/>내 보드<span className="nav-count">{sessions.length}</span></button><button onClick={() => setDialog('library')}><BookOpen size={19}/>게임 목록</button></nav><div className="sidebar-bottom"><button className="sidebar-settings" onClick={() => setDialog('settings')}><Settings2 size={18}/>AI 연결 및 설정<span className={`connection-dot ${status?.configured ? 'connected' : ''}`}/></button></div></aside>
    <main className={`main-content ${view ? 'in-session' : ''}`}>
      {loading ? <div className="loading-screen"><LoaderCircle className="spin" size={30}/><p>보드를 불러오고 있어요</p></div> : view ? <SessionWorkspace key={view.session.id} view={view} busy={busy} status={status} mutate={mutate} onBack={back} onSettings={() => setDialog('settings')} ownerId={ownerId} setOwnerId={setOwnerId} onToast={showToast} onReadyToLeave={save => { leaveWorkspace.current = save; }}/> : <>
        <header className="home-topbar"><span>나의 플레이 공간</span><div><span className="today">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</span><button className="icon-button" aria-label="설정" onClick={() => setDialog('settings')}><Settings2 size={20}/></button></div></header>
        <section className="home-hero"><div className="hero-copy"><span className="eyebrow">보드게임 저장 · 이어하기</span><h1>오늘의 판을,<br/>다음으로<span>.</span></h1><p>잠깐 멈춰도 괜찮아요.<br/>사진으로 남기고, 다른 곳만 쉽게 고쳐요.</p><div className="button-row"><button className="button primary" disabled={busy || !packs.length} onClick={() => setDialog('create')}><Plus size={18}/>새 판 기록하기</button><button className="button hero-example" disabled={busy || !packs.length} onClick={() => fire(mutate(() => api.create({ example: true }), '카탄 예시를 열었어요').then(() => { const next = liveView.current; if (next) updateUrl(next.session.id); }))}><PlayIcon/>카탄 예시 둘러보기<ArrowRight size={15}/></button></div><ol className="hero-steps" aria-label="기록 순서">{stages.map((stage, index) => <li key={stage.id}><span>{index + 1}</span>{stage.label}</li>)}</ol></div><div className="hero-art"><div className="art-circle"/><img src="/demo-board.svg" alt="육각형 타일과 길, 마을이 놓인 카탄 예시 보드"/></div></section>
        <section className="boards-section"><div className="boards-heading"><div><h2>내 보드 <span>{sessions.length}</span></h2></div><div className="board-tools"><button className="icon-button" aria-label="보드 목록 새로고침" disabled={busy} onClick={() => fire(api.sessions().then(setSessions).catch(reason => setError(String(reason))))}><RefreshCw size={17}/></button></div></div>
          <div className="board-filters"><div className="filter-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체 보드</button><button className={filter === 'saved' ? 'active' : ''} onClick={() => setFilter('saved')}>저장한 판<span>{sessions.filter(session => session.snapshots.length).length}</span></button></div><label className="search-box"><Search size={16}/><input aria-label="보드 검색" placeholder="보드 검색" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="검색 지우기" onClick={() => setSearch('')}><X size={14}/></button>}</label></div>
          {visibleSessions.length ? <div className="session-list">{visibleSessions.map(session => {
            const pack = packs.find(item => item.id === session.gamePackId);
            const evidence = session.evidence.find(item => !item.ownerId) || session.evidence[0];
            return <button className="session-card" key={session.id} disabled={busy} onClick={() => void open(session.id)}><div className="session-card-image"><img src={evidence?.url || '/demo-board.svg'} alt={`${session.name} 보드 미리보기`} loading="lazy"/><span className={`session-status ${session.snapshots.length ? 'is-saved' : ''}`}>{session.snapshots.length ? <Check size={11}/> : <Clock3 size={11}/>} {session.snapshots.length ? '저장됨' : '기록 중'}</span></div><div className="session-card-body"><div className="session-card-meta">{pack?.title || session.gamePackId}{session.example && <span>예시</span>}</div><h3>{session.name}</h3><p><Clock3 size={13}/>{formatDate(session.updatedAt)}</p><div className="session-card-footer"><div className="player-colors">{session.players.map(player => <span key={player.id} title={player.name} style={{ background: player.color }}/>)}</div><span>{session.players.length}명<span className="dot-divider">·</span>{stages.find(stage => stage.id === session.stage)?.label || '그림 고치기'}</span><ChevronRight size={17}/></div></div></button>;
          })}<button className="new-board-tile" disabled={busy || !packs.length} onClick={() => setDialog('create')}><span><Plus size={25}/></span><strong>새로운 판 기록</strong><small>다음 플레이를 준비하세요</small></button></div> : <Empty title={search ? '검색 결과가 없어요' : filter === 'saved' ? '아직 저장한 판이 없어요' : '첫 번째 판을 기록해 보세요'} action={<button className="button secondary" disabled={!packs.length || busy} onClick={() => setDialog('create')}><Plus size={16}/>새 판 기록</button>}>{search ? '다른 이름이나 게임으로 찾아보세요.' : '새 판을 만들거나 카탄 예시로 전체 흐름을 경험해 보세요.'}</Empty>}
        </section><footer className="home-footer"><span><Hexagon size={15}/>모든 판에는, 다음이 있으니까.</span><button onClick={() => setDialog('library')}>게임 살펴보기 <ArrowRight size={14}/></button></footer>
      </>}
      {error && <div className="error-banner" role="alert"><div><strong>요청을 완료하지 못했어요</strong><p>{error}</p></div><button className="icon-button" aria-label="오류 닫기" onClick={() => setError('')}><X size={18}/></button></div>}
    </main>
    <nav className="mobile-nav" aria-label="모바일 메뉴"><button className={!view ? 'active' : ''} onClick={back}><LayoutGrid size={20}/><span>내 보드</span></button><button onClick={() => setDialog('create')} disabled={!packs.length}><Plus size={22}/><span>새 기록</span></button><button onClick={() => setDialog('library')}><BookOpen size={20}/><span>게임팩</span></button><button onClick={() => setDialog('settings')}><Settings2 size={20}/><span>설정</span></button></nav>
    {dialog === 'create' && <CreateDialog packs={packs} onClose={() => setDialog(null)} onCreated={created}/>}
    {dialog === 'settings' && <SettingsDialog status={status} onClose={() => setDialog(null)} onSaved={next => { setStatus(next); showToast('AI 연결 설정을 저장했어요'); }}/>}
    {dialog === 'library' && <LibraryDialog packs={packs} onClose={() => setDialog(null)} onChanged={refreshPacks}/>}

    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {busy && !view && <div className="mutation-indicator" role="status"><Busy/></div>}
  </div>;
}

function PlayIcon() { return <Sparkles size={17}/>; }
