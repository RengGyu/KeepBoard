"""Offline arithmetic over frozen receipts. No network, keys, or product writes."""
import hashlib
import json
from pathlib import Path

ROOT = Path('docs/terra-quality-iteration-20261030')
OUT = Path('docs/terra-latency-architecture-20261031')
sources = [ROOT / 'execution-high.json', ROOT / 'crop-high/execution.json']
executions = [json.loads(p.read_text()) for p in sources]
rows = [r for ex in executions for r in ex['rows']]
assert len(rows) == 12 and len({r['id'] for r in rows}) == 12
assert all(r['httpStatus'] == 200 and r['status'] == 'completed' for r in rows)

def usage(rs):
    return {
        'input': sum(r['usage']['input_tokens'] for r in rs),
        'outputIncludingReasoning': sum(r['usage']['output_tokens'] for r in rs),
        'reasoningSubset': sum(r['usage']['output_tokens_details']['reasoning_tokens'] for r in rs),
        'calculatedUSD': round(sum(r['calculatedUSD'] for r in rs), 9),
    }

games = []
for game in ['carcassonne', 'sagrada', 'ticket-to-ride']:
    units = {r['condition']: r for r in rows if r['gameId'] == game}
    pairs = {}
    for first, second in [('A', 'D'), ('B', 'D'), ('A', 'B')]:
        left, right = units[first], units[second]
        a, b = left['providerMs'], right['providerMs']
        pairs[first + second] = {
            'classification': 'CALCULATED_COUNTERFACTUAL_NOT_MEASURED',
            'serialSeconds': (a + b) / 1000,
            'simultaneousFirstReceiptSeconds': min(a, b) / 1000,
            'simultaneousWholeReceiptSeconds': a / 1000,
            'simultaneousAllReceiptsSeconds': max(a, b) / 1000,
            'removedSerialWaitSeconds': min(a, b) / 1000,
            **usage([left, right]),
        }
    games.append({
        'gameId': game,
        'measuredCalls': [{
            'condition': k, 'providerSeconds': r['providerMs'] / 1000,
            'runnerUnitSeconds': r['elapsedMs'] / 1000,
            'nonProviderRunnerMs': r['elapsedMs'] - r['providerMs'],
            'headersMs': r['headersMs'], 'returnedEffort': r['returnedEffort'],
            'bodySHA': r['bodySHA'], 'inputSHA': r['inputSHA'],
            **usage([r]),
        } for k, r in sorted(units.items())],
        'hypotheticalPairs': pairs,
    })

report = {
    'version': 'terra-latency-arithmetic-v1', 'analysisDate': '2026-10-31',
    'newProviderCalls': 0,
    'sourceSHA256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
    'observedRunnerBatches': [{'calls': e['calls'], 'peak': e['peak'], 'wallSeconds': e['wallMs'] / 1000, 'calculatedUSD': e['calculatedUSD']} for e in executions],
    'conditions': {'A': 'whole-low', 'B': 'whole-high', 'C': 'fixed-source-crop-low', 'D': 'fixed-source-crop-high'},
    'games': games,
    'aggregateByCondition': {c: usage([r for r in rows if r['condition'] == c]) for c in 'ABCD'},
    'all12HistoricalCalculatedUSD': usage(rows)['calculatedUSD'],
    'assumptions': [
        'Pair durations reuse different historical requests; no new pair was dispatched.',
        'Independent units start together after preparation, with unchanged per-call duration and no provider queuing/resource contention.',
        'min/max are arithmetic scenarios, not confidence bounds or latency guarantees.',
        'providerMs includes request network, service processing and full response download; it is not isolated model compute.',
        'Upload, registration, current cloud preparation, final commit, UI polling/rendering and human correction are excluded.',
        'Reasoning tokens are a subset of output tokens; do not bill/count them twice.',
        'Costs reproduce the frozen experiment conversion, not current tariff verification or an actual invoice.',
        'Scan plans and mixed per-unit efforts require product contract work; replay is not a production mixed-profile job test.',
    ],
}
(OUT / 'timing-analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps([{'game': g['gameId'], 'A': g['measuredCalls'][0]['providerSeconds'], 'B': g['measuredCalls'][1]['providerSeconds'], 'AD': g['hypotheticalPairs']['AD'], 'BD': g['hypotheticalPairs']['BD']} for g in games], ensure_ascii=False, indent=2))
