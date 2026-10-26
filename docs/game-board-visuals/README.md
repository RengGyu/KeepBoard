# 게임별 기록판 연결 · 인계

상태: **VERIFIED · 로컬 구현/합성 검증 완료, 파일 소유권 반환**. 운영 배포·기존 프로세스 재시작은 하지 않았다.

## 제공 범위

- 루미큐브를 제외한 119게임, 522영역을 별도 매핑에 연결했다. 게임 분류는 reuse 41 / new 60 / source-pending 18이다. 숨김·현재 표현 불가 82영역은 not-needed로 남겨 내용을 그리지 않는다. 전수 데이터는 [coverage.json](coverage.json)에 있다.
- 공통 SVG 6개와 기존 게임 구성물 아트를 이용해 **실제 저장된 개체**를 보여 준다. 선택 정정, 수동 배치/회전/되돌리기, 확대/이동, 기존 상단 저장과 재열기를 연결했다. 큰 편집 폼은 기본 닫힘이다. 수량을 그림 장수로 펼치지 않으며 null과 0을 구분한다.
- 격자·선·트레이는 수동 기록 가이드다. 상용 인쇄판, 정확한 슬롯·도시·간선, 게임별 규칙이나 자동 판독을 구현했다는 뜻이 아니다. 기존 카탄/루미큐브 native 경로는 유지한다. 카르카손은 기존 타일 아트를 사용한 자유 배치 기록이다.
- 기존 아트 파일 498개의 SHA를 보존했다(437 구성물 분류). 원명세·아트·팩은 수정하지 않았다. Catan의 supply/ordered-deck 두 원본 영역은 field 연결이 없어 임의 연결하지 않았고 native 경로를 유지했다.

## 저장·권한 계약

GenericRecord v1에 선택적 `placement: {areaId,x,y,rotation}`만 추가했다. x/y는 유한한 0..1, 회전은 0/90/180/270, areaId는 pinned binding 소속이어야 한다. 기존 객체에 placement를 자동 생성하지 않는다. ID·배열 순서·anchor·수량·사진 evidence/region은 유지한다. 사진 crop과 수동 배치는 다른 값이다.

게임/판본/source SHA 불일치와 알 수 없는 영역은 중립 표면·미배치로 읽으며 원래 placement를 삭제하지 않는다. owner 기록은 해당 owner에 한정하고, 공개 개요에는 공개 field만 사용한다. 기존 PIN 잠금과 physical-only 제한을 유지한다. 공용 미상 소유색은 중립색이며 첫 variant/소유자를 추정하지 않는다.

감사 입력은 승인된 **F001–F006 여섯 component만** [fidelity-pending.json](fidelity-pending.json)에 동결했다. 해당 그림을 정답으로 표시하지 않는다. 후속 F007–F017은 이번 패키지에 반영하지 않았다. 감사 파일의 후속 변경을 자동 수용하지 않으며 정확 색·variant 교정은 별도 작업이다.

## 변경 파일

- 제품: `src/GameEssentials.tsx`, `src/SessionWorkspace.tsx`, `src/GameBoardRecord.tsx`, `src/boardVisuals.ts`, `src/game-board-record.css`, `shared/genericRecord.ts`
- 생성: `tools/game-board-visuals/generate.py`, `public/game-art/boards/mapping.json`, 같은 폴더의 `free-table`, `square-mat`, `hex-mat`, `personal-tray`, `card-lanes`, `track-mat` SVG
- 검증: `tests/game-board-visuals-{record,mapping,api}.test.ts`, `tools/game-board-visuals/preview.mts`, 이 문서 폴더의 coverage/동결 입력/로그/캡처

재생성: `python3 tools/game-board-visuals/generate.py`; 변경 없는 검증: 같은 명령에 `--check`. 원본 변경에 따른 source 차이는 새 매핑에만 기록하며 기존 아트의 source SHA를 고치지 않는다.

## 실행 증거

| 실행 | 결과 | 로그 |
|---|---|---|
| invalid placement 합성 재현 | RED → validator 수정 후 GREEN | record-red.log / record-green.log |
| focused API/UI/native 관련 검사 | exit 0, 16/16 | focused-api-ui.log |
| 전체 `npm test` | exit 0, 246/246 | tests.log |
| `npm run typecheck` | exit 0 | typecheck.log |
| 최종 record/mapping 검사 | exit 0, 8/8 | final-focused.log |
| 최종 `npm run build` (tsc 포함) | exit 0 | final-build.log |

전체 suite 이후 마지막 제품 변경은 미상 공용 소유색을 명시적 중립색으로 전달하는 한 줄이다. 그 뒤 집중 8개와 타입 포함 빌드를 다시 통과했고 전체 suite는 반복하지 않았다. 최종 산출물: `index-D9yt7OJ_.js`, `index-jjCPszK2.css`.

## 실제 화면 검증

키 없는 fresh 합성 앱: **http://127.0.0.1:4402/**. 6개 직접 URL과 임시 Store 경로는 [preview.json](preview.json)에 있다. 프로세스 출력 세션은 47920이며 유지했다. Vite HMR은 끈 상태로 수동 새로고침을 사용했다. 기존 점유 WebSocket 24678은 건드리지 않았다.

Blokus / Carcassonne / Wingspan / Splendor / Monopoly / Pandemic 각각 390px 실제 브라우저에서 선택→표시/수량 수정→확대 150%→닫기→일반판 배치/포인터 드래그→상단 저장→새로고침을 수행했다. 저장된 snapshot의 ID/anchor/placement/3과0 수량 보존도 합성 API로 대조했다. 6개 모두 390/320 페이지 overflow 0, broken image 0, 기본 editor 닫힘이었다. 캡처는 제목을 가리는 알림이 사라진 뒤 최종 코드로 갱신했다.

Wingspan에서 p1/p2 기록 분리와 p2 미노출을 확인했다. 합성 API fixture로 PIN을 설정한 뒤 브라우저 재열기 잠금, 기존 PIN으로 실제 열기와 개인판 재표시를 확인했다. 브라우저에서 새 비밀번호를 설정한 검증은 아니다. viewport는 복원했다. 근거: [browser-results.json](browser-results.json), [browser-api-checks.json](browser-api-checks.json).

캡처: [Blokus](captures/blokus-390.png), [Carcassonne](captures/carcassonne-390.png), [Wingspan](captures/wingspan-390.png), [Splendor](captures/splendor-390.png), [Monopoly](captures/monopoly-390.png), [Pandemic](captures/pandemic-390.png), [owner 분리](captures/private-owner-390.png), [잠금](captures/private-locked-390.png).

실제 폰 손가락·가상 키보드·카메라·AI 정확도는 미검증이다. 6개 대표 흐름의 검증을 119게임의 정확 기하/모든 필드 완전 지원으로 일반화하지 않는다. 운영 API에는 이번 shared validator가 아직 반영되지 않았으며, 이후 감독이 배포할 때 같은 소스의 backend 반영이 필요하다. 이번에 사용자 자료·운영 모델/라우팅/프로세스는 변경하지 않았다.
