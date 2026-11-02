"""Offline accounting and score reproduction. Writes only this research directory.
Run with python3 -B; imports the frozen pure scorer, never its writing entry point.
No private observations, images, response bodies, or private paths enter the report.
"""
import collections, hashlib, json, statistics, sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
EXPERIMENT = ROOT / 'docs/terra-accuracy-20261030'
sys.path.insert(0, str(EXPERIMENT))
from score_refs import refs, score, types_from, iou, norm

def read(p): return json.loads(p.read_text())
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def totals(rows):
    result = dict(input=0, output=0, cached=0, cacheWrite=0, reasoning=0)
    for r in rows:
        u=r['usage']; d=u.get('input_tokens_details', {})
        result['input']+=u['input_tokens']; result['output']+=u['output_tokens']
        result['cached']+=d.get('cached_tokens',0); result['cacheWrite']+=d.get('cache_write_tokens',0)
        result['reasoning']+=u.get('output_tokens_details',{}).get('reasoning_tokens',0)
    result['estimatedStandardUSD']=((result['input']-result['cached']-result['cacheWrite'])+result['cacheWrite']*1.25+result['cached']*.05+result['output']*5)/1e6
    times=[r['ms']/1000 for r in rows]
    result.update(calls=len(rows),meanSeconds=statistics.mean(times),medianSeconds=statistics.median(times),minSeconds=min(times),maxSeconds=max(times))
    return result

ledgers=[]; checks=[]; input_files=set()
for phase in ['dev','heldout']:
    p=EXPERIMENT/f'plan-{phase}.json'; plan=read(p); lp=EXPERIMENT/f'plan-{phase}-ledger.json'; ledger=read(lp)
    input_files.update([p,lp,EXPERIMENT/f'plan-{phase}-execution.json'])
    for row in ledger:
        validated={}
        for ext,key in [('request','bodySHA'),('native','rawSHA'),('decoded','decodedSHA')]:
            validated[ext]=digest(Path(plan['privateDir'])/f"{row['id']}.{ext}.json")==row[key]
        checks.append(dict(id=row['id'],phase=phase,hashMatch=validated,http=row['http'],status=row['status'],model=row['modelReturned'],boxContract=row['boxContract']))
    ledgers+=ledger

plan=read(EXPERIMENT/'plan-heldout.json'); saved=read(EXPERIMENT/'scores-heldout.json'); rf=refs()
saved_by_game={r['gameId']:r for r in saved['rows']}
calls={c['id']:c for c in plan['calls']}; rows=[]
for photo in plan['photos']:
    game=photo['gameId']; task=read(Path(calls[game+'-base']['taskPath'])); ty=types_from(task)
    assert digest(Path(calls[game+'-base']['taskPath']))==calls[game+'-base']['taskSHA']
    for variant in ['base','improved']:
        name=game+'-'+variant; d=Path(plan['privateDir']); observations=read(d/(name+'.decoded.json'))['observations']; wire=read(d/(name+'.parsed.json'))['items']
        metrics=score(rf[game],observations,ty); wirecounts=collections.Counter()
        for o,w in zip(observations,wire):
            ids=set(task['request']['allowedPropertyIds'][w['kind']]); fields={a['id'] for a in w['attributes']}
            wirecounts['rows']+=1; wirecounts['allowedPropertySlots']+=len(ids); wirecounts['omittedPropertySlots']+=len(ids-fields)
            wirecounts['quantityNull']+=w['quantity'] is None
            wirecounts['quantityAboveOne']+=w['quantity'] is not None and w['quantity']>1
            wirecounts['explicitFaceWithoutAttribute']+='face' in ids and w['face']!='unknown' and 'face' not in fields
        boxes=[None if not o.get('bbox') or (o.get('quantity') or 1)>1 else [o['bbox']['x'],o['bbox']['y'],o['bbox']['x']+o['bbox']['width'],o['bbox']['y']+o['bbox']['height']] for o in observations]
        matrix=[[iou(r['box'],b) if b else 0 for b in boxes] for r in rf[game]]; matches={}
        for i,line in enumerate(matrix):
            best=max(line,default=0); candidates=[j for j,x in enumerate(line) if abs(x-best)<1e-9]
            if best<.25 or len(candidates)!=1: continue
            j=candidates[0]; column=[x[j] for x in matrix]
            if abs(best-max(column))<1e-9 and sum(abs(x-max(column))<1e-9 for x in column)==1: matches[i]=j
        by_attribute=collections.defaultdict(collections.Counter)
        for i,r in enumerate(rf[game]):
            o=observations[matches[i]] if i in matches else None
            for key,expected in r['attrs'].items():
                if ty.get((r['kind'],key))=='text': continue
                prop=(o or {}).get('properties',{}).get(key)
                state='missing-object' if o is None else 'unknown' if not prop or prop['state']!='observed' else 'correct' if norm(prop['value'])==norm(expected) else 'wrong'
                by_attribute[key][state]+=1
        rows.append(dict(gameId=game,variant=variant,metrics=metrics,reproducesFrozenMetrics=metrics==saved_by_game[game][variant]['metrics'],wireCounts=dict(wirecounts),valueAttributeBreakdown=dict(by_attribute)))

reference_hashes={}
for key in ['sol1','sol2']:
    p=ROOT/f'docs/twenty-games-pack-study-20261029/references-{key}.json'; input_files.add(p)
    reference_hashes[key]={'sha256':digest(p),'unchanged':digest(p)==plan['referenceSHA'][key]}

source_files=['server/ai/geminiGameReader.ts','server/ai/catanSceneReading.ts','server/ai/observationAssembly.ts','server/hostedObservation.ts','server/scanObservation.ts','server/scanExecution.ts','server/observationFusion.ts','server/analysisTask.ts','server/analysisJobs.ts','server/cloudRuntime.ts','server/index.ts','workflows/analyze.ts','shared/lightweightRecognition.ts','shared/scanObservation.ts','shared/photoGeometry.ts','shared/readouts/registry.ts','shared/genericRecord.ts','src/SessionWorkspace.tsx','src/jobStatusPolling.ts','src/GameEssentials.tsx','src/GameBoardRecord.tsx','src/realBoards.ts','src/boardVisuals.ts','src/readouts/GameDetailFields.tsx','docs/work-sessions.md']
reference_files=['docs/terra-accuracy-20261030/README.md','docs/terra-accuracy-20261030/lib.mts','docs/terra-accuracy-20261030/prepare-heldout.mts','docs/terra-accuracy-20261030/run.mts','docs/terra-accuracy-20261030/score_refs.py','docs/terra-accuracy-20261030/score_heldout.py','docs/terra-accuracy-20261030/scores-heldout.json','docs/ten-games-closeup-20261029/terra-fix/README.md','docs/ten-games-closeup-20261029/terra-fix/namedBox.mts','docs/ten-games-closeup-20261029/terra-comparison/README.md','docs/ten-games-closeup-20261029/video-attempt/README.md','docs/observation-fusion-implementation-20261029/README.md']
input_files.update(ROOT/f for f in source_files+reference_files)
result={'checkedDate':'2026-10-30','evidenceLevel':'VERIFIED: hash/accounting/offline reproduction only; reference truth remains AI-partial','newProviderCalls':0,'productWrites':0,'scope':'Current shared source; no operating config, deployed process, live user record, credentials, or active board artwork inventory accessed','receiptChecks':checks,'referenceHashes':reference_hashes,'rows':rows,'usage':{'all24':totals(ledgers),'base9':totals([r for r in ledgers if r['id'].endswith('-base')]),'improved9':totals([r for r in ledgers if r['id'].endswith('-improved')])},'accountingNotes':['Official standard short-context rate, not actual invoice or remaining credit balance.','Reasoning tokens are contained in output tokens; cache-write/read are parts of input.','Total correctness is NOT inferred from score reproduction.','Scorer matches reciprocal unique max IoU >= .25, excludes quantity>1; quantity null/0 is not proof of an individual.','Text exactness and observed-unjudged strings remain separate.'],'sources':[{'path':str(p.relative_to(ROOT)),'sha256':digest(p)} for p in sorted(input_files)]}
result['officialReferences']=[
 {'url':'https://developers.openai.com/api/docs/models/gpt-6.1-terra','checkedDate':'2026-10-30','verified':'image input, Responses API and structured outputs support; low reasoning effort supported','notVerified':'account access, remaining credit or KeepBoard accuracy'},
 {'url':'https://developers.openai.com/api/docs/guides/structured-outputs','checkedDate':'2026-10-30','verified':'strict schema, all object properties required with nullable unknowns, nested anyOf, additionalProperties false, incomplete/refusal handling','notVerified':'proposed per-kind KeepBoard schema live acceptance'},
 {'url':'https://developers.openai.com/api/docs/guides/images-vision','checkedDate':'2026-10-30','verified':'small text/rotation/counting/spatial limitations; image token costs','notVerified':'exact gpt-6.1-terra internal patch ceiling; 2048/2500 here is the observed experiment preprocessing policy'},
 {'url':'https://developers.openai.com/api/docs/pricing','checkedDate':'2026-10-30','verified':'standard short-context gpt-6.1-terra per-million input 1 USD, output 5 USD, cache-read .05 USD, 30m cache-write 1.25 USD','notVerified':'actual invoice, account credit, future request cost'}]
(OUT/'evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'hashChecks':sum(sum(r['hashMatch'].values()) for r in checks),'hashDenominator':len(checks)*3,'scoresReproduced':sum(r['reproducesFrozenMetrics'] for r in rows),'scoreDenominator':len(rows),'usage':result['usage']},ensure_ascii=False))
