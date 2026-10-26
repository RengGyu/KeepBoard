import type { FieldDefinition, GamePack } from '../../shared/types.ts';
import {recognitionCapability,recognitionFields} from '../../shared/recognition.ts';

/** A derived conclusion is not independent photographic evidence. */
export function observableFields(pack: GamePack): FieldDefinition[] {
  if(recognitionCapability(pack).mode==='assisted')return [...new Map([...recognitionFields(pack),...recognitionFields(pack,'owner-context')].map(f=>[f.key,f])).values()];
  if(pack.runtime?.support.recognition==='manual')return [];
  const derived = new Set((pack.derivedRules ?? []).map(rule => rule.field));
  return pack.fields.filter(field => field.acquisition === 'observe' && !derived.has(field.key));
}

export function observationDefinition({ key, label, description, type, scope, visibility, presentation, options }: FieldDefinition) {
  return { key, label, description, type, scope, visibility, presentation, options };
}
