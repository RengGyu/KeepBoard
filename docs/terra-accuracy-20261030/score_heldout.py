"""Held-out scoring: same frozen references and same automatic scorer for Gemini baseline and both Terra variants."""
import json,hashlib,collections
from pathlib import Path
from score_refs import refs,score,types_from
R=Path(__file__).resolve().parent;RD=Path('/Users/jeonggyuju/Library/Application Support/KeepBoard/research/twenty-games-pack-study-20261029')
plan=json.loads((R/'plan-heldout.json').read_text());ledger={x['id']:x for x in json.loads((R/'plan-heldout-ledger.json').read_text())};rf=refs()
gled={}
for f in ['baseline-ledger.json']:
 for x in json.loads((R.parent/'twenty-games-pack-study-20261029'/f).read_text()):gled[x.get('gameId') or x.get('id')]=x
rows=[]
for p in plan['photos']:
 g=p['gameId'];task=json.loads((RD/f'{g}.baseline.task.json').read_text());ty=types_from(task)
 row=dict(gameId=g,photo=dict(sourceSHA=p['sourceSHA'],size=[p['width'],p['height']],improvedUpscale=p['upscale']),referenceObjects=len(rf[g]))
 gl=gled.get(g,{});row['gemini']=dict(metrics=score(rf[g],json.loads((RD/f'{g}.baseline.decoded.json').read_text())['observations'],ty),ms=gl.get('ms') or gl.get('durationMs'))
 for v in ['base','improved']:
  l=ledger[f'{g}-{v}'];d=Path(plan['privateDir'])/f'{g}-{v}.decoded.json'
  assert hashlib.sha256(d.read_bytes()).hexdigest()==l['decodedSHA']
  u=l['usage'];row[v]=dict(metrics=score(rf[g],json.loads(d.read_text())['observations'],ty),ms=l['ms'],box=l['boxContract'],usage=dict(input=u['input_tokens'],output=u['output_tokens'],reasoning=u.get('output_tokens_details',{}).get('reasoning_tokens'),cacheWrite=u.get('input_tokens_details',{}).get('cache_write_tokens'),cached=u.get('input_tokens_details',{}).get('cached_tokens')))
 rows.append(row)
def tot(k,f):return sum(r[k]['metrics'][f] for r in rows)
summary={k:dict(individual=f"{tot(k,'individualDetected')}/{sum(r['referenceObjects'] for r in rows)}",value=f"{tot(k,'correct')}/{tot(k,'valueAttributes')}",valueWrong=tot(k,'wrong'),valueUnknown=tot(k,'unknown'),
 textExact=sum(r[k]['metrics']['text']['exact'] for r in rows),textObservedUnjudged=sum(r[k]['metrics']['text']['observedUnjudged'] for r in rows),textTotal=sum(r[k]['metrics']['text']['total'] for r in rows)) for k in ['gemini','base','improved']}
(R/'scores-heldout.json').write_text(json.dumps(dict(rows=rows,summary=summary,scorer='score_refs.py (reproduces prior manual object correspondence 9/9 games for Gemini)'),ensure_ascii=False,indent=1)+'\n')
for r in rows:
 print(r['gameId'],r['referenceObjects'],*[f"{k}: det {r[k]['metrics']['individualDetected']} kind {r[k]['metrics']['kindCorrect']} val {r[k]['metrics']['correct']}/{r[k]['metrics']['valueAttributes']} w{r[k]['metrics']['wrong']} u{r[k]['metrics']['unknown']} txt {r[k]['metrics']['text']['exact']}+{r[k]['metrics']['text']['observedUnjudged']}?/{r[k]['metrics']['text']['total']} rows {r[k]['metrics']['outputRows']} grp {r[k]['metrics']['groupRows']}" for k in ['gemini','base','improved']],sep=' | ')
print(json.dumps(summary,ensure_ascii=False))
