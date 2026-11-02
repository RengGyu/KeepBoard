import {isHostedReader} from '../shared/lightweightRecognition';
import {ScanObservationResults,ScanProgressPreview} from './ScanObservationResults';
import type {LocalReaderSelection,LocalReaderCapabilities,PhotoReaderSelection} from '../shared/lightweightRecognition';
import {validatePhotoFrame,type ConfirmedPhotoFrame} from '../shared/photoGeometry';
import {LightweightReaderControls} from './LightweightReaderControls';
import {CatanPhotoFrame} from './CatanPhotoFrame';
import {usePhotoDefinition,observablePhotoArea,loadPhotoDefinitions,photoDefinitionFor} from './photoDefinitions';
import {PhotoCaptureGuide,captureGuideText} from './PhotoCaptureGuide';
import {captureProfile,captureAreas,type CaptureTarget} from '../shared/photoCapture';
import {analysisJobMessage} from './analysisJobMessage';
import {createJobStatusPolling} from './jobStatusPolling';
import {numericJobMessage} from './numericReaderStatus';
import {activeAnalysisJob,type AnalysisJob} from '../shared/analysisJobs';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Hexagon, ImagePlus, LockKeyhole, MoreHorizontal, NotebookPen, Plus, Save, Users } from 'lucide-react';
import type { AIStatus, Assertion, Evidence, SessionView, Value } from '../shared/types';
import { confirmed } from '../shared/catanSummary';
import { api, readPhoto,type ScanUploadTicket,type ScanUploadReady } from './api';
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
import {PrivatePin} from './PrivatePin';
import {PHOTO_INPUT_SAVE_OPTIONS,type RummikubSaveOptions} from './rummikubSavePolicy';
import {canRecognizePhotos} from '../shared/recognition';
import {RoomInvite,RoomProfile,RoomPublicBoard} from './RoomEntry';
import {latestSnapshot} from '../shared/rooms';
import './correction-workspace.css';

type ReaderMode='existing'|'local'|'gemini'|'terra';
interface RunningCapture { reader?:PhotoReaderSelection;readingMode:ReaderMode;batch: ScanBatch; captureTarget?:CaptureTarget; guidance?:string; staged?:Map<string,ScanUploadReady>; photoIds?:Map<PhotoInput,string>;tickets?:Map<string,ScanUploadTicket> }
interface GalleryTransfer { run: RunningCapture; uploads: ReturnType<typeof createScanUploadQueue<PhotoInput, Evidence|ScanUploadReady>>; unread: File[]; snapshot: UploadSnapshot<Evidence|ScanUploadReady>; phase: 'reading' | 'sending' | 'failed' }
interface BatchReadout { reader?:PhotoReaderSelection;readingMode?:ReaderMode;captureTarget?:CaptureTarget; context: ScanRunContext; evidenceIds: string[]; state: 'manual' | 'analyzing' | 'done' | 'failed'; error?: string; candidateCount?: number }
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
  const [localCaptureAreaId,setLocalCaptureAreaId]=useState('');
  // Turn and memo stay one tap away on narrow screens (the board and save come first); the wide layout keeps them open beside the board.
  const [wide,setWide]=useState(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(min-width:1101px)').matches);
  const [contextOpen,setContextOpen]=useState<boolean|null>(null);
  const [photoToolsOpen,setPhotoToolsOpen]=useState<boolean|null>(null);
  const readingKey=session.assertions.filter(a=>a.ownerId===ownerId&&(!!a.observationReceipts?.length||a.basis==='observation'&&a.evidenceIds.length>0)).at(-1)?.id;
  useEffect(()=>{if(readingKey)setPhotoToolsOpen(false);},[readingKey]);
  useEffect(()=>{if(typeof window==='undefined'||typeof window.matchMedia!=='function')return;const query=window.matchMedia('(min-width:1101px)'),change=()=>setWide(query.matches);query.addEventListener?.('change',change);return()=>query.removeEventListener?.('change',change);},[]);
  const [readers,setReaders]=useState<LocalReaderCapabilities|null>(null);
  const gemini=readers?.readers.find(r=>r.kind==='gemini-game-observation-v1'),geminiAvailable=!!gemini?.available;
  // Keep the production reader fixed unless the user explicitly changes the optional settings.
  const [readerMode,setReaderMode]=useState<ReaderMode>('terra');
  const terra=readers?.readers.find(r=>r.kind==='terra-game-observation-v1'),terraAvailable=!!terra?.available;
  const hostedMode=readerMode==='gemini'||readerMode==='terra',hostedAvailable=readerMode==='terra'?terraAvailable:geminiAvailable;
  // A scoped scan keeps every selected current-epoch photo as a separate reading unit.
  const scoped=readerMode!=='existing';
  const [localTask,setLocalTask]=useState<LocalReaderSelection['task']>();
  const [localInputMode,setLocalInputMode]=useState<NonNullable<LocalReaderSelection['inputMode']>>('original');
  const [frame,setFrame]=useState<ConfirmedPhotoFrame|null>(null),[framePhoto,setFramePhoto]=useState<{photo:Evidence;sha:string}|null>(null);
  const {definition,loading:definitionLoading,error:definitionError}=usePhotoDefinition(view.pack,scoped);
  const localAvailable=!!readers?.readers.find(r=>r.kind==='local-observation-v1')?.available;
  const localAreas=definition?.areas.filter(a=>ownerId?a.partition==='owner_private':a.partition!=='owner_private')??[];
  const localArea=localAreas.find(a=>a.id===localCaptureAreaId)||(!localCaptureAreaId?localAreas.find(a=>definition&&observablePhotoArea(definition,a))??localAreas[0]:undefined);
  const supportedLocalArea=!!definition&&!!localArea&&observablePhotoArea(definition,localArea);
  const numberCapability=readers?.readers.find(r=>r.kind==='local-observation-v1')?.tasks?.find(t=>t.task==='catan-numerals-v1');
  const numericScope=view.pack.id==='catan-base'&&definition?.nativeBridge==='catan'&&definition.gameId==='catan'&&definition.gameId===view.pack.runtime?.source?.gameId&&!ownerId&&localArea?.id==='board'&&localArea.partition==='common_public';
  const canUseCatanFrame=readerMode==='local'&&view.pack.id==='catan-base'&&!ownerId&&localArea?.id==='board'&&localArea.partition==='common_public';
  useEffect(()=>{let active=true;api.recognitionReaders().then(r=>{if(active)setReaders(r);},()=>{if(active)setReaders(null);});return()=>{active=false;};},[session.id]);
  const [pendingRead,setPendingRead]=useState<Pick<BatchReadout,'context'|'evidenceIds'|'captureTarget'|'reader'|'readingMode'>|null>(null);
  const scopedPending=pendingRead?.context.sessionId===session.id&&pendingRead.context.ownerId===ownerId?pendingRead:null;
  useEffect(()=>{setPhotoToolsOpen(null);setCaptureAreaId('');setLocalCaptureAreaId('');setLocalTask(undefined);setLocalInputMode('original');setPendingRead(null);setFrame(null);setFramePhoto(null);},[session.id,ownerId]);
  const [lastScan, setLastScan] = useState<BatchReadout | null>(null);
  const analysisInFlight = useRef(new Set<string>());
  const [scanProgress,setScanProgress]=useState<import('../shared/analysisJobs').ScanProgress|null>(null);
  const [serverJob,setServerJob]=useState<AnalysisJob|null>(null);
  const visibleJob=serverJob?.sessionId===session.id&&serverJob.ownerId===ownerId?serverJob:null;
  const [jobConnectionLost,setJobConnectionLost]=useState(false);
  const [jobAutoPaused,setJobAutoPaused]=useState(false);
  const jobRefresh=useRef({mutate});jobRefresh.current={mutate};
  const refreshedJobs=useRef(new Set<string>());
  const jobPolling=useRef<ReturnType<typeof createJobStatusPolling>|null>(null);
  useEffect(()=>{let active=true;const received=new Set<number>();let partial:import('../shared/analysisJobs').ScanProgress|null=null;let pendingProgress:import('../shared/analysisJobs').ScanProgress|null=null;let requestedJob:AnalysisJob|null=null;const capturedEpoch=session.captureEpoch;setScanProgress(null);setServerJob(null);setJobConnectionLost(false);setJobAutoPaused(false);if(privateLocked)return;
    const poller=createJobStatusPolling({
      read:async()=>{if(isHostedReader(requestedJob?.reader)&&activeAnalysisJob(requestedJob)){pendingProgress=await api.scanProgress(session.id,requestedJob.id,ownerId,partial?.jobId===requestedJob.id?[...received]:[]);return pendingProgress.job??requestedJob;}const response=await api.analysisJobs(session.id,ownerId),job=response.jobs[0]??null;
        if(isHostedReader(job?.reader)&&activeAnalysisJob(job)&&job.captureEpoch===capturedEpoch){
          pendingProgress=await api.scanProgress(session.id,job.id,ownerId,partial?.jobId===job.id?[...received]:[]);
        }return job;},
      onJob:job=>{if(!active)return;requestedJob=job;
        if(!job||!activeAnalysisJob(job)){setScanProgress(null);partial=null;received.clear();}
        else if(pendingProgress?.jobId===job.id&&pendingProgress.captureEpoch===capturedEpoch){
          const p=pendingProgress;if(partial?.jobId!==job.id){partial=null;received.clear();}
          p.units=p.units.map(u=>({...u,receipts:u.receipts??partial?.units.find(old=>old.index===u.index)?.receipts}));for(const u of p.units)if(u.receipts)received.add(u.index);partial=p;setScanProgress(p);
        }else if(partial?.jobId!==job.id){setScanProgress(null);partial=null;received.clear();}
        setServerJob(job);setJobConnectionLost(false);setJobAutoPaused(false);},
      onCompleted:async job=>{if(refreshedJobs.current.has(job.id))return;refreshedJobs.current.add(job.id);try{await jobRefresh.current.mutate(async()=>{if(!active)throw Error('지난 화면');const v=await api.session(session.id);if(!active||v.session.captureEpoch!==capturedEpoch)throw Error('촬영 단계 변경');return v;});}catch(error){refreshedJobs.current.delete(job.id);throw error;}},
      onError:reason=>{setJobAutoPaused(reason==='auto-limit');setJobConnectionLost(true);},
      visible:()=>typeof document==='undefined'||!document.hidden,
      subscribeVisibility:change=>{if(typeof document==='undefined')return()=>{};document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},
      schedule:(check,delay)=>setTimeout(check,delay),cancel:timer=>clearTimeout(timer),
    });
    jobPolling.current=poller;poller.start();return()=>{active=false;poller.stop();if(jobPolling.current===poller)jobPolling.current=null;};
  },[session.id,ownerId,privateLocked,session.captureEpoch]);
  const [photo, setPhoto] = useState<{ evidence: Evidence; region?: Assertion['region'] } | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const detailTarget=useRef<import('../shared/scanObservation').ScanTarget|null>(null);
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
  const dockRoot = useRef<HTMLDivElement>(null);
  const [dockOpen, setDockOpen] = useState<string | null>(null);
  const [dockKeys, setDockKeys] = useState('');
  // Which dock panels exist on this board and which one is open (they open closed or open by their own defaults).
  useEffect(() => {
    const root = dockRoot.current?.closest('.correction-workspace'); if (!root) return;
    const present = ['scan', 'context', 'players'].filter((_, index) => root.querySelector([ '.cw-mobile-photo-tools', '.cw-context', '.cw-side > .catan-overview > details' ][index])).join(',');
    setDockKeys(current => current === present ? current : present);
    const openKey = ['scan', 'context', 'players'].find((_, index) => root.querySelector<HTMLDetailsElement>([ '.cw-mobile-photo-tools', '.cw-context', '.cw-side > .catan-overview > details' ][index])?.open) ?? null;
    setDockOpen(current => current === openKey ? current : openKey);
  });
  const editorSave = useRef<SaveDraft>(null), contextSave = useRef<SaveDraft>(null), assetSave = useRef<SaveDraft>(null), essentialsSave=useRef<SaveDraft>(null);
  const currentScreen = useRef({ sessionId: session.id, ownerId });
  currentScreen.current = { sessionId: session.id, ownerId };
  const snapshot = latestSnapshot(session,ownerId??'public');
  const locked = busy || working || uploading || !!gallery&&gallery.phase!=='failed';
  async function flush(options?:RummikubSaveOptions) { if (cameraRun || galleryRef.current&&galleryRef.current.phase!=='failed') throw new Error('사진 전송을 마치거나 실패한 사진을 제외한 뒤 이동해 주세요.'); await editorSave.current?.(options); await essentialsSave.current?.(); await assetSave.current?.(); await contextSave.current?.(); }
  useEffect(() => { onReadyToLeave?.(()=>flush(PHOTO_INPUT_SAVE_OPTIONS)); return () => onReadyToLeave?.(null); });
  async function changeOwner(id?: string) { setWorking(true); try { await flush(PHOTO_INPUT_SAVE_OPTIONS);await setOwnerId(id); } finally { setWorking(false); } }
  async function saveBoard() { setWorking(true); try { await flush(); await mutate(() => api.commit(session.id, true), '저장했어요'); if (alive.current) setSaveFeedback(event => event + 1); } finally { setWorking(false); } }
  async function startTurn(playerId: string) { setWorking(true); try { await flush(); await mutate(() => api.nextTurn(session.id, playerId), '새 차례를 시작했어요'); } finally { setWorking(false); } }
  // Built from the definition table itself (not hook state) so a photo added the moment the board opens still starts its read.
  function resolveReader(mode:ReaderMode,useFrame:boolean):PhotoReaderSelection|undefined{
    if(mode==='existing')return undefined;
    const def=photoDefinitionFor(view.pack);if(!def)return undefined;
    const areas=def.areas.filter(a=>ownerId?a.partition==='owner_private':a.partition!=='owner_private');
    const area=areas.find(a=>a.id===localCaptureAreaId)||(!localCaptureAreaId?areas.find(a=>observablePhotoArea(def,a))??areas[0]:undefined);
    if(!area||!observablePhotoArea(def,area))return undefined;
    const framed=mode==='local'&&useFrame&&canUseCatanFrame&&currentFrame?{frame:currentFrame}:{};
    return mode==='gemini'||mode==='terra'?{kind:mode==='terra'?'terra-game-observation-v1':'gemini-game-observation-v1',definitionSHA:def.definitionSHA,areaId:area.id,...framed}:{kind:'local-observation-v1',definitionSHA:def.definitionSHA,areaId:area.id,inputMode:localTask?localInputMode:'original',...(localTask?{task:localTask}:{}),...framed};
  }
  const resolveReaderRef=useRef(resolveReader);resolveReaderRef.current=resolveReader;
  function newCaptureRun(capturedOwner: string | undefined, purpose: 'capture' | 'restore' = 'capture', useFrame=false): RunningCapture {
    setLastScan(null);
    const profile=captureProfile(view.pack),area=captureAreas(view.pack,capturedOwner).find(a=>a.id===(scoped?localArea?.id:captureAreaId));
    const reader=resolveReader(readerMode,useFrame);
    return {reader,readingMode:readerMode, guidance:profile?`${view.pack.title} · ${area?.name??'전체'}: ${captureGuideText(view.pack,area)}`:undefined,...(profile&&area?{captureTarget:{version:1 as const,gameId:profile.gameId,sourceSHA:profile.sourceSHA,areaId:area.id}}:{}),batch: createScanBatch({ id: globalThis.crypto?.randomUUID?.() || `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`, sessionId: session.id, captureEpoch: session.captureEpoch, ownerId: capturedOwner, purpose, instruction: '', aiEnabled: hostedMode?hostedAvailable:scoped?localEnabled&&(!localTask||localInputMode!=='catan-atlas'||useFrame):!!status?.configured&&canRecognizePhotos(view.pack,capturedOwner) }) };
  }
  function openCamera(options?: { ownerId?: string; purpose?: 'capture' | 'restore' }) {
    setCameraRun(newCaptureRun(options ? options.ownerId : ownerId, options?.purpose));
  }
  async function saveRunPhoto(run: RunningCapture, input: PhotoInput): Promise<Evidence|ScanUploadReady> {
    const context = run.batch.context;
    if (run.batch.finished || run.batch.evidenceIds.length >= SCAN_LIMIT) throw new Error('마쳤거나 6장을 확보한 스캔입니다. 새 스캔을 시작해 주세요.');
    if((run.readingMode==='gemini'||run.readingMode==='terra')){
      run.photoIds??=new Map();let clientPhotoId=run.photoIds.get(input);if(!clientPhotoId){clientPhotoId='photo-'+run.photoIds.size;run.photoIds.set(input,clientPhotoId);}
      const ready=run.staged?.get(clientPhotoId);if(ready)return ready;
      const stage=await api.stageScanPhoto(context.sessionId,context.id,clientPhotoId,{...input,captureTarget:run.captureTarget,scope:context.ownerId?'player':'public',ownerId:context.ownerId,expectedCaptureEpoch:context.captureEpoch},run.tickets?.get(clientPhotoId));
      (run.staged??=new Map()).set(clientPhotoId,stage);return stage;
    }
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
  async function analyzeBatch(batch: Pick<BatchReadout, 'context' | 'evidenceIds' | 'captureTarget' | 'reader' | 'readingMode'>,sameStaticState=false) {
    const {context,evidenceIds,captureTarget,readingMode}=batch;let {reader}=batch;if(!evidenceIds.length||analysisInFlight.current.has(context.id))return;
    if(evidenceIds.length>1&&!sameStaticState&&readingMode==='existing'){setPendingRead(batch);return;}
    if(readingMode!=='existing'&&!reader){await loadPhotoDefinitions().catch(()=>undefined);reader=resolveReaderRef.current(readingMode as ReaderMode,false);}
    if(readingMode!=='existing'&&!reader)throw new Error('이 저장본의 촬영 정의가 맞지 않아 선택한 판독을 시작하지 않았어요. 원본은 보관돼요.');
    setPendingRead(null);analysisInFlight.current.add(context.id);setLastScan(null);
    try{const response=await api.startAnalysisJob(context.sessionId,{requestId:context.id,evidenceIds:[...evidenceIds],expectedCaptureEpoch:context.captureEpoch,purpose:context.purpose,instruction:context.instruction,captureTarget,reader,sameStaticState:readingMode!=='existing'||sameStaticState,scope:context.ownerId?'owner':'public',ownerId:context.ownerId});if(alive.current&&currentScreen.current.sessionId===context.sessionId&&currentScreen.current.ownerId===context.ownerId&&response.job.captureEpoch===context.captureEpoch){setServerJob(response.job);jobPolling.current?.accept(response.job);}}
    catch(reason){if(alive.current)setLastScan({context,captureTarget,reader,readingMode,evidenceIds:[...evidenceIds],state:'failed',error:reason instanceof Error?reason.message:'사진 읽기를 시작하지 못했어요.'});throw reason;}
    finally{analysisInFlight.current.delete(context.id);}
  }
  async function readStoredPhotos() {
    setWorking(true);
    try {
      if(scoped&&!localEnabled)throw new Error('선택한 판독기·촬영 부분·현재 사진을 확인해 주세요. 원본은 보관돼요.');
      await flush(PHOTO_INPUT_SAVE_OPTIONS);
      const run = newCaptureRun(ownerId,'capture',true);
      const photos=readingPhotos;
      const ids=photos.slice(-SCAN_LIMIT).map(p=>p.id);
      await analyzeBatch({reader:run.reader,readingMode:run.readingMode,captureTarget:run.captureTarget,context:run.batch.context,evidenceIds:ids});
    } finally { setWorking(false); }
  }
  async function finishCaptureRun(run: RunningCapture) {
    if (run.batch.analysisClaimed) return;
    if((run.readingMode==='gemini'||run.readingMode==='terra')&&run.staged?.size){
      await mutate(async()=>{const ids=[...(run.photoIds?.values()??[])].filter(id=>run.staged!.has(id)),response=await api.registerScanPhotos(run.batch.context.sessionId,run.batch.context.id,ids,run.batch.context.captureEpoch);
        for(const clientId of ids){const e=response.session.evidence.find(e=>e.id===run.staged!.get(clientId)!.evidenceId);if(e&&!run.batch.evidenceIds.includes(e.id))run.batch=addSavedScanEvidence(run.batch,e);}return response;});
    }
    const finished = finishScanBatch(run.batch);
    run.batch = finished.batch;
    setCameraRun(current => current === run ? null : current);
    if (!run.batch.evidenceIds.length) return;
    if (finished.evidenceIds.length) await analyzeBatch({ reader:run.reader,readingMode:run.readingMode,captureTarget:run.captureTarget,context: run.batch.context, evidenceIds:finished.evidenceIds });
    else setLastScan({reader:run.reader,readingMode:run.readingMode, context: run.batch.context, evidenceIds: [...run.batch.evidenceIds], state: 'manual' });
  };

  async function prepareFrame(){
    const source=readingPhotos.at(-1);if(!canUseCatanFrame||!source||!definition)return;
    const response=await fetch(source.url,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('기준점을 지정할 원본을 열지 못했어요.');
    const bytes=await response.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
    setFramePhoto({photo:source,sha:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')});
  }
  function showGallery(transfer: GalleryTransfer) { if (alive.current) setGallery({ ...transfer }); }
  async function sendGalleryFiles(transfer: GalleryTransfer, files: File[]) {
    transfer.phase = 'reading'; transfer.unread = []; showGallery(transfer);
    const prepared:PhotoInput[]=[];
    for (const file of files) {
      if (!alive.current) return;
      try {
        const estimatedBytes = Math.ceil(file.size * 8 / 3) + 256;
        if (estimatedBytes + transfer.uploads.snapshot().retainedBytes > SCAN_QUEUE_MAX_BYTES) await transfer.uploads.drain();
        if (estimatedBytes + transfer.uploads.snapshot().retainedBytes > SCAN_QUEUE_MAX_BYTES) throw new Error('사진 전송 대기 공간 부족');
        const start = performance.now();
        const input = await readPhoto(file);
        recordScanTiming({ stage: 'gallery-read', ms: performance.now() - start, photos: 1, bytes: file.size });
        if((transfer.run.readingMode==='gemini'||transfer.run.readingMode==='terra')){if(prepared.reduce((n,i)=>n+i.dataUrl.length*2,0)+input.dataUrl.length*2>SCAN_QUEUE_MAX_BYTES)throw Error('사진 전송 대기 공간 부족');prepared.push({...input,label:file.name});}
        else transfer.uploads.enqueue({ ...input, label: file.name }, input.dataUrl.length * 2);
      } catch { transfer.unread.push(file); }
    }
    if(prepared.length){const run=transfer.run,context=run.batch.context;run.photoIds??=new Map();
      for(const input of prepared)if(!run.photoIds.has(input))run.photoIds.set(input,'photo-'+run.photoIds.size);
      const tickets=await api.scanUploadTickets(context.sessionId,context.id,context.captureEpoch,prepared.map(input=>{const {dataUrl,...meta}=input;return {clientPhotoId:run.photoIds!.get(input),...meta,contentType:dataUrl.match(/^data:([^;,]+)/)?.[1],captureTarget:run.captureTarget,scope:context.ownerId?'player':'public',ownerId:context.ownerId,expectedCaptureEpoch:context.captureEpoch};}));
      run.tickets??=new Map();for(const ticket of tickets.items)run.tickets.set(ticket.clientPhotoId,ticket);
      for(const input of prepared)transfer.uploads.enqueue(input,input.dataUrl.length*2);
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
      transfer.phase = 'failed'; showGallery(transfer);if((transfer.run.readingMode==='gemini'||transfer.run.readingMode==='terra')&&transfer.run.staged?.size&&!transfer.run.batch.finished)await finishCaptureRun(transfer.run);return;
    }
    try{await finishCaptureRun(transfer.run);galleryRef.current=null;setGallery(null);}catch{transfer.phase='failed';showGallery(transfer);}
  }
  async function retryGallery(transfer: GalleryTransfer) {
    if(transfer.run.batch.context.ownerId!==ownerId||transfer.run.batch.context.sessionId!==session.id)throw Error('이 사진의 촬영 영역에서 다시 시도하세요.');
    if(transfer.run.batch.finished)transfer.run=newCaptureRun(ownerId,transfer.run.batch.context.purpose);
    setUploading(true); transfer.uploads.retryFailed();
    await sendGalleryFiles(transfer, [...transfer.unread]);
  }
  async function omitGalleryFailures(transfer: GalleryTransfer) {
    transfer.uploads.discardFailed(); transfer.unread = []; await finishGallery(transfer);
  }

  const captureLabel = personalRummikub ? '받침대 찍기' : personalCatan ? '손패 찍기' : ownerId ? '개인 사진 찍기' : '판 찍기';
  const uploadLabel = ownerId ? '개인 사진 추가' : '사진 추가';
  const savedLabel = snapshot ? `마지막 저장 ${formatDate(snapshot.createdAt)}` : '아직 저장 전';
  const currentPlayer = confirmed(session, 'currentPlayer')?.value;
  const currentPhotos = session.evidence.filter(item => item.kind === 'photo' && item.captureEpoch === session.captureEpoch && (ownerId ? item.scope === 'player' && item.ownerId === ownerId : item.scope === 'public' && !item.ownerId));
  const scopePhotos=session.evidence.filter(item=>item.kind==='photo'&&(ownerId?item.scope==='player'&&item.ownerId===ownerId:item.scope==='public'&&!item.ownerId));
  const storedPhotos=scopePhotos.filter(item=>item.captureEpoch===scopePhotos.at(-1)?.captureEpoch);
  const readingPhotos=scoped?currentPhotos:generic?storedPhotos:currentPhotos;
  const savedFrames=session.assertions.flatMap(a=>a.observationReceipts??[]).map(r=>r.frame).filter((f):f is ConfirmedPhotoFrame=>!!f);
  const latestPhoto=readingPhotos.at(-1);
  const currentFrame=[frame,...savedFrames.reverse()].find(f=>f?.sourceEvidenceId===latestPhoto?.id&&f?.definitionSHA===definition?.definitionSHA)??null;
  const localEnabled=supportedLocalArea&&!definitionLoading&&!definitionError&&(hostedMode?hostedAvailable:localTask?numericScope&&!!numberCapability?.available&&!!numberCapability.profile&&(localInputMode!=='catan-atlas'||!!currentFrame):localAvailable);
  const hasPhotos = session.evidence.some(item => item.kind !== 'note' && (ownerId ? item.ownerId === ownerId : !item.ownerId));
  const owner = ownerId ? session.players.find(player => player.id === ownerId) : undefined;
  const editable = !privateLocked && !readonlyPublic;
  const capture = () => fire(flush(PHOTO_INPUT_SAVE_OPTIONS).then(() => openCamera()));
  // Phone dock: the panels under the board open from one row of chips, one at a time, instead of
  // stacking full-width disclosure rows. It drives the existing <details> elements, so their state stays theirs.
  const dockItems = [
    { key: 'scan', selector: '.cw-mobile-photo-tools', label: '스캔·사진', Icon: Camera },
    { key: 'context', selector: '.cw-context', label: ownerId ? '내 메모' : '차례·메모', Icon: NotebookPen },
    { key: 'players', selector: '.cw-side > .catan-overview > details', label: '플레이어', Icon: Users },
  ];
  const toggleDock = (key: string) => {
    const root = dockRoot.current?.closest('.correction-workspace'); if (!root) return;
    let opened: HTMLElement | null = null;
    for (const item of dockItems) {
      const panel = root.querySelector<HTMLDetailsElement>(item.selector); if (!panel) continue;
      const open = item.key === key ? !panel.open : false;
      if (panel.open !== open) panel.open = open;
      if (open) opened = panel;
    }
    setDockOpen(opened ? key : null);
    if (opened) requestAnimationFrame(() => opened?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  // Photo tools and their status lines travel together: above the board on phones, at the top of the side column on wide screens.
  const photoTools = editable ? <>
        <div className="cw-photo-bar" role="group" aria-label="사진 찍기와 읽기"><div className="cw-photo-actions"><button className="button secondary small-button" aria-label={captureLabel} disabled={locked} onClick={capture}><Camera size={18}/><span>{view.pack.id === 'rummikub' ? personalRummikub ? '받침대' : '판 찍기' : captureLabel}</span></button><button className="button secondary small-button" aria-label={uploadLabel} disabled={locked} onClick={() => upload.current?.click()}><ImagePlus size={18}/><span>{view.pack.id === 'rummikub' ? '사진' : uploadLabel}</span></button></div>
        <PhotoCaptureGuide pack={view.pack} ownerId={ownerId} areaId={scoped?localArea?.id??localCaptureAreaId:captureAreaId} onChange={scoped?id=>{setLocalCaptureAreaId(id);setLocalTask(undefined);setLocalInputMode('original');}:setCaptureAreaId} disabled={locked||!!cameraRun}/>
        <LightweightReaderControls terraAvailable={terraAvailable} terraReason={terra?.reason} mode={readerMode} geminiAvailable={geminiAvailable} geminiReason={gemini&&'reason' in gemini?gemini.reason:undefined} geminiModel={gemini?.identity&&'model' in gemini.identity?gemini.identity.model:undefined} onMode={mode=>{setReaderMode(mode);setLocalTask(undefined);setLocalInputMode('original');}} numericScope={numericScope} task={localTask} onTask={task=>{setLocalTask(task);setLocalInputMode('original');}} numberCapability={numberCapability} inputMode={localInputMode} onInputMode={setLocalInputMode} available={localAvailable} availabilityMessage={readers?'로컬 판독기가 준비되지 않았어요. 기존 AI 설정은 바꾸지 않았어요.':'로컬 판독기에 연결할 수 없어요.'} busy={locked||!!visibleJob&&activeAnalysisJob(visibleJob)} hasDefinition={!!definition} definitionLoading={definitionLoading} definitionError={definitionError} showReadButton={view.pack.id!=='rummikub'} supportedArea={supportedLocalArea} hasPhotos={readingPhotos.length>0} onRead={()=>fire(readStoredPhotos())} onFrame={canUseCatanFrame?()=>fire(prepareFrame()):undefined} frameConfirmed={!!currentFrame} existingAvailable={!!status?.configured&&canRecognizePhotos(view.pack,ownerId)}/></div>
        {scopedPending&&<section className="panel" aria-label="사진 상태 확인"><p>이 {scopedPending.evidenceIds.length}장은 같은 멈춘 판을 찍은 사진인가요?</p><div className="button-row"><button className="button primary" disabled={locked} onClick={()=>fire(analyzeBatch(scopedPending,true))}>네, 함께 읽기</button><button className="button secondary" disabled={locked} onClick={()=>fire(analyzeBatch({...scopedPending,context:{...scopedPending.context,id:crypto.randomUUID()},evidenceIds:scopedPending.evidenceIds.slice(-1)}))}>마지막 한 장만 읽기</button><button className="button text" onClick={()=>setPendingRead(null)}>지금은 사진만 보관</button></div></section>}
        {visibleJob&&<p className="scan-readout" role="status">{jobConnectionLost&&activeAnalysisJob(visibleJob)?jobAutoPaused?'자동 상태 확인을 멈췄어요. 서버 작업은 계속될 수 있어요.':'상태를 확인하지 못했어요. 서버 작업은 계속될 수 있어요.':numericJobMessage(visibleJob)||analysisJobMessage(visibleJob)}{jobConnectionLost&&<button className="button text small-button" onClick={()=>jobPolling.current?.refresh()}>상태 다시 확인</button>}</p>}
        {jobConnectionLost&&!visibleJob&&<p className="scan-readout" role="status">작업 상태를 확인하지 못했어요.<button className="button text small-button" onClick={()=>jobPolling.current?.refresh()}>상태 다시 확인</button></p>}
        {gallery&&gallery.run.batch.context.ownerId===ownerId && <div className="scan-readout" role="status"><span>{gallery.phase === 'reading' ? '사진을 준비하고 있어요…' : `사진 전송 ${gallery.snapshot.entries.filter(e => e.state === 'saved').length}/${gallery.snapshot.entries.length + gallery.unread.length}${gallery.phase === 'failed' ? ' · 보내지 못한 사진이 남아 있어요.' : ' · 보내는 중…'}`}</span>{gallery.phase === 'failed' && <><button className="button text small-button" disabled={busy || uploading} onClick={() => void retryGallery(galleryRef.current!)}>전송 다시 시도</button><button className="button text small-button" disabled={busy || uploading} onClick={() => void omitGalleryFailures(galleryRef.current!)}>실패한 사진 빼고 마치기</button></>}</div>}
        {lastScan && lastScan.context.ownerId === ownerId && (view.pack.id !== 'rummikub' || rummikubReadoutMessage(lastScan.state, lastScan.candidateCount)) && <p role="status" className={`scan-readout ${lastScan.state}`}>{view.pack.id === 'rummikub' ? rummikubReadoutMessage(lastScan.state, lastScan.candidateCount) : lastScan.state === 'analyzing' ? '사진을 읽고 있어요…' : lastScan.state === 'failed' ? (lastScan.error||'사진 읽기에 실패했어요. 원본은 남아 있어요.') : lastScan.state === 'manual' ? (lastScan.readingMode!=='existing'?((lastScan.readingMode==='gemini'||lastScan.readingMode==='terra')?'선택한 판독기를 사용할 수 없어 사진만 보관했어요.':lastScan.reader&&'task' in lastScan.reader&&lastScan.reader.task&&lastScan.reader.inputMode==='catan-atlas'?'사진을 보관했어요. 새 원본의 기준점을 확인한 뒤 숫자만 읽기를 눌러 주세요.':'로컬 판독기를 사용할 수 없어 사진만 보관했어요.'):!canRecognizePhotos(view.pack,ownerId) ? '이 영역은 사진 관측 미지원으로 원본만 보관했어요.' : 'AI가 연결되지 않아 사진만 보관했어요.') : generic ? lastScan.candidateCount ? view.session.assertions.some(a=>a.status==='candidate'&&a.ownerId===ownerId&&a.evidenceIds.some(id=>lastScan.evidenceIds.includes(id))) ? '사진 후보를 확인하고 적용해 주세요.' : '사진에서 읽은 내용을 바로 적용했어요. 필요한 부분만 고쳐 주세요.' : '확인할 수 있는 후보가 없어요. 원본은 보관했어요.' : personalCatan ? '카드 목록과 보유 수량을 확인해 주세요.' : '그림을 확인하고 다른 곳만 고쳐 주세요.'}{lastScan.state === 'failed' && <button className="button text small-button" disabled={locked} onClick={() => fire(analyzeBatch({...lastScan,context:{...lastScan.context,id:crypto.randomUUID()}}))}>다시 읽기</button>}</p>}
  </> : null;
  return <div className={`correction-workspace${view.pack.id === 'rummikub' ? ' rummikub-session' : generic ? ' board-record-session' : ''}${ownerId ? ' is-private' : ' is-public'}`}>
    <header className="correction-heading"><button className="icon-button cw-back" aria-label="내 보드로" disabled={locked} onClick={onBack}><ArrowLeft size={22}/></button><div className="cw-title"><div className="cw-title-line"><h1>{session.name}</h1></div><p><span>{view.pack.title}</span><span>{session.players.length}명</span><span className="cw-saved">{savedLabel}</span></p></div>
      <div className="cw-actions"><details className="cw-more"><summary aria-label="보드 메뉴" title="보드 메뉴"><MoreHorizontal size={20}/></summary><div className="cw-more-menu"><button className="button text small-button" aria-label="플레이어 이름과 색" disabled={locked} onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); fire(flush().then(() => setEditingPlayers(true))); }}><Users size={18}/><span>플레이어 이름·색</span></button>{onNewBoard && view.pack.id !== 'rummikub' && !generic && <button className="button text small-button cw-new-board" aria-label="새 보드 만들기" disabled={locked} onClick={onNewBoard}><Plus size={17}/>새 보드</button>}</div></details>{!readonlyPublic&&<button className="button primary small-button cw-save-top" disabled={locked} onClick={() => fire(saveBoard())}><Save size={18}/>저장</button>}</div>
    </header>
    {saveFeedback > 0 && <BoardEvent key={saveFeedback} kind="save"/>}
    <div className="cw-scope-row"><div ref={ownerTabs} className="owner-tabs" role="tablist" aria-label="누구의 기록"><button role="tab" aria-selected={!ownerId} className={`owner-tab-public${!ownerId ? ' active' : ''}`} disabled={locked} onClick={() => fire(changeOwner(undefined))}><Hexagon size={16}/>공용 보드</button><span className="owner-tabs-divider" role="presentation"><LockKeyhole size={13} aria-hidden="true"/>개인</span>{session.players.filter(player=>!view.roomAccess||player.id===view.roomAccess.playerId).map(player => <button role="tab" key={player.id} aria-selected={ownerId === player.id} className={ownerId === player.id ? 'active' : ''} disabled={locked} onClick={() => fire(changeOwner(player.id))}><PlayerPiece color={player.color} game={view.pack.id} size={24}/><span className="owner-tab-name">{view.roomAccess?'내 보드 · ':''}{player.name}</span>{currentPlayer === player.id && <CurrentTurnMark/>}{view.privacy?.protectedOwnerIds.includes(player.id) && <LockKeyhole size={13} aria-label="비밀번호 보호"/>}</button>)}</div>
      <BoardState view={view} ownerId={ownerId}/></div>
    {view.roomAccess&&<div className="room-bar"><span className="small muted">참가 {session.players.length}/{session.room!.capacity} · {session.players.map(p=>p.name).join(' · ')}</span>{view.roomAccess.role==='host'&&<button className="button secondary small-button" onClick={()=>setShowInvite(true)}>초대</button>}{!readonlyPublic&&snapshot&&<button className="button text small-button" disabled={locked} onClick={()=>fire((async()=>{await flush();await mutate(()=>api.resume(session.id,ownerId?'owner':'public',ownerId),'저장본을 열었어요');})())}>저장본 열기</button>}</div>}
    {ownerId&&<PrivatePin key={`${ownerId}:${privateLocked}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} beforeChange={flush}/>}
    {readonlyPublic?<RoomPublicBoard view={view}/>:!privateLocked&&<div className="cw-grid">
      <div className="cw-main">
        {owner && <p className="cw-private-note"><LockKeyhole size={15} aria-hidden="true"/><span><b>{owner.name}</b>의 개인 기록이에요. 본인만 보는 내용은 공용 보드에 나오지 않아요.</span></p>}
        
        {view.pack.id !== 'rummikub' && !generic && !hasPhotos && !gallery && !cameraRun && <section className="capture-start" aria-label="첫 사진 찍기"><Camera className="capture-start-mark" size={22} aria-hidden="true"/><div><h2>{personalRummikub ? '내 받침대를 한 장 찍어 두세요' : personalCatan ? '내 카드를 한 장 찍어 두세요' : '판을 위에서 한 장 찍어 주세요'}</h2><p>{personalRummikub ? '숫자와 색이 보이게 찍어 주세요.' : personalCatan ? '손패와 개인 카드가 보이게 찍어 주세요.' : generic?'사진을 남기고 상태는 직접 기록해요.':'판 전체가 들어오게 찍으면 그림으로 바꿔 고칠 수 있어요.'}</p></div></section>}
        {personalCatan && <CatanOverview key={`assets:${ownerId}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
        {scanProgress&&visibleJob&&activeAnalysisJob(visibleJob)&&<ScanProgressPreview view={view} progress={scanProgress}/>}
        {view.pack.id === 'rummikub' ? <RummikubWorkspace key={`scene:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { editorSave.current = save; }} onEvidence={(evidence, region) => setPhoto({ evidence, region })} hasPhotos={hasPhotos} captureLabel={captureLabel} onCapture={gallery || cameraRun ? undefined : () => fire(flush(PHOTO_INPUT_SAVE_OPTIONS).then(() => openCamera()))} onOpenPublic={() => fire(changeOwner(undefined))} onReread={(scoped?localEnabled:status?.configured) && currentPhotos.length > 0 && !(visibleJob&&activeAnalysisJob(visibleJob)) ? () => fire(readStoredPhotos()) : undefined}/>
          : !generic && <SceneWorkspace key={`scene:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { editorSave.current = save; }} onReadDetail={hostedMode&&hostedAvailable?(target)=>{detailTarget.current=target;upload.current?.click();}:undefined} onEvidence={(evidence, region) => setPhoto({ evidence, region })}/>}
        {!wide && <div className="board-dock" ref={dockRoot} role="toolbar" aria-label="보드 아래 메뉴">{dockItems.filter(item => dockKeys.split(',').includes(item.key)).map(({ key, label, Icon }) => <button type="button" key={key} className="dock-chip" aria-expanded={dockOpen === key} onClick={() => toggleDock(key)}><Icon size={16} aria-hidden="true"/>{label}</button>)}</div>}
        {/* On a phone the board leads; the scan tools sit right under it. */}
        {!wide && photoTools && <details className="cw-mobile-photo-tools" open={photoToolsOpen??(!snapshot&&!readingKey)} onToggle={event=>setPhotoToolsOpen(event.currentTarget.open)}><summary><Camera size={18}/>스캔·사진{visibleJob&&activeAnalysisJob(visibleJob)&&<span role="status">읽는 중…</span>}{visibleJob?.state==='failed'&&<span role="status">읽기 확인 필요</span>}</summary>{photoTools}</details>}
        <ScanObservationResults view={view} ownerId={ownerId}/>
        {view.pack.id !== 'rummikub' && <GameEssentials key={`essentials:${ownerId??'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save=>{essentialsSave.current=save;}} onEvidence={(evidence,region)=>setPhoto({evidence,region})}/>}
      </div>
      <aside className="cw-side" aria-label="사진과 차례·메모">
        {wide && photoTools}
        <details className="cw-context" open={contextOpen??wide} onToggle={event=>setContextOpen(event.currentTarget.open)}><summary>{ownerId?'내 메모':'차례·메모'}</summary>
          <QuickContext onStartTurn={id => fire(startTurn(id))} key={ownerId || 'public'} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onReadyToSave={save => { contextSave.current = save; }}/>
        </details>
        {!personalCatan && !view.roomAccess && <CatanOverview key={`assets:${ownerId || 'public'}`} view={view} ownerId={ownerId} busy={locked} mutate={mutate} onOwner={id => fire(changeOwner(id))} onReadyToSave={save => { assetSave.current = save; }}/>}
      </aside>
    </div>}
    {!readonlyPublic&&<footer className="quick-save"><p>{savedLabel}</p><button className="button primary quick-save-button" disabled={locked} onClick={() => fire(saveBoard())}><span className="quick-save-label"><Save size={18}/>저장</span>{saveFeedback > 0 && <span key={saveFeedback} className="quick-save-done" aria-hidden="true"><Check size={18}/>저장됨</span>}</button></footer>}
    {showInvite&&<RoomInvite id={session.id} onClose={()=>setShowInvite(false)}/>}
    {editingPlayers && view.roomAccess && <RoomProfile view={view} onClose={()=>setEditingPlayers(false)} onSave={(name,color)=>mutate(()=>api.roomMe(session.id,{name,color}),'이름과 색을 바꿨어요')}/>}
    {editingPlayers && !view.roomAccess && <PlayersDialog game={view.pack.id} players={session.players} onClose={() => setEditingPlayers(false)} onSave={players => mutate(() => api.update(session.id, { players }), '플레이어 이름과 색을 바꿨어요')}/>}

    <input hidden ref={upload} type="file" accept="image/*" multiple onChange={async event => {
      const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length) return;
      setUploading(true); const run = newCaptureRun(ownerId);
      if(detailTarget.current&&isHostedReader(run.reader))run.reader={...run.reader,target:detailTarget.current};detailTarget.current=null;
      try {
        await flush(PHOTO_INPUT_SAVE_OPTIONS);
        const transfer = { run, unread: [], snapshot: { entries: [], active: false, retainedBytes: 0 }, phase: 'reading' } as unknown as GalleryTransfer;
        transfer.uploads = createScanUploadQueue(input => saveRunPhoto(transfer.run, input), snapshot => { transfer.snapshot = snapshot; showGallery(transfer); },undefined,(run.readingMode==='gemini'||run.readingMode==='terra')?6:1);
        galleryRef.current = transfer; showGallery(transfer);
        if (files.length > SCAN_LIMIT) onToast(`처음 ${SCAN_LIMIT}장을 추가해요`);
        await sendGalleryFiles(transfer, files.slice(0, SCAN_LIMIT));
      } catch (reason) { setUploading(false); onToast(reason instanceof Error ? reason.message : '사진을 추가하지 못했어요.'); }
    }}/>
    {cameraRun && <CameraDialog parallelUpload={(cameraRun.readingMode==='gemini'||cameraRun.readingMode==='terra')} guidance={cameraRun.guidance} key={cameraRun.batch.context.id} onClose={() => finishCaptureRun(cameraRun)} onCapture={input => saveRunPhoto(cameraRun, input)}/>}
    {canUseCatanFrame&&framePhoto&&definition&&<CatanPhotoFrame photo={framePhoto.photo} sourceSHA={framePhoto.sha} definitionSHA={definition.definitionSHA} initial={currentFrame?.sourceEvidenceId===framePhoto.photo.id?currentFrame:undefined} validate={f=>validatePhotoFrame(f,{evidenceId:framePhoto.photo.id,sourceSHA:framePhoto.sha,definitionSHA:definition.definitionSHA})} onClose={()=>setFramePhoto(null)} onConfirm={f=>{setFrame(f);setFramePhoto(null);}}/>}
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

/** The board's key state in one line: whose turn, where in the turn, and what still waits for a decision. Read-only; editing stays in its own controls. */
export function BoardState({ view, ownerId }: { view: SessionView; ownerId?: string }) {
  const { session, pack } = view;
  const text = (key: string) => { const value = confirmed(session, key)?.value; return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''; };
  const playerId = text('currentPlayer'), player = session.players.find(p => p.id === playerId);
  const turn = player?.name || (pack.fields.some(f => f.key === 'turn' && f.scope === 'public') ? text('turn') : '');
  const phaseKey = pack.fields.some(f => f.key === 'turn.phase') ? 'turn.phase' : pack.fields.some(f => f.key === 'phase' && f.scope === 'public') ? 'phase' : '';
  const phaseValue = phaseKey ? text(phaseKey) : '', phase = pack.fields.find(f => f.key === phaseKey)?.options?.find(o => o.value === phaseValue)?.label ?? phaseValue;
  const candidates = session.assertions.filter(a => a.status === 'candidate' && a.ownerId === ownerId).length;
  const items: [string, string, boolean][] = [];
  if (pack.fields.some(f => f.key === 'currentPlayer' || f.key === 'turn')) items.push(['차례', turn || '모름', !turn]);
  if (phaseKey) items.push(['단계', phase || '모름', !phase]);
  if (candidates) items.push(['확인할 후보', `${candidates}개`, false]);
  if (!items.length) return null;
  return <dl className="board-state" aria-label="지금 상태">{items.map(([label, value, unknown]) => <div key={label} className={unknown ? 'is-unknown' : undefined}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
