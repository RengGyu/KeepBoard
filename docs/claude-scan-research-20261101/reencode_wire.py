"""Offline serialization counterfactual on 9 stored Terra responses (no model call, no raw content printed).

Same observed information, different wire. Token counts use o200k_base as a proxy tokenizer and are
first calibrated against the provider's reported non-reasoning output tokens for the actual text.
This measures *serialization cost only*; it does not predict what a model would detect with another schema.

Usage: python3 -I reencode_wire.py <private-eval-dir> <repo-root> > wire-reencode.json
"""
import json, sys, pathlib, statistics
import tiktoken

enc = tiktoken.get_encoding('o200k_base')
tok = lambda s: len(enc.encode(s))
dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
priv, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
lat = json.loads((root / 'docs/claude-scan-research-20261101/latency-tokens.json').read_text())['summary']
ms_per_token = lat['slope_s_per_1k_out']  # seconds per 1k output tokens == ms per token
CODES = {'unreadable': 'u', 'occluded': 'o', 'out-of-frame': 'f', 'not-present-unconfirmed': 'n',
         'wrong-face': 'w', 'ambiguous': 'a', 'unsupported': 's'}

def box(b):
    return None if b is None else [round(b['ymin']), round(b['xmin']), round(b['ymax']), round(b['xmax'])]

def sparse(items):  # drop null attribute rows only (same structure otherwise)
    return {'items': [{**i, 'attributes': [a for a in i['attributes'] if a['valueJson'] is not None]} for i in items]}

def keyed(items):  # short keys, array box, values inline, unknown reasons kept as a code map
    out = []
    for i in items:
        row = {'k': i['kind'], 'b': box(i['box_1000']), 'f': i['face'][0], 'q': i['quantity'], 'u': i.get('physicalUnit', 'unknown')[0]}
        v = {a['id']: json.loads(a['valueJson']) for a in i['attributes'] if a['valueJson'] is not None}
        n = {a['id']: CODES.get(a['unknownReason'], 'u') for a in i['attributes'] if a['valueJson'] is None}
        if v: row['v'] = v
        if n: row['n'] = n
        out.append(row)
    return {'items': out}

def columnar(items):  # one header per kind; each object is one positional row; unknown = "~code"
    kinds = {}
    for i in items:
        cols = kinds.setdefault(i['kind'], {'cols': [], 'rows': []})
        for a in i['attributes']:
            if a['id'] not in cols['cols']: cols['cols'].append(a['id'])
    for i in items:
        k = kinds[i['kind']]
        attrs = {a['id']: a for a in i['attributes']}
        vals = []
        for c in k['cols']:
            a = attrs.get(c)
            vals.append(None if a is None else json.loads(a['valueJson']) if a['valueJson'] is not None else '~' + CODES.get(a['unknownReason'], 'u'))
        b = box(i['box_1000']) or [None] * 4
        k['rows'].append(b + [i['face'][0], i['quantity'], i.get('physicalUnit', 'unknown')[0]] + vals)
    return kinds

def tuple_rows(items):  # strict-schema-friendly: fixed item object, per-kind property order given in prompt, values positional
    order = {}
    for i in items:
        cols = order.setdefault(i['kind'], [])
        for a in i['attributes']:
            if a['id'] not in cols: cols.append(a['id'])
    out = []
    for i in items:
        attrs = {a['id']: a for a in i['attributes']}
        vals = [None if c not in attrs else json.loads(attrs[c]['valueJson']) if attrs[c]['valueJson'] is not None else '~' + CODES.get(attrs[c]['unknownReason'], 'u') for c in order[i['kind']]]
        out.append({'k': i['kind'], 'b': box(i['box_1000']), 'f': i['face'][0], 'q': i['quantity'], 'u': i.get('physicalUnit', 'unknown')[0], 'v': vals})
    return {'items': out}

rows = []
for nat in sorted(priv.glob('*-[ABC].native.json')):
    case = nat.name.removesuffix('.native.json')
    d = json.loads(nat.read_text())
    text = ''.join(c['text'] for m in d['output'] if m.get('type') == 'message' for c in m['content'])
    items = json.loads(text)['items']
    u = d['usage']; reasoning = u['output_tokens_details']['reasoning_tokens']; visible = u['output_tokens'] - reasoning
    enc_tokens = {'actual': tok(text), 'sparse': tok(dump(sparse(items))), 'keyed': tok(dump(keyed(items))), 'columnar': tok(dump(columnar(items))), 'tupleRows': tok(dump(tuple_rows(items)))}
    rows.append({'case': case, 'items': len(items), 'reportedVisibleOutput': visible, 'reasoning': reasoning,
                 'proxyActual': enc_tokens['actual'], 'proxyCalibration': round(enc_tokens['actual'] / visible, 3),
                 'proxyTokens': enc_tokens,
                 'perItem': {k: round(v / len(items), 1) for k, v in enc_tokens.items()},
                 'visibleReductionVsActual': {k: round(1 - v / enc_tokens['actual'], 3) for k, v in enc_tokens.items() if k != 'actual'},
                 'estimatedSecondsAtMeasuredRate': {k: round((reasoning + v * visible / enc_tokens['actual']) * ms_per_token / 1000 + lat['intercept_s'], 1) for k, v in enc_tokens.items()}})
summary = {'calibrationRatioProxyOverReported': [r['proxyCalibration'] for r in rows],
           'medianReduction': {k: round(statistics.median(r['visibleReductionVsActual'][k] for r in rows), 3) for k in ('sparse', 'keyed', 'tupleRows', 'columnar')},
           'medianPerItemTokens': {k: round(statistics.median(r['perItem'][k] for r in rows), 1) for k in ('actual', 'sparse', 'keyed', 'tupleRows', 'columnar')},
           'limits': ['Proxy tokenizer o200k_base, calibrated per response against reported visible output tokens.',
                      'Reasoning tokens held fixed; a different schema may change reasoning, detection count and accuracy.',
                      'Estimated seconds use the 38-call linear fit; they are not a measurement of the compact schema.']}
json.dump({'version': 'claude-wire-reencode-v1', 'modelCalls': 0, 'summary': summary, 'rows': rows}, sys.stdout, indent=1, ensure_ascii=False)
