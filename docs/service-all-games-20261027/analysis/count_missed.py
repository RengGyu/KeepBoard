"""Count existing adjudicated photo samples; no new predictions or GT edits."""
import hashlib
import json
import statistics
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'results/results.json'
EXPECTED_SHA = '51a348efa740aa24c067bfb38c1ef7f60bb56e3f7b869a7f7926fb0872e21f9b'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


assert sha(SOURCE) == EXPECTED_SHA
source = {r['gameId']: r for r in json.loads(SOURCE.read_text())['entries']}
assessment = json.loads((HERE / 'assessment.json').read_text())
assert assessment['sourceResultsSHA'] == EXPECTED_SHA
selected = [r for r in assessment['rows'] if r['diagnosisType'] != 'match']
assert len(selected) == len({r['gameId'] for r in selected}) == 57

# Bounds below are counts of targets without an individual physical record.
# Grouped objects are distinguished from absent/unconfirmed objects.
overrides = {
    'age-of-innovation': (0, 0, 3, 3, '판 전체 1건으로 묶음; 처리도 실패'),
    'dominant-species': (0, 0, 0, 0, '표본 3개는 읽음; 처리 실패로 저장 후보 0'),
    'marvel-champions': (0, 0, 0, 0, '표본 3개는 읽음; 처리 실패로 저장 후보 0'),
    'terraforming-mars': (0, 0, 0, 0, '표본 4개는 읽음; 처리 실패로 저장 후보 0'),
    'istanbul': (3, 3, 0, 0, '장소 타일은 출력했지만 표본 사람 말 3개 누락'),
    'star-wars-outer-rim': (2, 2, 1, 1, '우주선 2개 누락·1개 묶음'),
    'ticket-to-ride': (0, 0, 2, 3, '2개는 확실히 여러 기차로 묶음; 나머지 1개 개별 대응 미확정'),
    'concordia': (0, 4, 0, 0, '작은 말의 대응 불확실: 0~4개 범위만 가능'),
    'seti': (0, 3, 0, 0, '탐사선의 개별 대응 불확실: 0~3개 범위만 가능'),
    'pandemic-legacy-1': (0, 0, 0, 0, '물체는 대응; 색상·투명 재질 표현 차이는 미채점'),
    'spirit-island': (0, 0, 0, 0, '물체는 대응; 구성물 종류 분류 1개는 미확정'),
}
notes = {
    'grand-austria-hotel': '주사위 3개 모두 찾음; 숫자 2개 오독(5→1, 4→2)',
    'expeditions': '물체 3개 모두 찾음; 이름·위치 필드 배정 차이 2개',
    'avalon': '물체 1개·인쇄 이름은 읽음; 역할 필드는 사용자 입력 대상',
    'arkham-horror-3': '말 1개 누락; 나머지 말의 색상 대신 재질 표현도 있음',
    'great-western-trail': '타일 2개 대응; 파란 말 1개 개별 대응 확인 안 됨',
    'eldritch-horror': '참조 이름 1개 오류; 물체 누락으로 세지 않음',
    'kingdomino': '참조 상자 2개가 실물 경계를 걸침; 점수 계산 제외',
    'monopoly': '참조의 호텔 분류 1개 오류; 물체 누락으로 세지 않음',
    'wyrmspan': '참조 상자 3개가 각각 카드 2장을 걸침; 점수 계산 제외',
}

rows = []
for old in selected:
    g, n, kind = old['gameId'], old['sampleCount'], old['diagnosisType']
    e = source[g]
    for key, expected in [('reference', old['referenceSHA']), ('native', old['nativeSHA'])]:
        assert sha(old['evidencePaths'][key]) == expected, (g, key)
    ref = json.loads(Path(old['evidencePaths']['reference']).read_text())
    assert len(ref['anchors']) == n, g
    native = json.loads(Path(old['evidencePaths']['native']).read_text())
    content = ''.join(p.get('text', '') for p in native['candidates'][0]['content']['parts'] if not p.get('thought'))
    assert len(json.loads(content)['items']) == old['nativeObjectCount'], g
    if kind == 'reference':
        missing_min = missing_max = grouped_min = grouped_max = None
        note = notes[g]
    elif g in overrides:
        missing_min, missing_max, grouped_min, grouped_max, note = overrides[g]
    elif kind == 'units':
        missing_min = missing_max = 0
        grouped_min = grouped_max = n
        note = '판·영역·묶음으로 표현해 표본 실물의 개별 기록 없음'
    else:
        assert old['confirmedSampleObjectsPresent'] is not None, g
        missing_min = missing_max = n - old['confirmedSampleObjectsPresent']
        grouped_min = grouped_max = 0
        note = notes.get(g, '빈 응답: 표본 전부 누락' if kind == 'empty' else f'표본 {n}개 중 {missing_min}개 개별 대응 없음')
    low = None if missing_min is None else missing_min + grouped_min
    high = None if missing_max is None else missing_max + grouped_max
    assert low is None or 0 <= low <= high <= n, g
    rows.append({
        'gameId': g, 'name': old['name'], 'targetCount': n,
        'missingOrUnconfirmedMin': missing_min, 'missingOrUnconfirmedMax': missing_max,
        'groupedWithoutIndividualRecordMin': grouped_min, 'groupedWithoutIndividualRecordMax': grouped_max,
        'individualRecordDeficitMin': low, 'individualRecordDeficitMax': high,
        'deficitPercentMin': None if low is None else round(100 * low / n, 2),
        'deficitPercentMax': None if high is None else round(100 * high / n, 2),
        'countStatus': 'reference-excluded' if low is None else ('exact' if low == high else 'range'),
        'confirmedWrongValueCount': 2 if g == 'grand-austria-hotel' else None,
        'processingFailureUnusableTargetCount': n if kind == 'processing' else 0,
        'note': note,
        'sourceSHA': old['sourceSHA'], 'referenceSHA': old['referenceSHA'], 'nativeSHA': old['nativeSHA'],
        'evidencePaths': old['evidencePaths'],
    })

exact = [r for r in rows if r['countStatus'] == 'exact']
valid = [r for r in rows if r['countStatus'] != 'reference-excluded']
loss = [r['individualRecordDeficitMin'] for r in exact]
stats = {
    'requestedGames': len(rows), 'frozenTargetsIncludingInvalidReferences': sum(r['targetCount'] for r in rows),
    'exactGames': len(exact), 'rangeGames': len(valid) - len(exact), 'referenceExcludedGames': len(rows) - len(valid),
    'exactTargetCount': sum(r['targetCount'] for r in exact),
    'exactDeficitCount': sum(loss), 'exactMissingOrUnconfirmedCount': sum(r['missingOrUnconfirmedMin'] for r in exact),
    'exactGroupedCount': sum(r['groupedWithoutIndividualRecordMin'] for r in exact),
    'exactMinimumPerGame': min(loss), 'exactMaximumPerGame': max(loss),
    'exactMeanPerGame': statistics.mean(loss), 'exactMedianPerGame': statistics.median(loss),
    'exactPooledDeficitPercent': 100 * sum(loss) / sum(r['targetCount'] for r in exact),
    'exactDistribution': dict(sorted(Counter(loss).items())),
    'validTargetCount': sum(r['targetCount'] for r in valid),
    'validDeficitMin': sum(r['individualRecordDeficitMin'] for r in valid),
    'validDeficitMax': sum(r['individualRecordDeficitMax'] for r in valid),
    'validMeanPerGameMin': sum(r['individualRecordDeficitMin'] for r in valid) / len(valid),
    'validMeanPerGameMax': sum(r['individualRecordDeficitMax'] for r in valid) / len(valid),
    'emptyOutputGames': sum(r['diagnosisType'] == 'empty' for r in selected),
    'emptyOutputMissedTargets': sum(r['sampleCount'] for r in selected if r['diagnosisType'] == 'empty'),
    'processingFailureGames': sum(r['diagnosisType'] == 'processing' for r in selected),
    'processingFailureUnusableTargets': sum(r['processingFailureUnusableTargetCount'] for r in rows),
    'confirmedWrongValues': sum(r['confirmedWrongValueCount'] or 0 for r in rows),
}
assert (stats['exactGames'], stats['rangeGames'], stats['referenceExcludedGames']) == (50, 3, 4)
assert (stats['exactTargetCount'], stats['exactDeficitCount']) == (152, 95)
assert stats['exactMissingOrUnconfirmedCount'] + stats['exactGroupedCount'] == stats['exactDeficitCount']
output = {
    'sourceResultsSHA': EXPECTED_SHA,
    'definition': '개별 미확보 = 누락 또는 개별 대응 미확인 + 판·묶음으로만 출력해 개별 기록이 없는 표본. 값 오독·필드 배정·처리 실패 수를 더하지 않는다.',
    'scope': '기존에 불일치·기타로 분류한 57게임, 게임당 사진 1장의 사전 고정 표본 1~4개. 전체119게임 정확도·사진 전체 누락률 아님.',
    'statistics': stats, 'rows': rows,
}
(HERE / 'missed-counts.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')


def interval(low, high):
    return '제외' if low is None else (str(low) if low == high else f'{low}~{high}')


lines = [
    '# 문제·기타 57종: 못 읽은 양', '',
    '**수량을 확정할 수 있는 50종: 표본 152개 중 개별 미확보 95개(62.5%). 게임당 최소 0개, 최대 4개, 평균 1.90개, 중앙값 2개.**', '',
    '| 구분 | 게임 수 | 표본 수 | 개별 미확보 | 게임당 평균 |',
    '|---|---:|---:|---:|---:|',
    '| 수량 확정 | 50 | 152 | 95 | 1.90 |',
    '| 범위만 산출 | 3 | 10 | 2~10 | 0.67~3.33 |',
    '| 위 두 집단 합계 | 53 | 162 | 97~105 | 1.83~1.98 |',
    '| 참조 오류로 제외 | 4 | 12(유효 분모 아님) | 산출 안 함 | 산출 안 함 |', '',
    '**개별 미확보**는 누락·개별 대응 미확인과 묶음 표현을 합한 수다. 확정 95개 = 누락·대응 미확인 72개 + 묶음·개별 구분 실패 23개.',
    '이전에 문제로 분류한 57종만 집계했다. 사진 전체가 아닌 게임당 1~4개의 기존 검사 표본 기준이며, 이 비율을 119종 전체 정확도로 해석하면 안 된다.', '',
    '| 확정 미확보 수 | 0개 | 1개 | 2개 | 3개 | 4개 |',
    '|---|---:|---:|---:|---:|---:|',
    '| 게임 수(확정 50종) | 8 | 15 | 3 | 22 | 2 |', '',
    '- 빈 응답 13종: 검사 표본 38개가 모두 누락됐다.',
    '- 물체는 찾았지만 확정적으로 값을 틀린 사례: 그랜드 오스트리아 호텔 주사위 3개 중 숫자 2개. 물체 누락은 0개다. 다른 게임의 모든 속성을 채점한 수치는 아니다.',
    '- 처리 실패 4종: 표본 13개를 저장 후보로 쓰지 못했다. 이 중 도미넌트 스피시즈·마블 챔피언스·테라포밍 마스의 표본 10개는 원응답에 있었다. 위 95개에 처리 실패 13개를 추가하면 중복된다.', '',
    '표의 **미확보/대상**은 개별 물체 기준이다. `0/3`도 값·분류·저장 성공을 보장하지 않으므로 비고를 함께 본다. `—`는 판단 불가이며 0개가 아니다.', '',
    '| 게임 | 미확보/대상 | 미확보율 | 누락·대응 미확인 | 묶음·미분리 | 비고 |',
    '|---|---:|---:|---:|---:|---|',
]
for r in rows:
    low, high, n = r['individualRecordDeficitMin'], r['individualRecordDeficitMax'], r['targetCount']
    quantity = f'{interval(low, high)}/{n}' if low is not None else f'—/{n}'
    rate = '—' if low is None else (f'{100 * low / n:.1f}%' if low == high else f'{100 * low / n:.1f}~{100 * high / n:.1f}%')
    lines.append(f"| {r['name']} | {quantity} | {rate} | {interval(r['missingOrUnconfirmedMin'], r['missingOrUnconfirmedMax'])} | {interval(r['groupedWithoutIndividualRecordMin'], r['groupedWithoutIndividualRecordMax'])} | {r['note']} |")
lines += ['', '근거: [기존 게임별 판정](assessment.json), [원결과](../results/results.json), [계산값·게임별 근거 해시](missed-counts.json). 새 모델 호출·사진 및 참조 수정 없음. 통계는 2026-10-27 동결 결과에서 계산했다.', '']
(HERE / 'missed-counts.md').write_text('\n'.join(lines))
print(json.dumps(stats, ensure_ascii=False, indent=2))
