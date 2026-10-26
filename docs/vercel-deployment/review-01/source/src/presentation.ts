import { canViewField } from '../shared/catanSummary';
import type { Assertion, Evidence, FieldDefinition, Player, Preservation, Question, SessionView, Value } from '../shared/types';

export type PhotoRegion = NonNullable<Assertion['region']>;
export interface TargetLocation {
  id: string;
  targetKey: string;
  evidence: Evidence;
  assertionId?: string;
  region?: PhotoRegion;
  snapshot: boolean;
  contextOnly: boolean;
}
export interface PhotoTarget {
  key: string;
  field: FieldDefinition;
  ownerId?: string;
  question?: Question;
  accepted?: Assertion;
  baseline?: Assertion;
  candidates: Assertion[];
  locations: TargetLocation[];
  preservationIds: string[];
  derived: boolean;
}

export function targetKey(field: string, ownerId?: string): string {
  return JSON.stringify([ownerId ?? null, field]);
}

export function previewValue(value: Value | undefined, field?: Pick<FieldDefinition, 'options'>, players: Player[] = []): string {
  if (value === undefined || value === null) return '아직 미확인';
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  if (typeof value === 'number') return value.toLocaleString('ko-KR');
  if (typeof value === 'string') return field?.options?.find(option => option.value === value)?.label ?? players.find(player => player.id === value)?.name ?? value;
  if (!Array.isArray(value) && Array.isArray(value.components)) return `${value.components.length}개 구성물 · ${value.coverage === 'full' ? '전체 판' : value.coverage === 'catalog' ? '구성물 목록' : '부분 관측'}`;
  if (Array.isArray(value)) return `${value.length}개 항목의 기록`;
  return `${Object.keys(value).length}개 항목의 기록`;
}

export function regionIdentity(evidenceId: string, assertionId: string): string {
  return JSON.stringify([evidenceId, assertionId]);
}

export function normalizedRegion(region: Assertion['region']): PhotoRegion | undefined {
  if (!region || !Object.values(region).every(Number.isFinite) || region.width <= 0 || region.height <= 0) return;
  const x = Math.max(0, region.x), y = Math.max(0, region.y);
  const right = Math.min(1, region.x + region.width), bottom = Math.min(1, region.y + region.height);
  if (right <= x || bottom <= y) return;
  return { x, y, width: right - x, height: bottom - y };
}

// Leave surrounding pieces visible so a small target retains its position on the board.
export function surroundingRegion(region: PhotoRegion): PhotoRegion {
  const width = Math.min(1, Math.max(0.24, region.width * 2));
  const height = Math.min(1, Math.max(0.24, region.height * 2));
  const x = Math.max(0, Math.min(1 - width, region.x + region.width / 2 - width / 2));
  const y = Math.max(0, Math.min(1 - height, region.y + region.height / 2 - height / 2));
  return { x, y, width, height };
}

function visible(evidence: Evidence, ownerId?: string): boolean {
  return evidence.kind !== 'note' && (evidence.scope === 'public' || evidence.ownerId === ownerId);
}

export function presentationEvidence(view: SessionView, ownerId?: string, restore = false): Evidence[] {
  const baseline = restore ? view.session.snapshots.at(-1)?.evidence ?? [] : [];
  const photos = new Map<string, Evidence>();
  for (const evidence of [...baseline, ...view.session.evidence]) if (visible(evidence, ownerId)) photos.set(evidence.id, evidence);
  return [...photos.values()];
}

export function derivePhotoTargets(view: SessionView, ownerId?: string, restore = false): PhotoTarget[] {
  const { session, pack } = view;
  const snapshot = session.snapshots.at(-1);
  const photos = presentationEvidence(view, ownerId, restore);
  const evidenceById = new Map(photos.map(evidence => [evidence.id, evidence]));
  const fallback = photos.find(evidence => evidence.ownerId === ownerId) ?? photos[0];
  return pack.fields.flatMap(field => {
    const subjects: (string|undefined)[] = field.scope === 'public' ? ownerId ? [] : [undefined] : ownerId ? [ownerId] : field.visibility === 'public' ? session.players.map(p=>p.id) : [];
    return subjects.flatMap(subjectOwner => {
    if (!canViewField(field,ownerId,subjectOwner)) return [];
    const publicProjection = (a: Assertion): Assertion => a.ownerId && a.ownerId !== ownerId ? {...a,reason:undefined,evidenceIds:a.evidenceIds.filter(id=>evidenceById.has(id)),region:evidenceById.has(a.evidenceIds[0])?a.region:undefined} : a;
    const ownerAssertions = [...session.assertions,...view.derived].filter(a=>a.ownerId===subjectOwner).map(publicProjection);
    const savedAssertions = restore ? snapshot?.assertions.filter(a=>a.ownerId===subjectOwner).map(publicProjection)??[] : [];
    const ownerQuestions = view.questions.filter(q=>q.ownerId===subjectOwner);
    const assertions = ownerAssertions.filter(assertion => assertion.field === field.key);
    const saved = savedAssertions.filter(assertion => assertion.field === field.key);
    const question = ownerQuestions.find(item => item.field === field.key);
    const mapping = field.preservationId ?? question?.preservationId;
    const preservationIds = session.preservations.filter(item => {
      if (item.ownerId !== subjectOwner) return false;
      const template = pack.preservationTemplates.find(template => template.id === item.templateId);
      return mapping === item.templateId || mapping === item.id || item.templateId === field.key || !!template?.visualFields?.includes(field.key);
    }).map(item => item.id);
    if (!assertions.length && !saved.length && !question && !preservationIds.length) return [];
    const key = targetKey(field.key, subjectOwner);
    const candidates = assertions.filter(assertion => assertion.status !== 'accepted').reverse();
    const accepted = assertions.filter(assertion => assertion.status === 'accepted').at(-1);
    const baseline = saved.filter(assertion => assertion.status === 'accepted').at(-1);
    const sources = restore
      ? [...saved.map(assertion => ({ assertion, snapshot: true })), ...assertions.slice().reverse().map(assertion => ({ assertion, snapshot: false }))]
      : assertions.slice().reverse().map(assertion => ({ assertion, snapshot: false }));
    const locations: TargetLocation[] = [];
    for (const source of sources) {
      // A normalized region belongs to the FIRST referenced photo, never every linked photo.
      const evidence = source.assertion.evidenceIds.map(id => evidenceById.get(id)).find((item): item is Evidence => !!item);
      if (!evidence) continue;
      const id = regionIdentity(evidence.id, source.assertion.id);
      if (locations.some(location => location.id === id)) continue;
      locations.push({ id, targetKey: key, evidence, assertionId: source.assertion.id, region: evidence.id === source.assertion.evidenceIds[0] ? normalizedRegion(source.assertion.region) : undefined, snapshot: source.snapshot, contextOnly: false });
    }
    if (!locations.length && fallback) locations.push({ id: JSON.stringify([fallback.id, key, 'context']), targetKey: key, evidence: fallback, snapshot: false, contextOnly: true });
    return [{ key, field, ownerId: subjectOwner, question, accepted, baseline, candidates, locations, preservationIds, derived: pack.derivedRules.some(rule => rule.field === field.key && rule.scope === field.scope) }];
    });
  });
}

export function targetsForPreservation(targets: PhotoTarget[], preservation: Preservation): PhotoTarget[] {
  return targets.filter(target => target.ownerId === preservation.ownerId && target.preservationIds.includes(preservation.id));
}

export function targetLocation(target: PhotoTarget, locationId?: string, evidenceId?: string): TargetLocation | undefined {
  return target.locations.find(location => location.id === locationId)
    ?? target.locations.find(location => location.evidence.id === evidenceId && location.region)
    ?? target.locations.find(location => location.evidence.id === evidenceId)
    ?? target.locations[0];
}

export function regionsForEvidence(targets: PhotoTarget[], evidenceId: string): TargetLocation[] {
  return targets.flatMap(target => target.locations.filter(location => location.evidence.id === evidenceId && !!location.region));
}
