# 993bc44 게임팩 정본·생성 이력 독립 검토

**범위:** `aa26873..993bc44`의 Cloud 수정 9게임 원본, 기존 로컬 규칙 텍스트, 정본→런타임/캡처/인식/사진 정의 생성기, 17개 판본 이력과 연결된 저장·재개 호출 경로를 읽었다. 소스·생성물은 수정하지 않았고, 전체 테스트/게임 전체 규칙/사진 판독 정확도는 검증하지 않았다. 120게임 JSON 존재와 해시는 규칙 사실성의 증거로 취급하지 않았다.

## 고쳐야 할 문제

1. **P1 — 이전 판본 저장본은 열리지만 새 사진 촬영·분석을 계속할 수 없다. [VERIFIED]** `gamepacks/catalog.ts:10-11`은 17개 은퇴 팩을 이전 저장본용으로 찾지만, `shared/photoCapture.ts:6-10,12-15`는 최신 `capture-profiles.json`의 게임별 한 행만 조회하고, `server/photoDefinitions.ts:12-15`도 최신 정의 한 행만 조회한다. 예컨대 이전 Istanbul 팩 source SHA `65997c3c…`와 현 촬영 프로필/정의 source SHA `eb2a8fe4…`가 달라 `captureAreas(oldPack)`는 빈 배열, `photoDefinition(oldPack)`은 오류가 된다. `src/PhotoCaptureGuide.tsx:13`, `src/SessionWorkspace.tsx:131`, `server/hostedObservation.ts:16`이 실제 소비자다. 사용자가 이 판본으로 저장한 경기를 재열면 기존 상태는 남지만 새 촬영 부분을 고르거나 새 사진 판독 작업을 할 수 없다. **최소 수정:** 보관한 이전 팩과 같은 source/definition SHA의 이전 캡처 프로필·사진 정의를 판본별로 조회하거나, 이전 저장본의 계속 촬영을 명시적으로 지원하지 않는 제품 결정과 안내를 둔다. `tests/gamepack-revision-history.test.ts:36-45`는 팩 찾기만 확인해 이 경로를 놓친다.

2. **P2 — 새 기록이 은퇴 팩으로 시작될 수 있다. [VERIFIED]** `gamepacks/catalog.ts:9`는 이전 팩을 새 보드에 제공하지 않는다고 설명하고 목록에서도 뺐지만, `server/index.ts:249-253`의 `createSession`은 요청에 `gamePackVersion`이 있으면 `legacyPack`을 사용한다. 예: `gamePackId=istanbul`, `gamePackVersion=1.0.0-essentials-2.65997c3c37ca`로 새 세션을 만들면 은퇴 팩을 선택하며, 위 촬영 불가 상태로 바로 시작한다. **최소 수정:** 새 세션 생성은 현재 목록의 판본만 받되, 이전 팩 조회는 기존 세션 재개/가져오기에만 둔다. 혹시 이전 판본으로 새 기록 시작이 의도된 기능이라면 설명과 사진 지원 정책을 함께 바꾼다.

3. **P2 — `revise-all.sh`가 개정 이력을 자동 승인 근거로 다시 쓴다. [VERIFIED]** `tools/game-runtime/revise-all.sh:7`은 생성 전에 `revision-ledger.ts --write`를 호출한다. `tools/game-runtime/revision-ledger.ts:24-35`는 현재 정본 바이트를 `finalSHA256`으로 계산하고 같은 게임의 기존 영수증만 있으면 받아들인다. `tools/game-specs/essentials-check.ts:39,42-46`은 그 값을 승인된 개정으로 취급해 기존 구성물의 정확 내용 비교를 건너뛴다. 따라서 이미 개정된 게임의 기존 구성물 설명/종류를 실수로 바꾸고 `revise-all.sh`를 돌리면 영수증 재검토 없이 새 SHA가 승인 목록으로 들어간다. 현재 커밋의 17행 자체가 틀렸다는 뜻은 아니다. **최소 수정:** 생성기는 이력 `--check`로 시작하고, 검토된 새 SHA를 별도 고정·승인한 뒤에만 `--write`하도록 순서를 나눈다. 기존 개정 게임의 구성물 변경을 무심코 승인하지 않는 한 건의 회귀가 필요하다.

4. **P2 — 은퇴 팩 입력을 읽지 못해도 생성기가 계속 덮어쓴다. [VERIFIED]** `tools/game-runtime/generate.ts:23-26`은 `retired-packs.json`과 이전 `game-essentials.json`의 *모든* 읽기/JSON 파싱 오류를 무시한 채 새 목록을 쓴다. 파일이 존재하지만 잘렸거나 읽기 실패인 상태에서 재생성하면 은퇴 팩이 누락된 산출물이 만들어져 이전 저장본의 fallback 조회가 실패한다. 현 스냅샷의 JSON은 유효하다. **최소 수정:** `ENOENT`만 첫 생성으로 취급하고 다른 읽기/파싱 오류에서는 덮어쓰기 전에 멈춘다.

## 규칙 근거와 확인 한계

- **[VERIFIED, 국소 근거]** 9개 Cloud 원본 수정은 저장된 출판사/저자 규칙 텍스트와 대조했다. Agricola의 주요 설비 보급판·개인 앞면 카드, Anachrony의 비밀 워프 0–2개와 뒤집기 전 슈퍼프로젝트, Arkham Horror 3판의 condition 뒷면, Barrage의 계약 뒷면 더미/완료 계약, Crew Deep Sea의 최근 트릭·임무 아래 앞면 카드, Istanbul의 앞면 보너스 버림, SETI의 임무/버림, Star Wars Rebellion의 열람 가능한 버림, Voidfall의 낸 Agenda/버린 Focus는 각 `docs/art-confirmation/sources/*.txt`의 표시된 쪽과 방향이 맞는다. 영수증은 `docs/gamepack-revision-20261026/revision-evidence.json`이며, 전체 규칙서·확장 판본 확인을 뜻하지 않는다.
- **[UNCLEAR]** SETI 새 `missions` 영역은 수입 카드 *아래 끼운 카드의 정체까지* `player/public`·사진 대상에 묶는다(`docs/research/game-specs-120/games/seti.json:234-253,568-594`). 인용한 원문 `docs/art-confirmation/sources/seti-rules.txt:207-212`는 손패에서 카드를 아래로 끼워 수입을 얻는다고만 하며, 카드 전체 정체가 다른 플레이어에게 공개되는지 명시하지 않는다. `revision-evidence.json`의 해당 영수증도 영구 수입이라는 사실만 확인한다. 따라서 공개 분류의 **사실 근거는 미확인**이다. 공개 범위를 유지하려면 해당 판본의 명시 문구/도해를 확인하고, 전면이 가려져 있다면 보이는 수입 표시와 카드 정체를 분리해야 한다. 현재 근거만으로 비공개라고 단정하지 않는다.
- **[VERIFIED, 구조 한정]** 생성 결과는 120개 현 정의와 17개 은퇴 팩/개정 이력 행을 포함한다. `tests/gamepack-revision-history.test.ts`는 미개정 게임의 프로필·계약행·사진 정의 동일성과 은퇴 팩 조회를 비교한다. 이 검사는 이전 판본의 계속 촬영, 120게임 규칙 사실성, 실사진 인식 성능을 증명하지 않는다.

**판정:** 이전 저장본을 계속 촬영할 수 있어야 한다면 1은 출시 전 수정 대상이다. 새 세션 판본 선택과 생성 이력의 승인 경계도 함께 바로잡는 것이 작다.
