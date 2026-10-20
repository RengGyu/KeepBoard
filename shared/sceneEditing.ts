import type { ComponentScene, SceneKind } from './scene';

export const canEditOwner = (kind: SceneKind) =>
  ['road', 'settlement', 'city', 'resource-card', 'development-card', 'deck'].includes(kind);

/** A single immutable history entry, including dependent attachment cleanup. */
export function editSceneSelection(scene: ComponentScene, ids: readonly string[], edit: 'delete' | { ownerId: string | null }): ComponentScene {
  const selected = new Set(ids);
  const pieces = scene.components.filter(c => selected.has(c.id));
  if (!pieces.length || (edit !== 'delete' && pieces.some(c => !canEditOwner(c.kind)))) return scene;
  if (edit === 'delete') return { ...scene, components: scene.components.filter(c => !selected.has(c.id)).map(c =>
    c.attachedToId && selected.has(c.attachedToId) ? { ...c, attachedToId: null } : c) };
  if (pieces.every(c => c.ownerId === edit.ownerId)) return scene;
  return { ...scene, components: scene.components.map(c => selected.has(c.id) ? { ...c, ownerId: edit.ownerId } : c) };
}
