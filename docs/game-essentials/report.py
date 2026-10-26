"""Render review handoff from the actual per-game manifest, without editing specs."""
import json,pathlib,collections,hashlib
P=pathlib.Path('docs/game-essentials');m=json.load(open(P/'manifest.json'));games=m['games'];e=json.load(open(P/'evidence.json'))['sources'];old=json.load(open(P/'baseline.json'));byid={x['game_id']:x for x in old}
counts=collections.Counter(g['status'] for g in games);findings=collections.Counter(f['result'] for g in games for f in g['review_findings']);newfields=sum(c['kind']=='add-field' for g in games for c in g['changes']);amended=sum(c['kind']=='amend-field' for g in games for c in g['changes'])
summary=dict(games=len(games),status_counts=dict(counts),scoped_primary_sources=len(e),new_optional_fields=newfields,amended_fields=amended,review_finding_counts=dict(findings),full_official_rulebook_verification=0,unknown_save_policy_expanded_required=False)
(P/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lines=['# 게임별 저장·재개 데이터 결과','', '120행. `공식 절 확인`은 해당 변경만, `보존권고만`은 기존 명세를 포장·복원하는 앱 정책만 보완했다는 뜻이다. 모두 전체 공식 규칙 완전성은 미확정이다. 보류 건수는 기존 검토표의 개별 findings 중 UNCLEAR만 세고 런타임 이슈는 별도다.','', '| 게임/원명세 | 선택 판본 | 확인·실제 변경 | 기존 검토 보류 |', '|---|---|---|---:|']
remaining=['# 남은 확인 요청 — 게임별 범위','', '기존 검토표의 추정/미확인 50건은 공식 사실로 승격하지 않았다. 별도12건은 제품 런타임 범위여서 이 데이터 작업의 해결 대상으로 세지 않았다. 120종 전체 카드·효과·공개성 검증도 완료하지 않았다. 각 게임에 아래 근거가 추가되어야 보류를 줄일 수 있다.','', '## 실제 접근·판본 제한','', '- 파워그리드 Recharged: 공식 PDF는 web의 크기 제한, 일반 HTTP 다운로드403. 우회/다른 판본으로 대체하지 않고 순서·발전소 더미·현금 공개 항목 보류.','- 반지전쟁2판: Ares 공식 상품/다운로드 페이지403. 사냥 주머니/사건 덱의 선택 기본판 조항 확인 보류.','- 메이지 나이트: 확보된 자료는 Ultimate Edition이지만 선택 명세는 원 기본판 모드다. 확장 포함 페이지를 기본판 사실로 승격하지 않고 기본판 적/유적/지도 비밀면 확인 보류.','- 티켓 투 라이드: 공식 현행2025 PDF는 열렸으나 초기 티켓 규정이 구판과 다르다. 기존 북미 기본판의 실제 인쇄를 임의 변경하지 않았고 공개 장수 의무도 그 본문으로 확인 못 해 보류.','- 스톤 에이지: 공식 English PDF의 web 본문은 직접 열람했으나 shell 다운로드 연결거부. source receipt에 로컬 PDF 없음으로 기록.','- Dune Uprising: 낡은 direwolfdigital assets 주소404, 공식 resources HTML에 직접 연결된 CloudFront 원본은 다운로드/본문 확인 성공.1–2인Rivals/6인/CHOAM은 이번 사실 보완에 포함하지 않음.','', '## 게임별 남은 확인','']
for i,g in enumerate(games):
 id=g['game_id'];state='공식 절 확인+보완' if g['status']=='official-scoped-amendment' else '기존 상세자료 유지' if g['status']=='retained-existing' else '보존권고만'
 fields=[c['summary'] for c in g['changes'] if c['kind']=='add-field'];ed=[c['summary'] for c in g['changes'] if c['kind']=='amend-field']
 change='; '.join(fields) if fields else '공개 배치 참조·소유/비밀 실물 묶음 보존' if g['changes'] else '카탄 상세 원명세 무변경'
 if ed:change+='; 기존 설명'+str(len(ed))+'개 보완'
 lines.append(f"| [{g['name']}](../research/game-specs-120/games/{id}.json) `{id}` | {g['edition']['name']} | {state}: {change}. [claims](manifest.json#/games/{i}) | {g['unresolved_findings']} |")
 remaining += [f"### {g['name']} · {id}",'',f"선택 판본: {g['edition']['name']}. 데이터 점검 절: state_fields/rules/resume/recognition_correction. 이번 공식 대조: {g['official_scope'] or '없음; 기존 출처의 미확인 사실은 유지'}.",'']
 uf=[f for f in g['review_findings'] if f['result']=='UNCLEAR']
 if uf:
  remaining += ['- UNCLEAR: '+f['item']+' → 필요한 자료: '+f['needed'] for f in uf]
 else:remaining+=['- 기존 검토 findings에서 추가 보류가 없더라도, 전체 공식 규칙 대비 필수 상태가 완전하다는 판정은 하지 않았다.']
 runtime=[f for f in g['review_findings'] if f['result']=='OUT_OF_SCOPE_RUNTIME']
 if runtime:remaining+=['- 제품 담당 범위: '+f['item'] for f in runtime]
 remaining+=['- 남은 원명세 경계: '+gap for gap in g['unverified_scope']['remaining_gap_items'][:2]]
 urls=g['unverified_scope']['needed_sources'];remaining+=['- 다음 공식 자료 위치: '+('; '.join(urls) if urls else '공식 출판사 선택 판본 룰북/정오표 미확보'), '']
(P/'games.md').write_text('\n'.join(lines)+'\n');(P/'remaining.md').write_text('\n'.join(remaining)+'\n')
# Per-claim pointers identify the exact source receipts rather than a game-wide fact badge.
for g in games:
 for i,c in enumerate(g['changes']):
  c['claim_id']=g['game_id']+':'+str(i+1)
  c['evidence_pointer']='README.md#사실과-앱-권고의-구분' if c['evidence']=='essentials.storage-guidance' else 'evidence.json#/sources/'+str(next(j for j,s in enumerate(e) if s['spec_source_id']==c['evidence']))
(P/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
