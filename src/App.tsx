import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Archive, BookOpen, Check, Hexagon, House, LogIn, MoreHorizontal, Plus, RefreshCw, Search, Trash2, Undo2, X } from 'lucide-react';
import type {GameCatalogEntry} from '../shared/gameEssentials';
import type { AIStatus, SessionView } from '../shared/types';
import { api } from './api';
import type { Mutate } from './Fields';
import { Busy, Empty, formatDate } from './ui';
import {sessionSummary,type SessionSummary} from '../shared/sessionSummary';
import {GameCover} from './GameCover';
import {BoardEvent} from './BoardFeedback';

import {withTransition} from './viewTransition';
import {attachPullToRefresh, attachSwipeToDelete} from './gestures';
import {rememberRoom,selectRoomScope} from './roomAccess';
const SessionWorkspace=lazy(()=>import('./SessionWorkspace'));
const RoomEntry=lazy(()=>import('./RoomCreateDialog').then(m=>({default:m.RoomEntry})));
const LibraryDialog=lazy(()=>import('./Dialogs').then(m=>({default:m.LibraryDialog})));
const LibraryPanel=lazy(()=>import('./Dialogs').then(m=>({default:m.LibraryPanel})));
const fire=(promise:Promise<unknown>)=>{void promise.catch(()=>{});};
type Dialog = 'create' | 'join' | 'library' | null;
type Tab = 'home' | 'archive' | 'games';
type Filter = 'all' | 'saved' | 'trash';
const TABS: { id: Tab; label: string; Icon: typeof House }[] = [{ id: 'home', label: '홈', Icon: House }, { id: 'archive', label: '보관함', Icon: Archive }, { id: 'games', label: '게임', Icon: BookOpen }];
const readFilter = (): Filter => { const value = new URLSearchParams(location.search).get('filter'); return value === 'saved' || value === 'trash' ? value : 'all'; };
const readTab = (): Tab => { const tab = new URLSearchParams(location.search).get('tab'); return tab === 'archive' || tab === 'games' ? tab : 'home'; };

function SessionCard({ session, pack, busy, manage, onOpen, onRestore, onDelete }: { session: SessionSummary; pack?: GameCatalogEntry; busy: boolean; manage: boolean; onOpen: () => void; onRestore: () => void; onDelete: () => void }) {
  const saved = session.saved;
  const swipeable = !session.deletedAt && !session.room;
  return <article className="session-card" data-session={session.id} data-swipe={swipeable ? '' : undefined}>{swipeable && <span className="swipe-action" aria-hidden="true"><Trash2 size={20}/>삭제</span>}<button type="button" className="session-open" disabled={busy || !!session.deletedAt} onClick={onOpen}><div className="session-card-image">{session.thumbnail ? <img src={session.thumbnail} alt="" loading="lazy" width={320} height={240}/> : <div className="session-card-cover" aria-hidden="true"><GameCover gameId={session.gamePackId}/></div>}{saved && <span className="session-status is-saved"><Check size={13} aria-hidden="true"/>저장됨</span>}</div><div className="session-card-body"><h3>{session.name}</h3><p className="session-card-meta">{pack?.title || session.gamePackId}{session.example && <span>예시</span>}<time dateTime={session.updatedAt}>{formatDate(session.updatedAt)}</time></p></div></button>{session.deletedAt ? <button type="button" className="button secondary small-button restore-board" disabled={busy} onClick={onRestore}><Undo2 size={15}/>복원</button> : manage && !session.room ? <button type="button" className="icon-button session-delete" aria-label={`${session.name} 삭제`} disabled={busy} onClick={onDelete}><Trash2 size={16}/></button> : null}</article>;
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [packs, setPacks] = useState<GameCatalogEntry[]>([]);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [ownerId, setOwnerIdState] = useState<string | undefined>(new URLSearchParams(location.search).get('player') || undefined);
  const [initialInvite,setInitialInvite]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('join')??'');
  const [dialog, setDialog] = useState<Dialog>(initialInvite?'join':null);
  const [conflict,setConflict]=useState(false);const [roomReload,setRoomReload]=useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [reopenFeedback, setReopenFeedback] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilterState] = useState<Filter>(readFilter);
  const liveFilter = useRef(filter); liveFilter.current = filter;
  const [deleteUndo, setDeleteUndo] = useState<string[]>([]);
  const [tab, setTabState] = useState<Tab>(readTab);
  const [searchOpen, setSearchOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const liveTab = useRef(tab); liveTab.current = tab;
  const pullIndicator = useRef<HTMLDivElement>(null);
  const mainArea = useRef<HTMLElement>(null);
  const leaveWorkspace = useRef<(() => Promise<void>) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pending = useRef(0);
  const liveView = useRef(view); liveView.current = view;
  const showToast = useCallback((message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4200); }, []);
  const refreshPacks = async () => setPacks(await api.catalog());
  useEffect(()=>{const changed=()=>{const invite=new URLSearchParams(location.hash.slice(1)).get('join');if(invite){setInitialInvite(invite);setDialog('join');}};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  const updateUrl = (sessionId?: string, playerId?: string) => {
    const url = new URL(location.href);
    url.searchParams.delete('step');url.hash='';
    if (sessionId) url.searchParams.set('session', sessionId); else url.searchParams.delete('session');
    if (sessionId && playerId) url.searchParams.set('player', playerId); else url.searchParams.delete('player');
    if (!sessionId && liveTab.current !== 'home') url.searchParams.set('tab', liveTab.current); else url.searchParams.delete('tab');
    if (!sessionId && liveTab.current === 'archive' && liveFilter.current !== 'all') url.searchParams.set('filter', liveFilter.current); else url.searchParams.delete('filter');
    history.replaceState({}, '', url);
  };
  const setOwnerId = async (id?: string) => {
    if(!view)return;
    if(view.roomAccess&&id&&id!==view.roomAccess.playerId)id=view.roomAccess.playerId;
    const sessionId=view.session.id;
    const locking=api.lockPrivate(sessionId);
    setBusy(true);
    try{const {redactView}=await import('../shared/privacy');receive(redactView(view,new Set(view.privacy?.protectedOwnerIds??[]),new Set()));setOwnerIdState(id);updateUrl(sessionId,id);await locking;const next=await api.session(sessionId);selectRoomScope(next,id);setConflict(false);receive(next);}finally{setBusy(false);}
  };
  const receive = (next: SessionView) => {
    rememberRoom(next);
    liveView.current = next;
    setView(next);
    const listSession=sessionSummary(next.session);
    setSessions(current => [{ ...listSession, deletedAt: current.find(item => item.id === next.session.id)?.deletedAt }, ...current.filter(item => item.id !== next.session.id)]);
  };
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { await api.lockPrivate(view?.session.id);const next = await api.session(id);const selected=next.roomAccess?.role==='member'?next.roomAccess.playerId:undefined;withTransition('forward', () => { setOwnerIdState(selected);selectRoomScope(next,selected);setConflict(false);receive(next); if (next.session.snapshots.length) setReopenFeedback(current => current + 1); updateUrl(id, selected); window.scrollTo({ top: 0 }); }, { from: () => document.querySelector(`[data-session="${id}"] h3`), to: () => document.querySelector('.cw-title h1') }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '기록을 열지 못했습니다.'); } finally { setBusy(false); }
  };
  const created = async (next: SessionView) => { await leaveWorkspace.current?.();await api.lockPrivate(view?.session.id); const selected=next.roomAccess?.role==='member'?next.roomAccess.playerId:undefined;selectRoomScope(next,selected);receive(next);setConflict(false);setInitialInvite('');setDialog(null);setOwnerIdState(selected);updateUrl(next.session.id,selected); requestAnimationFrame(() => window.scrollTo({ top: 0 })); };
  const mutate: Mutate = async (task, message, options) => {
    pending.current += 1; setBusy(true); setError('');
    try { receive(await task()); if (message) showToast(message); }
    catch (reason) { if(!options?.localError)setError(reason instanceof Error ? reason.message : '변경 내용을 저장하지 못했습니다.'); throw reason; }
    finally { pending.current -= 1; setBusy(pending.current > 0); }
  };
  const back = () => fire((async () => { await leaveWorkspace.current?.();await api.lockPrivate(view?.session.id); const leaving = liveView.current?.session.id; withTransition('back', () => { setView(null); setOwnerIdState(undefined); updateUrl(); }, { from: () => document.querySelector('.cw-title h1'), to: () => leaving ? document.querySelector(`[data-session="${leaving}"] h3`) : null }); setSessions(await api.sessions(true)); })());
  const setFilter = (next: Filter) => { liveFilter.current = next; setFilterState(next); if (!view) updateUrl(); };
  const goTab = (next: Tab, nextFilter?: Filter) => {
    const change = () => { if (nextFilter) { liveFilter.current = nextFilter; setFilterState(nextFilter); } liveTab.current = next; setTabState(next); };
    if (view) { change(); back(); return; }
    if (next === liveTab.current && !nextFilter) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    withTransition('tab', () => { change(); updateUrl(); window.scrollTo({ top: 0 }); });
  };

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
        await api.roomDevice();
        const results = await Promise.all([api.sessions(true), api.catalog(), api.status()]);
        if (cancelled) return;
        setSessions(results[0]); setPacks(results[1]); setStatus(results[2]);
        const id = new URLSearchParams(location.search).get('session');
        if (id) { const next = await api.session(id); if (!cancelled) { const requested=new URLSearchParams(location.search).get('player')||undefined;const selected=next.roomAccess&&requested&&requested!==next.roomAccess.playerId?next.roomAccess.playerId:requested;setOwnerIdState(selected);selectRoomScope(next,selected);receive(next);if (next.session.snapshots.length) setReopenFeedback(current => current + 1); } }
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : '서버에 연결하지 못했습니다.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (view || typeof document === 'undefined' || !pullIndicator.current) return;
    return attachPullToRefresh(pullIndicator.current, () => Promise.all([api.sessions(true).then(setSessions), refreshPacks()]), () => !liveView.current);
  }, [view]);
  useEffect(() => {
    if (typeof document === 'undefined' || !mainArea.current) return;
    return attachSwipeToDelete(mainArea.current, id => void hideBoards(id));
  }, []);

  useEffect(() => {
    if (view && ownerId && !view.session.players.some(player => player.id === ownerId)) {
      setOwnerIdState(undefined);
      updateUrl(view.session.id);
    }
  }, [view?.session.id, ownerId]);

  const liveSessions = sessions.filter(session => !session.deletedAt);
  const visibleSessions = sessions.filter(session => (filter === 'trash' ? !!session.deletedAt : !session.deletedAt) && (!search || `${session.name} ${packs.find(pack => pack.id === session.gamePackId)?.title || ''}`.toLowerCase().includes(search.toLowerCase())) && (filter !== 'saved' || session.saved));
  const savedCount = liveSessions.filter(session => session.saved).length;
  const openExample = () => fire(mutate(() => api.create({ example: true }), '카탄 예시를 열었어요').then(() => { const next = liveView.current; if (next) updateUrl(next.session.id); }));
  const recentSessions = liveSessions.slice(0, 5);
  const card = (session: SessionSummary) => <SessionCard key={session.id} session={session} pack={packs.find(item => item.id === session.gamePackId)} busy={busy} manage={manage} onOpen={() => void open(session.id)} onRestore={() => void restoreBoards([session.id])} onDelete={() => void hideBoards(session.id)}/>;
  const onHome = !view && tab === 'home';
  return <div className={`app-shell${view ? ' is-session' : ' has-tabbar'}${onHome ? ' is-home' : ''}`}>
    <a className="skip-link" href="#main">본문으로 건너뛰기</a>
    <header className="app-bar">
      <button type="button" className="brand" onClick={() => goTab('home')} aria-label="KeepBoard 홈으로" translate="no"><span className="brand-icon" aria-hidden="true"><Hexagon size={26} strokeWidth={2.4}/><span/></span>KeepBoard</button>
      <nav className="app-nav" aria-label="메인 메뉴">{TABS.map(({ id, label, Icon }) => <button type="button" key={id} className={!view && tab === id ? 'active' : ''} aria-current={!view && tab === id ? 'page' : undefined} onClick={() => goTab(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <button type="button" className="button primary small-button app-new" aria-label="새 보드" disabled={busy || !packs.length} onClick={() => setDialog('create')}><Plus size={18}/><span>새 보드</span></button>
    </header>
    <main id="main" ref={mainArea} tabIndex={-1} className={`main-content ${view ? 'in-session' : ''}`}>
      {conflict&&view&&<div className="room-conflict" role="status"><p>다른 창에서 바뀌었어요. 편집 중인 초안은 유지했어요.</p><button className="button secondary small-button" onClick={()=>fire((async()=>{const next=await api.session(view.session.id);selectRoomScope(next,ownerId);setConflict(false);receive(next);setRoomReload(n=>n+1);setReopenFeedback(n=>n+1);})())}>초안 버리고 최신 기록 보기</button></div>}
      {loading ? <div className="skeleton" role="status" aria-label="보드를 불러오고 있어요"><span className="sk sk-title"/><div className="sk-row"><span className="sk sk-button"/><span className="sk sk-button"/></div><span className="sk sk-heading"/>{[0, 1, 2].map(index => <div className="sk-card" key={index}><span className="sk sk-thumb"/><div><span className="sk sk-line"/><span className="sk sk-line short"/></div></div>)}</div> : view ? <Suspense fallback={<Busy/>}><SessionWorkspace key={`${view.session.id}:${roomReload}:${ownerId||'public'}:${view.privacy?.unlockedOwnerIds.join(',')||'locked'}`} view={view} busy={busy} status={status} mutate={mutate} onBack={back} onNewBoard={() => setDialog('create')} ownerId={ownerId} setOwnerId={setOwnerId} onToast={showToast} onReadyToLeave={save => { leaveWorkspace.current = save; }}/></Suspense> : tab === 'home' ? <div className="home home-tab">
        <h1 className="page-title">보드게임 기록</h1>
        <div className="home-actions">
          <button type="button" className="button primary" disabled={busy || !packs.length} onClick={() => setDialog('create')}><Plus size={18}/>새 보드</button>
          <button type="button" className="button secondary" onClick={()=>setDialog('join')}><LogIn size={18}/>초대 코드로 참가</button>
        </div>
        <section className="home-recent" aria-labelledby="recent-title">
          <h2 id="recent-title">최근 보드</h2>
          {recentSessions.length ? <div className="session-list">{recentSessions.map(card)}</div> : <Empty scene="quiet" title="첫 번째 판을 기록해 보세요" action={<button type="button" className="button secondary" disabled={busy || !packs.length} onClick={openExample}>카탄 예시 열기</button>}>게임 사진과 상태를 함께 남기면 이어볼 수 있어요.</Empty>}
        </section>
      </div> : tab === 'archive' ? <div className="home archive-tab">
        <h1 className="page-title">보관함</h1>
        <div className="board-filters"><div className="filter-tabs" role="tablist" aria-label="보드 보기"><button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button><button type="button" role="tab" aria-selected={filter === 'saved'} className={filter === 'saved' ? 'active' : ''} onClick={() => setFilter('saved')}>저장한 판<span>{savedCount}</span></button><button type="button" role="tab" aria-selected={filter === 'trash'} className={filter === 'trash' ? 'active' : ''} onClick={() => setFilter('trash')}>삭제함</button></div><div className="board-tools"><button type="button" className="icon-button" aria-label="보드 검색" aria-expanded={searchOpen || !!search} onClick={() => { setSearchOpen(!(searchOpen || !!search)); if (searchOpen || search) setSearch(''); else requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name=board-search]')?.focus()); }}>{searchOpen || search ? <X size={18}/> : <Search size={18}/>}</button><details className="board-menu"><summary aria-label="보드 메뉴"><MoreHorizontal size={20}/></summary><button type="button" disabled={busy} onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); fire(api.sessions(true).then(setSessions).catch(reason => setError(String(reason)))); }}><RefreshCw size={15}/>새로고침</button><button type="button" disabled={busy || !liveSessions.length} onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); setManage(!manage); }}><Trash2 size={15}/>{manage ? '삭제 끝내기' : '골라서 삭제'}</button><button type="button" disabled={busy || !liveSessions.length} onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); void hideBoards(); }}><Trash2 size={15}/>전체 삭제</button></details></div></div>
        {(searchOpen || !!search) && <label className="search-box"><Search size={17}/><input type="search" name="board-search" autoComplete="off" enterKeyHint="search" aria-label="보드 검색" placeholder="보드 이름이나 게임…" value={search} onChange={event => setSearch(event.target.value)}/></label>}
        {manage && filter !== 'trash' && <div className="manage-bar" role="status"><span>지울 보드의 휴지통을 누르세요.</span><button type="button" className="text-link" onClick={() => setManage(false)}>완료</button></div>}
        {visibleSessions.length ? <div className="session-list">{visibleSessions.map(card)}</div> : <Empty title={search ? '검색 결과가 없어요' : filter === 'trash' ? '삭제한 보드가 없어요' : filter === 'saved' ? '아직 저장한 판이 없어요' : '첫 번째 판을 기록해 보세요'} action={filter === 'trash' || search ? undefined : <div className="button-row empty-actions"><button type="button" className="button primary" disabled={!packs.length || busy} onClick={() => setDialog('create')}><Plus size={17}/>새 보드</button><button type="button" className="button secondary" disabled={!packs.length || busy} onClick={openExample}>카탄 예시 열기</button></div>}>{search ? '다른 이름이나 게임으로 찾아보세요.' : filter === 'trash' ? '삭제한 보드는 여기서 복원할 수 있어요.' : '게임 사진과 상태를 함께 남기면 이어볼 수 있어요.'}</Empty>}
      </div> : <div className="home games-tab">
        <h1 className="page-title">게임</h1>
        <Suspense fallback={<Busy/>}><LibraryPanel packs={packs}/></Suspense>
      </div>}
      {error && <div className="error-banner" role="alert"><div><strong>요청을 완료하지 못했어요</strong><p>{error}</p></div><button className="icon-button" aria-label="오류 닫기" onClick={() => setError('')}><X size={18}/></button></div>}
    </main>
    {(dialog === 'create'||dialog==='join') && <Suspense fallback={<Busy/>}><RoomEntry packs={packs} joining={dialog==='join'} initialInvite={initialInvite} onClose={() => {setDialog(null);setInitialInvite('');const u=new URL(location.href);u.hash='';history.replaceState({},'',u);}} onCreated={created}/></Suspense>}
    {dialog === 'library' && <Suspense fallback={<Busy/>}><LibraryDialog packs={packs} onClose={() => setDialog(null)} onChanged={refreshPacks}/></Suspense>}
    {deleteUndo.length > 0 && <div className="delete-undo" role="status"><span>보드 {deleteUndo.length}개를 삭제했어요.</span><button disabled={busy} onClick={() => void restoreBoards(deleteUndo)}><Undo2 size={15}/>되돌리기</button></div>}
    {toast && !deleteUndo.length && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {reopenFeedback > 0 && <BoardEvent key={reopenFeedback} kind="reopen"/>}
    {busy && !view && <div className="mutation-indicator" role="status"><Busy/></div>}
    {!view && <div className="ptr" ref={pullIndicator} aria-hidden="true"><Hexagon size={22} strokeWidth={2.6}/></div>}
    {!view && <nav className="tab-bar" aria-label="하단 메뉴">{TABS.map(({ id, label, Icon }) => <button type="button" key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}><Icon size={22} aria-hidden="true"/><span>{label}</span></button>)}</nav>}
  </div>;
}
