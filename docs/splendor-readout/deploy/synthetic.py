from pathlib import Path
import requests,json,sys,datetime,copy
D=Path(__file__).parent;BASE='https://keepboard-kappa.vercel.app';target=D/'synthetic.json'
def call(path,body=None,method=None):
 r=requests.request(method or ('GET' if body is None else 'POST'),BASE+path,json=body,timeout=35);return r
if sys.argv[1]=='setup':
 assert not target.exists()
 r=call('/api/sessions',{'gamePackId':'splendor','name':'[배포검수] 스플렌더 구조화 수동 카드','players':[{'id':'synthetic-one','name':'합성검수','color':'#3978bd'}]});r.raise_for_status();v=r.json();sid=v['session']['id']
 pieces=[]
 for i,bonus in enumerate(['red','blue','green']):pieces.append({'id':'manual-card-'+str(i),'componentId':'development','variant':None,'quantity':1,'label':'합성 수동 카드 '+str(i+1),'anchor':'실사진/AI판독 아님','evidenceId':None,'region':None,'readout':{'schema':'splendor-v1','kind':'development','points':i,'bonus':bonus,'cost':{'white':0,'blue':2,'green':None,'red':0,'black':4},'requirements':None,'color':None,'level':None}})
 value={'version':'game-component-record-v1','pieces':pieces};r=call('/api/sessions/'+sid,{'answers':[{'field':'market.scene','value':value}]},'PATCH');r.raise_for_status()
 bad=copy.deepcopy(value);bad['pieces'][0]['readout']['points']=-1;r=call('/api/sessions/'+sid,{'answers':[{'field':'market.scene','value':bad}]},'PATCH');assert r.status_code==400
 out={'sessionId':sid,'url':BASE+'/?session='+sid,'synthetic':True,'manualOnly':True,'realAICalls':0,'invalidTypedRejected':400,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};target.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
elif sys.argv[1]=='verify':
 out=json.loads(target.read_text());r=call('/api/sessions/'+out['sessionId']);r.raise_for_status();s=r.json()['session'];a=next(a for a in s['assertions'] if a['field']=='market.scene' and a['status']=='accepted');p=next(p for p in a['value']['pieces'] if p['id']=='manual-card-0');assert p['readout']['points']==2 and p['readout']['cost']['green'] is None and p['readout']['cost']['white']==0 and len(s['snapshots'])>=1
 snap=next(a for a in s['snapshots'][-1]['assertions'] if a['field']=='market.scene' and a['status']=='accepted');assert snap['value']==a['value']
 out['verified']={'points':2,'costGreen':None,'costWhite':0,'pieces':len(a['value']['pieces']),'snapshotCount':len(s['snapshots']),'snapshotMatches':True,'reopened':True};target.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out['verified']))
