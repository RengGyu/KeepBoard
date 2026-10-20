import { CATAN_TOPOLOGY, coastalEdge, isBoardSlotType, resolveSlotId, slotLabel, type ComponentScene, type SceneComponent } from './scene';

export interface CatanPlacementIssue {
  code: 'harbor-location' | 'harbor-ratio' | 'harbor-count' | 'building-distance' | 'desert-number' | 'robber-count' | 'road-connection' | 'settlement-connection' | 'red-number-adjacency' | 'number-terrain-unknown' | 'mixed-number-representation';
  certainty: 'conflict' | 'check';
  message: string;
  componentIds: string[];
}

const building = (component: SceneComponent) => component.kind === 'settlement' || component.kind === 'city';
const knownNumber = (component: SceneComponent) => typeof component.number === 'number' && Number.isFinite(component.number);
const redNumber = (component: SceneComponent) => component.number === 6 || component.number === 8;
function slot(component: SceneComponent): string | null {
  return isBoardSlotType(component.location.type) ? resolveSlotId(component.location.type, component.location.id) : null;
}

/** Current recorded geometry only: coverage never proves complete pieces, ownership, or play history. */
export function inspectCatanPlacement(scene: ComponentScene): CatanPlacementIssue[] {
  const issues: CatanPlacementIssue[] = [];
  const present = scene.components.filter(component => component.quantity !== 0);
  const buildings = present.filter(component => building(component) && component.location.type === 'vertex' && slot(component));
  const roads = present.filter(component => component.kind === 'road' && component.location.type === 'edge' && slot(component));
  const atVertex = (id: string) => buildings.filter(component => slot(component) === id);
  const atHex = (id: string) => present.filter(component => component.location.type === 'hex' && slot(component) === id);

  for (const edge of CATAN_TOPOLOGY.edges) {
    const left = atVertex(edge.vertexIds[0]), right = atVertex(edge.vertexIds[1]);
    if (left.length && right.length) issues.push({ code: 'building-distance', certainty: 'conflict', message: '기본판 거리 규칙: 인접한 꼭짓점에 건물이 있어요. 소유자·종류와 관계없이 건물 사이는 두 변 이상이어야 합니다.', componentIds: [...left, ...right].map(component => component.id) });
  }

  const robbers = present.filter(component => component.kind === 'robber' && component.location.type === 'hex');
  if (robbers.reduce((sum, component) => sum + (component.quantity ?? 1), 0) > 1) issues.push({ code: 'robber-count', certainty: 'conflict', message: '카탄 기본판의 도둑은 하나입니다. 보드 위 도둑 기록이 여러 개이므로 원본과 수량을 확인하세요.', componentIds: robbers.map(component => component.id) });

  for (const hex of CATAN_TOPOLOGY.hexes) {
    const components = atHex(hex.id);
    const terrains = components.filter(component => component.kind === 'terrain');
    const inline = terrains.filter(knownNumber);
    const tokens = components.filter(component => component.kind === 'number-token');
    const numbered = [...inline, ...tokens];
    if (inline.length && tokens.length) issues.push({ code: 'mixed-number-representation', certainty: 'check', message: `${hex.id}: 지형 내장 숫자와 독립 숫자 토큰이 함께 기록되어 있어요. 자동으로 합치지 않으며 지형 이동 전에 두 표현을 확인해야 합니다.`, componentIds: [...inline, ...tokens].map(component => component.id) });
    const desert = terrains.filter(component => component.variant === 'desert');
    if (desert.length && numbered.length) issues.push({ code: 'desert-number', certainty: 'conflict', message: `${hex.id}: 사막에는 숫자 토큰을 놓지 않습니다. 기록된 숫자는 지우지 않았으니 원본을 확인하세요.`, componentIds: [...new Set([...desert, ...numbered].map(component => component.id))] });
    else if (numbered.length && (!terrains.length || terrains.some(component => component.variant === null))) issues.push({ code: 'number-terrain-unknown', certainty: 'check', message: `${hex.id}: 지형이 미기록이거나 모르는 상태여서 숫자가 생산 지형 위에 있는지 확인할 수 없어요.`, componentIds: [...terrains, ...numbered].map(component => component.id) });
    const reds = numbered.filter(redNumber);
    if (!reds.length) continue;
    for (const neighborId of hex.neighborHexIds.filter(id => hex.id < id)) {
      const otherReds = atHex(neighborId).filter(component => (component.kind === 'number-token' || component.kind === 'terrain') && redNumber(component));
      if (otherReds.length) issues.push({ code: 'red-number-adjacency', certainty: 'check', message: `${hex.id}와 ${neighborId}의 6·8 숫자가 인접합니다. 판본과 숫자 배치 방식에 따라 원본을 확인하세요.`, componentIds: [...reds, ...otherReds].map(component => component.id) });
    }
  }

  for (const road of roads) {
    if (!road.ownerId) {
      issues.push({ code: 'road-connection', certainty: 'check', message: `${road.id}: 소유자가 미상이어서 자기 도로·건물과의 연결을 확인할 수 없어요.`, componentIds: [road.id] });
      continue;
    }
    const edge = CATAN_TOPOLOGY.byId.edge.get(slot(road)!)!;
    let connected = false, blocked = false, uncertain = false;
    const relevant = new Set([road.id]);
    for (const vertexId of edge.vertexIds) {
      const buildingsHere = atVertex(vertexId);
      const otherBuilding = buildingsHere.some(component => !!component.ownerId && component.ownerId !== road.ownerId);
      const vertex = CATAN_TOPOLOGY.byId.vertex.get(vertexId)!;
      const adjacentRoads = roads.filter(component => component.id !== road.id && vertex.edgeIds.includes(slot(component)!));
      if (otherBuilding) { if (adjacentRoads.some(component => component.ownerId === road.ownerId)) blocked = true; buildingsHere.forEach(component => relevant.add(component.id)); continue; }
      if (buildingsHere.some(component => component.ownerId === road.ownerId)) { connected = true; continue; }
      if (buildingsHere.some(component => component.ownerId === null)) { uncertain = true; continue; }
      if (adjacentRoads.some(component => component.ownerId === road.ownerId)) connected = true;
      if (adjacentRoads.some(component => component.ownerId === null)) uncertain = true;
    }
    if (!connected) issues.push({ code: 'road-connection', certainty: 'check', message: `${road.id}: ${blocked ? '알려진 상대 건물이 그 꼭짓점을 통한 도로 연결을 막고 있어요.' : uncertain ? '연결 지점의 소유자가 미상이어서 도로 연결을 확정할 수 없어요.' : '현재 기록에서 자기 도로·건물과의 연결이 확인되지 않아요.'} 반대 끝의 연결과 초기배치·누락된 구성물을 확인하세요. 과거 건설의 적법성을 판정한 것은 아닙니다.`, componentIds: [...relevant] });
  }

  for (const settlement of buildings.filter(component => component.kind === 'settlement')) {
    const vertex = CATAN_TOPOLOGY.byId.vertex.get(slot(settlement)!)!;
    if (settlement.ownerId && roads.some(road => road.ownerId === settlement.ownerId && vertex.edgeIds.includes(slot(road)!))) continue;
    issues.push({ code: 'settlement-connection', certainty: 'check', message: `${settlement.id}: ${settlement.ownerId ? '현재 기록에서 자기 도로와의 연결이 확인되지 않아요.' : '소유자가 미상이어서 자기 도로 연결을 확인할 수 없어요.'} 초기 마을은 연결 예외이므로 배치 단계와 원본을 확인하세요.`, componentIds: [settlement.id] });
  }
  const harbors = present.filter(c => c.kind === 'harbor');
  for (const harbor of harbors) {
    if (harbor.location.id && !coastalEdge(harbor.location.id)) issues.push({ code: 'harbor-location', certainty: 'conflict', message: `${harbor.id}: 항구의 해안 변을 확인하세요. 원본 기록은 유지합니다.`, componentIds: [harbor.id] });
    if (harbor.variant && harbor.ratio !== null && harbor.ratio !== undefined && !((harbor.variant === 'generic' && harbor.ratio === 3) || (['lumber','brick','wool','grain','ore'].includes(harbor.variant) && harbor.ratio === 2))) issues.push({ code: 'harbor-ratio', certainty: 'check', message: `${harbor.id}: 기본판은 일반 3:1, 자원별 2:1입니다. 원본 종류·비율을 확인하세요.`, componentIds: [harbor.id] });
  }
  if (scene.coverageByLayer?.harbors === 'complete' && (harbors.length !== 9 || harbors.filter(c => c.variant === 'generic' && c.ratio === 3).length !== 4 || ['lumber','brick','wool','grain','ore'].some(resource => harbors.filter(c => c.variant === resource && c.ratio === 2).length !== 1))) issues.push({ code: 'harbor-count', certainty: 'check', message: '항구 전체 확인 표시를 검토하세요: 기본판 9곳(일반 4, 자원별 각 1)과 기록이 다릅니다. 누락 항구는 자동 생성하지 않습니다.', componentIds: harbors.map(c => c.id) });
  return issues;
}

export function newPlacementConflicts(scene: ComponentScene, componentId: string): CatanPlacementIssue[] {
  return inspectCatanPlacement(scene).filter(issue => issue.certainty === 'conflict' && issue.componentIds.includes(componentId));
}
