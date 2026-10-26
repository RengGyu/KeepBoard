from pathlib import Path
import requests,json
D=Path(__file__).parent;paths=json.loads((D/'paths.json').read_text());A=Path(paths['isolated']);BASE='http://127.0.0.1:4407';assert BASE=='http://127.0.0.1:4407'
image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4kAAAAASUVORK5CYII='
rows=[]
for g in ['carcassonne','scout','sagrada']:
 f=json.loads((A/f'tests/fixtures/readouts/{g}.json').read_text());e=next(x for x in f['entries'] if x['collection']=='enabled' and x['scope']=='public');v=requests.post(BASE+'/api/sessions',json={'gamePackId':g,'name':'[격리검수] '+g,'players':f['players']},timeout=20);v.raise_for_status();sid=v.json()['session']['id'];r=BASE+'/api/sessions/'+sid
 u=requests.post(r+'/evidence',json={'scope':'public','dataUrl':image,'label':'SYNTHETIC 1px fixture'},timeout=20);u.raise_for_status();eid=u.json()['createdEvidenceId'];p=e['typed'];p['evidenceId']=eid
 value={'version':'game-component-record-v1','pieces':[p]};patch=requests.patch(r,json={'answers':[{'field':e['fieldKey'],'value':value}]},timeout=20);patch.raise_for_status();rows.append({'gameId':g,'sessionId':sid,'url':BASE+'/?session='+sid,'field':e['fieldKey'],'method':'synthetic manual API setup, no model'})
(D/'preview-sessions.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows))
