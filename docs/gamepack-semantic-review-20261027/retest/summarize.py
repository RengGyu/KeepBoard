"""Reconcile completed visual reviews with captured private results; no API or source mutation."""
import hashlib
import json
import statistics
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

HERE=Path(__file__).resolve().parent
DATA=Path(sys.argv[1])
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((HERE/'manifest.json').read_text())
selection={r['gameId']:r for r in json.loads((HERE/'selection.json').read_text())['rows']}
automatic=json.loads((DATA/'comparison.json').read_text())
assert automatic['completed']==49 and not automatic['pending']
auto={r['gameId']:r for r in automatic['rows']}
visual=[]
for n in [1,2]:visual.extend(json.loads((HERE/f'visual-{n}.json').read_text())['rows'])
assert len(visual)==len({r['gameId'] for r in visual})==49
reviews={r['gameId']:r for r in visual}
rows=[]
for c in manifest['cases']:
 g=c['gameId'];v=reviews[g];a=auto[g];baseline=selection.get(g)
 assert isinstance(v.get('confirmedAnchorCount'),int),g
 assert sha(Path(c['path']))==c['sourceSHA']==v['sourceSHA']
 assert sha(Path(c['referencePath']))==c['referenceSHA']==v['referenceSHA']
 assert sha(DATA/'cases'/g/'native-response.json')==a['nativeSHA']==v['nativeSHA']
 count=len(json.loads(Path(c['referencePath']).read_text())['anchors'])
 after={k:v[f'{k}AnchorCount'] for k in ['confirmed','missing','uncertain']}
 assert sum(after.values())==count,g
 before=None
 if baseline:
  before={k:v[f'before{k.title()}AnchorCount'] for k in ['confirmed','missing','uncertain']}
  assert sum(before.values())==count,g
  assert sha(Path(baseline['baselineNativePath']))==baseline['baselineNativeSHA']==v['baselineNativeSHA']
 row=dict(gameId=g,name=a['name'],baselineFamily=a['baselineFamily'],anchors=count,before=before,after=after,
          beforeSummary=a['beforeSummary'],afterSummary=a['afterSummary'],
          kindErrorAnchorIds=v.get('kindErrorAnchorIds',[]),valueErrorAnchorIds=v.get('valueErrorAnchorIds',[]),
          attributeUncertainAnchorIds=v.get('attributeUncertainAnchorIds',[]),evaluationUncertainAnchorIds=v.get('evaluationUncertainAnchorIds',[]),
          reason=v.get('assessment',v.get('reason','; '.join(v.get('notes',[])))))
 rows.append(row)

def aggregate(rs):
 out=dict(games=len(rs),anchors=sum(r['anchors'] for r in rs))
 for side in ['before','after']:
  values=[r[side] for r in rs if r[side] is not None]
  if not values:out[side]=None;continue
  lower=[v['missing'] for v in values];upper=[v['missing']+v['uncertain'] for v in values]
  out[side]={k:sum(v[k] for v in values) for k in ['confirmed','missing','uncertain']}
  out[side]['missedPerGame']=dict(min=min(lower),max=max(upper),meanLower=statistics.mean(lower),meanUpper=statistics.mean(upper),medianLower=statistics.median(lower),medianUpper=statistics.median(upper))
 out['kindErrorTargets']=sum(len(r['kindErrorAnchorIds']) for r in rs)
 out['valueErrorTargets']=sum(len(r['valueErrorAnchorIds']) for r in rs)
 out['attributeUncertainTargets']=sum(len(r['attributeUncertainAnchorIds']) for r in rs)
 out['evaluationUncertainTargets']=sum(len(r['evaluationUncertainAnchorIds']) for r in rs)
 return out

paired=[r for r in rows if r['before'] is not None]
assert len(paired)==48 and sum(r['anchors'] for r in paired)==148
families={k:aggregate([r for r in rows if r['baselineFamily']==k]) for k in sorted({r['baselineFamily'] for r in rows})}
same_body=[r['gameId'] for r in paired if r['beforeSummary']['bodySHA']==r['afterSummary']['bodySHA']]
frozen=json.loads((DATA/'source-freeze.json').read_text())
root=HERE.parents[2]
assert all(sha(root/f)==h for f,h in frozen.items())
report=dict(version='gamepack-semantic-retest-final-v1',experimentRoot=str(DATA),
            sources=dict(manifestSHA=sha(HERE/'manifest.json'),selectionSHA=sha(HERE/'selection.json'),visualSHAs=[sha(HERE/f'visual-{n}.json') for n in [1,2]]),
            paired=aggregate(paired),families=families,sameRequestBodyGameIds=same_body,
            processing=dict(attempts=sum(r['afterSummary']['providerCalls'] for r in rows),http200=sum(r['afterSummary']['providerStatus']==200 for r in rows),
                            completed=sum(r['afterSummary']['jobState']=='completed' for r in rows),savedReopened=sum(r['afterSummary']['saveReopen'] is True for r in rows),
                            emptyOutputs=sum(a['afterAutomatic']['nativeObjectCount']==0 for a in automatic['rows'] if a['afterAutomatic'])),
            verification=dict(testsPassed=720,build='passed',packSpecsUnchanged=120,visionProfilesUnchanged=120,sourceFreezeVerified=True),rows=rows,
            baselineAdjudicationNote='Same frozen sources/native responses re-adjudicated under the current paired criteria. Eclipse central-sector old response is now uncertain rather than confirmed missing; TI pink-unit identity remains uncertain on both sides. Original photos/references/native and earlier reports remain unchanged.',
            limitation='Sparse selected physical targets, one photo per game; no full-photo precision/recall. Paired48 and new-area Rummikub1 have different denominators. Same-body reruns show variability, not a causal prompt improvement.')
(HERE/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

def misses(v):return str(v['missing']) if not v['uncertain'] else f"{v['missing']}–{v['missing']+v['uncertain']}"
def rounded(x):return str(Decimal(str(x)).quantize(Decimal('0.01'),rounding=ROUND_HALF_UP))
def mean(v):return rounded(v['meanLower']) if v['meanLower']==v['meanUpper'] else rounded(v['meanLower'])+'–'+rounded(v['meanUpper'])
p=report['paired'];run=report['processing']
lines=['# 게임팩 검토 후 제한 재시험 결과','',
 '**120종 검토에서 확인된 제품 오류 1건만 수정했다. 게임팩·ID·판본·프롬프트는 그대로 유지했다.**','',
 f"실제 요청 {run['attempts']}회, HTTP200 {run['http200']}건, 작업 완료 {run['completed']}건, 후보 저장·재열기 {run['savedReopened']}건, 빈 원응답 {run['emptyOutputs']}건. 자동 재시도는 없다.",'',
 '대상은 과거 명확한 오류48종과 수정된 루미큐브1종이다. 참조 오류4·판단 보류4·수동 전용1종은 인식 실패 재시험에서 제외했다. 모든120종을 다시 호출하지 않았다.','',
 '## 동일 사진·표본 48종 전후','',
 '| 지표 | 이전 | 이번 |','|---|---:|---:|',
 f"| 개별 실물 대응 /148개 | {p['before']['confirmed']} | {p['after']['confirmed']} |",
 f"| 누락·미확인 표본 | {misses(p['before'])} | {misses(p['after'])} |",
 f"| 게임당 평균 누락·미확인 | {mean(p['before']['missedPerGame'])}개 | {mean(p['after']['missedPerGame'])}개 |",
 f"| 게임당 최소–최대 | {p['before']['missedPerGame']['min']}–{p['before']['missedPerGame']['max']}개 | {p['after']['missedPerGame']['min']}–{p['after']['missedPerGame']['max']}개 |",'',
 '물체 대응은 같은 물체가 개별 항목으로 남았는지다. 종류·값까지 모두 정확하다는 뜻이 아니다. 누락 범위의 상한은 동일성 불확실 표본을 포함한다. 속성 오류와 물체 누락은 겹칠 수 있어 합산하지 않는다.','',
 '## 비교 기준을 나눠 볼 것','',
 '| 이전 기준 | 게임 | 표본 | 이전 대응 | 이번 대응 |','|---|---:|---:|---:|---:|']
for family,f in families.items():
 if f['before'] is not None:lines.append(f"| {family} | {f['games']} | {f['anchors']} | {f['before']['confirmed']} | {f['after']['confirmed']} |")
lines += ['',f"동일 요청 본문인 재시험은 {len(same_body)}종이다. 최종v5와 비교하는18종은 이미 이전 공통 판독 수정을 사용했다. 나머지30종은 최초119종 시험 이후 첫 재시험이다. 이번의 좁은 받침대 처리 수정이 다른 게임의 인식 성능을 높였다는 인과 주장은 하지 않는다.",
 '특히 같은 요청18종의 대응은31→30개여서 안정적인 인식 향상으로 볼 수 없다. 혁신의 시대·이스탄불처럼 이전에 찾던 실물을 이번에는 놓친 경우도 있다. 한 사진의 점수가 나올 때까지 프롬프트를 바꾸거나 재호출하지 않았다.',
 '전후 원응답을 이번에 같은 기준으로 다시 대조했다. Eclipse의 기존 중앙 구역은 확정 누락에서 동일성 불확실로 재평가했고, TI 분홍 유닛은 양쪽 모두 동일성 불확실로 유지했다. 원사진·동결 참조·과거 응답·과거 보고서는 바꾸지 않았다.','',
 '## 게임별 결과','', '| 게임 | 표본 | 이전 대응 | 이번 대응 | 이번 누락·미확인 | 종류 오류 | 값 오류 |','|---|---:|---:|---:|---:|---:|---:|']
for r in rows:
 lines.append(f"| {r['name']} | {r['anchors']} | {r['before']['confirmed'] if r['before'] is not None else '새 영역'} | {r['after']['confirmed']} | {misses(r['after'])} | {len(r['kindErrorAnchorIds'])} | {len(r['valueErrorAnchorIds'])} |")
lines += ['', '종류·값 오류는 현재 게임팩의 정의로 확정할 수 있는 표본만 센다. 색조·인쇄 언어·평가 분류 경계가 모호한 건은 JSON의 attributeUncertainAnchorIds / evaluationUncertainAnchorIds에 별도 기록했다.',
 '이번 비교 가능한48종 표본에서 확정 종류 오류는2개(스톤 에이지), 값 오류는3개(가이아1·그랜드 오스트리아 호텔2)다. 물체 대응과 별개이며, 이 수치를 사진 전체 오류 수로 확대하지 않는다.',
 '앞선 마블 카드2장 종류 오류 단정은 이번에는 승계하지 않는다. 현재 게임팩 identities에는 빌런·주계략이 포함되어 frozen cards와의 이름 불일치만으로 모델 오류를 확정할 수 없다. 분류 경계는 평가 불확실로 표시했다. 표본 밖 인쇄명·단계 전체의 정확성을 승인한 것도 아니다.','',
 '## 실제 수정과 남겨 둔 것','',
 '- 루미큐브 받침대가 미확인 타일로 변환되던 오류만 수정했다. rack-only 후보0 및 숫자11·색·소유자 보존을 합성 RED→GREEN으로 확인했다. 실제 사진 원응답은 숫자6개+받침대1개였고 모두 개별 대응했다. 원receipt는7개 관측을 보존하고 저장 후보는숫자6개만 담았다. 가짜7번째타일0개, 저장·재열기성공. 노란 타일 색은 현재 enum과의 차이 때문에 미채점이며 주황 정답으로 바꾸지 않았다.',
 '- 기존 미확인 타일 기록은 일괄 삭제하지 않는다. 팩 분류를 취향에 따라 세분화하거나 기존 저장본을 바꾸지 않았다.',
 '- 사진별 정답·기대수량·색·좌표 분기나 강제 값 보정은 없다. 잘못 읽혔어도 유효한 값은 그대로 표시하며, 미확인은 ?로 둔다.',
 '- 전체 규칙·판본·사진 정밀도 인증은 아니다. 이번 조사 범위에서 120종에 추가 구조 변경 근거가 없다는 판정이다.','',
 '## 검증·근거','',
 '- 전체 테스트720/720, 타입 포함 빌드, 집중 회귀·독립 읽기검토·diff 검사 통과. 브라우저 화면 검수는 이번 변경 범위에서 수행하지 않았다.',
 '- [아스트라120종검토](../README.md) · [수치JSON](results.json) · [시각검토1](visual-1.json) · [시각검토2](visual-2.json)',
 '- 원사진·참조·원응답은 수정하지 않았다. 선택 게임의 해시 및 실물 표본 수 분할을 재검증했다. 실제 청구액은 미측정이고 계획 예약액6.4254 USD는 청구액이 아니다.',
 '- 원자료 로컬 경로: `'+str(DATA)+'`.',
 '- 재계산: `python3 docs/gamepack-semantic-review-20261027/retest/compare.py '+str(DATA)+'` 후 `python3 docs/gamepack-semantic-review-20261027/retest/summarize.py '+str(DATA)+'`.',
 '- 핵심 변경: server/ai/observationAssembly.ts의 받침대 guard와 실제 후보 수 집계. 입력 관측 → 타일과 받침대 구분 → 실제 타일 후보 / 받침대 원관측 보존.',
 '- 용어: observation(관측), rack(받침대), preserve(보존). “Keep the original observation.” “A rack is not a tile.”','']
(HERE/'results.md').write_text('\n'.join(lines))
print(json.dumps({k:report[k] for k in ['paired','families','processing']},ensure_ascii=False,indent=2))
