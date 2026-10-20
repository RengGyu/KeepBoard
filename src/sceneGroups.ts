import { isBoardSlotType, type ComponentScene, type SceneComponent } from '../shared/scene';
import { editSceneSelection } from '../shared/sceneEditing';

export interface SceneGroup { key: string; component: SceneComponent; ids: string[]; quantity: number | null }

/** A semantic inline-number selection deletes the number, never its terrain/source. */
export function deleteSceneGroupSelection(scene: ComponentScene, ids: readonly string[], inlineNumberIds: readonly string[]): ComponentScene {
  const inline = new Set(inlineNumberIds.filter(id => scene.components.some(c => c.id === id && c.kind === 'terrain')));
  const next = editSceneSelection(scene, ids.filter(id => !inline.has(id)), 'delete');
  return inline.size ? { ...next, components: next.components.map(c => inline.has(c.id) && ids.includes(c.id) ? { ...c, number: null } : c) } : next;
}

/** Presentation only: raw ids, quantities, inline numbers and photo sources stay untouched. */
export function groupSceneComponents(scene: ComponentScene): SceneGroup[] {
  const entries: { component: SceneComponent; ids: string[]; quantity: number | null }[] = [];
  const numbers = new Map<string, { entry: typeof entries[number]; inline: boolean; paired: boolean }[]>();
  for (const c of scene.components) {
    if (c.kind !== 'number-token') entries.push({ component: c.kind === 'terrain' ? { ...c, number: undefined } : c, ids: [c.id], quantity: c.quantity });
    if (c.kind !== 'number-token' && !(c.kind === 'terrain' && typeof c.number === 'number')) continue;
    const number = c.kind === 'terrain' ? { ...c, kind: 'number-token' as const, variant: null, ownerId: null } : c;
    const anchor = isBoardSlotType(c.location.type) && c.location.id && c.quantity === 1 ? JSON.stringify([c.location.type, c.location.id, c.number ?? null]) : null;
    const inline = c.kind === 'terrain';
    const prior = anchor ? numbers.get(anchor)?.find(n => n.inline !== inline && !n.paired) : undefined;
    if (prior) { prior.entry.ids.push(c.id); prior.paired = true; continue; }
    const entry = { component: number, ids: [c.id], quantity: c.quantity };
    entries.push(entry); if (anchor) numbers.set(anchor, [...(numbers.get(anchor) ?? []), { entry, inline, paired: false }]);
  }
  const groups = new Map<string, SceneGroup>();
  for (const entry of entries) {
    const c = entry.component;
    const key = JSON.stringify([c.kind, c.variant, c.ownerId, c.kind === 'number-token' ? c.number ?? null : null, c.ratio ?? null, c.face ?? null]);
    const prior = groups.get(key);
    if (prior) { prior.ids.push(...entry.ids); prior.quantity = prior.quantity === null || entry.quantity === null ? null : prior.quantity + entry.quantity; }
    else groups.set(key, { key, ...entry });
  }
  return [...groups.values()].map(g => ({ ...g, ids: [...new Set(g.ids)] }));
}
