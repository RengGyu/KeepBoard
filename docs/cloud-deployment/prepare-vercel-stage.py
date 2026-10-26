"""Future stage only: trusted HTTPS + expected high required; never deploys."""
from pathlib import Path
import sys,json,ipaddress,shutil,hashlib,urllib.parse
import requests
O=Path(__file__).resolve().parent;R=O.parents[1]
if len(sys.argv)!=2:raise SystemExit('Usage after cloud setup: prepare-vercel-stage.py https://ATTACHED_STATIC_IPV4')
u=urllib.parse.urlsplit(sys.argv[1]);assert u.scheme=='https' and not u.username and not u.password and not u.query and not u.fragment and u.path in ['', '/'] and u.port in [None,443]
ip=ipaddress.ip_address(u.hostname);assert ip.version==4 and ip.is_global;origin='https://'+str(ip)
h=requests.get(origin+'/api/health',timeout=30);h.raise_for_status();assert h.json()['ok'] is True
s=requests.get(origin+'/api/settings',timeout=30);s.raise_for_status();safe={k:s.json().get(k) for k in ['configured','provider','model','upstreamProvider','reasoningEffort']}
assert safe=={'configured':True,'provider':'gateway','model':'deepseek-flash','upstreamProvider':'deepseek','reasoningEffort':'high'}
before=R/'docs/game-photo-integration/release';stage=O/'vercel-stage';assert not stage.exists(),'Never overwrite an existing review stage'
old=before/'staging';meta=json.loads((old/'.vercel/project.json').read_text());assert meta['projectId']=='prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V' and meta['orgId']=='team_RgOQUIJZTU9MufwDOGzuJYA6'
files=json.loads((before/'static-manifest.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert all(sha(old/'.vercel/output/static'/p)==v['sha256'] for p,v in files.items())
shutil.copytree(old,stage);config=json.loads((stage/'.vercel/output/config.json').read_text());changes=[]
for route in config['routes']:
 if route.get('src') in ['/api/(.*)','/uploads/(.*)']:
  olddest=route['dest'];route['dest']=origin+('/api/$1' if route['src']=='/api/(.*)' else '/uploads/$1');changes.append({'src':route['src'],'before':olddest,'after':route['dest']})
assert len(changes)==2
(stage/'.vercel/output/config.json').write_text(json.dumps(config,indent=2)+'\n')
(O/'vercel-stage.json').write_text(json.dumps({'stage':str(stage),'project':meta,'changes':changes,'staticFilesUnchanged':len(files),'TLSVerified':True,'settingsWhitelist':safe,'deployed':False},indent=2)+'\n')
print(json.dumps({'stage':str(stage),'origin':origin,'changes':2,'assetsUnchanged':len(files),'deployed':False}))
