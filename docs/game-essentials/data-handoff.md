# 데이터 인계 · 원명세 쓰기 동결

**VERIFIED — 120ID 전수 데이터 점검·manifest 작성, 119게임 원명세 실제 보완.** 카탄1종은 기존 상세 데이터를 그대로 유지했다. **공식 규칙의 특정 절을 확인한21게임에서 선택 기록38필드를 추가하고 기존12필드 설명을 보완했다.** 나머지98게임은 기존 명세에 근거한 보관·복원 권고만 보완했다. 공식 규칙 전체 대비 필수 상태가 완전하다는 판정은0종이다.

- [120게임별 변경 요약](games.md) · [전수 manifest/claim/원본·최종 해시](manifest.json)
- [확인한 공식 URL·문서·판본·페이지·절·열람일·로컬 해시](evidence.json)
- [개별 미확정/필요 자료](remaining.md) · [집계](summary.json)
- [최종 데이터 해시·동결 기록](data-freeze.json)

## 실제 보완

선 플레이어와 현재 행동자를 분리: 아그리콜라·아나크로니·바라지(순서 트랙)·카베르나·스톤 에이지·테라포밍 마스·테라 미스티카·SETI·레즈 아르카나·마블 챔피언스·듄 업라이징. 라운드/세대 전환은 저장본을 여는 동작이 아니다.

비밀 실물/공개 버림 분리: 아그리콜라 미래 행동 카드, 카베르나 미래 수확 표식, 아나크로니 풀 덱, 테라포밍 프로젝트 덱/뒷면 버림, 도미넌트 스피시즈 지배/지형 더미, 르아브르 full game의 기본 특수건물, TI4 미공개 목표 두 줄과 공용 덱, 스피릿 아일랜드 획득 공포의 순서, 듄 공용 덱/공개 음모 버림, 자이푸르 뽑기/공개 판매 버림, 아컴호러3판 이벤트 덱/공개 이벤트 버림을 구분했다.

아컴 카드게임2026 AHC100은 선임 조사자·혼돈 주머니·막/의제/파멸의 특정 근거를 반영했다. 자이푸르는 보유 낙타 수를 상대에게 알릴 의무가 없으므로 공개 시장/자발적 공개와 소유자 보유를 분리했다. 외곽 항로는 지도 위 뒷면 접촉의 정체와 몰래 본 개인 정보를 분리하도록 명시했다. 루미큐브는 재배열 전 참조를 **선택 앱 권고**로 두며 없는 과거 배치를 재구성하지 않는다.

실물 보관 권고는 묶음 ID·소유자/허용 역할·봉인·보관 위치·위아래·그룹/층/부착/순서 참조를 포함한다. 내용·장수를 몰라도 저장하고, 숨은 면을 펼쳐 촬영하게 하지 않는다. 각 보관 절차의 `confidence=recommendation`을 유지한다. 미공개 내용/정확한 장수/과거 효과를 봉인 체크에서 도출하지 않는다.

## 보류 및 근거 한계

기존 검토표의 **85개 findings**를 그대로 추적한 결과 **23개 scoped 보완 /50개 UNCLEAR /12개 제품 런타임 범위**다. 그 중 최초의 INFERRED39개만 따로 보면 **18개 scoped 보완 /21개 미확정**이다. 이 수는 게임 수나 완전성 점수가 아니다. 각 항목은 manifest와 remaining에 개별 행/필요자료가 있다.

파워그리드 공식 PDF/상품은 도구 크기 제한 또는 HTTP403, 반지전쟁 공식 페이지403으로 보류했다. 메이지 나이트는 확보된 Ultimate와 선택 원 기본판의 경계를 넘겨 확정하지 않았다. 티켓 투 라이드 공식 현행2025 규칙은 열렸지만 구판과 설치 규정 차이가 있어 선택 판본을 임의 변경하지 않았다. 공개 장수의 명시 근거를 찾지 못한 루미큐브·루트·티켓 투 라이드·듄의 해당 추정도 공개 필드로 강제 승격하지 않았다.

스톤 에이지는 공식 web PDF 본문을 직접 확인했으나 shell 다운로드는 연결거부라 로컬 파일이 없다. 나머지 공식 scoped 증거는 기존/새 로컬 원문과 SHA256로 추적한다. 출판사 저작권은 유지되며 재배포/학습/상업 아트 권리를 확보한 자료가 아니다.

## 계약·검증

- 기존 schema1.0·120게임 ID·기존 필드 ID/타입/수명/공개범위/판본 객체와437구성물은 유지했다.
- 원래 필수 질문/required 배열을 늘리지 않았고 모름/미완료 저장을 유지했다. 38추가 필드는 모두 선택 기록이다.
- 현재 데이터 규모는1,360필드/408규칙·기록 제안이며 사실 검증 수가 아니다.
- 전수 CLI: `node --import tsx tools/game-specs/cli.ts validate docs/research/game-specs-120/games --complete` — exit0,120valid,missing/unknown/duplicate=[],factualVerification=false. [결과](structural-validation.json)
- 새 데이터 검사: `node --import tsx tools/game-specs/essentials-check.ts` — exit0,120ID/digest/기존 공개범위·선택저장/추가 필드 근거/비밀 사진 금지/실물 보존 경로 확인. [결과](validation.json)
- 신규 회귀: `node --import tsx --test tests/game-essentials-data.test.ts` — **5/5 pass**. [로그](test-results.txt)
- 신규 검사·테스트 파일의 독립 `tsc --noEmit --target es2022 --module nodenext --moduleResolution nodenext --allowImportingTsExtensions --skipLibCheck …` — exit0.
- baseline120개 해시는 기존 game-state-review의 원명세 해시120개와 모두 일치했다. 최종 manifest는 실제 저장된 파일 바이트 해시와 대조했다.

## 소유권 반환·후속 생성

**이 인계 시점부터 games/*.json 원명세 쓰기를 동결한다.** 원명세119파일, 해당 README/INDEX, 이 연구 문서·증거·스크립트, `tools/game-specs/essentials-check.ts`, `tests/game-essentials-data.test.ts`의 소유권을 반환한다. `docs/game-essentials/runtime/**`는 구현솔 소유이며 읽기만 했다.

기존 source-index/coverage/validation과 아트 mapping의 원문 해시는 최초 산출 당시 자료다. README/INDEX에는 최신 근거·검사 위치를 명시했으며 허용 범위 밖 아트/옛 리포트를 갱신하지 않았다. 제품 담당이 동결한 최종 원명세로 단일 어댑터 산출물을 재생성·통합 검증한다. 기존 게임팩이 고정된 사용자 저장본에 이 연구 데이터를 덮어쓰라는 요청이 아니다.

`src/server/shared/gamepacks/public`·기존 schema·실사용자 Store/사진/API설정은 읽거나 수정하지 않았다(제품 소스는 작업 범위 밖). 실제 AI 호출0, 프로세스 변경0, build/dist/설치/commit/push/deploy0. 이번 검증은 데이터 구조·기록 정책이며 앱 동작/실물 인식/전체 게임 규칙 정확도 검증이 아니다.
