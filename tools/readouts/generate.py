#!/usr/bin/env python3
"""Reproducible additive readout artifacts. Never edits pinned research/gamepacks/art.
Run from repository root: python tools/readouts/generate.py --report-dir ../result
Inputs are copies of the supplied targets manifest and explicitly reviewed field profiles.
This is not a rule or image recognizer and makes no game-completeness claim.
"""
from pathlib import Path
from collections import defaultdict
import json, argparse, hashlib, re
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
MAX_SAFE=9007199254740991
PROFILE_DELTAS={'new_components_with_visible_base_fields':[],'retired_component_profiles':[]}

def write_json(path, data):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def text(path, value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(value)
def typename(s):return ''.join(w.capitalize() for w in re.split(r'[^a-zA-Z0-9]',s) if w)
# Authoring choices, not rules. Every game remains independently identified and source-pinned.
GROUPS={
'01-spatial-tiles':'''carcassonne azul akropolis blokus calico cascadia castles-mad-ludwig galaxy-trucker isle-of-cats kingdomino patchwork sagrada tiny-towns'''.split(),
'02-cards-tableau':'''bohnanza dominion everdell forest-shuffle halligalli love-letter lost-cities machi-koro race-for-the-galaxy res-arcana scout seven-wonders seven-wonders-duel six-nimmt splendor-duel star-realms wingspan wyrmspan dobble'''.split(),
'03-workers-economy':'''a-feast-for-odin agricola anachrony apiary barrage brass-birmingham castles-burgundy caverna concordia grand-austria-hotel great-western-trail hansa-teutonica istanbul kanban-ev le-havre orleans power-grid stone-age underwater-cities viticulture'''.split(),
'04-hidden-social':'''avalon clue cockroach-poker codenames coup crew-deep-sea davinci-code dixit hanabi jaipur just-one skull'''.split(),
'05-campaign-combat':'''aeons-end arkham-horror-3 arkham-lcg charterstone descent-legends-dark eldritch-horror frosthaven gloomhaven-jaws gloomhaven imperial-assault journeys-middle-earth lotr-lcg mage-knight mansions-madness-2 marvel-champions nemesis paleo pandemic-legacy-1 pandemic robinson-crusoe sleeping-gods'''.split(),
'06-maps-tracks':'''age-of-innovation arcs ark-nova clank-catacombs dominant-species dune-imperium-uprising eclipse-second-dawn expeditions five-tribes gaia-project heat king-of-tokyo lost-ruins-arnak monopoly quacks root scythe seti small-world space-base spirit-island star-wars-outer-rim star-wars-rebellion tapestry terra-mystica terraforming-mars through-the-ages ticket-to-ride twilight-imperium-4 twilight-struggle voidfall war-of-the-ring-2'''.split()
}
TYPES={'t':'text','i':'integer','s':'integer','b':'boolean','m':'marks','p':'player'}
# Bounds below are source-explicit, not guesses from a generic component silhouette.
ENUM_OVERRIDES={
 ('seti','probes','role'):[('probe','탐사선'),('orbiter','궤도선'),('lander','착륙선')],
 ('wyrmspan','resources','resourceType'):[('egg','알'),('coin','동전'),('meat','고기'),('gold','금'),('crystal','수정'),('milk','우유')],
 ('race-for-the-galaxy','points','nominalValue'):[(1,'1점'),(5,'5점'),(10,'10점')],
 ('machi-koro','coins','nominalValue'):[(1,'1'),(5,'5'),(10,'10')],
 ('scout','cards','activeEnd'):[('top','위쪽 숫자'),('bottom','아래쪽 숫자')],
 ('forest-shuffle','cards','usedSection'):[('whole','전체'),('top','상단'),('bottom','하단'),('left','왼쪽'),('right','오른쪽')]
}
BOUNDS={('hanabi','cards','number'):(1,5),('codenames','words','row'):(1,5),('codenames','words','column'):(1,5)}
# Photo colour is not ownership. Exact lists only where current source explicitly supplies the types.
SOURCES_CHECKED={
 'carcassonne':{'status':'official-partial','checkedAt':'2026-10-22','sources':[{'url':'https://www.zmangames.com/game/carcassonne/','verified':'도시·도로·수도원·들판; River/Abbot 별도 모듈'},{'url':'https://cdn.svc.asmodee.net/production-zman/uploads/2024/09/carcassonne_v3_supplement_en.pdf','page':1,'verified':'누운 농부와 도로·도시 등에 의해 분리되는 들판. PDF 텍스트와 1쪽 이미지 확인.'}],'unverified':['전체 타일 인쇄 목록','모든 점수·완성 조건','River/Abbot 확장 전체','기본 규칙 PDF 전문(구형 URL502, 신형 파일 크기 제한)']},
 'scout':{'status':'official-partial','checkedAt':'2026-10-22','sources':[{'url':'https://oinkgames.com/en/games/analog/scout/','verified':'손패 재정렬 금지; 카드의 두 숫자. 공개 상품 설명만 읽음.'}],'unverified':['전체 룰북','인쇄 숫자 범위','판본별 모든 카드 목록']},
 'sagrada':{'status':'attachment-only','checkedAt':'2026-10-22','sources':[],'attempted':[{'url':'https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf','result':'fetch timeout'}],'unverified':['룰북 재열람 실패; 주사위 눈 상한을 추측해 추가하지 않음','인쇄 패턴 전체']},
 'seti':{'status':'attachment-only','checkedAt':'2026-10-22','sources':[],'attempted':[{'url':'https://filemanager.czechgames.com/storage/files/seti-search-for-extraterrestrial-intelligence/rules/seti-rules-en.pdf','result':'21MB 도구 크기 제한'}],'unverified':['회전층 세부 규칙 재검증','게임 전체 자동 연결·진행']}
}

def read_profiles():
    result={}
    for line_no,line in enumerate((HERE/'profiles.tsv').read_text().splitlines(),1):
        if not line.strip() or line.startswith('#'):continue
        ident,content=line.strip().split('|',1)
        if ident in result:raise ValueError(f'duplicate component profile line{line_no}: {ident}')
        fs=[];keys=set()
        for item in content.split(';'):
            key,kind,label,*mode=item.strip().split(':')
            if key in keys:raise ValueError(f'duplicate property {ident}/{key}')
            keys.add(key)
            f={'id':key,'type':TYPES[kind],'label':label,'acquisition':'manual' if mode==['M'] else 'visible'}
            if kind=='i':f['min']=0
            if kind=='p' and f['acquisition']!='manual':raise ValueError('player ID must be manual')
            fs.append(f)
        result[ident]=fs
    return result

def prop(key,label,type_,desc,**kwargs):return {'id':key,'label':label,'type':type_,'acquisition':'visible','sourceText':desc,**kwargs}
def base_fields(c):
    desc=c['description']
    if c['kind'] in ['card','tile']:
        return [prop('face','보이는 면','enum','앞면을 보지 못하면 앞면 상세는 미확인. 기존 명세의 face 보존.',options=[{'value':'front','label':'앞면'},{'value':'back','label':'뒷면'}]),prop('printedName','읽히는 인쇄 표기','text',desc,faceOnly=True)]
    if c['kind'] in ['board','sheet']:
        return [prop('printedName','읽히는 판 표기','text',desc),prop('sideLabel','사용 면 표기','text',desc)]
    return [prop('observedColor','사진에서 본 색·재질','text','관측 색은 소유자 ID나 자원 가치로 자동 변환하지 않는다. '+desc)]

def build_game(g,profiles):
    gid=g['gameId'];batch=next((k for k,ids in GROUPS.items() if gid in ids),None)
    if batch is None:raise ValueError('batch missing '+gid)
    if gid=='carcassonne':
        d=json.loads((HERE/'carcassonne.seed.json').read_text());d.update(batch=batch,sourceSHA=g['sourceSHA'],packVersion=g['packVersion'],editionId=g['editionId']);return d
    components=[]
    for c in g['components']:
        ident=gid+'/'+c['id']
        if ident not in profiles:PROFILE_DELTAS['new_components_with_visible_base_fields'].append(ident)
        extras=profiles.pop(ident,[])
        source=c['description']
        fields={f['id']:f for f in base_fields(c)}
        for original in extras:
            f=dict(original);f['sourceText']=source
            if f['acquisition']=='manual':f['sourceText']+=' · 앱의 직접 확인 입력. 사진/규칙으로 과거·의도·소유·미관측 관계를 자동 결정하지 않는다.'
            if c['kind'] in ['card','tile'] and f['acquisition']=='visible' and f['id'] not in ['backCue','face']:f['faceOnly']=True
            key=(gid,c['id'],f['id'])
            if key in ENUM_OVERRIDES:
                f['type']='enum';f.pop('min',None);f['options']=[{'value':v,'label':l} for v,l in ENUM_OVERRIDES[key]]
            if key in BOUNDS:f['min'],f['max']=BOUNDS[key]
            fields[f['id']]=f
        components.append({'id':c['id'],'name':c['name'],'kind':c['kind'],'description':source,'fields':list(fields.values())})
    return {'gameId':gid,'runtimePackId':g['runtimePackId'],'schema':gid+'-v1','editionId':g['editionId'],'sourceSHA':g['sourceSHA'],'packVersion':g['packVersion'],'title':g['title'],'batch':batch,'sourceVerification':SOURCES_CHECKED.get(gid,{}).get('status','attachment-only'),'components':components}

def value_type(f):
    if f['type']=='enum':t=' | '.join(json.dumps(o['value'],ensure_ascii=False) for o in f['options'])
    else:t={'text':'string','integer':'number','boolean':'boolean','marks':'SymbolValue[]','features':'LocalFeature[]','reference':'PieceReference','player':'string'}[f['type']]
    return t+' | null'

def schema_for_field(f):
    t=f['type']
    if t in ['text','player']:s={'type':'string','minLength':1,'maxLength':160,'pattern':r'\S'}
    elif t=='integer':s={'type':'integer','minimum':f.get('min',-MAX_SAFE),'maximum':f.get('max',MAX_SAFE)}
    elif t=='boolean':s={'type':'boolean'}
    elif t=='enum':s={'enum':[o['value'] for o in f['options']]}
    elif t=='marks':s={'type':'array','maxItems':32,'items':obj({'symbol':{'type':'string','minLength':1,'maxLength':64},'value':{'type':['integer','null'],'minimum':0,'maximum':MAX_SAFE}})}
    elif t=='features':s={'type':'array','maxItems':32,'items':obj({'id':{'type':'string','minLength':1,'maxLength':80},'kind':{'enum':[None,'city','road','field','monastery','other']},'label':{'type':'string','maxLength':120},'x':{'type':['number','null'],'minimum':0,'maximum':1},'y':{'type':['number','null'],'minimum':0,'maximum':1}})}
    elif t=='reference':s=obj({'pieceId':{'type':'string','minLength':1,'maxLength':160},'featureId':{'type':['string','null'],'minLength':1,'maxLength':80}})
    return {'anyOf':[{'type':'null'},s]}
def obj(properties):return {'type':'object','properties':properties,'required':list(properties),'additionalProperties':False}
def make_schema(d):
    variants=[]
    for c in d['components']+[{'id':None,'fields':[]}]:
        v=obj({'schema':{'const':d['schema']},'kind':{'const':c['id']},'values':obj({f['id']:schema_for_field(f) for f in c['fields']}),'sources':obj({f['id']:{'enum':[None,'user']+(['observation'] if f['acquisition']=='visible' else [])} for f in c['fields']})})
        v['allOf']=[]
        for f in c['fields']:
            v['allOf'].append({'if':{'properties':{'values':{'properties':{f['id']:{'const':None}}}}},'then':{'properties':{'sources':{'properties':{f['id']:{'const':None}}}}},'else':{'properties':{'sources':{'properties':{f['id']:{'enum':['user']+(['observation'] if f['acquisition']=='visible' else [])}}}}}})
            if f.get('faceOnly'):v['allOf'].append({'if':{'properties':{'values':{'properties':{'face':{'not':{'const':'front'}}}}}},'then':{'properties':{'values':{'properties':{f['id']:{'const':None}}}}}})
        if not v['allOf']:v.pop('allOf')
        variants.append(v)
    return {'$schema':'https://json-schema.org/draft/2020-12/schema','title':d['title']+' 선택적 상세','description':'새 readout 계약. 실제 player/evidence/field/관계 검증은 서버 validator가 추가로 수행. 중복 기호·좌표 쌍도 런타임 검사. 원본 gamepack을 수정하지 않음.','oneOf':variants}

def sample_value(f):
    t=f['type']
    if t=='enum':return f['options'][0]['value']
    if t in ['text']:return '합성 '+f['label']
    if t=='player':return 'synthetic-player'
    if t=='integer':return max(0,f.get('min',0))
    if t=='boolean':return False
    if t=='marks':return [{'symbol':'합성 기호','value':0},{'symbol':'확인 못한 값','value':None}]
    if t=='features':return [{'id':'synthetic-local-feature','kind':'field','label':'합성 시험 지형','x':None,'y':None}]
    return None

def build_fixture(g,d):
    entries=[]
    for c in d['components']:
        bindings=[b for b in g['bindings'] if c['id'] in b['componentIds'] and b['editor']=='component-catalog' and (b['visibility']=='public' and b['scope'] in ['public','player'] or b['visibility']=='owner' and b['scope']=='player')]
        if not bindings:entries.append({'componentId':c['id'],'collection':'blocked','reason':'원 binding이 사진/구성물 기록을 허용하지 않음. schema 존재가 수집 허가 아님.'});continue
        b=next((b for b in bindings if b['scope']=='public'),bindings[0]);owner='synthetic-player' if b['scope']=='player' else None
        fields=c['fields'];r={'schema':d['schema'],'kind':c['id'],'values':{f['id']:None for f in fields},'sources':{f['id']:None for f in fields}}
        filled=json.loads(json.dumps(r));ai=json.loads(json.dumps(r))
        for f in fields:
            v=sample_value(f);filled['values'][f['id']]=v;filled['sources'][f['id']]='user' if v is not None else None
            if f['acquisition']=='visible':ai['values'][f['id']]=v;ai['sources'][f['id']]='observation' if v is not None else None
        p={'id':'synthetic-'+c['id'],'componentId':c['id'],'variant':None,'quantity':1,'label':'합성 시험 실물 · '+c['name'],'anchor':'합성 위치 설명','evidenceId':'synthetic-photo','region':{'x':.1,'y':.1,'width':.2,'height':.2}}
        legacy={**p,'quantity':None};typed={**p,'readout':filled};unknown={**p,'readout':r};ai_piece={**p,'readout':ai}
        entries.append({'componentId':c['id'],'fieldKey':b['key'],'ownerId':owner,'scope':b['scope'],'visibility':b['visibility'],'collection':'enabled','legacy':legacy,'unknown':unknown,'typed':typed,'freshAI':ai_piece})
    return {'synthetic':True,'note':'자료형·저장 연결용 합성 예시. 공식 카드/부품·실제 경기/인식 성능의 정답이 아님.','gameId':g['gameId'],'players':[{'id':'synthetic-player','name':'합성 참여자','color':'#315a89'}],'evidenceIds':['synthetic-photo'],'entries':entries}

def build_doc(g,d,art,status):
    s=[f'# {g["title"]} — {g["gameId"]}',f'\n구현 범위: **source-grounded schema/forms**. 룰엔진·완전 자동 재개 보증 아님. 이 양식의 모든 항목은 값이 확보되기 전 null이다.',
       f'\n- runtimePackId: `{g["runtimePackId"]}`\n- edition: `{g["editionId"]}` / {g["edition"]}\n- pinned sourceSHA: `{g["sourceSHA"]}`\n- packVersion: `{g["packVersion"]}`\n- 신규 선택적 readout: `{d["schema"]}`\n- 묶음: `{d["batch"]}`',
       '\n## 출처와 확인 범위',f'이번 작업의 공식 재확인: `{status["status"]}`. 아래 첨부 출처 기록의 과거 checked_at과 이번 확인일을 혼동하지 않는다.']
    for r in g['sourceReferences']:s.append(f'- 첨부: {r.get("title")} / {r.get("url") or "내부 앱 보존 정책"} / {r.get("access")} / {r.get("checked_at")} / {r.get("note","")}')
    for r in status.get('sources',[]):s.append(f'- 이번 확인 {status["checkedAt"]}: {r["url"]} — {r["verified"]}')
    for a in status.get('attempted',[]):s.append(f'- 열람 시도: {a["url"]} — {a["result"]}')
    s+=['\n미확인: '+ '; '.join(status.get('unverified',['이번 작업에서 독립적인 공식 규칙 재열람 미실시','전체 카드·타일 목록 및 모든 특수효과','실사진 판독/실물 재개 성공률'])),
        '\n## 기존 binding (변경하지 않음)','|key / sourceId|영역|componentIds|scope / visibility|editor|','|---|---|---|---|---|']
    for b in g['bindings']:s.append(f'|`{b["key"]}` / `{b["sourceId"]}`|{", ".join(b["areaIds"]) or "—"}|{", ".join(b["componentIds"]) or "—"}|{b["scope"]} / {b["visibility"]}|{b["editor"]}|')
    s+=['\n## 게임별 필수 기존 상태','아래 항목은 원 stateFields의 수집 방식/공개 범위를 그대로 유지한다. 과거 처리·전략·덱 내부를 신규 판독에서 추정하지 않는다.','|원 필드|입력 방식|상태 의미|','|---|---|---|']
    for f in g['stateFields']:s.append(f'|`{f["id"]}` · {f["label"]}|{", ".join(f.get("acquisition",[]))} · {f["visibility"]}|{f["description"]}|')
    s+=['\n## 새 개별 관측·수정 양식','실물 개수는 항상 바깥 `quantity`. 아래 인쇄값·눈·점수·비용은 그 수량과 별개다. `null`=모름, `0`=직접 읽거나 확인한 0. 숫자 범위가 공식적으로 확인되지 않았으면 없는 상한을 만들지 않고 안전 정수 범위만 검증한다. 모양·색의 자유 표기는 자동 소유자·정답 매핑이 아니다.']
    for c in d['components']:
        s += [f'\n### `{c["id"]}` — {c["name"]}',c['description'],'|필드|타입·범위|관측/수정 조건|표시|','|---|---|---|---|']
        for f in c['fields']:
            bounds=(' ≥'+str(f['min']) if 'min'in f else '')+(' ≤'+str(f['max']) if 'max'in f else '')
            options=' / '.join(str(o['value'])+'='+o['label'] for o in f.get('options',[]))
            cond=('사진에서 읽힌 값 또는 직접 수정' if f['acquisition']=='visible' else '직접 확인만. AI는 null')+(' · 앞면 확인 필요' if f.get('faceOnly') else '')
            s.append(f'|`{f["id"]}` · {f["label"]}|{f["type"]}{bounds} 또는 null {options}|{cond}|{f["label"]} + 값 / 모름|')
    s+=['\n## 아트 재사용 및 SVG',f'기존 `public/game-art/games/{g["gameId"]}/mapping.json`을 그대로 사용. source SHA 일치: {art.get("source_sha256")==g["sourceSHA"]}. 기존 아트 종류는 실물 재고나 카드 정체의 정답 사전이 아니다.','새 commercial-face SVG 없음. 상태 숫자·기호는 공통 React/HTML 표시. 카르카손만 좌표·미플 연결 인덱스 추가.']
    for c in art.get('components',[]):s.append(f'- `{c["component_id"]}` → '+', '.join(v.get('name','') for v in c.get('variants',[]))+' · '+str(c.get('color_role','')))
    s+=['\n## 실물 보존·재개','다음은 원 보존 권고를 재사용한다. 디지털 원순서를 확인했다는 의미가 아니다.']
    for p in g['preservation']:s.append(f'- {p["id"]} / {p["label"]} / {p.get("method")} / orderSensitive={p.get("orderSensitive")} / externalOnly={p.get("externalOnly")}\n  '+ ' '.join(p.get('conditions',[])))
    s+=['\n## 연결 및 실패','`shared/readouts/catalog.ts` → strict validator → fresh-AI normalizer → `GameDetailReadout`/`GameDetailFields` → 기존 명시 적용/저장. JSON Schema는 보조 문서이며 실제 evidence·owner·field·관계 검증은 서버가 수행한다.',
         'readout 없는 기존 데이터는 자동 변환 없이 기존 label·원본으로 표시하고, 사용자가 상세 필드를 직접 수정할 때만 선택한 실물에 새 양식을 붙인다. 미지원/손상된 readout은 읽기 전용 경고로 남기며 빈 양식으로 조용히 덮어쓰지 않는다. 사진 관측 근거가 붙은 세부값은 다른 사진으로 재연결하지 않고 새 후보로 읽는다. 읽기·탭전환·상단저장은 후보를 수용하지 않는다. schema·source·판본 불일치는 상세 재해석을 중단하고 원자료를 남긴다. 수정 저장 실패 시 기존 상태를 지우지 않는다. 같은 모양의 별개 실물 ID·배열 순서·원label·crop·수동 placement를 보존한다.',
         '## 테스트 및 미실행',f'게임별 이름으로 실행되는 공통 테스트: `tests/game-readout-catalog.test.ts`, `tests/game-readout-fixtures.test.ts`. 합성 데이터: `tests/fixtures/readouts/{g["gameId"]}.json`. 런타임 strict·범위·null/0·원binding·AI 수동 주입·기존데이터 보존을 검사한다.',
         '전체 원앱 서버/PIN/동기화/snapshot·restore 실동작과 실사진 판독은 이 부분 snapshot에서 실행하지 못했다. 실제 결과와 exit는 최상위 검증 보고서 참조. 같은 schema에서 생성한 fixture 통과만으로 규칙 정확성을 주장하지 않는다. 수작업 독립 사례는 `carcassonne-readout.test.ts`와 `game-readout-semantic.test.ts` 참조.',
         '## 개입·지원 범위','자료형/입력 UI의 구현과 게임 완전 지원은 별도다. 실사용에서 자동 처리 / 자료 추가 / 게임팩 수정 / 별도 코드 필요 / 정보 확보 실패를 각각 기록한다. 자료 부족·비밀·미관측 이력은 성공으로 숨기지 않는다.']
    return '\n'.join(s)+'\n'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--report-dir',default='../result');args=ap.parse_args();report=(ROOT/args.report_dir).resolve()
    games=json.loads((HERE/'targets-117.source.json').read_text());profiles=read_profiles();assert len(games)==117
    # Source manifests are read, never rewritten.
    defs=[build_game(g,profiles) for g in games]
    for ident in profiles:
        if ident.split('/')[0] not in {g['gameId'] for g in games}:raise ValueError('profile contains unknown game: '+ident)
    PROFILE_DELTAS['retired_component_profiles']=sorted(profiles)
    write_json(report/'profile-deltas.json',PROFILE_DELTAS)
    buckets=defaultdict(dict)
    for d in defs:buckets[d['batch']][d['gameId']]=d
    for batch,items in sorted(buckets.items()):write_json(ROOT/'shared/readouts/catalogs'/f'{batch}.json',items)
    imports=[];names=[]
    for i,batch in enumerate(sorted(buckets)):imports.append(f"import batch{i} from './catalogs/{batch}.json';");names.append(f'...batch{i}')
    text(ROOT/'shared/readouts/catalog.ts',"// Generated from source-pinned per-component descriptors; do not edit the gamepack.\nimport type {GameReadoutDefinition} from './types.ts';\n"+'\n'.join(imports)+f"\nexport const GAME_READOUTS:Readonly<Record<string,GameReadoutDefinition>>={{{','.join(names)}}} as unknown as Record<string,GameReadoutDefinition>;\n")
    type_index=[];type_map=[]
    for g,d in zip(games,defs):
        name=typename(g['gameId'])+'Readout'
        pieces=[]
        for c in d['components']+[{'id':None,'fields':[]}]:
            values='; '.join(json.dumps(f['id'])+': '+value_type(f) for f in c['fields'])
            sources='; '.join(json.dumps(f['id'])+": "+("FieldBasis | null" if f['acquisition']=='visible' else "'user' | null") for f in c['fields'])
            pieces.append(f"{{schema:{json.dumps(d['schema'])};kind:{json.dumps(c['id'])};values:{{{values}}};sources:{{{sources}}}}}")
        text(ROOT/'shared/readouts/contracts'/f'{g["gameId"]}.ts',"// Generated discriminated type. Runtime validator additionally checks source, visibility, evidence and relations.\nimport type {FieldBasis,SymbolValue,LocalFeature,PieceReference} from '../types';\nexport type "+name+' =\n  '+ '\n | '.join(pieces)+';\n')
        type_index.append(f"import type {{{name}}} from './contracts/{g['gameId']}';\nexport type {{{name}}} from './contracts/{g['gameId']}';");type_map.append(f" {json.dumps(g['gameId'])}: {name};")
        fixture=build_fixture(g,d);write_json(ROOT/'tests/fixtures/readouts'/f'{g["gameId"]}.json',fixture);write_json(report/'fixtures'/g['gameId']/'source-shaped.json',fixture)
        write_json(report/'schemas'/f'{g["gameId"]}.schema.json',make_schema(d))
        art_path=ROOT/'public/game-art/games'/g['gameId']/'mapping.json';art=json.loads(art_path.read_text());status=SOURCES_CHECKED.get(g['gameId'],{'status':'attachment-only','checkedAt':None,'sources':[]})
        payload={'contractIsNew':True,'implementationStatus':'source-grounded-schema-and-forms','gameId':g['gameId'],'runtimePackId':g['runtimePackId'],'editionId':g['editionId'],'editionName':g['edition'],'sourceSHA':g['sourceSHA'],'packVersion':g['packVersion'],'readout':d,'existingBindings':g['bindings'],'existingStateFields':g['stateFields'],'layout':g['layout'],'preservation':g['preservation'],'sourceReferencesFromAttachment':g['sourceReferences'],'independentOfficialCheck':status,'artReuse':{'mappingPath':f'public/game-art/games/{g["gameId"]}/mapping.json','mappingSHA256':hashlib.sha256(art_path.read_bytes()).hexdigest(),'sourceSHAMatches':art.get('source_sha256')==g['sourceSHA'],'components':art['components'],'illustrativeOnly':True,'newImages':[]},'limitations':['No complete official-rule validation','No actual photo/model accuracy measured','No inference of hidden/history/intention','Runtime manual scope remains the original engine','Cross-record attachment requires existing anchor/manual note, not arbitrary hidden-ID lookup']}
        write_json(report/'docs'/f'{g["gameId"]}.json',payload);text(report/'docs'/f'{g["gameId"]}.md',build_doc(g,d,art,status))
    text(ROOT/'shared/readouts/generated-types.ts','\n'.join(type_index)+'\nexport interface ReadoutByGameId {\n'+'\n'.join(type_map)+'\n}\nexport type ReadoutGameId=keyof ReadoutByGameId;\nexport type KnownGameReadout=ReadoutByGameId[ReadoutGameId];\n')
    write_json(report/'batches.json',[{'id':b,'games':list(ds),'gameCount':len(ds),'componentCount':sum(len(d['components']) for d in ds.values())} for b,ds in sorted(buckets.items())])
    write_json(report/'coverage.json',{'games':len(defs),'components':sum(len(d['components']) for d in defs),'fields':sum(len(c['fields']) for d in defs for c in d['components']),'verification':dict(__import__('collections').Counter(d['sourceVerification'] for d in defs)),'meaning':'Implemented source-pinned schema/UI forms, not a claim of full game/vision correctness.'})
    print(json.dumps({'games':len(defs),'components':sum(len(d['components']) for d in defs),'batches':{b:len(v) for b,v in buckets.items()}},ensure_ascii=False))
if __name__=='__main__':main()
