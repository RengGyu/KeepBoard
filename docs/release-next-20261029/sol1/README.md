# 스캔 실패·중단 사진의 원본 열람

**VERIFIED — 구현솔1, 2026-10-29.** 저장된 스캔 bundle의 각 unit은 성공 receipt가 없어도 `sourceEvidenceId`로 해당 원사진을 열 수 있다. 변경은 아래 제품 파일 1개와 집중 테스트 1개다. 다른 작업자의 변경을 되돌리지 않았다.

- `src/ScanObservationResults.tsx`: 성공 receipt와 촬영 정의가 있으면 기존 관측 overlay를 유지한다. 그 외에는 접힌 ‘사진 원본 보기’와 저장된 원사진을 표시한다. crop 입력 대신 원사진 ID를 사용한다. 사진이 없으면 찾을 수 없다는 문구를 표시하고 URL을 만들어 내지 않는다. 현재 owner와 public/player 범위가 맞는 evidence만 사용한다. 기존 사진 레이아웃 CSS를 재사용한다.
- `tests/scan-observation-results-ui.test.ts`: 성공 overlay 유지와 실패·중단 원사진, 촬영 정의 부재, crop 원본 대응, 원사진 누락, owner·scope 분리, bundle 부재를 합성 SSR로 검증한다. 렌더링이 session/receipt를 변경하지 않고 정정 의무 UI를 추가하지 않음도 검사한다.

## 검증

**VERIFIED:** `npx tsx --test tests/scan-observation-results-ui.test.ts tests/workspace-compact-ui.test.ts tests/scan-observation.test.ts` — exit 0, 12/12 통과. 새 UI 테스트 5개와 기존 저장 버튼·scope/사진 화면 및 연결 규칙 테스트 7개다.

**VERIFIED:** `npx tsc --noEmit` — exit 0. 전체 빌드는 감독관 소유이므로 실행하지 않았다. 저장/API/게임팩/판독 계약·의존성·CSS에는 변경이 없다. 유료 호출·배포·커밋 0.

## 한계

실제 브라우저의 펼침 조작과 사진 로드는 이번 작업에서 검증하지 않았다. 테스트는 합성 원사진 URL을 사용한 서버 렌더링이다. 기존과 같이 assertion receipt에서 조회할 수 있는 저장된 `scanBundle`이 있어야 결과 UI가 나타난다. bundle 자체가 없는 경우의 생성·보존 동작은 변경하지 않았다. 이 결과는 인식 정확도나 전체 릴리스 준비 상태의 근거가 아니다.
