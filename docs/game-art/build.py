"""Build static, inspectable art and mappings. Run --limit 20,40,...,120 for checkpoints."""
import argparse, collections, hashlib, json, math, pathlib, re, xml.etree.ElementTree as ET
from html import escape
import draw as D
import specials as S
import confirmed_shapes as C
import fidelity as F

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'public/game-art'; DOC=ROOT/'docs/game-art'; SPECS=ROOT/'docs/research/game-specs-120/games'
ET.register_namespace('', 'http://www.w3.org/2000/svg')
NS='{http://www.w3.org/2000/svg}'
ASSETS={}; BODIES={}; GAMES=[]; COMMON_BODY_IDS={}
LABELS={'wood':'목재','stone':'석재','metal':'금속','grain':'곡물','water':'물','fish':'생선','coal':'석탄','brick':'벽돌','coin':'동전','gem':'보석','crystal':'수정','tree':'나무','leaf':'잎','book':'책','shield':'방패','sword':'검','portrait':'인물','planet':'행성','star':'별','target':'목표','gear':'기술','flame':'불꽃','heart':'체력','skull':'위험','moon':'밤','bolt':'에너지','bird':'새','cat':'고양이','bear':'곰','fox':'여우','elk':'사슴','cattle':'소','camel':'낙타','building':'건물','castle':'성','factory':'시설','boat':'배','ship':'함선','train':'열차','car':'차량','mech':'메크','telescope':'망원경','beetle':'곤충','spider':'거미','toad':'양서류','bat':'박쥐','egg':'알','crown':'왕관','flower':'꽃','honey':'꿀','bee':'벌','scroll':'두루마리','hammer':'망치','hourglass':'시간','staff':'마법','tent':'야영지','cave':'동굴','pollen':'꽃가루','cloth':'직물','seed':'씨앗','berry':'열매','bread':'빵','wine':'와인','grape':'포도','ear':'소음','eye':'정보','barrel':'통','unknown':'미확인','cube':'큐브','worker':'일꾼','pawn':'말','disk':'원반','die':'주사위','standee':'스탠디','sheet':'기록지','rack':'받침대','bag':'주머니','cone':'원뿔','ring':'부착 링','dial':'다이얼','envelope':'봉투','token':'토큰','card':'카드','piece':'조각','tile':'타일','board':'구역','special':'전용'}

LABELS.update(json.loads((DOC/'labels.json').read_text()))
CONFIRMED=json.loads((DOC/'confirmed-components.json').read_text()) if (DOC/'confirmed-components.json').exists() else {}

def svg_id(id):return 'ga--'+id.replace('.','--')
def sha(data):return hashlib.sha256(data).hexdigest()
def write_json(path,obj):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def add(id,label,body,classification='common',source=None,filename=None):
 if id in ASSETS:return id
 if classification=='common':
  fingerprint=sha(body.encode())
  if fingerprint in COMMON_BODY_IDS:return COMMON_BODY_IDS[fingerprint]
  COMMON_BODY_IDS[fingerprint]=id
 own='--owner' in body
 filename=filename or ('common/'+id.split('.',1)[1]+'.svg' if classification=='common' else 'games/'+id.split('.')[0]+'/'+'.'.join(id.split('.')[1:])+'.svg')
 record={'asset_id':id,'label':label,'classification':classification,'file':filename if classification!='existing' else source,'viewBox':'0 0 120 120','owner_color_supported':own,'source_reference':source,'art_claim':'original representative preset; not a printed component ID' if classification!='existing' else 'existing art reference; no new standalone copy'}
 ASSETS[id]=record;BODIES[id]=body
 if classification!='existing':
  file=OUT/filename;file.parent.mkdir(parents=True,exist_ok=True)
  file.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="{escape(label,quote=True)}"><title>{escape(label)}</title><g id="{svg_id(id)}">{body}</g></svg>\n')
 return id

def common(name):
 id='common.'+name
 if id in ASSETS:return id
 if name.startswith('symbol-'):body=D.symbol(name[7:]);label=LABELS.get(name[7:],name[7:])
 elif name.startswith('terrain-'):body=D.terrain(name[8:]);label=LABELS.get(name[8:],name[8:])+' 공통 대표형'
 elif name.startswith('preset-'):
  value=name[7:];body=S.board('quilt') if value=='quilt' else S.draw(value);label=LABELS.get(value,value)+' 공통 대표형'
 elif name.startswith('piece-'):
  kind=name[6:]
  if kind=='spy':body=D.group(D.path('M26 108q4-41 20-53l-6-15 20-30 21 30-6 15q17 12 20 53Z',D.OWNER)+D.path('M45 42h30l-6 15H51Z',D.INK)+D.circle(54,48,2,D.CREAM)+D.circle(66,48,2,D.CREAM))
  else:
   body=D.symbol(kind)
   if kind not in ['egg','bell','scroll','dagger','candlestick','rope','wrench','hammer']:
    for material in [D.STONE,D.WOOD,D.GREEN,'#c7ad7d','#8da59c']:
     if f'fill="{material}"' in body:body=body.replace(f'fill="{material}"',f'fill="{D.OWNER}"',1);break
  label=LABELS.get(kind,kind)+' 조각'
 elif name.startswith('die-'):body=D.die(int(name[-1]));label='주사위 · 예시 눈 '+name[-1]
 elif name.startswith('area-'):body=D.area(name[5:]);label='구조 예시 · '+name[5:]
 elif name=='cube':body=D.cube();label='목재 큐브'
 elif name=='worker':body=D.worker();label='목재 일꾼'
 elif name=='pawn':body=D.pawn();label='목재 말'
 elif name=='disk':body=D.disk();label='목재 원반'
 elif name=='card-shell':body=D.card_shell();label='공통 카드 틀'
 elif name=='card-back':body=D.card_back();label='중립 카드 뒷면'
 elif name=='token-shell':body=D.token_shell();label='공통 토큰 틀'
 elif name=='board-shell':body=D.board_shell();label='공통 보드 틀'
 elif name=='unknown':body=D.unknown();label='미확인 구성물'
 elif name=='sheet':body=D.group(D.path('M24 9h59l19 20v82H24Z',D.CREAM)+D.path('M83 9v20h19','none')+''.join(D.rect(34,y,7,7,'none',1,stroke=D.INK,stroke_width='1.2')+D.path(f'M48 {y+4}h38','none',stroke='#a3ab8d',stroke_width='1.3') for y in [45,62,79,96]));label='빈 기록지'
 elif name=='bag':body=D.symbol('bag');label='보관 주머니'
 elif name=='envelope':body=D.group(D.rect(11,31,98,69,D.PAPER,4)+D.path('m12 33 48 36 48-36m-96 64 36-37m60 37L73 60','none')+D.rect(51,63,18,17,D.CORAL,5));label='비공개 봉투'
 elif name=='cone':body=D.group(D.shadow()+D.path('m60 14 40 83q-40 21-80 0Z',D.OWNER)+D.shade('M60 14v96q22-2 40-13Z')+D.shine('m53 39-23 53'));label='목재 원뿔'
 elif name=='ring':body=D.group(D.circle(60,63,43,D.OWNER)+D.circle(60,60,27,D.CREAM)+D.shine('M31 42q20-26 47-9'));label='대상에 부착하는 링'
 elif name=='rack':body=D.group(D.path('m11 91 15-55h81v54l-15 19H11Z',D.WOOD)+D.path('M11 91h81l15-55M92 91v18','none')+D.path('M23 81h74','none',stroke=D.CREAM,stroke_width='3')+D.grain('M23 98h58'));label='목재 받침대'
 elif name=='dial':body=D.group(D.circle(60,65,45,D.WOOD)+D.circle(60,59,45,D.PAPER)+D.circle(60,59,36,D.CREAM)+D.path('M60 59V25m0 34 24 18','none',stroke=D.INK,stroke_width='3')+D.circle(60,59,5,D.GOLD));label='값을 만드는 대신 위치를 기록하는 다이얼'
 elif name=='standee':body=D.group(D.shadow()+D.path('M32 97h56l10 13H22Z',D.STONE)+D.path('M39 97V60q0-16 21-16t21 16v37Z',D.PAPER)+D.circle(60,28,17,D.PAPER)+D.path('M48 57h24M40 92h41','none',stroke='#a1a78b',stroke_width='2'));label='인스턴스용 중립 스탠디'
 else:raise KeyError(name)
 return add(id,label,body)

def layer(id,transform=None):return {'asset_id':id,**({'transform':transform} if transform else {})}
def variant(expression,game,component):
 if ':' not in expression:
  if expression=='die':return [{'name':'눈 '+str(i)+' · 예시','layers':[layer(common('die-'+str(i)))],'example_face':i} for i in range(1,7)]
  return [{'name':LABELS.get(expression,expression),'layers':[layer(common(expression))]}]
 kind,value=expression.split(':',1)
 if kind=='confirmed':
  card_motifs={'occupation-card':'portrait','minor-card':'hammer','major-card':'factory','unrevealed-location':'building','loan-card':'coin','modifier-card':'sword','mortgage-card':'building','speed-card':'car'}
  if value in card_motifs:
   layers=variant('card:'+card_motifs[value],game,component)[0]['layers']
   if value in ['occupation-card','minor-card','major-card']:
    color={'occupation-card':'#c6a24f','minor-card':'#d28f56','major-card':'#bc6048'}[value]
    layers.append(layer(add('common.card-band-'+value,'카드 유형색 · '+value,D.group(D.rect(30,16,57,11,color,1)))))
   elif value=='modifier-card':layers.append(layer(add('common.modifier-overlay','보정 카드 유형 표시',D.group(D.path('M38 85h14m-7-7v14m17-7h15','none',stroke=D.INK,stroke_width='2')))))
   elif value=='unrevealed-location':layers.append(layer(add('common.unrevealed-overlay','미공개 장소 열쇠 구멍',D.group(D.circle(60,51,9,D.INK)+D.path('m55 57-4 18h18l-4-18Z',D.INK)))))
   elif value=='mortgage-card':layers.append(layer(add('common.mortgage-overlay','담보면 구분',D.group(D.path('M35 83h45','none',stroke=D.CORAL,stroke_width='6')))))
   return [{'name':value,'layers':layers}]
  if value=='encounter-back':
   return [{'name':value,'layers':[layer(common('card-back')),layer(add('common.encounter-back-band','중립 조우 뒷면 유형 표시',D.group(D.rect(28,75,51,11,D.CORAL,1))))]}]
  if value.startswith(('coin-','vp-')):
   number=value.split('-')[1];layers=[layer(common('token-shell')),layer(add('common.numeral-'+number,'값 '+number,D.text(number,60,74,32)))]
   if value.startswith('vp-'):layers.append(layer(common('symbol-star'),'translate(49 29) scale(.18)'))
   return [{'name':value,'layers':layers}]
  dedicated=value in {'voidfall-sector','timeline','neighborhood','street-link','pinecone-token','colony-ready','colony-spent','hex-room','obstacle-hex','element-board','initiative-strip','market-place','mosque-tile','demand-tile','journey-tile','monster-base','cauldron-board','probe-piece','galaxy-segment','map-endcap','power-place','magic-item','town-tile','oval-favor','bonus-scroll'}
  id=f'{game}.{component}.{value}' if dedicated else 'common.'+value
  return [{'name':value,'layers':[layer(add(id,value,C.draw(value),'dedicated' if dedicated else 'common'))]}]
 if kind in ['card','token']:
  title=LABELS.get(value,value)
  return [{'name':title+(' 카드' if kind=='card' else ' 표식'),'layers':[layer(common(kind+'-shell')),layer(common('symbol-'+value),'translate(28 23) scale(.55)' if kind=='card' else 'translate(30 30) scale(.5)')]}]
 if kind=='piece':return [{'name':LABELS.get(value,value)+' 조각','layers':[layer(common('piece-'+value))]}]
 if kind=='special' and value=='polyomino-set':
  shapes={((0,0),)};all_shapes=[]
  def norm(shape):
   candidates=[]
   for reflection in [1,-1]:
    for turns in range(4):
     points=[]
     for x,y in shape:
      x*=reflection
      for _ in range(turns):x,y=-y,x
      points.append((x,y))
     mx=min(x for x,y in points);my=min(y for x,y in points);candidates.append(tuple(sorted((x-mx,y-my) for x,y in points)))
   return min(candidates)
  for n in range(1,6):
   if n>1:shapes={norm(set(shape)|{(x+dx,y+dy)}) for shape in shapes for x,y in shape for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)] if (x+dx,y+dy) not in shape}
   all_shapes.extend(sorted(shapes))
  assert len(all_shapes)==21
  return [{'name':f'{len(shape)}칸 형태 {i+1}','layers':[layer(add(f'common.polyomino-{i+1:02}',f'{len(shape)}칸 폴리오미노 {i+1}',D.polyomino(shape)))],'occupied_cells':[list(p) for p in shape],'can_reflect':True} for i,shape in enumerate(all_shapes)]
 if kind=='tile':return [{'name':LABELS.get(value,value),'layers':[layer(common('terrain-'+value))]}]
 elif kind=='board' and value=='quilt':return [{'name':LABELS[value],'layers':[layer(common('preset-quilt'))]}]
 elif kind=='special' and value in ['word-card','room-doors','door']:return [{'name':LABELS[value],'layers':[layer(common('preset-'+value))]}]
 elif kind=='board':body=S.board(value)
 elif kind=='special' and value=='azul-mosaic':
  values=[]
  for i,color in enumerate(['#9db5b6','#c8ac64','#bd7f68','#68857b','#b2bf9a']):
   body=D.group(D.rect(20,24,80,80,'#a89d7a',3)+D.rect(20,19,80,80,color,3)+D.path('m60 30 11 18 19 11-19 11-11 18-11-18-19-11 19-11Z',D.CREAM,opacity='.75'))
   id=add(f'{game}.{component}.mosaic-{i+1}','유약 타일 · 아트 색상 예시 '+str(i+1),body,'dedicated')
   values.append({'name':f'색·무늬 예시 {i+1}','layers':[layer(id)],'semantic_color':color})
  return values
 elif kind=='special':body=S.draw(value)
 else:raise KeyError(expression)
 id=add(f'{game}.{component}.{value}',game+' · '+LABELS.get(value,value),body,'dedicated')
 return [{'name':LABELS.get(value,value),'layers':[layer(id)]}]

def namespace(body,prefix):
 ids=re.findall(r'\bid="([^"]+)"',body)
 for old in ids:
  new=prefix+'-'+old;body=body.replace('id="'+old+'"','id="'+new+'"').replace('url(#'+old+')','url(#'+new+')').replace('href="#'+old+'"','href="#'+new+'"')
 return body

def references(game,component):
 variants=[]
 if game=='catan':
  file=ROOT/'public/component-art-preview.svg';tree=ET.parse(file)
  nodes=[n for n in tree.iter() if n.get('data-art-kind')==component]
  if not nodes:raise ValueError('Existing Catan reference missing: '+component)
  seen=set()
  for n in nodes:
   v=n.get('data-art-variant','default')
   if v in seen:continue
   seen.add(v);id=f'existing.catan.{component}.{v}'
   body=''.join(ET.tostring(c,encoding='unicode') for c in n if c.tag!=NS+'title')
   body=namespace(body,svg_id(id))
   add(id,'기존 카탄 · '+component+' / '+v,body,'existing','public/component-art-preview.svg')
   if component in ['road','settlement','city','robber']:ASSETS[id]['owner_color_supported']=True
   variants.append({'name':v,'layers':[layer(id)],'adapter':{'module':'src/ComponentArt.tsx','export':'ComponentArt','props':{'kind':component,'variant':v}}})
 else:
  data=json.loads((ROOT/'docs/carcassonne-art-mapping.json').read_text())
  for item in data['assets']:
   if item['component_id']!=component:continue
   file=ROOT/item['file'];tree=ET.parse(file);id='existing.carcassonne.'+file.stem
   body=''.join(ET.tostring(c,encoding='unicode') for c in tree.getroot() if c.tag!=NS+'title')
   body=namespace(body,svg_id(id));add(id,'기존 카르카손 · '+file.stem,body,'existing',item['file'])
   if component in ['followers','score']:ASSETS[id]['owner_color_supported']=True
   variants.append({'name':file.stem,'layers':[layer(id)],'adapter':{'module':'src/CarcassonneArt.tsx','export':'CarcassonneArt','props':item['props']}})
 return variants

def compose(variants,size=64,css='',label=''):
 css=css or ('--owner:'+variants['color'] if variants.get('color') else '')
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="{size}" height="{size}" class="art" style="{css}" role="img" aria-label="{escape(label,quote=True)}"><title>{escape(label)}</title>'+''.join(f'<g'+(f' transform="{x["transform"]}"' if x.get('transform') else '')+f'><use href="#{svg_id(x["asset_id"])}"/></g>' for x in variants['layers'])+'</svg>'

def sprite():return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>'+''.join(f'<g id="{svg_id(id)}">{body}</g>' for id,body in BODIES.items())+'</defs></svg>'

def representative(limit):
 """One bounded sheet per 20-game checkpoint, never a hundred-meter page."""
 selected=GAMES[max(0,limit-20):limit]
 columns=4;rows=math.ceil(len(selected)/columns);height=160+rows*226+270
 b=f'<rect width="1440" height="{height}" fill="#f8f5eb"/><g fill="{D.INK}" font-family="-apple-system,Arial,sans-serif"><text x="56" y="52" font-size="15" letter-spacing="3">KEEPBOARD / GAME ART</text><text x="56" y="103" font-size="36">구성물 대표형 · {limit-19:03}–{limit:03}</text><text x="1384" y="100" font-size="15" text-anchor="end">독자 벡터 · 실제 수량/배치 아님</text>'
 for i,game in enumerate(selected):
  x=56+(i%columns)*344;y=155+(i//columns)*226
  b+=f'<g transform="translate({x} {y})"><path d="M0 0h304" stroke="#d8d9c8"/><text x="0" y="32" font-size="18" font-weight="600">{escape(game["name_ko"])}</text><text x="0" y="54" font-size="11" fill="#7c846e">{escape(game["game_id"])}</text>'
  reps=[c['variants'][0] for c in game['components'] if c['status']!='unclear']
  if not reps:reps=[game['components'][0]['variants'][0]]
  if len(reps)<3 and game.get('area_preview'):reps.append(game['area_preview'])
  for j,v in enumerate(reps[:3]):b+=f'<g transform="translate({j*96} 73)">'+compose(v,88,label=v['name'])+'</g>'
  gap=sum(c['status']=='unclear' for c in game['components']);b+=f'<text x="0" y="191" font-size="12" fill="#7c846e">{len(game["components"])}분류 · 미확인 {gap} · 대표형 미리보기</text></g>'
 y=height-255
 b+=f'<path d="M56 {y}h1328" stroke="#d8d9c8"/><text x="56" y="{y+42}" font-size="23">24 / 32 / 48 / 64px · 같은 재료, 소유색 변형</text>'
 v={'layers':[layer(common('worker'))]}
 for i,size in enumerate([24,32,48,64]):b+=f'<g transform="translate({70+i*142} {y+141-size})">'+compose(v,size,label=f'{size}px 목재 말')+f'<text y="{size+28}" font-size="14">{size}px</text></g>'
 for i,color in enumerate(['#bc6048','#61879d','#63825c','#c6a24f']):b+=f'<g transform="translate({768+i*126} {y+77})">'+compose(v,64,css='--owner:'+color,label='소유색 예시')+f'<circle cx="32" cy="91" r="6" fill="{color}"/></g>'
 b+=f'<text x="56" y="{height-24}" font-size="13" fill="#7c846e">작은 크기 식별·실물 인식 정확도 보장 아님 · 미확인 명세는 물음표 유지 · 기존 카탄/카르카손은 원본 참조</text></g>'
 defs=''.join(f'<g id="{svg_id(id)}">{body}</g>' for id,body in BODIES.items())
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 {height}" width="1440" height="{height}" role="img" aria-label="{limit}종 체크포인트 대표 시트"><title>KeepBoard {limit}종 아트 체크포인트</title><defs>{defs}</defs>{b}</svg>'

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=120);args=parser.parse_args();limit=args.limit
 assert limit in [20,40,60,80,100,120]
 directions=json.loads((DOC/'directions.json').read_text());files=sorted(SPECS.glob('*.json'));assert len(files)==120
 for p in files[:limit]:
  data=p.read_bytes();spec=json.loads(data);game=spec['game_id'];plan=directions[game]
  result={'game_id':game,'name_ko':spec['name_ko'],'name_en':spec['name_en'],'edition':spec['edition'],'source_spec':str(p.relative_to(ROOT)),'source_sha256':sha(data),'art_scope':'representative-original-presets; never an exhaustive printed inventory','components':[],'areas':spec['layout']['areas'],'gaps':[]}
  for c in spec['components']:
   v=[];status='not-made';gap=None
   if game in ['catan','carcassonne']:v=references(game,c['id']);status='existing-reference'
   elif c['confidence']=='unclear':v=[{'name':'미확인 · 앞면/종류 추정 안 함','layers':[layer(common('unknown'))]}];status='unclear';gap='명세 confidence=unclear; 구체적인 부품 형태/면/세부 종류는 확정하지 않음.'
   elif game+':'+c['id'] in CONFIRMED:
    for preset in CONFIRMED[game+':'+c['id']]['variants']:
     made=variant(preset['expression'],game,c['id'])
     for i,item in enumerate(made):item['name']=preset['name']+(f' · 눈 {i+1} 예시' if len(made)>1 else '');v.append(item)
    classes={ASSETS[x['asset_id']]['classification'] for x0 in v for x in x0['layers']}
    status='mixed' if 'dedicated' in classes and 'common' in classes else 'dedicated' if 'dedicated' in classes else 'common-reuse'
   elif c['id'] in plan:
    for expression in plan[c['id']].split():v+=variant(expression,game,c['id'])
    classes={ASSETS[x['asset_id']]['classification'] for x0 in v for x in x0['layers']}
    status='mixed' if 'dedicated' in classes and 'common' in classes else 'dedicated' if 'dedicated' in classes else 'common-reuse'
   else:raise ValueError('Unmade component '+game+':'+c['id'])
   if c['kind']=='unknown':status='unclear';gap='명세 자체의 미확인 부품; 기존 미확인 아트 참조.'
   owner=any(ASSETS[x['asset_id']]['owner_color_supported'] for x0 in v for x in x0['layers']) and c['kind'] not in ['card','tile','board','sheet','terrain','resource-card','development-card']
   color_role='owner' if owner else 'fixed-semantic'
   if (game,c['id']) in [('five-tribes','tribes'),('blokus','pieces')]:color_role='physical-type-color; owner is separate'
   if game=='five-tribes' and c['id']=='tribes':
    owner=False
    v=[{'name':name+' 부족 · 유형색','color':color,'layers':[layer(common('worker'))]} for name,color in [('노랑','#c6a24f'),('빨강','#bc6048'),('파랑','#61879d'),('초록','#63825c'),('흰색','#eee1c5')]]
   override=CONFIRMED.get(game+':'+c['id'])
   if override:owner=override['owner_color_supported'];color_role=override['color_role']
   entry={'component_id':c['id'],'name':c['name'],'kind':c['kind'],'source_confidence':c['confidence'],'source_description':c['description'],'status':status,'variants':v,'variant_count_is_quantity':False,'source_quantity':c['quantity'],'quantity_display':{'source':'runtime observed quantity only','null':'?','zero':'0','art_stack_layers':'material depth only'},'rotation':{'center':[60,60],'allowed':'runtime direction; reflects only when scene/spec permits'},'color_role':color_role,'owner_color_supported':owner,'gap':gap,'preset_inventory_limit':'Representative type silhouettes only; subtype identity/count and commercial printed face inventory not established.'}
   if c['kind']=='card':entry['hidden_layers']=[layer(common('unknown') if status=='unclear' else common('card-back'))]
   if override:
    entry['confirmation_status']='confirmed';entry['evidence_source_refs']=override['evidence_source_refs'];entry['source_location']=override['source_location']
    entry['preset_inventory_limit']='공식 근거로 확인한 대표 종류와 기록된 상태 의미만 반영했습니다. 모든 인쇄 변종·카드 앞면·실물 수량을 확정한 목록은 아닙니다.'
    if 'hidden_layers' in override:entry['hidden_layers']=override['hidden_layers']
   F.apply(game,entry,add,common)
   result['components'].append(entry)
   if gap:result['gaps'].append({'component_id':c['id'],'reason':gap})
  # One illustration of a primary spatial area, not an invented complete game map.
  known=[c for c in result['components'] if c['status'] not in ['unclear','not-made']]
  if game not in ['catan','carcassonne'] and known and result['areas']:
   area=result['areas'][0];topology=area['topology'];related=[c for c in known if c['component_id'] in area['component_ids']]
   layers=[layer(common('area-'+topology))] if related else [layer(common('unknown'))]
   for i,c in enumerate(related[:2]):
    for x in c['variants'][0]['layers']:
     transform=f'translate({15+i*48} 29) scale(.36)'+(' '+x['transform'] if x.get('transform') else '')
     layers.append(layer(x['asset_id'],transform))
   result['area_preview']={'name':area['name']+(' · 구조 예시' if related else ' · 미확인'),'area_id':area['id'],'layers':layers,'status':'common-layer-composition' if related else 'unclear','canonical_layout':False,'fixed_slot_count':area['fixed_slot_count'],'topology':topology,'limits':'Shared topology frame and referenced component assets only; no copied common objects. Actual locations, edges, cell counts and hidden facts come from scene data.'}
  else:result['area_preview']=None
  for area in result['areas']:
   area['art_reference']={'asset_id':common('area-'+area['topology']) if game not in ['catan','carcassonne'] else None,'use':'schematic zone only; source component geometry is independent','canonical_layout':False}
  GAMES.append(result);write_json(OUT/'games'/game/'mapping.json',result)
 # Ensure size/owner QA assets exist before serializing the sprite.
 common('worker');common('cube');common('card-shell');common('symbol-tree');common('unknown')
 write_json(OUT/'assets.json',{'viewBox':'0 0 120 120','assets':list(ASSETS.values()),'standalone_rule':'New SVGs are standalone; gallery compositions reuse common layers. Existing references point to originals.'})
 stats={'planned_games':120,'built_games':limit,'components':sum(len(g['components']) for g in GAMES),'statuses':dict(collections.Counter(c['status'] for g in GAMES for c in g['components'])),'asset_counts':dict(collections.Counter(a['classification'] for a in ASSETS.values())),'unmade_components':[],'unbuilt_game_ids':[p.stem for p in files[limit:]],'factual_game_support':False,'recognition_accuracy_verified':False}
 write_json(OUT/'coverage.json',stats);write_json(OUT/'games.json',{'games':GAMES})
 for n in range(20,limit+1,20):
  (OUT/'checkpoints'/f'{n:03}-representative.svg').write_text(representative(n))
 sheet=representative(limit)
 (OUT/'representative.svg').write_text(sheet)
 template=(DOC/'gallery-template.html').read_text()
 html=template.replace('<!--SPRITE-->',sprite()).replace('/*GAMES*/',json.dumps(GAMES,ensure_ascii=False).replace('</','<\\/')).replace('/*ASSETS*/',json.dumps(ASSETS,ensure_ascii=False).replace('</','<\\/')).replace('/*COVERAGE*/',json.dumps(stats,ensure_ascii=False))
 (OUT/'index.html').write_text(html)
 (OUT/'checkpoints'/f'{limit:03}-preview.html').write_text(f'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>KeepBoard {limit}종 체크포인트</title><style>body{{margin:0;background:#f8f5eb}}img{{display:block;width:1440px;max-width:100%;height:auto}}a{{font-family:sans-serif;color:#33483c;display:block;padding:16px}}</style><img src="{limit:03}-representative.svg" alt="{limit}종 구성물 아트 대표형"><a href="../index.html">전체 갤러리</a></html>')
 write_json(DOC/'checkpoints'/f'{limit:03}.json',stats)
 print(json.dumps(stats,ensure_ascii=False))

if __name__=='__main__':main()
