import type { ComponentScene, SceneComponent } from './scene';
import { normalizeScene, CATAN_TOPOLOGY, resolveSlotId } from './scene';

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(record) : [];
const variants: Record<string, string> = { wood:'forest', lumber:'forest', sheep:'pasture', wool:'pasture', brick:'hills', wheat:'fields', grain:'fields', ore:'mountains' };
const hexId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^r([1-5])c([1-5])(?:\s|$)/);
  if (!match) return null;
  const row = Number(match[1]), column = Number(match[2]);
  return column <= [3,4,5,4,3][row - 1] ? `r${row}c${column}` : null;
};

function legacyLocation(kind: SceneComponent['kind'], anchor: unknown): SceneComponent['location'] {
  const type = kind === 'road' || kind === 'harbor' ? 'edge' : kind === 'settlement' || kind === 'city' ? 'vertex' : 'hex';
  if (typeof anchor !== 'string') return {type:'unplaced',id:null};
  let id = resolveSlotId(type, anchor) || (type === 'hex' ? hexId(anchor) : null);
  if (!id && type === 'edge') {
    const endpoints = anchor.match(/^(r\dc\d):([A-Z]{1,2})-([A-Z]{1,2})$/i);
    if (endpoints) {
      const a = resolveSlotId('vertex', `${endpoints[1]}.${endpoints[2]}`), b = resolveSlotId('vertex', `${endpoints[1]}.${endpoints[3]}`);
      id = CATAN_TOPOLOGY.edges.find(edge => edge.vertexIds.includes(a!) && edge.vertexIds.includes(b!))?.id || null;
    }
  }
  if (!id && type !== 'hex') {
    const hexes = [...new Set(anchor.match(/r[1-5]c[1-5]/g) || [])];
    if (type === 'edge' && hexes.length === 2) id = CATAN_TOPOLOGY.edges.find(edge => hexes.every(hex => edge.hexIds.includes(hex)))?.id || null;
    if (type === 'vertex' && hexes.length === 3) id = CATAN_TOPOLOGY.vertices.find(vertex => hexes.every(hex => vertex.hexIds.includes(hex)))?.id || null;
  }
  return id ? {type,id} : {type:'unplaced',id:null};
}

// Old free-form layouts stay available; ambiguous verbal edges remain explicitly unplaced.
export function toComponentScene(value: unknown, evidenceId?: string): ComponentScene {
  const source = record(value);
  if ((source.version === 1 || source.version === 2) && Array.isArray(source.components)) return normalizeScene(source);
  const components: SceneComponent[] = [];
  const add = (kind: SceneComponent['kind'], item: Record<string, unknown>, index: number) => {
    const anchor = item.location ?? item.anchor ?? item.id;
    const location = legacyLocation(kind, anchor);
    const rawVariant = item.variant ?? item.resource ?? item.terrain;
    const variant = typeof rawVariant === 'string' ? variants[rawVariant] || rawVariant : null;
    const number = typeof item.number === 'number' ? item.number : null;
    const owner = item.ownerId ?? item.owner;
    components.push({ id: `${kind}-${index}`, kind, variant, number, ownerId: typeof owner === 'string' ? owner : null, quantity: typeof item.quantity === 'number' ? item.quantity : 1, location, region: null, evidenceId: evidenceId || null, direction: null, note: typeof anchor === 'string' && !location.id ? `이전 배치 기록: ${anchor}` : '' });
  };
  const tiles = list(source.tiles ?? source.hexes);
  tiles.forEach((tile, i) => add('terrain',tile,i));
  const pieces: Record<string, unknown>[] = [...list(source.pieces), ...list(source.roads).map(x => ({...x,type:'road'})), ...list(source.settlements).map(x => ({...x,type:'settlement'})), ...list(source.cities).map(x => ({...x,type:'city'}))];
  pieces.forEach((piece,i) => {
    const kind = piece.type ?? piece.kind;
    if (['road','settlement','city','robber'].includes(String(kind))) add(kind as SceneComponent['kind'],piece,i);
  });
  list(source.harbors ?? source.ports).forEach((harbor, i) => { add('harbor', harbor, i); const c = components.at(-1)!; c.ownerId = null; c.ratio = typeof harbor.ratio === 'number' ? harbor.ratio : null; });
  const robberTile = tiles.find(tile => tile.hasRobber === true || tile.robber === true);
  const robber = record(source.robber);
  const robberAnchor = robber.tileId ?? robber.location ?? (typeof source.robber === 'string' ? source.robber : undefined) ?? robberTile?.id ?? robberTile?.anchor;
  if (robberAnchor && !components.some(c => c.kind === 'robber')) add('robber',{anchor:robberAnchor},0);
  return normalizeScene({version:1,coverage:tiles.length === 19 ? 'full' : 'partial',components});
}

export function hasCompleteBoard(scene: ComponentScene): boolean {
  return scene.coverage === 'full' && !scene.components.some(c => ['road','settlement','city','robber'].includes(c.kind) && (!['hex','edge','vertex'].includes(c.location.type) || !c.location.id)) && new Set(scene.components.filter(c => c.kind === 'terrain' && c.location.type === 'hex' && c.location.id).map(c => c.location.id)).size === 19;
}
