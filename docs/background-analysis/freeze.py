from pathlib import Path
import hashlib,json,difflib
D=Path(__file__).resolve().parent;repo=D.parents[1];baseline=json.loads((D/'baseline.json').read_text());app=Path(baseline['isolation'])
sha=lambda b:hashlib.sha256(b).hexdigest()
base=baseline['files'];current={k:sha((app/k).read_bytes()) for k in base}
for folder in ['shared','server','src','tests']:
 for p in (app/folder).rglob('*'):
  if p.is_file():current[p.relative_to(app).as_posix()]=sha(p.read_bytes())
changed=sorted(k for k,v in current.items() if base.get(k)!=v);drift=[k for k,v in base.items() if not (repo/k).exists() or sha((repo/k).read_bytes())!=v]
entries=[];patch=[]
for k in changed:
 before=(repo/k).read_text() if k in base else '';after=(app/k).read_text();entries.append({'path':k,'beforeSHA256':base.get(k),'afterSHA256':current[k]});patch.extend(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+k if k in base else '/dev/null',tofile='b/'+k))
(D/'integrated.patch').write_text(''.join(patch))
assets={p.relative_to(app).as_posix():sha(p.read_bytes()) for p in (app/'dist').glob('assets/index-*')};assets['dist/index.html']=sha((app/'dist/index.html').read_bytes())
digest=sha(json.dumps(current,sort_keys=True,separators=(',',':')).encode())
manifest={'isolation':str(app),'baseDigest':baseline['digest'],'fullSourceDigest':digest,'digestAlgorithm':'sha256(JSON.stringify-equivalent sorted compact path→sha256 map)','files':current,'changed':entries,'sharedBaseDrift':drift,'patchSHA256':sha((D/'integrated.patch').read_bytes()),'dist':assets}
(D/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'changedFiles':len(changed),'sourceFiles':len(current),'sourceDigest':digest,'sharedBaseDriftCount':len(drift),'assets':assets,'changed':changed},ensure_ascii=False,indent=2))
