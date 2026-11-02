# 스캔 연결·병렬화 운영 반영 — 2026-10-29

**VERIFIED:** [운영 KeepBoard](https://keepboard-kappa.vercel.app)에 `dpl_3RjvkxfFz6wnyyVQDbNdJb1BEbWA`를 반영했다. 이전에 미배포였던 사진 묶음 연결·2개 단위 병렬 실행과 이번 원사진 UI·수량·기준점 수정을 포함한다. **30초 성능 목표 달성과 실기기 촬영 검증은 남았다.**

사용자가 지정한 구현솔1 `gpt-6.1-sol/high`, 구현솔2 동일, 연구아스트라 `gpt-6-astra/ultra`, 잡무루나 `gpt-6-luna/xhigh`로 네 내장 하위 에이전트를 생성·실행했다. 이번 환경에 Paseo 도구/CLI가 없어 과거 Paseo 세션을 재사용한 실행으로 표시하지 않았다. 부모 대화 대신 작업 카드와 Worker Runtime Rules 경로만 전달했다. 소유권과 실행 경과는 [work-sessions](../work-sessions.md)에 기록했다.

## 채택한 변경

- 기존 스캔 연결 패키지: 선택한 사진과 순서 고정, 단위별 원본/SHA/영역/원응답 보존, 확실한 연결만 그림에 반영, 미연결·충돌 보관, 수정 없이 저장·재열기.
- 기존 병렬화: 작업당 최대 2개 판독, 완료 순서와 무관한 원 index 유지, 실패 wave가 모두 끝난 뒤 정리. 기존 claim·영수증 재사용과 유료 호출 retry0 유지.
- 구현솔1: 성공 receipt가 없는 실패·중단 단위에도 접힌 ‘사진 원본 보기’를 제공한다. crop 입력 대신 원본 ID를 사용하고 현재 owner/scope 범위만 연다.
- 감독: `quantity:null`을 legacy count 또는 보드 기본값1로 바꾸던 결함을 수정했다. `null`은 모름, `0`은 관측된 없음으로 보존한다. 숫자·종류 정의와 기존 definition index SHA는 변경하지 않고 생성 입력의 정확한 runtime 변경 이력만 연결했다.
- 구현솔2: 제공된 frame이 다른 사진에 적용되지 않도록 제거하기 전에 실제 선택 원본에서 먼저 검증한다. malformed frame을 조용히 버리고 작업을 시작하던 `409→202` 회귀를 복구했다.
- 레거시 테스트: 새 판독의 자동 적용과 과거 저장 후보의 승인 호환 검사를 구분했다. 수동값·출처·영역·null/0·CAS·저장/재개 검사는 유지했다.

## 축약 판독 실험은 채택하지 않음

같은 원본 SHA `28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc`, 같은 모델/LOW/HIGH 설정으로 기존/축약 경로를 각각 한 번 실행했다. 총 모델 요청2회, retry0이다.

| 조건 | reader timer | job total | 결과 실물 행 |
|---|---:|---:|---:|
| 기존 운영 native | 45.034초 | 58.333초 | 49: 지형19·숫자17·도둑1·정착지8·도로4 |
| 축약 prompt/선택 필드 후보 | 9.890초 | 21.340초 | 8: 지형4·숫자3·도둑1 |

**FAILED:** 후보는 공급자 원문부터8개였고 literal8·그림8이었다. 연결 과정에서 사라진 결과라는 근거는 없으며, 원문은 지형4개에 `full`을 주장했다. 저장·원본 일치 검사의 PASS를 인식 품질 PASS로 해석하지 않았다. 21.340초를 30초 목표 달성으로 인정하지 않는다. 기존49개도 완전한 정답표나 전량 정확도 인증은 아니다.

reader timer에는 네트워크·응답 처리도 포함되며 job total은 사진 업로드부터 최종 화면/명시 저장까지의 종단 시간이 아니다. 각 조건1회이고 후보는 인증된 Vercel curl 전송을 사용해, 독립적인 prompt 속도 개선율·비용 개선율로 확정하지 않았다. 실제 공급자 토큰/청구액은 이번 앱 경로에서 측정하지 않았다.

실험 배포 `dpl_5yvCTdKWuBrq7Ha64wGdaESQjMbo`는 승격하지 않았다. 실험 소스·테스트는 [rejected-short](../performance-next-20261029/rejected-short/README.md)에 보관했다. 최종 `server/ai/catanSceneReading.ts`는 이전 운영 SHA `d89caf23705771a6c5113cef83f0ab669f0beb8b82bf3c8d881aa8cbb9b885bf`와 바이트가 같다. [독립 연구 판정](../performance-next-20261029/astra/live-followup.md), [원문 진단](candidate-output-diagnosis.json), [비교 A](live-baseline.json), [비교 B](live-candidate.json).

## 직접 검증

- 최종 `npm test`: **784/784**, 실패0. `full-test-release.log`. 실험 철회 전 785개 결과와 구분한다. 새 실험 전용 검사는 snapshot으로 보존했고 기존 호환 검사를 약화하지 않았다.
- 타입 검사를 포함한 최종 `npm run build:vercel`: exit0, `build-vercel-release.log`. 원격 Linux 배포도 READY. 기존 큰 client chunk 경고는 남는다.
- `git diff --check`: exit0.
- 이전 운영 소스982개를 SHA-1로 복원해 필요한21개 제품 변경과 배포 입력 제외 설정만 반영했다. 최종 업로드985개 파일은 실제 배포 소스와 전부 일치, drift0. [source freeze](stage.json), [실제 배포 대조](deployed-release-source-verification.json).
- 최종 배포의 실제 Supabase 경로: 원사진 직접 업로드 → 수량 null/0을 포함한 수동 기록 → 수정 없이 저장 → 재개 → 장면·메모·원본 바이트 일치. 모델 작업 제출0, 자체 테스트 기록만 정상 복구 가능한 보관 처리. [실제 HTTP 검사](release-smoke.json).
- 운영 URL의 HTML/JS가 최종 빌드와 같고 JS 바이트 SHA 일치, health200·Supabase/mock false·120게임·Gemini 가용 확인. [운영 확인](production-verification.json).
- 실사진 비교용 두 자체 테스트 기록도 보관 처리했다. 사용자 원래 기록·사진·메모는 수정하지 않았다.

현재 Work 설정에서 브라우저 제어가 비활성화돼 이번 실제 브라우저 클릭·모바일 화면/카메라는 확인하지 못했다. 원본 보기 UI는 합성 SSR 및 타입 검사 범위다. 최종 운영에서 실제 여러 사진의 durable 병렬 시간·재생 안정성, 여러 시점 자동 정합, 도로/도시의 인식률, 실제 휴대폰의 스캔→저장30초는 미검증이다. 집중 합성 검사와 실제 모델/실기기 검증을 섞지 않는다.

## 읽을 변경 세 곳

1. **`src/ScanObservationResults.tsx`, unit 렌더링(13행 부근).** 실패 상태 문구만 표시하던 곳에 원본 ID 기반 보기 경로를 추가했다. 성공 overlay는 유지한다. 실패 사례는 receipt/촬영 정의가 없는 경우와 다른 owner의 사진이다. `tests/scan-observation-results-ui.test.ts`가 관련 표시·범위를 검사한다.
2. **`shared/scene.ts`, `normalizeComponent` 301행.** 이전 `quantity ?? count`는 명시 null까지 대체했다. 이제 undefined인 경우만 legacy count를 사용한다. `tests/scene.test.ts`의 `explicit unknown quantity...`는 null·0·구형 count·누락 기본값과 JSON 재열기를 구분한다.
3. **`server/scanObservation.ts`, `prepareScanObservation` 19행 부근.** 원본이 다른 frame을 삭제하기 전에 해당 frame의 선택 원본을 기존 validator로 검증·pin한다. 다른 사진에 frame을 적용하지 않는다. `tests/lightweight-recognition-scope.test.ts`가 malformed·선택밖 source·틀린 SHA·두 번째 원본 frame과 기존 owner/PIN 경계를 검사한다.

입력 사진 → 고정 unit/index → 최대2개 판독 → 원문/출처와 연결 결과 → 기존 그림/기록 → 선택 수정 또는 바로 저장 → 재개.

용어: source(원본), receipt(관측 기록), unknown(모름), concurrency(동시 실행). “Keep the original photo.” “Unknown stays unknown.” The scan keeps its source. The saved value stays unknown.

다음 권고는 기존 판독의 작은 실물 결과를 보존하면서 지연 구간을 분리하는 한 패키지다. 추가 유료 비교나 실제 폰 검사는 별도 다음 작업이며 이번2회 예산을 넘겨 실행하지 않았다. 기술 확인 질문: 수량의 null과0을 같은 값으로 저장하면 재개할 때 어떤 판단이 달라질까?
