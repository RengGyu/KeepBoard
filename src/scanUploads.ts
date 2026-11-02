import { SCAN_LIMIT } from './scanQuality';

export const SCAN_QUEUE_MAX_BYTES = 96 * 1024 * 1024; // UTF-16 data URL storage estimate, not image compression.
export type UploadState = 'pending' | 'uploading' | 'saved' | 'failed';
export interface ScanUpload<R> { id: string; state: UploadState; bytes: number; result?: R; error?: string; uploadMs?: number }
export interface UploadSnapshot<R> { entries: ScanUpload<R>[]; retainedBytes: number; active: boolean }

/** One network request at a time; enqueue never waits for the network. Originals survive failed attempts. */
export function createScanUploadQueue<T, R>(upload: (payload: T) => Promise<R>, changed: (snapshot: UploadSnapshot<R>) => void = () => {}, maxBytes = SCAN_QUEUE_MAX_BYTES, concurrency = 1) {
  const entries: (ScanUpload<R> & { payload?: T })[] = [];
  let activeCount=0;let active = false, stopped = false, sequence = 0;
  const waiters = new Set<() => void>();
  const snapshot = (): UploadSnapshot<R> => ({ entries: entries.map(({ payload: _, ...entry }) => ({ ...entry })), retainedBytes: entries.reduce((sum, entry) => sum + (entry.payload === undefined ? 0 : entry.bytes), 0), active });
  const notify = () => changed(snapshot());
  const settle = () => { if (!active && !entries.some(e => e.state === 'pending')) { for (const resolve of waiters) resolve(); waiters.clear(); } };
  async function pump() {
    if(stopped)return;
    while(activeCount<Math.min(SCAN_LIMIT,Math.max(1,concurrency))){
      const entry=entries.find(e=>e.state==='pending');if(!entry)break;
      activeCount++;active=true;entry.state='uploading';notify();const start=performance.now();
      void(async()=>{try{entry.result=await upload(entry.payload!);entry.state='saved';entry.payload=undefined;entry.error=undefined;}
      catch(error){entry.state='failed';entry.error=error instanceof Error?error.message:'사진 전송 실패';}
      finally{entry.uploadMs=performance.now()-start;activeCount--;active=activeCount>0;notify();void pump();settle();}})();
    }
  }
  return {
    snapshot,
    enqueue(payload: T, bytes: number): string {
      if (stopped) throw new Error('종료한 사진 전송입니다.');
      if (entries.length >= SCAN_LIMIT) throw new Error('이번 촬영은 최대 6장입니다.');
      if (!Number.isFinite(bytes) || bytes < 0 || bytes + snapshot().retainedBytes > maxBytes) throw new Error('사진 전송 대기 공간이 찼어요. 전송이 끝난 뒤 다시 촬영해 주세요.');
      const id = `upload-${++sequence}`; entries.push({ id, state: 'pending', bytes, payload }); notify(); void pump(); return id;
    },
    retryFailed() { if (stopped) return; for (const entry of entries) if (entry.state === 'failed') { entry.state = 'pending'; entry.error = undefined; } notify(); void pump(); },
    discardFailed(): string[] { const ids = entries.filter(e => e.state === 'failed').map(e => e.id); for (let i = entries.length - 1; i >= 0; i--) if (entries[i].state === 'failed') entries.splice(i, 1); notify(); return ids; },
    drain(): Promise<void> { return !active && !entries.some(e => e.state === 'pending') ? Promise.resolve() : new Promise(resolve => waiters.add(resolve)); },
    // Device/unmount cancellation stops queued requests; an already sent save is allowed to settle exactly once.
    stop() { stopped = true; for (const entry of entries) if (entry.state === 'pending') { entry.state = 'failed'; entry.error = '전송 전에 촬영 화면이 닫혔어요.'; } notify(); settle(); },
  };
}
