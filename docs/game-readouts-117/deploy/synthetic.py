from pathlib import Path
import json,requests,copy
D=Path(__file__).parent;R=D.parents[2];BASE='https://keepboard-kappa.vercel.app';path=D/'synthetic.json';assert not path.exists()
f=json.loads((R/'tests/fixtures/readouts/carcassonne.json').read_text());e=next(x for x in f['entries'] if x['componentId']=='tiles' and x['fieldKey']=='map.scene');p=copy.deepcopy(e['typed']);p['id']='deploy117-manual-tile';p['label']='합성 검수 타일 · 실사진 판독 아님';p['evidenceId']=None;p['region']=None
for k,v in p['readout']['values'].items():p['readout']['sources'][k]=None if v is None else 'user'
r=requests.post(BASE+'/api/sessions',json={'gamePackId':'carcassonne','name':'[배포검수117] 카르카손 상세 기록','players':[{'id':'synthetic117','name':'합성 검수','color':'#3978bd'}]},timeout=30);r.raise_for_status();sid=r.json()['session']['id'];route=BASE+'/api/sessions/'+sid;value={'version':'game-component-record-v1','pieces':[p]};r=requests.patch(route,json={'answers':[{'field':'map.scene','value':value}]},timeout=30);r.raise_for_status()
bad=copy.deepcopy(value);bad['pieces'][0]['readout']['schema']='foreign-v999';r=requests.patch(route,json={'answers':[{'field':'map.scene','value':bad}]},timeout=30);assert r.status_code==400
out={'synthetic':True,'sessionId':sid,'url':BASE+'/?session='+sid,'manualOnly':True,'photos':0,'realAICalls':0,'invalidSchemaRejected':r.status_code};path.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
