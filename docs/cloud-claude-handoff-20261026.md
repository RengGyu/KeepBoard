# Cloud Claude 인계 — 2026-10-26

이 문서는 **미완성 작업을 이어가기 위한 인계**다. 배포 완료·UI 개선 완료·120게임 규칙 검증 완료를 뜻하지 않는다. 사용자는 현재까지 커밋·푸시한 뒤 Cloud Claude에서 마무리하기로 했다.

- 저장소: `RengGyu/KeepBoard` (private)
- 인계 브랜치: `handoff/claude-gamepacks-ui-20261026`
- 기준 커밋: 브랜치의 최신 커밋. 기존 로컬 기준은 `98d573c`였다.
- 실행 환경: Node 22 계열, Python 3. 앱 `npm run dev`, 기본 포트 `4317`.
- 실제 작업 데이터·API 키는 `.keepboard/`와 외부 업로드 경로에 있다. Git에 넣지 않는다. 로컬 절대경로와 `/private/tmp/` 산출물은 Cloud에서 존재한다고 가정하지 않는다.

## 사용자의 목표와 승인된 방향

주 흐름은 **스캔 → 게임팩으로 상황 파악 → 필요한 질문 → 저장·실물 정리 → 재개·복원**이다. 가려짐과 판독 실수는 사용자가 빠르게 정정한다. 사진 입력뿐 아니라 카메라/스캔 입력도 같은 흐름으로 지원한다. 동영상 판독이나 여러 프레임 병합을 구현했다고 주장하지 않는다.

사용자 요청:

1. 저장 화면에서 판과 필요한 상태를 최대한 한 화면에 보고, 페이지를 계속 드래그/스크롤하지 않게 한다.
2. 불필요한 설명·모든 세부항목을 기본 화면에 늘어놓지 않는다. 추가·수정은 가까운 버튼 몇 번으로 끝나야 한다.
3. Hallmark를 적용해 상투적인 AI UI 느낌을 줄인다. 기능하는 작업 화면이 목적이며 홍보용 랜딩 페이지가 아니다.
4. Gemini 3.8을 제품의 실제 판독·후보 검토·정정·명시 적용·저장/재개 경로에 연결한다.
5. 나머지 게임팩도 실제 규칙/내용부터 이해한 뒤 공용판, 공개된 개인 판/기물, 본인만 보는 패, 실물로만 보존할 숨김 정보를 구분한다. 게임에 손패나 공용판이 없으면 비해당으로 명시한다.

## 현재 상태와 증거

### 완료/구현된 부분

- Gemini 서버 연결: `server/ai/geminiGameReader.ts`, `server/hostedObservation.ts`, 기존 `analysis-jobs`/관측 영수증/후보 조립에 연결했다. 합성 API에서 후보 생성만으로 기존 기록이 바뀌지 않으며 정정·명시 반영·저장·재개를 확인했다. 실제 제품 경로의 Gemini 호출은 **0회**다.
- 설정은 `KEEPBOARD_GEMINI_GAME_API_KEY_FILE` 또는 서버 전용 `GEMINI_API_KEY`. 키를 클라이언트/소스/응답/로그에 넣지 않는다. 기존 AI 설정과 게이트웨이를 조용히 대체하지 않는다.
- Hallmark **v2.0.0** 설치: 프로젝트에 `.claude/skills/hallmark/`를 포함했다. 원본 `https://github.com/Nutlope/hallmark`, MIT, 프로젝트 사본의 `KEEPBOARD-PROVENANCE.json` 참조. 로컬 Claude 전역에도 설치했으나 Cloud에서는 프로젝트 사본을 읽으면 된다.
- 자료 갱신 준비 코드: `tools/game-runtime/revise-capture.ts`, `revise-inputs.ts`, 관련 두 테스트 파일, `tools/readouts/generate.py`의 새 구성물 기본 필드/퇴역 프로필 기록 지원. **실제 전체 재생성은 실행하지 않았다.** 후속 작업에서 연결·검증할 초안이다.
- 역사 계약/입력은 `docs/gamepack-revision-20261026/history/before-runtime-revision/`에 보존했다.

### 아직 완료되지 않은 부분

- **이번 Hallmark UI 수정은 0**이다. Claude가 세션 한도에 걸려 스킬 열람 후 종료했다. 기존 `src/`의 미커밋 변경은 이전 작업이며 이번 재설계 완료로 오해하면 안 된다.
- **Gemini 선택 UI는 미연결**이다. 서버 API가 생긴 것과 실제 화면에서 선택해 작업하는 것은 별개다.
- 게임팩 120종 중 이번 규칙 우선 개정 과제의 완료 표시는 아크로폴리스 1종뿐이다(확인한 기본판 구간 범위). 7종은 부분 근거에 따른 소스 교정만 했다. 전체 규칙 검증 성공으로 표현하지 않는다.
- 소스가 바뀐 8종: `akropolis`, `a-feast-for-odin`, `arkham-lcg`, `concordia`, `dixit`, `grand-austria-hotel`, `pandemic-legacy-1`, `splendor`.
- Sol1의 56종 모두 남은 규칙 검토가 있다. Luna의 64종 중 1종 완료, 63종 남음(7종은 자료만 부분 열람, 56종 미착수). 게임별 상태·URL·재개 지점은 아래 파일을 따른다.
- 생성 팩·아트 메타데이터·캡처 프로필·인식 인덱스·readout·사진 정의가 새 소스와 아직 동기화되지 않았다. 현재 앱은 이전 생성 버전을 사용한다. 소스의 SHA만 임의로 맞춰 문제를 숨기지 않는다.

게임별 상세 인계:

- `docs/gamepack-revision-20261026/sol1/HANDOFF.md`
- `docs/gamepack-revision-20261026/sol1/review.json` — 56개 상태/근거
- `docs/gamepack-revision-20261026/sol1/freeze-manifest.json` — 실제 14개 수정 원본 전후 SHA
- `docs/gamepack-revision-20261026/luna/progress.json` — 64개 완료/부분/미착수 ID
- `docs/gamepack-revision-20261026/{sol1,luna}-worklist.json` — 합집합 120개, 중복 없음
- `docs/superpowers/plans/2026-10-26-gemini-integration-gamepacks.md`
- `docs/gemini-game-integration/README.md`
- `docs/gemini-game-integration-20261026/README.md` — backend 최종 동결, 정확 smoke 명령과 미실행 범위
- `docs/gemini-game-integration/product-smoke.mts` — 기본 check-only, 별도 execute에서만 단일 작업 전송

## 현재 검증 결과

인계 직전 확인:

| 명령 | 결과 |
|---|---|
| `npm run typecheck` | 종료 0 |
| `npm run build` | 종료 0; 큰 번들 경고 존재 |
| `npm test` | **690개 중 685 통과, 5 실패**, 종료 1 |

실패 5개는 새 소스와 이전 동결/생성 데이터 간 불일치다. **전체 테스트 통과 상태가 아니다.** 상세는 `docs/cloud-claude-handoff-20261026-verification.json`을 읽는다.

1. `tests/game-board-visuals-mapping.test.ts`: source SHA/영역 참조 검사.
2. 같은 파일: 생성기 `--check`; 예전 영역 총수 **522**의 고정 가정도 수정된 영역 수와 충돌한다.
3. `tests/game-essentials-data.test.ts`: 이전 manifest SHA·기존 baseline 제한·새 필드 근거 연결.
4. `tests/game-essentials-runtime-final.test.ts`: 생성 팩과 새 원본의 SHA 불일치.
5. 같은 파일: 예전 구성물 baseline/F001만 허용하던 검사와 아크로폴리스 구성물 분리 충돌.

이전 동결 근거를 덮어쓰거나 검사를 삭제하지 말고, 승인된 **새 개정 이력**과 현재 소스에 대한 별도 검사를 만들어 해소한다. 기존 저장본의 내장 pack/source 버전과 값은 그대로 열려야 한다.

## 남은 작업 번호와 완료 기준

### 1. Hallmark 기반 작업 화면 재구성

먼저 `.claude/skills/hallmark/SKILL.md`, `references/redesign.md`, `references/flow.md`의 **App screens**를 읽는다. 현재 UI와 사용자 지시가 재설계의 재료다. 사용자에게 다시 브랜드/목표 설문을 요구하지 않는다. 기존 작업을 stash/reset하거나 같은 설계 승인을 반복하지 않는다.

주요 파일: `src/SessionWorkspace.tsx`, `SceneWorkspace.tsx`, `GameEssentials.tsx`, `GameBoardRecord.tsx`, `PhotoTargets.tsx`, `CatanOverview.tsx`, `RummikubWorkspace.tsx`, 관련 CSS.

- 판/핵심 상태/저장/추가·수정이 첫 작업 영역에 보이도록 한다.
- 설명, 전체 구성물 목록, 고급 설정/원시 출력은 필요할 때 열게 한다.
- 공용판 / 공개 개인 기물 / 본인 비공개 패를 명확히 구분한다. 좁은 화면이라고 개인 내용을 공용으로 노출하면 안 된다.
- 객체 선택 후 가까운 편집 컨트롤을 사용하고, 주요 값 변경과 추가가 몇 번의 클릭/탭으로 가능해야 한다.
- 글씨를 전부 작게 줄이거나 필수 내용을 잘라서 화면에 억지로 맞추지 않는다. 미저장 수정/소유자 전환/저장 실패 시 초안 보존을 유지한다.
- 데스크톱 약 1440×900, 모바일 390×844에서 카탄 공용/개인, 루미큐브, 일반 게임 1종의 **저장된 내용이 있는 화면**을 검수한다. 빈 화면만 캡처하지 않는다.
- 기존 React/CSS와 설치된 컴포넌트를 우선 재사용한다. 장식용 대규모 라이브러리나 랜딩 페이지용 hero/stock photo를 추가하지 않는다.

### 2. Gemini 선택과 실제 제품 흐름의 UI 연결

`shared/lightweightRecognition.ts`의 실제 타입을 따른다.

- `PhotoReaderSelection = LocalReaderSelection | HostedReaderSelection`
- Gemini 요청: `{kind:'gemini-game-observation-v1', definitionSHA, areaId, frame?}`
- `GET /api/recognition/readers`: `readers[]`에 Gemini 항목의 `available`, `cloudSupported`, `identity`, `reason`이 있다.
- `POST /api/sessions/:id/analysis-jobs`의 기존 `reader` 필드로 전달한다. 현재 촬영 단계의 **사진 한 장**, 현재 게임팩의 `definitionSHA`와 공용/본인 `areaId`를 사용한다.
- `AnalysisJob.reader`와 `ObservationReceipt.reader`는 별도의 hosted/local identity union이다. 호스팅 결과를 로컬 판독 결과인 것처럼 위장하지 않는다.
- `src/api.ts`, `SessionWorkspace.tsx`, `LightweightReaderControls.tsx`의 기존 선택 흐름을 확장하고 기존 후보/정정/명시 적용/저장/재개 UI를 재사용한다.
- 모델 `gemini-3.8-flash`, LOW, `MEDIA_RESOLUTION_HIGH`, 출력 한도 32768, 완료 `STOP` 검증. 모델 출력이 가려짐/미상이면 사용자 입력으로 보완한다.
- 새로운 제품 과제는 기존 숫자만 읽던 실험과 범위가 다르다. 도로/건물 지원이 정의에 있더라도 실사진 성능이 검증됐다고 주장하지 않는다.

### 3. 남은 게임팩의 규칙 우선 개정

정본은 `docs/research/game-specs-120/games/<id>.json`; 관련 비전 프로필은 `docs/vision-research-astra/games/<id>.json`이다. 위 두 worklist와 progress/review의 **실제 잔여 ID**를 이어간다.

- 해당 판본의 공식 규칙/저자·출판사 자료에서 setup, 진행, 정보 공개 범위와 저장·재개에 필요한 상태를 읽는다. 출처 URL만 있거나 검색 발췌만 읽은 것을 전체 규칙 검증으로 바꾸지 않는다.
- 공용 보드/시장/버림/공급, 공개 개인 판/보유물, 본인에게 공개된 비공개 패/목표, 공개하면 안 되는 덱 내부·역할 키 등을 실제 게임에 맞춰 분리한다.
- Hanabi의 본인에게 숨겨진 손패와 Codenames의 역할 제한 키를 보통의 본인 비공개 패로 취급하지 않는다. 촬영 권한과 물리적 소유자는 별개다.
- 면/방향/순서/부착/겹침/슬롯을 필요에 맞춰 보존한다. 인쇄 비용과 실제 수량, 미상과 0을 구분한다. 차례·이력·소유자는 필요하면 질문한다.
- 게임별 확인 구간/사실/앱의 보존 권고/미확인을 따로 적는다. 자료 부족을 일반적인 설명을 채워 넣은 완료 표시로 감추지 않는다.
- Arkham LCG의 이전 hidden 기록에 섞인 버림더미와 Pandemic Legacy의 이전 숨김 인물 기록을 자동 공개·이동하지 않는다. 기존 기록은 그대로 두고 새로운 버전에서 사용자가 확인하게 한다.

### 4. 승인된 소스 개정으로 생성 데이터 동기화

소스를 일관되게 동결한 뒤 다음을 함께 갱신한다. 아래 준비 코드가 모든 경우를 해결했다고 가정하지 말고 실제 source/schema/범위와 대조한다.

1. `tools/game-runtime/generate.ts` → `gamepacks/generated/`.
2. `tools/game-runtime/revise-inputs.ts inputs` → 인식 source 이력/typed targets/아트 메타데이터. 기존 snapshot용 source/variant를 보존한다. 새 구성물 그림은 근거 없이 실물 정답 그림으로 만들지 않는다.
3. `tools/readouts/generate.py` → typed readout/catalog/fixtures. 새 구성물은 보이는 기본 필드로 남기고 새 규칙/인쇄 정체를 추측하지 않는다. `carcassonne.seed.json`과 새 source의 일치도 확인한다.
4. `tools/game-runtime/revise-capture.ts --write` → 현재 source와 런타임 binding으로 공용/개인/본인 캡처 프로필. 공개된 개인 기물 사진은 소유자 추정 없이 `__photo.public`로 보낸다.
5. `tools/game-runtime/revise-inputs.ts contract` → 명시적 새 사진 정의 계약. 현재 코드는 역사 계약 SHA에서 한 번 개정하는 초안이다. 실제 변경 이력과 증거를 검토한다.
6. `tools/lightweight-recognition/generate-photo-definitions.mts`의 고정 계약 SHA를 **검토한 새 계약**에 맞추고 정의를 생성한다. pin 검사를 없애거나 모든 변경을 허용하지 않는다.
7. `tools/game-board-visuals/generate.py`, 현재/역사 essentials 검사, 관련 manifest/테스트를 새 개정과 맞춘다. 예전 437 구성물·522 영역·1360 필드 같은 수치를 그대로 고집하지 않는다. 변경을 정당화하는 실제 source와 exact coverage 검사는 유지한다.

### 5. 완료 검수와 인계

- 빠른 추가/수정/취소/저장/재개, 소유자 전환, 공용/본인 범위, 후보를 명시 적용하기 전 기존 기록 보존을 확인한다.
- 실제 렌더된 화면으로 Hallmark app-scope 검수, 키보드/터치·반응형·포커스·오버플로를 확인한다. 사용한 도구가 없으면 가짜 캡처/가짜 통과를 기록하지 않는다.
- 의미 있는 수정 범위 검사를 한 뒤 `npm test`, `npm run typecheck`, `npm run build`를 실행한다. 실패는 원인을 해결한다. 오래된 테스트 이름이나 고정 수치를 바꿨다는 이유만으로 검사를 제거하지 않는다.
- 실제 Gemini 제품 호출, 다른 게임 실사진 정확도, 새로운 독립 보드 정확도는 아직 미검증이다. 키가 Cloud에 없다고 기능/UI 작업을 막거나 비밀값을 대화로 출력하도록 요구하지 않는다. 실제 키/사진을 새 저장소에 복제하지 않는다.
- 유료 재실험·계정/결제 변경·운영 배포를 자동으로 확장하지 않는다. 완료한 코드와 실제 측정/미측정 범위를 구분해서 보고한다.

## 카탄 9장 결과 해석 주의

`docs/game-vision-nine-20261026/results/README.md`의 사용자 검토 정정을 먼저 읽는다. 이전 수동 기준과의 숫자 비교 `156/160`은 일부 기준값 자체의 6/9 판독이 잘못됐다는 사용자 피드백이 있어 **확정 모델 정확도라고 쓰면 안 된다**. 아래 점/방향의 상세 재판정은 나중에 하기로 했다. 같은 보드의 연속 9장이고, 건물·도로는 그 벤치마크 범위 밖이었다. 기존 raw/GT를 추측으로 재라벨링하지 않는다.

## Cloud 실행과 자료 경계

잠금 파일대로 의존성을 설치하고, 테스트용 새 저장소로 실행한다.

```bash
npm ci
```

```bash
KEEPBOARD_DATA_DIR=/tmp/keepboard-cloud-review HOST=127.0.0.1 PORT=4317 npm run dev
```

원래 Mac의 `.codex/policies` 및 Paseo 세션 도구/개인 API 업로드 경로는 Cloud에 없다. 이 문서의 범위·제약, 저장소의 프로젝트 지침과 실제 코드를 기준으로 직접 이어간다. Astra나 새 유료 서비스가 필요하다고 가정하지 않는다. 사용자 작업을 reset/clean하거나 구버전 저장본을 일괄 마이그레이션하지 않는다.

로컬 검토 사진, PDF 다운로드/페이지 캡처, 캐시·배포 압축 묶음은 원격 인계에서 제외한다. 필요한 규칙 원문은 보고서의 공식 URL에서 다시 확인한다. 테스트에 필요한 정본 JSON/카탈로그/기존 텍스트 근거와 소스·공개 앱 자산은 인계한다.

## 붙여 넣을 시작 프롬프트

> `RengGyu/KeepBoard`의 `handoff/claude-gamepacks-ui-20261026` 브랜치에서 이어서 구현해 줘. 먼저 `docs/cloud-claude-handoff-20261026.md`와 verification JSON을 읽고, 남은 작업 **1~5번**을 실제 코드로 마무리해. 우선 Hallmark v2.0.0의 app-screen 기준으로 저장된 판을 한 화면에 보기 쉽고 몇 번의 버튼으로 추가·수정하게 만들고, 이미 구현된 Gemini 3.8 서버 판독 선택을 화면에 연결해. 이어서 progress/review의 남은 게임을 공식 규칙에 근거해 공용판·공개 개인 기물·본인 패·숨김 보존으로 구분하고, 정본 소스부터 생성 데이터와 version pin을 일관되게 갱신해. 현재 UI 개선은 미착수이고 전체 테스트는 690개 중 5개가 생성 데이터/동결 불일치로 실패한 인계 상태야. 이전 기록·비공개 정보·수동 정정은 보존하고, 기준 숫자를 맞추려고 검사를 없애거나 규칙 검증을 했다고 꾸미지 마. 새로운 설계 설문이나 승인 절차를 반복하지 말고 구현과 필요한 검수를 진행해. 실제 키·사진이 없는 유료 호출이나 운영 배포는 하지 말고, 완료한 기능과 미검증 범위를 분명히 보고해.
