import {linkedComponents} from '../shared/componentLinking.ts';
import {latestSnapshot,fieldScope} from '../shared/rooms.ts';
import { randomUUID } from 'node:crypto';
import type { Assertion, Condition, FieldDefinition, GamePack, Preservation, Session, SessionView, Value } from '../shared/types.ts';
import { RESOURCES, DEVELOPMENTS, catanNextProcedure, countSummary, countValue, objectValue } from '../shared/catanSummary.ts';
import { planActions } from './actions.ts';
import { compareStateValues } from './compare.ts';
import { normalizeScene } from '../shared/scene.ts';
import {deriveCatanNumberAssertion} from '../shared/catanNumberInference';
import { hasCompleteBoard } from '../shared/sceneBridge.ts';
import { isSceneField } from '../shared/sceneFields.ts';
import { allRummikubTiles, isRummikubField, normalizeRummikubDetailed, rummikubSourceEvidence, validateRummikubColorEdits } from '../shared/rummikub.ts';

import {physicalOnlyField,runtimeBinding} from '../shared/gameEssentials.ts';
import {validateGenericRecord,type GenericRecord} from '../shared/genericRecord.ts';
import {validateReadoutEvidenceChanges} from '../shared/readouts/registry.ts';
import {receiptsForValue} from './observationReceipts';
import {observationAnswerContext} from './observationReview';
import type {NativeObservationReview} from '../shared/observationReview';

export const isTurnField = (field: FieldDefinition | undefined) => !['player.development.boughtThisTurnType','player.development.boughtThisTurnIdentity'].includes(field?.key??'') && (field?.lifetime === 'turn' || (!field?.lifetime && field?.group === 'turn'));
export const fieldId = (field: string, ownerId?: string) => `${ownerId ?? 'public'}:${field}`;
const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function currentFacts(session: Session, pack: GamePack, assertions: Assertion[], turnInstanceId = session.turnInstanceId) {
  const facts = new Map<string, Assertion>();
  for (const assertion of assertions) {
    if (assertion.status !== 'accepted') continue;
    if (assertion.field === 'board.layout' && assertion.value && typeof assertion.value === 'object' && !Array.isArray(assertion.value) && [1,2].includes(Number(assertion.value.version)) && !hasCompleteBoard(normalizeScene(assertion.value))) continue;
    const field = pack.fields.find(field => field.key === assertion.field);
    if (isTurnField(field) && assertion.turnInstanceId && assertion.turnInstanceId !== turnInstanceId) continue;
    facts.set(fieldId(assertion.field, assertion.ownerId), assertion);
  }
  return facts;
}

export function evaluateCondition(condition: Condition | undefined, facts: Map<string, Assertion>, ownerId?: string): boolean {
  if (!condition) return true;
  if (condition.op === 'and') return (condition.conditions ?? []).every(item => evaluateCondition(item, facts, ownerId));
  if (condition.op === 'or') return (condition.conditions ?? []).some(item => evaluateCondition(item, facts, ownerId));
  if (condition.op === 'not') return condition.conditions?.length === 1 && !evaluateCondition(condition.conditions[0], facts, ownerId);
  const owner = condition.owner === '$owner' ? ownerId : condition.owner === 'public' || !condition.owner ? undefined : condition.owner;
  const fact = facts.get(fieldId(condition.field ?? '', owner));
  if (condition.op === 'exists') return condition.value === false ? !fact : !!fact;
  if (!fact) return false;
  const expected = condition.value === '$owner' ? ownerId : condition.value;
  if (condition.op === 'eq') return sameValue(fact.value, expected);
  if (condition.op === 'neq') return !sameValue(fact.value, expected);
  return typeof fact.value === 'number' && typeof expected === 'number' && fact.value > expected;
}

function conditionEvidence(condition: Condition, facts: Map<string, Assertion>, ownerId?: string): string[] {
  if (condition.conditions) return [...new Set(condition.conditions.flatMap(item => conditionEvidence(item, facts, ownerId)))];
  const owner = condition.owner === '$owner' ? ownerId : condition.owner === 'public' || !condition.owner ? undefined : condition.owner;
  return facts.get(fieldId(condition.field ?? '', owner))?.evidenceIds ?? [];
}

function describeValue(value: Value): string {
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  if (Array.isArray(value)) return `${value.length}개 항목 기록`;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.components)) return `${value.components.length}개 구성물 · ${value.coverage === 'full' ? '전체 판' : value.coverage === 'catalog' ? '구성물 목록' : '부분 관측'}`;
    if (Array.isArray(value.tiles)) {
      const robber = value.robber && typeof value.robber === 'object' && !Array.isArray(value.robber) ? value.robber.tileId : value.robber;
      return `${value.tiles.length}개 타일 · ${Array.isArray(value.pieces) ? value.pieces.length : 0}개 말${robber ? ` · 도둑 ${String(robber)}` : ''}`;
    }
    const entries = Object.entries(value);
    const preview = entries.filter(([, item]) => item === null || typeof item !== 'object').slice(0, 3).map(([key, item]) => `${key} ${String(item)}`).join(', ');
    return preview ? `${preview}${entries.length > 3 ? ` 외 ${entries.length - 3}개 항목` : ''}` : `${entries.length}개 항목 기록`;
  }
  return String(value);
}

export function validateValue(field: FieldDefinition, value: Value): void {
  if (value === null) return;
  const valid = (field.type === 'json' && value !== undefined)
    || (field.type === 'number' && typeof value === 'number' && Number.isFinite(value))
    || (field.type === 'boolean' && typeof value === 'boolean')
    || (field.type === 'text' && typeof value === 'string')
    || (field.type === 'select' && typeof value === 'string' && !!field.options?.some(option => option.value === value));
  if (field.key === 'setup.round' && value !== 1 && value !== 2) throw new Error('초기 배치 차수는 1 또는 2입니다.');
  const editor = field.ui?.editor;
  if (editor === 'resource-counts' || editor === 'development-counts' || field.key === 'player.pieces.remaining') {
    const keys = editor === 'resource-counts' ? RESOURCES : editor === 'development-counts' ? DEVELOPMENTS : ['road','settlement','city'];
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.entries(value).some(([key,n])=>!keys.includes(key as never) || (n !== null && countValue(n) === null))) throw new Error(`${field.label}: 종류별 0 이상의 정수 또는 모름을 입력하세요.`);
  }
  if (field.key === 'player.development.purchaseBatches') { if (!Array.isArray(value) || value.some(raw=>{const b=objectValue(raw); return typeof b.purchasedTurnId!=='string' || !(b.counts===null || b.counts && typeof b.counts==='object' && !Array.isArray(b.counts) && Object.entries(b.counts).every(([k,n])=>DEVELOPMENTS.includes(k as never)&&(n===null||countValue(n)!==null)));})) throw new Error('구매 묶음은 구매 턴과 종류별 정수 수량 또는 정체 미상으로 기록하세요.'); }
  if (field.key === 'turn.trade') { const t=objectValue(value); if (!['bank','player'].includes(String(t.kind)) || !['proposed','in_progress','completed','cancelled'].includes(String(t.status)) || typeof t.playerId !== 'string') throw new Error('교역 종류·당사자·진행 상태를 확인하세요.'); for (const key of ['give','receive','given','received']) { const map=t[key]; if (map === null && (key==='given'||key==='received')) continue; if (!map || typeof map !== 'object' || Array.isArray(map) || Object.entries(map).some(([r,n])=>!RESOURCES.includes(r as never)||(n!==null&&countValue(n)===null))) throw new Error('교역 수량은 자원별 정수 또는 모름입니다.'); } }
  if (!valid) throw new Error(`${field.label}: ${field.type} 형식의 값을 입력하세요.`);
}

/** Shared trust boundary for manual answers, candidate acceptance and imported component records. */
export function validateComponentRecord(session:Pick<Session,'players'|'evidence'>&Partial<Pick<Session,'assertions'>>,pack:GamePack,fieldKey:string,value:Value,ownerId?:string,assertionEvidenceIds?:string[],options:{trustedLink?:boolean;importing?:boolean}={}){
 const field=pack.fields.find(f=>f.key===fieldKey);if(!field||runtimeBinding(pack,fieldKey)?.editor!=='component-catalog')throw new Error('구성물 필드를 확인하세요.');
 if(field.scope==='player'?!session.players.some(p=>p.id===ownerId):!!ownerId)throw new Error('구성물 소유 범위를 확인하세요.');
 const ids=session.evidence.filter(e=>field.visibility==='public'||!ownerId?e.scope==='public'&&!e.ownerId:e.ownerId===ownerId||e.scope==='public'&&!e.ownerId).map(e=>e.id);
 if(assertionEvidenceIds&&(!Array.isArray(assertionEvidenceIds)||assertionEvidenceIds.some(id=>!ids.includes(id))))throw new Error('이 영역에서 볼 수 있는 원본만 근거로 연결하세요.');
 const record=validateGenericRecord(value,pack,fieldKey,ids,{playerIds:session.players.map(p=>p.id)});
 const prior=(session.assertions??[]).filter(a=>a.field===fieldKey&&a.ownerId===ownerId&&['accepted','candidate'].includes(a.status)).flatMap(a=>{const r=a.value as unknown as GenericRecord;return r?.version==='game-component-record-v1'&&Array.isArray(r.pieces)?r.pieces:[];});
 for(const p of record.pieces){
  const old=[...prior].reverse().find(o=>o.id===p.id&&o.evidenceId===p.evidenceId);
  if(!options.trustedLink&&!options.importing){
   if(p.linkOrigin&&JSON.stringify(p.linkOrigin)!==JSON.stringify(old?.linkOrigin))throw new Error('실물의 기존 연결 정보는 임의로 바꿀 수 없어요.');
   if(!p.linkOrigin&&old?.linkOrigin)p.linkOrigin=structuredClone(old.linkOrigin);
   const moved=linkedComponents({assertions:session.assertions??[]}).some(x=>x.origin.field===fieldKey&&x.origin.ownerId===ownerId&&x.origin.pieceId===p.id&&x.piece.evidenceId===p.evidenceId&&(x.assertion.field!==fieldKey||x.assertion.ownerId!==ownerId));
   if(moved)throw new Error('이미 다른 영역에 연결한 실물이에요. 현재 보유 기록에서 옮겨 주세요.');
  }
 }
 validateReadoutEvidenceChanges(pack,prior,record.pieces);
 return record;
}
export function answerField(session: Session, pack: GamePack, fieldKey: string, value: Value, ownerId?: string,observationReview?:NativeObservationReview) {
  if(physicalOnlyField(pack,fieldKey))throw new Error('이 비밀 내용은 수집하지 않습니다. 실물 보관 안내를 이용하세요.');
  const field = pack.fields.find(item => item.key === fieldKey);
  if (!field) throw new Error(`알 수 없는 필드: ${fieldKey}`);
  if (field.scope === 'player' && !session.players.some(player => player.id === ownerId)) throw new Error('플레이어를 지정하세요.');
  if (field.scope === 'public' && ownerId) throw new Error('공용 필드는 플레이어를 지정할 수 없습니다.');
  validateValue(field, value);
  let tileEvidence: string[] = [];
  if(runtimeBinding(pack,fieldKey)?.editor==='component-catalog'&&value!==null){const record=validateComponentRecord(session,pack,fieldKey,value,ownerId);value=record as unknown as Value;tileEvidence=record.pieces.flatMap(p=>p.evidenceId?[p.evidenceId]:[]);}
  if (pack.id === 'rummikub' && isRummikubField(fieldKey) && value !== null) {
    const authorized = rummikubSourceEvidence(session.evidence, ownerId).map(e => e.id);
    const result = normalizeRummikubDetailed(value, { ownerId, evidenceIds: authorized });
    if (!result.recognized) throw new Error(result.warnings[0] || '루미큐브 타일 기록을 확인하세요.');
    const previousScenes=session.assertions.filter(a=>a.field===fieldKey&&a.ownerId===ownerId&&['accepted','candidate','conflict'].includes(a.status)).map(a=>normalizeRummikubDetailed(a.value,{ownerId}).scene);
    validateRummikubColorEdits(result.scene,previousScenes);
    value = result.scene as unknown as Value;
    tileEvidence = allRummikubTiles(result.scene).flatMap(tile => tile.evidenceIds);
  }
  if (field.key==='turn.trade' && value) { const trade=objectValue(value); if(!session.players.some(p=>p.id===trade.playerId) || (trade.counterpartyId && !session.players.some(p=>p.id===trade.counterpartyId))) throw new Error('실제 참가자를 교역 당사자로 선택하세요.'); }
  if (isSceneField(field) && value && typeof value === 'object' && !Array.isArray(value) && [1,2].includes(Number(value.version))) value = normalizeScene(value) as unknown as Value;
  const review=observationAnswerContext(session,pack,fieldKey,value,ownerId,observationReview);
  const previous = session.assertions.find(item => item.field === fieldKey && item.ownerId === ownerId && item.basis !== 'rule');
  const observationReceipts=[...(value===null?[]:receiptsForValue(session,value,ownerId)),...(review.reviewed?.observationReceipts??[]),...(previous?.observationReceipts??[])].filter((r,i,all)=>all.findIndex(x=>x.request.taskId===r.request.taskId)===i);
  session.assertions = session.assertions.filter(item => !review.consumed.has(item.id)&&(fieldId(item.field,item.ownerId)!==fieldId(fieldKey,ownerId)||item.status==='candidate'&&!!item.observationReceipts?.length));
  // A correction changes the value, while its photographed target stays linked.
  const sceneEvidence = isSceneField(field) && value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.components) ? value.components.flatMap(raw => { const c = objectValue(raw); return typeof c.evidenceId === 'string' && session.evidence.some(e => e.id === c.evidenceId && (ownerId ? e.ownerId === ownerId || e.scope === 'public' : e.scope === 'public')) ? [c.evidenceId] : []; }) : [];
  if (value !== null) session.assertions.push({ id: randomUUID(), field: fieldKey, value, ownerId, basis: 'user', status: 'accepted', evidenceIds: [...new Set([...(previous?.evidenceIds || []), ...sceneEvidence, ...tileEvidence])], ...(previous?.region ? { region: previous.region } : {}), ...(observationReceipts.length?{observationReceipts}:{}),updatedAt: new Date().toISOString(), turnInstanceId: session.turnInstanceId });
}

export function recompute(session: Session, pack: GamePack): SessionView {
  const base = session.assertions.filter(assertion => assertion.basis !== 'rule');
  let derived: Assertion[] = [];
  for (let iteration = 0; iteration <= pack.derivedRules.length; iteration++) {
    const facts = currentFacts(session, pack, [...base, ...derived]);
    const next: Assertion[] = [];
    for (const rule of pack.derivedRules) {
      const owners = rule.scope === 'player' ? session.players.map(player => player.id) : [undefined];
      for (const ownerId of owners) {
        if (pack.id === 'catan-base' && ['player.development.newActionCardUnavailableThisTurn','player.development.newVictoryPointCanBeRevealedToWin'].includes(rule.field) && facts.get(fieldId('player.development.boughtThisTurnType', ownerId))?.turnInstanceId !== session.turnInstanceId) continue;
        if (!evaluateCondition(rule.when, facts, ownerId)) continue;
        next.push({ id: `rule:${rule.id}:${ownerId ?? 'public'}`, field: rule.field, value: rule.value, ownerId, basis: 'rule', status: 'accepted', evidenceIds: conditionEvidence(rule.when, facts, ownerId), reason: rule.reason, turnInstanceId: session.turnInstanceId, updatedAt: session.updatedAt });
      }
    }
    const numberInference=deriveCatanNumberAssertion(session,pack,base);
    if(numberInference)next.push(numberInference);
    const stable = sameValue(derived, next);
    derived = next;
    if (stable) break;
  }
  session.assertions = [...base, ...derived];
  const facts = currentFacts(session, pack, session.assertions);
  const simple = pack.id === 'catan-base' && session.recordingMode === 'simple';
  const preservations: Preservation[] = simple ? session.preservations : [];
  for (const template of simple ? pack.preservationTemplates.filter(p=>p.id.startsWith('spec.')) : pack.preservationTemplates) {
    for (const ownerId of template.scope === 'player' ? session.players.map(player => player.id) : [undefined]) {
      if (!evaluateCondition(template.when, facts, ownerId)) continue;
      const id = `${ownerId ?? 'public'}:${template.id}`;
      const previous = session.preservations.find(item => item.id === id);
      preservations.push({ id, templateId: template.id, label: template.label, description: template.description, ownerId, conditions: template.conditions, container: previous?.container ?? '', packed: previous?.packed ?? false, restored: previous?.restored ?? false, restoreAfter: template.restoreAfter.map(dependency => {
        const scope = pack.preservationTemplates.find(item => item.id === dependency)?.scope;
        return `${scope === 'player' ? ownerId ?? 'public' : 'public'}:${dependency}`;
      }) });
    }
  }
  session.preservations = preservations;
  // A preserved physical bundle can satisfy a pack condition without digitizing its contents.
  for (const item of preservations.filter(item => item.packed)) {
    if (!facts.has(fieldId(item.templateId, item.ownerId)) && pack.fields.some(field => field.key === item.templateId && field.acquisition === 'preserve')) {
      facts.set(fieldId(item.templateId, item.ownerId), {
        id: `preserved:${item.id}`, field: item.templateId, ownerId: item.ownerId,
        value: true, basis: 'user', status: 'accepted', evidenceIds: [], updatedAt: session.updatedAt,
      });
    }
  }
  const required = new Map<string, SessionView['questions'][number]>();
  for (const requirement of simple ? pack.requirements.filter(r=>r.id.startsWith('spec.')) : pack.requirements) {
    for (const ownerId of requirement.scope === 'player' ? session.players.map(player => player.id) : [undefined]) {
      if (!evaluateCondition(requirement.when, facts, ownerId)) continue;
      for (const key of requirement.fields) {
        const field = pack.fields.find(item => item.key === key);
        if (!field) continue;
        const fieldOwner = field.scope === 'public' ? undefined : ownerId;
        const id = fieldId(key, fieldOwner);
        const existing = required.get(id);
        if (existing && existing.priority >= requirement.priority) continue;
        required.set(id, { id, field: key, ownerId: fieldOwner, label: field.label, description: field.description, type: field.type, options: field.options, reason: requirement.reason, acquisition: field.acquisition, priority: requirement.priority, ui: field.ui, sourceId: requirement.sourceId ?? field.sourceId, preservationId: field.preservationId });
      }
    }
  }
  const questions = [...required.values()].filter(question => {
    const fact = facts.get(question.id);
    if (fact) { const editor = pack.fields.find(f=>f.key===question.field)?.ui?.editor; if (!editor || !['resource-counts','development-counts'].includes(editor) || countSummary(fact.value,editor==='resource-counts'?RESOURCES:DEVELOPMENTS).status==='complete') return false; }
    return !preservations.some(item => item.ownerId === question.ownerId && item.packed && ((question.acquisition === 'preserve' && item.templateId === question.field) || item.templateId === question.preservationId));
  }).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const latest = session.snapshots.at(-1);
  const differences: SessionView['differences'] = [];
  if ((session.room||session.stage === 'restore') && latest) {
    const expected = currentFacts(session, pack, latest.assertions, latest.turnInstanceId);
    const equal = (field: string, a: Value, b: Value) => {
      const definition = pack.fields.find(item => item.key === field);
      return definition ? compareStateValues(definition, a, b) : sameValue(a, b);
    };
    for (const [id, observed] of facts) {
      const baseline=session.room?latestSnapshot(session,fieldScope(pack,observed.field,observed.ownerId)):latest;
      const saved = session.room?(baseline?currentFacts(session,pack,baseline.assertions,baseline.turnInstanceId).get(id):undefined):expected.get(id);
      if (saved && !equal(observed.field, saved.value, observed.value)) differences.push({ field: observed.field, label: pack.fields.find(field => field.key === observed.field)?.label ?? observed.field, expected: saved.value, observed: observed.value, ownerId: observed.ownerId });
    }
    for (const candidate of session.assertions.filter(item => item.status === 'candidate' || item.status === 'conflict')) {
      const baseline=session.room?latestSnapshot(session,fieldScope(pack,candidate.field,candidate.ownerId)):latest;
      const saved = session.room?(baseline?currentFacts(session,pack,baseline.assertions,baseline.turnInstanceId).get(fieldId(candidate.field,candidate.ownerId)):undefined):expected.get(fieldId(candidate.field, candidate.ownerId));
      if (saved && !equal(candidate.field, saved.value, candidate.value) && !differences.some(item => item.field === candidate.field && item.ownerId === candidate.ownerId && equal(candidate.field, item.observed, candidate.value))) differences.push({ field: candidate.field, label: pack.fields.find(field => field.key === candidate.field)?.label ?? candidate.field, expected: saved.value, observed: candidate.value, ownerId: candidate.ownerId });
    }
  }
  const briefingOrder = ['currentPlayer', 'turn.phase', 'turn.pendingEffect', 'turn.pendingEffectDetails', 'resume.nextProcedure'];
  const briefing = [...facts.values()].filter(assertion => !assertion.id.startsWith('preserved:')).sort((a, b) => {
    const priority = (field: string) => { const index = briefingOrder.indexOf(field); return index < 0 ? 10 : index; };
    return priority(a.field) - priority(b.field);
  }).map(assertion => {
    const field = pack.fields.find(field => field.key === assertion.field);
    const option = field?.options?.find(option => option.value === assertion.value);
    const playerName = typeof assertion.value === 'string' ? session.players.find(player => player.id === assertion.value)?.name : undefined;
    const value = option?.label ?? playerName ?? describeValue(assertion.value);
    return { field: assertion.field, text: `${field?.label ?? assertion.field}: ${value}${assertion.basis === 'rule' && assertion.reason && assertion.field !== 'resume.nextProcedure' ? ` · ${assertion.reason}` : ''}`, ownerId: assertion.ownerId, evidenceIds: assertion.evidenceIds, basis: assertion.basis };
  });
  if (pack.id === 'catan-base') { const next = catanNextProcedure(session); const entry=briefing.find(b=>b.field==='resume.nextProcedure'); if(entry)entry.text=next;else briefing.unshift({field:'resume.nextProcedure',text:next,ownerId:undefined,evidenceIds:[],basis:'rule'}); }
  return { session, pack, questions, derived, briefing, ready: questions.length === 0, progress: { resolved: required.size - questions.length, total: required.size }, differences, actions: planActions(session, questions) };
}

export function nextTurn(session: Session, pack: GamePack, playerId?: string) {
  if (playerId && !session.players.some(player => player.id === playerId)) throw new Error('알 수 없는 플레이어입니다.');
  session.turnInstanceId = randomUUID();
  session.captureEpoch = randomUUID();
  for (const item of session.preservations) { item.packed = false; item.restored = false; }
  session.assertions = session.assertions.filter(assertion => !isTurnField(pack.fields.find(field => field.key === assertion.field)) && assertion.basis !== 'rule');
  // A current-player field is opt-in through the pack rather than a game-specific route.
  const current = pack.fields.find(field => field.key === 'currentPlayer' && field.scope === 'public');
  if (playerId && current) answerField(session, pack, current.key, playerId);
  session.stage = 'capture';
}
