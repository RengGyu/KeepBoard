import type { AISettings, AIStatus, GamePack, Player, Session, SessionView, Stage, Value } from '../shared/types';

import { parseServerTiming, recordScanTiming } from './scanTiming';
import {clearPrivateAccess,privateGeneration,privatePhotos,privateToken,setPrivateAccess} from './privateAccess';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const started = performance.now();
  const generation=privateGeneration(),token=privateToken();
  const response = await fetch(`/api${path}`, {
    method,
    cache: 'no-store',
    headers: {...(body === undefined ? {} : { 'Content-Type': 'application/json' }),...(token?{'X-KeepBoard-Private-Token':token}:{})},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  const stage = path.endsWith('/analyze') ? 'analysis-roundtrip' : path.endsWith('/evidence') && method === 'POST' ? 'photo-upload' : null;
  if (stage) recordScanTiming({ stage, ms: performance.now() - started, server: parseServerTiming(response.headers.get('Server-Timing')), ...(stage === 'photo-upload' ? { photos: 1, bytes: typeof (body as { dataUrl?: string })?.dataUrl === 'string' ? Math.ceil((body as { dataUrl: string }).dataUrl.length * .75) : undefined } : { photos: (body as { evidenceIds?: string[] })?.evidenceIds?.length }) });
  if (!response.ok) throw new Error(data?.error || `요청을 처리하지 못했습니다 (${response.status}).`);
  if(data?.session&&data?.pack){if(generation!==privateGeneration())throw new Error('개인 영역을 닫았어요.');await privatePhotos(data,generation);}
  return data as T;
}

export const api = {
  unlockPrivate: async(id:string,ownerId:string,pin:string)=>{const generation=privateGeneration();const result=await request<{token:string}>(`/sessions/${id}/privacy/${ownerId}/unlock`,'POST',{pin});if(generation!==privateGeneration())throw new Error('개인 영역을 닫았어요.');setPrivateAccess(id,ownerId,result.token);return api.session(id);},
  configurePrivate: async(id:string,ownerId:string,body:{enabled:boolean;pin?:string;currentPin?:string})=>{const view=await request<SessionView>(`/sessions/${id}/privacy/${ownerId}`,'PUT',body);clearPrivateAccess();return view;},
  lockPrivate: async(id?:string)=>{const token=privateToken();clearPrivateAccess();if(id&&token)await fetch(`/api/sessions/${id}/privacy/lock`,{method:'POST',headers:{'Content-Type':'application/json','X-KeepBoard-Private-Token':token},body:'{}',cache:'no-store'}).catch(()=>{});},
  sessions: (includeDeleted = false) => request<Session[]>(`/sessions${includeDeleted ? '?includeDeleted=true' : ''}`),
  removeSession: (id: string) => request<{ ids: string[] }>(`/sessions/${id}`, 'DELETE'),
  archiveSessions: (ids?: string[]) => request<{ ids: string[] }>('/sessions/archive', 'POST', { ids, hidden: true }),
  restoreSessions: (ids: string[]) => request<{ ids: string[] }>('/sessions/archive', 'POST', { ids, hidden: false }),
  packs: () => request<GamePack[]>('/packs'),
  status: () => request<AIStatus>('/settings'),
  settings: (settings: AISettings) => request<AIStatus>('/settings', 'PUT', settings),
  create: (body: { recordingMode?: 'simple'; name?: string; example?: boolean; gamePackId?: string; players?: Player[] }) => request<SessionView>('/sessions', 'POST', { ...body, recordingMode: 'simple' }),
  session: (id: string) => request<SessionView>(`/sessions/${id}`),
  update: (id: string, body: { name?: string; stage?: Stage; players?: Player[]; notes?: Record<string, string>; assertions?: unknown[]; answers?: { field: string; value: Value; ownerId?: string }[] }) => request<SessionView>(`/sessions/${id}`, 'PATCH', body),
  evidence: (id: string, body: { dataUrl: string; label?: string; scope?: 'public' | 'player'; ownerId?: string; width?: number; height?: number; sourceEvidenceId?: string; expectedCaptureEpoch?: string }) => request<SessionView & { createdEvidenceId?: string }>(`/sessions/${id}/evidence`, 'POST', body),
  removeEvidence: (id: string, evidenceId: string) => request<SessionView>(`/sessions/${id}/evidence/${evidenceId}`, 'DELETE'),
  analyze: (id: string, body: { purpose?: 'capture' | 'restore'; instruction?: string; evidenceIds?: string[]; expectedCaptureEpoch?: string }) => request<SessionView>(`/sessions/${id}/analyze`, 'POST', body),
  accept: (id: string, assertionId: string) => request<SessionView>(`/sessions/${id}/assertions/${assertionId}/accept`, 'POST', {}),
  preservation: (id: string, itemId: string, body: { container?: string; packed?: boolean; restored?: boolean }) => request<SessionView>(`/sessions/${id}/preservations/${itemId}`, 'PATCH', body),
  commit: (id: string, allowIncomplete: boolean) => request<SessionView>(`/sessions/${id}/commit`, 'POST', { allowIncomplete, recordingMode: 'simple' }),
  resume: (id: string) => request<SessionView>(`/sessions/${id}/resume`, 'POST', {}),
  nextTurn: (id: string, playerId?: string) => request<SessionView>(`/sessions/${id}/next-turn`, 'POST', { playerId }),
  importSession: (body: unknown) => request<SessionView>('/sessions/import', 'POST', body),
  importPack: (body: unknown) => request<GamePack>('/packs', 'POST', body),
  generatePack: (body: { title: string; edition: string; sourceText: string }) => request<GamePack>('/packs/generate', 'POST', body),
};

export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readPhoto(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('사진 파일을 읽지 못했습니다.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('이 사진 형식을 열 수 없습니다. JPG, PNG 또는 WebP를 선택해 주세요.'));
      image.onload = () => {
        resolve({ dataUrl: String(reader.result), width: image.naturalWidth, height: image.naturalHeight });
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
