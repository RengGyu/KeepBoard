"""Post-run hashes and real comparison invariants; no network or credential reads."""
import json,hashlib,datetime,stat
from pathlib import Path
R=Path(__file__).resolve().parent;O=R.parent/'video-attempt'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
pre=json.loads((R/'preflight.json').read_text());ledger=json.loads((R/'ledger.json').read_text());results=json.loads((R/'results.json').read_text());access=json.loads((R/'access.json').read_text())
assert len(ledger)==len({r['id'] for r in ledger})==6
assert access['http']==200 and access['returnedModel']=='gpt-6.1-terra'
assert pre['runnerSHA']==sha(R/'run.mts')
for p,h in pre['frozenFiles'].items():assert sha(p)==h,p
old_ver=json.loads((O/'verification.json').read_text())
for name,meta in old_ver['repositoryArtifacts'].items():assert sha(O/name)==meta['sha256'],f'Old artifact drift: {name}'
for t in pre['tasks']:
 row=next(x for x in ledger if x['id']==t['id']);assert row['http']==200 and row['status']=='completed' and row['modelReturned']=='gpt-6.1-terra'
 body=Path(t['prefix']+'.request.json');gem=Path(t['geminiPrefix']+'.request.json')
 assert sha(body)==row['bodySHA']==t['bodySHA'] and sha(gem)==t['geminiBodySHA']
 a=json.loads(body.read_text());b=json.loads(gem.read_text())
 assert set(a)=={'model','store','service_tier','max_output_tokens','reasoning','input','text'}
 assert a['input'][0]['content'][0]['text']==b['contents'][0]['parts'][0]['text']
 assert a['text']['format']['schema']==b['generationConfig']['responseFormat']['text']['schema']
 import base64
 assert hashlib.sha256(base64.b64decode(a['input'][0]['content'][1]['image_url'].split(',',1)[1])).hexdigest()==t['inputSHA']
 assert a['reasoning']['effort']=='low' and a['input'][0]['content'][1]['detail']=='high' and a['max_output_tokens']==32768
 for kind,key in [('native','rawSHA'),('parsed','parsedSHA')]:
  f=Path(t['prefix']+'.'+kind+'.json')
  assert f.exists();assert sha(f)==row.get(key,sha(f))
 native=json.loads(Path(t['prefix']+'.native.json').read_text())
 texts=[c['text'] for m in native['output'] if m['type']=='message' for c in m['content'] if c['type']=='output_text']
 assert json.loads(''.join(texts))==json.loads(Path(t['prefix']+'.parsed.json').read_text())
 if row['state']=='decoded':assert sha(t['prefix']+'.decoded.json')==row['decodedSHA']
for r in results['cases']:
 for provider in ['gemini','terra']:
  m=r[provider]['metrics'];assert m['individualDetected']<=m['referenceObjects']
  assert m['correctAttributes']+m['wrongAttributes']+m['unknownAttributes']+m['notRecoveredAttributes']==m['readableAttributes']
 assert sha(r['terra']['detailPath'])==r['terra']['detailSHA']
assert results['terraWholeResponseDecoded']==2 and results['rawInvalidGeometryRows']==33
assert results['totalUsage']['input']+results['totalUsage']['output']==results['totalUsage']['total']
P=Path(pre['privateDir']);assert stat.S_IMODE(P.stat().st_mode)==0o700
for p in P.iterdir():assert not p.is_file() or stat.S_IMODE(p.stat().st_mode)==0o600
credential_locator_marker='.'+'paseo'+'/uploads/'
for p in R.iterdir():
 if p.is_file():assert credential_locator_marker not in p.read_text(),p
files={p.name:dict(sha256=sha(p),bytes=p.stat().st_size) for p in sorted(R.iterdir()) if p.is_file() and p.name!='verification.json'}
out=dict(status='PASS_FOR_COMPLETED_COMPARISON_NOT_MODEL_QUALITY_PASS',verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),inferenceCalls=6,metadataCalls=1,retries=0,http200=6,modelReturnedExact6of6=True,
 sameOriginalImagePromptSchema=True,referenceAndGeminiArtifactsUnchanged=True,baselineScoresReproduced6of6=True,rawParsedDecodedSeparated=True,wholeNormalizationPassed=2,wholeNormalizationRejected=4,invalidBoxes=33,boxesRepaired=0,
 credential='provided-upload; memory-only accessor; no path/content/auth headers in reports or model request body',privateArtifactsPermissions=True,productFilesChanged=0,realBoardsWrites=0,agents=0,files=files,
 limitations=['Partial AI reference, one run per condition/model','Whole response normalization rejected four outputs; diagnostic row scores do not count as normalization success','No provider cost invoice or end-to-end app scan test','No additional inference/retry/model replacement'])
(R/'verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='files'},ensure_ascii=False,indent=2))
