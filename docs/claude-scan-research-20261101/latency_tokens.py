"""Offline: collect every recorded Terra/Gemini call with usage + provider time from docs/ JSON artifacts.
No network, no private data. Usage: python3 -I latency_tokens.py <repo-root>"""
import json, sys, pathlib, statistics
root = pathlib.Path(sys.argv[1])
rows, seen = [], set()
def ms(x):
    for k in ('providerMs', 'readerMs', 'elapsedMs'):
        if isinstance(x.get(k), (int, float)): return x[k] / 1000, k
    if isinstance(x.get('apiSeconds'), (int, float)): return x['apiSeconds'], 'apiSeconds'
    return None, None
def walk(x, f):
    if isinstance(x, dict):
        u = x.get('usage')
        if isinstance(u, dict) and isinstance(u.get('output_tokens'), int):
            s, k = ms(x)
            rid = (round(ms(x)[0] or 0, 1), u.get('input_tokens'), u['output_tokens'])  # same call recorded in several artifacts
            if s and rid not in seen:
                seen.add(rid)
                rows.append(dict(file=str(f.relative_to(root)), id=x.get('id'), effort=x.get('effort') or x.get('returnedEffort'),
                    sec=round(s, 2), timeKey=k, inp=u.get('input_tokens'), out=u['output_tokens'],
                    reasoning=(u.get('output_tokens_details') or {}).get('reasoning_tokens'), obs=x.get('observationCount')))
            return
        for v in x.values(): walk(v, f)
    elif isinstance(x, list):
        for v in x: walk(v, f)
for f in sorted((root / 'docs').rglob('*.json')):
    if '.keepboard' in f.parts: continue
    try: d = json.loads(f.read_text())
    except Exception: continue
    walk(d, f)
out = [r for r in rows]
xs = [r['out'] for r in out]; ys = [r['sec'] for r in out]
n = len(xs); mx, my = sum(xs)/n, sum(ys)/n
b = sum((a-mx)*(c-my) for a, c in zip(xs, ys)) / sum((a-mx)**2 for a in xs); a0 = my - b*mx
r = sum((a-mx)*(c-my) for a, c in zip(xs, ys)) / (sum((a-mx)**2 for a in xs) * sum((c-my)**2 for c in ys))**.5
rates = [r_['out']/r_['sec'] for r_ in out]
summary = dict(n=n, slope_s_per_1k_out=round(b*1000, 2), intercept_s=round(a0, 2), pearson_r=round(r, 4),
    tokens_per_s_median=round(statistics.median(rates), 1), tokens_per_s_min=round(min(rates), 1), tokens_per_s_max=round(max(rates), 1),
    out_per_obs=[round(r_['out']/r_['obs'], 1) for r_ in out if r_.get('obs')],
    nonreasoning_out_per_obs=[round((r_['out']-(r_['reasoning'] or 0))/r_['obs'], 1) for r_ in out if r_.get('obs')])
json.dump(dict(summary=summary, rows=out), sys.stdout, indent=1, ensure_ascii=False)
