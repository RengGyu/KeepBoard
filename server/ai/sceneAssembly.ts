import type { Assertion, Evidence, Value } from '../../shared/types.ts';
import { normalizeScene, isBoardSlotType, type SceneComponent } from '../../shared/scene.ts';

const sceneFields = new Set(['board.layout', 'components.observed', 'player.components.observed']);
const signature = (c: SceneComponent) => JSON.stringify([c.kind, c.variant, c.ownerId, c.quantity, c.number, c.ratio, c.face, c.direction, c.note]);

/** Assemble only observations from this analysis and the same owner/capture. Never reads saved facts. */
export function assembleSceneAssertions(assertions: Assertion[], evidence: Evidence[], fields: ReadonlySet<string> = sceneFields): Assertion[] {
  const groups = new Map<string, Assertion[]>();
  const output: Assertion[] = [];
  for (const assertion of assertions) {
    if (!fields.has(assertion.field)) { output.push(assertion); continue; }
    const epochs = [...new Set(assertion.evidenceIds.map(id => evidence.find(e => e.id === id)?.captureEpoch))].sort();
    const key = JSON.stringify([assertion.ownerId ?? null, epochs, ['board.layout', 'components.observed'].includes(assertion.field) ? 'public-board' : assertion.field]);
    groups.set(key, [...(groups.get(key) ?? []), assertion]);
  }
  for (const group of groups.values()) {
    if (group.length === 1) { output.push(group[0]); continue; }
    const full = group.find(a => a.field === 'board.layout');
    const primary = full ?? group[0];
    const scene = normalizeScene(primary.value);
    scene.components = [];
    const used = new Set<string>();
    for (const assertion of group) {
      const incoming = normalizeScene(assertion.value);
      const mapping = new Map<string, string>();
      const additions: SceneComponent[] = [];
      for (const c of incoming.components) {
        // Exact anchored repeats are one observation; loose lookalikes are never an identity proof.
        const repeat = scene.components.find(old => !c.attachedToId && !old.attachedToId && signature(old) === signature(c) && (
          isBoardSlotType(c.location.type) && c.location.id !== null && old.location.type === c.location.type && old.location.id === c.location.id ||
          c.region !== null && old.evidenceId === c.evidenceId && JSON.stringify(old.region) === JSON.stringify(c.region) && JSON.stringify(old.location) === JSON.stringify(c.location)
        ));
        if (repeat) { mapping.set(c.id, repeat.id); continue; }
        let id = c.id;
        for (let n = 2; used.has(id); n++) id = `${c.id}-${n}`;
        used.add(id); mapping.set(c.id, id);
        const copy = { ...c, id };
        scene.components.push(copy); additions.push(copy);
      }
      for (const c of additions) if (c.attachedToId) c.attachedToId = mapping.get(c.attachedToId) ?? null;
    }
    // A set of partial photographs never proves full coverage on its own.
    scene.coverage = full ? 'full' : group.every(a => normalizeScene(a.value).coverage === 'catalog') ? 'catalog' : 'partial';
    output.push({ ...primary, field: full ? 'board.layout' : primary.field, value: scene as unknown as Value,
      evidenceIds: [...new Set([ ...primary.evidenceIds, ...group.flatMap(a => a.evidenceIds)])] });
  }
  return output;
}
