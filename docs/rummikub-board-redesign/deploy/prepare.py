from pathlib import Path
import subprocess,hashlib,json,shutil,tempfile,os,re,datetime,requests
out=Path('docs/rummikub-board-redesign/deploy');data=Path('/tmp/keepboard-preview/data')
# Read only the needed process metadata; never print the environment or private file names.
raw=subprocess.check_output(['ps','eww','-p','82226','-o','command='],text=True)
assert re.search(r'(?:^|\s)KEEPBOARD_DATA_DIR=/tmp/keepboard-preview/data(?:\s|$)',raw)
assert re.search(r'(?:^|\s)PORT=4319(?:\s|$)',raw)
assert Path(subprocess.check_output(['lsof','-a','-p','82226','-d','cwd','-Fn'],text=True).split('\nn',1)[1].strip())==Path.cwd()
assert '82226' in subprocess.check_output(['lsof','-nP','-iTCP:4319','-sTCP:LISTEN'],text=True)
assert '64203' in subprocess.check_output(['ps','-p','64203','-o','pid='],text=True)
def hashes(root):
 return {hashlib.sha256(str(p.relative_to(root)).encode()).hexdigest():hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
before=hashes(data)
backup=Path(tempfile.mkdtemp(prefix='rummikub-deploy-',dir='/tmp'));os.chmod(backup,0o700)
shutil.copytree(data,backup/'data');assert hashes(backup/'data')==before;assert hashes(data)==before
(backup/'hashes-before.json').write_text(json.dumps(before));os.chmod(backup/'hashes-before.json',0o600)
settings={}
for k,url in [('local','http://127.0.0.1:4319'),('public','https://keepboard-kappa.vercel.app')]:
 r=requests.get(url+'/api/settings',timeout=25);r.raise_for_status();v=r.json();settings[k]={x:v.get(x) for x in ['configured','provider','model','upstreamProvider','reasoningEffort']}
 assert settings[k]=={'configured':True,'provider':'gateway','model':'deepseek-flash','upstreamProvider':'deepseek','reasoningEffort':'high'}
stage=Path(tempfile.mkdtemp(prefix='keepboard-rummi-production-'));static=stage/'.vercel/output/static';static.mkdir(parents=True)
for p in Path('dist').rglob('*'):
 if p.is_file() and p.suffix!='.zip':
  t=static/p.relative_to('dist');t.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,t)
prior=Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-copy-production-58mlfu3r')
for relative in ['.vercel/project.json','.vercel/output/config.json']:shutil.copy2(prior/relative,stage/relative)
files=[{'path':str(p.relative_to(static)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(static.rglob('*')) if p.is_file()]
assert not any(any(s in x['path'].split('/') for s in ['.keepboard','.env','src','server','docs']) or x['path'].endswith('.zip') for x in files)
(out/'static-manifest.json').write_text(json.dumps({'stage':str(stage),'files':files},indent=2)+'\n')
report={'preparedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'oldBackendPID':82226,'dataRoot':str(data),'cwd':str(Path.cwd()),'backup':str(backup),'fileCount':len(before),'backupHashesEqual':True,'beforeSettings':settings,'stage':str(stage),'preservedPIDs':{'proxy':64200,'tunnel':64203,'gateway':18287}}
(out/'operations-before.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
