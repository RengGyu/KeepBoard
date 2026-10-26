"""Offline audit of fixed GT only. Never changes model responses or original images.
Human correspondence: source crops + direct original inspection, not commercial card IDs.
Raw detail/label evidence is separate from usable normalized typed data.
"""
import collections, hashlib, json, pathlib, stat

ROOT = pathlib.Path(__file__).resolve().parent
pre = json.loads((ROOT / 'preflight.json').read_text())
ledger = json.loads((ROOT / 'requests.json').read_text())
card = json.loads((ROOT.parent / 'vision-research-astra/experiment-card.json').read_text())
private = pathlib.Path(pre['privateDir'])
assert len(ledger['requests']) == 6 and ledger['automaticRetries'] == 0
assert [(r['gameId'], r['condition']) for r in ledger['requests']] == [(s['game_id'], s['condition']) for s in card['execution_order']]
assert all(r['status'] == 200 and r['state'] == 'completed' and r['scopeViolations'] == 0 for r in ledger['requests'])
assert ledger['operatingMetadataUnchanged'] and not ledger['temporaryServerListening']
for game in pre['inputs']:
    pair = [r for r in ledger['requests'] if r['gameId'] == game['gameId']]
    assert len({r['requestBodySHA256'] for r in pair}) == 1
    assert len({r['originalSHA256'] for r in pair}) == 1
    assert len({r['promptSHA256'] for r in pair}) == 1

def document(row, suffix):
    p = private / f"{row['sequence']}-{row['gameId']}-{row['condition']}.{suffix}.json"
    assert stat.S_IMODE(p.stat().st_mode) == 0o600
    return json.loads(p.read_text())

def rows_by_field(doc):
    return {a['field']: a['value']['pieces'] for a in doc['assertions']}

def score(expected, actual):
    return 'missing' if actual is None else 'correct' if expected == actual else 'incorrect'

def get(value, key):
    for part in key.split('.'):
        value = value.get(part) if isinstance(value, dict) else None
    return value

detail = []
public = []
for row in ledger['requests']:
    raw = document(row, 'response')['data']
    normalized = document(row, 'normalized')
    rp, np = rows_by_field(raw), rows_by_field(normalized)
    game = next(i for i in card['inputs'] if i['game_id'] == row['gameId'])
    entries = []
    if row['gameId'] == 'splendor':
        # Directly reviewed crops: market index1 top-middle,4 bottom-middle,5 bottom-right.
        targets = {'위 가운데 카드': 1, '아래 가운데 카드': 4, '아래 오른쪽 카드': 5}
        for gt in game['ground_truth']:
            index = targets[gt['target']]
            actual = get(rp['market.scene'][index].get('readout'), gt['field'])
            usable = get(np['market.scene'][index].get('readout'), gt['field'])
            entries.append({**gt, 'fieldKey': 'market.scene', 'pieceIndex': index,
                            'rawObserved': actual, 'normalizedObserved': usable,
                            'rawScore': score(gt['value'], actual), 'normalizedScore': score(gt['value'], usable)})
    elif row['gameId'] == 'sagrada':
        # No typed rows/columns/empty-cell/effect field. Tokens exist in source but
        # are NOT eligible in this pinned owner photo binding; do not invent one.
        unsupported = {'rows', 'columns', 'occupancy', 'printed-effect-paraphrase', 'visible-count'}
        for n, gt in enumerate(game['ground_truth']):
            entry = {**gt}
            if gt['field'] in unsupported:
                entry.update(rawScore='unsupported', normalizedScore='unsupported')
            elif gt['field'] == 'visible-dice-count':
                actual = sum(p['componentId'] == 'dice' for ps in rp.values() for p in ps)
                usable = sum(p['componentId'] == 'dice' for ps in np.values() for p in ps) if np else None
                entry.update(rawObserved=actual, normalizedObserved=usable, rawScore=score(gt['value'], actual), normalizedScore=score(gt['value'], usable), basisNote='Count individually returned dice observations; never expand unknown quantity.')
            else:
                if row['condition'] == 'A':
                    field, index, key = ('private.scene', 0, 'printedName') if n == 9 else ('__photo.owner', {4: 7, 5: 7, 6: 8, 7: 8, 8: 9}[n], gt['field'])
                    piece = rp[field][index]
                    actual = piece['readout']['values'][key]
                    if key == 'observedColor': actual = {'노란색': 'yellow', '초록색': 'green'}.get(actual, actual)
                    usable = None  # Both entire assertions rejected by unchanged normalizer.
                    entry.update(fieldKey=field, pieceIndex=index, rawObserved=actual, normalizedObserved=usable, rawScore=score(gt['value'], actual), normalizedScore='missing')
                else:
                    # No raw readout at all. Labels below were directly inspected;
                    # these are SECONDARY text observations, not fabricated typed values.
                    field, index = ('__photo.owner', {4: 8, 5: 8, 6: 9, 7: 9, 8: 10, 9: 1}[n])
                    observed = {4: 5, 5: 'yellow', 6: 6, 7: 'green', 8: 6, 9: 'GREEN FOCUS'}[n]
                    entry.update(fieldKey=field, pieceIndex=index, rawObserved=None, normalizedObserved=None,
                                 rawScore='missing', normalizedScore='missing', secondaryLabelObserved=observed,
                                 secondaryLabelScore=score(gt['value'], observed))
            entries.append(entry)
    else:
        field = 'hand.scene'; index = 9 if row['condition'] == 'A' else 0
        piece = rp[field][index]
        pair = [3, 6] if row['condition'] == 'A' else [2, 6]
        # Cardinal direction/colour-end relation is absent from this contract.
        # An absent expected digit is a definite mismatch; a present digit alone
        # does not prove which coloured end it belongs to.
        for gt in game['ground_truth'][:2]:
            raw_score = 'incorrect' if gt['value'] not in pair else 'ambiguous'
            entries.append({**gt, 'fieldKey': field, 'pieceIndex': index, 'rawEndPair': pair,
                            'rawScore': raw_score if row['condition'] == 'A' else 'missing',
                            'secondaryLabelScore': raw_score if row['condition'] == 'B' else None,
                            'normalizedScore': 'missing', 'correspondenceNote': 'Explicit foreground anchor + approximate crop; no assumed top/bottom-to-colour-end mapping.'})
        gt = game['ground_truth'][2]
        observed = [5, 10, 2] if row['condition'] == 'A' else [3, 10, 10, 2]
        result = 'missing' if row['condition'] == 'A' else 'incorrect'
        entries.append({**gt, 'rawObserved': observed if row['condition'] == 'A' else None,
                        'secondaryLabelObserved': observed if row['condition'] == 'B' else None,
                        'rawScore': result if row['condition'] == 'A' else 'missing',
                        'secondaryLabelScore': result if row['condition'] == 'B' else None,
                        'normalizedScore': 'missing', 'note': 'Array is one GT item; high has only 3 of 4 stars, none text has 4 but one wrong numeral. No inferred missing token.'})
    all_raw_pieces = [p for ps in rp.values() for p in ps]
    all_np = [p for ps in np.values() for p in ps]
    unknowns = {
        'rawNonNullInferredLevel': sum(get(p.get('readout'), 'level') is not None for p in all_raw_pieces),
        'rawNonNullCanonicalDieColor': sum(get(p.get('readout'), 'values.dieColor') is not None for p in all_raw_pieces),
        'normalizedNonNullCanonicalDieColor': sum(get(p.get('readout'), 'values.dieColor') is not None for p in all_np),
        'rawNonNullCell': sum(get(p.get('readout'), 'values.cell') is not None for p in all_raw_pieces),
        'rawNonNullActiveEnd': sum(get(p.get('readout'), 'values.activeEnd') is not None for p in all_raw_pieces),
        'rawNonNullHandPosition': sum(get(p.get('readout'), 'values.handPosition') is not None for p in all_raw_pieces),
        'rawPlacementPresent': sum('placement' in p for p in all_raw_pieces),
    }
    raw_counts = dict(collections.Counter(e['rawScore'] for e in entries))
    normalized_counts = dict(collections.Counter(e['normalizedScore'] for e in entries))
    detail.append({'sequence': row['sequence'], 'gameId': row['gameId'], 'condition': row['condition'], 'entries': entries, 'unknownAudit': unknowns})
    public.append({'sequence': row['sequence'], 'gameId': row['gameId'], 'condition': row['condition'],
                   'rawTypedGT': raw_counts, 'usableNormalizedTypedGT': normalized_counts,
                   'rawReadoutPieces': sum('readout' in p for p in all_raw_pieces), 'rawPieceCount': len(all_raw_pieces),
                   'normalizedPieceCount': len(all_np), 'unknownAudit': unknowns,
                   'scopeViolations': row['scopeViolations']})

out = private / 'gt-evaluation.private.json'
out.write_text(json.dumps({'method': 'Frozen GT only; manual source correspondence; raw, secondary labels and normalized typed distinguished. Unsupported items excluded, not scored as error or correct.', 'results': detail}, ensure_ascii=False, indent=2)+'\n')
out.chmod(0o600)
artifact_rows=[]
for p in sorted(private.iterdir()):
    if p.name.endswith(('.response.json', '.normalized.json', '.input.json')) or p.name == out.name:
        artifact_rows.append({'file': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'mode': oct(stat.S_IMODE(p.stat().st_mode))})
(ROOT / 'evaluation.json').write_text(json.dumps({'results': public, 'productionEffortChange': False, 'qualityGate': 'FAIL_B_NO_NEW_ERRORS_OR_OMISSIONS', 'privateEvaluationFile': str(out), 'privateArtifacts': artifact_rows}, indent=2)+'\n')
print(json.dumps({'requests': 6, 'retry': 0, 'pairBytesChecks': 3, 'privateArtifacts': len(artifact_rows), 'GT_rows': len(detail), 'publicContainsRawOutput': False}))
