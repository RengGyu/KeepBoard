# 루미큐브 연결

Classic의 공용 묶음과 개인 받침대를 전용 편집기에 연결했다. 기존 명세와 구성물 아트를 사용하며, 숫자 1–13·조커·모름·같은 색/숫자의 개별 사본을 기록한다. 묶음과 타일 순서는 저장 상태의 일부다.

## 보기

- [공용 합성 보드](http://127.0.0.1:4393/?session=cef8f53b-b5cc-476b-8954-12cbac16a5e9)
- [빨강 플레이어의 합성 받침대](http://127.0.0.1:4393/?session=cef8f53b-b5cc-476b-8954-12cbac16a5e9&player=red)
- [실물 사진 조사](../rummikub-photo-research/)

이 예시는 합법적인 묶음을 뜻하지 않는다. 원본 데이터와 분리한 임시 저장소다. 최초에는 AI가 꺼져 있었고, 사용자의 사진 자동 인식 요청 후 현재 4393 저장소에 기존 loopback 게이트웨이만 연결했다. 키 복사나 기존 서버 재시작은 하지 않았다.

다시 실행하려면 먼저 빌드한 뒤 다음을 사용한다. 실행할 때마다 새 임시 저장소와 새 URL이 만들어진다. `--gateway`는 기존 4330의 board-vision 연결을 사용한다. 이 옵션을 생략하면 자동 인식 없는 수동 합성 편집 모드이며 화면에도 그 상태를 표시한다.

```sh
npm run build
```

```sh
node --import tsx tests/fixtures/rummikub-preview.ts --gateway
```

## 사진 자동 인식 연결

최초 전달한 4393은 모든 AI 환경변수를 제거한 수동 편집 fixture였다. 따라서 사진 업로드는 정상 보관돼도 자동 인식 호출을 하지 않았다. 실제 AI 연결을 기대한 사용자에게 이 주소를 전달한 것이 직접 원인이었다.

현재 활성 임시 저장소에 `ai-routing.json`의 loopback URL·alias만 추가했다. 기존 게이트웨이의 DeepSeek Flash/high를 사용하며 API 키나 직접 모델 설정은 복사하지 않았다. 사용자가 올린 공용 루미큐브 사진 한 장을 기존 `/analyze` 경로로 한 번 읽는다. 과거 게이트웨이 smoke/photo 시험 ledger는 초기화하거나 재사용하지 않는다.

`SessionWorkspace.tsx`는 미연결 시 ‘사진 자동 인식이 연결되지 않았어요’를 표시하고, 연결된 상태에서 현재 촬영 단계·현재 소유 영역에 보관된 사진이 있으면 ‘사진 읽기’를 제공한다. 이미 올린 사진을 다시 업로드할 필요가 없다. 새 업로드는 기존 `finishScanBatch`의 단일 자동 분석 흐름을 그대로 사용한다. 결과는 사용자가 고칠 수 있는 후보로 표시하고 기존 확정 기록은 유지한다.

## 새 보드 버튼과 진행 중 사진 보완

4393 미리보기에서 찾기 어려웠던 새 보드 진입점을 보드 제목 옆에도 추가했다. 기존 App의 같은 생성 창을 연다. 374px 이하 로고 축약 규칙이 뒤 규칙에 덮이지 않도록 CSS 우선순위를 수정했고 상단 생성 버튼의 flex 축소를 막았다. 실제 사용자가 본 화면의 크기/배치는 CUA 장애로 재현하지 못했다. 정적 렌더에서 새 버튼을 확인했고, 새 빌드 파일을 4393 서버가 제공함을 확인했다. 전체 192개 테스트·타입 검사/빌드 exit 0.

- [직접 열거나 내려받을 진행 중 사진](http://127.0.0.1:4393/demo/rummikub/in-progress.jpg)
- [작성자·출처·라이선스](http://127.0.0.1:4393/demo/rummikub/attribution.json)
- [검증 기록](new-board-fix.json)

사진은 공용 묶음과 받침대가 보이는 실제 플레이 장면으로, Large Numbers Edition이다. 이전 연구 파일을 변형 없이 복사했다. 사진의 초록을 Classic의 주황으로 바꾸지 않는다. 제품 표지나 사용자 기록으로 자동 적용하거나 AI에 업로드하지 않았다.

## 연결한 곳

- `gamepacks/rummikub.ts`: 실제 게임 목록에 제공하는 Classic 기록 프로필. `server/index.ts`가 기본 팩으로 등록한다.
- `shared/rummikub.ts`: 실물별 ID, 묶음/타일 순서, 앞뒤, 숫자/색 모름, 근거 사진/영역, 편집과 되돌리기.
- `src/RummikubWorkspace.tsx`: 추가·삭제·숫자/색 수정·앞뒤 순서·묶음 이동·나누기/합치기·되돌리기·근거 사진 열기.
- `src/SessionWorkspace.tsx`: 루미큐브 전용 편집기를 선택하고 기존 저장/이동 전 flush 및 PIN 보호 흐름을 재사용한다. 개인 촬영은 받침대로 안내한다.
- `server/ai/rummikubPrompt.ts`, `server/ai/prompt.ts`, `server/ai/index.ts`: 루미큐브 전용 사진 관측 계약. 결과는 후보이며, 안 보이는 뒷면의 숫자/색/조커를 확정하지 않는다.
- `server/engine.ts`: 수동 수정도 전용 형식과 소유 영역을 검증하고 사진 근거를 보존한다.
- `server/compare.ts`: 사진 ID·영역·생성 ID가 달라도 실제 면과 순서가 같으면 동일 상태로 비교한다.
- `src/Dialogs.tsx`: 플레이어 표시색과 타일 인쇄색을 구분한다.

입력 → 루미큐브 형식/사진/소유 영역 확인 → 후보 → 타일 수정 → 기존 스냅샷 저장 → 재열기 순서다. 공개 사진만으로 개인 받침대를 만들지 않는다. 소유 영역이 다른 기록이나 잘못된 형식은 저장 전에 거절한다.

## 꼭 읽을 변경

1. `shared/rummikub.ts`의 `normalizeRummikubDetailed`: 같은 빨강 7 두 개도 별도 ID로 남긴다. 합치면 실물 하나를 잃게 되므로 숫자/색으로 중복 제거하지 않는다.
2. `server/compare.ts`의 `compareStateValues`: 타일 순서는 게임 상태이고 사진 ID는 근거다. 사진을 다시 찍은 것과 타일을 옮긴 것을 구분한다.
3. `tests/rummikub-runtime-integration.test.ts`: 임시 서버 재시작 후 저장본, 차례, 메모와 개인 받침대를 확인하는 실제 API 경로 검사다.

## 검증의 범위

**VERIFIED:** 전체 `npm test` 192/192, 타입 검사를 포함한 `npm run build` exit 0. 아래 실제 컴포넌트 정적 렌더 검사도 exit 0.

자동 검사는 실제 API·임시 저장소·로컬 모의 모델을 사용한다. `tests/rummikub-model.test.ts`, `tests/rummikub-comparison.test.ts`, `tests/rummikub-runtime-integration.test.ts`, `tests/rummikub-source-evidence.test.ts`가 중복 타일, 1/7/13, 묶음 이동과 되돌리기, 원본 근거, 개인 PIN, 저장/재시작/복원, 전용 관측 프롬프트를 다룬다.

읽기 전용 통합 검토에서 두 문제를 재현하고 수정했다. 동일 영역의 AI scene이 여러 개면 마지막 항목만 남기는 대신 모두 보류하고 안내한다. 개인 받침대가 공용 원본을 참조한 경우에는 편집기와 서버가 같은 허가 목록을 사용해 수정 후에도 사진 ID와 영역을 보존한다. 다른 플레이어의 개인 사진은 제외한다. 이 수동 출처 정책은 공용 사진에서 비공개 받침대를 AI로 추측한다는 뜻이 아니다.

실제 React 컴포넌트의 정적 렌더 검사:

```sh
node --import ./docs/board-story/feedback/register-css.mjs --import tsx docs/rummikub-integration/verify-ui.mts
```

이 검사는 공용/받침대 편집기의 분리와 PIN 잠금 시 편집기 비표시를 확인한다. 브라우저 화면 캡처나 클릭 검사, CSS/레이아웃 검사가 아니다.

클로드 클라우드 UI 커밋 `300f2d4`의 변경은 `src/styles.css`, `src/board-feedback.css`에 그대로 적용했다. [적용 기록](../cloud-ui-integration/integration.json)을 참조한다. 이미지 크롭과 안내/저장 그림 배치를 고친 변경이다.

**미확인:** 현재 CUA에 브라우저가 없어 390/1440px 렌더·실제 클릭·터치는 검사하지 못했다. 처음 연결 검사에서는 유료 호출을 하지 않았다. 사용자의 자동 인식 요청 후 실시한 실제 판독 1회의 연결 결과는 `live-analysis.json`에 별도 기록한다. 전체 인식 정확도를 측정한 벤치마크는 아니다. 묶음 합법성, 점수, 자동 턴 진행, Twist/Xpress 특수 규칙은 지원하지 않는다. 이번 변경은 로컬에 적용했으며 공개 배포는 하지 않았다.

## 짧은 개발 영어

`tile` 타일 · `group` 묶음 · `rack` 받침대 · `snapshot` 저장본

“Keep both copies.” 두 사본을 모두 남긴다. “Save the tile order.” 타일 순서를 저장한다.

“Each tile has its own ID. The rack is private. We save the group order.”

확인 질문: 같은 색·숫자의 타일 두 개를 한 항목으로 합치면 저장·재개할 때 무엇을 잃을까?
