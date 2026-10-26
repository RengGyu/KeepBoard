"""Verify current release; Store is hashed without parsing names or contents."""
from pathlib import Path
import json,hashlib,datetime,subprocess,sys,re
import requests
O=Path(__file__).resolve().parent; R=O.parents[2]; m=json.loads((O.parent/'source-manifest.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
phase=sys.argv[1]; assert phase in ['backend','public','final']
assert all((R/p).is_file() and sha((R/p).read_bytes())==h for p,h in m['files'].items())
assert {p.relative_to(R/'dist').as_posix():sha(p.read_bytes()) for p in (R/'dist').rglob('*') if p.is_file()}=={p.removeprefix('dist/'):h for p,h in m['dist'].items()}
def run(args):return subprocess.run(args,capture_output=True,text=True,check=True).stdout
listeners={}
for port in [4319,4320,4330]:
 listeners[str(port)]=sorted({int(s[1:]) for s in run(['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp']).splitlines() if s.startswith('p')})
assert len(listeners['4319'])==1 and listeners['4319']!=[23791]
assert listeners['4320']==[64200] and listeners['4330']==[18287]
assert run(['ps','-p','64203','-o','comm=']).strip()=='/tmp/keepboard-preview/bin/cloudflared'
assert 'n'+str(R) in run(['lsof','-a','-p',str(listeners['4319'][0]),'-d','cwd','-Fn']).splitlines()
old=json.loads((O/'store-preflight.json').read_text()); root=Path(old['root']);entries={}
for p in root.rglob('*'):
 assert not p.is_symlink()
 if p.is_file():
  before=p.stat(); digest=sha(p.read_bytes());after=p.stat();assert (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns)
  entries[sha(p.relative_to(root).as_posix().encode())]={'sha256':digest,'bytes':before.st_size}
missing=[k for k in old['opaqueFiles'] if k not in entries];changed=[k for k,v in old['opaqueFiles'].items() if k in entries and entries[k]!=v]
assert not missing and not changed,'Original Store files changed: report, never restore'
added=set(entries)-set(old['opaqueFiles'])
if phase!='final':assert not added,'Unexpected Store additions'
else:
 synthetic=json.loads((O/'synthetic-check.json').read_text());assert added==set(synthetic['newOpaqueFiles'])
results={};pre=json.loads((O/'preflight.json').read_text()); keys=['configured','provider','model','upstreamProvider','reasoningEffort']
for name,base in [('local','http://127.0.0.1:4319'),('public','https://keepboard-kappa.vercel.app')]:
 h=requests.get(base+'/api/health',timeout=30);h.raise_for_status();assert h.json().get('ok') is True
 r=requests.get(base+'/api/settings',timeout=30);r.raise_for_status();safe={k:r.json().get(k) for k in keys};assert safe==pre['API'][name]['settingsWhitelist']
 results[name]={'healthStatus':h.status_code,'settingsWhitelist':safe}
assets=[]
if phase!='backend':
 static=json.loads((O/'static-manifest.json').read_text());base='https://keepboard-kappa.vercel.app';h=requests.get(base,timeout=30);h.raise_for_status()
 for path in ['index.html']+[s.lstrip('/') for s in re.findall(r'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"',h.text)]:
  r=h if path=='index.html' else requests.get(base+'/'+path,timeout=30);r.raise_for_status();digest=sha(r.content);assert digest==static[path]['sha256'],path
  assets.append({'path':path,'status':r.status_code,'sha256':digest})
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'phase':phase,'sourceDigest':m['fullSourceDigest'],'sourcePathsVerified':len(m['files']),'distFilesVerified':len(m['dist']),'API':results,'listeners':listeners,'tunnelPID':64203,'StoreOriginalFiles':len(old['opaqueFiles']),'StoreOriginalChanged':len(changed),'StoreOriginalMissing':len(missing),'StoreAddedFiles':len(added),'publicAssets':assets,'realAIcalls':0}
(O/('verified-'+phase+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
