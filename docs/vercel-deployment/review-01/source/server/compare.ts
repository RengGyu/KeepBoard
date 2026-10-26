import type { FieldDefinition, Value } from '../shared/types.ts';

function canonical(value: Value, unorderedComponents: boolean): string {
  if (Array.isArray(value)) {
    const items = value.map(item => canonical(item, unorderedComponents));
    if (unorderedComponents && value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) items.sort();
    return `[${items.join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key], unorderedComponents)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sceneState(value: Value): Value {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![1,2].includes(Number(value.version)) || !Array.isArray(value.components)) return value;
  return { version: 2, coverage: value.coverage, coverageByLayer: value.coverageByLayer && typeof value.coverageByLayer === 'object' && !Array.isArray(value.coverageByLayer) ? Object.fromEntries(Object.entries(value.coverageByLayer).filter(([,v])=>v!=='unknown')) : {}, components: value.components.map(component => {
    if (!component || typeof component !== 'object' || Array.isArray(component)) return component;
    const { evidenceId, region, note, ...state } = component;
    return state;
  }) };
}

function rummikubState(value: Value): Value {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const tiles = (items: Value): Value => Array.isArray(items) ? items.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const { id, evidenceIds, region, note, ...state } = item;
    return state;
  }) : items;
  return {
    version: value.version, ownerId: value.ownerId, coverage: value.coverage,
    groups: Array.isArray(value.groups) ? value.groups.map(group => group && typeof group === 'object' && !Array.isArray(group) ? { tiles: tiles(group.tiles) } : group) : value.groups,
    loose: tiles(value.loose),
  };
}

export function compareStateValues(field: FieldDefinition, expected: Value, observed: Value): boolean {
  const rummikub = (value: Value) => value && typeof value === 'object' && !Array.isArray(value) && value.version === 'rummikub-classic-v1';
  if (['table.scene', 'rack.scene'].includes(field.key) && rummikub(expected) && rummikub(observed)) {
    // Group order is actual Rummikub state; new photo IDs and crops are only evidence.
    return canonical(rummikubState(expected), false) === canonical(rummikubState(observed), false);
  }
  if (field.presentation === 'scene' || field.key === 'board.layout' || field.key.endsWith('components.observed')) {
    expected = sceneState(expected); observed = sceneState(observed);
  }
  const unorderedComponents = field.group === 'board' || field.key === 'board.layout' || field.presentation === 'scene' || field.key.endsWith('components.observed');
  return canonical(expected, unorderedComponents) === canonical(observed, unorderedComponents);
}
