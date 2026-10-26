from pathlib import Path
import requests,json,base64,sys,datetime
D=Path(__file__).parent;BASE='https://keepboard-kappa.vercel.app';f=D/'synthetic.json'
def call(p,body,method='POST'):
 r=requests.request(method,BASE+p,json=body,timeout=35);r.raise_for_status();return r.json()
if sys.argv[1]=='setup':
 assert not f.exists(),'Do not create duplicate test fixtures'
 v=call('/api/sessions',{'gamePackId':'splendor','name':'[배포검수] 공통 사진 인식 · 합성 그림','players':[{'id':'synthetic-one','name':'합성검수','color':'#3978bd'}]});sid=v['session']['id'];u=call('/api/sessions/'+sid+'/evidence',{'scope':'public','label':'검증용 합성 도식 · 사용자 사진 아님','dataUrl':'data:image/png;base64,'+base64.b64encode((D.parent/'synthetic-table.png').read_bytes()).decode()});out={'sessionId':sid,'url':BASE+'/?session='+sid,'evidenceId':u['createdEvidenceId'],'captureEpoch':u['session']['captureEpoch'],'synthetic':True,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};f.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
elif sys.argv[1]=='arm':
 assert json.loads((D.parent/'live-smoke.json').read_text())['realCalls']==1
 ledger=D/'live-ledger.json';assert not ledger.exists(),'Paid UI attempt already armed; no retry'
 ledger.write_text(json.dumps({'priorPackageCalls':1,'productionUIAttempt':1,'maxPackageTotal':2,'state':'armed-before-single-UI-photo-read','at':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n');print('One remaining UI analyze attempt armed; no retry')
elif sys.argv[1]=='verify':
 out=json.loads(f.read_text());r=requests.get(BASE+'/api/sessions/'+out['sessionId'],timeout=30);r.raise_for_status();v=r.json();s=v['session'];rows=[a for a in s['assertions'] if a['status']=='accepted' and a['basis']!='rule'];assert rows and s['snapshots'];assert all(out['evidenceId'] in a['evidenceIds'] for a in rows);assert s['evidence'][0]['id']==out['evidenceId'];out['verified']={'acceptedFields':[a['field'] for a in rows],'acceptedPieces':sum(len(a['value'].get('pieces',[])) for a in rows),'snapshotCount':len(s['snapshots']),'originalPreserved':True,'reopened':True,'candidateCount':sum(a['status']=='candidate' for a in s['assertions'])};f.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out['verified']))
