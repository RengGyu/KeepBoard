import type {ScanUploadReady} from './api';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Camera, Check, Crop, Pause, Play, RotateCcw } from 'lucide-react';
import type { Evidence } from '../shared/types';
import { Modal } from './ui';
import { CaptureHelp } from './BoardFeedback';
import { BRAND_IMAGES } from './brandImages';
import { reserveScanFrame, settleScanFrame, analyzeScanFrame, emptyScanSelector, resetScanDwell, SCAN_LIMIT, SCAN_REASON_LABELS, SCAN_SAMPLE_INTERVAL_MS, stepScanSelector, type ScanFrame } from './scanQuality';

import { createScanUploadQueue, type UploadSnapshot } from './scanUploads';
import { recordScanTiming } from './scanTiming';

export type PhotoInput = { dataUrl: string; label?: string; width?: number; height?: number; sourceRegion?: Region };

export function CameraDialog({ onClose, onCapture, guidance,parallelUpload=false }: { parallelUpload?:boolean;guidance?:string; onClose: () => void|Promise<void>; onCapture: (photo: PhotoInput) => Promise<Evidence|ScanUploadReady> }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);
  const selector = useRef(emptyScanSelector());
  const callback = useRef(onCapture); callback.current = onCapture;
  const closeCallback = useRef(onClose); closeCallback.current = onClose;
  const mounted = useRef(false);
  const generation = useRef(0);
  const pausedRef = useRef(false);
  const closing = useRef(false);
  const closeDelivered = useRef(false);
  const capturing = useRef(false);
  const queue = useRef<ReturnType<typeof createScanUploadQueue<PhotoInput, Evidence|ScanUploadReady>> | null>(null);
  const finishRequested = useRef(false);
  const capturePreviews = useRef(new Map<string, { url: string; automatic: boolean }>());
  const failedSeen = useRef(new Set<string>());
  const [transfers, setTransfers] = useState<UploadSnapshot<Evidence|ScanUploadReady>>({ entries: [], active: false, retainedBytes: 0 });
  const frameCallback = useRef<number | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const takeRef = useRef<(automatic: boolean, frame?: ScanFrame) => Promise<void>>(async () => {});
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('카메라를 연결하고 있어요…');
  const [automatic, setAutomatic] = useState(false);
  const automaticRef = useRef(false);


  function stopDevice() {
    generation.current += 1;
    if (frameCallback.current !== null) video.current?.cancelVideoFrameCallback?.(frameCallback.current);
    frameCallback.current = null;
    if (fallbackTimer.current !== null) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) { video.current.pause(); video.current.srcObject = null; }
    selector.current = resetScanDwell(selector.current);
  }
  function pauseCamera(text = '일시정지했어요. 다시 시작하면 같은 스캔을 이어갑니다.') {
    pausedRef.current = true; stopDevice();
    if (mounted.current) { setPaused(true); setReady(false); setStatus(text); }
  }
  function sampleFrame(): ScanFrame {
    const element = video.current;
    if (!element?.videoWidth || !element.videoHeight) throw new Error('카메라 영상이 아직 준비되지 않았어요.');
    const canvas = sampleCanvas.current ||= document.createElement('canvas');
    const scale = 192 / Math.max(element.videoWidth, element.videoHeight);
    const width = Math.max(3, Math.round(element.videoWidth * scale));
    const height = Math.max(3, Math.round(element.videoHeight * scale));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('이 브라우저에서 사진 선별용 캔버스를 만들지 못했어요.');
    context.drawImage(element, 0, 0, width, height);
    return analyzeScanFrame(context.getImageData(0, 0, width, height).data, width, height);
  }
  function uploadQueue() {
    return queue.current ||= createScanUploadQueue<PhotoInput, Evidence|ScanUploadReady>(async input => {
      const saved = await callback.current(input);
      if (!('uploadReady' in saved)&&!saved.id) throw new Error('사진 저장 응답에 식별자가 없어요.');
      return saved;
    }, snapshot => {
      for (const entry of snapshot.entries) {
        if (entry.state === 'saved') selector.current = settleScanFrame(selector.current, entry.id, true);
        if (entry.state !== 'failed') failedSeen.current.delete(entry.id);
        else if (!failedSeen.current.has(entry.id)) {
          failedSeen.current.add(entry.id);
          if (mounted.current) { pauseCamera('사진 전송이 멈췄어요. 원본은 이 화면에 남아 있어요.'); setError(entry.error || '사진 전송 실패'); }
        }
      }
      if (mounted.current) { setTransfers(snapshot); setCount(snapshot.entries.length); }
    },undefined,parallelUpload?6:1);
  }
  async function takePhoto(automatic: boolean, sampled?: ScanFrame): Promise<void> {
    if (!video.current?.videoWidth || !stream.current?.getVideoTracks().some(track => track.readyState === 'live') || video.current.readyState < 2 || pausedRef.current || closing.current || capturing.current || uploadQueue().snapshot().entries.length >= SCAN_LIMIT) return;
    capturing.current = true;
    if (mounted.current) { setSavingPhoto(true); setError(''); }
    const started = performance.now();
    try {
      const frame = sampled || sampleFrame();
      const element = video.current!;
      const canvas = document.createElement('canvas');
      // Full camera resolution/quality is unchanged. Only the local quality sample is small.
      canvas.width = element.videoWidth; canvas.height = element.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('사진 원본을 만들지 못했어요.');
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', .94);
      const thumbnail = sampleCanvas.current?.toDataURL('image/jpeg', .7) || '';
      const capturedAt = performance.now();
      recordScanTiming({ stage: 'photo-encode', ms: capturedAt - started, photos: 1, bytes: Math.ceil(dataUrl.length * .75) });
      const uploads = uploadQueue();
      const id = uploads.enqueue({ dataUrl, label: `${automatic ? '자동 확보' : '직접 촬영'} ${uploads.snapshot().entries.length + 1}`, width: canvas.width, height: canvas.height }, dataUrl.length * 2);
      capturePreviews.current.set(id, { url: thumbnail, automatic });
      selector.current = reserveScanFrame(selector.current, frame, id, capturedAt);
      setTransfers(uploads.snapshot()); setCount(uploads.snapshot().entries.length);
      setStatus('사진을 확보했어요. 필요한 다른 영역을 찍거나 촬영을 마쳐 주세요.');
      if (uploads.snapshot().entries.length >= SCAN_LIMIT) pauseCamera(SCAN_REASON_LABELS.budget);
    } catch (reason) {
      pauseCamera('사진을 확보하지 못했어요. 전송을 기다리거나 다시 촬영해 주세요.');
      if (mounted.current) setError(reason instanceof Error ? reason.message : '사진 확보 실패');
    } finally { capturing.current = false; if (mounted.current) setSavingPhoto(false); }
  }
  takeRef.current = takePhoto;

  async function startCamera() {
    if (closing.current || selector.current.accepted.length + (selector.current.reserved?.length ?? 0) >= SCAN_LIMIT) return;
    finishRequested.current = false;
    stopDevice();
    const ownGeneration = generation.current;
    pausedRef.current = false;
    if (mounted.current) { setPaused(false); setReady(false); setError(''); setStatus('카메라 연결을 기다리고 있어요…'); }
    try {
      if (!window.isSecureContext) throw new Error('카메라는 HTTPS 또는 localhost에서 사용할 수 있어요. 보안 연결로 열거나 사진 업로드를 이용해 주세요.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저에서 카메라를 사용할 수 없어요. 사진 업로드를 이용해 주세요.');
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
      if (!mounted.current || ownGeneration !== generation.current || pausedRef.current || closing.current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      camera.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (!mounted.current || ownGeneration !== generation.current || pausedRef.current || closing.current) return;
        pauseCamera('카메라 연결이 끊겨 멈췄어요. 장치와 권한을 확인한 뒤 다시 시작하세요.');
        setError('카메라 영상이 종료되었습니다. 멈춘 영상은 촬영하지 않습니다.');
      }, { once: true }));
      const element = video.current!;
      element.srcObject = camera;
      await element.play();
      if (!mounted.current || ownGeneration !== generation.current || closing.current) return;
      let lastSampleAt = -Infinity, lastMediaTime = -1;
      const process = (now: number, mediaTime: number) => {
        if (capturing.current || pausedRef.current || closing.current || now - lastSampleAt < SCAN_SAMPLE_INTERVAL_MS || mediaTime === lastMediaTime || !element.videoWidth || !element.videoHeight) return;
        lastSampleAt = now; lastMediaTime = mediaTime;
        try {
          const frame = sampleFrame();
          if (mounted.current) setReady(true);
          if (!automaticRef.current) {
            if (mounted.current) setStatus('숫자와 말이 선명하게 보이면 사진 찍기를 눌러 주세요.');
            return;
          }
          const step = stepScanSelector(selector.current, frame, now);
          selector.current = step.state;
          if (mounted.current) setStatus(SCAN_REASON_LABELS[step.reason]);
          if (step.reason === 'ready') void takeRef.current(true, frame);
        } catch (reason) {
          pauseCamera('프레임 선별을 멈췄어요. 다시 시작하거나 사진 업로드를 이용해 주세요.');
          if (mounted.current) setError(reason instanceof Error ? reason.message : '카메라 프레임 확인 실패');
        }
      };
      const schedule = () => {
        if (!mounted.current || ownGeneration !== generation.current || pausedRef.current || closing.current) return;
        if (typeof element.requestVideoFrameCallback === 'function') frameCallback.current = element.requestVideoFrameCallback((now, metadata) => {
          frameCallback.current = null;
          if (ownGeneration !== generation.current) return;
          process(now, metadata.mediaTime); schedule();
        });
        else fallbackTimer.current = setTimeout(() => {
          fallbackTimer.current = null;
          if (ownGeneration !== generation.current) return;
          process(performance.now(), element.currentTime); schedule();
        }, SCAN_SAMPLE_INTERVAL_MS);
      };
      schedule();
    } catch (reason) {
      if (!mounted.current || ownGeneration !== generation.current) return;
      pauseCamera('카메라를 연결하지 못했어요. 권한과 연결을 확인한 뒤 다시 시작하세요.');
      const named = reason as { name?: string; message?: string };
      if (mounted.current) setError(named.name === 'NotAllowedError' ? '카메라 권한이 필요합니다. 브라우저에서 이 사이트의 카메라를 허용하거나 사진 업로드를 이용해 주세요.' : named.name === 'NotFoundError' ? '사용 가능한 카메라가 없습니다. 사진 업로드를 이용해 주세요.' : named.message || '카메라 연결 실패');
    }
  }
  const startRef = useRef(startCamera); startRef.current = startCamera;
  const pauseRef = useRef(pauseCamera); pauseRef.current = pauseCamera;
  useEffect(() => {
    mounted.current = true;
    void startRef.current();
    const hidden = () => { if (document.hidden) pauseRef.current('화면이 가려져 카메라를 멈췄어요. 돌아온 뒤 다시 시작하세요.'); };
    const pageHide = () => pauseRef.current('페이지를 떠나 카메라를 멈췄어요.');
    const unload = (event: BeforeUnloadEvent) => { if (queue.current?.snapshot().entries.some(e => e.state !== 'saved')) event.preventDefault(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('beforeunload', unload);
    return () => {
      mounted.current = false; stopDevice(); queue.current?.stop(); queue.current = null;
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);

  const closeCamera = async () => {
    if (closing.current || closeDelivered.current) return;
    finishRequested.current = true; closing.current = true; pausedRef.current = true; stopDevice();
    if (mounted.current) { setFinishing(true); setReady(false); setStatus('사진 전송을 마무리하고 있어요…'); }
    const uploads = uploadQueue();
    await uploads.drain();
    if (!mounted.current) return;
    if (uploads.snapshot().entries.some(e => e.state === 'failed')) {
      closing.current = false; setFinishing(false); setError('전송하지 못한 원본이 남아 있어요. 다시 보내거나 해당 사진을 빼고 마쳐 주세요.'); return;
    }
    if (!closeDelivered.current) {try{await closeCallback.current();closeDelivered.current=true;}catch(e){closing.current=false;setFinishing(false);setError(e instanceof Error?e.message:'사진 등록을 마치지 못했어요. 원본 전송은 유지됩니다.');}}
  };
  async function retryUploads() {
    setError(''); const uploads = uploadQueue(); uploads.retryFailed(); await uploads.drain();
    if (finishRequested.current) await closeCamera();
  }
  function omitFailedAndFinish() {
    const uploads = uploadQueue();
    for (const id of uploads.discardFailed()) { selector.current = settleScanFrame(selector.current, id, false); capturePreviews.current.delete(id); }
    void closeCamera();
  }
  const savedCount = transfers.entries.filter(e => e.state === 'saved').length;
  const failedCount = transfers.entries.filter(e => e.state === 'failed').length;
  return <Modal title="멈추고 선명하게 찍어 주세요" onClose={() => void closeCamera()} wide>
    {guidance&&<p className="small">{guidance}</p>}
    <div className="camera-view"><video ref={video} playsInline muted autoPlay poster={BRAND_IMAGES.captureGuide}/><div className="camera-guide" aria-hidden="true"/><span className="camera-count">확보 {count} / {SCAN_LIMIT}장</span>{paused && <span className="camera-paused">{count >= SCAN_LIMIT ? '사진 확보 마침' : '일시정지'}</span>}</div>
    <div className="modal-body">
      <CaptureHelp/>
      <ol className="scan-guidance"><li>찍을 영역을 화면에 크게</li><li>숫자·말에 초점 맞추기</li><li>사진 찍기</li></ol>
      <p className="camera-status" role="status" aria-live="polite">{status}</p>
      {count > 0 && <><p className="camera-status" role="status">사진 전송 {savedCount}/{count}{transfers.active ? ' · 보내는 중…' : failedCount ? ` · ${failedCount}장 실패` : ' · 완료'}</p><div className="scan-thumbnails" aria-label="이번 스캔에서 확보한 사진">{transfers.entries.map((entry, index) => { const preview = capturePreviews.current.get(entry.id); return <div key={entry.id}>{preview?.url && <img src={preview.url} alt={`확보한 사진 ${index + 1}`}/>}<span>{index + 1} · {entry.state === 'saved' ? '전송됨' : entry.state === 'failed' ? '전송 실패' : '전송 중'}</span></div>; })}</div></>}
      {failedCount > 0 && <div className="button-row"><button className="button secondary" disabled={transfers.active || finishing} onClick={() => void retryUploads()}>전송 다시 시도</button><button className="button text" disabled={transfers.active || finishing} onClick={omitFailedAndFinish}>실패한 {failedCount}장 빼고 마치기</button></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="button-row"><button className="button secondary" disabled={finishing || count >= SCAN_LIMIT} onClick={() => paused ? void startCamera() : pauseCamera()}>{paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? '다시 시작' : '일시정지'}</button><button className="button primary" disabled={!ready || savingPhoto || finishing || count >= SCAN_LIMIT} onClick={() => void takePhoto(false)}><Camera size={17}/>{savingPhoto ? '확보 중…' : '사진 찍기'}</button></div>
      <label className="muted small scan-manual-note"><input type="checkbox" checked={automatic} disabled={finishing || count >= SCAN_LIMIT} onChange={event => { automaticRef.current = event.target.checked; setAutomatic(event.target.checked); selector.current = resetScanDwell(selector.current); }}/> 움직이며 자동으로 찍기 (선택)</label>
      <p className="muted small">빛 반사와 손 가림을 피하고, 필요한 영역마다 선명한 사진 한 장이면 돼요.</p>
      <button className="button secondary full" disabled={finishing} onClick={() => void closeCamera()}><Check size={17}/>{finishing ? '사진 전송 마무리 중…' : '촬영 마치고 사진 확인'}</button>
    </div>
  </Modal>;
}

type Region = { x: number; y: number; width: number; height: number };
export function PhotoDialog({ evidence, region, onClose, onCrop }: { evidence: Evidence; region?: Region; onClose: () => void; onCrop: (photo: PhotoInput) => Promise<void> }) {
  const image = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Region | undefined>(region);
  const [zoom, setZoom] = useState(1);
  const [selecting, setSelecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const coordinates = (event: PointerEvent) => {
    const bounds = image.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  };
  const saveCrop = async () => {
    if (!image.current || !selection || selection.width < 0.01 || selection.height < 0.01) return;
    setBusy(true); setError('');
    try {
      const img = image.current;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(selection.width * img.naturalWidth));
      canvas.height = Math.max(1, Math.round(selection.height * img.naturalHeight));
      canvas.getContext('2d')!.drawImage(img, selection.x * img.naturalWidth, selection.y * img.naturalHeight, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      await onCrop({ dataUrl: canvas.toDataURL('image/jpeg', 0.95), label: `${evidence.label} · 확대 영역`, width: canvas.width, height: canvas.height, sourceRegion:{x:selection.x,y:selection.y,width:canvas.width/img.naturalWidth,height:canvas.height/img.naturalHeight} });
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '영역 저장 실패'); }
    finally { setBusy(false); }
  };
  return <Modal title={evidence.label || '사진 원본'} onClose={onClose} wide>
    <div className={`photo-inspector ${selecting ? 'selecting' : ''}`}><div className="photo-image-wrap" style={{ width: `${zoom * 100}%` }} onPointerDown={event => { if (!selecting || !image.current) return; start.current = coordinates(event); event.currentTarget.setPointerCapture(event.pointerId); setSelection(undefined); }} onPointerMove={event => {
      if (!start.current) return;
      const point = coordinates(event);
      setSelection({ x: Math.min(start.current.x, point.x), y: Math.min(start.current.y, point.y), width: Math.abs(start.current.x - point.x), height: Math.abs(start.current.y - point.y) });
    }} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}>
      <img ref={image} src={evidence.url} alt={evidence.label} draggable={false}/>{selection && <div className="crop-region" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}/>}
    </div></div>
    <div className="modal-body"><div className="inspector-tools"><label>확대 <input aria-label="사진 확대" type="range" min="1" max="3" step="0.1" value={zoom} onChange={event => setZoom(Number(event.target.value))}/></label><button className={`button small-button ${selecting ? 'primary' : 'secondary'}`} onClick={() => setSelecting(!selecting)}><Crop size={16}/>영역 선택</button><button className="icon-button" aria-label="확대와 선택 초기화" onClick={() => { setSelection(undefined); setZoom(1); }}><RotateCcw size={17}/></button></div>
      <p className="muted small">{selecting ? '사진 위를 드래그해 확인할 영역을 선택하세요.' : '원본을 확대해 말·카드·숫자를 직접 확인하세요.'} {evidence.kind === 'example' && '이 이미지는 예시 도식입니다.'}</p>
      {selection && <button className="button primary" disabled={busy || selection.width < 0.01} onClick={() => void saveCrop()}><Crop size={17}/>{busy ? '저장 중…' : '선택 영역을 근거 사진으로 추가'}</button>}
      {error && <p className="inline-error">{error}</p>}
    </div>
  </Modal>;
}
