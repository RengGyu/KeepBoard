# Builds games.json / games.md from the specs (read-only) and the reviewer judgments in work/judgments-*.json.
import json,glob,hashlib,re,os
ROOT='docs/research/game-specs-120/games'
J={}
for f in sorted(glob.glob('docs/game-state-review/work/judgments-*.json')): J.update(json.load(open(f)))
RUNTIME={'catan':'gamepacks/catan.ts (catan-base)','rummikub':'gamepacks/rummikub.ts (rummikub)'}
VIS={'owner':'owner','hidden':'hidden','own-hidden':'own-hidden','role-limited':'role-limited'}
rows=[]
for f in sorted(glob.glob(f'{ROOT}/*.json')):
    raw=open(f,'rb').read(); d=json.loads(raw); g=d['game_id']; j=J[g]
    sf=d['state_fields']; pp=d['resume'].get('preserve_procedures',[])
    private=[f"state_fields.{x['id']}[{x['visibility']}{'/'+','.join(x.get('visible_to_roles',[])) if x.get('visible_to_roles') else ''}]" for x in sf if x['visibility']!='public']
    preserves=[f"resume.preserve_procedures.{p['id']}({p['method']}{',order' if p['order_sensitive'] else ''})" for p in pp]
    manual=[x['id'] for x in sf if x['acquisition']==['manual']]
    src=d['sources'][0] if d['sources'] else {}
    findings=[{'item':a,'type':b,'evidence':c,'importance':e} for a,b,c,e in j['findings']]
    spec_gap=[x for x in findings if x['type'] in ('missing','visibility','preservation')]
    status='누락·불명확 항목 식별' if spec_gap else '명세 읽기 기준 추가 누락 미식별'
    pr=[x['importance'] for x in findings]
    top='P1' if 'P1' in pr else 'P2' if 'P2' in pr else 'P3' if 'P3' in pr else ('UNRATED' if pr else '-')
    rows.append({'game_id':g,'name_ko':d['name_ko'],'edition':d['edition']['name'],'spec_file':f,'spec_sha256':hashlib.sha256(raw).hexdigest(),
      'primary_source':{'url':src.get('url'),'kind':src.get('kind'),'access':src.get('access')},
      'official_rules_fully_verified':False,
      'private_fields_declared':private,'preserve_procedures':preserves,'manual_only_fields':manual,
      'questions_needed':j['ask'],
      'spec_status':status,'findings':findings,'highest_priority':top,
      'runtime':RUNTIME.get(g,'없음 — 런타임 게임팩 미등록(server/index.ts packs())'),
      'runtime_note':j.get('runtime_note','')})
json.dump({'generated':'docs/game-state-review/work/build.py','games':len(rows),'rows':rows},open('docs/game-state-review/games.json','w'),ensure_ascii=False,indent=1)
# Markdown table
L=['# 120종 게임별 검토표','', '열 설명: **비공개 선언**은 명세 `state_fields`의 visibility≠public 필드, **보존**은 `resume.preserve_procedures`, **확인 질문**은 사진으로 알 수 없어 직접 물어야 하는 항목(명세 필드 ID), **발견**은 검토자가 식별한 누락·불명확 항목과 근거 라벨(SPEC/INFERRED/UNCLEAR/VERIFIED)·중요도. 공식 규칙 원문 전체 대조는 0종이며, “누락 미식별”은 명세를 읽은 범위에서 추가 누락을 찾지 못했다는 뜻이지 공식 규칙 대비 필수 상태를 모두 확인했다는 뜻이 아니다.','',
   '| # | 게임 | 판본 | 주 출처 수준 | 비공개 선언 | 보존 절차 | 확인 질문 | 명세 판정 | 발견(근거·중요도) | 런타임 |','|---:|---|---|---|---|---|---|---|---|---|']
for i,r in enumerate(rows,1):
    priv='<br>'.join(p.replace('state_fields.','') for p in r['private_fields_declared']) or '없음'
    pres='<br>'.join(p.replace('resume.preserve_procedures.','') for p in r['preserve_procedures']) or '없음'
    fnd='<br>'.join(f"[{x['evidence']}·{x['importance']}] {x['item']}" for x in r['findings']) or '—'
    L.append(f"| {i} | {r['name_ko']}<br>`{r['game_id']}` | {r['edition']} | {r['primary_source']['kind']}/{r['primary_source']['access']} | {priv} | {pres} | {'<br>'.join(r['questions_needed'])} | {r['spec_status']} | {fnd} | {r['runtime']} |")
open('docs/game-state-review/games.md','w').write('\n'.join(L)+'\n')
from collections import Counter
c=Counter(r['highest_priority'] for r in rows); s=Counter(r['spec_status'] for r in rows)
ev=Counter(x['evidence'] for r in rows for x in r['findings']); ty=Counter(x['type'] for r in rows for x in r['findings'])
print(json.dumps({'rows':len(rows),'highest_priority':c,'spec_status':s,'evidence':ev,'types':ty},ensure_ascii=False))
