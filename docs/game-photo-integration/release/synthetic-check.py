"""One explicit synthetic production session; manual-only, no images or AI."""
from pathlib import Path
import requests,json,hashlib,datetime
O=Path(__file__).resolve().parent;R=O.parents[2];base='http://127.0.0.1:4319'; checkpoint=O/'synthetic-created.json'
def call(path,body=None,method=None,public=False):
 r=requests.request(method or ('POST' if body is not None else 'GET'),('https://keepboard-kappa.vercel.app' if public else base)+path,json=body,timeout=40)
 assert r.status_code in [200,201],(path,r.status_code,r.text[:180]);return r.json()
assert not checkpoint.exists(),'Do not create a second synthetic session; use recorded ID'
v=call('/api/sessions',{'gamePackId':'splendor','name':'[배포검수·합성] 사진계약·저장재개 (실제판 아님)','players':[{'id':'synthetic','name':'합성 검수자','color':'blue'}]})
sid=v['session']['id'];p='/api/sessions/'+sid
checkpoint.write_text(json.dumps({'sessionId':sid,'name':v['session']['name'],'createdFor':'manual release verification only','realAIcalls':0},ensure_ascii=False,indent=2)+'\n')
pack=v['pack'];source=pack['runtime']['source'];profiles=json.loads((R/'shared/capture-profiles.json').read_text());profile=profiles[source['gameId']]
assert source['gameId']=='splendor' and profile['sourceSHA']==source['sha256'] and profile['editionId']==source['editionId'] and profile['packId']==pack['id']
market=next(a for a in profile['areas'] if a['id']=='market');assert market['partition']=='common_public' and 'market.scene' in market['fields'] and 'development' in market['components']
assert call(p+'/analysis-jobs')['jobs']==[] and call(p+'/analysis-jobs',public=True)['jobs']==[]
readout={'schema':'splendor-v1','kind':'development','points':0,'bonus':'blue','cost':{'white':None,'blue':0,'green':6,'red':None,'black':None},'requirements':None,'color':None,'level':None}
record={'version':'game-component-record-v1','pieces':[{'id':'release-synthetic-1','componentId':'development','variant':None,'quantity':0,'label':'검수용 합성값 · 실제 카드 아님','anchor':'공개 진열','evidenceId':None,'region':None,'readout':readout}]}
v=call(p,{'answers':[{'field':'market.scene','value':record}],'notes':{'public':'실제 보드·사진 없음. AI 호출 없음. 배포 수동 검수용 합성 기록.'}},'PATCH');turn=v['session']['turnInstanceId']
def check(view):
 a=next(a for a in view['session']['assertions'] if a['field']=='market.scene' and a['status']=='accepted');assert a['value']==record
 assert view['session']['turnInstanceId']==turn and not view['session']['evidence']
check(call(p+'/commit',{'allowIncomplete':True}));check(call(p));check(call(p,public=True))
export=call(p+'/export');assert export
check(call(p+'/resume',{'scope':'public'}));check(call(p,public=True));assert call(p+'/analysis-jobs')['jobs']==[]
old=json.loads((O/'store-preflight.json').read_text());root=Path(old['root']);current={}
for f in root.rglob('*'):
 assert not f.is_symlink()
 if f.is_file():current[hashlib.sha256(f.relative_to(root).as_posix().encode()).hexdigest()]={'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size}
assert all(current.get(k)==value for k,value in old['opaqueFiles'].items());added=set(current)-set(old['opaqueFiles']);assert len(added)==1
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sessionId':sid,'url':'https://keepboard-kappa.vercel.app/?session='+sid,'gameId':source['gameId'],'captureProfileMatchesPinnedSource':True,'selectedArea':'market','selectedField':'market.scene','jobGETLocalPublic':200,'jobs':0,'manualEditCommitReloadExportResumePublicReload':'PASS','nullZeroQuantityCostPreserved':True,'turnInstanceUnchanged':True,'evidenceCount':0,'snapshotCount':1,'exportSHA256':hashlib.sha256(json.dumps(export,sort_keys=True).encode()).hexdigest(),'newOpaqueFiles':sorted(added),'StoreOriginalFiles':len(old['opaqueFiles']),'StoreOriginalChanged':0,'realAIcalls':0}
(O/'synthetic-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
