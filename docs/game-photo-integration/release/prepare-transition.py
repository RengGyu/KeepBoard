from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[3];O=R/'docs/game-photo-integration/release';m=json.loads((O.parent/'source-manifest.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
old={str(p.relative_to(R/'dist')):sha(p) for p in (R/'dist').rglob('*') if p.is_file()};new={p.removeprefix('dist/'):h for p,h in m['dist'].items()};delta=[]
for p in sorted(set(old)|set(new)):
 if old.get(p)==new.get(p):continue
 delta.append({'path':'dist/'+p,'beforeSHA256':old.get(p),'afterSHA256':new.get(p)})
 for folder,src,h in [('dist-before',R/'dist'/p,old.get(p)),('dist-after',Path(m['validatedDistRoot'])/p,new.get(p))]:
  if h is None:continue
  dest=O/'transition'/folder/p;dest.parent.mkdir(parents=True,exist_ok=True)
  if dest.exists():assert sha(dest)==h
  else:shutil.copy2(src,dest)
  assert sha(dest)==h
assert len(delta)==3
(O/'local-dist-before.json').write_text(json.dumps(old,indent=2)+'\n');receipt=json.loads((O/'transition-manifest.json').read_text());receipt.update(distFiles=delta,distUnchanged=len(set(old)&set(new))-sum(p in old and p in new and old[p]!=new[p] for p in set(old)&set(new)),distWritesExecuted=False)
(O/'transition-manifest.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'sourceFiles':27,'existingRestore':15,'newAbsentBefore':12,'localDistDelta':delta,'existingDistBackupFiles':sum(x['beforeSHA256'] is not None for x in delta),'StoreBackupOrRestore':False}))
