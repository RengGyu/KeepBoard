"""Allowlisted runtime snapshot only. Never reads Store, env, local gateway config or keys."""
from pathlib import Path
import tempfile,json,hashlib,shutil,tarfile,datetime
R=Path(__file__).resolve().parents[2];O=R/'docs/cloud-deployment'
m=json.loads((R/'docs/game-photo-integration/source-manifest.json').read_text());assert m['fullSourceDigest']=='c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
target=Path(tempfile.mkdtemp(prefix='keepboard-cloud-prep-'))/'app';target.mkdir()
files={p:h for p,h in m['files'].items() if p.startswith(('server/','shared/','gamepacks/','gateway/','public/')) or p in ['package.json','package-lock.json','tsconfig.json']}
for rel,h in files.items():
 p=R/rel;assert not p.is_symlink() and sha(p)==h,rel
 dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for rel,h in m['dist'].items():
 if rel.endswith('.zip'):continue
 p=R/rel;assert sha(p)==h;dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);files[rel]=h
for p in (O/'prepared').iterdir():
 assert p.is_file() and not p.is_symlink()
 rel='deploy/'+p.name;dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);files[rel]=sha(dest)
shutil.copy2(O/'prepared/Dockerfile',target/'Dockerfile');files['Dockerfile']=sha(target/'Dockerfile')
shutil.copy2(O/'prepared/.dockerignore',target/'.dockerignore');files['.dockerignore']=sha(target/'.dockerignore')
assert not any(any(x in ['.keepboard','.local','.env','.git','node_modules','uploads','research'] for x in Path(p).parts) for p in files)
assert set(files)=={p.relative_to(target).as_posix() for p in target.rglob('*') if p.is_file()}
artifact=O/'keepboard-cloud-runtime.tgz'
with tarfile.open(artifact,'w:gz') as tar:
 for rel in sorted(files):tar.add(target/rel,arcname='app/'+rel,recursive=False)
manifest={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parentSourceDigest':m['fullSourceDigest'],'snapshot':str(target),'files':files,'runtimeDigest':hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'artifact':str(artifact),'artifactSHA256':sha(artifact),'artifactBytes':artifact.stat().st_size,'fileCount':len(files),'operatingDataReads':0,'productWrites':0,'resourcesCreated':0,'realAIcalls':0}
(O/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:v for k,v in manifest.items() if k!='files'}))
