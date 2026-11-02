# 사진 판독 조건 구조 점검 / 카탄 단일 잔여 숫자

VERIFIED: 현재 120게임 정의의 440개 구성물, 가시 속성 1,363개를 목록화했다. 실제 120개 물리 판본이나 전체 룰북 검증이 아니다. 게임·속성별 조건과 원문 설명은 [audit.json](audit.json), 재실행은 `python3 docs/recognition-conditions-20261102/audit.py`.

| 구조 분류 | 속성 수 | 조치 |
|---|---:|---|
| 기존 front-only | 431 | 유지. 앞면 미확인/가림이면 unknown |
| 기존 front gate 없는 visible | 916 | 유지. 보이지 않는 값 생성 금지 |
| 물리 외곽 shape | 5 | 카드/타일 일괄 front-only 제거 |
| 현재 보이는 면/뒤집힘 | 10 | 특정 앞면을 요구하는 순환 조건 제거 |
| 카탄 보관함 형태 | 1 | box/tray/bag를 앞면 인쇄로 취급하지 않음 |

front-only는 447→431, 16게임의 속성 16개만 변경했다. component IDs, 필드 도메인, 영역/partition, manual 속성, source/edition/packVersion은 동일하다. 생성 source의 동일 조건을 고쳤고, 카탈로그는 해당 속성만 수정했다. 불필요한 전체 readout/fixture 재생성은 하지 않았다. 카탈로그와 runtime 입력의 정확한 새 SHA만 definition generator에 승인된 revision으로 기록했으며, 원 계약/hash와 역사본은 바꾸지 않았다. 현재 index/manifest는 생성기 결과와 일치한다.

검토 보류 6개: Azul tiles.tileColor, Castles of Burgundy hexes.tileColor, Rummikub numbers.color/jokers.color, Da Vinci Code tiles.tileColor, Galaxy Trucker ships.connectorShape. 특히 연결구 모양은 물리 외곽과 다른 앞면 인쇄일 수 있으므로 `shape`와 함께 일괄 완화하지 않았다. 이 항목들은 구조명만으로 물리 몸체/인쇄 여부를 확정하지 않고 기존 제한을 유지했다. 이는 해당 게임 전체가 미검토라는 뜻이 아니다.

## 카탄 잔여값 경로

기존 engine의 `Assertion.basis='rule'` / `reason` 경로를 사용한다. 기존에 동적 multiset 차감 규칙은 없어 작은 순수 helper를 추가했다. 게임팩 선언 `catanNumberInventory`는 [공식 2020 기본판 룰북 p.10, Number Tokens / Resource Production](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf)에 근거한다: 2와 12 각 1개, 3·4·5·6·8·9·10·11 각 2개. 주사위 굴림은 이 고정 구성 추론 대상이 아니다.

- accepted 공용 `board.layout`만 대상. whole/full + numbers complete, 19개 지형/18개 숫자 원판의 유일한 canonical hex 슬롯 및 개별 quantity=1을 구조적으로 확인한다.
- 알려진 값은 confidence/정확성을 재평가하지 않고 multiset에서 한 개씩 차감한다. unknown 슬롯 1개와 잔여 값 1개일 때만 파생 장면을 만든다. 차감 불가, unknown 여러 개, 토큰/지형 누락, 중복 슬롯, 수량 null/0, partial/literal은 채우지 않는다.
- 스캔 투영은 원래대로 partial을 유지한다. 단일 native receipt의 full+numbers complete 선언을 사용할 때는 같은 source/public 범위·원사진 epoch·정확히 같은 componentRefs와 관측값인지 확인한다. 여러 receipt, generic/literal wire에는 이 fallback이 없다.
- 공급자 원응답, receipt 관측, 원 observation assertion의 null은 변하지 않는다. 파생 rule의 reason에 대상 슬롯/값, 구성 출처, 다른 판독을 맞다고 가정했다는 점 및 직접 판독이 아니라는 점을 남긴다.
- 새 촬영 epoch를 발급하는 resume에서도 저장된 원사진의 epoch와 receipt를 연결한다. 기존 currentFacts/전체 판 완료 판정은 바꾸지 않는다. UI는 `sceneWorkspaceData → 마지막 accepted → recordedScene`으로 파생 장면을 사용하며 `canonicalBoard`도 같은 장면을 선택한다.
- 선언이 없는 과거 pinned 게임팩에는 재고를 추측해 추가하지 않는다. 새 runtime 생성은 catanProfile 선언을 재사용한다. generated runtime은 카탄 metadata/source만 추가했고 나머지 119팩은 동일하다.

## 직접 검증

VERIFIED: `node --import tsx --test tests/recognition-conditions.test.ts tests/catan-number-inference.test.ts tests/photo-definitions.test.ts tests/catan-native-wire.test.ts tests/catan.test.ts tests/catan-information.test.ts tests/catan-review-fixes.test.ts tests/game-readout-semantic.test.ts tests/game-readout-catalog.test.ts` — **178/178 PASS**. [최종 로그](focused-tests-local-http.log).

VERIFIED: `npm run typecheck` — exit 0. [로그](typecheck.log).

외곽 shape가 back/unknown face에서도 유지되는 RED→GREEN, 앞면 printedName/wrong-face·occluded null 유지, 명시적 shape occluded 유지, 중복 multiset 차감·confidence=0·불완전/복수/0/null 음성 회귀를 검사했다. 수정 전 engine preimage의 같은 행동 검사에서는 추론 2건이 실패했다(소스 복원/덮어쓰기 없이 private 사본에서 확인).

재개 epoch 경계는 [RED](resume-red.log)→[GREEN](resume-green.log)으로 고쳤다. [사용자 경로 검사](selection-save-resume.log)는 실제 SceneWorkspace/SceneEditor SSR에 채운 숫자 원판이 표시됨을 확인하고, 합성 임시 Store의 실제 HTTP `commit → GET → resume → GET`에서 수정 없이 채운 값 유지·원관측 null/receipt 불변을 확인한다. 로컬 listen sandbox EPERM은 정상 실행 승인 후 통과했다. 외부 모델/API 호출은 0이다.

한계: SSR/로컬 HTTP 회귀이며 새 실사진 모델 정확도나 실브라우저 조작 검증은 하지 않았다. 구조적 완전성 선언의 사진상 정확도를 자동 보증하지 않는다. 다른 observed가 틀렸어도 사용자가 지정한 가정에 따라 그 값을 재검증하지 않는다. 전체 suite/build는 이 작업에서 반복하지 않았다.

REPORTED (감독): 최종 helper 포함 `npm run build` exit 0, 기존 chunk 크기 경고만 남음. 감독 로그 `/private/tmp/kb-dice-research-20261102/integration-build-final.log`. 감독이 실제 선택 경로와 최종 178/178·로컬 HTTP 로그도 독립 확인했다.

정확한 pre/post 파일 SHA, 자기 delta patch 및 검증 명령은 [handoff.json](handoff.json). 기존 dirty 작업을 보존한 preimage를 기준으로 작성했으며 HEAD와의 전체 diff를 이 작업 결과로 취급하지 않는다.
