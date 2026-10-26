"""Only self-created synthetic room. Credentials/PIN/invite stay in memory."""
import requests,json,uuid,time
from pathlib import Path
D=Path(__file__).parent;BASE='https://keepboard-kappa.vercel.app';checks=[];room_id=None
def check(label,condition):
 checks.append({'check':label,'pass':bool(condition)})
 if not condition:raise AssertionError(label)
class Client:
 def __init__(self):self.s=requests.Session();self.view=None
 def call(self,path,method='GET',body=None,token=None,expect=200,files=None):
  headers={'Origin':BASE,'Connection':'close'}
  if token:headers['X-KeepBoard-Private-Token']=token
  r=self.s.request(method,BASE+path,headers=headers,json=body if files is None else None,files=files,timeout=40)
  check(method+' '+path.split('/api/sessions/')[0]+' actual '+str(r.status_code)+' expected '+str(expect),r.status_code in expect if isinstance(expect,list) else r.status_code==expect)
  v=r.json() if 'application/json' in r.headers.get('content-type','') else None
  if v and 'roomAccess' in v:self.view=v
  return r,v
 def init(self):
  self.call('/api/rooms/device','POST',{})
  cookies=[c for c in self.s.cookies if c.name=='kb_device'];check('HTTPS host-only secure HttpOnly SameSite cookie',len(cookies)==1 and cookies[0].domain=='keepboard-kappa.vercel.app' and not cookies[0].domain_specified and cookies[0].secure and 'HttpOnly' in cookies[0]._rest and cookies[0]._rest.get('SameSite')=='Lax')
 def rev(self,*keys):return {'expectedRevisions':{k:self.view['roomAccess']['revisions'][k] for k in keys}}
def scene(owner=None):
 return {'version':'rummikub-classic-v1','ownerId':owner,'coverage':'partial','groups':[{'id':'deployment-group','label':'합성 검수','tiles':[{'id':'deployment-tile-'+str(n),'kind':'number','color':'orange' if owner else 'blue','number':n,'face':'front','representedColor':None,'representedNumber':None,'evidenceIds':[],'region':None,'note':''} for n in [1,7,13]]}],'loose':[]}
try:
 h,a,x=Client(),Client(),Client()
 for c in [h,a,x]:c.init()
 cookies=[next(c.value for c in cli.s.cookies if c.name=='kb_device') for cli in [h,a,x]];check('three independent device identities',len(set(cookies))==3)
 request={'gamePackId':'rummikub','capacity':2,'name':'[배포검수] 방·개인받침대·저장 2026-10-22','me':{'name':'검수 방장','color':'#d1554b'},'clientRequestId':str(uuid.uuid4())}
 _,v=h.call('/api/rooms','POST',request,expect=201);room_id=v['session']['id'];H=v['roomAccess']['playerId'];p='/api/sessions/'+room_id
 check('host role/current optional PIN pack',v['roomAccess']['role']=='host' and v['pack']['runtime']['privatePolicy']=='optional-pin')
 _,twice=h.call('/api/rooms','POST',request,expect=201);check('create idempotency',twice['session']['id']==room_id)
 _,invite=h.call('/api/rooms/'+room_id+'/invite');code=invite['code'];link=invite['token']
 x.call(p,expect=403)
 _,pre=a.call('/api/rooms/preview','POST',{'invite':link});check('link preview reveals no players/private',pre['remaining']==1 and 'players' not in pre)
 a.call('/api/rooms/join','POST',{'invite':code,'name':'검수 참가자','color':'#d1554b'},expect=409)
 _,v=a.call('/api/rooms/join','POST',{'invite':code,'name':'검수 참가자','color':'#3978bd'});A=v['roomAccess']['playerId'];check('member role',v['roomAccess']['role']=='member')
 x.call('/api/rooms/join','POST',{'invite':code,'name':'정원 외 검수','color':'#68a68b'},expect=409)
 _,again=a.call('/api/rooms/join','POST',{'invite':link,'name':'무시','color':'#000000'});check('cookie reentry survives capacity and retains seat',again['roomAccess']['playerId']==A and len(again['session']['players'])==2)
 a.call('/api/rooms/'+room_id+'/me','PATCH',{'name':'검수 참가자 A','color':'#8d70b0',**a.rev('roster')})
 _,v=a.call(p);check('name/color persisted',any(q['id']==A and q['name']=='검수 참가자 A' and q['color']=='#8d70b0' for q in v['session']['players']))
 a.call(p,'PATCH',{'notes':{'public':'DENIED'},**a.rev('public')},expect=403)
 h.call(p,'PATCH',{'notes':{A:'DENIED'},**h.rev('public')},expect=403)
 h.call(p,'PATCH',{'notes':{'public':'합성 공용 기록'},'answers':[{'field':'table.scene','value':scene()}],**h.rev('public')})
 h.call(p+'/commit','POST',{'scope':'public','allowIncomplete':True,**h.rev('public')})
 a.call(p)
 own=scene(A);a.call(p,'PATCH',{'notes':{A:'SYNTHETIC-PRIVATE-MEMBER'},'answers':[{'field':'rack.scene','ownerId':A,'value':own}],**a.rev(A)})
 a.call(p+'/commit','POST',{'scope':'owner','ownerId':A,'allowIncomplete':True,**a.rev(A)})
 _,reopen=a.call(p);check('self scene save/reopen exactly preserves 1/7/13',next(q for q in reopen['session']['assertions'] if q['field']=='rack.scene' and q.get('ownerId')==A)['value']==own)
 _,public=h.call(p);check('host cannot see member private records', 'SYNTHETIC-PRIVATE-MEMBER' not in json.dumps(public) and not any(q.get('ownerId')==A and q['field']=='rack.scene' for q in public['session']['assertions']))
 # The product uses JSON dataURL, not multipart. Test rejection separately.
 a.call(p+'/evidence','POST',files={'file':('synthetic.png',b'not-a-real-photo','image/png')},expect=[400,403,409])
 png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII='
 _,photo=a.call(p+'/evidence','POST',{'scope':'player','ownerId':A,'dataUrl':png,'label':'[배포검수] 연결확인용 1px 합성','width':1,'height':1,'expectedCaptureEpoch':a.view['session']['captureEpoch'],**a.rev(A)})
 eid=photo['createdEvidenceId'];url=next(e['url'] for e in photo['session']['evidence'] if e['id']==eid)
 r,_=a.call(url);check('synthetic image upstream forwarding MIME/content',r.headers.get('content-type','').startswith('image/png') and r.content.startswith(b'\x89PNG'))
 h.call(url,expect=403);x.call(url,expect=403)
 a.call(p+'/privacy/'+A,'PUT',{'enabled':True,'pin':'0007',**a.rev(A)})
 _,locked=a.call(p);check('PIN relock hides own data', 'SYNTHETIC-PRIVATE-MEMBER' not in json.dumps(locked))
 a.call(url,expect=403);a.call(p,'PATCH',{'notes':{A:'DENIED'},**a.rev(A)},expect=403)
 h.call(p+'/privacy/'+A+'/unlock','POST',{'pin':'0007'},expect=403)
 a.call(p+'/privacy/'+A,'PUT',{'enabled':False,**a.rev(A)},expect=403)
 a.call(p+'/privacy/'+A+'/unlock','POST',{'pin':'1111'},expect=403)
 _,unlocked=a.call(p+'/privacy/'+A+'/unlock','POST',{'pin':'0007'});token=unlocked['token']
 _,v=a.call(p,token=token);check('correct PIN sees only own saved value','SYNTHETIC-PRIVATE-MEMBER' in json.dumps(v))
 a.call(url,token=token);h.call(url,token=token,expect=403);h.call(p+'/privacy/lock','POST',{},token=token,expect=403)
 a.call(p+'/evidence/'+eid,'DELETE',{**a.rev(A)},token=token)
 check('synthetic evidence excluded from current record',all(e['id']!=eid for e in a.view['session']['evidence']))
 a.call(p+'/privacy/lock','POST',{},token=token)
 _,v=a.call(p);check('explicit lock hides own content','SYNTHETIC-PRIVATE-MEMBER' not in json.dumps(v))
 check('invite/internal memberships not projected','members' not in json.dumps(v) and code not in json.dumps(v) and link not in json.dumps(v))
 result={'status':'PASS','roomId':room_id,'name':request['name'],'checks':checks,'cookieJars':3,'realAI':0,'userRecordsRead':False,'evidence':'1px synthetic JSON upload; metadata deleted; raw immutable upload may remain','multipart':'unsupported API, rejected rather than claimed supported','browserClicks':False}
except Exception as e:
 result={'status':'FAIL','roomId':room_id,'checks':checks,'errorClass':type(e).__name__,'error':str(e),'realAI':0}
 (D/'public-room.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'FAIL','checks':len(checks),'roomId':room_id,'error':str(e)}));raise
(D/'public-room.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'PASS','checks':len(checks),'roomId':room_id,'realAI':0}))
