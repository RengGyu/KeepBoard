"""Opaque local backup/hash comparison. Never prints file names or contents."""
from pathlib import Path
import hashlib,json,os,sys,tempfile,datetime
D=Path(__file__).parent
root=Path('/tmp/keepboard-preview/data')
def digest(b):return hashlib.sha256(b).hexdigest()
def files():
 out={}
 for p in sorted(root.rglob('*')):
  if p.is_symlink():raise RuntimeError('Store symlink needs explicit handling')
  if p.is_file():out[p.relative_to(root).as_posix()]=p.read_bytes()
 return out
if sys.argv[1]=='before':
 assert root.is_dir()
 backup=Path(tempfile.mkdtemp(prefix='keepboard-integrated-backup-',dir='/private/tmp'));os.chmod(backup,0o700)
 records={};mapping={}
 for rel,body in files().items():
  opaque=digest(rel.encode());p=backup/opaque;p.write_bytes(body);os.chmod(p,0o600)
  records[opaque]=digest(body);mapping[opaque]=rel
 index=backup/'restore-index.json';index.write_text(json.dumps(mapping));os.chmod(index,0o600)
 report={'root':str(root),'backup':str(backup),'backupMode':'0700','files':records,'count':len(records),'time':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (D/'operations-before.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'backup':str(backup),'files':len(records),'contentPrinted':False}))
else:
 before=json.loads((D/'operations-before.json').read_text());current={digest(k.encode()):digest(v) for k,v in files().items()}
 old=before['files'];changed=[k for k,h in old.items() if k in current and current[k]!=h];missing=[k for k in old if k not in current];added=[k for k in current if k not in old]
 report={'oldFiles':len(old),'unchanged':sum(current.get(k)==h for k,h in old.items()),'changed':changed,'missing':missing,'added':added,'count':len(current),'time':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 (D/('operations-'+sys.argv[1]+'.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
