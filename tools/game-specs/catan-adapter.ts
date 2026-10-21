import { catanPack } from '../../gamepacks/catan.ts';
import { CATAN_TOPOLOGY, SCENE_KINDS, SCENE_VARIANTS } from '../../shared/scene.ts';
import type { Condition, GamePack } from '../../shared/types.ts';
import { validateSpecification, type Specification } from './validate.ts';

/** Research-format adapter only. Does not install a pack or change the product's readers. */
export function fromCatanPack(pack: GamePack = catanPack): Specification {
  const evidence = (source?: string) => ({ source_refs: source ? [source, 'current-pack'] : ['current-pack'], confidence: 'reported' });
  const fields = new Set(pack.fields.map(f => f.key));
  const derived = new Set(pack.derivedRules.map(r => r.field));
  const convertCondition = (c?: Condition): any => c ? {
    op: c.op, ...(c.field ? { field_id: c.field } : {}), ...(c.owner ? { owner: c.owner } : {}),
    ...('value' in c ? { value: c.value } : {}), ...(c.conditions ? { conditions: c.conditions.map(convertCondition) } : {}),
  } : undefined;
  const conditionFields = (c?: Condition): string[] => c ? [...new Set([...(c.field ? [c.field] : []), ...(c.conditions ?? []).flatMap(conditionFields)])] : [];
  const ruleBasics = { component_ids: [], area_ids: [] };
  const sceneKinds = ['terrain','number-token','road','settlement','city','robber','harbor','token','unknown'];
  const components = SCENE_KINDS.map(kind => ({ id: kind, name: kind, kind, quantity: null, quantity_scope: 'unknown', variants: (SCENE_VARIANTS[kind] ?? []).map(o => o.value), properties: ['quantity/null','ownerId/observedColor','location','evidenceId/region','number/ratio','direction/face/attachedToId'], description: '기존 계약의 구성물 종류. 실제 수량과 보이지 않는 정보는 추정하지 않는다.', ...evidence() }));
  const area = (id: string, scope: string, visibility: string, topology: string, ids: string[], count: number | null, anchor: string) => ({ id, name: id, scope, visibility, topology, dynamic: count === null, fixed_slot_count: count, slot_kinds: id === 'board' ? ['hex','edge','vertex'] : ['zone','index'], component_ids: ids, anchor_contract: anchor, description: 'Existing Catan recording contract, not a universal game geometry.', ...evidence() });
  const rules = [
    ...pack.requirements.map(r => ({ id: 'requirement.' + r.id, name: r.id, kind: 'requirement', scope: r.scope, summary: r.reason, field_ids: [...new Set([...r.fields, ...conditionFields(r.when)])], ...ruleBasics, required_field_ids: r.fields, ...(r.when ? { when: convertCondition(r.when) } : {}), ...evidence(r.sourceId) })),
    ...pack.derivedRules.map(r => ({ id: 'derived.' + r.id, name: r.id, kind: 'derived', scope: r.scope, summary: r.reason + (['player.development.newActionCardUnavailableThisTurn','player.development.newVictoryPointCanBeRevealedToWin'].includes(r.field) ? ' 실행기 조건: 구매 assertion의 turnInstanceId가 현재 턴과 같을 때만 적용한다. 구매 턴 미상은 추측하지 않는다.' : ''), field_ids: [...new Set([r.field,...conditionFields(r.when)])], ...ruleBasics, when: convertCondition(r.when), effect: { field_id: r.field, value: r.value }, ...evidence(r.sourceId) })),
  ];
  return {
    schema_version: '1.0', game_id: 'catan', name_ko: '카탄', name_en: pack.title,
    edition: { id: 'current-pack-' + pack.version, name: pack.edition, compatibility_notes: ['기존 고정 팩의 판본을 그대로 표시한다. 형식 변환은 판본/규칙을 갱신하지 않는다.'], ...evidence() },
    components,
    layout: { areas: [
      area('board','public','public','hex',sceneKinds,CATAN_TOPOLOGY.hexes.length,`Existing canonical hex/edge/vertex aliases; ${CATAN_TOPOLOGY.hexes.length} hex, ${CATAN_TOPOLOGY.vertices.length} vertices, ${CATAN_TOPOLOGY.edges.length} edges. Harbor is an independent coastal-edge layer with two vertex endpoints. Source crop is independent of slot geometry.`),
      area('hand','player','owner','stack',['resource-card','development-card'],null,'Owner-scoped card catalog/counts. Identical illustrations do not prove the same physical card.'),
      area('supply','public','public','stack',['deck','resource-card','container'],null,'Named physical supply/bank area; unread contents remain unknown.'),
      area('ordered-deck','shared-secret','hidden','stack',['deck','development-card'],null,'Preserve original order without photographing hidden faces.'),
    ], relations: [], notes: ['Catan-specific anchors remain a selected extension capability. No other game is required to use 19 hexes.'] },
    state_fields: pack.fields.map(f => ({ id: f.key, label: f.label, scope: f.scope, visibility: f.scope === 'public' ? 'public' : f.visibility ?? 'owner', type: f.presentation === 'scene' || ['board.layout','components.observed','player.components.observed'].includes(f.key) ? 'component-scene' : f.type === 'select' ? 'enum' : f.type,
      lifetime: ['player.development.boughtThisTurnType','player.development.boughtThisTurnIdentity'].includes(f.key) ? 'session' : f.lifetime ?? (f.group === 'turn' ? 'turn' : 'session'),
      acquisition: derived.has(f.key) ? ['derived'] : f.acquisition === 'observe' ? ['photo','manual'] : f.acquisition === 'ask' ? ['manual'] : ['physical','manual'],
      description: f.description, component_ids: [], area_ids: f.key === 'board.layout' || f.key === 'components.observed' ? ['board'] : f.scope === 'player' && f.visibility !== 'public' ? ['hand'] : [], rule_ids: rules.filter(r => r.field_ids.includes(f.key)).map(r => r.id), ...(f.options ? { options: f.options } : {}), ...(f.type === 'select' && !f.options?.length && f.key === 'game.winnerPlayerId' ? { option_source: 'players' } : {}), ...evidence(f.sourceId) })),
    rules,
    resume: { required_field_ids: [], pending_action_fields: ['turn.phase','turn.pendingEffect','turn.pendingEffectDetails'].filter(id => fields.has(id)), preserve_procedures: pack.preservationTemplates.map(p => ({ id: p.id, label: p.label, scope: p.scope, visibility: p.scope === 'public' ? 'public' : 'owner', field_ids: [...new Set([...pack.fields.filter(f => f.key === p.id || f.preservationId === p.id).map(f => f.key), ...(p.visualFields ?? []).filter(id => fields.has(id))])], method: p.id === 'board-public-state' ? 'photo' : p.id === 'physical.bankResources' ? 'count' : p.id.includes('ordered') ? 'ordered-bundle' : 'sealed-bundle', order_sensitive: p.id.includes('ordered'), steps: [p.description,...p.conditions], after: p.restoreAfter, ...(p.when ? { when: convertCondition(p.when) } : {}), ...evidence() })), opening_policy: 'retain-saved-turn', notes: ['Full hand counts and purchase subsets are not added twice. Purchase-turn limitation needs the recorded purchase turn; missing legacy turn is unknown.', 'The current UI uses optional recording mode; declarative requirements here do not activate missing forms.'] },
    recognition_correction: { photographable_field_ids: pack.fields.filter(f => f.acquisition === 'observe' && !derived.has(f.key)).map(f => f.key), must_ask_field_ids: [], never_infer: ['보이지 않는 카드·덱 순서·과거 구매 턴·처리 완료·미확인 항구를 사진에서 만들지 않는다.','후보/부분 사진/다른 소유자 장면을 무조건 합산하지 않는다.'], correction_targets: [
      { id: 'board-editor', scope: 'public', component_ids: sceneKinds, field_ids: pack.fields.filter(f => f.scope === 'public' && (f.presentation === 'scene' || ['board.layout','components.observed'].includes(f.key))).map(f => f.key), area_ids: ['board'], operations: ['add','remove','move','swap','count','owner','identity','number','orientation','attachment'], anchor_strategy: 'Canonical board slot + separate source evidence ID/crop; exclusive layers swap atomically and support one-step undo.', notes: ['Keep terrain, number, robber and harbor layers independent; ambiguous occupants are not silently chosen.'] },
      { id: 'owner-editor', scope: 'player', component_ids: ['resource-card','development-card'], field_ids: pack.fields.filter(f => f.scope === 'player').map(f => f.key), area_ids: ['hand'], operations: ['add','remove','count','identity','note'], anchor_strategy: 'Owner-scoped original photo/card list + typed quantities; unknown differs from zero.', notes: ['Public totals and owner-only identities have different visibility.'] },
    ], privacy_policy: 'owner-scoped' },
    extensions: [], custom_setup: { allowed: true, description: '사용자가 확인한 커스텀 배치는 기록 가능하며 기존 위반 상태를 합법 판으로 자동 수정하지 않는다.', editable_area_ids: ['board'], editable_component_ids: sceneKinds, invariant_rule_ids: [] },
    sources: [ { id: 'current-pack', title: 'Current local Catan pack and scene contract (implementation reference)', url: null, kind: 'implementation', access: 'opened', checked_at: '2026-10-21', note: `Read-only adapter of gamepacks/catan.ts ${pack.version}, shared/scene contract. Not a new official-rule verification.` }, ...pack.sources.map(s => ({ id: s.id, title: s.title, url: s.url, kind: 'official-rules', access: 'not-checked', checked_at: null, note: `Inherited citation, not reopened in this task: ${s.section}` })) ],
    confidence: 'reported', gaps: [...pack.supportGaps,'이 어댑터는 기존 상세 계약을 새 연구 형식으로 표현한다. 새 형식의 제품 실행기/인식 품질/규칙 사실성을 검증한 것은 아니다.'],
  };
}

export function catanContractProbe() {
  const specification = fromCatanPack(), result = validateSpecification(specification);
  return { valid: result.valid, issues: result.issues, fields: specification.state_fields.length, requirements: specification.rules.filter((r: any) => r.kind === 'requirement').length, derived: specification.rules.filter((r: any) => r.kind === 'derived').length, preserve: specification.resume.preserve_procedures.length, original: { fields: catanPack.fields.length, requirements: catanPack.requirements.length, derived: catanPack.derivedRules.length, preserve: catanPack.preservationTemplates.length }, factualVerification: false };
}
