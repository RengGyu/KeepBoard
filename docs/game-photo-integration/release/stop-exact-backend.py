"""Stop only the approved old 4319 listener after immediate identity checks."""
from pathlib import Path
import subprocess, json, hashlib, os, signal, datetime
O=Path(__file__).resolve().parent; R=O.parents[2]
def run(args): return subprocess.run(args,capture_output=True,text=True,check=True).stdout
def listeners(port): return sorted({int(s[1:]) for s in run(['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp']).splitlines() if s.startswith('p')})
assert listeners(4319)==[23791]
assert listeners(4320)==[64200] and listeners(4330)==[18287]
assert run(['ps','-p','64203','-o','comm=']).strip()=='/tmp/keepboard-preview/bin/cloudflared'
assert run(['ps','-p','23791','-o','comm=']).strip()=='/Users/jeonggyuju/.nvm/versions/node/v22.22.0/bin/node'
assert 'n'+str(R) in run(['lsof','-a','-p','23791','-d','cwd','-Fn']).splitlines()
before=json.loads((O/'store-preflight.json').read_text()); folder=Path(before['root']); current={}
for p in folder.rglob('*'):
 assert not p.is_symlink()
 if p.is_file(): current[hashlib.sha256(p.relative_to(folder).as_posix().encode()).hexdigest()]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
assert current==before['opaqueFiles'],'Store has natural changes: stop for supervisor, do not restore'
os.kill(23791,signal.SIGTERM)
receipt={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'signal':'SIGTERM','verifiedPID':23791,'verifiedCwd':str(R),'StoreOriginalFiles':len(current),'StoreOriginalUnchanged':True,'otherPIDSignals':[]}
(O/'backend-stop.json').write_text(json.dumps(receipt,indent=2)+'\n'); print(json.dumps(receipt))
