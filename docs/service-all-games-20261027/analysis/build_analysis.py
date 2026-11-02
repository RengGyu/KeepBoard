"""Interpret existing photo evidence; never call a provider or change frozen truth."""
import base64
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'results/results.json'
APP = Path('/Users/jeonggyuju/.local/share/keepboard-reviews/all-games-accuracy-20261027')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
source = load(SOURCE)
assert source['nativeHTTP200Games'] == source['visualAdjudicatedCases'] == 119
roots = [Path('/private/tmp/keepboard-service-all-games-20261027-v1'), Path('/private/tmp/keepboard-service-all-games-20261027-v2')]
plans = {c['gameId']: c for r in roots for p in r.glob('plan-*.json') for c in load(p)['cases']}
folders = {p.name: p for r in roots for p in (r/'cases').iterdir() if (p/'summary.json').exists()}

UNITS = {'blokus','bohnanza','calico','charterstone','frosthaven','istanbul','small-world','ticket-to-ride'}
OTHER_TARGETS = {'arcs','isle-of-cats','star-wars-outer-rim','twilight-imperium-4'}
PARTIAL_PRESENT = {'arkham-horror-3':2,'arkham-lcg':2,'barrage':2,'brass-birmingham':2,'carcassonne':3,'clank-catacombs':3,'descent-legends-dark':2,'dobble':2,'everdell':2,'five-tribes':2,'great-western-trail':2,'love-letter':1,'pandemic':2,'power-grid':1,'robinson-crusoe':2,'tiny-towns':2,'war-of-the-ring-2':2}
GROUPS = {
 'match': ('검사 표본 일치', '현재 표본 범위에서 확인 후 사용', '이미지 전체·숨긴 정보·소유자·턴을 모두 읽었다는 뜻은 아니다.'),
 'empty': ('빈 결과', '현재 사진으로 빠른 자동 저장·복원 불충분', '실물이나 카드가 보이는데 items=[]이다. 전체 입력 또는 다른 촬영이 필요하며, 원인은 아직 분리 실험하지 않았다.'),
 'units': ('판·무리만 읽음', '개별 배치를 복원할 때 허용하기 어려움', '아무것도 못 본 것은 아니다. 판·지역·묶음은 있지만 개별 말·타일·카드 정보가 빠져 복원에 부족하다.'),
 'other-targets': ('다른 것은 읽었으나 표본 미대응', '검사 대상은 다시 확인·입력 필요', '응답은 있으나 검사한 실물에는 대응하지 않는다. 사진 전체 인식 실패와 구분한다.'),
 'partial': ('일부 실물 누락', '누락을 보충한 뒤에만 조건부 사용', '읽은 물체를 재사용할 수 있지만, 빠진 물체를 없는 것으로 확정하면 안 된다. 정정 시간·전체 사진의 추가 누락은 측정하지 않았다.'),
 'value': ('값 오독', '값을 바로잡기 전 자동 복원 불가', '물체를 찾는 것과 눈값·숫자를 정확히 읽는 것은 다르다. 게임 진행에 영향을 주는 값은 표현 차이로 허용하지 않는다.'),
 'field': ('값은 읽었으나 필드 차이', '필드 연결을 정정하면 조건부 사용', '이미 읽은 이름을 사용자가 다시 읽을 문제보다, 이름·번호가 저장될 필드의 의미를 맞출 문제다.'),
 'manual': ('판독기에서 제외한 값', '사용자 확인·입력을 전제로 허용', '앞면과 인쇄명은 읽었지만 역할 필드는 판독기 허용 범위 밖이다. 숨긴 정보나 실제 소유자를 추측하지 않는다.'),
 'processing': ('서비스 응답 처리 실패', '현재 경로로 후보 저장 불가', '원응답이 존재한다. 사진을 전혀 못 읽은 경우가 아니라, 형식·허용 속성 검증에서 후보 생성이 막힌 경우다.'),
 'uncertain': ('사진만으로 판정 보류', '가까이 촬영하거나 사용자 확인 필요', '작은 물체·재질과 색·구성물 종류가 애매하다. 모델 오독이나 허용 가능으로 단정하지 않는다.'),
 'reference': ('솔 참조 오류', '모델 오류율에서 제외', '원래 수동 참조의 이름·종류·상자가 잘못됐다. 원참조는 보존했고, 정확도 분모를 새로 만들지 않았다.'),
}
OVERVIEW = {'match':'표본 일치','empty':'빈 결과','units':'주요 대상 정보 유실','other-targets':'주요 대상 정보 유실','partial':'부분 누락·값 오독','value':'부분 누락·값 오독','field':'필드·수동 확인','manual':'필드·수동 확인','processing':'서비스 처리 실패','uncertain':'판정·참조 유보','reference':'판정·참조 유보'}

rows = []
for e in source['entries']:
 gid=e['gameId']; c=plans[gid]; ref=load(c['referencePath']); folder=folders[gid]; native=load(folder/'native-response.json')
 assert sha(c['path'])==c['sourceSHA'] and sha(c['referencePath'])==c['referenceSHA']
 assert sha(folder/'native-response.json')==e['visualAdjudication']['nativeSHA']
 wire=json.loads(''.join(p.get('text','') for p in native['candidates'][0]['content']['parts'] if not p.get('thought'))); items=wire['items']; n=len(ref['anchors']); status=e['status']
 if status=='시각 표본 일치': group='match'
 elif status=='서비스 처리 실패': group='processing'
 elif status=='독립 참조 확인 필요': group='reference'
 elif status=='시각 판단 보류': group='uncertain'
 elif status=='사용자 입력 필요': group='manual'
 elif not items: group='empty'
 elif gid in UNITS: group='units'
 elif gid in OTHER_TARGETS: group='other-targets'
 elif gid=='grand-austria-hotel': group='value'
 elif gid=='expeditions': group='field'
 else: group='partial'; assert gid in PARTIAL_PRESENT, gid
 label,decision,impact=GROUPS[group]
 present=n if group in ['match','manual','field','value'] else 0 if group in ['empty','other-targets'] else PARTIAL_PRESENT.get(gid) if group=='partial' else None
 review=e['visualAdjudication']; findings=review.get('findings',[])
 row={'gameId':gid,'name':e['nameKo'],'originalStatus':status,'diagnosisType':group,'diagnosis':label,'overview':OVERVIEW[group],'recommendation':decision,'impact':impact,'reason':review['reason'],'limits':review.get('limits',''),'sampleCount':n,'confirmedSampleObjectsPresent':present,'nativeObjectCount':len(items),'saved':e['pipelineAudit'].get('candidateToReopenedExact') is True,'sourceURL':e.get('sourceURL'),'areaId':c['areaId'],'partition':c['partition'],'sourceSHA':c['sourceSHA'],'referenceSHA':c['referenceSHA'],'nativeSHA':review['nativeSHA'],'findingTypes':list(dict.fromkeys(x.get('type','') for x in findings)),'reviewEvidence':findings,'automaticComparison':e['visualComparison'],'evidencePaths':{'reference':c['referencePath'],'native':str(folder/'native-response.json')},'sampleCountingRule':'Existing visual adjudication, physical correspondence only. Not whole-photo recall; does not imply every value is correct.'}
 rows.append(row)

counts=collections.Counter(x['diagnosisType'] for x in rows); overview=collections.Counter(x['overview'] for x in rows)
assert counts=={'match':62,'empty':13,'units':8,'other-targets':4,'partial':17,'value':1,'field':1,'manual':1,'processing':4,'uncertain':4,'reference':4}, counts
assert sum(overview.values())==119 and len([x for x in rows if x['diagnosisType']!='match'])==57
analysis={'asOf':'2026-10-27','sourceResultsSHA':sha(SOURCE),'scope':'119 non-Catan games; one original photo and one selected area per game; sparse visible-object anchors. No new model calls.','counts':dict(counts),'overview':dict(overview),'rows':rows,'acceptanceRuleStatus':'Recommendations for this review, not a new product release policy.','limits':['No full-image precision/recall: unannotated outputs and objects are not exhaustively scored.','No measured correction seconds/clicks, user study or scan/multiple-frame performance.','A saved candidate preserves model output; it does not establish visual correctness.','Partial correspondence counts describe the existing tested objects only; approximate geometry and human interpretation remain uncertain.','Four reference-error cases and four uncertain cases must not be counted as definite model mistakes.']}
worker=load(HERE/'worker-assessment.json');assert worker['sourceResultsSHA']==sha(SOURCE)
bygame={x['gameId']:x for x in worker['rows']};assert len(bygame)==57
expected={r['gameId'] for r in rows if r['diagnosisType'] in ['empty','units','other-targets','processing']}
assert expected=={r['gameId'] for r in worker['rows'] if r['acceptability']=='not-acceptable-for-auto-restore'}
for r in rows:
 w=bygame.get(r['gameId']);r['acceptability']=w['acceptability'] if w else 'sample-match';r['correctionBurden']=w['correctionBurden'] if w else 'none';r['recoverableFacts']=w['recoverablePhotoFacts'] if w else r['reason']
analysis['practicalCounts']={'표본 일치':62,'현재 자동 복원에 부족':29,'특정 정정 필요':19,'확인 조건부':1,'판정 보류':8}
(HERE/'assessment.json').write_text(json.dumps(analysis,ensure_ascii=False,indent=2)+'\n')

lines=['# 불일치는 정정 가능한 차이부터 개별 상태가 사라지는 실패까지 나뉩니다','','**현재 사진 표본에서 빈 결과는 13종, 판·묶음 또는 다른 대상만 읽어 주요 표본이 사라진 경우는 12종입니다. 둘을 모두 “전혀 인식 못함”으로 묶으면 안 됩니다.**','', '나머지에서는 일부 실물 누락·값 오독 18종, 필드 연결·사용자 입력 2종, 서비스 응답 처리 실패 4종이 확인됩니다. 표본 일치 62종과 사진 판단 보류·솔 참조 오류 8종은 따로 둡니다.','', '## 복원에 사용할 수 있는 범위','', '| 권고 | 사례 수 | 뜻 |','|---|---:|---|','| 현재 표본에서 확인 가능 | 62 | 확인한 실물·값은 일치. 전체 게임 보증 아님 |','| 현재 자동 복원에 부족 | 29 | 빈 결과·주요 대상 유실·처리 실패. 입력 대부분을 보충하거나 경로 보완 필요 |','| 특정 정정 필요 | 19 | 누락·눈값·필드 연결을 확인 후 정정 |','| 명시 확인 조건부 | 1 | 아발론의 제외된 역할 값 직접 확인 |','| 판정 보류 | 8 | 사진 판단 보류4 + 솔 참조 오류4 |','', '## 허용 여부를 정하는 기준','', '- **허용 가능:** 같은 실물·종류·중요 값이 보존되고, 색의 동의어·번역·근사 상자 차이만 있는 경우. 단, 상자가 다른 물체를 가리키거나 복원 위치가 바뀌면 허용할 차이가 아닙니다.','- **조건부 사용:** 일부 물체나 값은 맞지만 누락·오독이 있는 경우. 맞은 결과는 재사용하고 빠진 것만 정정할 수 있으나, 정정 없이 자동 복원해도 된다는 뜻은 아닙니다.','- **현재 빠른 저장에는 부족:** 빈 결과, 판·무리만 검출, 검사 대상 전부 미대응, 후보 생성 실패. 사용자가 대부분을 다시 입력해야 하거나 서비스가 입력을 받아들이지 못합니다.','- **판정 보류:** 사진 자체의 애매함과 잘못된 수동 참조. 모델 오류로 확정하거나 통과로 올리지 않습니다.','', '위 기준은 이번 검토의 권고입니다. 정정 시간·버튼 수와 사용자 허용률은 측정하지 않았습니다.','', '## 유형별 분리','', '| 유형 | 게임 수 | 판단 |','|---|---:|---|']
for key,(label,decision,impact) in GROUPS.items():lines.append(f'| {label} | {counts[key]} | {decision} |')
lines+=['','## 정확도 수치를 읽는 방법','', '이번 자료는 사진 전체의 완전한 정답 목록이 아닙니다. 따라서 정확도·재현율 몇 %라고 쓰지 않습니다. 아래 `확인된 실물/표본`은 기존 사진 재검토로 대응이 확인된 일부 물체 수이며, 값까지 모두 맞다는 뜻도 아닙니다. 자동 IoU·문자열 비교 수치는 원자료에 남기되 사람의 재검토 비율로 바꾸지 않았습니다.','', '예: 러브레터는 검사 카드 2장 중 1장을 누락했습니다. 그랜드 오스트리아 호텔은 주사위 3개를 찾았지만 눈값은 3개 중 2개를 다르게 읽었습니다. 테라포밍 마스는 표본 큐브를 읽었어도 잘못된 종류별 속성 때문에 서비스가 전체 후보를 만들지 못했습니다.','', '## 불일치·기타 57종 전체','', '| 게임 | 유형 | 확인된 실물/표본 | 원응답 물체 수 | 후보 저장 | 근거와 영향 |','|---|---|---:|---:|---|---|']
for r in rows:
 if r['diagnosisType']=='match':continue
 seen='미채점' if r['confirmedSampleObjectsPresent'] is None else f"{r['confirmedSampleObjectsPresent']}/{r['sampleCount']}"
 reason=(r['reason']+' '+r['recommendation']).replace('|','\\|').replace('\n',' ')
 lines.append(f"| {r['name']} | {r['diagnosis']} | {seen} | {r['nativeObjectCount']} | {'보존' if r['saved'] else '없음'} | {reason} |")
lines+=['','## 허용 가능한 차이가 이미 분리된 사례','', '아그리콜라의 blue/light blue·family/가족, King of Tokyo의 검정 주사위와 녹색 인쇄 설명, Tapestry의 같은 건물에 대한 근사 상자 차이는 단순 문자열·IoU 불일치와 실제 오독을 구분한 사례입니다. 반대로 파워그리드의 빠진 집, 그랜드 오스트리아 호텔의 다른 눈값은 표현 차이가 아닙니다.','', '## 보완 우선순위','', '1. 응답 처리 실패 4종: 원응답을 재사용할 수 있도록 형식·종류별 속성 계약을 고칠 대상입니다. 사진 인식 능력과 구분해 고쳐야 하며, 임의로 값을 맞춰 통과시키는 방식은 피합니다.','2. 빈 결과 13종과 주요 표본 유실 12종: 현재 사진으로는 빠른 자동 저장·복원에 충분하지 않습니다. 가까운 촬영이나 스캔이 도움이 될 가능성은 있지만 이번 검사는 그 효과를 측정하지 않았습니다.','3. 부분 누락·오독 18종: 사진에서 누락 위치를 보여주고 해당 물체·값만 보충하는 정정 흐름이 필요합니다. 저장됐다는 이유로 정확하다고 간주하면 안 됩니다.','4. 잘못된 솔 참조 4종은 정답 목록을 별도로 바로잡고 재평가할 대상입니다. 이번 검토에서 원참조·원응답은 수정하지 않았습니다.','', '## 검토 화면','', '[사진과 표본·모델 상자를 함께 보는 로컬 검토 화면](http://127.0.0.1:4389/?view=1). 유형 버튼과 검색으로57종을 한 게임씩 볼 수 있습니다. 현 PC에서만 열리는 로컬 화면이며 외부 공개는 하지 않았습니다.','', '## 원응답 처리 실패 4종의 차이','', '| 게임 | 실제 응답 | 후보가 막힌 이유 | 형식 보완만으로 충분한가 |','|---|---|---|---|','| 혁신의 시대 | map 1건 | 모름을 문자열 null로 반환 | 아니오. 개별 기물도 읽지 않아 인식 단위 보완 필요 |','| 도미넌트 스피시즈 | 지형 27건 | 모름을 문자열 null로 반환 | 표본 지형은 읽었지만 보완 후 재검증 필요 |','| 마블 챔피언스 | 18건 | 정수 단계에 문자열 값을 반환 | 형식 문제와 실제 카드 정보 보존을 함께 재검증 |','| 테라포밍 마스 | 43건 | cubes 한 항목에 terrain 전용 속성 | 큐브 표본은 읽었으나 잘못된 종류·속성도 명시 정정 필요 |','', '현재 검증이 잘못된 값을 확정하지 않고 거절한 동작과, 그 결과 사용자가 후보를 받지 못하는 통합상의 문제를 구분했습니다. 검증을 꺼서 통과시키자는 뜻이 아닙니다. 형식 문제를 고치면 4종 모두 정확해진다는 결론도 내리지 않았습니다.','', '## 근거와 범위','', f"- 원자료: [119종 결과](../results/results.json), SHA-256 `{sha(SOURCE)}`.", '- 상세 판단·자료 연결: [assessment.json](assessment.json). 원사진·원응답은 기존 비공개 경로에서 검토했습니다.', '- 모델 호출 0회, 제품 코드·기존 참조·기존 판정 변경 없음.', '- 게임당 사진 1장·영역 1곳입니다. 모든 구성물, 숨긴 패, 소유자·턴, 여러 프레임의 스캔 성능은 이번 정확도 주장에 포함하지 않습니다.']
(HERE/'README.md').write_text('\n'.join(lines)+'\n')

# App payload keeps images private and original; overlays are SVG, not altered image files.
appRows=[]
for row in rows:
 rr=dict(row); rr.pop('evidencePaths'); rr.pop('automaticComparison')
 c=plans[row['gameId']];ref=load(c['referencePath']);folder=folders[row['gameId']];native=load(folder/'native-response.json');items=json.loads(''.join(p.get('text','') for p in native['candidates'][0]['content']['parts'] if not p.get('thought')))['items']
 rr['width']=ref['width'];rr['height']=ref['height'];rr['anchorsJson']=json.dumps(ref['anchors'],ensure_ascii=False);rr['nativeItemsJson']=json.dumps(items,ensure_ascii=False)
 rr['imageData']='data:'+c['mime']+';base64,'+base64.b64encode(Path(c['path']).read_bytes()).decode() if row['diagnosisType']!='match' or row['gameId'] in ['agricola','king-tokyo','king-of-tokyo','tapestry'] else None
 appRows.append(rr)
snapshot={'surface':'report','title':'어떤 불일치를 허용하고, 무엇을 다시 입력해야 하나','generatedAt':'2026-10-27T00:00:00+09:00','status':'reviewed','buildStatus':'creating','filters':[],'queries':{'game_cases':{'rows':appRows,'payloadColumns':['imageData','anchorsJson','nativeItemsJson'],'source':{'label':'KeepBoard119게임 실사진·독립 참조·실제 서비스 응답','files':[str(SOURCE),str(HERE/'assessment.json')],'evidenceFlow':[{'title':'실제 서비스 결과','detail':'119종 사진1장과 영역1곳을 같은 원본 바이트로 실제 서비스 판독.98종 뒤에 미처리21종을 별도 승인으로 추가. 결과와 원응답·참조 해시가 연결됨.'},{'title':'시각 재검토','detail':'독립 참조를 사전 고정한 뒤 원사진·원응답 대조. 기존 판정을 보존하고 이번 검토에서 실패 종류와 정정 필요를 분리.'}],'metricDefinitions':[{'label':'게임 수','definition':'서로 다른119종의 사진 표본을 실패 유형에 따라 하나의 주유형으로 분류. 전체게임 정확도가 아니라 이번 표본의 사례 수.','componentIds':['type-counts','case-review']}],'caveats':analysis['limits']}}},'analysis':{'overview':dict(overview),'counts':dict(counts)}}
private=Path('/private/tmp/keepboard-accuracy-analysis-20261027');private.mkdir(mode=0o700,exist_ok=True);p=private/'snapshot.json';p.write_text(json.dumps(snapshot,ensure_ascii=False)+'\n');p.chmod(0o600)
print(json.dumps({'cases':len(rows),'nonmatching':57,'counts':dict(counts),'snapshot':str(p),'sourceResultsSHA':sha(SOURCE)},ensure_ascii=False))
