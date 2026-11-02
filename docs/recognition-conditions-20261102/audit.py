"""Structural condition audit only; does not certify 120 physical editions or rulebooks."""
import json, hashlib
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
baseline = json.loads((OUT / 'baseline.json').read_text())
before = json.loads((Path(baseline['preimageRoot']) / 'game-photo-definitions/index.json').read_text())
after = json.loads((ROOT / 'game-photo-definitions/index.json').read_text())
old = {(g['gameId'], c['id'], p['id']): p for g in before['games'] for c in g['components'] for p in c['properties']}
corrections = json.loads((OUT / 'condition-corrections.json').read_text())['corrections']
reviewed = {(c['gameId'], c['componentId'], c['propertyId']) for c in corrections}
catalogs = {}
for path in (ROOT / 'shared/readouts/catalogs').glob('*.json'):
    catalogs.update(json.loads(path.read_text()))
games, changes, errors = [], [], []
for game in after['games']:
    rows = []
    for component in game['components']:
        has_face = any(p['id'] == 'face' for p in component['properties'])
        for p in component['properties']:
            key = (game['gameId'], component['id'], p['id'])
            previous = old[key]
            if p.get('faceOnly') and not has_face:
                errors.append({'gameId':game['gameId'], 'componentId':component['id'], 'propertyId':p['id'], 'error':'front-only field has no face domain'})
            category = ('physical-outline' if p['id'] == 'shape' else 'currently-visible-side') if key in reviewed else (
                'physical-container-form' if key == ('catan','container','variant') else
                'front-only-preserved' if p.get('faceOnly') else 'visible-without-front-gate-preserved')
            pending = None
            if p.get('faceOnly') and p['id'] in {'tileColor','color','connectorShape'}:
                pending = '앞면 인쇄 색/연결구인지 물리 몸체 특성인지 구조명만으로 판별하지 않음. 기존 제한 유지; 판본 실물 검증 미수행.'
            row = {'componentId':component['id'], 'propertyId':p['id'], 'label':p['label'], 'type':p['type'],
                   'faceOnlyBefore':previous.get('faceOnly',False), 'faceOnlyAfter':p.get('faceOnly',False),
                   'classification':category, 'sourceText':p['sourceText'],
                   'occlusion':'Explicit unknown/occluded stays null; absence of front gate never supplies an unseen value.',
                   'reviewPending':pending}
            rows.append(row)
            if previous != p:
                assert {k:v for k,v in previous.items() if k!='faceOnly'} == {k:v for k,v in p.items() if k!='faceOnly'}
                changes.append({'gameId':game['gameId'], 'componentId':component['id'], 'propertyId':p['id']})
    old_game = next(g for g in before['games'] if g['gameId']==game['gameId'])
    assert {k:v for k,v in game.items() if k not in ['components','definitionSHA']} == {k:v for k,v in old_game.items() if k not in ['components','definitionSHA']}
    games.append({'gameId':game['gameId'], 'editionId':game['editionId'], 'sourceSHA':game['sourceSHA'],
                  'componentCount':len(game['components']), 'visiblePropertyCount':len(rows),
                  'manualPropertyCount':sum(len(c['manualPropertyIds']) for c in game['components']), 'properties':rows})
rows = [p for g in games for p in g['properties']]
report = {'version':'recognition-conditions-audit-v1', 'scope':'All current definition fields and source/decoder conditions, not physical-edition certification.',
          'counts':{'games':len(games), 'components':sum(g['componentCount'] for g in games), 'visibleProperties':len(rows),
                    'faceOnlyBefore':sum(p['faceOnlyBefore'] for p in rows), 'faceOnlyAfter':sum(p['faceOnlyAfter'] for p in rows),
                    'correctedProperties':len(changes), 'reviewPendingProperties':sum(p['reviewPending'] is not None for p in rows),
                    'classifications':dict(Counter(p['classification'] for p in rows))},
          'decoderChecks':{'frontOnlyWithMissingFace':errors,
            'unknown':'validateObservationResult/decodeLiteralObservationPayload preserve explicit unknown reason and null, including occluded.',
            'missingProperty':'decoder creates unknown; no standard inventory fill for generic/partial observations.',
            'physicalOutline':'no front gate after correction; actual visibility still required.',
            'manualPrivacy':'manualPropertyIds/areas/partitions/field domains unchanged.'},
          'indexBeforeSHA':hashlib.sha256((Path(baseline['preimageRoot'])/'game-photo-definitions/index.json').read_bytes()).hexdigest(),
          'indexAfterSHA':hashlib.sha256((ROOT/'game-photo-definitions/index.json').read_bytes()).hexdigest(),
          'changes':changes, 'games':games}
assert len(games)==120 and len(rows)==1363 and len(changes)==16 and not errors
(OUT/'audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report['counts'],ensure_ascii=False))
