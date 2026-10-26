from pathlib import Path
import hashlib,json,requests,subprocess,datetime
out=Path('docs/rummikub-board-redesign/deploy');before=json.loads((out/'operations-before.json').read_text());base='https://keepboard-kappa.vercel.app'
def hashes(root):return {hashlib.sha256(str(p.relative_to(root)).encode()).hexdigest():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
old=json.loads((Path(before['backup'])/'hashes-before.json').read_text());now=hashes(Path(before['dataRoot']))
assert old==now,'Store changed since backup; do not overwrite; investigate concurrent changes'
pid=int(subprocess.check_output(['lsof','-t','-iTCP:4319','-sTCP:LISTEN'],text=True).strip());assert pid!=82226
ports={}
for port,expected in [(4320,64200),(4330,18287)]:
 got=int(subprocess.check_output(['lsof','-t',f'-iTCP:{port}','-sTCP:LISTEN'],text=True).strip());assert got==expected;ports[str(port)]=got
assert subprocess.check_output(['ps','-p','64203','-o','pid='],text=True).strip()=='64203'
api={}
for k,u in [('local','http://127.0.0.1:4319'),('public',base)]:
 h=requests.get(u+'/api/health',timeout=25);c=requests.get(u+'/api/game-catalog',timeout=25);p=requests.get(u+'/api/packs',timeout=25);s=requests.get(u+'/api/settings',timeout=25)
 for r in [h,c,p,s]:r.raise_for_status()
 packs=p.json();pack=next(x for x in packs if x['id']=='rummikub');settings={x:s.json().get(x) for x in ['configured','provider','model','upstreamProvider','reasoningEffort']}
 assert len(c.json())==120 and pack['version'].startswith('1.1.0-essentials-2.') and pack['runtime']['privatePolicy']=='optional-pin'
 assert settings==before['beforeSettings'][k]
 api[k]={'healthStatus':h.status_code,'catalogCount':len(c.json()),'rummikubVersion':pack['version'],'adapterVersion':pack['runtime']['adapterVersion'],'privatePolicy':pack['runtime']['privatePolicy'],'settings':settings}
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'backendPID':pid,'backendOutputSession':71289,'existingFileCount':len(old),'existingFilesHashesUnchanged':True,'newOrMissingFiles':len(set(old)^set(now)),'dataRoot':before['dataRoot'],'preservedPIDs':{**ports,'tunnel':64203},'API':api,'AIcalls':0}
(out/'operations-after.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
