"""Approved release only: validate all preimages, apply 27 source/3 dist deltas."""
from pathlib import Path
import json, hashlib, shutil, subprocess, sys, datetime
O=Path(__file__).resolve().parent; R=O.parents[2]; D=O.parent
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
subprocess.run([sys.executable,str(O/'verify-ready.py')],check=True)
m=json.loads((D/'source-manifest.json').read_text()); t=json.loads((O/'transition-manifest.json').read_text())
assert len(t['files'])==27 and len(t['distFiles'])==3
for c in t['files']+t['distFiles']:
 p=Path(c['path']); assert not p.is_absolute() and '..' not in p.parts
 assert sha(R/p)==c['beforeSHA256'],str(p)
 if c['afterSHA256']:
  base=Path(t['payload']) if not str(p).startswith('dist/') else O/'transition/dist-after'
  rel=Path(str(p).removeprefix('dist/')) if str(p).startswith('dist/') else p
  assert sha(base/rel)==c['afterSHA256'],str(p)
for c in t['files']+t['distFiles']:
 p=Path(c['path']); dest=R/p
 if c['afterSHA256']:
  base=Path(t['payload']) if not str(p).startswith('dist/') else O/'transition/dist-after'
  rel=Path(str(p).removeprefix('dist/')) if str(p).startswith('dist/') else p
  dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(base/rel,dest)
 else:
  assert sha(dest)==c['beforeSHA256']; dest.unlink()
assert all(sha(R/p)==h for p,h in m['files'].items())
expected={p.removeprefix('dist/'):h for p,h in m['dist'].items()}
actual={p.relative_to(R/'dist').as_posix():sha(p) for p in (R/'dist').rglob('*') if p.is_file()}
assert actual==expected
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'APPLIED_EXACT',
 'sourceDigest':m['fullSourceDigest'],'patchSHA256':m['patchSHA256'],'sourceFilesApplied':27,
 'sourcePathsVerified':len(m['files']),'distDeltaCount':3,'distFilesVerified':len(actual),
 'unrelatedBaselineDrift':[],'StoreWrites':0,'realAIcalls':0}
(O/'applied.json').write_text(json.dumps(result,indent=2)+'\n'); print(json.dumps(result))
