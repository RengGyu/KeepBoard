// Common component scene: discrete physical components, where they sit, and which photo shows them.
// Geometry here says which slot a piece *fits*; it never decides whether a play was legal.

export const SCENE_VERSION = 2 as const;
export const SCENE_COVERAGES = ['full', 'partial', 'catalog'] as const;
export const SCENE_KINDS = ['terrain', 'number-token', 'road', 'settlement', 'city', 'robber', 'resource-card', 'development-card', 'token', 'deck', 'container', 'harbor', 'unknown'] as const;
export const SCENE_LOCATION_TYPES = ['hex', 'edge', 'vertex', 'area', 'unplaced'] as const;

export type SceneCoverage = typeof SCENE_COVERAGES[number];
export type SceneKind = typeof SCENE_KINDS[number];
export type SceneLocationType = typeof SCENE_LOCATION_TYPES[number];
export type BoardSlotType = 'hex' | 'edge' | 'vertex';
export type SceneFace = 'front' | 'back';
export const SCENE_FACE_LABELS: Record<SceneFace, string> = { front: '앞면', back: '뒷면' };
export interface SceneRegion { x: number; y: number; width: number; height: number }
// id null = the type is known but the exact slot/area is not (e.g. robber visible, hex unreadable).
export interface SceneLocation { type: SceneLocationType; id: string | null }
export interface SceneComponent {
  id: string;
  kind: SceneKind;
  variant: string | null;
  ownerId: string | null;
  quantity: number | null;
  location: SceneLocation;
  // Normalized crop in evidenceId's photo. Independent of the illustrated board position.
  region: SceneRegion | null;
  evidenceId: string | null;
  number?: number | null;
  ratio?: number | null;
  direction?: number | null;
  // Which side faces up (cards, tiles, tokens); null = not readable.
  face?: SceneFace | null;
  // Another component this one sits on or belongs to (e.g. token on a card). Must reference an existing id.
  attachedToId?: string | null;
  note?: string;
}
export type SceneLayer = 'terrain' | 'numbers' | 'buildings' | 'roads' | 'harbors';
export type LayerCoverage = 'complete' | 'partial' | 'unknown';
export interface ComponentScene { version: 1 | 2; coverage: SceneCoverage; components: SceneComponent[]; coverageByLayer?: Partial<Record<SceneLayer, LayerCoverage>> }

export const SCENE_COVERAGE_LABELS: Record<SceneCoverage, string> = { full: '보드 전체', partial: '일부만', catalog: '구성물 목록' };
export const SCENE_KIND_LABELS: Record<SceneKind, string> = {
  harbor: '항구', terrain: '지형 타일', 'number-token': '숫자 토큰', road: '도로', settlement: '정착지', city: '도시', robber: '도둑',
  'resource-card': '자원 카드', 'development-card': '개발 카드', token: '기타 토큰', deck: '카드 더미', container: '보관함', unknown: '알 수 없음',
};
export const SCENE_LOCATION_LABELS: Record<SceneLocationType, string> = { hex: '타일', edge: '변', vertex: '꼭짓점', area: '보드 밖 영역', unplaced: '위치 미기록' };

export interface SceneOption { value: string; label: string }
export const SCENE_VARIANTS: Partial<Record<SceneKind, SceneOption[]>> = {
  harbor: [{ value: 'generic', label: '일반 항구' }, ...['lumber', 'brick', 'wool', 'grain', 'ore'].map((value, i) => ({ value, label: ['목재', '벽돌', '양모', '곡물', '광석'][i] + ' 항구' }))],
  terrain: [
    { value: 'forest', label: '숲' }, { value: 'pasture', label: '목초지' }, { value: 'fields', label: '밭' },
    { value: 'hills', label: '언덕' }, { value: 'mountains', label: '산' }, { value: 'desert', label: '사막' },
  ],
  'resource-card': [
    { value: 'lumber', label: '목재' }, { value: 'wool', label: '양모' }, { value: 'grain', label: '곡물' },
    { value: 'brick', label: '벽돌' }, { value: 'ore', label: '광석' }, { value: 'hidden', label: '뒷면(종류 모름)' },
  ],
  'development-card': [
    { value: 'knight', label: '기사' }, { value: 'victory-point', label: '승점' }, { value: 'road-building', label: '도로 건설' },
    { value: 'year-of-plenty', label: '풍년' }, { value: 'monopoly', label: '독점' }, { value: 'hidden', label: '뒷면(종류 모름)' },
  ],
  deck: [
    { value: 'development', label: '개발 카드' }, { value: 'lumber', label: '목재' }, { value: 'wool', label: '양모' },
    { value: 'grain', label: '곡물' }, { value: 'brick', label: '벽돌' }, { value: 'ore', label: '광석' },
  ],
  token: [
    { value: 'longest-road', label: '최장 교역로 카드' }, { value: 'largest-army', label: '최대 기사단 카드' },
    { value: 'harbor', label: '항구' }, { value: 'building-cost', label: '건설 비용표' },
  ],
  container: [{ value: 'box', label: '상자' }, { value: 'tray', label: '트레이' }, { value: 'bag', label: '봉투' }],
};
const VARIANT_ALIASES: Partial<Record<SceneKind, Record<string, string>>> = {
  terrain: {
    wood: 'forest', lumber: 'forest', woods: 'forest', 숲: 'forest', sheep: 'pasture', wool: 'pasture', pastures: 'pasture', 목초지: 'pasture',
    wheat: 'fields', grain: 'fields', field: 'fields', 밭: 'fields', brick: 'hills', hill: 'hills', 언덕: 'hills',
    ore: 'mountains', mountain: 'mountains', 산: 'mountains', 산지: 'mountains', sand: 'desert', 사막: 'desert',
  },
  'resource-card': {
    wood: 'lumber', forest: 'lumber', 목재: 'lumber', 나무: 'lumber', sheep: 'wool', pasture: 'wool', 양모: 'wool', 양: 'wool',
    wheat: 'grain', fields: 'grain', 곡물: 'grain', 밀: 'grain', hills: 'brick', 벽돌: 'brick', mountains: 'ore', 광석: 'ore', 철: 'ore',
  },
};

export const SCENE_AREAS: SceneOption[] = [
  { value: 'supply', label: '공용 공급처' }, { value: 'bank', label: '은행 카드 더미' }, { value: 'player', label: '플레이어 앞' },
  { value: 'hand', label: '손패' }, { value: 'discard', label: '사용·버린 카드' }, { value: 'box', label: '상자 안' }, { value: 'table', label: '테이블 기타' },
];

const BOARD_SLOTS: Record<SceneKind, BoardSlotType[]> = {
  harbor: ['edge'], terrain: ['hex'], 'number-token': ['hex'], robber: ['hex'], road: ['edge'], settlement: ['vertex'], city: ['vertex'],
  'resource-card': [], 'development-card': [], deck: [], container: [], token: ['hex', 'edge', 'vertex'], unknown: ['hex', 'edge', 'vertex'],
};
export function boardSlotTypes(kind: SceneKind): BoardSlotType[] { return BOARD_SLOTS[kind]; }
export function compatibleLocationTypes(kind: SceneKind): SceneLocationType[] { return [...BOARD_SLOTS[kind], 'area', 'unplaced']; }
export function isBoardSlotType(type: SceneLocationType): type is BoardSlotType { return type === 'hex' || type === 'edge' || type === 'vertex'; }
// Geometric fit only. A settlement next to another settlement still "fits" its vertex.
export function isCompatibleLocation(kind: SceneKind, location: SceneLocation): boolean {
  if (!compatibleLocationTypes(kind).includes(location.type)) return false;
  if (location.type === 'unplaced') return location.id === null;
  if (location.id === null || location.type === 'area') return true;
  return Boolean(CATAN_TOPOLOGY.byId[location.type].has(location.id));
}
export function usesNumber(kind: SceneKind) { return kind === 'terrain' || kind === 'number-token'; }
export const CATAN_NUMBERS = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

// ---------- Catan base 19-hex topology ----------
// Pointy-top hexes, circumradius 1. Hex ids follow the pack's anchors: r{row}c{column}, axial q/r with r3c3 at 0,0.
// Shared corners/sides get one canonical id: the first hex in reading order that touches it + its local name.
export const HEX_CORNERS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'] as const;
export const HEX_SIDES = ['NE', 'E', 'SE', 'SW', 'W', 'NW'] as const;
export type HexCorner = typeof HEX_CORNERS[number];
export type HexSide = typeof HEX_SIDES[number];
export const CORNER_LABELS: Record<HexCorner, string> = { N: '북쪽', NE: '북동쪽', SE: '남동쪽', S: '남쪽', SW: '남서쪽', NW: '북서쪽' };
export const SIDE_LABELS: Record<HexSide, string> = { NE: '북동쪽', E: '동쪽', SE: '남동쪽', SW: '남서쪽', W: '서쪽', NW: '북서쪽' };

export interface Point { x: number; y: number }
export interface TopologyHex extends Point { id: string; row: number; column: number; q: number; r: number; vertexIds: string[]; edgeIds: string[]; neighborHexIds: string[] }
export interface TopologyVertex extends Point { id: string; hexIds: string[]; edgeIds: string[]; aliases: string[] }
export interface TopologyEdge extends Point { id: string; angle: number; vertexIds: [string, string]; hexIds: string[]; aliases: string[] }
export interface BoardTopology {
  id: 'catan-base-19';
  hexes: TopologyHex[]; vertices: TopologyVertex[]; edges: TopologyEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  byId: { hex: Map<string, TopologyHex>; vertex: Map<string, TopologyVertex>; edge: Map<string, TopologyEdge> };
  aliases: { vertex: Map<string, string>; edge: Map<string, string> };
}

const SQRT3_2 = Math.sqrt(3) / 2;
// Lattice units: x in √3/2, y in 1/2, so every corner is an exact integer pair.
const CORNER_OFFSETS: [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];

function buildTopology(): BoardTopology {
  const hexes: TopologyHex[] = [];
  const vertices = new Map<string, TopologyVertex>();
  const edges = new Map<string, TopologyEdge>();
  const vertexByKey = new Map<string, TopologyVertex>();
  const edgeByKey = new Map<string, TopologyEdge>();
  const vertexAliases = new Map<string, string>();
  const edgeAliases = new Map<string, string>();
  for (let r = -2; r <= 2; r++) {
    const qMin = Math.max(-2, -2 - r), qMax = Math.min(2, 2 - r);
    for (let q = qMin; q <= qMax; q++) {
      const row = r + 3, column = q - qMin + 1, id = `r${row}c${column}`;
      const cx = 2 * q + r, cy = 3 * r;
      const hex: TopologyHex = { id, row, column, q, r, x: cx * SQRT3_2, y: cy / 2, vertexIds: [], edgeIds: [], neighborHexIds: [] };
      hexes.push(hex);
      const cornerKeys = CORNER_OFFSETS.map(([dx, dy]) => [cx + dx, cy + dy] as const);
      cornerKeys.forEach(([X, Y], index) => {
        const key = `${X},${Y}`, alias = `${id}.${HEX_CORNERS[index]}`;
        let vertex = vertexByKey.get(key);
        if (!vertex) { vertex = { id: alias, x: X * SQRT3_2, y: Y / 2, hexIds: [], edgeIds: [], aliases: [] }; vertexByKey.set(key, vertex); vertices.set(alias, vertex); }
        vertex.hexIds.push(id); vertex.aliases.push(alias); vertexAliases.set(alias, vertex.id); hex.vertexIds.push(vertex.id);
      });
      HEX_SIDES.forEach((side, index) => {
        const a = cornerKeys[index], b = cornerKeys[(index + 1) % 6];
        const key = [`${a[0]},${a[1]}`, `${b[0]},${b[1]}`].sort().join('|'), alias = `${id}.${side}`;
        let edge = edgeByKey.get(key);
        if (!edge) {
          const va = vertexByKey.get(`${a[0]},${a[1]}`)!, vb = vertexByKey.get(`${b[0]},${b[1]}`)!;
          const angle = Math.round(Math.atan2(vb.y - va.y, vb.x - va.x) * 180 / Math.PI + 360) % 180;
          edge = { id: alias, x: (va.x + vb.x) / 2, y: (va.y + vb.y) / 2, angle, vertexIds: [va.id, vb.id], hexIds: [], aliases: [] };
          edgeByKey.set(key, edge); edges.set(alias, edge); va.edgeIds.push(edge.id); vb.edgeIds.push(edge.id);
        }
        edge.hexIds.push(id); edge.aliases.push(alias); edgeAliases.set(alias, edge.id); hex.edgeIds.push(edge.id);
      });
    }
  }
  for (const edge of edges.values()) if (edge.hexIds.length === 2) {
    const [a, b] = edge.hexIds.map(id => hexes.find(hex => hex.id === id)!);
    a.neighborHexIds.push(b.id); b.neighborHexIds.push(a.id);
  }
  const vertexList = [...vertices.values()], edgeList = [...edges.values()];
  const xs = vertexList.map(v => v.x), ys = vertexList.map(v => v.y);
  return {
    id: 'catan-base-19', hexes, vertices: vertexList, edges: edgeList,
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
    byId: { hex: new Map(hexes.map(h => [h.id, h])), vertex: vertices, edge: edges },
    aliases: { vertex: vertexAliases, edge: edgeAliases },
  };
}
export const CATAN_TOPOLOGY: BoardTopology = buildTopology();

// Accepts r3c2, r3c2.N, R3C2-n, "r3c2 N", r3c2:NE and returns the canonical slot id, or null.
export function resolveSlotId(type: BoardSlotType, raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const match = raw.trim().match(/^r(\d+)\s*c(\d+)(?:\s*[.:\-_ ]\s*([a-z]{1,2}))?$/i);
  if (!match) return null;
  const hexId = `r${Number(match[1])}c${Number(match[2])}`, part = match[3]?.toUpperCase();
  if (!CATAN_TOPOLOGY.byId.hex.has(hexId)) return null;
  if (type === 'hex') return part ? null : hexId;
  if (!part) return null;
  return CATAN_TOPOLOGY.aliases[type].get(`${hexId}.${part}`) ?? null;
}
export function slotPoint(location: SceneLocation): Point | null {
  if (!isBoardSlotType(location.type) || !location.id) return null;
  return CATAN_TOPOLOGY.byId[location.type].get(location.id) ?? null;
}
export function slotLabel(location: SceneLocation): string {
  const { type, id } = location;
  if (type === 'unplaced') return SCENE_LOCATION_LABELS.unplaced;
  if (type === 'area') return id ? (SCENE_AREAS.find(area => area.value === id)?.label ?? id) : '보드 밖(영역 모름)';
  if (!id) return `${SCENE_LOCATION_LABELS[type]} 위치 모름`;
  if (type === 'hex') return `${id} 타일`;
  const [hexId, part] = id.split('.');
  return type === 'vertex' ? `${hexId} ${CORNER_LABELS[part as HexCorner]} 꼭짓점` : `${hexId} ${SIDE_LABELS[part as HexSide]} 변`;
}

export interface SnapOptions { maxDistance?: Partial<Record<BoardSlotType, number>>; types?: BoardSlotType[] }
const SNAP_DISTANCE: Record<BoardSlotType, number> = { hex: 0.95, edge: 0.45, vertex: 0.45 };
// Nearest geometrically compatible board slot for a point in topology units, or null if nothing is close.
export function snapToSlot(kind: SceneKind, point: Point, options: SnapOptions = {}): SceneLocation | null {
  const types = (options.types ?? BOARD_SLOTS[kind]).filter(type => BOARD_SLOTS[kind].includes(type));
  let best: { location: SceneLocation; score: number } | null = null;
  for (const type of types) {
    const limit = options.maxDistance?.[type] ?? SNAP_DISTANCE[type];
    for (const slot of CATAN_TOPOLOGY.byId[type].values()) {
      if (kind === 'harbor' && !coastalEdge(slot.id)) continue;
      const distance = Math.hypot(slot.x - point.x, slot.y - point.y);
      if (distance > limit) continue;
      const score = distance / limit;
      if (!best || score < best.score) best = { location: { type, id: slot.id }, score };
    }
  }
  return best?.location ?? null;
}

// ---------- Normalization ----------
export interface SceneNormalization { scene: ComponentScene; adjustments: string[]; recognized: boolean }

const KIND_ALIASES: Record<string, SceneKind> = {
  tile: 'terrain', hex: 'terrain', terraintile: 'terrain', number: 'number-token', numbertoken: 'number-token', chit: 'number-token',
  roads: 'road', settlements: 'settlement', town: 'settlement', cities: 'city', thief: 'robber',
  resource: 'resource-card', resourcecard: 'resource-card', card: 'unknown', development: 'development-card', developmentcard: 'development-card', devcard: 'development-card',
  piece: 'unknown', box: 'container', port: 'harbor', harbour: 'harbor',
};
function toKind(raw: unknown): SceneKind | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  if ((SCENE_KINDS as readonly string[]).includes(value)) return value as SceneKind;
  return KIND_ALIASES[value.replace(/[\s_-]/g, '')] ?? null;
}
function text(raw: unknown): string | null { return typeof raw === 'string' && raw.trim() ? raw.trim() : null; }
function canonicalVariant(kind: SceneKind, raw: unknown): string | null {
  const value = text(raw);
  if (!value) return null;
  const lower = value.toLowerCase();
  if (SCENE_VARIANTS[kind]?.some(option => option.value === lower)) return lower;
  return VARIANT_ALIASES[kind]?.[lower] ?? value;
}
function finite(raw: unknown): number | null {
  const value = typeof raw === 'string' && raw.trim() ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function normalizeRegion(raw: unknown): SceneRegion | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const [x, y, width, height] = [r.x, r.y, r.width ?? r.w, r.height ?? r.h].map(finite);
  if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) return null;
  const left = Math.min(Math.max(x, 0), 1), top = Math.min(Math.max(y, 0), 1);
  const right = Math.min(Math.max(x + width, 0), 1), bottom = Math.min(Math.max(y + height, 0), 1);
  if (right - left <= 0 || bottom - top <= 0) return null;
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) };
}

function normalizeLocation(kind: SceneKind, raw: unknown, label: string, adjust: (m: string) => void): SceneLocation {
  let type: string | null = null, id: unknown = null;
  if (typeof raw === 'string') {
    // Bare slot ids are common from models and legacy anchors.
    const guess = (['vertex', 'edge', 'hex'] as const).find(t => resolveSlotId(t, raw));
    if (guess) { type = guess; id = raw; } else { type = 'area'; id = raw; }
  } else if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    type = text(r.type)?.toLowerCase() ?? null; id = r.id ?? null;
  }
  if (type === null) return { type: 'unplaced', id: null };
  if (!(SCENE_LOCATION_TYPES as readonly string[]).includes(type)) { adjust(`${label}: 알 수 없는 위치 종류 '${type}'를 미기록으로 바꿨습니다.`); return { type: 'unplaced', id: null }; }
  const locType = type as SceneLocationType;
  if (locType === 'unplaced') return { type: 'unplaced', id: null };
  if (!compatibleLocationTypes(kind).includes(locType)) {
    const fallback = BOARD_SLOTS[kind][0];
    adjust(`${label}: ${SCENE_KIND_LABELS[kind]}는 ${SCENE_LOCATION_LABELS[locType]}에 놓이지 않아 ${fallback ? '보드 위치 모름' : '미기록'}으로 바꿨습니다.`);
    return fallback && isBoardSlotType(locType) ? { type: fallback, id: null } : { type: 'unplaced', id: null };
  }
  if (locType === 'area') return { type: 'area', id: text(id) };
  if (id === null || id === undefined || id === '') return { type: locType, id: null };
  const resolved = resolveSlotId(locType, id);
  if (!resolved) adjust(`${label}: '${String(id)}'는 ${SCENE_LOCATION_LABELS[locType]} 위치가 아니어서 위치 모름으로 남겼습니다.`);
  return { type: locType, id: resolved };
}

function normalizeComponent(raw: Record<string, unknown>, index: number, evidenceIds: string[] | undefined, adjust: (m: string) => void): SceneComponent {
  const label = text(raw.id) ?? `#${index + 1}`;
  let kind = toKind(raw.kind ?? raw.type);
  if (!kind) { if (raw.kind !== undefined) adjust(`${label}: 종류 '${String(raw.kind)}'를 알 수 없음으로 기록했습니다.`); kind = 'unknown'; }
  const legacyHarbor = kind === 'token' && raw.variant === 'harbor';
  if (legacyHarbor) kind = 'harbor';
  const location = normalizeLocation(kind, raw.location ?? raw.anchor ?? raw.at ?? null, label, adjust);
  const quantityRaw = raw.quantity ?? raw.count;
  let quantity = quantityRaw === undefined ? (isBoardSlotType(location.type) ? 1 : null) : finite(quantityRaw);
  if (quantity !== null && (quantity < 0 || !Number.isInteger(quantity))) { adjust(`${label}: 수량 ${quantity}은 0 이상의 정수가 아니어서 모름으로 바꿨습니다.`); quantity = null; }
  let evidenceId = text(raw.evidenceId);
  let region = normalizeRegion(raw.region);
  if (raw.region && !region) adjust(`${label}: 사진 영역 값이 올바르지 않아 비웠습니다.`);
  if (evidenceIds) {
    if (evidenceId && !evidenceIds.includes(evidenceId)) { adjust(`${label}: 사진 ${evidenceId}를 찾을 수 없어 출처를 비웠습니다.`); evidenceId = null; if (region) region = null; }
    // Same convention as Assertion.region: an unattributed crop belongs to the first photo.
    if (!evidenceId && region) { if (evidenceIds[0]) evidenceId = evidenceIds[0]; else region = null; }
  }
  const component: SceneComponent = {
    id: label, kind, variant: legacyHarbor ? null : canonicalVariant(kind, raw.variant ?? (kind === 'terrain' ? raw.resource : undefined)),
    ownerId: text(raw.ownerId ?? raw.owner), quantity, location, region, evidenceId,
  };
  if (kind === 'harbor') { component.ownerId = null; component.ratio = legacyHarbor ? null : finite(raw.ratio); }
  if ('number' in raw) {
    let number = finite(raw.number);
    if (number !== null && usesNumber(kind) && !CATAN_NUMBERS.includes(number)) { adjust(`${label}: 숫자 ${number}는 카탄 숫자 토큰이 아니어서 비웠습니다.`); number = null; }
    component.number = number;
  }
  if ('direction' in raw) {
    const direction = finite(raw.direction);
    component.direction = direction === null ? null : ((Math.round(direction) % 360) + 360) % 360;
  }
  if ('face' in raw) {
    const face = text(raw.face)?.toLowerCase();
    component.face = face === 'front' || face === 'back' ? face : null;
    if (face && component.face === null) adjust(`${label}: 면 '${face}'를 알 수 없어 모름으로 기록했습니다.`);
  }
  if ('attachedToId' in raw) component.attachedToId = text(raw.attachedToId);
  const note = text(raw.note);
  if (note) component.note = note;
  return component;
}

export function normalizeSceneDetailed(value: unknown, evidenceIds?: string[]): SceneNormalization {
  const adjustments: string[] = [];
  const adjust = (message: string) => adjustments.push(message);
  let input = value;
  if (typeof input === 'string') { try { input = JSON.parse(input); } catch { input = null; } }
  if (Array.isArray(input)) input = { components: input };
  if (!input || typeof input !== 'object') {
    if (value !== undefined && value !== null) adjust('기존 기록을 구성물 장면으로 읽지 못해 빈 장면으로 시작합니다.');
    return { scene: { version: SCENE_VERSION, coverage: 'partial', components: [], coverageByLayer: {} }, adjustments, recognized: false };
  }
  const object = input as Record<string, unknown>;
  let rawComponents: unknown[];
  let recognized = true;
  // Legacy board.layout conversion lives in sceneBridge.ts; here anything without components is unrecognized.
  if (Array.isArray(object.components)) rawComponents = object.components;
  else { rawComponents = []; recognized = false; adjust('기존 기록을 구성물 장면으로 읽지 못해 빈 장면으로 시작합니다.'); }
  const rawCoverage = text(object.coverage);
  const coverage: SceneCoverage = (SCENE_COVERAGES as readonly string[]).includes(rawCoverage ?? '') ? rawCoverage as SceneCoverage : 'partial';
  if (rawCoverage && coverage !== rawCoverage) adjust(`범위 '${rawCoverage}'를 알 수 없어 '일부만'으로 기록했습니다.`);
  const seen = new Set<string>();
  const components: SceneComponent[] = [];
  rawComponents.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { adjust(`#${index + 1}: 구성물 형식이 아니어서 제외했습니다.`); return; }
    const component = normalizeComponent(raw as Record<string, unknown>, index, evidenceIds, adjust);
    if (!text((raw as Record<string, unknown>).id) || seen.has(component.id)) {
      const base = text((raw as Record<string, unknown>).id) ?? component.kind;
      component.id = uniqueId(base, seen);
    }
    seen.add(component.id);
    components.push(component);
  });
  for (const component of components) if (component.attachedToId && (component.attachedToId === component.id || !seen.has(component.attachedToId))) {
    adjust(`${component.id}: 연결 대상 '${component.attachedToId}'가 없어 연결을 비웠습니다.`);
    component.attachedToId = null;
  }
  const coverageByLayer: ComponentScene['coverageByLayer'] = {};
  const layerInput = object.coverageByLayer as Record<string, unknown> | undefined;
  for (const layer of ['terrain', 'numbers', 'buildings', 'roads', 'harbors'] as const) {
    const value = layerInput?.[layer];
    if (['complete', 'partial', 'unknown'].includes(String(value))) coverageByLayer[layer] = value as LayerCoverage;
  }
  const version = object.version === 1 && !components.some(c => c.kind === 'harbor') && !Object.keys(coverageByLayer).length ? 1 : SCENE_VERSION;
  return { scene: { version, coverage, components, ...(version === 2 ? { coverageByLayer } : {}) }, adjustments, recognized };
}
export function normalizeScene(value: unknown, evidenceIds?: string[]): ComponentScene { return normalizeSceneDetailed(value, evidenceIds).scene; }

function uniqueId(base: string, taken: Set<string>): string {
  for (let n = 1; ; n++) { const id = `${base}-${n}`; if (!taken.has(id)) return id; }
}
export function createComponentId(scene: ComponentScene, kind: SceneKind): string { return uniqueId(kind, new Set(scene.components.map(c => c.id))); }
export function createComponent(scene: ComponentScene, kind: SceneKind, patch: Partial<SceneComponent> = {}): SceneComponent {
  const location = patch.location ?? { type: 'unplaced', id: null };
  return {
    id: createComponentId(scene, kind), kind, variant: null, ownerId: null,
    quantity: isBoardSlotType(location.type) ? 1 : null, location, region: null, evidenceId: null, ...patch,
  };
}

// ---------- Inspection (informational; never blocks saving) ----------
export interface SceneIssue { code: 'slot-shared' | 'slot-unknown' | 'hex-without-terrain'; message: string; componentIds: string[] }
function layer(kind: SceneKind): string {
  if (kind === 'settlement' || kind === 'city') return 'building';
  return kind;
}
export function inspectScene(scene: ComponentScene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const slots = new Map<string, SceneComponent[]>();
  for (const component of scene.components) {
    const { type, id } = component.location;
    if (!isBoardSlotType(type)) continue;
    if (!id) { issues.push({ code: 'slot-unknown', message: `${SCENE_KIND_LABELS[component.kind]} ${component.id}: 보드 위 정확한 위치가 아직 없습니다.`, componentIds: [component.id] }); continue; }
    if (component.kind === 'unknown' || component.kind === 'token') continue;
    const key = `${type}:${id}:${layer(component.kind)}`;
    slots.set(key, [...(slots.get(key) ?? []), component]);
  }
  for (const [key, list] of slots) {
    const count = list.reduce((sum, c) => sum + (c.quantity ?? 1), 0);
    if (count > 1) {
      const [type, id] = key.split(':');
      issues.push({ code: 'slot-shared', message: `${slotLabel({ type: type as SceneLocationType, id })}에 ${SCENE_KIND_LABELS[list[0].kind]} 등 ${count}개가 겹쳐 있습니다.`, componentIds: list.map(c => c.id) });
    }
  }
  if (scene.coverage === 'full') {
    const covered = new Set(scene.components.filter(c => c.kind === 'terrain' && c.location.type === 'hex' && c.location.id).map(c => c.location.id));
    const missing = CATAN_TOPOLOGY.hexes.filter(hex => !covered.has(hex.id)).map(hex => hex.id);
    if (missing.length) issues.push({ code: 'hex-without-terrain', message: `보드 전체로 표시했지만 지형이 기록되지 않은 타일이 ${missing.length}개 있습니다: ${missing.join(', ')}`, componentIds: [] });
  }
  return issues;
}

// ---------- Model output schema (Gemini responseSchema subset: OBJECT/ARRAY/STRING/INTEGER/NUMBER, enum, nullable) ----------
const regionSchema = {
  type: 'OBJECT', nullable: true,
  description: 'Normalized crop (0..1) of this component inside the photo named by evidenceId. null when the photo does not show it or no photo exists.',
  properties: { x: { type: 'NUMBER' }, y: { type: 'NUMBER' }, width: { type: 'NUMBER' }, height: { type: 'NUMBER' } },
  required: ['x', 'y', 'width', 'height'], propertyOrdering: ['x', 'y', 'width', 'height'],
} as const;
export const sceneJSONSchema = {
  type: 'OBJECT',
  properties: {
    version: { type: 'INTEGER', description: 'Always 2. Readers also accept legacy version 1.' },
    coverageByLayer: { type: 'OBJECT', properties: Object.fromEntries(['terrain','numbers','buildings','roads','harbors'].map(layer => [layer, { type: 'STRING', enum: ['complete','partial','unknown'] }])), description: 'Layer-specific observation completeness. full terrain never implies complete harbors or ownership.' },
    coverage: { type: 'STRING', enum: [...SCENE_COVERAGES], description: 'full: the whole 19-hex board is visible; partial: only part of the board or table; catalog: loose components counted without a board. Full does not mean the position is rule-legal.' },
    components: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Stable unique id, e.g. road-1.' },
          kind: { type: 'STRING', enum: [...SCENE_KINDS] },
          ratio: { type: 'NUMBER', nullable: true, description: 'Harbor trade ratio 2 or 3; null if unreadable. Preserve observed mismatches for review.' },
          variant: { type: 'STRING', nullable: true, description: 'harbor: generic|lumber|brick|wool|grain|ore|null (ratio separately); terrain: forest|pasture|fields|hills|mountains|desert; resource-card: lumber|wool|grain|brick|ore|hidden; development-card: knight|victory-point|road-building|year-of-plenty|monopoly|hidden; null if unreadable.' },
          ownerId: { type: 'STRING', nullable: true, description: 'Player id for owned pieces/cards; null for shared or unknown.' },
          quantity: { type: 'INTEGER', nullable: true, description: 'Physical count represented by this entry; null if not countable.' },
          location: {
            type: 'OBJECT',
            description: 'Logical slot. hex id r{row}c{column} (r1c1..r5c3, rows of 3,4,5,4,3). vertex/edge id {hexId}.{N|NE|SE|S|SW|NW} for corners, {hexId}.{NE|E|SE|SW|W|NW} for sides, any adjacent hex works. id null when the type is known but the slot is not readable.',
            properties: { type: { type: 'STRING', enum: [...SCENE_LOCATION_TYPES] }, id: { type: 'STRING', nullable: true } },
            required: ['type', 'id'], propertyOrdering: ['type', 'id'],
          },
          region: regionSchema,
          evidenceId: { type: 'STRING', nullable: true, description: 'Photo id the region refers to.' },
          number: { type: 'INTEGER', nullable: true, description: 'Number token value 2-12 (not 7) for terrain/number-token.' },
          direction: { type: 'NUMBER', nullable: true, description: 'Optional rotation in degrees.' },
          face: { type: 'STRING', enum: ['front', 'back'], nullable: true, description: 'Visible side for cards/tiles/tokens; null if unreadable; omit if irrelevant.' },
          attachedToId: { type: 'STRING', nullable: true, description: 'id of another component this one sits on or belongs to.' },
          note: { type: 'STRING', description: 'Short observation; omit when empty.' },
        },
        required: ['id', 'kind', 'variant', 'ownerId', 'quantity', 'location', 'region', 'evidenceId'],
        propertyOrdering: ['id', 'kind', 'variant', 'ownerId', 'quantity', 'location', 'region', 'evidenceId', 'number', 'direction', 'face', 'attachedToId', 'note'],
      },
    },
  },
  required: ['version', 'coverage', 'components'],
  propertyOrdering: ['version', 'coverage', 'components'],
} as const;

/** Harbor endpoints and outward sea position are derived from a canonical coastal edge. */
export function coastalEdge(id: string | null) { const canonical = resolveSlotId('edge', id); const edge = canonical ? CATAN_TOPOLOGY.byId.edge.get(canonical) : undefined; return edge?.hexIds.length === 1 ? edge : null; }
export const COASTAL_EDGES = CATAN_TOPOLOGY.edges.filter(edge => edge.hexIds.length === 1);
export function harborPoint(id: string | null): Point | null { const edge = coastalEdge(id); if (!edge) return null; const hex = CATAN_TOPOLOGY.byId.hex.get(edge.hexIds[0])!; const dx = edge.x - hex.x, dy = edge.y - hex.y, distance = Math.hypot(dx,dy); return { x: edge.x + dx / distance * .72, y: edge.y + dy / distance * .72 }; }
