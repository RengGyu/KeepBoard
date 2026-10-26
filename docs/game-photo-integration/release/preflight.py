from pathlib import Path
import json,hashlib,datetime,re,subprocess
import requests
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration/release';ROOT=Path('/tmp/keepboard-preview/data')
def sha(b):return hashlib.sha256(b).hexdigest()
def store():
 entries={};size=0
 for p in sorted(ROOT.rglob('*')):
  if p.is_symlink():raise RuntimeError('Store symlink: stop without reading target')
  if not p.is_file():continue
  before=p.stat();digest=sha(p.read_bytes());after=p.stat();assert (before.st_size,before.st_mtime_ns)==(after.st_size,after.st_mtime_ns),'Store changed during opaque hash scan'
  entries[sha(p.relative_to(ROOT).as_posix().encode())]={'sha256':digest,'bytes':before.st_size};size+=before.st_size
 return {'files':len(entries),'bytes':size,'treeSHA256':sha(json.dumps(entries,sort_keys=True,separators=(',',':')).encode()),'opaqueFiles':entries}
before=store();results={};fields=['configured','provider','model','upstreamProvider','reasoningEffort']
for name,base in [('local','http://127.0.0.1:4319'),('public','https://keepboard-kappa.vercel.app')]:
 health=requests.get(base+'/api/health',timeout=30);assert health.status_code==200
 response=requests.get(base+'/api/settings',timeout=30);assert response.status_code==200
 raw=response.json();safe={k:raw.get(k) for k in fields};assert safe['configured'] is True and safe['reasoningEffort']=='high',safe
 results[name]={'healthStatus':health.status_code,'healthOk':health.json().get('ok') is True,'settingsWhitelist':safe}
assert results['local']['settingsWhitelist']==results['public']['settingsWhitelist']
old=json.loads((R/'docs/game-readouts-117/deploy/static-manifest.json').read_text());response=requests.get('https://keepboard-kappa.vercel.app',timeout=30);assert response.status_code==200
paths=['index.html']+re.findall(r'(?:src|href)="(/assets/[^"?#]+\.(?:js|css))"',response.text);assets=[]
for raw in paths:
 p=raw.lstrip('/');res=response if p=='index.html' else requests.get('https://keepboard-kappa.vercel.app/'+p,timeout=30);assert res.status_code==200
 expected=old.get(p,{}).get('sha256');assets.append({'path':p,'status':res.status_code,'sha256':sha(res.content),'previousStaticSHA256':expected,'matchesPriorRelease':sha(res.content)==expected})
assert all(a['matchesPriorRelease'] for a in assets),'Public static baseline changed; root must reconcile before applying.'
listeners={}
for port,expected in [(4319,23791),(4320,64200),(4330,18287)]:
 r=subprocess.run(['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],capture_output=True,text=True);pids=sorted({int(line[1:]) for line in r.stdout.splitlines() if line.startswith('p')});assert pids==[expected],(port,pids);listeners[str(port)]=pids
cwd=subprocess.run(['lsof','-a','-p','23791','-d','cwd','-Fn'],capture_output=True,text=True);assert 'n'+str(R) in cwd.stdout.splitlines()
project=R/'.vercel/project.json';oldstage=Path(json.loads((R/'docs/game-readouts-117/deploy/stage.json').read_text())['stage']);meta=json.loads((project if project.exists() else oldstage/'.vercel/project.json').read_text());meta={k:meta.get(k) for k in ['projectId','orgId','projectName']};assert meta['projectId']=='prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V' and meta['orgId']=='team_RgOQUIJZTU9MufwDOGzuJYA6'
after=store();assert before==after,'Store changed during read-only preflight; do not attribute or overwrite user writes.'
(D/'store-preflight.json').write_text(json.dumps({'root':str(ROOT),'contentReadOnlyForHash':True,'bodyParsed':False,'namesOpaque':True,**before},indent=2)+'\n')
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'API':results,'publicAssets':assets,'listeners':listeners,'backendCwd':str(R),'project':meta,'Store':{k:v for k,v in before.items() if k!='opaqueFiles'},'StoreUnchangedDuringPreflight':True,'processMutations':0,'StoreWrites':0,'realAIcalls':0,'TLSVerification':True}
(D/'preflight.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['publicAssets']},ensure_ascii=False))
