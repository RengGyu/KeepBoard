import type { FieldDefinition, GamePack } from '../../shared/types.ts';

/** A derived conclusion is not independent photographic evidence. */
export function observableFields(pack: GamePack): FieldDefinition[] {
  const derived = new Set((pack.derivedRules ?? []).map(rule => rule.field));
  return pack.fields.filter(field => field.acquisition === 'observe' && !derived.has(field.key));
}

export function observationDefinition({ key, label, description, type, scope, visibility, presentation, options }: FieldDefinition) {
  return { key, label, description, type, scope, visibility, presentation, options };
}
