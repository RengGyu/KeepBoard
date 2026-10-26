"""Explicit approved F001–F020 presets; no inference from old saved variant names."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
findings=json.loads((ROOT/'docs/game-fidelity-audit/review/findings.json').read_text())
plans={}
def v(name,shape,color=None,value=None,motif=None,owner=False,**extra):
 return dict(name=name,shape=shape,color_role='owner' if owner else 'fixed-semantic',owner_color_supported=owner,**({'color':color} if color else {}),**({'value':value} if value is not None else {}),**({'motif':motif} if motif else {}),**extra)
def plan(id,game,component,variants,keep=()):
 f=next(x for x in findings if x['id']==id)
 plans[game+':'+component]=dict(finding_id=id,source_url=f['sourceURL'],source_location=f['page'],scope=f['evidenceValue'],variants=variants,keep_legacy_names=list(keep),legacy_policy='preserve name; unresolved unless explicitly retained, no migration')
red='#bc6048';blue='#61879d';green='#63825c';gold='#d5ac54';silver='#a8b1b3';white='#eee1c5';black='#333d42';purple='#8b6798';orange='#ce8a4c'
plan('F001','agricola','people',[v('가족 말 · 사람형','worker',owner=True)],keep=['울타리','외양간'])
plan('F002','anachrony','workers',[v('과학자 · 녹색','worker-tile',green,motif='flask'),v('기술자 · 노랑','worker-tile',gold,motif='hammer'),v('관리자 · 파랑','worker-tile',blue,motif='book'),v('천재 · 분홍','worker-tile','#c98f9d',motif='star'),v('외골격 · Path 소유색','hex',motif='mech',owner=True)])
plan('F003','dune-imperium-uprising','resources',[v('물','drop',blue),v('솔라리 · 1','coin',silver,value=1),v('솔라리 · 5','coin',silver,value=5),v('스파이스 · 1','hex',orange,value=1),v('스파이스 · 5','hex',orange,value=5),v('개인 점수·의회 원반','disk',owner=True)])
plan('F004','seven-wonders-duel','progress',[v('진보 토큰 · 녹색','coin',green,motif='gear'),v('군사 손실 · 2','military',red,value=2),v('군사 손실 · 5','military',red,value=5),v('분쟁 말 · 빨강','pawn',red)])
plan('F005','hansa-teutonica','bonus',[v(name,'coin',silver,value=num,motif=motif) for name,motif,num in [('교역소 추가','building',None),('교역소 교환','flag',None),('상인 3개 이동','pawn',3),('능력 개발','book',None),('행동 +3','bolt','+3'),('행동 +4','bolt','+4')]])
plan('F006','terraforming-mars','cubes',[v('자원 큐브 · 1','cube','#ad8055',value=1),v('자원 큐브 · 5','cube',silver,value=5),v('자원 큐브 · 10','cube',gold,value=10),v('개인 마커 큐브','cube',owner=True)])
plan('F007','terra-mystica','resources',[v('공용 일꾼 · 자연색','cube',white),v('공용 돈 · 1','coin',gold,value=1),v('공용 돈 · 2','coin',gold,value=2),v('공용 돈 · 5','coin',gold,value=5),v('공용 파워 · 보라','power',purple),v('사제 · 개인색','priest',owner=True)])
ships=[v('선박 타일 · '+name,'ship-tile',value=kind) for name,kind in [('포경선','whaling'),('크나르','knarr'),('롱십','longship')]]
animals=[]
for label,motif in [('양','sheep'),('소','cattle')]:
 for face in ['livestock','pregnant']:
  name='가축 타일 · '+label+(' · 임신' if face=='pregnant' else '')
  back='가축 타일 · '+label+('' if face=='pregnant' else ' · 임신')
  animals.append(v(name,'animal-tile',value=face,motif=motif,back_variant=back))
plan('F008','a-feast-for-odin','ships',ships+animals+[v('은화 · '+str(n),'coin',silver,value=n) for n in [1,2,4,10]])
plan('F009','castles-burgundy','money',[v('공용 은화','coin',silver,motif='coin'),v('공용 일꾼 토큰','hex','#81a6a6',motif='worker'),v('순서 말 · 개인색','disk',owner=True),v('승점 말 · 개인색','counter',motif='star',owner=True)])
plan('F010','sagrada','dice',[v(label+' · '+str(face),'die',color,value=face,face_value=face) for label,color in [('빨강',red),('노랑',gold),('초록',green),('파랑',blue),('보라',purple)] for face in range(1,7)])
plan('F011','sagrada','tokens',[v('호의 토큰 · 흰색','disk','#fff9e9'),v('점수 말 · 창틀색','coin',motif='flower',owner=True)])
plan('F012','king-of-tokyo','dice',[v(('기본 검정' if kind=='base' else '추가 초록')+' · '+str(face),'tokyo-number' if isinstance(face,int) else 'die',color,value=face,die_type=kind,face_value=face) for kind,color in [('base',black),('extra','#82a646')] for face in [1,2,3,'energy','claw','heart']])
plan('F013','tiny-towns','resources',[v(label,'cube',color) for label,color in [('목재 · 갈색','#825e4d'),('밀 · 노랑',gold),('벽돌 · 빨강',red),('유리 · 청록','#489d9e'),('돌 · 회색',silver)]])
plan('F014','tiny-towns','buildings',[v(label,'tiny-'+kind,color) for label,kind,color in [('오두막','cottage','#489d9e'),('예배당','chapel','#d69b4f'),('농장','farm',red),('선술집','tavern',gold),('우물','well',silver),('극장','theater','#825e4d'),('공장','factory',blue),('기념물','monument',purple)]])
plan('F015','seven-wonders','military',[v('군사 '+str(n),'coin' if n==-1 else 'military',red if n==-1 else '#3b4541',value=n) for n in [-1,1,3,5]])
plan('F016','twilight-imperium-4','trade',[v('교역품 면','trade','#b39757',motif='coin',back_variant='상품 면'),v('상품 면','trade','#486879',motif='cube',back_variant='교역품 면')])
plan('F017','azul','first',[v('선플레이어 표식 · 1','first')])
plan('F018','age-of-innovation','map',[v('지형 · '+name,'terrain',color,motif=motif) for name,color,motif in [('호수',blue,'water'),('숲',green,'tree'),('황무지',red,'stone'),('사막',gold,'sun'),('평원','#a38c65','grain'),('늪','#48525b','water'),('산',silver,'stone')]]+[v('건물 · 개인색','building',owner=True),v('다리 · 개인색','bridge',owner=True)])
plan('F019','twilight-struggle','markers',[v('공용 턴','counter',gold,motif='hourglass'),v('공용 VP','counter',gold,motif='star'),v('공용 DEFCON','counter',gold,motif='target')]+[v(label+' · '+kind,'counter',color,motif=motif) for label,color in [('US',blue),('USSR',red)] for kind,motif in [('영향력','flag'),('우주','satellite'),('군사작전','shield')]])
plan('F020','power-grid','money',[v('Elektro 지폐 · '+str(n),'bill',color,value=n) for n,color in [(1,'#d1c182'),(5,'#aab995'),(10,'#c29aa7'),(50,'#b8a48a')]]+[v('순서·연결수 집 · 개인색','building',owner=True)])
assert len(plans)==20
(ROOT/'docs/game-art/fidelity-corrections.json').write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n')
print('20 approved component inputs')
