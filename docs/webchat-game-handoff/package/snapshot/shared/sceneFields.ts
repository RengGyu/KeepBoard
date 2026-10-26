import type { FieldDefinition, Value } from './types';
import { resolveSlotId, type ComponentScene } from './scene';

export function isSceneField(field: Pick<FieldDefinition, 'key' | 'presentation'>): boolean {
  return field.presentation === 'scene' || ['board.layout', 'components.observed', 'player.components.observed'].includes(field.key);
}

/** Keep the public board and the separately questioned robber anchor in one answer transaction. */
export function sceneAnswers(fieldKey: string, scene: ComponentScene, ownerId: string | undefined, fields: Pick<FieldDefinition, 'key' | 'scope'>[]): { field: string; value: Value; ownerId?: string }[] {
  const answers = [{ field: fieldKey, ownerId, value: scene as unknown as Value }];
  if (fieldKey !== 'board.layout' || ownerId !== undefined || !fields.some(field => field.key === 'robber.hexAnchor' && field.scope === 'public')) return answers;
  const robbers = scene.components.filter(component => component.kind === 'robber' && component.quantity !== 0);
  const robber = robbers.length === 1 && robbers[0].quantity === 1 ? robbers[0] : undefined;
  const anchor = robber?.location.type === 'hex' ? resolveSlotId('hex', robber.location.id) : null;
  answers.push({ field: 'robber.hexAnchor', ownerId: undefined, value: anchor });
  return answers;
}
