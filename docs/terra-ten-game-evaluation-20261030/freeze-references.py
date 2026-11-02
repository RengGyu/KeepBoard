"""Offline, pre-output partial reference freeze. Never changes earlier references."""
import json, hashlib
from pathlib import Path
from datetime import datetime, timezone

OUT = Path(__file__).parent
selection = json.loads((OUT / 'selection.json').read_text())
private = Path(selection['privateDir'])
assert not (OUT / 'evaluation-preflight.json').exists()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
sources = [Path('docs/twenty-games-pack-study-20261029') / f'references-sol{i}.json' for i in [1, 2]]
old = {c['gameId']: (c, f) for f in sources for c in json.loads(f.read_text())['cases']}
history = json.loads(Path('docs/terra-accuracy-20261030/plan-heldout.json').read_text())
history_ids = {c.get('gameId') for c in history['calls']}
rows = []
for c in selection['cases']:
    game = c['gameId']
    previous, source = old[game]
    objects = []
    for o in previous['objects']:
        attrs = o.get('attributes', o.get('readableAttributes', {}))
        attrs = {k: v for k, v in attrs.items() if v is not None and o.get('attributeScorable', {}).get(k, True)}
        # These two small words are not independently secure. Earlier labels stay unchanged.
        if game == 'codenames' and o['id'] in ['grid-r3c1', 'grid-r5c5']:
            attrs.pop('word', None)
        objects.append({'id': o['id'], 'componentId': o.get('componentId', o.get('canonicalKind')),
                        'boxPx': o.get('boxPx', o.get('bboxPx')), 'attributes': attrs,
                        'scorableKind': o.get('scorableKind', True),
                        'referenceConfidence': o.get('confidence', 'earlier-AI-partial'),
                        'editableExpected': True})
    if game == 'rummikub':
        # Independently read the six clearly visible foreground rack faces, not table labels.
        tiles = [('rack-blue13', [213,528,281,618], 13, 'blue'),
                 ('rack-black13', [323,550,393,633], 13, 'black'),
                 ('rack-black11', [55,579,119,661], 11, 'black'),
                 ('rack-yellow3', [163,598,227,680], 3, None),
                 ('rack-blue3', [265,623,331,707], 3, 'blue'),
                 ('rack-red8', [428,651,504,737], 8, 'red')]
        objects = [{'id': i, 'componentId': 'numbers', 'boxPx': b,
                    'attributes': {'number': n, 'face': 'front', **({'color': color} if color else {})},
                    'scorableKind': True, 'referenceConfidence': 'Astra-direct-visible',
                    'editableExpected': True} for i,b,n,color in tiles]
        objects.append({'id': 'foreground-rack', 'componentId': 'racks', 'boxPx': [0,485,630,790],
                        'attributes': {}, 'scorableKind': True,
                        'referenceConfidence': 'Astra-direct-visible', 'editableExpected': False})
    x,y,x2,y2 = c['roiPx']
    for o in objects:
        a,b,a2,b2 = o['boxPx']
        o['roiRelation'] = 'full' if a >= x and b >= y and a2 <= x2 and b2 <= y2 else ('clipped' if a2 > x and b2 > y and a < x2 and b < y2 else 'outside')
    limitations = list(previous.get('limitations', previous.get('uncertainExclusions', [])))
    if game == 'rummikub':
        limitations = ['New partial rack reference, not earlier public-table denominator; six distinguishable faces only.',
                       'Yellow third tile color is not in runtime red/blue/black/orange enum: color unscored, never relabeled orange.',
                       'Small partly hidden upper rack tile fragments excluded; no hidden count inferred.',
                       'Rack is an observed container, intentionally not an editable number tile.']
    if game == 'blokus':
        limitations.append('Only two distinguishable reserve pieces are scored, not the densely occupied board. Both continue to source-image edge; exact full shape unknown.')
    data = {'gameId': game, 'sourceSHA': c['sourceSHA'], 'roiPx': c['roiPx'], 'areaId': c['areaId'],
            'partition': c['partition'], 'ownerId': c['ownerId'], 'objects': objects,
            'referenceKind': 'AI partial visual reference; Astra inspected original before new outputs, not human-certified truth',
            'earlierReferenceSHA': sha(source), 'earlierReferenceUnchanged': True,
            'limitations': limitations,
            'policy': 'Visible object envelopes only. Unknown/hidden properties not in denominator. No GT enters requests.'}
    f = private / (game + '.reference.json')
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n'); f.chmod(0o600)
    full = [o for o in objects if o['roiRelation'] == 'full']
    rows.append({'gameId': game, 'referencePath': str(f), 'referenceSHA': sha(f),
                 'sourceReferenceSHA': sha(source), 'newRackReference': game == 'rummikub',
                 'roiPartitions': {k: sum(o['roiRelation'] == k for o in objects) for k in ['full','clipped','outside']},
                 'fullEditableDenominator': sum(o['editableExpected'] for o in full),
                 'readableAttributes': sum(len(o['attributes']) for o in full),
                 'numericDenominator': sum(isinstance(v, (int,float)) and not isinstance(v,bool) for o in full for v in o['attributes'].values()),
                 'priorTerraExposure': game in history_ids or game in ['quacks'],
                 'priorGeminiExposure': True, 'newModelOutputsRead': False})
report = {'frozenAt': datetime.now(timezone.utc).isoformat(), 'beforeNewOutputs': True,
          'selectionSHA': sha(OUT / 'selection.json'), 'maxProviderCalls': 20,
          'matching': 'geometry-only reciprocal unique maximum IoU >= 0.25; individual physicalUnit single or quantity 1 without contradiction. No values/kind-assisted matching. Threshold measures correspondence, not calibrated confidence.',
          'mainDenominator': 'same fixed full-ROI reference subset for whole, ROI and final fusion; clipped/outside separately',
          'textPolicy': 'exact text equality diagnostic; differing non-null free text remains observed-unjudged, not automatically an error; unknown/missing separate',
          'nativeRackContainer': 'raw object recall includes rack; editable recall intentionally excludes rack, because runtime preserves it only as receipt',
          'rows': rows}
(OUT/'evaluation-preflight.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'referenceGames':len(rows),'fullObjects':sum(r['roiPartitions']['full'] for r in rows),'fullEditable':sum(r['fullEditableDenominator'] for r in rows),'numeric':sum(r['numericDenominator'] for r in rows),'providerCalls':0}))
