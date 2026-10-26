import { coastalEdge, boardSlotTypes, createComponent, createComponentId, isBoardSlotType, isCompatibleLocation, resolveSlotId, SCENE_KIND_LABELS, SCENE_VARIANTS, slotLabel, type ComponentScene, type SceneComponent, type SceneKind, type SceneLocation } from './scene';
import { inspectCatanPlacement, newPlacementConflicts, type CatanPlacementIssue } from './catanPlacement';

export type SceneMoveResult = {
  scene: ComponentScene;
  status: 'moved' | 'swapped' | 'split' | 'updated' | 'noop' | 'rejected';
  selectedId: string;
  changedIds: string[];
  message: string;
  canRecordOriginal?: boolean;
  warnings?: CatanPlacementIssue[];
};

export interface SceneMoveOptions { intent?: 'place' | 'correct' }

// Different hex layers coexist. A settlement and a city share one building slot.
export function exclusiveLayer(kind: SceneKind): string | null {
  if (kind === 'settlement' || kind === 'city') return 'building';
  if (kind === 'terrain' || kind === 'number-token' || kind === 'road' || kind === 'robber' || kind === 'harbor') return kind;
  return null;
}

function canonicalLocation(location: SceneLocation): SceneLocation {
  return isBoardSlotType(location.type) && location.id ? { type: location.type, id: resolveSlotId(location.type, location.id) ?? location.id } : location;
}

export function sameSceneLocation(a: SceneLocation, b: SceneLocation): boolean {
  const first = canonicalLocation(a), second = canonicalLocation(b);
  return first.type === second.type && first.id === second.id;
}

function hasSlot(location: SceneLocation): boolean {
  return isBoardSlotType(location.type) && !!location.id;
}

function inlineNumber(component: SceneComponent): boolean {
  return component.kind === 'terrain' && typeof component.number === 'number' && Number.isFinite(component.number);
}

export function slotOccupants(scene: ComponentScene, component: SceneComponent, location: SceneLocation): SceneComponent[] {
  const layer = exclusiveLayer(component.kind);
  if (!layer || !hasSlot(location)) return [];
  return scene.components.filter(other => other.id !== component.id && other.quantity !== 0 && (exclusiveLayer(other.kind) === layer || (component.kind === 'number-token' && inlineNumber(other))) && sameSceneLocation(other.location, location));
}

export function changeSceneComponentKind(scene: ComponentScene, componentId: string, kind: SceneKind): SceneMoveResult {
  const source = scene.components.find(component => component.id === componentId);
  const result = (status: SceneMoveResult['status'], message: string, next = scene): SceneMoveResult => ({ status, message, scene: next, changedIds: next === scene ? [] : [componentId], selectedId: componentId });
  if (!source) return result('rejected', '바꿀 구성물을 찾지 못했어요.');
  if (source.kind === kind) return result('noop', '이미 같은 종류예요.');
  const component: SceneComponent = { ...source, kind, variant: SCENE_VARIANTS[kind] && source.variant && !SCENE_VARIANTS[kind]!.some(option => option.value === source.variant) ? null : source.variant };
  if (!isCompatibleLocation(kind, source.location)) component.location = isBoardSlotType(source.location.type) && boardSlotTypes(kind).length ? { type: boardSlotTypes(kind)[0], id: null } : { type: 'unplaced', id: null };
  if (kind !== 'terrain' && kind !== 'number-token' && kind !== 'token' && component.number === null) delete component.number;
  if (component.quantity !== 0 && slotOccupants(scene, component, component.location).length) return result('rejected', '바꾸려는 종류의 구성물이 같은 자리에 이미 있어요. 먼저 다른 자리나 보드 밖으로 옮긴 뒤 종류를 바꿔 주세요.');
  return result('updated', `${SCENE_KIND_LABELS[kind]}로 바꿨어요.`, { ...scene, components: scene.components.map(item => item.id === componentId ? component : item) });
}

function separateInlineNumbers(before: ComponentScene, after: ComponentScene, locations: SceneLocation[]): { scene: ComponentScene; changedIds: string[]; error?: string } {
  const hexes = locations.filter(location => location.type === 'hex' && location.id).map(location => canonicalLocation(location).id!);
  const tiles = before.components.filter(component => component.quantity !== 0 && inlineNumber(component) && component.location.type === 'hex' && hexes.includes(canonicalLocation(component.location).id!));
  for (const tile of tiles) if (before.components.some(component => component.quantity !== 0 && component.kind === 'number-token' && sameSceneLocation(component.location, tile.location))) return { scene: before, changedIds: [], error: `${slotLabel(tile.location)}에 지형 내장 숫자와 독립 숫자 토큰이 함께 있어요. 자동 병합하지 않으니 숫자 표현을 먼저 확인한 뒤 지형을 옮겨 주세요.` };
  let next = after;
  const changedIds: string[] = [];
  for (const tile of tiles) {
    const token = createComponent(next, 'number-token', { location: canonicalLocation(tile.location), number: tile.number, quantity: 1, evidenceId: tile.evidenceId, region: null, note: '지형 기록의 숫자를 원래 칸의 독립 토큰으로 분리했습니다. 독립 사진 영역은 미지정입니다.' });
    next = { ...next, components: [...next.components.map(component => { if (component.id !== tile.id) return component; const copy = { ...component }; delete copy.number; return copy; }), token] };
    changedIds.push(tile.id, token.id);
  }
  return { scene: next, changedIds };
}

/** One pure edit transaction, shared by drag, tap, dropdown, and board-slot insertion. */
export function moveSceneComponent(scene: ComponentScene, componentId: string, destination: SceneLocation, options: SceneMoveOptions = {}): SceneMoveResult {
  const result = (status: SceneMoveResult['status'], message: string, next = scene, changedIds: string[] = [], selectedId = componentId): SceneMoveResult => ({ status, message, scene: next, changedIds, selectedId });
  const source = scene.components.find(component => component.id === componentId);
  if (!source) return result('rejected', '옮길 구성물을 찾지 못했어요. 목록에서 다시 선택하세요.');
  const location = canonicalLocation(destination);
  if (!isCompatibleLocation(source.kind, location)) return result('rejected', `${SCENE_KIND_LABELS[source.kind]}가 들어갈 수 있는 자리가 아니에요.`);
  if (source.kind === 'harbor' && location.type === 'edge' && location.id && !coastalEdge(location.id) && options.intent !== 'correct') return { ...result('rejected', '항구는 해안 변에 놓습니다. 내륙의 실제 원본 기록이라면 명시적으로 원본대로 기록하세요.'), canRecordOriginal: true };
  if (sameSceneLocation(source.location, location)) return result('noop', '이미 같은 자리에 있어요.');
  if (isBoardSlotType(location.type) && source.quantity === 0) return result('rejected', '수량이 0인 구성물은 보드에 놓을 수 없어요. 실제 수량부터 확인해 주세요.');

  if (source.kind === 'number-token' && hasSlot(location)) {
    if (hasSlot(source.location) && slotOccupants(scene, source, source.location).some(inlineNumber)) return result('rejected', '출발 칸에 지형 내장 숫자와 독립 숫자 토큰이 함께 있어요. 숫자 표현을 먼저 확인한 뒤 옮겨 주세요.');
    const occupants = slotOccupants(scene, source, location);
    const inline = occupants.filter(inlineNumber);
    if (inline.length) {
      if (occupants.length > 1 || inline.some(component => component.quantity !== null && component.quantity > 1)) return result('rejected', '목적 칸의 숫자층에 내장 숫자·독립 토큰 또는 여러 지형 기록이 함께 있어요. 자동 병합하지 않으니 숫자 표현을 먼저 정리하세요.');
      if (!hasSlot(source.location)) return result('rejected', `${slotLabel(location)}의 알려진 지형 내장 숫자가 숫자층을 이미 차지하고 있어요. 출발 자리가 없어 교환할 수 없으니 기존 숫자를 먼저 확인해 옮겨 주세요.`);
      const prepared = separateInlineNumbers(scene, scene, [location]);
      if (prepared.error) return result('rejected', prepared.error);
      const planned = moveSceneComponent(prepared.scene, componentId, location, options);
      if (planned.status === 'rejected' || planned.status === 'noop') return { ...planned, scene, changedIds: [] };
      return { ...planned, changedIds: [...new Set([...prepared.changedIds, ...planned.changedIds])], message: `${planned.message} 목적 칸의 내장 숫자를 독립 토큰으로 분리해 함께 교환했어요.` };
    }
  }

  function finish(status: SceneMoveResult['status'], message: string, next: ComponentScene, changedIds: string[], selectedId = componentId): SceneMoveResult {
    const separated = source!.kind === 'terrain' ? separateInlineNumbers(scene, next, [source!.location, location]) : { scene: next, changedIds: [] as string[] };
    if (separated.error) return result('rejected', separated.error);
    const newPlacement = options.intent === 'place' || (options.intent !== 'correct' && !hasSlot(source!.location));
    if (newPlacement && hasSlot(location)) {
      const conflicts = newPlacementConflicts(separated.scene, selectedId);
      if (conflicts.length) return { ...result('rejected', `${conflicts[0].message} 새 배치는 적용하지 않았어요. 사진에 이미 있는 상태라면 ‘원본대로 기록’을 선택하세요.`), canRecordOriginal: true };
    }
    return { ...result(status, message + (separated.changedIds.length ? ' 내장 숫자는 독립 토큰으로 분리해 원래 칸에 남겼어요.' : ''), separated.scene, [...new Set([...changedIds, ...separated.changedIds])], selectedId), warnings: inspectCatanPlacement(separated.scene) };
  }

  if (hasSlot(location)) {
    const occupants = slotOccupants(scene, source, location);
    if (occupants.length > 1 || occupants.some(component => component.quantity !== null && component.quantity > 1)) return result('rejected', `${slotLabel(location)}에 같은 종류의 구성물이 여러 개 기록되어 있어 교환 대상을 정할 수 없어요 (${occupants.map(component => component.id).join(', ')}). 먼저 중복 기록이나 수량을 정리하세요.`);
    if (hasSlot(source.location)) {
      const peers = slotOccupants(scene, source, source.location);
      if (peers.length || (source.quantity !== null && source.quantity > 1)) return result('rejected', '출발 자리에 같은 종류가 여러 개 기록되어 있어요. 선택한 구성물을 먼저 보드 밖으로 빼거나 수량을 정리한 뒤 옮겨 주세요.');
    }
    const occupant = occupants[0];
    if (occupant) {
      if (!hasSlot(source.location)) return result('rejected', `${slotLabel(location)}에 ${SCENE_KIND_LABELS[occupant.kind]} ${occupant.id}가 있어요. 출발 자리가 없는 구성물은 교환할 수 없으니, 기존 구성물을 먼저 빈 자리나 보드 밖으로 옮겨 주세요.`);
      const sourceLocation = canonicalLocation(source.location);
      if (!isCompatibleLocation(occupant.kind, sourceLocation)) return result('rejected', '두 구성물이 서로의 자리에 들어갈 수 없어 교환하지 않았어요.');
      const next = { ...scene, components: scene.components.map(component => component.id === source.id ? { ...component, location } : component.id === occupant.id ? { ...component, location: sourceLocation } : component) };
      return finish('swapped', `${source.id}와 ${occupant.id}의 자리를 바꿨어요. 되돌리기 한 번으로 함께 복원됩니다.`, next, [source.id, occupant.id]);
    }
    if (!hasSlot(source.location)) {
      if (source.quantity === null) return result('rejected', '이 묶음의 수량을 먼저 확인해 주세요. 수량이 모르는 상태에서는 보드에 새 조각을 만들지 않아요.');
      if (source.quantity > 1) {
        const piece = { ...source, id: createComponentId(scene, source.kind), location, quantity: 1 };
        const next = { ...scene, components: [...scene.components.map(component => component.id === source.id ? { ...component, quantity: source.quantity! - 1 } : component), piece] };
        return finish('split', `묶음에서 한 개를 ${slotLabel(location)}에 놓았어요.`, next, [source.id, piece.id], piece.id);
      }
    }
  }
  const next = { ...scene, components: scene.components.map(component => component.id === source.id ? { ...component, location } : component) };
  return finish('moved', `${SCENE_KIND_LABELS[source.kind]}를 ${slotLabel(location)}로 옮겼어요.`, next, [source.id]);
}
