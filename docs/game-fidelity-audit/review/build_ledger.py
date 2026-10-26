"""Join independent manual notes with read-only claim locations. No fact inference."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
def read(name):
    return json.loads((HERE / name).read_text())
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def save(name, obj):
    (HERE / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

claims, visual, web, findings = read('claims.json'), read('notes.json'), read('web-notes.json'), read('findings.json')
docs = {x['gameId']: x for x in read('local-documents.json')}
receipts = {x['gameId']: x for x in read('download-curl-receipts.json')}
assert set(visual).isdisjoint(web)
assert set(visual) | set(web) == {x['gameId'] for x in claims}

# These questions remain intentionally unresolved; broad labels alone are not findings.
questions = {
    'istanbul': 'people의 기타 인물이 Governor/Smuggler까지 의도하는지 variant 정체가 모호하다. 해당 공용 인물의 고정 purple/black과 개인 상인/가족색을 명시한 대표형이 필요하다.',
    'eclipse-second-dawn': 'ships 묶음의 함선 본체와 부품 타입색의 variant 단위 대응 추가 대조 필요. 개인별 함선 소유만으로 모든 부품색까지 확정하지 않는다.',
    'caverna': 'dwarfs 묶음의 무기값 부품/worker owner색 각각의 대표형 대응을 추가 대조해야 한다. 투구 아이콘은 실물 조형이라고 단정하지 않았다.',
    'monopoly': 'tokens의 generic pawn은 개별 금속 말 조형의 복제라고 간주하지 않았다. 공용 주사위와 개별 말의 variant 색정책 추가 확인 필요.',
    'stone-age': '공용 행동 주사위/시작말과 개인 부족원 owner색을 구분하는 variant 계약은 아직 미확정. 렌더 이미지의 시각색만으로 runtime 변환을 단정하지 않는다.',
    'machi-koro': '공유 주사위 owner색 매핑의 의미와 원작5주년 정확 인쇄 대응은 미확정이다.',
    'space-base': '구성물 p.5와 주사위 실물/공용성 도해를 추가 열람해야 owner색 계약을 확정할 수 있다.',
    'le-havre': 'round card 뒷면 ship과 개인 ship marker/worker를 대표형별로 명시한 대응을 추가 대조해야 한다.',
    'azul': 'mosaic의 다섯 예시 팔레트에 실제 타일 유형명이 없어 blue/yellow/red/black/light-patterned와 일대일 대응을 확정할 수 없다.',
    'sleeping-gods': '공식 Rulepop 요약/상세의 일부 토큰 수량이 상충한다. 선택 인쇄 실제 구성물 목록 확인 전 수량을 바꾸지 않는다.',
}
all_dims = ['selected-edition', 'component-kind', 'type-color-vs-owner', 'number-range-and-quantity', 'board-and-player-area', 'front-back-and-public-scope']
entries = []
for c in claims:
    game = c['gameId']; n = visual.get(game) or web[game]
    fs = [x for x in findings if x['gameId'] == game]
    is_pdf = game in visual
    has_visual_fact = bool(is_pdf and n['visual'])
    status = n.get('status') or ('VERIFIED_SCOPED' if has_visual_fact else 'PARTIAL')
    if game == 'machi-koro':
        status = 'PARTIAL'  # source does not pin fifth-anniversary printing
    sources = []
    if is_pdf:
        d = docs.get(game); receipt = receipts.get(game)
        pdf = d['pdf'] if d else receipt['path']
        url = d['url'] if d else receipt['url']
        pages = [1, 2] if game == 'monopoly' else n['pages']
        images = ['docs/game-fidelity-audit/review/pages/' + game + '.png']
        if game in ['istanbul', 'gloomhaven', 'terraforming-mars']:
            images.append('docs/game-fidelity-audit/review/pages/' + game + '-detail.png')
        sources.append(dict(url=url, title=game+' official rules/reference (see PDF title)',
            page=pages, section='명시한 페이지의 구성물/설정/본문 (verifiedFacts/unconfirmed 참조)',
            localPath=pdf, sha256=sha(REPO / pdf), visualEvidence=images,
            accessedAt='2026-10-22', visualFactChecked=has_visual_fact,
            observationBoundary='contact sheet는 직접 열람했다. 전체 PDF 텍스트 추출 파일은 전 페이지를 읽었다는 의미가 아니다.'))
    else:
        sources.append(dict(url=n['sourceURL'], title=game+' official source',
            page=None, section=n['section'], accessedAt=n['checkedAt'],
            visualFactChecked=False, localPath=None,
            observationBoundary='HTML/PDF의 텍스트 또는 접근 결과만 확인했다. 색/형태 도해는 미검수.'))
        if n.get('localText'):
            sources[0]['localPath'] = n['localText']
            sources[0]['sha256'] = sha(REPO/n['localText'])
    # Explicit access/secondary URL provenance, not a second factual endorsement.
    if receipts.get(game) and not receipts[game].get('saved'):
        r = receipts[game]
        sources.append(dict(url=r['url'], page=None, section='download access receipt only',
            accessedAt='2026-10-22', visualFactChecked=False,
            receiptPath='docs/game-fidelity-audit/review/download-curl-receipts.json',
            observationBoundary='urllib local-client TLS failure distinguished from verifying curl result',
            curlResult=r.get('curlRetry'), localPath=None))
    limits = [n['limits']]
    if game in questions: limits.append(questions[game])
    limits.append('전체 카드 앞면/전체 인쇄 변종/전체 지도 기하/게임 전체 규칙의 정확성은 이 행의 검수 범위 밖이다.')
    entries.append(dict(gameId=game, edition=c['edition'], status=status,
        finding=('VERIFIED_MISMATCH' if fs else 'NO_CONFIRMED_MISMATCH_WITHIN_READ_SCOPE' if status!='HELD' else 'UNCLEAR'),
        findingIds=[x['id'] for x in fs], layer=sorted(set(['spec','art']+[l for f in fs for l in f['layer']])),
        plannedDimensions=all_dims, checkedDimensions=n['checkedDimensions'],
        readScope=n['readScope'], sources=sources,
        verifiedFacts=n['facts'] if status!='HELD' else None,
        accessOrEditionObservation=n['facts'] if status=='HELD' else None,
        unconfirmed=limits,
        neededEvidence=('선택 판본의 '+n['limits'] if status=='HELD' else '기록된 미검수 항목에 한해 선택 판본 구성물/설정 도해·해당 절의 추가 원문 대조'),
        productClaims=dict(specPath=c['specPath'], specSha256=c['specSha256'],
            mappingPath=c['mappingPath'], mappingSha256=c['mappingSha256'],
            editionSourceRefs=c['edition']['source_refs'],
            editionSourceURLs=[s['url'] for s in c['sources'] if s['id'] in c['edition']['source_refs'] and s.get('url')],
            componentIds=[x['id'] for x in c['components']],
            componentClaimLocations=[c['specPath']+'#/components/'+str(i) for i in range(len(c['components']))],
            mappingClaimLocations=[c['mappingPath']+'#/components/'+str(i) for i in range(len(c['mappedComponents']))]),
        noRuntimeTransformationReproduced=True))

save('ledger.json', entries)
counts = dict(Counter(x['status'] for x in entries))
summary = dict(checkedAt='2026-10-22', games=len(entries), excluded=['rummikub'], statusCounts=counts,
    findingCount=len(findings), affectedGames=len({x['gameId'] for x in findings}),
    findingsByLayer=dict(Counter(l for x in findings for l in x['layer'])),
    pdfContactsDirectlyViewed=len(visual), pdfGamesWithScopedVisualFacts=sum(x['visual'] for x in visual.values()),
    pdfGamesEditionOrComponentScopePartial=[g for g,n in visual.items() if not n['visual'] or g=='machi-koro'],
    textOrAccessOnlyGames=len(web), productModifiedByThisAudit=False,
    statusMeaning={
        'VERIFIED_SCOPED':'선택 판본의 명시한 구성/설정 범위를 직접 원문+시각 대조. finding이 있을 수도 있음. 전체 게임 PASS 아님.',
        'PARTIAL':'공식 본문 일부/참조문서 또는 정확 인쇄 확인이 제한됨. 색·형태/미기록 차원 미확정.',
        'HELD':'구성물 원문 접근/선택 판본 고정 불가. 정상 또는 불일치 판정 불가.'},
    findingsBoundary='20건은 spec/art의 문구·대표형·색 역할 계약에 대한 것이다. 저장 데이터 변환/사진인식/실제 UI를 재현한 결과가 아니다.')
save('summary.json', summary)
with (HERE/'ledger.csv').open('w', newline='', encoding='utf-8-sig') as fp:
    fields=['gameId','edition','status','finding','findingIds','checkedDimensions','readScope','sourceURL','pageOrSection','facts','unconfirmed']
    wr=csv.DictWriter(fp, fieldnames=fields);wr.writeheader()
    for x in entries:
        wr.writerow(dict(gameId=x['gameId'],edition=x['edition']['name'],status=x['status'],finding=x['finding'],
            findingIds=';'.join(x['findingIds']),checkedDimensions=';'.join(x['checkedDimensions']),readScope=x['readScope'],
            sourceURL=x['sources'][0]['url'],pageOrSection=str(x['sources'][0].get('page') or x['sources'][0]['section']),
            facts=x['verifiedFacts'] or x['accessOrEditionObservation'],unconfirmed=' | '.join(x['unconfirmed'])))

# This is a request index for missing evidence, not an instruction to expose any hidden game content.
remaining = ['# 추가 근거가 필요한 범위', '',
    '119행 중 아래 PARTIAL/HELD는 정상 판정이 아니다. 공개된 선택 판본의 구성/설정 원문만 요청하며, 봉인된 콘텐츠·개인 손패 공개를 요구하지 않는다.', '']
for status in ['HELD','PARTIAL']:
    remaining += ['## '+status, '', '| 게임 / 선택 판본 | 직접 확인한 범위·접근 결과 | 필요한 근거·한계 |','|---|---|---|']
    for x in entries:
        if x['status'] != status: continue
        fact=x['verifiedFacts'] or x['accessOrEditionObservation']
        remaining.append('| '+x['gameId']+' / '+x['edition']['name']+' | '+fact.replace('|','/')+' | '+' '.join(x['unconfirmed'][:-1]).replace('|','/')+' |')
    remaining += ['']
(HERE/'remaining.md').write_text('\n'.join(remaining)+'\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))
