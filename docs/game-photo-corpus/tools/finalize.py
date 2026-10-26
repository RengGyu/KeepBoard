import json,hashlib,os,stat,collections,csv,re
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image
D=Path('docs/game-photo-corpus');p=D/'manifest.json';m=json.loads(p.read_text());notes=json.loads((D/'reviews-sol.json').read_text());games=json.loads((D/'games.json').read_text());bgg=json.loads((D/'bgg-id-verification.json').read_text());ids={g['gameId'] for g in games};assert len(ids)==len(games)==120 and set(m['games'])==ids
private=Path(m['privateDir']).resolve();assert str(private).endswith('/keepboard-photo-corpus/originals');errors=[];checks=[]
assert stat.S_IMODE(private.stat().st_mode)==0o700
assert stat.S_IMODE(private.parent.stat().st_mode)==0o700
assert len({i['sha256'] for i in m['images']})==len(m['images'])
for i in m['images']:
 assert i['gameId'] in ids
 if i['sha256'] in notes:i.update(notes[i['sha256']])
 elif not i.get('visualReview'):i['visualReview']={'reviewer':'Claude (previous collector, reported direct view)','method':'inherited classification; Sol1 did not independently view this image','reviewedAt':'2026-10-23'}
 i['license']='License/redistribution permission not verified from inspected source metadata; local private research only.'
 i['visibilityMeaning']='visible fields describe photographed areas, NOT rule-authorized public/private visibility'
 file=Path(i['localPath']).resolve() if i.get('localPath') else None
 row={'sha256':i['sha256'],'retained':bool(file and file.exists())}
 i['retained']=row['retained']
 if file:
  assert file.parent==private,'outside private original directory'
  if not file.exists():errors.append({'sha256':i['sha256'],'error':'declared file missing'})
  else:
   raw=file.read_bytes();actual=hashlib.sha256(raw).hexdigest();row.update(bytes=len(raw),shaMatches=actual==i['sha256'],byteCountMatches=len(raw)==i['bytes'],mode=oct(stat.S_IMODE(file.stat().st_mode)))
   try:
    with Image.open(file) as im:im.load();row.update(decoded=True,format=im.format,width=im.width,height=im.height,dimensionsMatch=(im.width==i['width'] and im.height==i['height']))
   except Exception as e:row.update(decoded=False,error=str(e)[:100])
   if not all(row.get(k) for k in ['shaMatches','byteCountMatches','decoded','dimensionsMatch']) or row['mode']!='0o600':errors.append({'sha256':i['sha256'],'error':'byte/decode/mode verification failed'})
  i['fileVerification']=row
 for k in ['pageUrl','imageUrl']:
  u=urlparse(i[k]);assert u.scheme=='https' and u.netloc and not u.username and not u.password
 row['sourceURLShapeValid']=True;checks.append(row)
 i['selected']=False
 assert i['shotType']!='unclassified'
index=[]
for gid,g in m['games'].items():
 imgs=[i for i in m['images'] if i['gameId']==gid or gid in i.get('alsoFor',[])]
 eligible=[i for i in imgs if i.get('retained') and i['shotType'].startswith('physical') and i['usable'] in ['yes','partial'] and i.get('fileVerification',{}).get('decoded')]
 # Broad actual-table/layout evidence is preferred, without inferring edition correctness.
 rank=lambda i:(i['usable']=='yes',i['shotType']=='physical-play',bool(i.get('visible',{}).get('publicBoard')),i['width']*i['height'])
 selected=sorted(eligible,key=rank,reverse=True)[:3]
 for i in selected:i['selected']=True
 g['status']='found' if any(i['usable']=='yes' for i in selected) else 'partial' if selected else 'missing'
 g['missingReason']=None if selected else 'No retained visually reviewed physical play/setup evidence; searched public galleries may contain only unsuitable images.'
 if g['status']=='partial':g['partialReason']='근접/일부영역·가독·커스텀/판본 제한으로 전체 플레이상태 자료는 부족; 개별 readLimits 참조.'
 else:g.pop('partialReason',None)
 g['photoScope']='photographic reference availability only, NOT edition/ground-truth/recognition validation'
 g['bggIdentity']={k:v for k,v in next(x for x in bgg if x['gameId']==gid).items() if k in ['bggId','name','year','subtype','status','url','at']}
 g['editionReview']='Exact target printing/expansion match still requires game-specific source review; gallery identity alone does not establish edition.'
 g['selectedPhotoSHA256']=[i['sha256'] for i in selected]
 for i in eligible:
  if i.get('visible',{}).get('privateHand'):i['publicInputCaution']='Visual personal area/front-hand mixed in photo; rule privacy must be checked before public AI use.'
 row={'gameId':gid,'title':g['name_ko'],'targetEdition':g['edition'],'bggId':g['bggId'],'status':g['status'],'selected':[{k:i.get(k) for k in ['sha256','localPath','pageUrl','imageUrl','width','height','shotType','usable','edition','editionCertainty','visible','readLimits','visualReview','publicInputCaution']} for i in selected],'candidateCount':len(imgs),'retainedCount':sum(bool(i.get('retained')) for i in imgs),'editionMatch':'unverified','groundTruthValidated':False,'realModelTested':False}
 index.append(row)
assert not errors,errors
p.write_text(json.dumps(m,ensure_ascii=False,indent=1)+'\n');(D/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=1)+'\n')
totals=dict(collections.Counter(g['status'] for g in m['games'].values()));report={'games':120,'uniqueGameIds':120,'images':len(m['images']),'retainedFiles':sum(c['retained'] for c in checks),'verifiedRetainedBytes':sum(c.get('bytes',0) for c in checks),'selectedImages':sum(i['selected'] for i in m['images']),'statuses':totals,'classificationProvenance':dict(collections.Counter(i['visualReview']['reviewer'] for i in m['images'])),'bggIdentityChecks':{'total':len(bgg),'http200':sum(x.get('status')==200 for x in bgg),'claim':'game family/name/year metadata only, not photo edition proof'},'errors':errors,'realModelCalls':0,'gtValidatedGames':0,'files':checks}
(D/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n')
(D/'checkpoint.json').write_text(json.dumps({'updatedAt':'2026-10-23','phase':'Sol1 fallback collection and metadata validation complete','done':list(m['games']),'next':'Astra edition/GT suitability review; no real model tests performed','privateDir':str(private),'statuses':totals,'sourceCaution':'found means retained physical reference, not edition-matched GT','errors':errors},ensure_ascii=False,indent=1)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False,indent=2))
