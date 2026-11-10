// Pixel heuristics for selecting photographs, not object tracking or coverage estimation.
export const SCAN_LIMIT = 6;
export const SCAN_SAMPLE_INTERVAL_MS = 250;
export const SCAN_THRESHOLDS = {
  minMean: 35, maxMean: 225, maxClippedFraction: .78,
  minContrast: 10, minLaplacianVariance: 80, maxMotion: 5.5,
  stableDwellMs: 1000, cooldownMs: 1800,
  duplicateLuma: 8, duplicateColor: 26, duplicateHashFraction: .12,
} as const;

export interface ScanFingerprint { cells: number[]; hash: number[]; color: [number, number, number]; mean: number; aspect: number }
export interface ScanFrame {
  width: number; height: number; gray: Uint8Array;
  mean: number; contrast: number; laplacianVariance: number; darkFraction: number; brightFraction: number;
  fingerprint: ScanFingerprint;
}
export type ScanReason = 'dark' | 'bright' | 'flat' | 'blur' | 'motion' | 'settling' | 'cooldown' | 'duplicate' | 'ready' | 'budget';
export const SCAN_REASON_LABELS: Record<ScanReason, string> = {
  dark: '어두워요 · 빛을 더 비춰주세요', bright: '빛이 너무 강해요 · 반사를 피해 주세요',
  flat: '판의 세부가 보이지 않아요 · 영역을 바꿔주세요', blur: '흐려요 · 초점이 맞도록 잠시 멈춰주세요',
  motion: '움직이는 중 · 잠시 멈춰주세요', settling: '안정된 장면을 기다리는 중…',
  cooldown: '저장했어요 · 다음 영역으로 천천히 이동하세요', duplicate: '이미 확보한 비슷한 장면이에요',
  ready: '좋은 장면을 저장하고 있어요…', budget: '6장 확보 · 마치고 그림 보드에서 확인하세요',
};

export interface ScanSelector {
  previous: ScanFrame | null;
  stableSince: number | null;
  lastAcceptedAt: number | null;
  accepted: ScanFingerprint[];
  reserved?: { id: string; fingerprint: ScanFingerprint }[];
  lastCapturedAt?: number;
}
export const emptyScanSelector = (): ScanSelector => ({ previous: null, stableSince: null, lastAcceptedAt: null, accepted: [] });
/** Advice only: manual capture never inherits the automatic selector's rejection gate. */
export function manualCaptureGuidance(frame:ScanFrame){
 const reason=stepScanSelector(emptyScanSelector(),frame,0).reason;
 return ['dark','bright','flat','blur'].includes(reason)?SCAN_REASON_LABELS[reason]:'작은 숫자까지 선명하면 사진 찍기를 눌러 주세요.';
}
export const resetScanDwell = (state: ScanSelector): ScanSelector => ({ ...state, previous: null, stableSince: null });

/** Input is a small device-local RGBA sample; the captured original uses a different full-size canvas. */
export function analyzeScanFrame(data: ArrayLike<number>, width: number, height: number): ScanFrame {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || width * height > 1_048_576 || data.length !== width * height * 4) throw new Error('유효한 크기의 RGBA 프레임이 필요합니다.');
  const count = width * height, gray = new Uint8Array(count);
  let sum = 0, squares = 0, dark = 0, bright = 0, red = 0, green = 0, blue = 0;
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    const r = Number(data[offset]), g = Number(data[offset + 1]), b = Number(data[offset + 2]);
    if (![r, g, b].every(value => Number.isFinite(value) && value >= 0 && value <= 255)) throw new Error('픽셀 채널은 0~255 값이어야 합니다.');
    const value = (77 * r + 150 * g + 29 * b) >> 8;
    gray[i] = value; sum += value; squares += value * value;
    dark += value <= 16 ? 1 : 0; bright += value >= 239 ? 1 : 0;
    red += r; green += g; blue += b;
  }
  let lapSum = 0, lapSquares = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const laplacian = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
    lapSum += laplacian; lapSquares += laplacian * laplacian;
  }
  const mean = sum / count, interior = (width - 2) * (height - 2);
  const cells: number[] = [];
  const averageCell = (column: number, row: number, columns: number, rows: number) => {
    const startX = Math.floor(column * width / columns), endX = Math.max(startX + 1, Math.floor((column + 1) * width / columns));
    const startY = Math.floor(row * height / rows), endY = Math.max(startY + 1, Math.floor((row + 1) * height / rows));
    let total = 0, pixels = 0;
    for (let y = startY; y < Math.min(height, endY); y++) for (let x = startX; x < Math.min(width, endX); x++) { total += gray[y * width + x]; pixels++; }
    return total / pixels;
  };
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) cells.push(averageCell(x, y, 16, 12));
  const hash: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hash.push(averageCell(x, y, 9, 8) > averageCell(x + 1, y, 9, 8) ? 1 : 0);
  return {
    width, height, gray, mean, contrast: Math.sqrt(Math.max(0, squares / count - mean * mean)),
    laplacianVariance: Math.max(0, lapSquares / interior - (lapSum / interior) ** 2),
    darkFraction: dark / count, brightFraction: bright / count,
    fingerprint: { cells, hash, mean, aspect: width / height, color: [red / count, green / count, blue / count] },
  };
}

export function frameMotion(current: ScanFrame, previous: ScanFrame | null): number | null {
  if (!previous || current.width !== previous.width || current.height !== previous.height || current.gray.length !== previous.gray.length) return null;
  let sum = 0;
  for (let i = 0; i < current.gray.length; i++) sum += Math.abs(current.gray[i] - previous.gray[i]);
  return sum / current.gray.length;
}

export function sameScanView(first: ScanFingerprint, second: ScanFingerprint): boolean {
  if (Math.abs(first.aspect - second.aspect) > .08 || first.cells.length !== second.cells.length || !first.cells.length || first.hash.length !== second.hash.length || !first.hash.length) return false;
  const luma = first.cells.reduce((sum, value, i) => sum + Math.abs((value - first.mean) - (second.cells[i] - second.mean)), 0) / first.cells.length;
  const color = first.color.reduce((sum, value, i) => sum + Math.abs(value - second.color[i]), 0) / 3;
  const hash = first.hash.reduce((sum, value, i) => sum + (value === second.hash[i] ? 0 : 1), 0) / first.hash.length;
  return luma <= SCAN_THRESHOLDS.duplicateLuma && color <= SCAN_THRESHOLDS.duplicateColor && hash <= SCAN_THRESHOLDS.duplicateHashFraction;
}

export function stepScanSelector(state: ScanSelector, frame: ScanFrame, at: number): { state: ScanSelector; reason: ScanReason; motion: number | null } {
  if (!Number.isFinite(at) || at < 0) throw new Error('프레임 시각은 0 이상의 유한한 값이어야 합니다.');
  const motion = frameMotion(frame, state.previous);
  const next = { ...state, previous: frame };
  const reject = (reason: ScanReason) => ({ state: { ...next, stableSince: null }, reason, motion });
  if (state.accepted.length + (state.reserved?.length ?? 0) >= SCAN_LIMIT) return reject('budget');
  if (frame.mean < SCAN_THRESHOLDS.minMean || frame.darkFraction > SCAN_THRESHOLDS.maxClippedFraction) return reject('dark');
  if (frame.mean > SCAN_THRESHOLDS.maxMean || frame.brightFraction > SCAN_THRESHOLDS.maxClippedFraction) return reject('bright');
  if (frame.contrast < SCAN_THRESHOLDS.minContrast) return reject('flat');
  if (frame.laplacianVariance < SCAN_THRESHOLDS.minLaplacianVariance) return reject('blur');
  if (motion !== null && motion > SCAN_THRESHOLDS.maxMotion) return reject('motion');
  if ([...state.accepted, ...(state.reserved ?? []).map(item => item.fingerprint)].some(fingerprint => sameScanView(frame.fingerprint, fingerprint))) return reject('duplicate');
  const stableSince = motion === null || state.stableSince === null || at < state.stableSince ? at : state.stableSince;
  const lastCapture = state.lastCapturedAt ?? state.lastAcceptedAt;
  if (lastCapture !== null && at - lastCapture < SCAN_THRESHOLDS.cooldownMs) return { state: { ...next, stableSince }, reason: 'cooldown', motion };
  return { state: { ...next, stableSince }, reason: at - stableSince >= SCAN_THRESHOLDS.stableDwellMs ? 'ready' : 'settling', motion };
}

/** Call only after a successful persistence callback; a failed save consumes no budget or fingerprint. */
export function acceptScanFrame(state: ScanSelector, frame: ScanFrame, at: number): ScanSelector {
  if (state.accepted.length >= SCAN_LIMIT) throw new Error('이번 스캔은 최대 6장까지 저장할 수 있습니다.');
  return { ...state, accepted: [...state.accepted, frame.fingerprint], lastAcceptedAt: at, stableSince: null };
}

/** Reserve at local capture time so pending originals count toward budget/duplicates without waiting for upload. */
export function reserveScanFrame(state: ScanSelector, frame: ScanFrame, id: string, at: number): ScanSelector {
  if (state.accepted.length + (state.reserved?.length ?? 0) >= SCAN_LIMIT) throw new Error('이번 스캔은 최대 6장입니다.');
  return { ...state, reserved: [...(state.reserved ?? []), { id, fingerprint: frame.fingerprint }], lastCapturedAt: at, stableSince: null };
}
export function settleScanFrame(state: ScanSelector, id: string, saved: boolean): ScanSelector {
  const entry = state.reserved?.find(item => item.id === id);
  if (!entry) return state;
  return { ...state, reserved: state.reserved!.filter(item => item.id !== id), accepted: saved ? [...state.accepted, entry.fingerprint] : state.accepted };
}
