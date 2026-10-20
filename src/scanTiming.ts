export type ScanTimingStage = 'photo-encode' | 'photo-upload' | 'gallery-read' | 'analysis-roundtrip';
export interface ScanTiming { stage: ScanTimingStage; ms: number; photos?: number; bytes?: number; server?: Record<string, number> }
const recent: ScanTiming[] = [];
/** Bounded, memory-only diagnostics. No session ids, file names, pixels, prompts or keys. */
export function recordScanTiming(timing: ScanTiming) {
  if (!Number.isFinite(timing.ms) || timing.ms < 0) return;
  recent.push({ ...timing, ms: Math.round(timing.ms * 10) / 10 }); if (recent.length > 30) recent.shift();
  const name = `keepboard.scan.${timing.stage}`;
  if (typeof performance?.measure === 'function') {
    performance.clearMeasures(name);
    performance.measure(name, { start: Math.max(0, performance.now() - timing.ms), end: performance.now(), detail: timing });
  }
}
export const recentScanTimings = () => structuredClone(recent);
export function parseServerTiming(value: string | null): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of value?.split(',') ?? []) {
    const match = entry.trim().match(/^(queue|load|images|provider|normalize|mutate|recompute|save);dur=([\d.]+)$/);
    if (match && Number.isFinite(Number(match[2]))) result[match[1]] = Number(match[2]);
  }
  return result;
}
