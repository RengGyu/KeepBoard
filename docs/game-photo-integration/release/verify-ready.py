"""Read-only release checks; writes only its own receipt. Never applies/restarts/deploys."""
from pathlib import Path
import json,hashlib,subprocess,datetime
R=Path(__file__).resolve().parents[3];D=R/'docs/game-photo-integration';O=D/'release';m=json.loads((D/'source-manifest.json').read_text());stage=json.loads((O/'stage.json').read_text());S=Path(stage['stage']);T=Path(m['isolation']);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
assert m['fullSourceDigest']==stage['sourceDigest'];assert sha(D/'integrated.patch')==m['patchSHA256']==stage['patchSHA256'];assert all(sha(T/p)==h for p,h in m['files'].items())
changes={c['path']:c for c in m['changed']};drift=[]
for p,h in m['files'].items():
 expected=changes[p]['beforeSHA256'] if p in changes else h
 if sha(R/p)!=expected:drift.append(p)
assert not drift,drift
static=json.loads((O/'static-manifest.json').read_text());assert all(sha(S/'.vercel/output/static'/p)==v['sha256'] for p,v in static.items());assert sha(S/'.vercel/output/config.json')==stage['routingSHA256'];assert len(static)==674
allowed={'.vercel/project.json','.vercel/output/config.json'}|{'.vercel/output/static/'+p for p in static};actual={str(p.relative_to(S)) for p in S.rglob('*') if p.is_file()};assert allowed==actual
before=json.loads((O/'local-dist-before.json').read_text());current={str(p.relative_to(R/'dist')):sha(p) for p in (R/'dist').rglob('*') if p.is_file()};assert before==current
transition=json.loads((O/'transition-manifest.json').read_text())
for c in transition['files']:
 assert sha(Path(transition['payload'])/c['path'])==c['afterSHA256']
 if c['beforeSHA256']:assert sha(Path(transition['rollback'])/c['path'])==c['beforeSHA256']
old=json.loads((O/'store-preflight.json').read_text());root=Path(old['root']);entries={};size=0
for p in sorted(root.rglob('*')):
 if p.is_symlink():raise RuntimeError('Store symlink: stop')
 if p.is_file():
  stat=p.stat();entries[hashlib.sha256(p.relative_to(root).as_posix().encode()).hexdigest()]={'sha256':sha(p),'bytes':stat.st_size};size+=stat.st_size
assert entries==old['opaqueFiles'],'Store changed since preflight; current writes must not be restored/overwritten'
for port,pid in [(4319,23791),(4320,64200),(4330,18287)]:
 r=subprocess.run(['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],capture_output=True,text=True);assert sorted({int(x[1:]) for x in r.stdout.splitlines() if x.startswith('p')})==[pid]
report={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PREPARED_HOLD_A3','sourceDigest':m['fullSourceDigest'],'patchSHA256':m['patchSHA256'],'sourcePathsChecked':len(m['files']),'sharedPreimageDrift':drift,'sharedDistUnchanged':True,'staticFiles':len(static),'stageExtraFiles':[],'StoreFiles':len(entries),'StoreBytes':size,'StoreUnchangedSincePreflight':True,'backendPID':23791,'proxyGatewayUnchanged':True,'StoreWrites':0,'sharedProductWrites':0,'processMutations':0,'deploymentsExecuted':0,'realAIcalls':0,'requiresImmediatePreimageRecheckBeforeA3':True}
(O/'final-invariants.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
