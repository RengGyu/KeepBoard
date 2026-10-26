from pathlib import Path
import json,hashlib,difflib,zipfile
ROOT=Path(__file__).resolve().parents[3];D=ROOT/'docs/game-readouts-117/integration';a=Path(json.loads((D/'paths.json').read_text())['isolated']);base=json.loads((D/'baseline.json').read_text());external=Path(json.loads((D/'paths.json').read_text())['extract']);rows=[];patch=[];drift=[]
for r,h in base['files'].items():
 if hashlib.sha256((ROOT/r).read_bytes()).hexdigest()!=h:drift.append(r)
assert not drift,drift
productRoots=['src','shared','server','tests','tools/readouts'];files=set()
for top in productRoots:
 for p in (a/top).rglob('*'):
  if p.is_file() and p.suffix not in ['.pyc'] and '__pycache__' not in p.parts:files.add(p.relative_to(a).as_posix())
for r in sorted(files):
 p=a/r;old=(ROOT/r).read_bytes() if r in base['files'] else None;new=p.read_bytes()
 if old==new:continue
 if old is None and (ROOT/r).exists():raise RuntimeError('new file now conflicts '+r)
 rows.append({'path':r,'change':'add' if old is None else 'modify','beforeSHA':hashlib.sha256(old).hexdigest() if old is not None else None,'afterSHA':hashlib.sha256(new).hexdigest(),'bytes':len(new),'externalModified':(external/'files'/r).exists() and (external/'files'/r).read_bytes()!=new})
 for line in difflib.unified_diff((old or b'').decode().splitlines(True),new.decode().splitlines(True),fromfile='a/'+r if old is not None else '/dev/null',tofile='b/'+r):
  patch.append(line if line.endswith('\n') else line+'\n\\ No newline at end of file\n')
(D/'integrated.patch').write_text(''.join(patch));combined=dict(base['files']);combined.update({r['path']:r['afterSHA'] for r in rows});fullDigest=hashlib.sha256(json.dumps(combined,sort_keys=True).encode()).hexdigest();manifest={'sourceOnly':True,'isolation':str(a),'baseDigest':base['digest'],'fullSourceDigest':fullDigest,'sharedSourceDrift':drift,'files':rows,'digest':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()};(D/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(D/'integrated-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for r in rows:z.write(a/r['path'],'files/'+r['path'])
 z.write(D/'source-manifest.json','source-manifest.json');z.write(D/'integrated.patch','integrated.patch')
print(json.dumps({'changedFiles':len(rows),'modified':sum(r['change']=='modify' for r in rows),'added':sum(r['change']=='add' for r in rows),'postExternalChanges':[r['path'] for r in rows if r['externalModified']],'sharedDrift':len(drift),'digest':manifest['digest']},ensure_ascii=False))
