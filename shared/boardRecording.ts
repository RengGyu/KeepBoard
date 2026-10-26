import type { Assertion, SessionView } from './types';
import { resolveSlotId, type ComponentScene, type SceneComponent, type SceneLayer } from './scene';
import { toComponentScene } from './sceneBridge';

const boardKinds = new Set(['terrain', 'number-token', 'road', 'settlement', 'city', 'robber', 'harbor']);
const layer = (c: SceneComponent) => ['settlement', 'city'].includes(c.kind) ? 'buildings' : c.kind;
const slot = (c: SceneComponent) => ['hex', 'edge', 'vertex'].includes(c.location.type) && c.location.id
  ? `${layer(c)}:${resolveSlotId(c.location.type as 'hex' | 'edge' | 'vertex', c.location.id)}` : null;
const sameSource = (a: SceneComponent, b: SceneComponent) => a.id === b.id && !!a.evidenceId && a.evidenceId === b.evidenceId && !!a.region && JSON.stringify(a.region) === JSON.stringify(b.region) && a.kind === b.kind;

/** Prepare ONE board for correction, before moving pieces, so occupied-slot swaps see the saved board.
 * A unique observed slot replaces that layer only. Ambiguities remain visible to the editor.
 * Loose pieces from different photos are never inferred to be the same physical object.
 */
export function mergeBoardObservation(base: ComponentScene, incoming: ComponentScene): ComponentScene {
  const components = structuredClone(base.components);
  const additions = structuredClone(incoming.components);
  const incomingSlots = additions.map(slot);
  const remap = new Map<string, string>();
  for (const addition of additions) {
    const target = slot(addition);
    const matches = components.map((c, index) => ({ c, index })).filter(({ c }) => target ? slot(c) === target : sameSource(c, addition));
    const original = addition.id;
    if (matches.length === 1 && (!target || incomingSlots.filter(s => s === target).length === 1)) {
      const [previous] = components.splice(matches[0].index, 1);
      addition.id = previous.id;
    }
    while (components.some(c => c.id === addition.id) || additions.some(c => c !== addition && c.id === addition.id)) addition.id += '-observed';
    remap.set(original, addition.id);
    components.push(addition);
  }
  for (const c of additions) if (c.attachedToId && remap.has(c.attachedToId)) c.attachedToId = remap.get(c.attachedToId)!;
  const coverageByLayer = { ...base.coverageByLayer };
  const layers: Partial<Record<SceneComponent['kind'], SceneLayer>> = { terrain: 'terrain', 'number-token': 'numbers', road: 'roads', settlement: 'buildings', city: 'buildings', harbor: 'harbors' };
  for (const c of additions) {
    const affected = layers[c.kind];
    if (affected) coverageByLayer[affected] = incoming.coverage === 'full' ? incoming.coverageByLayer?.[affected] ?? 'unknown' : 'unknown';
    if (c.kind === 'terrain') coverageByLayer.numbers = 'unknown';
  }
  return { version: 2, coverage: 'partial', coverageByLayer, components };
}

export function recordedScene(view: SessionView, fieldKey: string, assertion?: Assertion, ownerId?: string) {
  const source = toComponentScene(assertion?.value, assertion?.evidenceIds[0]);
  const promote = view.pack.fields.some(f => f.key === 'board.layout' && f.scope === 'public') && view.pack.id === 'catan-base' && !ownerId && fieldKey === 'components.observed' && source.components.some(c => boardKinds.has(c.kind));
  const board = view.session.assertions.filter(a => a.field === 'board.layout' && !a.ownerId && a.status === 'accepted').at(-1);
  const newer = !board || !!assertion && (assertion.updatedAt > board.updatedAt || assertion.updatedAt === board.updatedAt && view.session.assertions.indexOf(assertion) > view.session.assertions.indexOf(board));
  return {
    fieldKey: promote ? 'board.layout' : fieldKey,
    scene: promote && board ? newer ? mergeBoardObservation(toComponentScene(board.value, board.evidenceIds[0]), source) : toComponentScene(board.value, board.evidenceIds[0]) : promote && source.coverage === 'catalog' ? { ...source, coverage: 'partial' as const } : source,
    forceSave: !!assertion && (promote ? newer : assertion.status !== 'accepted'),
  };
}
