#!/usr/bin/env python3
"""Cloud session 2026-10-26: source revisions backed by the official rule texts already stored under
docs/art-confirmation/sources. Each change cites the page it rests on (see review.json). Existing fields keep their
scope and visibility; a newly separated public or hidden part gets its own area/field instead, so older records are
never re-labelled. Idempotent: rerunning leaves the files unchanged."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = ROOT / 'docs/research/game-specs-120/games'
NOTES = ['이동·교환·삭제는 저장 기록 정정이며 실제 턴 수행으로 간주하지 않는다.', '한 번의 다중 정정은 하나의 Undo 단위. 원본과 기존 숨은 값은 보존한다.']
PUBLIC_STEPS = ['정리하기 전에 공개 장면의 참조 사진 또는 수동 배치 기록을 남긴다. 사진 없이도 모름/나중에 저장을 허용한다.', '기존 장면의 구역·그룹·층·부착 대상·방향과 같은 것끼리의 중복 인스턴스를 구분한다. 뒷면이 섞인 공개 장면은 위치/앞뒤만 기록하고 정체를 확인하려 뒤집지 않는다.', '분해가 필요하면 구역/실제 소유자별 묶음 ID와 보관 위치를 적고 구역 경계를 유지한다. 원래 순서가 의미 있는 줄·덱·부착은 그 관계를 유지; 무순서 풀에 새 게임상 순서를 만들지 않는다.', '재개 시 참조 기록과 실물을 비교한 뒤 남은 처리만 이어 간다. 사진과 다른 값을 자동 수용하거나 미지의 정체·수량을 채우지 않는다.']
SEALED_TAIL = ['내용을 모르면 펼쳐 확인하지 않고 물리 묶음/소유자와 메모만 남긴다.', '묶음 ID·실제 소유자/허용 역할·봉인 여부·보관 위치를 남긴다. 순서가 있는 묶음은 위/아래 방향과 내부 경계를 유지한다. 내용·수량을 모르면 모름으로 보존하고 펼치지 않는다.']


def load(game):
    return json.loads((SPEC / f'{game}.json').read_text(encoding='utf8'))


def save(game, spec):
    (SPEC / f'{game}.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def area(spec, area_id):
    return next(a for a in spec['layout']['areas'] if a['id'] == area_id)


def field(spec, field_id):
    return next(f for f in spec['state_fields'] if f['id'] == field_id)


def note(text, addition):
    """Append a clarifying sentence once."""
    return text if addition in text else f'{text} {addition}'


def describe_area(spec, area_id, addition, field_id=None):
    a = area(spec, area_id)
    a['description'] = note(a['description'], addition)
    if field_id:
        f = field(spec, field_id)
        f['description'] = note(f['description'], addition)


def add_area(spec, *, area_id, name, scope, visibility, topology, component_ids, contract, source):
    """A new public or owner area with its scene field, correction target, preservation and setup entry."""
    if any(a['id'] == area_id for a in spec['layout']['areas']):
        return
    public = visibility == 'public'
    spec['layout']['areas'].append({'id': area_id, 'name': name, 'scope': scope, 'visibility': visibility, 'topology': topology, 'dynamic': True, 'fixed_slot_count': None, 'slot_kinds': [topology], 'component_ids': component_ids, 'anchor_contract': contract, 'description': f'{contract} 보이지 않는 정체·수량은 미확인으로 둔다.', 'source_refs': [source], 'confidence': 'verified'})
    key = f'{area_id}.scene'
    spec['state_fields'].append({'id': key, 'label': name, 'scope': scope, 'visibility': visibility, 'type': 'component-scene', 'lifetime': 'session', 'acquisition': ['photo', 'manual', 'physical'] if public else ['manual', 'physical'], 'description': f'{contract} 실물 인스턴스 ID·앞뒷면·그룹/순서·소유자·사진 근거를 별개로 보존한다. 가린 정체는 추정하지 않는다.', 'component_ids': component_ids, 'area_ids': [area_id], 'rule_ids': [], 'source_refs': [source], 'confidence': 'verified'})
    rc = spec['recognition_correction']
    if public and key not in rc['photographable_field_ids']:
        rc['photographable_field_ids'].append(key)
    rc['correction_targets'].append({'id': f'{area_id}.edit', 'scope': scope, 'component_ids': component_ids, 'field_ids': [key], 'area_ids': [area_id], 'operations': ['add', 'remove', 'move', 'swap', 'identity', 'count', 'note', 'orientation', 'attachment', 'owner'], 'anchor_strategy': contract, 'notes': NOTES})
    procedures = spec['resume']['preserve_procedures']
    if public:
        target = next((p for p in procedures if p['id'] == f'essentials.public-layout.{scope}'), None)
        if target:
            target['field_ids'].append(key)
        else:
            procedures.append({'id': f'essentials.public-layout.{scope}', 'label': '공개 배치·묶음 복원 참조(선택)', 'scope': scope, 'visibility': 'public', 'field_ids': [key], 'method': 'manual-note', 'order_sensitive': False, 'steps': PUBLIC_STEPS, 'after': [], 'source_refs': ['essentials.storage-guidance'], 'confidence': 'recommendation'})
    else:
        procedures.append({'id': f'{area_id}.preserve', 'label': f'{name} 보존(선택)', 'scope': scope, 'visibility': visibility, 'field_ids': [key], 'method': 'sealed-bundle', 'order_sensitive': False, 'steps': [contract] + SEALED_TAIL, 'after': [], 'source_refs': ['essentials.storage-guidance'], 'confidence': 'recommendation'})
    setup = spec.get('custom_setup')
    if setup and setup.get('allowed') and area_id not in setup['editable_area_ids']:
        setup['editable_area_ids'].append(area_id)


def add_hidden_bundle(spec, *, field_id, label, component_ids, contract, source):
    """A shared face-down stack kept as a physical bundle only: no photo, no area, contents never filled in."""
    if any(f['id'] == field_id for f in spec['state_fields']):
        return
    spec['state_fields'].append({'id': field_id, 'label': label, 'scope': 'shared-secret', 'visibility': 'hidden', 'type': 'component-scene', 'lifetime': 'session', 'acquisition': ['manual', 'physical'], 'description': contract, 'component_ids': component_ids, 'area_ids': [], 'rule_ids': [], 'source_refs': [source], 'confidence': 'verified'})
    spec['resume']['preserve_procedures'].append({'id': f'{field_id.removesuffix(".scene")}.preserve', 'label': f'{label} 보존(선택)', 'scope': 'shared-secret', 'visibility': 'hidden', 'field_ids': [field_id], 'method': 'sealed-bundle', 'order_sensitive': True, 'steps': [contract] + SEALED_TAIL, 'after': [], 'source_refs': ['essentials.storage-guidance'], 'confidence': 'recommendation'})


def apply():
    s = load('crew-deep-sea')
    describe_area(s, 'won', '획득한 트릭은 뒷면으로 자기 앞에 쌓으며 가장 최근 트릭만 다시 볼 수 있다. 이전 트릭의 앞면은 펼쳐 기록하지 않는다. 임무 카드 아래 앞면으로 둔 카드는 공개다.', 'won.scene')
    save('crew-deep-sea', s)

    s = load('agricola')
    describe_area(s, 'stock', '앞면으로 내려놓은 직업·보조 설비도 이 개인 공개 영역에 둔다. 손에 든 카드는 hand에 남는다.', 'stock.scene')
    describe_area(s, 'actions', '앞면으로 놓인 주요 설비 보급판도 공용 공개 정보다.', 'actions.scene')
    save('agricola', s)

    s = load('anachrony')
    add_area(s, area_id='warp-hand', name='숨겨 고른 워프 타일', scope='player', visibility='owner', topology='zone', component_ids=['resources'],
             contract='워프 단계에서 손에 숨겨 고른 워프 타일(0–2개)은 공개 전까지 본인만 안다. 공개 뒤에는 시대 트랙에 공개 기록한다.', source='anachrony.art-confirmation.anachrony-primary')
    describe_area(s, 'timeline', '아직 뒤집지 않은 슈퍼프로젝트는 뒷면 그대로 두고 정체를 기록하지 않는다.', 'timeline.scene')
    save('anachrony', s)

    s = load('arkham-horror-3')
    describe_area(s, 'player', '상태(condition) 카드는 앞면만 공개이며, 효과가 지시하기 전에는 소유자도 뒷면을 보지 않는다(415.7).', 'player.scene')
    describe_area(s, 'private', '상태 카드 뒷면은 소유자도 모르는 숨김 정보이므로 이 영역에 기록하지 않는다.', 'private.scene')
    save('arkham-horror-3', s)

    s = load('barrage')
    add_hidden_bundle(s, field_id='contract-piles.scene', label='개인 계약 타일 더미', component_ids=['engineers'],
                      contract='뒷면 종류별로 나눈 세 개의 개인 계약 타일 더미는 뒷면으로 쌓여 있다. 더미별 위/아래와 경계만 실물로 보존하고 정체를 펼쳐 기록하지 않는다.', source='barrage.art-confirmation.barrage-rules')
    describe_area(s, 'company', '수행한 계약은 뒷면으로 개인 공급에 두며 개수는 최종 점수에 쓰인다.', 'company.scene')
    save('barrage', s)

    s = load('istanbul')
    add_area(s, area_id='bonus-discard', name='보너스 카드 버림', scope='public', visibility='public', topology='stack', component_ids=['cards'],
             contract='사용하거나 버린 보너스 카드는 대상인 숙소(Caravansary)의 앞면 버림 더미에 쌓인다. 미공개 뽑기 더미와 섞지 않는다.', source='istanbul.art-confirmation.istanbul-rules')
    describe_area(s, 'decks', '앞면 보너스 카드 버림은 bonus-discard에 따로 기록한다. 이전 기록은 옮기지 않는다.', 'decks.scene')
    save('istanbul', s)

    s = load('seti')
    add_area(s, area_id='missions', name='진행·완료 임무와 수입 카드', scope='player', visibility='public', topology='zone', component_ids=['cards'],
             contract='낸 임무 카드는 앞면으로 자기 앞에 두고, 완료하면 뒷면으로 남긴다. 수입 카드 아래 끼운 카드도 개인 공개 상태다.', source='seti.art-confirmation.seti-rules')
    add_area(s, area_id='card-discard', name='공용 카드 버림', scope='public', visibility='public', topology='stack', component_ids=['cards'],
             contract='효과를 처리한 카드는 주 덱 옆 앞면 버림 더미에 쌓인다. 미공개 덱과 섞지 않는다.', source='seti.art-confirmation.seti-rules')
    describe_area(s, 'hand', '앞면으로 낸 임무와 버림은 missions·card-discard에 따로 기록한다. 이전 기록은 옮기지 않는다.', 'hand.scene')
    save('seti', s)

    s = load('star-wars-rebellion')
    add_area(s, area_id='discards', name='버림 더미', scope='public', visibility='public', topology='stack', component_ids=['cards'],
             contract='버림 더미의 카드는 누구나 언제든 볼 수 있다. 덱이 바닥나 다시 섞기 전까지 종류별로 나눠 둔다.', source='star-wars-rebellion.art-confirmation.star-wars-rebellion-primary')
    save('star-wars-rebellion', s)

    s = load('voidfall')
    describe_area(s, 'plans', '손에 든 Focus 카드와 아직 내지 않은 Agenda 카드는 본인만 안다. 낸 Agenda는 슬롯에, 사용한 Focus는 개인 버림 더미에 앞면으로 공개된다.', 'plans.scene')
    describe_area(s, 'technology', '개인 버림 더미에 앞면으로 둔 Focus 카드와 슬롯에 낸 Agenda 카드도 개인 공개 상태다.', 'technology.scene')
    save('voidfall', s)


if __name__ == '__main__':
    apply()
