"""Recompute the final sparse-sample table from captured results and visual adjudication."""
import hashlib
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = Path('/private/tmp/kb-service-retest-v5-Hm4kjd')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((HERE / 'manifest.json').read_text())
visual = json.loads((HERE / 'visual-review.json').read_text())
comparison = json.loads((DATA / 'comparison.json').read_text())
replay = json.loads((DATA / 'final-offline-replay/verification.json').read_text())
assert visual['version'] == 'service-recognition-visual-review-v5'
assert visual['experimentRoot'] == str(DATA)
assert visual['reviewedCount'] == comparison['completed'] == len(replay['rows']) == 24
assert not visual['pendingGames'] and not comparison['pending']
cases = {r['gameId']: r for r in manifest['cases']}
comp = {r['gameId']: r for r in comparison['rows']}
assert len(cases) == len(comp) == len({r['gameId'] for r in visual['rows']}) == 24
rows = []
for v in visual['rows']:
    g = v['gameId']
    c, r = cases[g], comp[g]
    ref = json.loads(Path(c['referencePath']).read_text())
    count = len(ref['anchors'])
    assert sha(Path(c['path'])) == c['sourceSHA'] == v['sourceSHA']
    assert sha(Path(c['referencePath'])) == c['referenceSHA'] == v['referenceSHA']
    assert sha(Path(v['nativePath'])) == r['nativeSHA'] == v['newNativeSHA']
    before = [v['beforeConfirmedAnchorCount'], v['beforeMissingAnchorCount'], v['beforeUncertainAnchorCount']]
    after = [v['confirmedAnchorCount'], v['missingAnchorCount'], v['uncertainAnchorCount']]
    assert sum(before) == sum(after) == count
    rows.append(dict(gameId=g, name=r['name'], group=v['group'], anchors=count,
                     before=dict(zip(['detected', 'missing', 'uncertain'], before)),
                     after=dict(zip(['detected', 'missing', 'uncertain'], after)),
                     beforeJobState=r['beforeSummary']['jobState'], afterJobState=r['afterSummary']['jobState'],
                     savedReopened=r['afterSummary']['saveReopen'],
                     kindErrorAnchorIds=v.get('kindErrorAnchorIds', []),
                     attributeUncertainAnchorIds=v.get('attributeUncertainAnchorIds', []), reason=v['reason']))

def aggregate(selected):
    out = dict(games=len(selected), anchors=sum(r['anchors'] for r in selected))
    for side in ['before', 'after']:
        lower = [r[side]['missing'] for r in selected]
        upper = [r[side]['missing'] + r[side]['uncertain'] for r in selected]
        out[side] = {k: sum(r[side][k] for r in selected) for k in ['detected', 'missing', 'uncertain']}
        out[side]['missedPerGame'] = dict(min=min(lower), max=max(upper), meanLower=statistics.mean(lower),
                                        meanUpper=statistics.mean(upper), medianLower=statistics.median(lower),
                                        medianUpper=statistics.median(upper))
    return out

groups = {g: aggregate([r for r in rows if r['group'] == g]) for g in ['P0', 'P1', 'control']}
total = aggregate(rows)
assert total['anchors'] == 76 and total['before']['detected'] == 29 and total['after']['detected'] == 50
assert total['after']['missing'] == 25 and total['after']['uncertain'] == 1
attempts = {}
for version, directory in [('v3', 'kb-service-retest-v3-lD7wc4'), ('v4', 'kb-service-retest-v4-Zy8hvV'), ('v5', DATA.name)]:
    attempts[version] = len(json.loads((DATA.parent / directory / 'attempt-ledger.json').read_text())['attempts'])
assert attempts == dict(v3=1, v4=24, v5=24)
report = dict(version='recognition-retest-final-v5', experimentRoot=str(DATA),
              sources=dict(manifestSHA=sha(HERE / 'manifest.json'), visualReviewSHA=sha(HERE / 'visual-review.json'),
                           baselineSHA=comparison['baselineSHA'], comparisonSHA=sha(DATA / 'comparison.json')),
              measuredReaderSHA='3b1475da7f7d8960b4a05f3c835bdebb5b86d5ce5044e313de8a1266a977d842',
              finalReaderSHA=replay['readerSourceSHA'], finalRequestAndDecodedReplayIdentical=24,
              providerAttempts=attempts, groups=groups, total=total, rows=rows,
              verification=dict(testsPassed=719, testsFailed=0, build='passed', browserUI='not performed'),
              limitation='One photo per selected game, sparse frozen physical samples; detection is separate from kind/value correctness. Not all-game or full-photo accuracy.')
(HERE / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

def missed(v):
    return str(v['missing']) if not v['uncertain'] else f"{v['missing']}–{v['missing'] + v['uncertain']}"

def mean(v):
    a, b = v['meanLower'], v['meanUpper']
    return f'{a:.2f}' if a == b else f'{a:.2f}–{b:.2f}'

lines = ['# 수정 후 실제 사진 재시험 결과', '',
         '**처리 실패 4건은 모두 복구됐고, 판독 문제 14종의 빈 응답은 8건에서 1건으로 줄었다. 개별 실물 누락은 여전히 남는다.**', '',
         '2026-10-27, 기존 119종 중 수정 대상 18종과 정상 대조군 6종을 같은 사진으로 재시험했다. 각 게임 사진 1장, 사전 동결한 실물 표본 총 76개를 비교했다. 이전 57종 전체 재평가가 아니며, 아래 수치는 게임 전체 정확도가 아니다.', '',
         '## 핵심 수치', '',
         '| 구분 | 이전 | 수정 후 |', '|---|---:|---:|',
         '| 처리 실패 대상 4종: 실패 | 4/4종 | 0/4종 |',
         '| 처리 실패 대상 4종: 후보 저장·재열기 | 0/4종 | 4/4종 |',
         '| 판독 문제 14종: 빈 응답 | 8/14종 | 1/14종 |',
         '| 판독 문제 14종: 개별 실물 대응 | 0/44개 | 18/44개 |',
         '| 판독 문제 14종: 개별 실물 누락·미확인 | 44개 | 25–26개 |',
         '| 정상 대조군 6종: 개별 실물 대응 | 19/19개 | 19/19개 |',
         '| 전체 24종: 개별 실물 대응 | 29/76개 | 50/76개 |', '',
         '물체 대응은 **같은 개별 물체를 찾았는지**다. 종류·값까지 모두 맞았다는 뜻이 아니다. 수정 후 전체 24건은 HTTP 200·작업 완료, 그중 후보가 있는 23건은 저장·재열기에 성공했다. Underwater Cities 1건은 빈 응답으로 후보가 없다.', '',
         '## 게임당 못 찾은 표본 수', '',
         '| 그룹 | 이전 최소–최대 | 이전 평균 | 수정 후 최소–최대 | 수정 후 평균 |',
         '|---|---:|---:|---:|---:|']
labels = dict(P0='처리 실패 4종', P1='판독 문제 14종', control='정상 대조군 6종')
for g, a in groups.items():
    b, n = a['before']['missedPerGame'], a['after']['missedPerGame']
    lines.append(f"| {labels[g]} | {b['min']}–{b['max']}개 | {mean(b)}개 | {n['min']}–{n['max']}개 | {mean(n)}개 |")
lines += ['', '범위의 상한에는 동일 물체인지 불확실한 TI 분홍 유닛 1개를 포함했다. Anachrony·Cascadia의 색속성 불확실성은 물체 누락에 더하지 않았다.', '',
          '## 게임별 수치', '', '| 게임 | 표본 수 | 이전 누락·미확인 | 수정 후 누락·미확인 | 수정 후 개별 실물 대응 |', '|---|---:|---:|---:|---:|']
for r in rows:
    lines.append(f"| {r['name']} | {r['anchors']} | {missed(r['before'])} | {missed(r['after'])} | {r['after']['detected']} |")
lines += ['', '## 남은 오류와 해석', '',
          '- **종류 오류:** Marvel Champions의 계략 카드 2장은 물체·위치는 찾았지만 `identities`로 잘못 분류했다. 저장 복구와 별개로 남은 오류다.',
          '- **색속성 불확실:** Anachrony의 회색/푸른 회색, Cascadia의 분홍/magenta 각 1개. 물체는 찾았으며 색값 판정만 보류했다.',
          '- **선택 표본 전부 누락 유지:** Arcs, Blokus, Calico, Gaia Project, Galaxy Trucker, Small World, Underwater Cities. 일부는 다른 물체나 판 전체를 반환했으므로 “사진 전체를 전혀 못 봄”과는 다르다. Underwater Cities는 실제 빈 목록이다.',
          '- **부분 개선:** Eclipse는 3개 중 1개, TI는 3개 중 1개 확정 대응·1개 누락·1개 불확실이다.',
          '- Arcs는 중간 v4에서 표본을 찾았지만 최종 v5에서 다시 빠졌다. 단일 호출의 변동성이 있어 중간 결과만 골라 성공으로 보고하지 않는다.', '',
          '## 반영한 수정', '',
          '1. 허용된 표시 속성 하나의 형식이 틀려도 다른 실물·정상 값까지 버리지 않는다. 해당 속성만 unknown으로 두고 원응답과 보류 이유를 보존한다. 수동·범위 밖 속성과 잘린 응답은 기존처럼 거절한다.',
          '2. 모든 게임에 공통으로 게임팩의 기존 구성물 이름·물리 종류를 전달한다. 판 그림과 실제 말·타일·카드를 구분하고, 이름을 못 읽어도 실물을 남기도록 요청한다. 사진별 정답·수량·좌표·분기 조건은 넣지 않았다.',
          '3. 읽지 못한 속성은 `?`, 읽힌 값과 `0`은 그대로 표시한다. 수정폼은 자동으로 열리지 않는다. 완전히 누락된 실물의 위치나 개수를 추측해서 새 `?` 객체를 만들지는 않는다.', '',
          '## 검증과 실험 이력', '',
          '- 최종 코드 전체 테스트 **719/719**, 빌드 및 변경 파일 diff 검사 통과. 브라우저 실화면 검수는 수행하지 않았다.',
          '- 독립 검토에서 발견한 `valueJson:null` + 이유 없음 경계를 추가로 수정했다. 합성 입력 RED→GREEN 후 최종 코드로 실제 v5 원응답 24건을 오프라인 재생했다. 요청 본문 SHA 24/24 동일, 관측·원문 보류 trace도 기존 시험 결과와 동일했다. 재호출은 하지 않았다.',
          '- 실제 요청은 초기 스키마 거절 v3 1회(HTTP 400), 중간 v4 24회, 최종 v5 24회로 **총 49회**다. 자동 재시도는 없다. 초기 실패·중간 결과도 보존했다. 계획 예약액은 실제 청구액이 아니다.',
          '- 기존 결과·사진·독립 참조는 변경하지 않았다. 참조 내용은 모델 요청에 포함하지 않았다. 정상 대조군 유지와 공통 수정은 확인했지만 새 사진 일반화·과적합 부재를 증명한 것은 아니다.',
          '- 저장·재열기는 후보 tray 보존 검증이다. 목적 필드·소유자·배치 전체 자동 복원 성공이나 전체 판의 precision/recall은 측정하지 않았다.', '',
          '## 재계산과 근거', '',
          '- [기계 판독용 수치](results.json) · [독립 사진 대조](visual-review.json) · [중간 v4 대조 보존](visual-review-v4.json)',
          '- `python3 docs/service-recognition-retest-20261027/compare.py /private/tmp/kb-service-retest-v5-Hm4kjd`',
          '- `python3 docs/service-recognition-retest-20261027/summarize.py`',
          '- 최종 원응답·저장본: `/private/tmp/kb-service-retest-v5-Hm4kjd` (비공개 로컬, 원문 미복사)',
          '- 최종 코드 replay: 같은 경로의 `final-offline-replay/verification.json`', '',
          '읽을 핵심 변경은 `server/ai/geminiGameReader.ts`의 속성별 보류, `shared/lightweightRecognition.ts`의 선택 구성물 이름 전달, `src/GameEssentials.tsx`의 선택적 수정 동작이다.', '',
          '용어: unknown(미확인), preserve(보존), partial(부분). “Keep valid values.” “Show unknown values as ?.” “One bad field does not remove other objects.”', '']
(HERE / 'results.md').write_text('\n'.join(lines))
print(json.dumps(dict(groups=groups, total=total, attempts=attempts), ensure_ascii=False, indent=2))
