from pathlib import Path
import requests,json,uuid
D=Path(__file__).parent;B='https://keepboard-kappa.vercel.app';checks=[];ids=[]
def check(label,valid):
 checks.append({'check':label,'pass':bool(valid)})
 if not valid:raise AssertionError(label)
class Client:
 def __init__(self):self.s=requests.Session();self.view=None
 def call(self,p,method='GET',body=None,expected=200):
  r=self.s.request(method,B+p,headers={'Origin':B,'Connection':'close'},json=body,timeout=30);check(method+' status '+str(expected),r.status_code==expected);v=r.json()
  if 'roomAccess' in v:self.view=v
  return v
 def rev(self,k):return {'expectedRevisions':{k:self.view['roomAccess']['revisions'][k]}}
try:
 h,a,b,x=Client(),Client(),Client(),Client()
 for c in [h,a,b,x]:c.call('/api/rooms/device','POST',{})
 v=h.call('/api/rooms','POST',{'gamePackId':'rummikub','capacity':3,'name':'[배포검수] 선택 이름 초대방','me':{'color':'#c65d4b'},'clientRequestId':str(uuid.uuid4())},201);room=v['session']['id'];ids.append(room);p='/api/sessions/'+room;check('host omitted name is seat1, no fake slots',len(v['session']['players'])==1 and v['session']['players'][0]['name']=='플레이어 1')
 invite=h.call('/api/rooms/'+room+'/invite')['code'];v=a.call('/api/rooms/join','POST',{'invite':invite,'name':'  ','color':'#6285aa'});A=v['roomAccess']['playerId'];check('member whitespace name is seat2',v['session']['players'][1]['name']=='플레이어 2')
 v=b.call('/api/rooms/join','POST',{'invite':invite,'name':'나래','color':'#78967a'});check('custom join name retained',v['session']['players'][2]['name']=='나래')
 v=a.call('/api/rooms/join','POST',{'invite':invite,'name':'바뀌면 안 됨','color':'#d5a44d'});check('same cookie reentry retains seat/name/color',v['roomAccess']['playerId']==A and v['session']['players'][1]['name']=='플레이어 2' and v['session']['players'][1]['color']=='#6285aa')
 a.call(p,'PATCH',{'notes':{'public':'DENIED'},**a.rev('public')},403);h.call(p,'PATCH',{'notes':{A:'DENIED'},'expectedRevisions':{A:0}},403);x.call(p,expected=403)
 a.call(p,'PATCH',{'notes':{A:'SYNTHETIC-PRIVATE-OPTIONAL-NAME'},**a.rev(A)});check('room host still cannot read other owner', 'SYNTHETIC-PRIVATE-OPTIONAL-NAME' not in json.dumps(h.call(p)))
 c=Client();v=c.call('/api/sessions','POST',{'name':'[배포검수] 한 기기 3명 선택 이름','gamePackId':'rummikub','players':[{'id':'one','name':'','color':'red'},{'id':'two','name':'별','color':'blue'},{'id':'three','name':'   ','color':'#d5a44d'}]},201);single=v['session']['id'];ids.append(single);p='/api/sessions/'+single
 check('single-device has chosen N seats/default/custom/named colors/no room',v['session'].get('room') is None and [q['name'] for q in v['session']['players']]==['플레이어 1','별','플레이어 3'] and [q['color'] for q in v['session']['players']]==['red','blue','#d5a44d'])
 notes={'public':'합성 공용 저장','one':'합성 첫 개인 저장','two':'합성 두 번째 개인 저장'};c.call(p,'PATCH',{'notes':notes});c.call(p+'/commit','POST',{'allowIncomplete':True});v=c.call(p);check('single-device public and two owners saved/reopened',all(v['session']['notes'].get(k)==n for k,n in notes.items()) and all(v['session']['snapshots'][-1]['notes'].get(k)==n for k,n in notes.items()))
 out={'status':'PASS','checks':checks,'syntheticSessionIds':ids,'realAI':0,'existingRecordsRead':False,'namesOnlyRefinementTest':True}
except Exception as e:
 out={'status':'FAIL','checks':checks,'syntheticSessionIds':ids,'errorClass':type(e).__name__,'error':str(e)};(D/'api-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');raise
(D/'api-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'PASS','checks':len(checks),'syntheticSessionIds':ids}))
