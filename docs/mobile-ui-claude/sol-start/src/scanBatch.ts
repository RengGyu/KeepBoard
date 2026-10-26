import type { Evidence } from '../shared/types';
import { SCAN_LIMIT } from './scanQuality';

export interface ScanRunContext {
  id: string; sessionId: string; captureEpoch: string; ownerId?: string;
  purpose: 'capture' | 'restore'; instruction: string; aiEnabled: boolean;
}
export interface ScanBatch { context: ScanRunContext; evidenceIds: string[]; finished: boolean; analysisClaimed: boolean }
export const createScanBatch = (context: ScanRunContext): ScanBatch => ({ context: { ...context }, evidenceIds: [], finished: false, analysisClaimed: false });

export function addSavedScanEvidence(batch: ScanBatch, evidence: Evidence): ScanBatch {
  if (batch.finished) throw new Error('마친 스캔에는 사진을 추가할 수 없습니다.');
  if (evidence.kind !== 'photo' || evidence.ownerId !== batch.context.ownerId || evidence.scope !== (batch.context.ownerId ? 'player' : 'public') || evidence.captureEpoch !== batch.context.captureEpoch) throw new Error('이번 스캔의 소유자·촬영 단계와 맞지 않는 사진입니다. 원본은 보관되며 자동 분석에서 제외합니다.');
  if (batch.evidenceIds.includes(evidence.id)) return batch;
  if (batch.evidenceIds.length >= SCAN_LIMIT) throw new Error('이번 스캔은 최대 6장입니다.');
  return { ...batch, evidenceIds: [...batch.evidenceIds, evidence.id] };
}

/** Claim before awaiting AI: repeated finish events and failed AI requests never auto-submit twice. */
export function finishScanBatch(batch: ScanBatch): { batch: ScanBatch; evidenceIds: string[] } {
  const next = { ...batch, finished: true, analysisClaimed: true };
  if (batch.analysisClaimed || !batch.context.aiEnabled) return { batch: next, evidenceIds: [] };
  return { batch: next, evidenceIds: [...batch.evidenceIds] };
}
