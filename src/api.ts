import type {ObservationReviewAnswer} from '../shared/observationReview';
import type {PhotoReaderSelection,LocalReaderCapabilities} from '../shared/lightweightRecognition';
import type {SessionSummary} from '../shared/sessionSummary';
import type {ComponentLinkOptions,ComponentLinkRequest} from '../shared/componentLinking';
import type {AnalysisJob} from '../shared/analysisJobs';
import type {GameCatalogEntry} from '../shared/gameEssentials';
import type { AISettings, AIStatus, GamePack, Player, Session, SessionView, Stage, Value } from '../shared/types';

import { parseServerTiming, recordScanTiming } from './scanTiming';
import {clearPrivateAccess,privateGeneration,privatePhotos,privateToken,setPrivateAccess} from './privateAccess';
import {rememberRoom,roomBody} from './roomAccess';

const upload=(...args:Parameters<typeof import('@vercel/blob/client')['upload']>)=>import('@vercel/blob/client').then(m=>m.upload(...args));
const revisions=new Map<string,string>();
type StorageMode={directPrivateUpload:boolean;provider:'none'|'blob'|'supabase'};
let storageMode:Promise<StorageMode>|undefined;
const cloudStorage=()=>storageMode??=fetch('/api/storage-mode',{cache:'no-store'}).then(r=>r.ok?r.json():{directPrivateUpload:false,provider:'none'});
export interface ScanUploadTicket {clientPhotoId:string;evidenceId:string;ticket?:string;pathname?:string;signedUrl?:string}
export interface ScanUploadReady {uploadReady:true;clientPhotoId:string;evidenceId:string}
async function signedPrivateUpload(url:string,file:Blob){const response=await fetch(url,{method:'PUT',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});if(!response.ok)throw Error('비공개 파일 업로드에 실패했습니다. 다시 선택해 주세요.');}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const sessionId=path.match(/^\/(?:sessions|rooms)\/([^/]+)/)?.[1];
  if(sessionId&&body!==undefined)body=roomBody(sessionId,body,path.endsWith('/commit')||path.endsWith('/analyze'));
  const started = performance.now();
  const generation=privateGeneration(),token=privateToken();
  const response = await fetch(`/api${path}`, {
    method,
    credentials:'same-origin',
    cache: 'no-store',
    headers: {...(sessionId&&body!==undefined&&revisions.has(sessionId)?{'X-KeepBoard-Revision':revisions.get(sessionId)!}:{}),...(body === undefined ? {} : { 'Content-Type': 'application/json' }),...(token?{'X-KeepBoard-Private-Token':token}:{})},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  const stage = path.endsWith('/analyze') ? 'analysis-roundtrip' : path.endsWith('/evidence') && method === 'POST' ? 'photo-upload' : null;
  if (stage) recordScanTiming({ stage, ms: performance.now() - started, server: parseServerTiming(response.headers.get('Server-Timing')), ...(stage === 'photo-upload' ? { photos: 1, bytes: typeof (body as { dataUrl?: string })?.dataUrl === 'string' ? Math.ceil((body as { dataUrl: string }).dataUrl.length * .75) : undefined } : { photos: (body as { evidenceIds?: string[] })?.evidenceIds?.length }) });
  if (!response.ok) throw new Error(data?.error || `요청을 처리하지 못했습니다 (${response.status}).`);
  if(data?.session?.storageRevision)revisions.set(data.session.id,data.session.storageRevision);
  if(data?.session&&data?.pack){if(generation!==privateGeneration())throw new Error('개인 영역을 닫았어요.');await privatePhotos(data,generation);rememberRoom(data,method!=='GET');}
  return data as T;
}

export const api = {
  scanUploadTickets:(id:string,runId:string,expectedCaptureEpoch:string,items:Record<string,unknown>[])=>request<{items:ScanUploadTicket[]}>(`/sessions/${id}/upload-batch`,'POST',{runId,expectedCaptureEpoch,items}),
  stageScanPhoto:async(id:string,runId:string,clientPhotoId:string,body:{dataUrl:string;[key:string]:unknown},prepared?:ScanUploadTicket):Promise<ScanUploadReady>=>{
    const storage=await cloudStorage(),file=await(await fetch(body.dataUrl)).blob(),{dataUrl,...meta}=body;
    const manifest=prepared?{items:[prepared]}:await request<{items:ScanUploadTicket[]}>(`/sessions/${id}/upload-batch`,'POST',{runId,expectedCaptureEpoch:body.expectedCaptureEpoch,items:[{clientPhotoId,...meta,contentType:file.type}]});
    const item=manifest.items.find(i=>i.clientPhotoId===clientPhotoId);if(!item)throw Error('사진 전송 식별자가 없습니다.');
    if(storage.directPrivateUpload){if(storage.provider==='supabase'){if(!item.signedUrl)throw Error('사진 전송 주소가 없습니다.');await signedPrivateUpload(item.signedUrl,file);}else{if(!item.pathname)throw Error('사진 전송 위치가 없습니다.');const token=privateToken();await upload(item.pathname,file,{access:'private',handleUploadUrl:`/api/sessions/${id}/blob-token`,clientPayload:item.ticket,contentType:file.type,headers:token?{'X-KeepBoard-Private-Token':token}:{}});}}
    else await request(`/sessions/${id}/upload-batch/${runId}/files/${clientPhotoId}`,'POST',{dataUrl});
    return {uploadReady:true,clientPhotoId,evidenceId:item.evidenceId};
  },
  registerScanPhotos:(id:string,runId:string,clientPhotoIds:string[],expectedCaptureEpoch:string)=>request<SessionView&{createdEvidenceIds:string[];excludedClientPhotoIds:string[]}>(`/sessions/${id}/evidence-batch`,'POST',{runId,clientPhotoIds,expectedCaptureEpoch}),
  recognitionReaders:()=>request<LocalReaderCapabilities>('/recognition/readers'),
  roomDevice:()=>request<{ok:boolean}>('/rooms/device','POST',{}),
  createRoom:(body:{gamePackId:string;gamePackVersion?:string;name?:string;capacity:number;me:{name?:string;color:string};clientRequestId:string})=>request<SessionView>('/rooms','POST',body),
  roomPreview:(invite:string)=>request<{game:string;edition:string;name:string;capacity:number;remaining:number;joined:boolean}>('/rooms/preview','POST',{invite}),
  joinRoom:(body:{invite:string;name?:string;color:string;clientRequestId:string})=>request<SessionView>('/rooms/join','POST',body),
  roomInvite:(id:string)=>request<{token:string;code:string}>(`/rooms/${id}/invite`),
  roomMe:(id:string,body:{name:string;color:string})=>request<SessionView>(`/rooms/${id}/me`,'PATCH',body),
  unlockPrivate: async(id:string,ownerId:string,pin:string)=>{const generation=privateGeneration();const result=await request<{token:string}>(`/sessions/${id}/privacy/${ownerId}/unlock`,'POST',{pin});if(generation!==privateGeneration())throw new Error('개인 영역을 닫았어요.');setPrivateAccess(id,ownerId,result.token);return api.session(id);},
  configurePrivate: async(id:string,ownerId:string,body:{enabled:boolean;pin?:string;currentPin?:string})=>{const view=await request<SessionView>(`/sessions/${id}/privacy/${ownerId}`,'PUT',body);clearPrivateAccess();return view;},
  lockPrivate: async(id?:string)=>{const token=privateToken();clearPrivateAccess();if(id&&token)await fetch(`/api/sessions/${id}/privacy/lock`,{method:'POST',headers:{'Content-Type':'application/json','X-KeepBoard-Private-Token':token},body:'{}',cache:'no-store'}).catch(()=>{});},
  sessions: (includeDeleted = false) => request<SessionSummary[]>(`/sessions${includeDeleted ? '?includeDeleted=true' : ''}`),
  removeSession: (id: string) => request<{ ids: string[] }>(`/sessions/${id}`, 'DELETE'),
  archiveSessions: (ids?: string[]) => request<{ ids: string[] }>('/sessions/archive', 'POST', { ids, hidden: true }),
  restoreSessions: (ids: string[]) => request<{ ids: string[] }>('/sessions/archive', 'POST', { ids, hidden: false }),
  catalog:()=>request<GameCatalogEntry[]>('/game-catalog'),
  packs: () => request<GamePack[]>('/packs'),
  status: () => request<AIStatus>('/settings'),
  settings: (settings: AISettings) => request<AIStatus>('/settings', 'PUT', settings),
  create: (body: { recordingMode?: 'simple'; name?: string; example?: boolean; gamePackId?: string; gamePackVersion?:string; players?: Player[] }) => request<SessionView>('/sessions', 'POST', { ...body, recordingMode: 'simple' }),
  session: (id: string) => request<SessionView>(`/sessions/${id}`),
  update: (id: string, body: { name?: string; stage?: Stage; players?: Player[]; notes?: Record<string, string>; assertions?: unknown[]; answers?: ObservationReviewAnswer[] }) => request<SessionView>(`/sessions/${id}`, 'PATCH', body),
  evidence: async (id: string, body: { dataUrl: string; label?: string; scope?: 'public' | 'player'; ownerId?: string; width?: number; height?: number; captureTarget?: import('../shared/photoCapture').CaptureTarget; sourceEvidenceId?: string; sourceRegion?:{x:number;y:number;width:number;height:number}; expectedCaptureEpoch?: string }) => {
    const storage=await cloudStorage();if(!storage.directPrivateUpload)return request<SessionView & {createdEvidenceId?:string}>(`/sessions/${id}/evidence`,'POST',body);
    const file=await (await fetch(body.dataUrl)).blob(),{dataUrl,...meta}=body;
    if(storage.provider==='supabase'&&file.size>50_000_000)throw Error('Supabase 사진 한도 50MB를 넘었습니다.');
    const ticket=await request<{ticket:string;pathname?:string;signedUrl?:string}>(`/sessions/${id}/upload-ticket`,'POST',{...meta,contentType:file.type});
    if(storage.provider==='supabase'){if(!ticket.signedUrl)throw Error('비공개 업로드 주소가 없습니다.');await signedPrivateUpload(ticket.signedUrl,file);}
    else{if(!ticket.pathname)throw Error('비공개 업로드 위치가 없습니다.');const token=privateToken();await upload(ticket.pathname,file,{access:'private',handleUploadUrl:`/api/sessions/${id}/blob-token`,clientPayload:ticket.ticket,contentType:file.type,headers:token?{'X-KeepBoard-Private-Token':token}:{}});}
    return request<SessionView & {createdEvidenceId?:string}>(`/sessions/${id}/evidence`,'POST',{...meta,uploadTicket:ticket.ticket});
  },
  removeEvidence: (id: string, evidenceId: string) => request<SessionView>(`/sessions/${id}/evidence/${evidenceId}`, 'DELETE'),
  startAnalysisJob:(id:string,body:{requestId:string;evidenceIds:string[];expectedCaptureEpoch:string;scope:'public'|'owner';ownerId?:string;purpose?:'capture'|'restore';instruction?:string;captureTarget?:import('../shared/photoCapture').CaptureTarget;sameStaticState?:boolean;reader?:PhotoReaderSelection})=>request<{job:AnalysisJob}>(`/sessions/${id}/analysis-jobs`,'POST',body),
  componentLinkOptions:(id:string,assertionId:string,pieceIds:string[])=>request<ComponentLinkOptions>(`/sessions/${id}/component-links/${encodeURIComponent(assertionId)}?pieceIds=${pieceIds.map(encodeURIComponent).join(',')}`),
  linkComponents:(id:string,body:ComponentLinkRequest)=>request<SessionView>(`/sessions/${id}/component-links`,'POST',body),
  scanProgress:(id:string,jobId:string,ownerId?:string,seen:number[]=[])=>request<import('../shared/analysisJobs').ScanProgress>(`/sessions/${id}/analysis-jobs/${jobId}/progress?seen=${seen.join(',')}${ownerId?'&ownerId='+encodeURIComponent(ownerId):''}`),
  analysisJobs:(id:string,ownerId?:string)=>request<{jobs:AnalysisJob[]}>(`/sessions/${id}/analysis-jobs${ownerId?'?ownerId='+encodeURIComponent(ownerId):''}`),
  analyze: (id: string, body: { purpose?: 'capture' | 'restore'; instruction?: string; sameStaticState?:boolean; evidenceIds?: string[]; expectedCaptureEpoch?: string }) => request<SessionView>(`/sessions/${id}/analyze`, 'POST', body),
  accept: (id: string, assertionId: string) => request<SessionView>(`/sessions/${id}/assertions/${assertionId}/accept`, 'POST', {}),
  preservation: (id: string, itemId: string, body: { container?: string; packed?: boolean; restored?: boolean }) => request<SessionView>(`/sessions/${id}/preservations/${itemId}`, 'PATCH', body),
  commit: (id: string, allowIncomplete: boolean) => request<SessionView>(`/sessions/${id}/commit`, 'POST', { allowIncomplete, recordingMode: 'simple' }),
  resume: (id:string,scope:'public'|'owner'='public',ownerId?:string)=>request<SessionView>(`/sessions/${id}/resume`,'POST',{scope,ownerId}),
  nextTurn: (id: string, playerId?: string) => request<SessionView>(`/sessions/${id}/next-turn`, 'POST', { playerId }),
  importSession: async(body:unknown)=>{const storage=await cloudStorage();if(!storage.directPrivateUpload)return request<SessionView>('/sessions/import','POST',body);
    const file=new Blob([JSON.stringify(body)],{type:'application/json'});if(storage.provider==='supabase'&&file.size>50_000_000)throw Error('Supabase 가져오기 한도 50MB를 넘었습니다. 원본 파일은 그대로 유지됩니다.');
    const ticket=await request<{ticket:string;pathname?:string;signedUrl?:string}>('/import-upload-ticket','POST',{});
    if(storage.provider==='supabase'){if(!ticket.signedUrl)throw Error('비공개 업로드 주소가 없습니다.');await signedPrivateUpload(ticket.signedUrl,file);}
    else{if(!ticket.pathname)throw Error('비공개 업로드 위치가 없습니다.');await upload(ticket.pathname,file,{access:'private',handleUploadUrl:'/api/import-blob-token',clientPayload:ticket.ticket,contentType:file.type});}
    return request<SessionView>('/sessions/import','POST',{uploadTicket:ticket.ticket});},
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
