import express, { type ErrorRequestHandler, type Request } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { catanPack, createExampleAssertions } from '../gamepacks/catan.ts';
import type { AnalysisResult, Evidence, GamePack, Player, Session, Stage } from '../shared/types.ts';
import { analyzeEvidence, generateGamePack, getAIStatus, saveAISettings } from './ai/index.ts';
import { answerField, fieldId, nextTurn, recompute, validateValue } from './engine.ts';
import { DEFAULT_PLAYERS } from '../shared/playerColors.ts';
import { Store } from './store.ts';
import { PrivatePins, PinError } from './privatePin.ts';
import { privateField, redactSession, redactView } from '../shared/privacy.ts';

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
  for (const requirement of pack.requirements) if (!requirement || typeof requirement.id !== 'string' || !['public', 'player'].includes(requirement.scope) || !Array.isArray(requirement.fields) || requirement.fields.some(key => !keys.has(key)) || !Number.isFinite(requirement.priority)) throw new HttpError('게임팩 요구사항을 확인하세요.');
  for (const rule of pack.derivedRules) if (!rule || typeof rule.id !== 'string' || !keys.has(rule.field) || !rule.when || !['public', 'player'].includes(rule.scope)) throw new HttpError('게임팩 도출 규칙을 확인하세요.');
  for (const template of pack.preservationTemplates) if (!template || typeof template.id !== 'string' || !['public', 'player'].includes(template.scope) || !Array.isArray(template.conditions) || !Array.isArray(template.restoreAfter)) throw new HttpError('게임팩 보존 정의를 확인하세요.');
}

const defaultPlayers = DEFAULT_PLAYERS.map(player => ({ ...player }));

function validatePlayers(players: Player[]): void {
  if (!Array.isArray(players) || !players.length || players.some(player => !player || typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || typeof player.color !== 'string') || new Set(players.map(player => player.id)).size !== players.length) throw new HttpError('서로 다른 식별자의 플레이어를 입력하세요.');
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

export async function createApp({ store = new Store(), ui = false }: { store?: Store; ui?: boolean } = {}) {
  const app = express();
  const pins = new PrivatePins(store.root);
  const credential = (req: Request) => req.get('X-KeepBoard-Private-Token');
  app.use(express.json({ limit: '80mb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    const json = res.json.bind(res);
    res.json = (value: any) => {
      void (async () => {
        const project = async (session: Session, list = false) => {
          const pack = session.gamePack ?? (await packs()).find(p=>p.id===session.gamePackId&&p.version===session.gamePackVersion);
          if (!pack) throw new HttpError('게임팩을 찾을 수 없습니다.', 404);
          const protectedOwners = await pins.owners(session.id), allowed = list ? new Set<string>() : await pins.allowed(session.id, credential(req));
          return { pack, protectedOwners, allowed };
        };
        if (value?.session?.assertions && value?.pack) { const p=await project(value.session); value=redactView(value,p.protectedOwners,p.allowed); }
        else if (Array.isArray(value) && value.some(s=>s?.assertions&&s?.snapshots)) value=await Promise.all(value.map(async s=>{const p=await project(s,true);return redactSession(s,p.pack,p.protectedOwners,p.allowed);}));
        json(value);
      })().catch(next);
      return res;
    };
    next();
  });
  app.use('/uploads', async (req, res, next) => {
    try {
      const filename = path.basename(req.path), sessions = await store.listSessions(true);
      let found = false;
      for (const session of sessions) {
        const photos=[...session.evidence,...session.snapshots.flatMap(s=>s.evidence)].filter(e=>e.url===`/uploads/${filename}`);
        if(photos.length)found=true;
        for(const photo of photos) await pins.require(session.id,photo.ownerId,credential(req));
      }
      if(!found)throw new PinError('사진에 접근할 수 없어요.');
      res.setHeader('Cache-Control','no-store'); next();
    } catch(error){next(error);}
  }, express.static(path.join(store.root, 'uploads'), {cacheControl:false}));
  app.use(express.static(store.publicRoot));

  async function packs() {
    const imported = await store.listPacks();
    return [...imported, ...[catanPack].filter(pack => !imported.some(item => item.id === pack.id))];
  }

  async function sessionFor(id: string) {
    const session = await store.getSession(id);
    if (!session) throw new HttpError('세션을 찾을 수 없습니다.', 404);
    const pack = session.gamePack ?? (await packs()).find(pack => pack.id === session.gamePackId && pack.version === session.gamePackVersion);
    if (!pack) throw new HttpError('세션의 고정된 게임팩을 찾을 수 없습니다.', 404);
    session.gamePack = pack;
    return { session, pack };
  }

  const pending = new Map<string, Promise<unknown>>();
  async function authorizeMutation(req: Request, session: Session, pack: GamePack) {
    const token=credential(req), body=req.body??{}, requireOwner=(owner?:string)=>pins.require(session.id,owner,token);
    const requireField=async(field:string,owner?:string)=>{if(privateField(pack,field))await requireOwner(owner);};
    if(req.path.includes('/privacy/'))return;
    if(req.method==='PATCH'&&req.path===`/api/sessions/${session.id}`){
      for(const owner of Object.keys(body.notes??{}))await requireOwner(owner);
      for(const answer of body.answers??[])await requireField(answer.field,answer.ownerId);
      for(const update of body.assertions??[]){const previous=session.assertions.find(a=>a.id===update.id);if(previous)await requireField(previous.field,previous.ownerId);await requireField(update.field??previous?.field,update.ownerId??previous?.ownerId);}
      if(Array.isArray(body.players))for(const owner of await pins.owners(session.id))if(!body.players.some((p:Player)=>p.id===owner)){await requireOwner(owner);throw new HttpError('개인 정보 보호를 해제한 뒤 플레이어를 지워 주세요.',409);}
    }
    if(req.method==='POST'&&req.path.endsWith('/evidence')){
      if(body.scope==='player')await requireOwner(body.ownerId);
      const source=session.evidence.find(e=>e.id===body.sourceEvidenceId);if(source)await requireOwner(source.ownerId);
    }
    if(req.method==='DELETE'&&req.params.evidenceId)await requireOwner(session.evidence.find(e=>e.id===req.params.evidenceId)?.ownerId);
    if(req.path.endsWith('/analyze'))for(const e of session.evidence.filter(e=>!body.evidenceIds||body.evidenceIds.includes(e.id)))await requireOwner(e.ownerId);
    if(req.params.assertionId){const a=session.assertions.find(a=>a.id===req.params.assertionId);if(a)await requireField(a.field,a.ownerId);}
    if(req.params.preservationId)await requireOwner(session.preservations.find(p=>p.id===req.params.preservationId)?.ownerId);
    if(req.path.endsWith('/resume'))for(const owner of await pins.owners(session.id))await requireOwner(owner);
  }
  async function change(req: Request, id: string, mutate: (session: Session, pack: GamePack) => void | Promise<void>, timings?: Record<string, number>) {
    const queuedAt = performance.now();
    const prior = pending.get(id) ?? Promise.resolve();
    const job = prior.catch(() => undefined).then(async () => {
      let at = performance.now();
      if (timings) timings.queue = at - queuedAt;
      const { session, pack } = await sessionFor(id);
      if (timings) timings.load = performance.now() - at;
      at = performance.now(); await authorizeMutation(req, session, pack); await mutate(session, pack);
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

  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.get('/api/packs', async (_req, res) => { res.json(await packs()); });
  app.post('/api/packs', async (req, res) => {
    validatePack(req.body);
    await store.savePack(req.body);
    res.status(201).json(req.body);
  });
  app.post('/api/packs/generate', async (req, res) => {
    if (typeof req.body?.title !== 'string' || !req.body.title.trim() || typeof req.body.sourceText !== 'string' || !req.body.sourceText.trim()) throw new HttpError('게임 제목과 규칙 원문을 입력하세요.');
    const pack = await generateGamePack({ title: req.body.title, edition: req.body.edition, sourceText: req.body.sourceText });
    validatePack(pack);
    await store.savePack(pack);
    res.status(201).json(pack);
  });
  app.get('/api/settings', async (_req, res) => { res.json(await getAIStatus()); });
  app.put('/api/settings', async (req, res) => {
    if (!['gemini', 'openai'].includes(req.body?.provider) || typeof req.body.model !== 'string' || !req.body.model.trim()) throw new HttpError('제공자와 모델을 확인하세요.');
    res.json(await saveAISettings(req.body));
  });
  app.get('/api/sessions', async (req, res) => { res.json(await store.listSessions(req.query.includeDeleted === 'true')); });
  app.post('/api/sessions/archive', async (req, res) => {
    if (typeof req.body?.hidden !== 'boolean' || (req.body.ids !== undefined && (!Array.isArray(req.body.ids) || req.body.ids.some((id: unknown) => typeof id !== 'string')))) throw new HttpError('보드 식별자와 삭제/복원 상태를 확인하세요.');
    if (!req.body.hidden && !req.body.ids) throw new HttpError('복원할 보드를 선택하세요.');
    res.json({ ids: await store.setSessionsHidden(req.body.ids, req.body.hidden) });
  });
  app.delete('/api/sessions/:id', async (req, res) => { res.json({ ids: await store.setSessionsHidden([req.params.id], true) }); });
  app.post('/api/sessions/import', async (req, res) => {
    validatePack(req.body?.session?.gamePack);
    validatePlayers(req.body.session.players);
    const session = await store.importSession(req.body);
    const view = recompute(session, session.gamePack!);
    activity(session, 'import', '원본 이미지와 게임팩을 포함한 저장본을 가져왔습니다.');
    await store.saveSession(session);
    res.status(201).json(view);
  });
  app.post('/api/sessions', async (req, res) => {
    const body = req.body ?? {};
    const sourcePack = (await packs()).find(pack => pack.id === (body.gamePackId ?? catanPack.id));
    if (!sourcePack) throw new HttpError('게임팩을 찾을 수 없습니다.', 404);
    const players = body.players ?? structuredClone(defaultPlayers);
    validatePlayers(players);
    const pack = structuredClone(sourcePack);
    bindPlayers(pack, players);
    const at = new Date().toISOString();
    const session: Session = { id: randomUUID(), name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `${pack.title} 이어하기`, createdAt: at, updatedAt: at, gamePackId: pack.id, gamePackVersion: pack.version, gamePack: structuredClone(pack), captureEpoch: randomUUID(), turnInstanceId: randomUUID(), stage: 'capture', players, evidence: [], assertions: [], preservations: [], snapshots: [], notes: {}, activity: [], example: body.example === true };
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
    res.status(201).json(view);
  });
  app.get('/api/sessions/:id', async (req, res) => { const { session, pack } = await sessionFor(req.params.id); res.json(recompute(session, pack)); });
  app.post('/api/sessions/:id/privacy/lock', (req,res) => { pins.lock(credential(req));res.json({ok:true}); });
  app.post('/api/sessions/:id/privacy/:ownerId/unlock', async(req,res)=>{
    const {session}=await sessionFor(req.params.id);
    if(!session.players.some(p=>p.id===req.params.ownerId))throw new HttpError('플레이어를 찾을 수 없어요.',404);
    res.json({token:await pins.unlock(session.id,req.params.ownerId,req.body?.pin,req.ip??'local')});
  });
  app.put('/api/sessions/:id/privacy/:ownerId', async(req,res)=>{
    res.json(await change(req,req.params.id,async(session)=>{
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
        validatePlayers(body.players);
        session.players = body.players.map(({id,name,color}:Player)=>({id,name,color}));
        bindPlayers(pack, session.players);
        session.assertions = session.assertions.filter(assertion => !assertion.ownerId || session.players.some(player => player.id === assertion.ownerId));
      }
      if (body.notes !== undefined) {
        if (!body.notes || typeof body.notes !== 'object' || Array.isArray(body.notes) || Object.values(body.notes).some(value => typeof value !== 'string')) throw new HttpError('메모 형식을 확인하세요.');
        session.notes = { ...session.notes, ...body.notes };
      }
      if (body.answers !== undefined && !Array.isArray(body.answers)) throw new HttpError('답변 배열이 필요합니다.');
      for (const answer of body.answers ?? []) answerField(session, pack, answer.field, answer.value, answer.ownerId);
      if (body.assertions !== undefined && !Array.isArray(body.assertions)) throw new HttpError('사실 배열이 필요합니다.');
      for (const update of body.assertions ?? []) {
        const existing = session.assertions.find(assertion => assertion.id === update.id);
        const fieldKey = update.field ?? existing?.field;
        const ownerId = update.ownerId ?? existing?.ownerId;
        const value = update.value === undefined ? existing?.value : update.value;
        if (!fieldKey || value === undefined) throw new HttpError('사실의 필드와 값을 입력하세요.');
        answerField(session, pack, fieldKey, value, ownerId);
      }
      activity(session, 'edit', '입력한 상태에서 요구사항과 도출 사실을 다시 계산했습니다.');
    }));
  });
  app.post('/api/sessions/:id/evidence', async (req, res) => {
    const timings: Record<string, number> = {};
    let createdEvidenceId: string | undefined;
    const view = await change(req, req.params.id, async session => {
      if (req.body?.expectedCaptureEpoch !== undefined && req.body.expectedCaptureEpoch !== session.captureEpoch) throw new HttpError('촬영 중 저장·재개 단계가 바뀌었습니다. 스캔을 닫고 현재 단계에서 다시 시작해 주세요.', 409);
      if (typeof req.body?.dataUrl !== 'string') throw new HttpError('이미지 원본을 입력하세요.');
      const scope = req.body.scope ?? 'public';
      if (!['public', 'player'].includes(scope) || (scope === 'player' && !session.players.some(player => player.id === req.body.ownerId))) throw new HttpError('사진의 범위와 소유자를 확인하세요.');
      const url = await store.saveEvidence(req.body.dataUrl);
      const source = req.body.sourceEvidenceId ? session.evidence.find(item => item.id === req.body.sourceEvidenceId) : undefined;
      if (req.body.sourceEvidenceId && !source) throw new HttpError('확대할 원본을 찾을 수 없습니다.');
      createdEvidenceId = randomUUID();
      session.evidence.push({ id: createdEvidenceId, url, capturedAt: source?.capturedAt ?? new Date().toISOString(), captureEpoch: source?.captureEpoch ?? session.captureEpoch, label: typeof req.body.label === 'string' ? req.body.label : `사진 ${session.evidence.length + 1}`, scope: source?.scope ?? scope, ownerId: source?.ownerId ?? (scope === 'player' ? req.body.ownerId : undefined), sourceEvidenceId: source?.id, kind: source?.kind === 'example' ? 'example' : 'photo', width: req.body.width, height: req.body.height });
      activity(session, 'capture', '사진 원본을 로컬 디스크에 저장했습니다.');
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
  app.post('/api/sessions/:id/analyze', async (req, res) => {
    const timings: Record<string, number> = {};
    const view = await change(req, req.params.id, async (session, pack) => {
      const purpose = req.body?.purpose ?? 'capture';
      if (!['capture', 'restore'].includes(purpose)) throw new HttpError('분석 목적을 확인하세요.');
      if (req.body?.expectedCaptureEpoch !== undefined && req.body.expectedCaptureEpoch !== session.captureEpoch) throw new HttpError('분석하려는 스캔 이후 저장·재개 단계가 바뀌었습니다. 원본은 보관되어 있으며 현재 판을 다시 촬영해 주세요.', 409);
      const ids = req.body?.evidenceIds;
      if (ids !== undefined && !Array.isArray(ids)) throw new HttpError('근거 식별자 배열이 필요합니다.');
      const evidence = session.evidence.filter(item => (!ids || ids.includes(item.id)) && (purpose !== 'restore' || item.captureEpoch === session.captureEpoch));
      if (ids && new Set(ids).size !== evidence.length) throw new HttpError('선택한 사진 일부가 없거나 현재 촬영 단계와 다릅니다. 분석할 사진을 다시 확인해 주세요.', 409);
      if (!evidence.length) throw new HttpError('분석할 사진을 먼저 추가하세요.');
      if (purpose === 'restore') session.stage = 'restore';
      const result: AnalysisResult = session.example && evidence.every(item => item.kind === 'example')
        ? { assertions: [], summary: purpose === 'restore' ? '예시 모식도는 실제 복원 사진 판독이 아닙니다. 현재 테이블 사진을 추가하거나 직접 비교하세요.' : '명시된 예시 상태만 사용합니다. 실제 사진을 판독한 결과가 아닙니다.', mode: 'example', warnings: [] }
        : await analyzeEvidence({ session: structuredClone(session), evidence, pack, purpose, instruction: req.body?.instruction, timings });
      if (session.example && purpose === 'capture' && evidence.some(item => item.kind === 'example') && !result.assertions.length) {
        const sample = evidence.find(item => item.kind === 'example')!;
        const fixtures = createExampleAssertions(session.players, session.turnInstanceId, sample.id);
        for (const item of fixtures) if (!session.assertions.some(existing => existing.status === 'accepted' && fieldId(existing.field, existing.ownerId) === fieldId(item.field, item.ownerId))) session.assertions.push(item);
      }
      for (const assertion of result.assertions) {
        const field = pack.fields.find(field => field.key === assertion.field);
        if (!field || assertion.value === null || (field.scope === 'player' && !session.players.some(player => player.id === assertion.ownerId)) || (field.scope === 'public' && assertion.ownerId)) continue;
        try { validateValue(field, assertion.value); } catch { continue; }
        session.assertions.push({ ...assertion, id: randomUUID(), basis: 'observation', status: 'candidate', evidenceIds: assertion.evidenceIds.filter(id => evidence.some(item => item.id === id)), turnInstanceId: session.turnInstanceId, updatedAt: new Date().toISOString() });
      }
      session.analysisSummaryOwnerId = new Set(evidence.map(e=>e.ownerId??null)).size===1 ? evidence[0].ownerId??null : '_mixed';
      session.analysisSummary = session.example && evidence.every(item => item.kind === 'example') ? `명시된 예시 모식도입니다. ${result.summary}` : result.summary;
      if (result.warnings.length) session.analysisSummary += `\n${result.warnings.join('\n')}`;
      activity(session, 'analyze', `${purpose === 'restore' ? '복원 비교' : '상태 분석'}: ${result.mode}`);
    }, timings);
    res.setHeader('Server-Timing', timingHeader(timings));
    res.json(view);
  });
  app.post('/api/sessions/:id/assertions/:assertionId/accept', async (req, res) => {
    res.json(await change(req, req.params.id, (session, pack) => {
      const assertion = session.assertions.find(item => item.id === req.params.assertionId);
      if (!assertion || assertion.basis === 'rule') throw new HttpError('확인할 후보를 찾을 수 없습니다.', 404);
      const field = pack.fields.find(field => field.key === assertion.field);
      if (!field) throw new HttpError('알 수 없는 필드입니다.');
      validateValue(field, assertion.value);
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
      if (req.body?.recordingMode === 'simple' && pack.id === 'catan-base') session.recordingMode = 'simple';
      const view = recompute(session, pack);
      if (!view.ready && req.body?.allowIncomplete !== true) throw new HttpError('남은 질문을 확인하거나 미완료 저장을 명시적으로 선택하세요.', 409);
      session.snapshots.push({ id: randomUUID(), createdAt: new Date().toISOString(), captureEpoch: session.captureEpoch, turnInstanceId: session.turnInstanceId, gamePackVersion: session.gamePackVersion, assertions: structuredClone(session.assertions), evidence: structuredClone(session.evidence), preservations: structuredClone(session.preservations), notes: structuredClone(session.notes) });
      session.stage = 'saved';
      activity(session, 'commit', view.ready ? '게임 상태와 보존 정보를 저장했습니다.' : '미완료 항목을 포함해 명시적으로 저장했습니다.');
    }));
  });
  app.post('/api/sessions/:id/resume', async (req, res) => {
    res.json(await change(req, req.params.id, session => {
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
      const protectedOwners=await pins.owners(session.id),allowed=await pins.allowed(session.id,credential(req));
      const locked=(owner?:string)=>!!owner&&protectedOwners.has(owner)&&!allowed.has(owner);
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
      const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
    }
  }
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error instanceof HttpError || error instanceof PinError ? error.status : error.status === 413 ? 413 : 400;
    res.status(status).json({ error: error instanceof Error ? error.message : '요청을 처리하지 못했습니다.' });
  };
  app.use(onError);
  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const app = await createApp({ ui: true });
  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT ?? 4317);
  app.listen(port, host, () => { console.log(`KeepBoard http://${host}:${port}`); });
}
