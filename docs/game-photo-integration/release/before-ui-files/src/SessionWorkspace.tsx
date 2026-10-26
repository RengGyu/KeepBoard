import {PhotoCaptureGuide} from './PhotoCaptureGuide';
import {captureProfile,captureAreas,type CaptureTarget} from '../shared/photoCapture';
import {analysisJobMessage} from './analysisJobMessage';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Hexagon, ImagePlus, LockKeyhole, Plus, Save, Users } from 'lucide-react';
import type { AIStatus, Assertion, Evidence, SessionView, Value } from '../shared/types';
import { confirmed } from '../shared/catanSummary';
import { api, readPhoto } from './api';
import { CatanOverview } from './CatanOverview';
import { SceneWorkspace } from './SceneWorkspace';
import { RummikubWorkspace } from './RummikubWorkspace';
import {GameEssentials} from './GameEssentials';
import { PlayersDialog } from './Dialogs';
import { OwnerColors } from './SceneEditor';
import { CameraDialog, PhotoDialog, type PhotoInput } from './Capture';
import { fire, type Mutate } from './Fields';
import { addSavedScanEvidence, createScanBatch, finishScanBatch, type ScanBatch, type ScanRunContext } from './scanBatch';
import { createScanUploadQueue, SCAN_QUEUE_MAX_BYTES, type UploadSnapshot } from './scanUploads';
import { recordScanTiming } from './scanTiming';
import { SCAN_LIMIT } from './scanQuality';
import { Busy, PlayerPiece, formatDate } from './ui';
import { BoardEvent, CurrentTurnMark } from './BoardFeedback';
import { BRAND_IMAGES } from './brandImages';
import {PrivatePin} from './PrivatePin';
import {PHOTO_INPUT_SAVE_OPTIONS,type RummikubSaveOptions} from './rummikubSavePolicy';
import {canRecognizePhotos} from '../shared/recognition';
import {RoomInvite,RoomProfile,RoomPublicBoard} from './RoomEntry';
import {latestSnapshot} from '../shared/rooms';
import './correction-workspace.css';

interface RunningCapture { batch: ScanBatch; captureTarget?:CaptureTarget; guidance?:string }
interface GalleryTransfer { run: RunningCapture; uploads: ReturnType<typeof createScanUploadQueue<PhotoInput, Evidence>>; unread: File[]; snapshot: UploadSnapshot<Evidence>; phase: 'reading' | 'sending' | 'failed' }
interface BatchReadout { captureTarget?:CaptureTarget; context: ScanRunContext; evidenceIds: string[]; state: 'manual' | 'analyzing' | 'done' | 'failed'; error?: string; candidateCount?: number }
export function rummikubReadoutMessage(state: BatchReadout['state'], candidateCount?: number) {
  if (state === 'analyzing') return '사진을 읽고 있어요…';
  if (state === 'manual') return '사진을 보관했어요.';
  if (state === 'failed') return '사진 읽기에 실패했어요.';
  return candidateCount === 0 ? '새 타일이 없어요.' : '';
}
type SaveDraft = ((options?:RummikubSaveOptions) => Promise<void>) | null;
export default function SessionWorkspace({ view, busy, status, mutate, onBack, onNewBoard, ownerId, setOwnerId, onToast, onReadyToLeave }: { view: SessionView; busy: boolean; status: AIStatus | null; mutate: Mutate; onBack: () => void; onNewBoard?: () => void; ownerId?: string; setOwnerId: (id?: string) => Promise<void>; onToast: (message: string) => void; onReadyToLeave?: (save: SaveDraft) => void }) {
  const { session } = view;
  const readonlyPublic=!!view.roomAccess&&!ownerId&&view.roomAccess.role!=='host';
  const [showInvite,setShowInvite]=useState(false);
  const personalCatan = view.pack.id === 'catan-base' && !!ownerId;
  const personalRummikub = view.pack.id === 'rummikub' && !!ownerId;
  const generic= view.pack.runtime?.support.recording==='generic';
  // Only owners who actually set a PIN are locked; without one, scanning and editing start right away.
  const privateLocked=!!ownerId&&!!view.privacy?.protectedOwnerIds.includes(ownerId)&&!view.privacy?.unlockedOwnerIds.includes(ownerId);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [cameraRun, setCameraRun] = useState<RunningCapture | null>(null);
  const [captureAreaId,setCaptureAreaId]=useState('');
  const [pendingRead,setPendingRead]=useState<Pick<BatchReadout,'context'|'evidenceIds'|'captureTarget'>|null>(null);
  const scopedPending=pendingRead?.context.sessionId===session.id&&pendingRead.context.ownerId===ownerId?pendingRead:null;
  useEffect(()=>{setCaptureAreaId('');setPendingRead(null);},[session.id,ownerId]);
  const [lastScan, setLastScan] = useState<BatchReadout | null>(null);
  const analysisInFlight = useRef(new Set<string>());
  const [serverJob,setServerJob]=useState<AnalysisJob|null>(null);
  const visibleJob=serverJob?.sessionId===session.id&&serverJob.ownerId===ownerId?serverJob:null;
  const [jobConnectionLost,setJobConnectionLost]=useState(false);
  const jobRefresh=useRef({mutate});jobRefresh.current={mutate};
  const refreshedJobs=useRef(new Set<string>());
  useEffect(()=>{if(privateLocked){setServerJob(null);return;}let stopped=false,inFlight=false;
    const poll=async()=>{if(inFlight)return;inFlight=true;try{const response=await api.analysisJobs(session.id,ownerId);if(stopped)return;const job=response.jobs[0]??null;setServerJob(job);setJobConnectionLost(false);if(job?.state==='completed'&&!refreshedJobs.current.has(job.id)){refreshedJobs.current.add(job.id);try{await jobRefresh.current.mutate(()=>api.session(session.id));}catch{refreshedJobs.current.delete(job.id);}}}catch{if(!stopped)setJobConnectionLost(true);}finally{inFlight=false;}};
    void poll();const timer=setInterval(()=>void poll(),2000);return()=>{stopped=true;clearInterval(timer);};
  },[session.id,ownerId,privateLocked]);
  const [photo, setPhoto] = useState<{ evidence: Evidence; region?: Assertion['region'] } | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryTransfer | null>(null);
  const galleryRef = useRef<GalleryTransfer | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const unload = (event: BeforeUnloadEvent) => { if (galleryRef.current) event.preventDefault(); };
    window.addEventListener('beforeunload', unload);
    return () => { alive.current = false; galleryRef.current?.uploads.stop(); window.removeEventListener('beforeunload', unload); };
  }, []);
  const [working, setWorking] = useState(false);
  // Keep the selected owner tab visible by scrolling the strip sideways only; never move the page vertically.
  const ownerTabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = ownerTabs.current, active = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !active) return;
    const left = active.offsetLeft, right = left + active.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left: Math.max(0, left - 12) });
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth + 12 });
  }, [ownerId]);
  const [saveFeedback, setSaveFeedback] = useState(0);
  const editorSave = useRef<SaveDraft>(null), contextSave = useRef<SaveDraft>(null), assetSave = useRef<SaveDraft>(null), essentialsSave=useRef<SaveDraft>(null);
  const currentScreen = useRef({ sessionId: session.id, ownerId });
  currentScreen.current = { sessionId: session.id, ownerId };
  const snapshot = latestSnapshot(session,ownerId??'public');
  const locked = busy || working || uploading || !!gallery;
  async function flush(options?:RummikubSaveOptions) { if (cameraRun || galleryRef.current) throw new Error('사진 전송을 마치거나 실패한 사진을 제외한 뒤 이동해 주세요.'); await editorSave.current?.(options); await essentialsSave.current?.(); await assetSave.current?.(); await contextSave.current?.(); }
  useEffect(() => { onReadyToLeave?.(()=>flush(PHOTO_INPUT_SAVE_OPTIONS)); return () => onReadyToLeave?.(null); });
  async function changeOwner(id?: string) { setWorking(true); try { await flush(PHOTO_INPUT_SAVE_OPTIONS);await setOwnerId(id); } finally { setWorking(false); } }
  async function saveBoard() { setWorking(true); try { await flush(); await mutate(() => api.commit(session.id, true), '저장했어요'); if (alive.current) setSaveFeedback(event => event + 1); } finally { setWorking(false); } }
  async function startTurn(playerId: string) { setWorking(true); try { await flush(); await mutate(() => api.nextTurn(session.id, playerId), '새 차례를 시작했어요'); } finally { setWorking(false); } }
  function newCaptureRun(capturedOwner: string | undefined, purpose: 'capture' | 'restore' = 'capture'): RunningCapture {
    setLastScan(null);
    const profile=captureProfile(view.pack),area=captureAreas(view.pack,capturedOwner).find(a=>a.id===captureAreaId);
    return { guidance:profile?`${view.pack.title} · ${area?.name??'전체'}: ${area?.instruction??profile.focus}`:undefined,...(profile&&area?{captureTarget:{version:1 as const,gameId:profile.gameId,sourceSHA:profile.sourceSHA,areaId:area.id}}:{}),batch: createScanBatch({ id: globalThis.crypto?.randomUUID?.() || `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`, sessionId: session.id, captureEpoch: session.captureEpoch, ownerId: capturedOwner, purpose, instruction: '', aiEnabled: !!status?.configured&&canRecognizePhotos(view.pack,capturedOwner) }) };
  }
  function openCamera(options?: { ownerId?: string; purpose?: 'capture' | 'restore' }) {
    setCameraRun(newCaptureRun(options ? options.ownerId : ownerId, options?.purpose));
  }
  async function saveRunPhoto(run: RunningCapture, input: PhotoInput): Promise<Evidence> {
    const context = run.batch.context;
    if (run.batch.finished || run.batch.evidenceIds.length >= SCAN_LIMIT) throw new Error('마쳤거나 6장을 확보한 스캔입니다. 새 스캔을 시작해 주세요.');
    let saved: Evidence | undefined;
    await mutate(async () => {
      const response = await api.evidence(context.sessionId, { ...input, captureTarget:run.captureTarget,scope: context.ownerId ? 'player' : 'public', ownerId: context.ownerId, expectedCaptureEpoch: context.captureEpoch });
      const evidence = response.session.evidence.find(item => item.id === response.createdEvidenceId);
      if (!evidence) throw new Error('사진 원본 저장 식별자를 확인하지 못했습니다. 원본은 유지되며 자동 분석에 추가하지 않았어요.');
      run.batch = addSavedScanEvidence(run.batch, evidence);
      saved = evidence;
      return response;
    });
    return saved!;
  }
  async function analyzeBatch(batch: Pick<BatchReadout, 'context' | 'evidenceIds' | 'captureTarget'>,sameStaticState=false) {
    const {context,evidenceIds,captureTarget}=batch;if(!evidenceIds.length||analysisInFlight.current.has(context.id))return;
    if(evidenceIds.length>1&&!sameStaticState){setPendingRead(batch);return;}
    setPendingRead(null);analysisInFlight.current.add(context.id);setLastScan(null);
    try{const response=await api.startAnalysisJob(context.sessionId,{requestId:context.id,evidenceIds:[...evidenceIds],expectedCaptureEpoch:context.captureEpoch,purpose:context.purpose,instruction:context.instruction,captureTarget,sameStaticState,scope:context.ownerId?'owner':'public',ownerId:context.ownerId});if(alive.current)setServerJob(response.job);}
    catch(reason){if(alive.current)setLastScan({context,captureTarget,evidenceIds:[...evidenceIds],state:'failed',error:reason instanceof Error?reason.message:'사진 읽기를 시작하지 못했어요.'});throw reason;}
    finally{analysisInFlight.current.delete(context.id);}
  }
  async function readStoredPhotos() {
    setWorking(true);
    try {
      await flush(PHOTO_INPUT_SAVE_OPTIONS);
      const run = newCaptureRun(ownerId);
      await analyzeBatch({ captureTarget:run.captureTarget,context: run.batch.context, evidenceIds: (generic?storedPhotos:currentPhotos).slice(-SCAN_LIMIT).map(photo => photo.id) });
    } finally { setWorking(false); }
  }
  async function finishCaptureRun(run: RunningCapture) {
    if (run.batch.analysisClaimed) return;
    const finished = finishScanBatch(run.batch);
    run.batch = finished.batch;
    setCameraRun(current => current === run ? null : current);
    if (!run.batch.evidenceIds.length) return;
    if (finished.evidenceIds.length) await analyzeBatch({ captureTarget:run.captureTarget,context: run.batch.context, evidenceIds: finished.evidenceIds });
    else setLastScan({ context: run.batch.context, evidenceIds: [...run.batch.evidenceIds], state: 'manual' });
  };

  function showGallery(transfer: GalleryTransfer) { if (alive.current) setGallery({ ...transfer }); }
  async function sendGalleryFiles(transfer: GalleryTransfer, files: File[]) {
    transfer.phase = 'reading'; transfer.unread = []; showGallery(transfer);
    for (const file of files) {
      if (!alive.current) return;
      try {
        const estimatedBytes = Math.ceil(file.size * 8 / 3) + 256;
        if (estimatedBytes + transfer.uploads.snapshot().retainedBytes > SCAN_QUEUE_MAX_BYTES) await transfer.uploads.drain();
        if (estimatedBytes + transfer.uploads.snapshot().retainedBytes > SCAN_QUEUE_MAX_BYTES) throw new Error('사진 전송 대기 공간 부족');
        const start = performance.now();
        const input = await readPhoto(file);
        recordScanTiming({ stage: 'gallery-read', ms: performance.now() - start, photos: 1, bytes: file.size });
        transfer.uploads.enqueue({ ...input, label: file.name }, input.dataUrl.length * 2);
      } catch { transfer.unread.push(file); }
    }
    transfer.phase = 'sending'; showGallery(transfer);
    await finishGallery(transfer);
  }
  async function finishGallery(transfer: GalleryTransfer) {
    await transfer.uploads.drain();
    if (!alive.current) return;
    transfer.snapshot = transfer.uploads.snapshot();
    setUploading(false);
    if (transfer.unread.length || transfer.snapshot.entries.some(e => e.state === 'failed')) {
      transfer.phase = 'failed'; showGallery(transfer); return;
    }
    galleryRef.current = null; setGallery(null);
    await finishCaptureRun(transfer.run);
  }
  async function retryGallery(transfer: GalleryTransfer) {
    setUploading(true); transfer.uploads.retryFailed();
    await sendGalleryFiles(transfer, [...transfer.unread]);
  }
  async function omitGalleryFailures(transfer: GalleryTransfer) {
    transfer.uploads.discardFailed(); transfer.unread = []; await finishGallery(transfer);
  }

  const captureLabel = personalRummikub ? '받침대 스캔' : personalCatan ? '손패 스캔' : '판 스캔';
  const uploadLabel = ownerId ? '개인 사진 추가' : '사진 추가';
  const savedLabel = snapshot ? `마지막 저장 ${formatDate(snapshot.createdAt)}` : '아직 저장 전';
  const currentPlayer = confirmed(session, 'currentPlayer')?.value;
  const currentPhotos = session.evidence.filter(item => item.kind === 'photo' && item.captureEpoch === session.captureEpoch && (ownerId ? item.scope === 'player' && item.ownerId === ownerId : item.scope === 'public' && !item.ownerId));
  const scopePhotos=session.evidence.filter(item=>item.kind==='photo'&&(ownerId?item.scope==='player'&&item.ownerId===ownerId:item.scope==='public'&&!item.ownerId));
  const storedPhotos=scopePhotos.filter(item=>item.captureEpoch===scopePhotos.at(-1)?.captureEpoch);
  const hasPhotos = session.evidence.some(item => item.kind !== 'note' && (ownerId ? item.ownerId === ownerId : !item.ownerId));
  return <div className={`correction-workspace${view.pack.id === 'rummikub' ? ' rummikub-session' : generic ? ' board-record-session' : ''}`}>
    <header className="correction-heading"><button className="icon-button cw-back" aria-label="내 보드로" disabled={locked} onClick={onBack}><ArrowLeft size={22}/></button><div className="cw-title"><div className="cw-title-line"><h1>{session.name}</h1>{onNewBoard && view.pack.id !== 'rummikub' && !generic && <button className="button secondary small-button cw-new-board" aria-label="새 보드 만들기" disabled={locked} onClick={onNewBoard}><Plus size={17}/>새 보드</button>}</div><p>{view.pack.title} · {session.players.length}명 · {savedLabel}</p></div>
      <div className="cw-actions">{!privateLocked && !readonlyPublic && <><button className="button secondary small-button" aria-label={captureLabel} disabled={locked} onClick={() => fire(flush(PHOTO_INPUT_SAVE_OPTIONS).then(() => openCamera()))}><Camera size={18}/><span>{view.pack.id === 'rummikub' ? personalRummikub ? '받침대' : '판 찍기' : captureLabel}</span></button><button className="button secondary small-button" aria-label={uploadLabel} disabled={locked} onClick={() => upload.current?.click()}><ImagePlus size={18}/><span>{view.pack.id === 'rummikub' ? '사진' : uploadLabel}</span></button></>}<button className="button secondary small-button" aria-label="플레이어 이름과 색" disabled={locked} onClick={() => fire(flush().then(() => setEditingPlayers(true)))}><Users size={18}/><span>플레이어</span></button>{!readonlyPublic&&<button className="button primary small-button cw-save-top" disabled={locked} onClick={() => fire(saveBoard())}><Save size={18}/>저장</button>}</div>
    </header>
    {saveFeedback > 0 && <BoardEvent key={saveFeedback} kind="save"/>}
    <div ref={ownerTabs} className="owner-tabs" role="tablist" aria-label="누구의 기록"><button role="tab" aria-selected={!ownerId} className={!ownerId ? 'active' : ''} disabled={locked} onClick={() => fire(changeOwner(undefined))}><Hexagon size={16}/>공용 보드</button>{session.players.filter(player=>!view.roomAccess||player.id===view.roomAccess.playerId).map(player => <button role="tab" key={player.id} aria-selected={ownerId === player.id} className={ownerId === player.id ? 'active' : ''} disabled={locked} onClick={() => fire(changeOwner(player.id))}><PlayerPiece color={player.color} game={view.pack.id} size={24}/><span className="owner-tab-name">{view.roomAccess?'내 보드 · ':''}{player.name}</span>{currentPlayer === player.id && <CurrentTurnMark/>}{view.privacy?.protectedOwnerIds.includes(player.id) && <LockKeyhole size={13} aria-label="비밀번호 보호"/>}</button>)}</div>
    {view.roomAccess&&<div className="room-bar"><span className="small muted">참가 {session.players.length}/{session.room!.capacity} · {session.players.map(p=>p.name).join(' · ')}</span>{view.roomAccess.role==='host'&&<button className="button secondary small-button" onClick={()=>setShowInvite(true)}>초대</button>}{!readonlyPublic&&snapshot&&<button className="button text small-button" disabled={locked} onClick={()=>fire((async()=>{await flush();await mutate(()=>api.resume(session.id,ownerId?'owner':'public',ownerId),'저장본을 열었어요');})())}>저장본 열기</button>}</div>}
    {ownerId&&<PrivatePin key={`${ownerId}:${privateLocked}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} beforeChange={flush}/>}
    {readonlyPublic?<RoomPublicBoard view={view}/>:!privateLocked&&<div className="cw-grid">
      <div className="cw-main">
        <PhotoCaptureGuide pack={view.pack} ownerId={ownerId} areaId={captureAreaId} onChange={setCaptureAreaId} disabled={locked||!!cameraRun}/>
        {scopedPending&&<section className="panel" aria-label="사진 상태 확인"><p>이 {scopedPending.evidenceIds.length}장은 같은 멈춘 판을 찍은 사진인가요?</p><div className="button-row"><button className="button primary" disabled={locked} onClick={()=>fire(analyzeBatch(scopedPending,true))}>네, 함께 읽기</button><button className="button secondary" disabled={locked} onClick={()=>fire(analyzeBatch({...scopedPending,context:{...scopedPending.context,id:crypto.randomUUID()},evidenceIds:scopedPending.evidenceIds.slice(-1)}))}>마지막 한 장만 읽기</button><button className="button text" onClick={()=>setPendingRead(null)}>지금은 사진만 보관</button></div></section>}
        {visibleJob&&<p className="scan-readout" role="status">{jobConnectionLost&&activeAnalysisJob(visibleJob)?'상태 연결을 기다리고 있어요. 서버 작업은 계속돼요.':analysisJobMessage(visibleJob)}</p>}
        {gallery && <div className="scan-readout" role="status"><span>{gallery.phase === 'reading' ? '사진을 준비하고 있어요…' : `사진 전송 ${gallery.snapshot.entries.filter(e => e.state === 'saved').length}/${gallery.snapshot.entries.length + gallery.unread.length}${gallery.phase === 'failed' ? ' · 보내지 못한 사진이 남아 있어요.' : ' · 보내는 중…'}`}</span>{gallery.phase === 'failed' && <><button className="button text small-button" disabled={busy || uploading} onClick={() => void retryGallery(galleryRef.current!)}>전송 다시 시도</button><button className="button text small-button" disabled={busy || uploading} onClick={() => void omitGalleryFailures(galleryRef.current!)}>실패한 사진 빼고 마치기</button></>}</div>}
        {lastScan && lastScan.context.ownerId === ownerId && (view.pack.id !== 'rummikub' || rummikubReadoutMessage(lastScan.state, lastScan.candidateCount)) && <p role="status" className={`scan-readout ${lastScan.state}`}>{view.pack.id === 'rummikub' ? rummikubReadoutMessage(lastScan.state, lastScan.candidateCount) : lastScan.state === 'analyzing' ? '사진을 읽고 있어요…' : lastScan.state === 'failed' ? (lastScan.error||'사진 읽기에 실패했어요. 원본은 남아 있어요.') : lastScan.state === 'manual' ? (!canRecognizePhotos(view.pack,ownerId) ? '이 영역은 사진 관측 미지원으로 원본만 보관했어요.' : 'AI가 연결되지 않아 사진만 보관했어요.') : generic ? lastScan.candidateCount ? view.session.assertions.some(a=>a.status==='candidate'&&a.ownerId===ownerId&&a.evidenceIds.some(id=>lastScan.evidenceIds.includes(id))) ? '사진 후보를 확인하고 적용해 주세요.' : '확인한 사진 후보를 적용했어요.' : '확인할 수 있는 후보가 없어요. 원본은 보관했어요.' : personalCatan ? '카드 목록과 보유 수량을 확인해 주세요.' : '그림을 확인하고 다른 곳만 고쳐 주세요.'}{lastScan.state === 'failed' && <button className="button text small-button" disabled={locked} onClick={() => fire(analyzeBatch({...lastScan,context:{...lastScan.context,id:crypto.randomUUID()}}))}>다시 읽기</button>}</p>}
        {view.pack.id !== 'rummikub' && !generic && !hasPhotos && !gallery && !cameraRun && <section className="capture-start" aria-label="첫 사진 찍기"><img src={BRAND_IMAGES.captureGuide} alt="" width={900} height={900} loading="lazy" decoding="async"/><div><h2>{personalRummikub ? '내 받침대를 한 장 찍어 두세요' : personalCatan ? '내 카드를 한 장 찍어 두세요' : '판을 위에서 한 장 찍어 주세요'}</h2><p>{personalRummikub ? '숫자와 색이 보이게 찍어 주세요.' : personalCatan ? '손패와 개인 카드가 보이게 찍어 주세요.' : generic?'사진을 남기고 상태는 직접 기록해요.':'판 전체가 들어오게 찍으면 그림으로 바꿔 고칠 수 있어요.'}</p><div className="button-row"><button className="button primary" disabled={locked} onClick={() => fire(flush(PHOTO_INPUT_SAVE_OPTIONS).then(() => openCamera()))}><Camera size={18}/>{captureLabel}</button><button className="button secondary" disabled={locked} onClick={() => upload.current?.click()}><ImagePlus size={18}/>{uploadLabel}</button></div></div></section>}
        {generic&&storedPhotos.length>0&&<div className="button-row"><button className="button secondary small-button" disabled={locked||!!visibleJob&&activeAnalysisJob(visibleJob)||!status?.configured||!canRecognizePhotos(view.pack,ownerId)} onClick={()=>fire(readStoredPhotos())}>사진 읽기</button>{!status?.configured&&<span className="small muted">AI 미연결 · 원본은 보관돼요.</span>}{!canRecognizePhotos(view.pack,ownerId)&&<span className="small muted">이 영역은 실물 보관·수동 기록만 지원해요.</span>}</div>}
        {personalCatan && <CatanOverview key={`assets:${ownerId}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
        {view.pack.id === 'rummikub' ? <RummikubWorkspace key={`scene:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { editorSave.current = save; }} onEvidence={(evidence, region) => setPhoto({ evidence, region })} hasPhotos={hasPhotos} captureLabel={captureLabel} onCapture={gallery || cameraRun ? undefined : () => fire(flush(PHOTO_INPUT_SAVE_OPTIONS).then(() => openCamera()))} onOpenPublic={() => fire(changeOwner(undefined))} onReread={status?.configured && currentPhotos.length > 0 && !(visibleJob&&activeAnalysisJob(visibleJob)) ? () => fire(readStoredPhotos()) : undefined}/>
          : !generic && <SceneWorkspace key={`scene:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { editorSave.current = save; }} onEvidence={(evidence, region) => setPhoto({ evidence, region })}/>}
        {view.pack.id !== 'rummikub' && <GameEssentials key={`essentials:${ownerId??'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save=>{essentialsSave.current=save;}} onEvidence={(evidence,region)=>setPhoto({evidence,region})}/>}
      </div>
      <aside className="cw-side" aria-label="차례와 메모">
        <QuickContext onStartTurn={id => fire(startTurn(id))} key={ownerId || 'public'} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { contextSave.current = save; }}/>
        {!personalCatan && !view.roomAccess && <CatanOverview key={`assets:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
      </aside>
    </div>}
    {!readonlyPublic&&<footer className="quick-save"><p>{snapshot ? savedLabel : '모르는 내용은 비워둬도 괜찮아요.'}</p><button className="button primary" disabled={locked} onClick={() => fire(saveBoard())}><Save size={18}/>저장</button></footer>}
    {showInvite&&<RoomInvite id={session.id} onClose={()=>setShowInvite(false)}/>}
    {editingPlayers && view.roomAccess && <RoomProfile view={view} onClose={()=>setEditingPlayers(false)} onSave={(name,color)=>mutate(()=>api.roomMe(session.id,{name,color}),'이름과 색을 바꿨어요')}/>}
    {editingPlayers && !view.roomAccess && <PlayersDialog game={view.pack.id} players={session.players} onClose={() => setEditingPlayers(false)} onSave={players => mutate(() => api.update(session.id, { players }), '플레이어 이름과 색을 바꿨어요')}/>}

    <input hidden ref={upload} type="file" accept="image/*" multiple onChange={async event => {
      const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length) return;
      setUploading(true); const run = newCaptureRun(ownerId);
      try {
        await flush(PHOTO_INPUT_SAVE_OPTIONS);
        const transfer = { run, unread: [], snapshot: { entries: [], active: false, retainedBytes: 0 }, phase: 'reading' } as unknown as GalleryTransfer;
        transfer.uploads = createScanUploadQueue(input => saveRunPhoto(run, input), snapshot => { transfer.snapshot = snapshot; showGallery(transfer); });
        galleryRef.current = transfer; showGallery(transfer);
        if (files.length > SCAN_LIMIT) onToast(`처음 ${SCAN_LIMIT}장을 추가해요`);
        await sendGalleryFiles(transfer, files.slice(0, SCAN_LIMIT));
      } catch (reason) { setUploading(false); onToast(reason instanceof Error ? reason.message : '사진을 추가하지 못했어요.'); }
    }}/>
    {cameraRun && <CameraDialog guidance={cameraRun.guidance} key={cameraRun.batch.context.id} onClose={() => void finishCaptureRun(cameraRun)} onCapture={input => saveRunPhoto(cameraRun, input)}/>}
    {photo && <PhotoDialog evidence={photo.evidence} region={photo.region} onClose={() => setPhoto(null)} onCrop={async input => { await mutate(() => api.evidence(session.id, { ...input, scope: photo.evidence.scope, ownerId: photo.evidence.ownerId, sourceEvidenceId: photo.evidence.id }), '확대한 사진을 추가했어요'); }}/>} 
    {(busy || working || uploading) && <div className="mutation-indicator" role="status"><Busy label={lastScan?.state === 'analyzing' ? '사진을 읽고 있어요' : uploading || cameraRun ? '사진을 보내고 있어요' : '저장하고 있어요'}/></div>}
  </div>;
}

function QuickContext({ view, ownerId, busy, mutate, onReadyToSave, onStartTurn }: { onStartTurn: (id: string) => void; view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onReadyToSave: (save: SaveDraft) => void }) {
  const { session, pack } = view;
  const current = String(confirmed(session, 'currentPlayer')?.value ?? '');
  const currentPhase = String(confirmed(session, 'turn.phase')?.value ?? '');
  const savedNote = session.notes[ownerId || 'public'] || '';
  const [player, setPlayer] = useState(current), [phase, setPhase] = useState(currentPhase), [note, setNote] = useState(savedNote);
  const edits = useRef({ player: false, phase: false, note: false });
  useEffect(() => { if (!edits.current.player) setPlayer(current); if (!edits.current.phase) setPhase(currentPhase); if (!edits.current.note) setNote(savedNote); }, [current, currentPhase, savedNote]);
  const dirty = player !== current || phase !== currentPhase || note !== savedNote;
  useEffect(() => { onReadyToSave(dirty ? async () => {
    const answers: { field: string; value: Value }[] = [];
    if (!ownerId && player !== current) answers.push({ field: 'currentPlayer', value: player || null });
    if (!ownerId && phase !== currentPhase) answers.push({ field: 'turn.phase', value: phase || null });
    await mutate(() => api.update(session.id, { answers, ...(note !== savedNote ? { notes: { [ownerId || 'public']: note } } : {}) })); edits.current = { player: false, phase: false, note: false };
  } : null); return () => onReadyToSave(null); });
  return <section className="quick-context"><h3>{ownerId ? '내 메모' : '차례·메모'}</h3>{!ownerId && <div className="two-columns">{pack.fields.some(f=>f.key==='currentPlayer')&&<div inert={busy}><OwnerColors label="누구 차례인가요?" game={pack.id} players={session.players} value={player || null} onChange={id => { edits.current.player = true; setPlayer(id || ''); }}/></div>}{pack.fields.some(f => f.key === 'turn.phase') && <label>어디까지 했나요?<select value={phase} disabled={busy} onChange={event => { edits.current.phase = true; setPhase(event.target.value); }}><option value="">모름 / 메모로 남기기</option>{pack.fields.find(f => f.key === 'turn.phase')?.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}</div>}{!ownerId && pack.id === 'catan-base' && <button className="button text small-button" disabled={busy || !player} onClick={() => onStartTurn(player)}>새 차례 시작</button>}<label>짧은 메모 <span className="muted">선택</span><textarea rows={2} value={note} disabled={busy} onChange={event => { edits.current.note = true; setNote(event.target.value); }} placeholder={pack.id === 'rummikub' ? ownerId ? '예: 내 받침대는 파란 봉투에.' : '예: 재배열 중. 따로 둔 타일부터 확인.' : ownerId ? '내 카드나 이어갈 때 필요한 개인 메모' : '예: 파랑이 자원 받을 차례. 카드는 작은 봉투에.'}/></label></section>;
}
