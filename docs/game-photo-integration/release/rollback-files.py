"""Narrow release-file rollback; defaults to validation only. Never touches Store."""
from pathlib import Path
import json,hashlib,shutil,sys
O=Path(__file__).resolve().parent; R=O.parents[2]; t=json.loads((O/'transition-manifest.json').read_text())
assert sys.argv[1:] in [[],['--apply']]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
for c in t['files']+t['distFiles']:
 p=Path(c['path']); assert not p.is_absolute() and '..' not in p.parts
 assert sha(R/p)==c['afterSHA256'],'Current release file changed; do not overwrite: '+str(p)
 if c['beforeSHA256']:
  base=O/'transition/dist-before' if str(p).startswith('dist/') else Path(t['rollback'])
  rel=Path(str(p).removeprefix('dist/')) if str(p).startswith('dist/') else p
  assert sha(base/rel)==c['beforeSHA256']
if sys.argv[1:]==['--apply']:
 for c in t['files']+t['distFiles']:
  p=Path(c['path']);dest=R/p
  if c['beforeSHA256']:
   base=O/'transition/dist-before' if str(p).startswith('dist/') else Path(t['rollback'])
   rel=Path(str(p).removeprefix('dist/')) if str(p).startswith('dist/') else p
   dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(base/rel,dest)
  else:
   assert sha(dest)==c['afterSHA256'];dest.unlink()
 assert all(sha(R/c['path'])==c['beforeSHA256'] for c in t['files']+t['distFiles'])
print(json.dumps({'mode':'APPLIED' if sys.argv[1:] else 'CHECK_ONLY','sourceRestore':15,'newSourceRemove':12,'distDeltaReverse':3,'StoreTouched':False,'processesTouched':False}))
