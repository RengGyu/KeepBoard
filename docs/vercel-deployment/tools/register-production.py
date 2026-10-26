# Approved same-project encrypted server environment registration. Never print values.
from pathlib import Path
import json,subprocess,tempfile,os
CLI='/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/.bin/vercel';CWD='/tmp/keepboard-vercel-preview-stage';PROJECT='prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V';TEAM='team_RgOQUIJZTU9MufwDOGzuJYA6';ROOT=Path(__file__).resolve().parents[3];D=ROOT/'docs/vercel-deployment';secretDir=Path('/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-vercel-private-eyxb70_9')
def api(endpoint,method='GET',body=None):
 args=[CLI,'api',endpoint,'--method',method];file=None
 if body is not None:
  fd,name=tempfile.mkstemp(dir=secretDir);os.fchmod(fd,0o600);file=Path(name)
  with os.fdopen(fd,'w') as out:json.dump(body,out)
  args+=['--input',str(file)]
 try:
  r=subprocess.run(args,cwd=CWD,capture_output=True,text=True)
  if r.returncode:raise RuntimeError('Vercel env API failed; response intentionally not printed')
  return json.loads(r.stdout)
 finally:
  if file:file.unlink()
existing=api(f'/v10/projects/{PROJECT}/env?teamId={TEAM}').get('envs',[])
blob=next(e for e in existing if e['id']=='BJSPGyMRKq7JvhxL');assert blob['key']=='BLOB_READ_WRITE_TOKEN' and blob['contentHint']['storeId']=='store_Xk8tUv2qKYHBTQbi'
assert not any(e['key']=='KEEPBOARD_MOCK_ANALYSIS' and 'production' in e.get('target',[]) for e in existing)
for key in ['DEEPSEEK_API_KEY','KEEPBOARD_BLOB_PREFIX']:
 assert not any(e['key']==key and 'production' in e.get('target',[]) for e in existing),'Existing production variable; stop instead of replacing'
# Target-only edit preserves encrypted token/contentHint; no token fetch needed.
api(f'/v9/projects/{PROJECT}/env/{blob["id"]}?teamId={TEAM}','PATCH',{'target':['preview','production']})
configPath=ROOT/'gateway/.local/config.json';cfg=json.loads(configPath.read_text());a=cfg['aliases']['board-vision'];provider=cfg['providers'][a['provider']];assert provider['kind']=='deepseek' and a['model']=='deepseek-flash' and a['effort']=='high';assert provider.get('apiKeyFile')
key=(configPath.parent/provider['apiKeyFile']).read_text().strip();assert key and '\n' not in key and '\r' not in key
for name,value in [('DEEPSEEK_API_KEY',key),('KEEPBOARD_BLOB_PREFIX','production-release-20261023')]:
 api(f'/v10/projects/{PROJECT}/env?teamId={TEAM}','POST',{'key':name,'value':value,'type':'encrypted','target':['production']})
meta=api(f'/v10/projects/{PROJECT}/env?teamId={TEAM}').get('envs',[]);safe=[{k:e.get(k) for k in ['id','key','type','target','contentHint']} for e in meta if e['key'] in ['BLOB_READ_WRITE_TOKEN','DEEPSEEK_API_KEY','KEEPBOARD_BLOB_PREFIX','KEEPBOARD_MOCK_ANALYSIS']]
assert not any(e['key']=='KEEPBOARD_MOCK_ANALYSIS' and 'production' in e['target'] for e in safe)
(D/'migration/production-env.json').write_text(json.dumps({'project':PROJECT,'team':TEAM,'variables':safe,'valuesPrinted':False,'realAI':0},indent=2)+'\n');print(json.dumps({'registered':[e['key'] for e in safe],'valuesPrinted':False,'productionMock':False}))
