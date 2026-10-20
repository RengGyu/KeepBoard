import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, ImagePlus, Play, Save, ScanLine, Settings2 } from 'lucide-react';
import type { AIStatus, Assertion, Evidence, SessionView, Stage, Value } from '../shared/types';
import { confirmed } from '../shared/catanSummary';
import { api, readPhoto } from './api';
import { CatanOverview } from './CatanOverview';
import { SceneWorkspace } from './SceneWorkspace';
import { CameraDialog, PhotoDialog, type PhotoInput } from './Capture';
import { fire, type Mutate } from './Fields';
import { addSavedScanEvidence, createScanBatch, finishScanBatch, type ScanBatch, type ScanRunContext } from './scanBatch';
import { createScanUploadQueue, SCAN_QUEUE_MAX_BYTES, type UploadSnapshot } from './scanUploads';
import { recordScanTiming } from './scanTiming';
import { SCAN_LIMIT } from './scanQuality';
import { Busy, formatDate } from './ui';
import './correction-workspace.css';

export const stages: { id: Stage; label: string; icon: typeof Camera; number: string }[] = [
  { id: 'capture', label: '그림 고치기', icon: ScanLine, number: '01' },
  { id: 'saved', label: '저장', icon: Save, number: '02' },
  { id: 'restore', label: '이어하기', icon: Play, number: '03' },
];
interface RunningCapture { batch: ScanBatch }
interface GalleryTransfer { run: RunningCapture; uploads: ReturnType<typeof createScanUploadQueue<PhotoInput, Evidence>>; unread: File[]; snapshot: UploadSnapshot<Evidence>; phase: 'reading' | 'sending' | 'failed' }
interface BatchReadout { context: ScanRunContext; evidenceIds: string[]; state: 'manual' | 'analyzing' | 'done' | 'failed'; error?: string }
type SaveDraft = (() => Promise<void>) | null;
export default function SessionWorkspace({ view, busy, status, mutate, onBack, onSettings, ownerId, setOwnerId, onToast, onReadyToLeave }: { view: SessionView; busy: boolean; status: AIStatus | null; mutate: Mutate; onBack: () => void; onSettings: () => void; ownerId?: string; setOwnerId: (id?: string) => void; onToast: (message: string) => void; onReadyToLeave?: (save: SaveDraft) => void }) {
  const { session } = view;
  const personalCatan = view.pack.id === 'catan-base' && !!ownerId;
  const [activeStage, setActiveStage] = useState<Stage>(() => {
    const step = new URLSearchParams(location.search).get('step') || session.stage;
    return stages.some(item => item.id === step) ? step as Stage : 'capture';
  });
  const [cameraRun, setCameraRun] = useState<RunningCapture | null>(null);
  const [lastScan, setLastScan] = useState<BatchReadout | null>(null);
  const analysisInFlight = useRef(new Set<string>());
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
  const editorSave = useRef<SaveDraft>(null), contextSave = useRef<SaveDraft>(null), assetSave = useRef<SaveDraft>(null);
  const currentScreen = useRef({ sessionId: session.id, ownerId });
  currentScreen.current = { sessionId: session.id, ownerId };
  const snapshot = session.snapshots.at(-1);
  const locked = busy || working || uploading || !!gallery;
  async function flush() { if (cameraRun || galleryRef.current) throw new Error('사진 전송을 마치거나 실패한 사진을 제외한 뒤 이동해 주세요.'); await editorSave.current?.(); await assetSave.current?.(); await contextSave.current?.(); }
  useEffect(() => { onReadyToLeave?.(flush); return () => onReadyToLeave?.(null); });
  function stage(value: Stage) { setActiveStage(value); const url = new URL(location.href); url.searchParams.set('step', value); history.replaceState({}, '', url); }
  async function navigate(value: Stage) { setWorking(true); try { await flush(); stage(value); } finally { setWorking(false); } }
  async function changeOwner(id?: string) { setWorking(true); try { await flush(); setOwnerId(id); } finally { setWorking(false); } }
  async function saveBoard(resume = false) { setWorking(true); try { await flush(); await mutate(() => api.commit(session.id, true), '이 판을 저장했어요'); if (resume) { await mutate(() => api.resume(session.id)); stage('restore'); } else stage('saved'); } finally { setWorking(false); } }
  function newCaptureRun(capturedOwner: string | undefined, purpose: 'capture' | 'restore' = activeStage === 'restore' ? 'restore' : 'capture'): RunningCapture {
    setLastScan(null);
    return { batch: createScanBatch({ id: globalThis.crypto?.randomUUID?.() || `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`, sessionId: session.id, captureEpoch: session.captureEpoch, ownerId: capturedOwner, purpose, instruction: '', aiEnabled: !!status?.configured }) };
  }
  function openCamera(options?: { ownerId?: string; purpose?: 'capture' | 'restore' }) {
    setCameraRun(newCaptureRun(options ? options.ownerId : ownerId, options?.purpose));
  }
  async function saveRunPhoto(run: RunningCapture, input: PhotoInput): Promise<Evidence> {
    const context = run.batch.context;
    if (run.batch.finished || run.batch.evidenceIds.length >= SCAN_LIMIT) throw new Error('마쳤거나 6장을 확보한 스캔입니다. 새 스캔을 시작해 주세요.');
    let saved: Evidence | undefined;
    await mutate(async () => {
      const response = await api.evidence(context.sessionId, { ...input, scope: context.ownerId ? 'player' : 'public', ownerId: context.ownerId, expectedCaptureEpoch: context.captureEpoch });
      const evidence = response.session.evidence.find(item => item.id === response.createdEvidenceId);
      if (!evidence) throw new Error('사진 원본 저장 식별자를 확인하지 못했습니다. 원본은 유지되며 자동 분석에 추가하지 않았어요.');
      run.batch = addSavedScanEvidence(run.batch, evidence);
      saved = evidence;
      return response;
    });
    return saved!;
  }
  async function analyzeBatch(batch: Pick<BatchReadout, 'context' | 'evidenceIds'>) {
    const { context, evidenceIds } = batch;
    if (!evidenceIds.length || analysisInFlight.current.has(context.id)) return;
    analysisInFlight.current.add(context.id);
    setLastScan({ context, evidenceIds: [...evidenceIds], state: 'analyzing' });
    try {
      await mutate(() => api.analyze(context.sessionId, { evidenceIds: [...evidenceIds], expectedCaptureEpoch: context.captureEpoch, purpose: context.purpose, instruction: context.instruction }), '사진을 읽었어요. 그림에서 고쳐 주세요');
      setLastScan(current => current?.context.id === context.id ? { ...current, state: 'done', error: undefined } : current);
      if (currentScreen.current.sessionId === context.sessionId && currentScreen.current.ownerId === context.ownerId) {
        stage(context.purpose === 'restore' ? 'restore' : 'capture');
        requestAnimationFrame(() => document.querySelector('.scene-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    } catch (reason) {
      setLastScan(current => current?.context.id === context.id ? { ...current, state: 'failed', error: reason instanceof Error ? reason.message : 'AI 판독 실패. 원본은 유지됩니다.' } : current);
    } finally { analysisInFlight.current.delete(context.id); }
  }
  async function finishCaptureRun(run: RunningCapture) {
    if (run.batch.analysisClaimed) return;
    const finished = finishScanBatch(run.batch);
    run.batch = finished.batch;
    setCameraRun(current => current === run ? null : current);
    if (!run.batch.evidenceIds.length) return;
    if (finished.evidenceIds.length) await analyzeBatch({ context: run.batch.context, evidenceIds: finished.evidenceIds });
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

  return <div className="correction-workspace">
    <header className="correction-heading"><button className="icon-button" aria-label="내 보드로" disabled={locked} onClick={onBack}><ArrowLeft size={21}/></button><div><span className="eyebrow">{view.pack.title}</span><h1>{session.name}</h1></div><button className="icon-button" aria-label="설정" onClick={onSettings}><Settings2 size={19}/></button></header>
    <nav className="correction-steps" aria-label="판 메뉴">{stages.map(item => <button key={item.id} className={activeStage === item.id ? 'active' : ''} aria-current={activeStage === item.id ? 'page' : undefined} disabled={locked} onClick={() => fire(navigate(item.id))}><item.icon size={16}/>{personalCatan && item.id === 'capture' ? '보유 정보' : item.label}</button>)}</nav>
    <div className="owner-tabs" role="tablist" aria-label="누구의 기록"><button role="tab" aria-selected={!ownerId} className={!ownerId ? 'active' : ''} disabled={locked} onClick={() => fire(changeOwner(undefined))}>공용 보드</button>{session.players.map(player => <button role="tab" key={player.id} aria-selected={ownerId === player.id} className={ownerId === player.id ? 'active' : ''} disabled={locked} onClick={() => fire(changeOwner(player.id))}><span className="player-dot" style={{ background: player.color }}/>{player.name}</button>)}</div>
    {activeStage === 'saved' ? <section className="simple-saved"><Save size={32}/><h2>{snapshot ? '저장한 판이 있어요' : '이대로 저장할 수 있어요'}</h2><p>{snapshot ? `${formatDate(snapshot.createdAt)} 저장` : '모르는 내용은 비워둬도 괜찮아요.'}</p>{snapshot && <p className="muted small">사진 {snapshot.evidence.filter(e => !e.ownerId || e.ownerId === ownerId).length}장 · {session.snapshots.length}번째 저장</p>}<button className="button secondary" disabled={locked} onClick={() => fire(navigate('capture'))}>그림 다시 보기</button></section> : <>
      {activeStage === 'restore' && <div className="resume-note"><strong>이 판을 보며 이어가세요.</strong><span>{snapshot ? `${formatDate(snapshot.createdAt)}에 남긴 기록입니다.` : '현재 기록을 보고 있어요.'}</span></div>}
      <div className="quick-capture"><button className="button primary" disabled={locked} onClick={() => fire(flush().then(() => openCamera()))}><Camera size={17}/>{personalCatan ? '손패 스캔' : '판 스캔'}</button><button className="button secondary" disabled={locked} onClick={() => upload.current?.click()}><ImagePlus size={17}/>{personalCatan ? '개인 사진 추가' : '사진 추가'}</button><span>{personalCatan ? '내 카드와 비공개 자료를 남겨요.' : '사진에서 읽고, 그림에서 고쳐요.'}</span></div>
      {gallery && <div className="scan-readout" role="status"><span>{gallery.phase === 'reading' ? '사진을 준비하고 있어요…' : `사진 전송 ${gallery.snapshot.entries.filter(e => e.state === 'saved').length}/${gallery.snapshot.entries.length + gallery.unread.length}${gallery.phase === 'failed' ? ' · 보내지 못한 사진이 남아 있어요.' : ' · 보내는 중…'}`}</span>{gallery.phase === 'failed' && <><button className="button text small-button" disabled={busy || uploading} onClick={() => void retryGallery(galleryRef.current!)}>전송 다시 시도</button><button className="button text small-button" disabled={busy || uploading} onClick={() => void omitGalleryFailures(galleryRef.current!)}>실패한 사진 빼고 마치기</button></>}</div>}
      {lastScan && lastScan.context.ownerId === ownerId && <p role="status" className="scan-readout">{lastScan.state === 'analyzing' ? '사진을 읽고 있어요…' : lastScan.state === 'failed' ? '사진은 남아 있어요. 다시 읽거나 직접 고칠 수 있어요.' : lastScan.state === 'manual' ? personalCatan ? '개인 사진을 추가했어요. 보유 수량을 확인해 주세요.' : '사진을 추가했어요. 그림에 부품을 놓아 주세요.' : personalCatan ? '카드 목록과 보유 수량을 확인해 주세요.' : '그림을 확인하고 다른 곳만 고쳐 주세요.'}{lastScan.state === 'failed' && <button className="button text small-button" disabled={locked} onClick={() => void analyzeBatch(lastScan)}>다시 읽기</button>}</p>}
      {personalCatan && <CatanOverview key={`assets:${ownerId}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
      <SceneWorkspace key={`scene:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { editorSave.current = save; }} onEvidence={(evidence, region) => setPhoto({ evidence, region })}/>
      {!personalCatan && <CatanOverview key={`assets:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
    </>}
    <QuickContext key={ownerId || 'public'} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { contextSave.current = save; }}/>
    <footer className="quick-save"><p>모르는 내용은 나중에 고쳐도 괜찮아요.</p><div className="button-row"><button className="button primary" disabled={locked} onClick={() => fire(saveBoard())}><Save size={17}/>이대로 저장</button>{snapshot && <button className="button secondary" disabled={locked} onClick={() => fire(saveBoard(true))}><Play size={16}/>저장 후 이어하기</button>}</div></footer>
    <input hidden ref={upload} type="file" accept="image/*" multiple onChange={async event => {
      const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length) return;
      setUploading(true); const run = newCaptureRun(ownerId);
      try {
        await flush();
        const transfer = { run, unread: [], snapshot: { entries: [], active: false, retainedBytes: 0 }, phase: 'reading' } as unknown as GalleryTransfer;
        transfer.uploads = createScanUploadQueue(input => saveRunPhoto(run, input), snapshot => { transfer.snapshot = snapshot; showGallery(transfer); });
        galleryRef.current = transfer; showGallery(transfer);
        if (files.length > SCAN_LIMIT) onToast(`처음 ${SCAN_LIMIT}장을 추가해요`);
        await sendGalleryFiles(transfer, files.slice(0, SCAN_LIMIT));
      } catch (reason) { setUploading(false); onToast(reason instanceof Error ? reason.message : '사진을 추가하지 못했어요.'); }
    }}/>
    {cameraRun && <CameraDialog key={cameraRun.batch.context.id} onClose={() => void finishCaptureRun(cameraRun)} onCapture={input => saveRunPhoto(cameraRun, input)}/>}
    {photo && <PhotoDialog evidence={photo.evidence} region={photo.region} onClose={() => setPhoto(null)} onCrop={async input => { await mutate(() => api.evidence(session.id, { ...input, scope: photo.evidence.scope, ownerId: photo.evidence.ownerId, sourceEvidenceId: photo.evidence.id }), '확대한 사진을 추가했어요'); }}/>} 
    {(busy || working || uploading) && <div className="mutation-indicator" role="status"><Busy label={lastScan?.state === 'analyzing' ? '사진을 읽고 있어요' : uploading || cameraRun ? '사진을 보내고 있어요' : '저장하고 있어요'}/></div>}
  </div>;
}

function QuickContext({ view, ownerId, busy, mutate, onReadyToSave }: { view: SessionView; ownerId?: string; busy: boolean; mutate: Mutate; onReadyToSave: (save: SaveDraft) => void }) {
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
  return <section className="quick-context"><h3>{ownerId ? '내 메모' : '다음에 이어갈 때'}</h3>{!ownerId && <div className="two-columns"><label>누구 차례인가요?<select value={player} disabled={busy} onChange={event => { edits.current.player = true; setPlayer(event.target.value); }}><option value="">모름 / 나중에</option>{session.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>어디까지 했나요?<select value={phase} disabled={busy} onChange={event => { edits.current.phase = true; setPhase(event.target.value); }}><option value="">모름 / 메모로 남기기</option>{pack.fields.find(f => f.key === 'turn.phase')?.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label></div>}<label>짧은 메모 <span className="muted">선택</span><textarea rows={2} value={note} disabled={busy} onChange={event => { edits.current.note = true; setNote(event.target.value); }} placeholder={ownerId ? '내 카드나 이어갈 때 필요한 개인 메모' : '예: 파랑이 자원 받을 차례. 카드는 작은 봉투에.'}/></label></section>;
}
