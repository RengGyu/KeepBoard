"""Rebuild a compact report without treating output counts as accuracy."""
import csv, hashlib, json, statistics
from collections import Counter
from pathlib import Path

base = Path(__file__).resolve().parent
private = Path('/private/tmp/kb-argon-model-only-30-20261028')
load = lambda p: json.loads(Path(p).read_text())
selection = load(base / 'selection.json')['cases']
ledger = load(private / 'ledger.json')
coverage = load(base / 'coverage-checklist.json')['cases']
reviews = {}
for name, key in [('review-1.json', 'rows'), ('review-2.json', 'games'), ('review-3.json', 'rows')]:
    if (base / name).exists():
        reviews.update({x['gameId']: x for x in load(base / name)[key]})
opus=load(base/'opus-review.json') if (base/'opus-review.json').exists() else None
if opus:
    for key,name in {'selectionSHA256':'selection.json','coverageChecklistSHA256':'coverage-checklist.json','review1SHA256':'review-1.json','review2SHA256':'review-2.json','review3SHA256':'review-3.json','provenanceErrataSHA256':'provenance-errata.json','compareScriptSHA256':'compare.mts'}.items():
        assert opus['inputs'][key]==hashlib.sha256((base/name).read_bytes()).hexdigest(), 'Audit input drift '+name
    assert not opus['pending'] and len({x['gameId'] for x in opus['games']})==30
opus_games={x['gameId']:x for x in opus['games']} if opus else {}

models = ['gemini-3.8-flash', 'gemini-4-argon']
verdicts = {'better': '개선', 'same': '비슷', 'mixed': '개선·오류 혼재', 'worse': '악화', 'insufficient': '판단 보류'}
verdict_of = lambda r: {'improved':'better'}.get(r.get('practicalPairedVerdict',r.get('comparison','pending')),r.get('practicalPairedVerdict',r.get('comparison','pending')))
rows = []
for c in selection:
    game = c['gameId']; calls = [x for x in ledger if x['gameId'] == game]
    if len(calls) == 2:
        assert calls[0]['bodySHA'] == calls[1]['bodySHA'], 'Model-only invariant failed'
    r = reviews.get(game, {})
    verdict = verdict_of(r)
    row = {'게임': game, '판정': verdicts.get(verdict, verdict), '근거': r.get('reason', '시각 대조 대기'), '전체정확도': '산출 불가: 전량 정답/다른 영역 미확정'}
    row['초기판정']=row['판정']
    if game in opus_games:
        row['판정']=opus_games[game]['opusVerdict'];row['근거']=opus_games[game]['basis']
    for label, model in zip(['Flash', 'Argon'], models):
        call = next((x for x in calls if x['model'] == model), {})
        row[label+'상태'] = call.get('state', 'not-started')
        row[label+'초'] = round(call['ms']/1000, 2) if 'ms' in call else ''
        row[label+'출력종류별개수'] = ', '.join(f'{k}:{v}' for k,v in call.get('counts', {}).items())
    rows.append(row)

with (base/'comparison.csv').open('w', encoding='utf-8-sig', newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
stats={}
kind_coverage={}
for model in models:
    times=[x['ms']/1000 for x in ledger if x['model']==model and x['state']=='received']
    stats[model]={'completed':len(times),'minSeconds':min(times) if times else None,'maxSeconds':max(times) if times else None,'meanSeconds':statistics.mean(times) if times else None,'medianSeconds':statistics.median(times) if times else None}
    missing_per_game=[]; visible_units=0; missing_units=[]
    for c in coverage:
        if not all(any(x['gameId']==c['gameId'] and x['model']==m and x['state']=='received' for x in ledger) for m in models): continue
        call=next((x for x in ledger if x['gameId']==c['gameId'] and x['model']==model and x['state']=='received'),None)
        if not call: continue
        kinds=[k for a in c['areas'] if a['selectedInputArea'] for k in a['kinds'] if k['photoStatus'].startswith('visible')]
        absent=[k['componentId'] for k in kinds if not call.get('counts',{}).get(k['componentId'],0)]
        visible_units+=len(kinds);missing_per_game.append(len(absent));missing_units.extend({'gameId':c['gameId'],'kind':k} for k in absent)
    kind_coverage[model]={'photoVisibleKindUnits':visible_units,'wholeKindNoOutputUnits':len(missing_units),'missingKindList':missing_units,'missingKindsPerPhoto':{'min':min(missing_per_game) if missing_per_game else None,'max':max(missing_per_game) if missing_per_game else None,'mean':statistics.mean(missing_per_game) if missing_per_game else None},'notAccuracy':'A returned kind can still have wrong/duplicate/off-area objects and bad values. Partial omissions within a returned kind are not counted here.'}

integrity = {'uniqueGames': len({x['gameId'] for x in selection}), 'uniqueAttempts':len({(x['gameId'],x['model']) for x in ledger}), 'attempts':len(ledger), 'finishedCalls':sum(x['state']!='started' for x in ledger), 'pairedBodyHashesIdentical':True, 'selectionSHA':hashlib.sha256((base/'selection.json').read_bytes()).hexdigest()}
reviewed=lambda r:verdict_of(r) in verdicts and not str(r.get('status','')).startswith('pending')
summary={'status':'finished' if integrity['finishedCalls']==60 and all(reviewed(reviews.get(x['gameId'],{})) for x in selection) else 'in-progress', 'integrity':integrity,'latency':stats,'kindOutputCoverage':kind_coverage,'rows':rows,'limits':['One fresh request per model per photo; no repeatability confidence interval.','Output counts do not equal ground-truth counts or accuracy.','All current pack areas/kinds/properties inventoried, but unpictured areas and hidden/manual state remain untested.','Full-game accuracy is not established.','No production settings or user sessions changed.']}
summary['initialReviewOnly']=not bool(opus)
summary['opusAuditStatus']='reviewed-input-hashes-verified' if opus else 'pending'
summary['verdictTally']=dict(Counter(r['판정'] for r in rows))
summary['opusAuditSHA']=hashlib.sha256((base/'opus-review.json').read_bytes()).hexdigest() if opus else None
summary['provenanceErrata']='provenance-errata.json'
(base/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
md=['# 모델만 변경한 비교','', '**초기 시각 판정입니다. 최종 Opus High 검토는 [별도 기록](opus-review.json)을 확인하세요.** 참조는 독립 AI 시각 해석이며 사람이 인증한 정답이 아닙니다. 실제 작업자 설정의 정정은 [출처 정정](provenance-errata.json)에 기록했습니다.','', '**출력 개수는 정확도가 아닙니다.** 같은 사진·프롬프트·출력 형식·LOW thinking·HIGH 해상도에서 모델만 바꿨습니다. 카탄은 별도 원사진 전수 대조, 나머지 30게임은 모든 영역/구성물 종류를 목록화하고 사진에 보이는 종류를 대조합니다. 가려진/사진에 없는 요소와 수동 상태는 미검증입니다.','', '## 응답 시간(초)','', '| 모델 | 완료 | 최소 | 최대 | 평균 | 중앙값 |','|---|---:|---:|---:|---:|---:|']
if opus:md[2]='**기존 클로드 Opus High의 최종 검토를 반영했습니다.** [검토 원문](opus-review.json). 참조와 검토 모두 AI 시각 해석이며 사람이 인증한 정답이 아닙니다. 실제 작업자 설정의 정정은 [출처 정정](provenance-errata.json)에 기록했습니다.'
for model,s in stats.items():
    vals=[str(s['completed'])]+[f'{s[k]:.1f}' if s[k] is not None else '-' for k in ['minSeconds','maxSeconds','meanSeconds','medianSeconds']]
    md.append('| '+model+' | '+' | '.join(vals)+' |')
md += ['', '## 30게임 비교', '', '출력은 종류별 행 수입니다. 묶음/중복/영역 밖 결과가 섞일 수 있어 검출률로 나누지 않습니다.', '', '| 게임 | 사진 대조 판정 | Flash 출력 | Argon 출력 |', '|---|---|---|---|']
for r in rows: md.append('| '+' | '.join(str(r[k]).replace('|','/') for k in ['게임','판정','Flash출력종류별개수','Argon출력종류별개수'])+' |')
md += ['', '게임별 근거와 시간은 [CSV](comparison.csv), 카탄 실물별 대응은 [시각 대조](catan-visual-review.json), 게임 전체의 미시험 영역은 [범위 체크리스트](coverage-checklist.json)에 있습니다.', '', '실행 상태: '+summary['status']+'. 운영 모델·사용자 기록은 변경하지 않았습니다.']
(base/'RESULTS.md').write_text('\n'.join(md)+'\n')
print(json.dumps({'status':summary['status'],'integrity':integrity,'reviewRows':len(reviews)},ensure_ascii=False))
