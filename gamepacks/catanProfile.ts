import type { Condition, FieldDefinition, GamePack, Requirement } from '../shared/types';
const eq=(field:string,value:any):Condition=>({field,op:'eq',value});
const anyPhase=(...phases:string[]):Condition=>({op:'or',conditions:phases.map(p=>eq('turn.phase',p))});
const all=(...conditions:Condition[]):Condition=>({op:'and',conditions});
const ownTurn=eq('currentPlayer','$owner');

/** Only applied to the bundled new pack; imported/pinned historical packs are never rewritten. */
export function catanInformationProfile(pack:GamePack):GamePack {
  pack.version='2.0.0';pack.edition='Base Game (2025 6th edition; 2020 profile selectable)';
  // Official base rulebook p.10, Number Tokens / Resource Production: duplicates matter.
  pack.sources.push({id:'rules-number-inventory',title:'CATAN Game Rules & Almanac (2020)',url:'https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf',section:'p.10: Number Tokens; Resource Production'});
  pack.catanNumberInventory={values:[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12],sourceId:'rules-number-inventory'};
  pack.sources.push({id:'rules-sixth',title:'CATAN — The Game, 6th edition (2025)',url:'https://www.catan.com/sites/default/files/2025-03/CN3081%20CATAN%E2%80%93The%20Game%20Rulebook%20secure%20%281%29.pdf',section:'pp. 6–12: action, trade, development, setup'},{id:'rules-faq',title:'CATAN official Basegame FAQ',url:'https://www.catan.com/faq/basegame',section:'Resource Cards / Development Cards / Trade / Victory Conditions'});
  pack.placement?.slots.push({kind:'harbor',locationTypes:['edge','unplaced']});
  for(const f of pack.fields){f.visibility=f.scope==='public'?'public':'owner';f.lifetime=f.group==='turn'?'turn':'session';f.ui={level:['currentPlayer','turn.phase','turn.pendingEffect','turn.pendingEffectDetails','player.discard.remainingCount'].includes(f.key)?'primary':'detail',order:50};}
  for(const key of ['player.resources.total','player.development.knightsPlayed','player.road.longestContinuousSegments','player.discard.remainingCount'])pack.fields.find(f=>f.key===key)!.visibility='public';
  for(const key of ['player.resources.total','player.development.knightsPlayed','player.road.longestContinuousSegments'])pack.fields.find(f=>f.key===key)!.acquisition='observe';
  for(const key of ['player.development.boughtThisTurnType','player.development.boughtThisTurnIdentity'])pack.fields.find(f=>f.key===key)!.lifetime='session';
  const counts=pack.fields.find(f=>f.key==='player.resources.counts')!;counts.ui!.editor='resource-counts';pack.fields.find(f=>f.key==='physical.bankResources')!.ui!.editor='resource-counts';
  const dev=pack.fields.find(f=>f.key==='player.development.handCounts')!;dev.description='이번 턴 구매분을 이미 포함한 미사용 전체 수량입니다. 구매 묶음을 다시 더하지 않습니다.';dev.lifetime='session';dev.ui!.editor='development-counts';
  pack.fields.find(f=>f.key==='turn.phase')!.options!.push({value:'setup',label:'초기 배치'},{value:'action',label:'행동 · 거래와 건설'},{value:'finished',label:'게임 종료'});
  const add=(key:string,label:string,type:FieldDefinition['type'],scope:FieldDefinition['scope'],group:string,extra:Partial<FieldDefinition>={})=>pack.fields.push({key,label,type,scope,group,description:'확인한 실제 상태를 기록합니다. 모르면 비워 두세요.',acquisition:'ask',visibility:scope==='public'?'public':'owner',lifetime:group==='turn'?'turn':'session',ui:{level:'primary',order:30},...extra});
  const options=(values:string[],labels:string[])=>values.map((value,i)=>({value,label:labels[i]}));
  add('rulesProfile','규칙 판본','select','public','rules',{options:options(['base-6e-2025','base-2020'],['6판 · 2025','2020 규칙'])});
  add('tradeBuildMode','거래·건설 순서','select','public','rules',{options:options(['combined','separate'],['통합 · 거래/건설 자유 순서','분리 · 거래 후 건설'])});
  add('turn.trade','중단된 실제 교역','json','public','turn',{ui:{level:'primary',order:5}});
  add('robber.cause','도둑 활성화 원인','select','public','turn',{options:options(['seven','knight'],['주사위 7 · 버리기 포함','기사 · 버리기 없음'])});
  add('turn.returnPhase','효과 처리 후 돌아갈 단계','select','public','turn',{options:pack.fields.find(f=>f.key==='turn.phase')!.options});
  add('turn.productionRemaining','남은 자원 지급·은행 부족','text','public','turn');
  add('setup.round','초기 배치 차수 · 1 또는 2','number','public','turn');
  add('setup.step','초기 배치 다음 처리','select','public','turn',{options:options(['settlement','road','starting_resources'],['마을 놓기','해당 마을의 도로 놓기','둘째 마을의 시작 자원 지급'])});
  add('setup.seatOrderConfirmed','좌석이 실제 턴 순서인가요','boolean','public','rules');
  add('setup.startingResourcesResolvedByPlayer','둘째 마을 시작 자원 지급 완료','boolean','player','turn');
  add('game.status','게임 진행/종료','select','public','rules',{options:options(['playing','finished'],['진행 중','종료 확인'])});
  add('game.winnerPlayerId','확인한 승자','select','public','rules',{options:[]});
  add('player.pieces.remaining','실제 남은 도로·마을·도시','json','player','physical',{visibility:'public',ui:{level:'detail',order:60}});
  add('physical.standardSupplyConfirmed','기본 공급량·누락 없음 확인','boolean','public','physical',{ui:{level:'detail',order:60}});
  add('player.score.hiddenVictoryPoints','내 비공개 승점 카드 수','number','player','development',{ui:{level:'detail',order:60}});
  add('player.development.purchaseBatches','구매 카드 묶음 · 전체 손패의 부분집합','json','player','development',{description:'구매 턴·종류별 수 또는 정체 미상의 실물 묶음을 보존합니다. 전체 손패에 다시 더하지 않습니다.',ui:{level:'detail',order:60}});
  add('player.development.unusedTotal','확인한 미사용 개발 카드 총수','number','player','development',{visibility:'public',ui:{level:'detail',order:60}});
  const requirement=(id:string,fields:string[],when?:Condition,scope:Requirement['scope']='public',priority=95)=>pack.requirements.push({id,fields,when,scope,priority,reason:'중단 지점의 실제 남은 작업과 확인 범위를 보존합니다.'});
  requirement('need-profile',['rulesProfile','tradeBuildMode']);
  requirement('need-robber-origin',['robber.cause','turn.returnPhase','robber.resolutionStep'],anyPhase('robber_move','robber_steal'));
  requirement('need-setup',['setup.round','setup.step','setup.seatOrderConfirmed'],eq('turn.phase','setup'));
  requirement('need-starting-resources',['setup.startingResourcesResolvedByPlayer'],all(eq('turn.phase','setup'),eq('setup.round',2)),'player');
  requirement('need-production-remaining',['turn.productionRemaining'],all(eq('turn.phase','production'),eq('turn.productionResolved',false)));
  requirement('need-finished',['game.winnerPlayerId'],{op:'or',conditions:[eq('game.status','finished'),eq('turn.phase','finished')]});
  const set=(id:string,when:Condition)=>{const r=pack.requirements.find(r=>r.id===id);if(r)r.when=when;};
  set('need-dice-after-roll',{op:'or',conditions:[all(eq('turn.phase','production'),eq('turn.productionResolved',false)),eq('turn.phase','seven_discard'),all(eq('robber.cause','seven'),anyPhase('robber_move','robber_steal'))]});
  set('need-production-resolution',eq('turn.phase','production'));
  set('need-seven-resolution',all(anyPhase('seven_discard','robber_move','robber_steal'),{op:'or',conditions:[eq('turn.phase','seven_discard'),eq('robber.cause','seven')]}));
  set('need-action-card-play-status',anyPhase('await_roll','production','trade','build','action','robber_move','robber_steal','end_turn'));
  set('need-purchase-status',anyPhase('trade','build','action','end_turn'));
  set('need-bought-card-type',all(eq('turn.developmentCardBoughtThisTurn',true),ownTurn));
  for(const r of pack.derivedRules)if(r.id==='resume-build')r.value='분리 모드는 건설을 계속하고, 통합 모드는 거래·건설을 계속합니다. 이번 턴 구매 묶음은 구분합니다.';
  for(const [phase,value] of [['action','남은 거래·건설 또는 개발 카드 효과부터 이어갑니다. 실제 전달을 반복하지 않습니다.'],['setup','현재 배치 차수·사람·다음 말과 시작 자원 지급부터 이어갑니다.'],['finished','확인한 승자와 최종 판을 보존합니다.']])pack.derivedRules.push({id:'resume-'+phase,scope:'public',when:all(eq('turn.phase',phase),eq('turn.pendingEffect','none')),field:'resume.nextProcedure',value,reason:'기록한 단계에서 도출'});
  const board=pack.preservationTemplates.find(t=>t.id==='board-public-state')!;board.description='바다 프레임·항구와 육지 → 숫자 → 건물·도로·도둑 순으로 원본과 맞춰 복원합니다.';board.conditions.unshift('항구의 해안 변·종류·비율과 두 접점을 유지합니다. 미확인 항구를 채워 넣지 않습니다.');
  const bought=pack.preservationTemplates.find(t=>t.id==='newly-bought-development-card')!;bought.when={op:'or',conditions:[bought.when!,all({field:'player.development.purchaseBatches',owner:'$owner',op:'exists'},{field:'player.development.purchaseBatches',owner:'$owner',op:'neq',value:[]})]};bought.description='이번 턴 구매분을 전체 미사용 손패 안에서 구분하고, 이미 전체 수량에 포함된 부분집합으로 보관합니다. 턴이 바뀌어도 카드 정체를 버리지 않습니다.';
  for(const id of ['player-resource-hands','player.development.handCounts'])pack.preservationTemplates.find(t=>t.id===id)!.restoreAfter=['board-public-state','physical.bankResources','ordered-development-deck'];
  pack.supportGaps=pack.supportGaps.filter(s=>!s.includes('정확한 꼭짓점'));pack.supportGaps.push('항구는 관측/직접 확인한 해안 변만 기록합니다. 부분 관측으로 누락 항구·실제 재고·과거 타이틀 보유자를 추정하지 않습니다.');
  for (const field of pack.fields) { const rules=pack.requirements.filter(r=>r.fields.includes(field.key)); if(rules.length&&rules.every(r=>r.when)) field.ui!.showWhen={op:'or',conditions:rules.map(r=>r.when!)}; }
  return pack;
}
