import type { Assertion, FieldDefinition, GamePack, Session, Value } from './types';
import { CATAN_TOPOLOGY, coastalEdge, resolveSlotId, type ComponentScene } from './scene';
import { toComponentScene } from './sceneBridge';

export const RESOURCES = ['lumber','brick','wool','grain','ore'] as const;
export const DEVELOPMENTS = ['knight','road-building','year-of-plenty','monopoly','victory-point'] as const;
export type Resource = typeof RESOURCES[number];
export type Development = typeof DEVELOPMENTS[number];
export type Counts = Record<string, number | null>;
export const RESOURCE_NAMES: Record<Resource,string> = { lumber:'목재', brick:'벽돌', wool:'양모', grain:'곡물', ore:'광석' };
export type Knowledge = 'complete' | 'partial' | 'unknown' | 'conflict';
export interface KnownNumber { value: number | null; known: number; status: Knowledge; assertionIds: string[] }
export const objectValue = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const countValue = (value: unknown): number | null => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
export function confirmed(session: Session, field: string, ownerId?: string): Assertion | undefined {
  return session.assertions.filter(a => a.field === field && a.ownerId === ownerId && a.status === 'accepted' && !(session.gamePack?.fields.find(f => f.key === field)?.lifetime === 'turn' && a.turnInstanceId && a.turnInstanceId !== session.turnInstanceId)).at(-1);
}
export const factValue = (session: Session, field: string, ownerId?: string) => confirmed(session, field, ownerId)?.value;
export function canViewField(field: FieldDefinition | undefined, viewerOwner: string | undefined, subjectOwner?: string) {
  return field?.scope === 'public' || field?.visibility === 'public' || (!!viewerOwner && viewerOwner === subjectOwner);
}
export function visibleAssertion(session: Session, pack: GamePack, viewerOwner: string | undefined, a: Pick<Assertion,'field'|'ownerId'>) { return canViewField(pack.fields.find(f => f.key === a.field), viewerOwner, a.ownerId); }
export function countSummary(value: unknown, keys: readonly string[], assertionIds: string[] = []): KnownNumber {
  const record = objectValue(value), counts = keys.map(key => countValue(record[key]));
  const known = counts.reduce<number>((n,c) => n + (c ?? 0),0), observed = counts.filter(c => c !== null).length;
  return { value: observed === keys.length ? known : null, known, status: observed === keys.length ? 'complete' : observed ? 'partial' : 'unknown', assertionIds };
}
export function canonicalBoard(session: Session): { scene: ComponentScene; assertion?: Assertion } {
  const assertion = confirmed(session,'board.layout');
  return { scene: toComponentScene(assertion?.value, assertion?.evidenceIds[0]), assertion };
}
export function harborAccess(scene: ComponentScene, playerId: string) {
  return scene.components.filter(h => h.kind === 'harbor' && h.quantity === 1 && coastalEdge(h.location.id) && h.location.type === 'edge').filter(h => scene.components.filter(other=>other.kind==='harbor'&&other.quantity!==0&&other.location.type==='edge'&&resolveSlotId('edge',other.location.id)===resolveSlotId('edge',h.location.id)).length===1).filter(h => {
    const edge = coastalEdge(h.location.id)!;
    // Duplicated or unknown building records never grant a confirmed facility.
    return edge.vertexIds.some(id => {
      const buildings = scene.components.filter(c => ['settlement','city'].includes(c.kind) && c.quantity !== 0 && c.location.type === 'vertex' && resolveSlotId('vertex',c.location.id) === id);
      return buildings.length === 1 && buildings[0].quantity === 1 && buildings[0].ownerId === playerId;
    });
  });
}
export function tradeRates(scene: ComponentScene, playerId: string, playerIds?: readonly string[]) {
  const accessible = harborAccess(scene,playerId);
  const rates = Object.fromEntries(RESOURCES.map(resource => {
    const options = accessible.filter(h => (h.variant === 'generic' && h.ratio === 3) || (h.variant === resource && h.ratio === 2));
    const ratio=Math.min(4,...options.map(h=>h.ratio!));
    return [resource, { ratio, harborIds: options.filter(h=>h.ratio===ratio).map(h=>h.id) }];
  })) as Record<Resource,{ratio:number;harborIds:string[]}>;
  const ports=scene.components.filter(c=>c.kind==='harbor'&&c.quantity!==0);
  const expectedPorts=ports.length===9 && ports.filter(h=>h.variant==='generic'&&h.ratio===3).length===4 && RESOURCES.every(r=>ports.filter(h=>h.variant===r&&h.ratio===2).length===1) && new Set(ports.map(h=>resolveSlotId('edge',h.location.id))).size===9;
  const complete = expectedPorts && scene.coverageByLayer?.harbors === 'complete' && scene.coverageByLayer?.buildings === 'complete' && !scene.components.some(c => (c.kind === 'harbor' && (!coastalEdge(c.location.id) || !((c.variant === 'generic' && c.ratio === 3) || (RESOURCES.includes(c.variant as Resource) && c.ratio === 2)))) || (['settlement','city'].includes(c.kind) && (!c.ownerId || (playerIds && !playerIds.includes(c.ownerId)) || c.quantity !== 1 || !resolveSlotId('vertex', c.location.id))));
  return { rates, accessible, complete };
}
export function playerSummary(session: Session, playerId: string) {
  const { scene, assertion } = canonicalBoard(session);
  const resourceFact = confirmed(session,'player.resources.counts',playerId);
  const resources = countSummary(resourceFact?.value,RESOURCES,resourceFact ? [resourceFact.id] : []);
  const explicitTotal = confirmed(session,'player.resources.total',playerId);
  const total = countValue(explicitTotal?.value);
  const resourceTotal: KnownNumber = total === null ? resources : { value:total,known:total,status:resources.value !== null && resources.value !== total ? 'conflict':'complete',assertionIds:[explicitTotal!.id,...resources.assertionIds] };
  const buildings = scene.components.filter(c => ['settlement','city'].includes(c.kind) && c.quantity !== 0 && c.location.type === 'vertex');
  const roads = scene.components.filter(c => c.kind === 'road' && c.quantity !== 0 && c.location.type === 'edge');
  const pieces = Object.fromEntries(['road','settlement','city'].map(kind => {
    const all = kind === 'road' ? roads : buildings;
    const layerEntries = scene.components.filter(c=>c.quantity!==0&&(kind==='road'?c.kind==='road':['settlement','city'].includes(c.kind)));
    const layerUncertain = layerEntries.some(c=>c.location.type!==(kind==='road'?'edge':'vertex') || !c.location.id);
    const occupied=all.filter(c=>c.location.id).map(c=>resolveSlotId(kind==='road'?'edge':'vertex',c.location.id));
    const layerDuplicated=new Set(occupied).size!==occupied.length;
    const entries = all.filter(c => c.kind === kind && c.ownerId === playerId && c.location.id);
    const distinct = new Map<string, typeof entries[number]>(); let duplicate = false;
    for (const c of entries) { const id = resolveSlotId(kind === 'road' ? 'edge':'vertex',c.location.id); if (!id || distinct.has(id)) duplicate = true; else distinct.set(id,c); }
    const known = [...distinct.values()].reduce((n,c) => n + (c.quantity ?? 0),0);
    const complete = scene.coverageByLayer?.[kind === 'road' ? 'roads':'buildings'] === 'complete' && !all.some(c => !c.ownerId || !session.players.some(p=>p.id===c.ownerId) || c.quantity !== 1 || !c.location.id) && !duplicate && !layerUncertain && !layerDuplicated;
    return [kind,{ value:complete ? known : null,known,status:duplicate || layerDuplicated ? 'conflict':complete ? 'complete':entries.length ? 'partial':'unknown',assertionIds:assertion ? [assertion.id]:[] }];
  })) as Record<'road'|'settlement'|'city',KnownNumber>;
  const holders = ['awards.longestRoadHolder','awards.largestArmyHolder'].map(key => confirmed(session,key));
  const knownTitle = holders.filter(a => a?.value === playerId).length;
  const buildingPoints = pieces.settlement.known + 2 * pieces.city.known;
  const scoreComplete = pieces.settlement.status === 'complete' && pieces.city.status === 'complete' && holders.every(a => typeof a?.value === 'string' && (a.value === 'none' || session.players.some(p=>p.id===a.value)));
  const publicScore: KnownNumber = { value:scoreComplete ? buildingPoints+knownTitle*2:null,known:buildingPoints+knownTitle*2,status:scoreComplete?'complete':buildingPoints||knownTitle?'partial':'unknown',assertionIds:[...(assertion?[assertion.id]:[]),...holders.flatMap(a=>a?[a.id]:[])] };
  const dev = confirmed(session,'player.development.handCounts',playerId);
  const hand = objectValue(dev?.value);
  const hiddenFact = confirmed(session,'player.score.hiddenVictoryPoints',playerId);
  const hidden = countValue(hiddenFact?.value) ?? (session.gamePack?.fields.find(f=>f.key==='player.development.handCounts')?.lifetime==='session' ? countValue(hand['victory-point']):null);
  const totalScore: KnownNumber = { value:publicScore.value !== null && hidden !== null ? publicScore.value+hidden:null,known:publicScore.known+(hidden??0),status:publicScore.value !== null && hidden !== null?'complete':hidden !== null||publicScore.known?'partial':'unknown',assertionIds:[...publicScore.assertionIds,...(hiddenFact?[hiddenFact.id]:dev?[dev.id]:[])] };
  const remainingFact = confirmed(session,'player.pieces.remaining',playerId), remaining = objectValue(remainingFact?.value);
  const supplyKnown = factValue(session,'physical.standardSupplyConfirmed') === true;
  const inventory = Object.fromEntries((['road','settlement','city'] as const).map(kind=>{ const explicit=countValue(remaining[kind]),capacity={road:15,settlement:5,city:4}[kind];return [kind,{value:explicit ?? (supplyKnown && pieces[kind].value !== null && pieces[kind].value! <= capacity ? capacity-pieces[kind].value!:null),derived:explicit===null}]; }));
  const purchaseWarnings:string[]=[];
  const purchaseBatches=factValue(session,'player.development.purchaseBatches',playerId);
  if(Array.isArray(purchaseBatches))for(const key of DEVELOPMENTS){const purchased=purchaseBatches.filter(raw=>objectValue(raw).purchasedTurnId===session.turnInstanceId).reduce<number>((sum,raw)=>sum+(countValue(objectValue(objectValue(raw).counts)[key])??0),0);const total=countValue(hand[key]);if(total!==null&&purchased>total)purchaseWarnings.push(`${key}: 이번 턴 구매 부분집합이 전체 미사용 수량보다 큽니다. 사용/기록을 직접 확인하세요.`);}
  return { playerId, purchaseWarnings, resources,resourceTotal,hand,development:countSummary(hand,DEVELOPMENTS,dev?[dev.id]:[]),purchaseBatches:factValue(session,'player.development.purchaseBatches',playerId),pieces,inventory,publicScore,totalScore,titles:holders.filter(a=>a?.value===playerId).map(a=>a!.field),rates:tradeRates(scene,playerId,session.players.map(p=>p.id)),knights:countValue(factValue(session,'player.development.knightsPlayed',playerId)),longestRoad:countValue(factValue(session,'player.road.longestContinuousSegments',playerId)) };
}

export interface TradeRecord { kind:'bank'|'player'; playerId:string; counterpartyId?:string|null; harborId?:string|null; give:Counts; receive:Counts; status:'proposed'|'in_progress'|'completed'|'cancelled'; given:Counts|null; received:Counts|null }
export function tradeRemaining(trade: TradeRecord) {
  const remainder=(expected:Counts,done:Counts|null)=>Object.entries(objectValue(expected)).flatMap(([resource,count])=>{if(countValue(count)===null)return [`${RESOURCE_NAMES[resource as Resource]||resource} 수량 미확인`];const actual=countValue(done?.[resource]);return actual===null?[`${RESOURCE_NAMES[resource as Resource]||resource} 전달량 미확인`]:(count as number)>actual?[`${RESOURCE_NAMES[resource as Resource]||resource} ${(count as number)-actual}장 남음`]:[];});
  if(trade.status==='completed'||trade.status==='cancelled')return [];
  return [...remainder(trade.give,trade.given).map(s=>'건네기 · '+s),...remainder(trade.receive,trade.received).map(s=>'수령 · '+s)];
}
export function inspectTrade(session: Session, trade: TradeRecord, viewerOwner?: string): { validRatio:boolean; messages:string[]; ratio:number; harborIds:string[] } {
  const {scene}=canonicalBoard(session), facility=tradeRates(scene,trade.playerId,session.players.map(p=>p.id));
  const gives=Object.entries(trade.give).filter(([,n])=>n!==0),receives=Object.entries(trade.receive).filter(([,n])=>n!==0);
  const [resource,give]=gives[0]??[],[receiveResource,receive]=receives[0]??[];
  const rate=facility.rates[resource as Resource],ratio=rate?.ratio??4;
  const messages:string[]=[];
  const validRatio=trade.kind==='player' ? gives.length>0&&receives.length>0&&gives.every(([r,n])=>RESOURCES.includes(r as Resource)&&countValue(n)!>0&&!receives.some(([other])=>other===r))&&receives.every(([r,n])=>RESOURCES.includes(r as Resource)&&countValue(n)!>0) : gives.length===1&&receives.length===1&&resource!==receiveResource&&RESOURCES.includes(resource as Resource)&&RESOURCES.includes(receiveResource as Resource)&&countValue(give)!>0&&countValue(receive)!>0&&give===receive!*ratio;
  messages.push(validRatio ? trade.kind==='bank'?`${ratio}:1 비율 충족`:'양쪽 자원 교환 내용 기록':'수량·서로 다른 자원·한 종류의 내는 자원 비율을 확인하세요');
  const current=factValue(session,'currentPlayer'),phase=factValue(session,'turn.phase'),pending=factValue(session,'turn.pendingEffect');
  if(trade.kind==='bank'&&current!==trade.playerId)messages.push(current?'상대 턴에는 은행·항구 교역 불가':'현재 차례 미확인');
  if(trade.kind==='player' && (!trade.counterpartyId || trade.counterpartyId===trade.playerId || !session.players.some(p=>p.id===trade.counterpartyId)))messages.push('서로 다른 거래 상대를 선택하세요');
  if(trade.kind==='player'&&current!==trade.playerId&&current!==trade.counterpartyId)messages.push(current?'현재 플레이어가 거래 당사자여야 합니다':'현재 차례 미확인');
  if(['seven_discard','robber_move','robber_steal'].includes(String(phase))||pending&&!['none','trade'].includes(String(pending)))messages.push('남은 도둑·개발 카드 처리를 마친 뒤 교역하세요');
  if(pending==='trade')messages.push('진행 중인 실제 교역의 남은 전달부터 확인하세요');
  const profile=factValue(session,'rulesProfile') ?? (session.gamePack?.edition==='Base Game (2020 rules)'?'base-2020':null),mode=factValue(session,'tradeBuildMode');
  if(phase==='build'&&profile==='base-2020'&&mode==='separate')messages.push('분리 모드 건설 단계: 다음 자기 턴 거래 단계까지 기다리세요');
  else if(phase==='action'&&(profile==='base-6e-2025'||mode==='combined'))messages.push('통합 행동 단계: 건설 후에도 확인된 항구를 이용할 수 있습니다');
  else if(phase!=='trade'&&phase!=='action')messages.push('거래 가능한 단계·판본을 확인하세요');
  if(profile===null||mode===null||mode===undefined)messages.push('판본·거래/건설 방식 미확인');
  if(pending===undefined||pending===null)messages.push('남은 효과·처리 상태 미확인');
  const hand=viewerOwner===trade.playerId?objectValue(factValue(session,'player.resources.counts',trade.playerId)):{};
  if(viewerOwner!==trade.playerId)messages.push('자원 종류별 보유 수는 소유자 화면에서 확인하세요');
  for(const [r,n] of viewerOwner===trade.playerId?gives:[]){const have=countValue(hand[r]);if(have===null)messages.push(`${RESOURCE_NAMES[r as Resource]||r} 손패 수 미확인`);else if(typeof n==='number'&&have<n)messages.push(`${RESOURCE_NAMES[r as Resource]||r} 확인 손패가 부족합니다(이미 전달한 상태라면 전달 기록을 확인)`);}
  if(trade.kind==='bank'){const bank=objectValue(factValue(session,'physical.bankResources'));for(const [r,n] of receives){const have=countValue(bank[r]);if(have===null)messages.push(`${RESOURCE_NAMES[r as Resource]||r} 은행 재고 미확인`);else if(typeof n==='number'&&have<n)messages.push(`${RESOURCE_NAMES[r as Resource]||r} 은행 재고 부족`);}}
  for(const [expected,actual] of [[trade.give,trade.given],[trade.receive,trade.received]] as const)for(const [resource,amount] of Object.entries(actual??{})){const planned=countValue(expected[resource]);if(typeof amount==='number'&&amount>0&&(planned===null||amount>planned))messages.push('실제 전달량에 계획 밖 또는 초과 수량이 있습니다. 원본을 유지하고 직접 확인하세요');}
  if(!facility.complete)messages.push('현재 확인된 항구 비율입니다. 미확인 해안·건물은 계산하지 않았습니다');
  return {validRatio,messages,ratio,harborIds:rate?.harborIds??[]};
}
export function catanNextProcedure(session: Session): string {
  const trade=objectValue(factValue(session,'turn.trade'));
  if(trade.kind){const remaining=tradeRemaining(trade as unknown as TradeRecord);if(remaining.length)return remaining.join(' · ');}
  const phase=factValue(session,'turn.phase'),cause=factValue(session,'robber.cause'),returnPhase=factValue(session,'turn.returnPhase');
  if(phase==='robber_move'||phase==='robber_steal')return `${cause==='knight'?'기사 효과 · 버리기 없음 · ':''}${phase==='robber_move'?'도둑을 기존 칸과 다른 육지 칸으로 옮기기':'피해자 없음 또는 실제 훔치기 완료 확인'}${returnPhase?` → ${returnPhase==='await_roll'?'주사위 굴리기':returnPhase}로 복귀`:''}`;
  if(phase==='seven_discard')return session.players.map(p=>{const left=countValue(factValue(session,'player.discard.remainingCount',p.id));return `${p.name}: ${left===null?'버리기 남은 수 미확인':left+'장 남음'}`;}).join(' · ');
  if(phase==='setup')return `초기 배치 ${factValue(session,'setup.round')??'?'}차 · ${factValue(session,'setup.step')??'다음 말 확인'} · 실제 좌석 순서와 시작 자원 지급 확인`;
  if(phase==='finished'||factValue(session,'game.status')==='finished')return '확인한 승자와 최종 상태 보존';
  if(phase==='build'&&factValue(session,'rulesProfile')==='base-2020'&&factValue(session,'tradeBuildMode')==='separate')return '건설을 계속합니다. 은행·항구 교역은 다음 자기 턴 거래 단계까지 기다리세요';
  const pending=factValue(session,'turn.pendingEffect');if(pending&&pending!=='none')return `남은 효과 ${pending}: ${factValue(session,'turn.pendingEffectDetails')??'실제 남은 작업 확인'}`;
  return String(factValue(session,'resume.nextProcedure')??'현재 차례·단계와 남은 처리를 먼저 확인하세요');
}

export function conditionMatches(condition: import('./types').Condition | undefined, session: Session, ownerId?: string): boolean {
  if(!condition)return true;
  if(condition.op==='and')return (condition.conditions??[]).every(c=>conditionMatches(c,session,ownerId));
  if(condition.op==='or')return (condition.conditions??[]).some(c=>conditionMatches(c,session,ownerId));
  if(condition.op==='not')return condition.conditions?.length===1&&!conditionMatches(condition.conditions[0],session,ownerId);
  const subject=condition.owner==='$owner'?ownerId:condition.owner==='public'||!condition.owner?undefined:condition.owner;
  const fact=confirmed(session,condition.field??'',subject),expected=condition.value==='$owner'?ownerId:condition.value;
  if(condition.op==='exists')return condition.value===false?!fact:!!fact;
  if(!fact)return false;
  if(condition.op==='eq')return JSON.stringify(fact.value)===JSON.stringify(expected);
  if(condition.op==='neq')return JSON.stringify(fact.value)!==JSON.stringify(expected);
  return typeof fact.value==='number'&&typeof expected==='number'&&fact.value>expected;
}
