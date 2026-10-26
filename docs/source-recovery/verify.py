#!/usr/bin/env python3
"""Offline evidence/identity integrity checks. Does not verify game-rule truth.
Reads only declared inputs/research artifacts and writes verification.json here.
"""
import collections
import datetime
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parent
project=root.parents[1]
errors=[]
hash_count=0

def check(ok,message):
    if not ok:errors.append(message)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

baseline=json.loads((root/'input-hashes.json').read_text())
changed=[]
for row in baseline['files']:
    p=project/row['path']
    if not p.exists() or sha(p)!=row['sha256']:changed.append(row['path'])
check(not changed,'Frozen input hash mismatch: '+str(changed))

manifest=json.loads((project/'docs/game-essentials/manifest.json').read_text())
review=json.loads((project/'docs/game-state-review/games.json').read_text())
review_map={g['game_id']:g for g in review['rows']}
expected={}
for gi,g in enumerate(manifest['games']):
    for i,f in enumerate(g['review_findings']):
        if f['result']=='UNCLEAR':
            key=f"{g['game_id']}:review:{i+1:02d}"
            expected[key]=(gi,i,f)

cases=json.loads((root/'cases.json').read_text())
items=cases['items'];byid={i['item_id']:i for i in items}
check(len(items)==50 and len(byid)==50,'Expected exactly50 unique item IDs')
check(set(byid)==set(expected),'Mismatch with frozen UNCLEAR ID set')
for key,i in byid.items():
    if key not in expected:continue
    gi,fi,f=expected[key]
    check(i['item']==f['item'],key+': original text mismatch')
    check(i['original_ordinal']==fi+1,key+': original ordinal mismatch')
    check(i['original_status']=='UNCLEAR',key+': original status overwritten')
    check(i['item_sha256']==hashlib.sha256(i['item'].encode()).hexdigest(),key+': item hash mismatch')
    check(i['original_evidence']==f['evidence'],key+': original evidence mismatch')
    check(i['original_type']==f['type'],key+': original type mismatch')
    check(i['upstream_item_id'] is None,key+': invented upstream ID')
    check(i['input_refs'][0]==f'docs/game-essentials/manifest.json#/games/{gi}/review_findings/{fi}',key+': input pointer mismatch')
    original=review_map[i['game_id']]['findings'][fi]
    check(all(original[k]==f[k] for k in ['item','type','evidence','importance']),key+': independent review mapping mismatch')
counts=dict(collections.Counter(i['primary_cause'] for i in items))
check(counts==cases['counts']['primary_causes'],'Primary cause count mismatch')
check(sum(counts.values())==50,'Primary count sum mismatch')
check(len(set(i['game_id'] for i in items))==42,'Game count mismatch')
check(dict(collections.Counter(i['original_evidence'] for i in items))==cases['counts']['original_evidence'],'Original evidence count mismatch')
check(sum(i['research_result']=='SCOPED_HANDOFF_READY' for i in items)==4,'Ready item count mismatch')
check(sum(i['research_result']=='HOLD_AFTER_SCOPED_REVIEW' for i in items)==4,'Hold item count mismatch')
check(sum(i['research_result']=='NOT_RETESTED' for i in items)==42,'Not retested item count mismatch')

evidence=json.loads((root/'evidence.json').read_text())
sources={s['source_id']:s for s in evidence['sources']}
representatives=json.loads((root/'representative-cases.json').read_text())
check(representatives==cases['representative_cases'],'Representative copies disagree')
check(len(representatives)==5,'Expected5 representative cases')
represented=[]
for c in representatives:
    check(set(c['source_ids'])<=set(sources),c['case_id']+': missing source')
    for item in c['item_ids']:
        represented.append(item)
        check(item in byid,c['case_id']+': missing item')
        check(byid[item]['representative_case_id']==c['case_id'],item+': wrong case')
    check(c['upstream_applied'] is False,c['case_id']+': source unexpectedly applied')
check(len(represented)==8 and len(set(represented))==8,'Expected8 unique representative items')

def verify_artifact(a):
    global hash_count
    p=root/a['path']
    check(p.is_relative_to(root),'Artifact path outside research root')
    check(p.exists(),'Missing artifact: '+a['path'])
    if p.exists():
        check(p.stat().st_size==a['bytes'],'Size mismatch: '+a['path'])
        check(sha(p)==a['sha256'],'SHA256 mismatch: '+a['path'])
        hash_count+=1

pdfs=[]
for s in sources.values():
    if 'artifact' in s:
        verify_artifact(s['artifact'])
        if s['format']=='application/pdf':
            p=root/s['artifact']['path'];pdfs.append(p.name)
            check(p.read_bytes().startswith(b'%PDF-'),'Invalid PDF magic: '+p.name)
            check(s['metadata']['page_count']>0,'Missing decoded page count: '+p.name)
    for page in s.get('visually_reviewed_pages',[]):verify_artifact(page['artifact'])
check(len(pdfs)==7,'Expected7 decoded official PDFs')

retained_downloads=[]
for r in evidence['retrieval_attempts']:
    if r.get('result')!='DOWNLOADED':continue
    if r.get('retained') is False:continue
    if r.get('local_path'):
        verify_artifact({'path':r['local_path'],'bytes':r['bytes'],'sha256':r['sha256']})
        retained_downloads.append(r['local_path'])

result={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'result':'PASS' if not errors else 'FAIL','exit_code':0 if not errors else 1,
        'input_files_checked':len(baseline['files']),'input_hash_mismatches':changed,
        'upstream_50_items_match':set(byid)==set(expected),'primary_counts':counts,
        'representative_cases':len(representatives),'representative_items':len(set(represented)),
        'decoded_pdf_files':pdfs,'artifact_hash_checks':hash_count,
        'rule_fact_accuracy_automatically_verified':False,
        'product_files_written_by_this_research':0,
        'product_write_evidence':'이 연구의 쓰기 대상은 docs/source-recovery 내부뿐이다. 제품 전체의 기존/동시 변경을 검증했다는 주장은 아니다.',
        'errors':errors}
(root/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(result['exit_code'])
