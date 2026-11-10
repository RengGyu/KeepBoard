import {drawingEnabled} from '../shared/releaseSupport';
import {isHostedReader} from '../shared/lightweightRecognition';
import {sessionSummary,hasPhotoRecord} from '../shared/sessionSummary';
import {LunaGameReader,TERRA_HIGH_IDENTITY} from './ai/terraGameReader';
import type {HostedObservationReader} from './ai/hostedReader';
import {ScanUploadBatches} from './scanUploadBatch';
import {analysisBatches} from './analysisTask';
import {photoDefinition} from './photoDefinitions';
import {runHostedScan,type ScanIntent} from './scanExecution';
import {prepareScanObservation,analyzeScan,scanSourceEvidence} from './scanObservation';
import {componentLinkTargets,componentRecord,componentTargetKey,latestComponentAssertion,type ComponentLinkOptions} from '../shared/componentLinking.ts';
import {linkComponents} from './componentLinking.ts';
import {CloudUploads} from './cloudUploads.ts';
import {SupabaseObjects} from './supabaseObjects.ts';
import {BlobStore} from './blobStore.ts';
import {Readable} from 'node:stream';
import {CloudJobs} from './cloudJobs.ts';
import {ConflictError,type Objects} from './objects.ts';
import {digest,readingScopeVersion,taskTarget,commitAnalysisTask,type AnalysisTask} from './analysisTask.ts';
import {validateCaptureTarget,validateCaptureObservation,validateStaticPhotos} from '../shared/photoCapture.ts';
import express, { type ErrorRequestHandler, type Request } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID,createHash } from 'node:crypto';
import {AnalysisJobs,AnalysisJobError} from './analysisJobs.ts';
import { catanPack, createExampleAssertions } from '../gamepacks/catan.ts';
import { rummikubPack } from '../gamepacks/rummikub.ts';
import {builtinPacks,legacyPack,legacyNativePacks} from '../gamepacks/catalog.ts';
import {bindRuntimePlayers,catalogSummary,effectiveProtectedOwners,hasPrivateDigitalFields,physicalOnlyField} from '../shared/gameEssentials.ts';
import {resumeSnapshot} from './runtimeResume.ts';
import type { AnalysisResult, Evidence, GamePack, Player, Session, Stage,Value,Assertion } from '../shared/types.ts';
import { analyzeEvidence, generateGamePack, getAIStatus, saveAISettings } from './ai/index.ts';
import { answerField, fieldId, nextTurn, recompute, validateValue,validateComponentRecord } from './engine.ts';
import { DEFAULT_PLAYERS } from '../shared/playerColors.ts';
import { Store } from './store.ts';
import { PrivatePins, PinError } from './privatePin.ts';
import { privateField, redactSession, redactView } from '../shared/privacy.ts';
import * as rooms from './rooms.ts';
import {fieldScope,roomScopeKey,latestSnapshot} from '../shared/rooms.ts';
import {effectiveRecognitionPack,recognitionCapability,canRecognizePhotos} from '../shared/recognition.ts';
import {genericCandidateValue,appendGenericObservation} from './ai/generic.ts';
import {LocalReader} from './ai/localReader';
import {GeminiGameReader} from './ai/geminiGameReader';
import {guardPartialObservationAccept} from './observationReview';
import {prepareLocalObservation,analyzeLocalObservation} from './localObservation';
import {prepareHostedObservation,analyzeHostedObservation} from './hostedObservation';
import {photoDefinitionsMetadata} from './photoDefinitions';

if (existsSync('.env')) process.loadEnvFile('.env');

const timingHeader = (timings: Record<string, number>) => Object.entries(timings).filter(([, ms]) => Number.isFinite(ms) && ms >= 0).map(([stage, ms]) => `${stage};dur=${ms.toFixed(1)}`).join(', ');

class HttpError extends Error { constructor(message: string, readonly status = 400) { super(message); } }

export function validatePack(input: unknown): asserts input is GamePack {
  const pack = input as GamePack;
  if (!pack || typeof pack.id !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(pack.id) || typeof pack.title !== 'string' || typeof pack.version !== 'string' || typeof pack.edition !== 'string' || typeof pack.description !== 'string') throw new HttpError('게임팩의 식별자·제목·버전·판본·설명을 확인하세요.');
  for (const key of ['fields', 'requirements', 'derivedRules', 'preservationTemplates', 'sources', 'supportGaps'] as const) if (!Array.isArray(pack[key])) throw new HttpError(`게임팩 ${key} 배열이 필요합니다.`);
  const keys = new Set<string>();
  for (const field of pack.fields) {
    if (!field || typeof field.key !== 'string' || !field.key || keys.has(field.key) || !['public', 'player'].includes(field.scope) || !['text', 'number', 'boolean', 'select', 'json'].includes(field.type) || !['observe', 'ask', 'preserve'].includes(field.acquisition) || typeof field.label !== 'string' || typeof field.description !== 'string' || typeof field.group !== 'string') throw new HttpError('게임팩 필드 정의를 확인하세요.');
    if (field.type === 'select' && (!Array.isArray(field.options) || field.options.some(option => typeof option.value !== 'string' || typeof option.label !== 'string'))) throw new HttpError('선택 필드는 선택지가 필요합니다.');
    keys.add(field.key);
  }
  if(pack.runtime){if(!['optional-pin','pin-before-content'].includes(pack.runtime.privatePolicy)||!Array.isArray(pack.runtime.fieldBindings))throw new HttpError('기록 보호 정책을 확인하세요.');for(const field of pack.fields)if(physicalOnlyField(pack,field.key))throw new HttpError('지원하지 않는 비밀을 입력 필드로 등록할 수 없습니다.');}
  for (const requirement of pack.requirements) if (!requirement || typeof requirement.id !== 'string' || !['public', 'player'].includes(requirement.scope) || !Array.isArray(requirement.fields) || requirement.fields.some(key => !keys.has(key)) || !Number.isFinite(requirement.priority)) throw new HttpError('게임팩 요구사항을 확인하세요.');
  for (const rule of pack.derivedRules) if (!rule || typeof rule.id !== 'string' || !keys.has(rule.field) || !rule.when || !['public', 'player'].includes(rule.scope)) throw new HttpError('게임팩 도출 규칙을 확인하세요.');
  for (const template of pack.preservationTemplates) if (!template || typeof template.id !== 'string' || !['public', 'player'].includes(template.scope) || !Array.isArray(template.conditions) || !Array.isArray(template.restoreAfter)) throw new HttpError('게임팩 보존 정의를 확인하세요.');
}

const defaultPlayers = DEFAULT_PLAYERS.map(player => ({ ...player }));

function validatePlayers(players: Player[]): void {
  if (!Array.isArray(players) || !players.length || players.some(player => !player || typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || typeof player.color !== 'string') || new Set(players.map(player => player.id)).size !== players.length) throw new HttpError('서로 다른 식별자의 플레이어를 입력하세요.');
}

function namedPlayers(input:unknown):Player[]{
  if(!Array.isArray(input)||input.length<1||input.length>12)throw new HttpError('플레이어 수는 1~12명으로 정해 주세요.');
  const players=input.map((p,index)=>({...p,name:rooms.playerName(p?.name,index+1)}));
  validatePlayers(players);return players;
}

function bindPlayers(pack: GamePack, players: Player[]) {
  const winner = pack.fields.find(field => field.key === 'game.winnerPlayerId');
  if (winner) winner.options = players.map(p=>({value:p.id,label:p.name}));
  const victim = pack.fields.find(field => field.key === 'robber.stolenFromPlayerId');
  if (victim) { victim.type='select'; victim.options=[{value:'none',label:'피해자 없음'},...players.map(p=>({value:p.id,label:p.name}))]; }
  const currentPlayer = pack.fields.find(field => field.key === 'currentPlayer' && field.scope === 'public');
  if (currentPlayer) {
    currentPlayer.type = 'select';
    currentPlayer.options = players.map(player => ({ value: player.id, label: player.name }));
    currentPlayer.description = '현재 차례인 플레이어를 선택하세요.';
  }
}

function activity(session: Session, type: string, message: string) {
  session.activity.push({ id: randomUUID(), at: new Date().toISOString(), type, message });
}

export async function createApp({ store = new Store(), ui = false, runtimePacks, analyzer = analyzeEvidence, cloud,localReader,geminiReader=new GeminiGameReader(),terraReader=new LunaGameReader(),terraHighReader=new LunaGameReader({identity:TERRA_HIGH_IDENTITY}),uiHmr=true }: { store?: Store; ui?: boolean; runtimePacks?:GamePack[]; analyzer?:typeof analyzeEvidence;cloud?:{objects:Objects;dispatch:(id:string)=>Promise<void>};localReader?:LocalReader;geminiReader?:GeminiGameReader;terraReader?:HostedObservationReader; terraHighReader?:HostedObservationReader;uiHmr?:boolean } = {}) {
  await store.prepareUploadReferences();
  if(cloud){const run=analyzer;analyzer=input=>run({...input,readImage:async e=>{const b=await store.readEvidence(e);return {mimeType:b.mimeType,data:b.data.toString('base64')};}});}
  const app = express();
  const uploads=cloud?new CloudUploads(cloud.objects):undefined;
  if(cloud)app.use((_req,res,next)=>{const json=res.json.bind(res);res.json=((value:unknown)=>{const bytes=Buffer.from(JSON.stringify(value));if(bytes.length<2*1024*1024)return json(value);res.setHeader('Content-Type','application/json; charset=utf-8');res.removeHeader('Content-Length');Readable.from((function*(){for(let i=0;i<bytes.length;i+=65536)yield bytes.subarray(i,i+65536);})()).pipe(res);return res;}) as typeof res.json;next();});
  const pins = new PrivatePins(store.root,cloud?.objects);
  const credential = (req: Request) => req.get('X-KeepBoard-Private-Token');
  app.use(express.json({ limit: '80mb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const json = res.json.bind(res);
    res.json = (value: any) => {
      void (async () => {
        const project = async (session: Session, list = false) => {
          const pack = await storedPack(session);
          if (!pack) throw new HttpError('게임팩을 찾을 수 없습니다.', 404);
          const protectedOwners = await pins.owners(session.id), allowed = list ? new Set<string>() : await pins.allowed(session.id, credential(req));
          return { pack, protectedOwners, allowed };
        };
        if (value?.session?.assertions && value?.pack) { const p=await project(value.session); value=value.session.room?{...rooms.roomView(value.session,p.pack,rooms.actor(req,value.session),p.allowed,p.protectedOwners),...(value.createdEvidenceId?{createdEvidenceId:value.createdEvidenceId}:{}),...(value.analysis?{analysis:value.analysis}:{})}:redactView(value,p.protectedOwners,p.allowed); }
        else if (Array.isArray(value) && value.some(s=>s?.assertions&&s?.snapshots)) { value=value.filter((s:Session)=>!s.room||rooms.record(s)?.members.some(m=>m.hash===rooms.deviceHash(req))); value=await Promise.all(value.map(async (s:Session)=>{const p=await project(s,true);if(s.room){const a=rooms.actor(req,s),copy=rooms.roomInput(s,p.pack,a,new Set(),new Set(s.players.map((p:Player)=>p.id)),true);return copy;}return redactSession(s,p.pack,p.protectedOwners,p.allowed);})); }
        json(value);
      })().catch(next);
      return res;
    };
    next();
  });
  app.use('/uploads', async (req, res, next) => {
    try {
      const filename = path.basename(req.path), sessions = await store.sessionsForUpload(filename);
      let found = false;
      for (const session of sessions) {
        const photos=[...session.evidence,...session.snapshots.flatMap(s=>s.evidence)].filter(e=>e.url===`/uploads/${filename}`);
        if(photos.length)found=true;
        for(const photo of photos){if(session.room){const a=rooms.actor(req,session);if(photo.ownerId&&photo.ownerId!==a.playerId)throw new rooms.RoomError('내 사진만 볼 수 있어요.');}await pins.require(session.id,photo.ownerId,credential(req));}
      }
      if(!found)throw new PinError('사진에 접근할 수 없어요.');
      res.setHeader('Cache-Control','no-store');if(store instanceof BlobStore){const file=await store.readEvidence({url:'/uploads/'+filename} as Evidence);res.setHeader('Content-Type',file.mimeType);Readable.from((function*(){for(let i=0;i<file.data.length;i+=65536)yield file.data.subarray(i,i+65536);})()).pipe(res);return;}next();
    } catch(error){next(error);}
  }, express.static(path.join(store.root, 'uploads'), {cacheControl:false}));
  app.use(express.static(store.publicRoot));

  async function packs() {
    const imported = await store.listPacks();
    const current=runtimePacks??builtinPacks();return [...current,...imported.filter(pack=>!current.some(item=>item.id===pack.id))];
  }

  async function rawStoredPack(session:Session) {
    return session.gamePack ?? (await packs()).find(p=>p.id===session.gamePackId&&p.version===session.gamePackVersion) ?? legacyPack(session.gamePackId,session.gamePackVersion) ?? (await store.listPacks()).find(p=>p.id===session.gamePackId&&p.version===session.gamePackVersion);
  }
  async function storedPack(session:Session){const raw=await rawStoredPack(session);return raw?effectiveRecognitionPack(raw):undefined;}

  async function sessionFor(id: string) {
    const session = await store.getSession(id);
    if (!session) throw new HttpError('세션을 찾을 수 없습니다.', 404);
    const pack = await storedPack(session);
    if (!pack) throw new HttpError('세션의 고정된 게임팩을 찾을 수 없습니다.', 404);
    if(!session.gamePack)session.gamePack=await rawStoredPack(session);
    return { session, pack };
  }

  // Admission is current server policy, not an approval copied into an old save or supplied by a client.
  async function requireDrawing(pack:GamePack){const current=(await packs()).find(p=>p.id===pack.id);if(!current||!drawingEnabled(current))throw new HttpError('이 게임은 사진 기록으로 저장됩니다. 그림 복원 판독은 아직 승인되지 않았습니다.',409);}
  const pending = new Map<string, Promise<unknown>>();
  async function authorizeMutation(req: Request, session: Session, pack: GamePack) {
    const scopes=session.room?rooms.authorizeRoom(req,session,pack):new Set<string>();
    const token=credential(req),body=req.body??{},requireOwner=async(owner?:string)=>{await pins.require(session.id,owner,token);};
    const requireField=async(field:string,owner?:string)=>{if(physicalOnlyField(pack,field))throw new HttpError('이 비밀 내용은 수집하지 않습니다. 실물로 보관하세요.');if(privateField(pack,field))await requireOwner(owner);};
    if(req.path.includes('/privacy/'))return scopes;
    if(req.path.endsWith('/component-links')){const source=session.assertions.find(a=>a.id===body.sourceAssertionId);if(!source)throw new HttpError('원본 후보를 찾을 수 없어요.',404);await requireField(source.field,source.ownerId);await requireField(body.target?.field,body.target?.ownerId);}
    if(req.method==='PATCH'&&req.path===`/api/sessions/${session.id}`){
      for(const owner of Object.keys(body.notes??{}))await requireOwner(owner);
      for(const answer of body.answers??[])await requireField(answer.field,answer.ownerId);
      for(const update of body.assertions??[]){const previous=session.assertions.find(a=>a.id===update.id);if(previous)await requireField(previous.field,previous.ownerId);await requireField(update.field??previous?.field,update.ownerId??previous?.ownerId);}
      if(Array.isArray(body.players))for(const owner of await pins.owners(session.id))if(!body.players.some((p:Player)=>p.id===owner)){await requireOwner(owner);throw new HttpError('개인 정보 보호를 해제한 뒤 플레이어를 지워 주세요.',409);}
    }
    if(req.method==='POST'&&req.path.endsWith('/evidence')){
      if(body.scope==='player'){if(pack.runtime&&!hasPrivateDigitalFields(pack))throw new PinError('이 게임의 비밀 자료는 사진으로 수집하지 않습니다. 실물 보관을 이용하세요.');await requireOwner(body.ownerId);}
      const source=session.evidence.find(e=>e.id===body.sourceEvidenceId);if(source)await requireOwner(source.ownerId);
    }
    if(req.method==='DELETE'&&req.params.evidenceId)await requireOwner(session.evidence.find(e=>e.id===req.params.evidenceId)?.ownerId);
    if(req.path.endsWith('/analyze')){await requireDrawing(pack);for(const e of session.evidence.filter(e=>!body.evidenceIds||body.evidenceIds.includes(e.id))){if(!canRecognizePhotos(pack,e.ownerId))throw new HttpError('이 영역은 사진 관측이 허용되지 않습니다. 원본과 실물을 보관해 주세요.');await requireOwner(e.ownerId);}}
    if(req.params.assertionId){const a=session.assertions.find(a=>a.id===req.params.assertionId);if(a)await requireField(a.field,a.ownerId);}
    if(req.params.preservationId)await requireOwner(session.preservations.find(p=>p.id===req.params.preservationId)?.ownerId);
    if(req.path.endsWith('/resume')){if(body.scope==='owner')await requireOwner(body.ownerId);else if(body.scope!==undefined&&body.scope!=='public')throw new HttpError('복원 범위를 확인하세요.');else if(body.scope===undefined&&!pack.runtime)for(const owner of await pins.owners(session.id))await requireOwner(owner);}
    return scopes;
  }
  async function change(req: Request, id: string, mutate: (session: Session, pack: GamePack) => void | Promise<void>, timings?: Record<string, number>) {
    const queuedAt = performance.now();
    const prior = pending.get(id) ?? Promise.resolve();
    const job = prior.catch(() => undefined).then(async () => {
      let at = performance.now();
      if (timings) timings.queue = at - queuedAt;
      const { session, pack } = await sessionFor(id);
      if(cloud&&req.get('X-KeepBoard-Revision')&&req.get('X-KeepBoard-Revision')!==(session as any).storageRevision)throw new HttpError('다른 창에서 기록이 바뀌었어요. 초안을 유지하고 최신 기록을 확인해 주세요.',409);
      if (timings) timings.load = performance.now() - at;
      at = performance.now(); const scopes=await authorizeMutation(req, session, pack); await mutate(session, pack); if(session.room)rooms.bump(session,scopes);
      if (timings) timings.mutate = performance.now() - at;
      at = performance.now(); const view = recompute(session, pack);
      if (timings) timings.recompute = performance.now() - at;
      at = performance.now(); await store.saveSession(session);
      if (timings) timings.save = performance.now() - at;
      return view;
    });
    pending.set(id, job);
    try { return await job; } finally { if (pending.get(id) === job) pending.delete(id); }
  }

  async function queued<T>(key:string,run:()=>Promise<T>):Promise<T>{const prior=pending.get(key)??Promise.resolve();const job=prior.catch(()=>undefined).then(run);pending.set(key,job);try{return await job;}finally{if(pending.get(key)===job)pending.delete(key);}}
  app.get('/api/storage-mode',(_req,res)=>res.json({directPrivateUpload:!!cloud,provider:cloud?.objects instanceof SupabaseObjects?'supabase':cloud?'blob':'none',mock:process.env.KEEPBOARD_MOCK_ANALYSIS==='1'&&process.env.VERCEL_ENV!=='production'}));
  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.get('/api/game-catalog',async(_req,res)=>{res.json((await packs()).map(catalogSummary));});
  app.get('/api/packs', async (_req, res) => { res.json(await packs()); });
  app.post('/api/packs', async (req, res) => {
    validatePack(req.body);
    if(req.body.releaseTier==='drawing')throw new HttpError('그림 복원 등급은 출시 정책에서 승인해야 합니다.',409);
    await store.savePack(req.body);
    res.status(201).json(req.body);
  });
  app.post('/api/packs/generate', async (req, res) => {
    if (typeof req.body?.title !== 'string' || !req.body.title.trim() || typeof req.body.sourceText !== 'string' || !req.body.sourceText.trim()) throw new HttpError('게임 제목과 규칙 원문을 입력하세요.');
    const pack = await generateGamePack({ title: req.body.title, edition: req.body.edition, sourceText: req.body.sourceText });
    validatePack(pack);
    if(pack.releaseTier==='drawing')throw new HttpError('생성한 팩은 사진 기록부터 시작합니다. 그림 복원 승인은 별도 출시 정책입니다.',409);
    await store.savePack(pack);
    res.status(201).json(pack);
  });
  app.get('/api/settings', async (_req, res) => { res.json(await getAIStatus()); });
  app.get('/api/recognition/readers',async(_req,res)=>{
    const reader=cloud?{kind:'local-observation-v1',available:false,cloudSupported:false,identity:null,reason:'이 클라우드에는 로컬 모델이 없습니다. 유료 모델로 자동 전환하지 않습니다.'}:localReader?await localReader.status():{kind:'local-observation-v1',available:false,cloudSupported:false,identity:null,reason:'로컬 리더가 설정되지 않았습니다.'};
    res.json({version:'local-reader-capabilities-v1',readers:[reader,await geminiReader.status(),await terraReader.status(),await terraHighReader.status()],definitions:photoDefinitionsMetadata()});
  });
  app.put('/api/settings', async (req, res) => {
    if (!['gemini', 'openai'].includes(req.body?.provider) || typeof req.body.model !== 'string' || !req.body.model.trim()) throw new HttpError('제공자와 모델을 확인하세요.');
    res.json(await saveAISettings(req.body));
  });
  app.get('/api/sessions', async (req, res) => {
    const sessions=await store.listSessions(req.query.includeDeleted==='true');
    res.json(sessions.filter(s=>!s.room||rooms.record(s)?.members.some(m=>m.hash===rooms.deviceHash(req))).map(sessionSummary));
  });
  app.post('/api/sessions/archive', async (req, res) => {
    if (typeof req.body?.hidden !== 'boolean' || (req.body.ids !== undefined && (!Array.isArray(req.body.ids) || req.body.ids.some((id: unknown) => typeof id !== 'string')))) throw new HttpError('보드 식별자와 삭제/복원 상태를 확인하세요.');
    if (!req.body.hidden && !req.body.ids) throw new HttpError('복원할 보드를 선택하세요.');
    const selected=req.body.ids??(await store.listSessions()).filter(s=>!s.room).map(s=>s.id);for(const id of selected){const s=await store.getSession(id);if(s?.room&&rooms.actor(req,s).role!=='host')throw new rooms.RoomError('방장만 방 목록을 관리할 수 있어요.');}res.json({ ids: await store.setSessionsHidden(selected, req.body.hidden) });
  });
  app.delete('/api/sessions/:id', async (req, res) => {const s=await store.getSession(req.params.id);if(s?.room&&rooms.actor(req,s).role!=='host')throw new rooms.RoomError('방장만 방 목록을 관리할 수 있어요.'); res.json({ ids: await store.setSessionsHidden([req.params.id], true) }); });
  app.post('/api/sessions/import', async (req, res) => {
    if(uploads&&req.body?.uploadTicket)req.body=await uploads.imported(req.body.uploadTicket);
    if(req.body?.session?.room||req.body?.session?.snapshots?.some((s:any)=>s.savedScope))throw new rooms.RoomError('방 기록은 가져오기로 복제할 수 없어요.');
    validatePack(req.body?.session?.gamePack);
    validatePlayers(req.body.session.players);
    const incoming=req.body.session as Session,importPack=effectiveRecognitionPack(incoming.gamePack!);
    if(importPack.runtime){
      for(const state of [incoming,...(incoming.snapshots??[])]){
        if(state.assertions.some(a=>physicalOnlyField(importPack,a.field)||!importPack.fields.some(f=>f.key===a.field)))throw new HttpError('지원하지 않는 비밀 내용은 가져올 수 없습니다. 원본 파일은 그대로 두세요.');
        for(const a of state.assertions)if(importPack.runtime.fieldBindings.some(b=>b.key===a.field&&b.editor==='component-catalog')&&a.value!==null)validateComponentRecord({players:incoming.players,evidence:state.evidence},importPack,a.field,a.value,a.ownerId,a.evidenceIds,{importing:true});
        if(!hasPrivateDigitalFields(importPack)&&state.evidence.some(e=>e.ownerId||e.scope==='player'))throw new HttpError('지원하지 않는 비밀 사진은 가져올 수 없습니다. 실물 보관을 이용하세요.');
      }
      incoming.analysisSummary=undefined;incoming.analysisSummaryOwnerId=undefined;
    }
    const session = await store.importSession(req.body);
    const view = recompute(session, effectiveRecognitionPack(session.gamePack!));
    activity(session, 'import', '원본 이미지와 게임팩을 포함한 저장본을 가져왔습니다.');
    await store.saveSession(session);
    res.status(201).json(view);
  });
  async function createSession(body:any,stableId?:string) {
    const requestedId=body.gamePackId??catanPack.id;
    const sourcePack=body.gamePackVersion?(await packs()).find(pack=>pack.id===requestedId&&pack.version===body.gamePackVersion)??legacyNativePacks.find(pack=>pack.id===requestedId&&pack.version===body.gamePackVersion):(await packs()).find(pack=>pack.id===requestedId);
    if (!sourcePack) throw new HttpError('게임팩을 찾을 수 없습니다.', 404);
    const players = namedPlayers(body.players ?? defaultPlayers.map(p=>({...p,name:''})));
    const pack = structuredClone(sourcePack);
    bindPlayers(pack, players);bindRuntimePlayers(pack,players);
    const at = new Date().toISOString();
    const session: Session = { id: stableId??randomUUID(), name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `${pack.title} 이어하기`, createdAt: at, updatedAt: at, gamePackId: pack.id, gamePackVersion: pack.version, gamePack: structuredClone(pack), captureEpoch: randomUUID(), turnInstanceId: randomUUID(), stage: 'capture', players, evidence: [], assertions: [], preservations: [], snapshots: [], notes: {}, activity: [], example: body.example === true };
    if(body._room)session.room=body._room;
    if (body.recordingMode === 'simple' && pack.id === 'catan-base') session.recordingMode = 'simple';
    if (session.example) {
      if (pack.id !== catanPack.id) throw new HttpError('이 게임팩에는 예시 데이터가 없습니다.');
      const evidence: Evidence = { id: randomUUID(), url: '/demo-board.svg', capturedAt: at, captureEpoch: session.captureEpoch, label: '카탄 모식도 · 명시된 예시', scope: 'public', kind: 'example' };
      session.evidence.push(evidence);
      session.assertions = createExampleAssertions(players, session.turnInstanceId, evidence.id);
      session.analysisSummary = '명시된 카탄 예시입니다. 사진을 판독한 결과가 아닙니다. 예시에서 정하지 않은 사실은 직접 입력하세요.';
    }
    if (pack.fields.some(f => f.key === 'rulesProfile')) { answerField(session,pack,'rulesProfile',session.example?'base-2020':'base-6e-2025'); answerField(session,pack,'tradeBuildMode','combined'); answerField(session,pack,'game.status','playing'); }
    activity(session, 'create', session.example ? '명시된 카탄 예시를 시작했습니다.' : '새 게임 기록을 시작했습니다.');
    const view = recompute(session, pack);
    await store.saveSession(session);
    return view;
  }
  app.post('/api/sessions',async(req,res)=>{if(req.body?.room||req.body?._room)throw new rooms.RoomError('방 생성 경로를 이용하세요.');res.status(201).json(await createSession(req.body??{}));});
  const inviteAttempts=new Map<string,{count:number;until:number}>();
  async function invited(req:Request){const key=req.ip??'local',old=inviteAttempts.get(key);if(old&&old.until>Date.now()&&old.count>=20)throw new rooms.RoomError('잠시 후 다시 참가해 주세요.',429);const input=req.body?.invite;if(typeof input!=='string'||input.length>100)throw new rooms.RoomError('초대 링크나 코드를 확인해 주세요.',400);const code=input.replace(/-/g,'').toUpperCase();const s=(await store.listSessions()).find(s=>{const r=rooms.record(s);return r&&(r.invite.token===input||r.invite.code===code);});if(!s){inviteAttempts.set(key,{count:old&&old.until>Date.now()?old.count+1:1,until:Date.now()+60000});throw new rooms.RoomError('초대 링크나 코드를 확인해 주세요.',404);}return s;}
  const roomOrigin=(req:Request)=>{const origin=req.get('origin');const hosts=[req.get('host'),req.get('x-forwarded-host')?.split(',')[0].trim()];if(!origin||!hosts.includes(new URL(origin).host))throw new rooms.RoomError('같은 앱에서 요청해 주세요.');};
  app.post('/api/rooms/device',(req,res)=>{roomOrigin(req);rooms.ensureDevice(req,res);res.json({ok:true});});
  app.post('/api/rooms',async(req,res)=>{roomOrigin(req);const view=await queued('rooms:create',async()=>{const hash=rooms.deviceHash(req);if(!hash)throw new rooms.RoomError('참가 정보를 먼저 준비해 주세요.');const previous=(await store.listSessions(true)).find(s=>rooms.record(s)?.members.some(m=>m.hash===hash&&m.role==='host')&&rooms.record(s)?.createRequestId===req.body?.clientRequestId);if(previous)return recompute(previous,(await storedPack(previous))!);const me={id:randomUUID(),...rooms.profile(req.body?.me)},room=rooms.newRoom(req,req.body?.capacity,me.id,req.body?.clientRequestId);while((await store.listSessions(true)).some(s=>rooms.record(s)?.invite.code===room.invite.code))room.invite=rooms.newRoom(req,room.capacity,me.id,req.body.clientRequestId).invite;const stableId=cloud?'room-'+digest([hash,room.createRequestId]):undefined;
      try{return await createSession({...req.body,players:[me],example:false,recordingMode:'simple',_room:room},stableId);}
      catch(error){if(!(error instanceof ConflictError)||!stableId)throw error;const winner=await store.getSession(stableId);if(!winner||rooms.record(winner)?.createRequestId!==room.createRequestId||!rooms.record(winner)?.members.some(m=>m.hash===hash&&m.role==='host'))throw error;return recompute(winner,(await storedPack(winner))!);}});res.status(201).json(view);});
  app.post('/api/rooms/preview',async(req,res)=>{roomOrigin(req);const s=await invited(req),pack=await storedPack(s);res.json({game:pack!.title,edition:pack!.edition,name:s.name,capacity:s.room!.capacity,remaining:s.room!.capacity-s.players.length,joined:rooms.record(s)!.members.some(m=>m.hash===rooms.deviceHash(req))});});
  app.post('/api/rooms/join',async(req,res)=>{roomOrigin(req);const found=await invited(req);const view=await queued(found.id,async()=>{const {session,pack}=await sessionFor(found.id);rooms.join(req,session,req.body);bindPlayers(pack,session.players);bindRuntimePlayers(pack,session.players);const v=recompute(session,pack);await store.saveSession(session);return v;});res.json(view);});
  app.get('/api/rooms/:id/invite',async(req,res)=>{const {session}=await sessionFor(req.params.id);if(rooms.actor(req,session).role!=='host')throw new rooms.RoomError('방장만 초대 정보를 볼 수 있어요.');res.json(rooms.record(session)!.invite);});
  app.patch('/api/rooms/:id/me',async(req,res)=>{roomOrigin(req);res.json(await change(req,req.params.id,(s,pack)=>{const a=rooms.actor(req,s),index=s.players.findIndex(p=>p.id===a.playerId),p=s.players[index];Object.assign(p,rooms.profile(req.body,index+1));bindPlayers(pack,s.players);bindRuntimePlayers(pack,s.players);}));});
  app.use('/api/sessions/:id',async(req,_res,next)=>{try{const s=await store.getSession(req.params.id);if(s?.room){rooms.actor(req,s);if(!['GET','HEAD'].includes(req.method))roomOrigin(req);}next();}catch(e){next(e);}});
  app.get('/api/sessions/:id', async (req, res) => { const { session, pack } = await sessionFor(req.params.id); res.json(recompute(session, pack)); });
  app.post('/api/sessions/:id/privacy/lock', async(req,res) => {const token=credential(req),session=await store.getSession(req.params.id);if(session?.room&&token&&!(await pins.allowed(session.id,token)).has(rooms.actor(req,session).playerId))throw new rooms.RoomError('내 개인 영역만 잠글 수 있어요.');await pins.lock(token);res.json({ok:true}); });
  app.post('/api/sessions/:id/privacy/:ownerId/unlock', async(req,res)=>{
    const {session}=await sessionFor(req.params.id);
    if(session.room&&rooms.actor(req,session).playerId!==req.params.ownerId)throw new rooms.RoomError('내 비밀번호만 열 수 있어요.');
    if(!session.players.some(p=>p.id===req.params.ownerId))throw new HttpError('플레이어를 찾을 수 없어요.',404);
    res.json({token:await pins.unlock(session.id,req.params.ownerId,req.body?.pin,req.ip??'local')});
  });
  app.put('/api/sessions/:id/privacy/:ownerId', async(req,res)=>{
    res.json(await change(req,req.params.id,async(session,pack)=>{
      if(!session.players.some(p=>p.id===req.params.ownerId))throw new HttpError('플레이어를 찾을 수 없어요.',404);
      await pins.configure(session.id,req.params.ownerId,req.body??{},req.ip??'local');
    }));
  });
  app.patch('/api/sessions/:id', async (req, res) => {
    res.json(await change(req, req.params.id, (session, pack) => {
      const body = req.body ?? {};
      if (body.name !== undefined) { if (typeof body.name !== 'string') throw new HttpError('이름을 확인하세요.'); session.name = body.name; }
      if (body.stage !== undefined) { if (!(['capture', 'questions', 'pack', 'saved', 'restore'] satisfies Stage[]).includes(body.stage)) throw new HttpError('단계를 확인하세요.'); session.stage = body.stage; }
      if (body.players !== undefined) {
        session.players = namedPlayers(body.players).map(({id,name,color})=>({id,name,color}));
        bindPlayers(pack, session.players);bindRuntimePlayers(pack,session.players);
        session.assertions = session.assertions.filter(assertion => !assertion.ownerId || session.players.some(player => player.id === assertion.ownerId));
      }
      if (body.notes !== undefined) {
        if (!body.notes || typeof body.notes !== 'object' || Array.isArray(body.notes) || Object.values(body.notes).some(value => typeof value !== 'string')) throw new HttpError('메모 형식을 확인하세요.');
        session.notes = { ...session.notes, ...body.notes };
      }
      if (body.answers !== undefined && !Array.isArray(body.answers)) throw new HttpError('답변 배열이 필요합니다.');
      for (const answer of body.answers ?? []) answerField(session, pack, answer.field, answer.value, answer.ownerId,answer.observationReview);
      if (body.assertions !== undefined && !Array.isArray(body.assertions)) throw new HttpError('사실 배열이 필요합니다.');
      for (const update of body.assertions ?? []) {
        const existing = session.assertions.find(assertion => assertion.id === update.id);
        const fieldKey = update.field ?? existing?.field;
        const ownerId = update.ownerId ?? existing?.ownerId;
        const value = update.value === undefined ? existing?.value : update.value;
        if (!fieldKey || value === undefined) throw new HttpError('사실의 필드와 값을 입력하세요.');
        answerField(session, pack, fieldKey, value, ownerId,update.observationReview);
      }
      activity(session, 'edit', '입력한 상태에서 요구사항과 도출 사실을 다시 계산했습니다.');
    }));
  });
  const batches=new ScanUploadBatches(store.root,cloud?.objects);
  const evidenceAuth=(req:Request,body:any):Request=>{const copy=Object.create(req);Object.defineProperty(copy,'path',{value:`/api/sessions/${req.params.id}/evidence`});copy.body={...body,expectedRevisions:req.body?.expectedRevisions};return copy;};
  if(uploads){
    app.post('/api/import-upload-ticket',async(req,res)=>res.json(await uploads.mint('import',{contentType:'application/json'})));
    if(!(cloud?.objects instanceof SupabaseObjects))app.post('/api/import-blob-token',async(req,res)=>res.json(await uploads.token(req,async t=>{if(t.purpose!=='import')throw new HttpError('가져오기 요청을 확인하세요.');})));
    app.post('/api/sessions/:id/upload-ticket',async(req,res)=>{const {session,pack}=await sessionFor(req.params.id);await authorizeMutation(evidenceAuth(req,req.body),session,pack);
      const body=req.body??{},scope=body.scope??'public';if(!['public','player'].includes(scope)||scope==='player'&&!session.players.some(p=>p.id===body.ownerId))throw new HttpError('사진 범위를 확인하세요.');
      if(body.expectedCaptureEpoch!==undefined&&body.expectedCaptureEpoch!==session.captureEpoch)throw new HttpError('촬영 단계가 바뀌었어요.',409);
      const source=body.sourceEvidenceId?session.evidence.find(e=>e.id===body.sourceEvidenceId):undefined;if(body.sourceEvidenceId&&!source)throw new HttpError('확대할 원본을 찾을 수 없습니다.');validateCaptureTarget(body.captureTarget,pack,scope==='player'?body.ownerId:undefined);
      res.json(await uploads.mint('evidence',body,session.id,session.captureEpoch));
    });
    if(!(cloud?.objects instanceof SupabaseObjects))app.post('/api/sessions/:id/blob-token',async(req,res)=>res.json(await uploads.token(req,async t=>{
      const {session,pack}=await sessionFor(req.params.id);if(t.sessionId!==session.id||t.epoch!==session.captureEpoch)throw new HttpError('현재 사진 요청을 확인하세요.');
      let meta=t.meta;if(t.meta.scanBatchRunId){const manifest=(await batches.load(session.id,t.meta.scanBatchRunId))?.value,item=manifest?.items.find(i=>i.clientPhotoId===t.meta.scanBatchPhotoId),ticket=item?.ticket?await uploads.ticket(item.ticket):undefined;if(!manifest||manifest.epoch!==session.captureEpoch||!ticket||ticket.key!==t.key)throw new HttpError('스캔 전송 요청을 확인하세요.');if(item?.parentClientId){const {sourceEvidenceId:_s,...scopeMeta}=meta;meta=scopeMeta;}}
      await authorizeMutation(evidenceAuth(req,meta),session,pack);
    })));
  }
  app.post('/api/sessions/:id/upload-batch',async(req,res)=>{
    const manifest=await queued(req.params.id,async()=>{
      const {session,pack}=await sessionFor(req.params.id),body=req.body??{};if(body.expectedCaptureEpoch!==session.captureEpoch)throw new HttpError('촬영 단계가 바뀌었어요.',409);
      if(!Array.isArray(body.items)||!body.items.length||body.items.length>6)throw new HttpError('전송할 사진 최대 6장을 확인하세요.');
      body.items=body.items.map((i:any)=>({...i,scope:i.scope??'public'}));
      const old=(await batches.load(session.id,body.runId))?.value;
      for(const item of body.items){
        if(!['public','player'].includes(item.scope??'public')||item.scope==='player'&&!session.players.some(p=>p.id===item.ownerId)||item.scope!=='player'&&item.ownerId)throw new HttpError('사진 범위를 확인하세요.');
        const scope=item.scope??'public';await authorizeMutation(evidenceAuth(req,{...item,scope}),session,pack);
        if(!['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml','image/avif','image/heic','image/heif'].includes(item.contentType))throw new HttpError('사진 파일 형식을 확인하세요.');
        validateCaptureTarget(item.captureTarget,pack,item.ownerId);
        const source=item.sourceEvidenceId?session.evidence.find(e=>e.id===item.sourceEvidenceId):undefined,parent=item.parentClientId?(body.items.find((i:any)=>i.clientPhotoId===item.parentClientId)??old?.items.find(i=>i.clientPhotoId===item.parentClientId)?.meta):undefined;
        if(item.sourceEvidenceId&&!source||item.parentClientId&&!parent)throw new HttpError('확대 원본을 확인하세요.');
        const sourceMeta=source??parent;
        if(sourceMeta&&(sourceMeta.scope!==scope||sourceMeta.ownerId!==item.ownerId||sourceMeta.sourceRegion||source&&source.captureEpoch!==session.captureEpoch))throw new HttpError('확대 원본의 영역이 다릅니다.');
        if(sourceMeta?.captureTarget){if(item.captureTarget&&JSON.stringify(item.captureTarget)!==JSON.stringify(sourceMeta.captureTarget))throw new HttpError('확대 원본의 촬영 영역이 다릅니다.');item.captureTarget=sourceMeta.captureTarget;}
        const r=item.sourceRegion;if(r!==undefined&&(!sourceMeta||!r||Object.keys(r).sort().join(',')!=='height,width,x,y'||!Object.values(r).every(v=>typeof v==='number'&&Number.isFinite(v))||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1.00000001||r.y+r.height>1.00000001))throw new HttpError('확대 좌표를 확인하세요.');
      }
      const all=[...(old?.items.map(i=>i.meta)??[]),...body.items];if(new Set(all.map((i:any)=>JSON.stringify([i.scope??'public',i.ownerId??null,i.captureTarget??null]))).size>1)throw new HttpError('같은 촬영 영역의 사진만 묶을 수 있습니다.');
      return batches.mint(session.id,session.captureEpoch,body.runId,body.items);
    });res.json(manifest);
  });
  app.post('/api/sessions/:id/upload-batch/:runId/files/:photoId',async(req,res)=>{
    if(uploads)throw new HttpError('발급된 비공개 PUT를 사용하세요.');
    const {session,pack}=await sessionFor(req.params.id),manifest=(await batches.load(session.id,req.params.runId))?.value,item=manifest?.items.find(i=>i.clientPhotoId===req.params.photoId);
    if(!manifest||!item||manifest.epoch!==session.captureEpoch)throw new HttpError('현재 사진 전송을 확인하세요.',409);await authorizeMutation(evidenceAuth(req,item.parentClientId?{...item.meta,sourceEvidenceId:undefined}:item.meta),session,pack);
    const prior=await batches.localURL(session.id,manifest.runId,item.clientPhotoId);if(prior){res.json({ok:true});return;}
    const url=await store.saveEvidence(req.body.dataUrl);await batches.localURL(session.id,manifest.runId,item.clientPhotoId,url);res.json({ok:true});
  });
  app.post('/api/sessions/:id/evidence-batch',async(req,res)=>{
    const {session,pack}=await sessionFor(req.params.id),manifest=(await batches.load(session.id,req.body?.runId))?.value;
    if(!manifest||manifest.epoch!==session.captureEpoch||req.body.expectedCaptureEpoch!==session.captureEpoch)throw new HttpError('촬영 단계가 바뀌었어요.',409);
    const successful=req.body.clientPhotoIds;if(!Array.isArray(successful)||new Set(successful).size!==successful.length||successful.some(id=>!manifest.items.some(i=>i.clientPhotoId===id)))throw new HttpError('전송한 사진을 확인하세요.');
    const selected=batches.closed(manifest,successful);
    const already=selected.every(i=>session.evidence.some(e=>e.id===i.evidenceId));
    for(const i of selected){if(already){await pins.require(session.id,i.meta.ownerId,credential(req));if(session.room)rooms.writeScope(rooms.actor(req,session),session,i.meta.ownerId??'public');}else await authorizeMutation(evidenceAuth(req,i.parentClientId?{...i.meta,sourceEvidenceId:undefined}:i.meta),session,pack);}
    const urls=await Promise.all(selected.map(async i=>uploads?uploads.evidence(i.ticket,session.id,session.captureEpoch,i.meta):batches.localURL(session.id,manifest.runId,i.clientPhotoId)));
    if(urls.some(u=>!u))throw new HttpError('전송을 마친 사진만 등록할 수 있습니다.');
    const ids=selected.map(i=>i.evidenceId),excluded=successful.filter(id=>!selected.some(i=>i.clientPhotoId===id));
    if(ids.every(id=>session.evidence.some(e=>e.id===id))){res.json({...recompute(session,pack),createdEvidenceIds:ids,excludedClientPhotoIds:excluded});return;}
    const auth=evidenceAuth(req,selected[0]?.meta??{}),view=await change(auth,session.id,async(current,p)=>{
      if(current.captureEpoch!==manifest.epoch)throw new HttpError('촬영 단계가 바뀌었어요.',409);
      for(const [index,i]of selected.entries()){
        if(current.evidence.some(e=>e.id===i.evidenceId))continue;await authorizeMutation(evidenceAuth(req,i.meta),current,p);
        const m=i.meta,source=m.sourceEvidenceId?current.evidence.find(e=>e.id===m.sourceEvidenceId):undefined;
        if(m.sourceEvidenceId&&(!source||source.captureEpoch!==current.captureEpoch||source.scope!==m.scope||source.ownerId!==m.ownerId||source.sourceRegion))throw new HttpError('확대 원본이 바뀌었습니다.',409);
        current.evidence.push({id:i.evidenceId,url:urls[index]!,kind:'photo',capturedAt:source?.capturedAt??new Date().toISOString(),captureEpoch:manifest.epoch,label:m.label??'사진',scope:m.scope??'public',ownerId:m.ownerId,width:m.width,height:m.height,...(m.captureTarget?{captureTarget:m.captureTarget}:{}),...(m.sourceEvidenceId?{sourceEvidenceId:m.sourceEvidenceId}:{}),...(m.sourceRegion?{sourceRegion:m.sourceRegion}:{})});
      }
      activity(current,'capture','스캔 사진을 일괄 등록했습니다.');
    });res.json({...view,createdEvidenceIds:ids,excludedClientPhotoIds:excluded});
  });
  app.post('/api/sessions/:id/evidence', async (req, res) => {
    const timings: Record<string, number> = {};
    let createdEvidenceId: string | undefined;
    const view = await change(req, req.params.id, async (session,pack) => {
      if (req.body?.expectedCaptureEpoch !== undefined && req.body.expectedCaptureEpoch !== session.captureEpoch) throw new HttpError('촬영 중 저장·재개 단계가 바뀌었습니다. 스캔을 닫고 현재 단계에서 다시 시작해 주세요.', 409);
      if (typeof req.body?.dataUrl !== 'string' && !(uploads&&typeof req.body?.uploadTicket==='string')) throw new HttpError('이미지 원본을 입력하세요.');
      const scope = req.body.scope ?? 'public';
      if (!['public', 'player'].includes(scope) || (scope === 'player' && !session.players.some(player => player.id === req.body.ownerId))) throw new HttpError('사진의 범위와 소유자를 확인하세요.');
      const source = req.body.sourceEvidenceId ? session.evidence.find(item => item.id === req.body.sourceEvidenceId) : undefined;
      if (req.body.sourceEvidenceId && !source) throw new HttpError('확대할 원본을 찾을 수 없습니다.');
      const sourceRegion=req.body.sourceRegion;
      if(sourceRegion!==undefined&&(!source||source.sourceRegion||!sourceRegion||Object.keys(sourceRegion).sort().join(',')!=='height,width,x,y'||!Object.values(sourceRegion).every(v=>typeof v==='number'&&Number.isFinite(v))||sourceRegion.x<0||sourceRegion.y<0||sourceRegion.width<=0||sourceRegion.height<=0||sourceRegion.x+sourceRegion.width>1.00000001||sourceRegion.y+sourceRegion.height>1.00000001))throw new HttpError('확대 원본 좌표를 확인하세요.');
      const captureTarget=source?.captureTarget??validateCaptureTarget(req.body.captureTarget,pack,scope==='player'?req.body.ownerId:undefined);
      const url = uploads&&req.body.uploadTicket?await uploads.evidence(req.body.uploadTicket,session.id,session.captureEpoch,req.body):await store.saveEvidence(req.body.dataUrl);
      const existing=session.evidence.find(e=>e.url===url);if(existing){createdEvidenceId=existing.id;return;}
      createdEvidenceId = randomUUID();
      session.evidence.push({ id: createdEvidenceId, url, capturedAt: source?.capturedAt ?? new Date().toISOString(), captureEpoch: source?.captureEpoch ?? session.captureEpoch, label: typeof req.body.label === 'string' ? req.body.label : `사진 ${session.evidence.length + 1}`, scope: source?.scope ?? scope, ownerId: source?.ownerId ?? (scope === 'player' ? req.body.ownerId : undefined), sourceEvidenceId: source?.id, ...(sourceRegion?{sourceRegion}:{}), ...(captureTarget?{captureTarget}:{}), kind: source?.kind === 'example' ? 'example' : 'photo', width: req.body.width, height: req.body.height });
      activity(session, 'capture', '사진 원본을 비공개 저장소에 보관했습니다.');
    }, timings);
    res.setHeader('Server-Timing', timingHeader(timings));
    res.json({ ...view, createdEvidenceId });
  });
  app.delete('/api/sessions/:id/evidence/:evidenceId', async (req, res) => {
    res.json(await change(req, req.params.id, session => {
      if (!session.evidence.some(item => item.id === req.params.evidenceId)) throw new HttpError('근거를 찾을 수 없습니다.', 404);
      session.evidence = session.evidence.filter(item => item.id !== req.params.evidenceId);
      session.assertions = session.assertions.filter(item => item.basis !== 'observation' || !item.evidenceIds.includes(req.params.evidenceId));
      activity(session, 'evidence-delete', '현재 기록에서 사진을 제외했습니다. 저장본의 원본은 유지합니다.');
    }));
  });
  const analysisJobs=cloud?new CloudJobs(cloud.objects,cloud.dispatch):new AnalysisJobs(store.root,async j=>{const s=await store.getSession(j.sessionId),receipt=s?.assertions.filter(a=>a.analysisJobId===j.id);return receipt?.length?{state:'completed',candidateCount:receipt.length,mode:'live'}:undefined;});
  function analyzeRequest(req:Request,body:any):Request{const copy=Object.create(req);Object.defineProperty(copy,'path',{value:`/api/sessions/${req.params.id}/analyze`});copy.body=body;return copy;}

  async function jobScope(req:Request,s:Session,owner?:string){
    if(owner&&!s.players.some(p=>p.id===owner))throw new HttpError('플레이어를 찾을 수 없어요.',404);
    if(s.room){const a=rooms.actor(req,s);if(owner&&owner!==a.playerId)throw new rooms.RoomError('내 사진 읽기 작업만 볼 수 있어요.');}
    await pins.require(s.id,owner,credential(req));
  }
  app.get('/api/sessions/:id/analysis-jobs',async(req,res)=>{const {session}=await sessionFor(req.params.id),owner=req.query.ownerId;if(owner!==undefined&&typeof owner!=='string')throw new HttpError('개인 영역을 확인하세요.');await jobScope(req,session,owner);const jobs=await analysisJobs.list(session.id,owner);for(const job of jobs)if(['queued','running'].includes(job.state)&&isHostedReader(job.reader)&&Date.now()-Date.parse(job.updatedAt)>300000){const {task}=await analysisJobs.load(job.id),scan=task.prepared.scanObservation;const rows=await Promise.all(analysisBatches(task).map((_,i)=>analysisJobs.batchResult(job.id,i)));const patch={state:'interrupted' as const,error:'interrupted' as const,observationReceipts:rows.flatMap(r=>r?.result?.observationReceipts??[]),...(scan?{scanBundle:{plan:scan.plan,units:scan.units.map((u,i)=>rows[i]?.result?.scanBundle?.units[0]??{unitId:u.id,state:'interrupted' as const,observationCount:0}),links:[]}}:{})};await analysisJobs.update(job.id,patch);Object.assign(job,patch);}res.json({jobs});});
  app.get('/api/sessions/:id/analysis-jobs/:jobId/progress',async(req,res)=>{
    const {session}=await sessionFor(req.params.id),owner=req.query.ownerId;if(owner!==undefined&&typeof owner!=='string')throw new HttpError('개인 영역을 확인하세요.');await jobScope(req,session,owner);
    const job=(await analysisJobs.list(session.id,owner)).find(j=>j.id===req.params.jobId);if(!job||job.captureEpoch!==session.captureEpoch)throw new HttpError('현재 스캔 작업을 찾을 수 없습니다.',409);
    const {task}=await analysisJobs.load(job.id),count=analysisBatches(task).length,seen=new Set(typeof req.query.seen==='string'?req.query.seen.split(',').map(Number):[]);
    const units=await Promise.all(Array.from({length:count},async(_,index)=>{const saved=await analysisJobs.batchResult(job.id,index),status=saved?.result?.scanBundle?.units[0]?.state;return {index,state:status??(saved?'running':'pending'),...(!seen.has(index)&&saved?.result?{receipts:(saved.result.observationReceipts??[]).map(({hostedWire:_h,nativeWire:_n,scanBundle:_b,...r})=>r)}:{})};}));
    res.json({job,jobId:job.id,captureEpoch:job.captureEpoch,ownerId:job.ownerId,total:count,units});
  });
  app.post('/api/sessions/:id/analysis-jobs',async(req,res)=>{
    const body=req.body??{};if(typeof body.requestId!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(body.requestId)||!Array.isArray(body.evidenceIds)||body.evidenceIds.length<1||body.evidenceIds.length>6||body.evidenceIds.some((id:unknown)=>typeof id!=='string')||new Set(body.evidenceIds).size!==body.evidenceIds.length||!['capture','restore'].includes(body.purpose??'capture')||body.instruction!==undefined&&(typeof body.instruction!=='string'||body.instruction.length>2000))throw new HttpError('사진 읽기 작업과 원본을 확인하세요.');
    if(body.ownerId!==undefined&&typeof body.ownerId!=='string')throw new HttpError('개인 영역을 확인하세요.');
    const auth=analyzeRequest(req,body);
    const job=await queued(req.params.id,async()=>{
      const prepareAt=performance.now();const {session,pack}=await sessionFor(req.params.id),owner=body.ownerId as string|undefined;await requireDrawing(pack);await jobScope(req,session,owner);await authorizeMutation(auth,session,pack);
      if(body.expectedCaptureEpoch!==session.captureEpoch)throw new HttpError('촬영 단계가 바뀌었어요. 원본은 유지됩니다.',409);
      const storedEvidence=(body.evidenceIds as string[]).map(id=>session.evidence.find(e=>e.id===id)).filter((e):e is Evidence=>!!e);
      if(body.reader&&body.captureTarget&&body.captureTarget.areaId!==body.reader.areaId)throw new HttpError('선택한 촬영 부분과 판독기 영역이 다릅니다.');
      const selectedTarget=body.reader?{version:1,gameId:pack.runtime?.source.gameId,sourceSHA:pack.runtime?.source.sha256,areaId:body.reader.areaId}:body.captureTarget;
      const captureTarget=validateCaptureTarget(selectedTarget,pack,owner);
      const evidence=captureTarget?storedEvidence.map(e=>({...e,captureTarget})):storedEvidence;if(evidence.length!==body.evidenceIds.length||evidence.some(e=>e.kind!=='photo'||e.scope!==(owner?'player':'public')||e.ownerId!==owner))throw new HttpError('같은 영역의 저장된 사진만 읽을 수 있어요.');
      validateStaticPhotos(evidence,body.sameStaticState);
      const input=session.room?rooms.roomInput(session,pack,rooms.actor(req,session),await pins.allowed(session.id,credential(req)),await pins.owners(session.id),!owner):redactSession(session,pack,new Set(session.players.filter(p=>p.id!==owner).map(p=>p.id)),new Set());
      const taskId=digest([session.id,owner??null,body.requestId,session.captureEpoch]),readImage=(e:Evidence)=>store.readEvidence(e);
      const hostedScan=isHostedReader(body.reader),selectedReader=body.reader?.kind==='terra-high-game-observation-v1'?terraHighReader:(body.reader?.kind==='luna-game-observation-v1'||body.reader?.kind==='terra-game-observation-v1')?terraReader:geminiReader;
      if(hostedScan){if(Object.keys(body.reader).some(k=>!['kind','definitionSHA','areaId','frame','target'].includes(k)))throw new HttpError('판독 선택을 확인하세요.');const d=photoDefinition(pack,body.reader.definitionSHA),area=d.areas.find(a=>a.id===body.reader.areaId);if(!area||(owner?area.partition!=='owner_private':area.partition==='owner_private')||evidence.some(e=>e.captureEpoch!==session.captureEpoch))throw new HttpError('현재 사진 영역을 확인하세요.',409);if(!(await selectedReader.status()).available)throw new HttpError('사진 판독기를 사용할 수 없습니다.',503);}
      const scanIntent:ScanIntent|undefined=hostedScan?{version:'scan-intent-v1',taskId,selection:structuredClone(body.reader),evidenceIds:[...body.evidenceIds],reader:structuredClone(selectedReader.identity)}:undefined;
      const scanObservation=body.reader&&!hostedScan?await prepareScanObservation({session:input,pack,evidence,selection:body.reader,taskId,reader:selectedReader,localReader,cloud:!!cloud,readImage}):undefined;
      const localObservation=!scanObservation&&body.reader?.kind==='local-observation-v1'?await prepareLocalObservation({pack,evidence,captureEpoch:session.captureEpoch,selection:body.reader,taskId,reader:localReader,cloud:!!cloud,readImage}):undefined;
      const hostedObservation=!scanIntent&&!scanObservation&&isHostedReader(body.reader)?await prepareHostedObservation({pack,playerCount:session.players.length,evidence,captureEpoch:session.captureEpoch,selection:body.reader,taskId,reader:selectedReader,readImage}):undefined;
      if(body.reader&&!scanIntent&&!scanObservation&&!localObservation&&!hostedObservation)throw new HttpError('사진 판독기 종류를 확인하세요.');
      const observationPlan=localObservation??hostedObservation??scanObservation?.units[0].hosted??scanObservation?.units[0].local;
      const taskEvidence=scanObservation||scanIntent?scanSourceEvidence(evidence,session):evidence,sourceEvidence=storedEvidence.concat(taskEvidence.filter(e=>!storedEvidence.some(s=>s.id===e.id)));
      const epoch=session.captureEpoch,version=readingScopeVersion(session,pack,owner),source=digest(session.evidence.filter(e=>sourceEvidence.some(x=>x.id===e.id))),pin=await pins.configurationStamp(session.id,owner),signature=digest([owner??null,epoch,body.evidenceIds,body.purpose??'capture',body.instruction??'',body.sameStaticState===true,captureTarget??null,[pack.id,pack.version,pack.runtime?.source.sha256],scanIntent??scanObservation??observationPlan??null]);
      const prepared={session:structuredClone(input),pack:structuredClone(pack),evidence:structuredClone(taskEvidence),purpose:body.purpose??'capture',instruction:body.instruction,sameStaticState:body.sameStaticState===true,...(localObservation?{localObservation}:{}),...(hostedObservation?{hostedObservation}:{}),...(scanObservation?{scanObservation}:{}),...(scanIntent?{scanIntent}:{})};
      const task:AnalysisTask={versionPolicy:'photo-input-v2',prepared,epoch,version,source,pin,owner,actorHash:rooms.deviceHash(req),roomRevisions:body.expectedRevisions};
      return analysisJobs.start({sessionId:session.id,...(owner?{ownerId:owner}:{}),evidenceIds:[...body.evidenceIds],captureEpoch:epoch,requestId:body.requestId,signature,revision:version,timings:{prepareMs:performance.now()-prepareAt},...(scanIntent?{reader:scanIntent.reader,definitionSHA:scanIntent.selection.definitionSHA}:{}),...(observationPlan?{reader:observationPlan.reader,definitionSHA:observationPlan.request.definitionSHA,inputSHA:observationPlan.request.images[0].sha256,...(observationPlan.taskProfile?{taskProfile:observationPlan.taskProfile}:{})}:{})},async job=>{
        if(scanIntent){
         const run=await runHostedScan({id:job.id,task,jobs:analysisJobs,store,pins,reader:selectedReader});if(!run.results)return {};
         try{return {...await queued(session.id,()=>commitAnalysisTask(store,pins,run.task,job,run.results)),timings:{...run.metrics,totalMs:Date.now()-Date.parse(job.createdAt)}};}
         catch(error){if((error as {status?:number}).status!==409)throw error;return {state:'stale',error:'stale',observationReceipts:run.results.flatMap(r=>r.observationReceipts??[]),scanBundle:{plan:run.task.prepared.scanObservation!.plan,units:run.results.flatMap(r=>r.scanBundle?.units??[]),links:[]}};}
        }
        await queued(session.id,()=>taskTarget(store,pins,task));
        const timings:Record<string,number>={},begin=performance.now();const scanResults=scanObservation?await analyzeScan({scan:scanObservation,pack:prepared.pack,session:prepared.session,evidence:prepared.evidence,reader:selectedReader,localReader,readImage}):undefined;const result=scanResults?undefined:localObservation?await analyzeLocalObservation({plan:localObservation,pack:prepared.pack,evidence:prepared.evidence,turnInstanceId:prepared.session.turnInstanceId,reader:localReader!,readImage,timings}):hostedObservation?await analyzeHostedObservation({plan:hostedObservation,pack:prepared.pack,session:prepared.session,evidence:prepared.evidence,turnInstanceId:prepared.session.turnInstanceId,reader:selectedReader,readImage,timings}):await analyzer({...prepared,timings});
        let commit:Partial<import('../shared/analysisJobs').AnalysisJob>;
        try{commit=await queued(session.id,()=>commitAnalysisTask(store,pins,task,job,scanResults??[result!]));}catch(error){if(!scanResults||(error as {status?:number}).status!==409)throw error;commit={state:'stale',error:'stale',observationReceipts:scanResults.flatMap(r=>r.observationReceipts??[]),scanBundle:{plan:scanObservation!.plan,units:scanResults.flatMap(r=>r.scanBundle?.units??[]),links:[]}};}
        return {...commit,timings:{...job.timings,providerMs:timings.provider??0,totalMs:performance.now()-begin}};
      },task);
    });res.status(202).json({job});
  });

  app.post('/api/sessions/:id/analyze', async (req, res) => {
    if(req.body?.reader)throw new HttpError('로컬 리더는 사진 읽기 작업 API로 요청하세요. 유료 모델로 자동 전환하지 않습니다.',409);
    if(cloud)throw new HttpError('사진 읽기 작업 API로 요청해 주세요. 사진과 기존 기록은 유지됩니다.',409);
    const initial=await sessionFor(req.params.id);
    if(initial.session.room){
      const prepared=await queued(initial.session.id,async()=>{
        const {session,pack}=await sessionFor(initial.session.id);await authorizeMutation(req,session,pack);
        if(req.body.expectedCaptureEpoch!==session.captureEpoch)throw new rooms.RoomError('촬영 단계가 바뀌었어요. 사진은 유지됩니다.',409);
        const a=rooms.actor(req,session),key=rooms.target(req.body),input=rooms.roomInput(session,pack,a,await pins.allowed(session.id,credential(req)),await pins.owners(session.id),key==='public');
        const evidence=session.evidence.filter(e=>req.body.evidenceIds.includes(e.id));
        validateStaticPhotos(evidence,req.body.sameStaticState);
        return {session:input,pack:structuredClone(pack),evidence:structuredClone(evidence),purpose:req.body.purpose??'capture',instruction:req.body.instruction,sameStaticState:req.body.sameStaticState===true,key};
      });
      if(!['capture','restore'].includes(prepared.purpose))throw new HttpError('분석 목적을 확인하세요.');
      const result=await analyzer(prepared);
      const view=await queued(initial.session.id,async()=>{
        const {session,pack}=await sessionFor(initial.session.id);const scopes=await authorizeMutation(req,session,pack);
        if(session.captureEpoch!==prepared.session.captureEpoch)throw new rooms.RoomError('촬영 단계가 바뀌었어요. 기존 기록은 유지됩니다.',409);
        const ids=new Set(prepared.evidence.map(e=>e.id));
        for(const assertion of result.assertions){const field=pack.fields.find(f=>f.key===assertion.field);if(!field||assertion.value===null||fieldScope(pack,assertion.field,assertion.ownerId)!==prepared.key)continue;validateCaptureObservation(pack,assertion.field,assertion.value,prepared.evidence.filter(e=>assertion.evidenceIds.includes(e.id)));validateValue(field,assertion.value);if(recognitionCapability(pack).mode==='assisted')assertion.value=genericCandidateValue(assertion.value,pack,assertion.field,prepared.evidence.filter(e=>assertion.evidenceIds.includes(e.id)),assertion.ownerId);rooms.refsAllowed(assertion.value,ids);if(!assertion.evidenceIds.length||assertion.evidenceIds.some(id=>!ids.has(id)))continue;appendGenericObservation(session,pack,{...assertion,id:randomUUID(),basis:'observation',status:'candidate',turnInstanceId:session.turnInstanceId,updatedAt:new Date().toISOString()});}
        session.analysisSummary=result.summary;session.analysisSummaryOwnerId=prepared.key==='public'?null:prepared.key;rooms.bump(session,scopes);const v=recompute(session,pack);await store.saveSession(session);return v;
      });res.json({...view,analysis:{mode:result.mode,warnings:result.warnings}});return;
    }
    const timings: Record<string, number> = {};
    let analysis: {mode:AnalysisResult['mode'];warnings:string[]}|undefined;
    const view = await change(req, req.params.id, async (session, pack) => {
      const purpose = req.body?.purpose ?? 'capture';
      if (!['capture', 'restore'].includes(purpose)) throw new HttpError('분석 목적을 확인하세요.');
      if (req.body?.expectedCaptureEpoch !== undefined && req.body.expectedCaptureEpoch !== session.captureEpoch) throw new HttpError('분석하려는 스캔 이후 저장·재개 단계가 바뀌었습니다. 원본은 보관되어 있으며 현재 판을 다시 촬영해 주세요.', 409);
      const ids = req.body?.evidenceIds;
      if (ids !== undefined && !Array.isArray(ids)) throw new HttpError('근거 식별자 배열이 필요합니다.');
      const evidence = session.evidence.filter(item => (!ids || ids.includes(item.id)) && (purpose !== 'restore' || item.captureEpoch === session.captureEpoch));
      if (ids && new Set(ids).size !== evidence.length) throw new HttpError('선택한 사진 일부가 없거나 현재 촬영 단계와 다릅니다. 분석할 사진을 다시 확인해 주세요.', 409);
      if (!evidence.length) throw new HttpError('분석할 사진을 먼저 추가하세요.');
      validateStaticPhotos(evidence,req.body.sameStaticState);
      if (purpose === 'restore') session.stage = 'restore';
      const result: AnalysisResult = session.example && evidence.every(item => item.kind === 'example')
        ? { assertions: [], summary: purpose === 'restore' ? '예시 모식도는 실제 복원 사진 판독이 아닙니다. 현재 테이블 사진을 추가하거나 직접 비교하세요.' : '명시된 예시 상태만 사용합니다. 실제 사진을 판독한 결과가 아닙니다.', mode: 'example', warnings: [] }
        : await analyzer({ session: structuredClone(session), evidence, pack, purpose, instruction: req.body?.instruction, sameStaticState:req.body.sameStaticState===true,timings });
      analysis={mode:result.mode,warnings:result.warnings};
      if (session.example && purpose === 'capture' && evidence.some(item => item.kind === 'example') && !result.assertions.length) {
        const sample = evidence.find(item => item.kind === 'example')!;
        const fixtures = createExampleAssertions(session.players, session.turnInstanceId, sample.id);
        for (const item of fixtures) if (!session.assertions.some(existing => existing.status === 'accepted' && fieldId(existing.field, existing.ownerId) === fieldId(item.field, item.ownerId))) session.assertions.push(item);
      }
      for (const assertion of result.assertions) {
        const field = pack.fields.find(field => field.key === assertion.field);
        if (!field || assertion.value === null || (field.scope === 'player' && !session.players.some(player => player.id === assertion.ownerId)) || (field.scope === 'public' && assertion.ownerId)) continue;
        try { validateCaptureObservation(pack,assertion.field,assertion.value,evidence.filter(e=>assertion.evidenceIds.includes(e.id)));validateValue(field, assertion.value); if(recognitionCapability(pack).mode==='assisted')assertion.value=genericCandidateValue(assertion.value,pack,assertion.field,evidence.filter(e=>assertion.evidenceIds.includes(e.id)),assertion.ownerId); } catch { continue; }
        appendGenericObservation(session,pack,{ ...assertion, id: randomUUID(), basis: 'observation', status: 'candidate', evidenceIds: assertion.evidenceIds.filter(id => evidence.some(item => item.id === id)), turnInstanceId: session.turnInstanceId, updatedAt: new Date().toISOString() });
      }
      session.analysisSummaryOwnerId = new Set(evidence.map(e=>e.ownerId??null)).size===1 ? evidence[0].ownerId??null : '_mixed';
      session.analysisSummary = session.example && evidence.every(item => item.kind === 'example') ? `명시된 예시 모식도입니다. ${result.summary}` : result.summary;
      if (result.warnings.length) session.analysisSummary += `\n${result.warnings.join('\n')}`;
      activity(session, 'analyze', `${purpose === 'restore' ? '복원 비교' : '상태 분석'}: ${result.mode}`);
    }, timings);
    res.setHeader('Server-Timing', timingHeader(timings));
    res.json({...view,analysis});
  });
  app.get('/api/sessions/:id/component-links/:assertionId',async(req,res)=>{
    const {session,pack}=await sessionFor(req.params.id),source=session.assertions.find(a=>a.id===req.params.assertionId&&['candidate','accepted'].includes(a.status));
    if(!source||!componentRecord(source))throw new HttpError('원본 구성물을 찾을 수 없어요.',404);
    const actor=session.room?rooms.actor(req,session):undefined;
    if(actor&&privateField(pack,source.field)&&source.ownerId!==actor.playerId)throw new rooms.RoomError('내 개인 기록만 연결할 수 있어요.');
    if(privateField(pack,source.field))await pins.require(session.id,source.ownerId,credential(req));
    const ids=typeof req.query.pieceIds==='string'?req.query.pieceIds.split(','):[];
    const pieces=componentRecord(source)!.pieces.filter(p=>ids.includes(p.id));
    if(!ids.length||new Set(ids).size!==ids.length||pieces.length!==ids.length)throw new HttpError('연결할 실물을 선택하세요.');
    const targets=[] as ComponentLinkOptions['targets'],targetVersions:Record<string,string|null>={};
    for(const t of componentLinkTargets(pack,session.players,pieces))try{
      if(actor){rooms.writeScope(actor,session,fieldScope(pack,t.field,t.ownerId));if(source.status==='accepted')rooms.writeScope(actor,session,fieldScope(pack,source.field,source.ownerId));}
      if(t.visibility==='owner')await pins.require(session.id,t.ownerId,credential(req));
      const current=latestComponentAssertion(session,t.field,t.ownerId),draft=structuredClone(session);
      // Use the transaction's actual eligibility checks; do not expose a destination that cannot be saved.
      linkComponents(draft,pack,{sourceAssertionId:source.id,pieceIds:ids,target:{field:t.field,ownerId:t.ownerId},expectedTargetAssertionId:current?.id??null,clearPlacement:true});
      targets.push({...t,targetAssertionId:current?.id??null});targetVersions[componentTargetKey(t.field,t.ownerId)]=current?.id??null;
    }catch{}
    res.json({sourceAssertionId:source.id,pieces,targets,targetVersions} satisfies ComponentLinkOptions);
  });
  app.post('/api/sessions/:id/component-links',async(req,res)=>res.json(await change(req,req.params.id,(session,pack)=>{const result=linkComponents(session,pack,req.body);if(result.moved)activity(session,'component-link','선택한 실물을 지정한 기록 영역에 연결했습니다.');})));
  app.post('/api/sessions/:id/assertions/:assertionId/accept', async (req, res) => {
    res.json(await change(req, req.params.id, (session, pack) => {
      const assertion = session.assertions.find(item => item.id === req.params.assertionId);
      if (!assertion || assertion.basis === 'rule') throw new HttpError('확인할 후보를 찾을 수 없습니다.', 404);
      const field = pack.fields.find(field => field.key === assertion.field);
      if (!field) throw new HttpError('알 수 없는 필드입니다.');
      guardPartialObservationAccept(session,pack,assertion);
      validateValue(field, assertion.value);
      if(pack.runtime?.fieldBindings.some(b=>b.key===field.key&&b.editor==='component-catalog'))assertion.value=validateComponentRecord(session,pack,field.key,assertion.value,assertion.ownerId,assertion.evidenceIds) as unknown as Value;
      if(recognitionCapability(pack).mode==='assisted')assertion.value=genericCandidateValue(assertion.value,pack,assertion.field,session.evidence.filter(e=>assertion.evidenceIds.includes(e.id)),assertion.ownerId);
      session.assertions = session.assertions.filter(item => item.id === assertion.id || item.status !== 'accepted' || fieldId(item.field, item.ownerId) !== fieldId(assertion.field, assertion.ownerId));
      assertion.status = 'accepted';
      assertion.updatedAt = new Date().toISOString();
      activity(session, 'accept', `${field.label} 관찰값을 직접 확인했습니다.`);
    }));
  });
  app.patch('/api/sessions/:id/preservations/:preservationId', async (req, res) => {
    res.json(await change(req, req.params.id, (session, pack) => {
      recompute(session, pack);
      const preservation = session.preservations.find(item => item.id === req.params.preservationId);
      if (!preservation) throw new HttpError('보존 항목을 찾을 수 없습니다.', 404);
      if (req.body.container !== undefined) { if (typeof req.body.container !== 'string') throw new HttpError('용기 이름을 확인하세요.'); preservation.container = req.body.container; }
      for (const key of ['packed', 'restored'] as const) if (req.body[key] !== undefined) { if (typeof req.body[key] !== 'boolean') throw new HttpError('체크 상태를 확인하세요.'); preservation[key] = req.body[key]; }
    }));
  });
  app.post('/api/sessions/:id/commit', async (req, res) => {
    res.json(await change(req, req.params.id, (session, pack) => {
      if (req.body?.recordingMode === 'simple' && pack.id === 'catan-base' && (!session.room||rooms.target(req.body)==='public')) session.recordingMode = 'simple';
      const view = recompute(session, pack);
      const key=session.room?rooms.target(req.body):undefined;
      const photoRecord=key?hasPhotoRecord(session,key==='public'?undefined:key):session.evidence.some(e=>e.kind==='photo');
      if (!view.ready && !photoRecord && req.body?.allowIncomplete !== true) throw new HttpError('남은 질문을 확인하거나 미완료 저장을 명시적으로 선택하세요.', 409);
      const assertion=(a:Session['assertions'][number])=>!key||fieldScope(pack,a.field,a.ownerId)===key;
      const refs=new Set(session.assertions.filter(assertion).flatMap(a=>a.evidenceIds));
      session.snapshots.push({ id: randomUUID(), createdAt: new Date().toISOString(), captureEpoch: session.captureEpoch, turnInstanceId: session.turnInstanceId, gamePackVersion: session.gamePackVersion, ...(key?{savedScope:key==='public'?{scope:'public' as const}:{scope:'owner' as const,ownerId:key}}:{}), assertions: structuredClone(session.assertions.filter(assertion)), evidence: structuredClone(session.evidence.filter(e=>!key||(e.ownerId??'public')===key||!e.ownerId&&e.scope==='public'&&refs.has(e.id))), preservations: structuredClone(session.preservations.filter(p=>!key||(p.ownerId??'public')===key)), notes: key?Object.fromEntries(Object.entries(session.notes).filter(([k])=>k===key)):structuredClone(session.notes) });
      if(!key||key==='public')session.stage = 'saved';
      activity(session, 'commit', view.ready ? '게임 상태와 보존 정보를 저장했습니다.' : photoRecord ? '사진과 현재 기록을 저장했습니다. 실물 보존·숨은 상태 완료는 승인하지 않았습니다.' : '미완료 항목을 포함해 명시적으로 저장했습니다.');
    }));
  });
  app.post('/api/sessions/:id/resume', async (req, res) => {
    res.json(await change(req, req.params.id, (session,pack) => {
      if(req.body?.scope!==undefined||pack.runtime){resumeSnapshot(session,pack,req.body?.scope??'public',req.body?.ownerId);activity(session,'resume','선택한 범위의 저장 기록을 복원했습니다.');return;}
      if (!session.snapshots.length) throw new HttpError('먼저 저장본을 만드세요.', 409);
      const saved = session.snapshots.at(-1)!;
      session.assertions = structuredClone(saved.assertions);
      session.evidence = structuredClone(saved.evidence);
      session.preservations = structuredClone(saved.preservations);
      session.notes = structuredClone(saved.notes);
      session.turnInstanceId = saved.turnInstanceId;
      session.analysisSummary = undefined;
      session.stage = 'restore';
      session.captureEpoch = randomUUID();
      for (const preservation of session.preservations) preservation.restored = false;
      activity(session, 'resume', '저장본과 같은 게임 턴으로 복원을 시작했습니다.');
    }));
  });
  app.post('/api/sessions/:id/next-turn', async (req, res) => {
    res.json(await change(req, req.params.id, async (session, pack) => {
      const protectedOwners=effectiveProtectedOwners(pack,session.players,await pins.owners(session.id)),allowed=await pins.allowed(session.id,credential(req));
      const locked=(owner?:string)=>!!owner&&(!!session.room||protectedOwners.has(owner)&&!allowed.has(owner));
      // Public turn changes expire temporal facts, but cannot erase locked private records.
      const retained=session.assertions.filter(a=>locked(a.ownerId)&&privateField(pack,a.field)&&a.basis!=='rule');
      const bundles=structuredClone(session.preservations.filter(p=>locked(p.ownerId)));
      nextTurn(session, pack, req.body?.playerId);
      for(const a of retained)if(!session.assertions.some(item=>item.id===a.id))session.assertions.push(a);
      session.preservations=session.preservations.map(p=>bundles.find(b=>b.id===p.id)??p);
      activity(session, 'next-turn', '명시적으로 다음 턴을 시작했습니다.');
    }));
  });
  app.get('/api/sessions/:id/export', async (req, res) => {
    const { session } = await sessionFor(req.params.id);
    if(session.room)throw new rooms.RoomError('방의 개인 기록은 전체 내보내기를 지원하지 않아요.');
    if((await pins.owners(session.id)).size)throw new PinError('비밀번호로 보호 중인 보드는 내보낼 수 없어요. 각 개인 영역에서 보호를 해제한 뒤 내보내 주세요.');
    res.setHeader('Content-Disposition', `attachment; filename="keepboard-${session.id}.json"`);
    res.json(await store.exportSession(session));
  });
  app.use('/api', (_req, _res, next) => { next(new HttpError('API 경로를 찾을 수 없습니다.', 404)); });

  if (ui) {
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.resolve('dist')));
      app.get('/{*path}', (_req, res) => { res.sendFile(path.resolve('dist/index.html')); });
    } else {
      const { createServer } = await import('vite');
      const vite = await createServer({ server: { middlewareMode: true,hmr:uiHmr,...(!uiHmr?{ws:false as const}:{}) }, appType: 'spa' });
      app.use(vite.middlewares);
    }
  }
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error instanceof HttpError || error instanceof PinError || error instanceof rooms.RoomError || error instanceof AnalysisJobError || error instanceof ConflictError ? error.status : error.status === 413 ? 413 : 400;
    res.status(status).json({ error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' });
  };
  app.use(onError);
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const localReader=process.env.KEEPBOARD_LOCAL_READER_CONFIG?await LocalReader.fromFile(process.env.KEEPBOARD_LOCAL_READER_CONFIG):undefined;
  const app = await createApp({ ui: true,localReader });
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT ?? 4317);
  app.listen(port, host, () => { console.log(`KeepBoard http://${host}:${port}`); });
}
