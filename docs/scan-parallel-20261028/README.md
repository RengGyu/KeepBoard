# 스캔 병렬화 완료 및 실사진 비교

2026-10-29. **구현과 제한된 검증 완료, 배포 없음. 30초 목표는 미달.**

아스트라 Ultra·구현솔 High 기존 세션은 재개 후 429로 다시 중단됐다. 감독이 기존 검토 기록과 소스를 바탕으로 최소 설계를 작성하고 직접 구현·검증했다. 아스트라 최종 감사나 구현솔의 완료 결과로 표시하지 않는다.

## 실제 사진 API 결과

동일 카탄 원본을 동일 4개 crop으로 나누고, 프롬프트·모델·설정·요청 바이트를 그대로 유지했다. Gemini 3.8 Flash, LOW thinking, HIGH media resolution, max output 32768. 각 조건 한 번, 총 8회/재시도 0/HTTP200·STOP 8회.

| 조건 | 동시 요청 | 전체 대기 | 입력 토큰 | 출력 토큰 | 총 보고 토큰 |
|---|---:|---:|---:|---:|---:|
| 순차 | 1 | 101.206초 | 5,192 | 15,333 | 20,525 |
| 병렬 | 2 | 50.910초 | 5,192 | 15,197 | 20,389 |

대기는 49.70% 감소, 약 1.99배 빨랐다. 병렬화는 입력 토큰을 줄이지 않는다. 출력 차이는 같은 요청의 실행별 변동이며 병렬화의 정확도·비용 개선 증거가 아니다. 실제 청구액은 측정하지 않았다.

| 구역 | 순차 요청 시간 | 병렬 요청 시간 | 순차 총 토큰 | 병렬 총 토큰 |
|---|---:|---:|---:|---:|
| 좌상 | 32.142초 | 33.098초 | 6,342 | 6,202 |
| 우상 | 33.396초 | 32.391초 | 6,456 | 6,407 |
| 좌하 | 17.923초 | 17.474초 | 3,809 | 3,895 |
| 우하 | 17.740초 | 17.808초 | 3,918 | 3,885 |

병렬에서는 우상이 좌상보다 먼저 도착했다. 결과는 완료 순서가 아닌 원래 unit index로 유지했다. 요청 SHA 4쌍 일치와 응답 SHA 8개를 재검증했다. raw·parsed 결과와 구역 매핑은 [timing-result.json](timing-result.json)에 기록했다. 겹친 crop의 출력 행을 실물 수로 합산하지 않았다.

**사진 변경:** 이전 시험의 임시 원본·요청 파일이 사라졌다. 기존 corpus에 기록된 [다른 카탄 원본](https://boardgamegeek.com/image/9862197)을 다시 내려받아 SHA `08942c1046b3e366e67e07e2b3ed3ef98a0fd116321af09504bfea1979c27bc8`와 일치함을 확인한 뒤 사용했다. 두 조건끼리는 완전히 같은 사진이다. 이전 사용자 사진 결과와 직접 성능 비교하지 않는다. 모델에는 주석 없는 사진을 넣었다.

**범위:** 이는 사진 API 직접 호출의 대기 시간이다. 업로드·영상 선별·그림 조립·저장·배포 서비스 전체 시간은 제외한다. 조건별 한 번이므로 반복 안정성·정확도는 미측정이다. 전량 GT가 없어 정밀도/재현율을 만들지 않았다. 제품 병렬 경로의 데이터 보존은 아래 합성 검사로 별도 검증했다.

## 제품 변경

- `server/scanObservation.ts`: 작업당 worker 1→2. 각 결과는 원래 index에 저장한다. 기존 원사진/SHA/영역/연결/충돌/수동값 보존 로직을 재사용한다.
- `workflows/analyze.ts`: 스캔 작업은 2개씩 wave 실행. 일반 분석은 기존 순차 유지. 모든 wave 결과가 끝나기 전 실패 정리·슬롯 반환을 하지 않는다. 기존 batch claim과 모델 step 재시도 0 유지.
- `server/cloudRuntime.ts`: scan unit에도 기존 timings 객체를 전달한다. 단위 모델 시간을 누락하던 계측을 보완했다. 합산 providerMs는 병렬 wall time과 다르다.
- `tests/scan-recognition-integration.test.ts`: 완료 순서 역전·4사진 source/index 보존, 실제 cloud 함수 동시 실행 및 완료 후 재전달을 검사한다.
- `tests/scan-parallel-workflow.test.ts`: 실제 workflow 본문에 step 대역을 주입해 병렬 상한·실패 join·단일 commit·기존 순차를 검사한다. durable replay 자체의 운영 시험은 아니다.
- `tests/cloud-gemini-execution.test.ts`: 과거 generic reader 대역을 현재 카탄 native 경로에 맞게 보완해, 한 번만 호출·영수증·시간 7ms 기록을 검사한다. 모델 API는 사용하지 않는다.

## 검증

최종 집중 검사 **21/21 통과**, 타입 검사 포함 `npm run build:vercel` exit0, `git diff --check` exit0. Vercel 빌드에는 기존 큰 번들 경고가 남는다. 배포·실운영 durable workflow 실행·실제 스캔 영상의 종단 30초 목표는 검증하지 않았다.

관련 집중 검사는 순서 역전, 사진별 SHA/receipt 보존, 부분 실패, 동시 CAS claim, 완료 후 재전달, owner/epoch/revision, 수동값, null/0, 저장·재열기를 포함한다. 단순 mock 시간은 위 API 시간에 섞지 않았다.

공개 영상 확보·로컬 프레임 선별의 사전 시험은 [이전 보고서](../public-scan-test-20261028/README.md)에 있다. 영상은 이번 유료 API 시간 실험에 넣지 않았다. 추가 촬영/직접 수정 UI 분리, 새 모델, 학습, 배포는 하지 않았다.

## 읽을 변경 3곳

1. `analyzeScan`: 완료 순서와 저장 순서의 분리. index는 사진의 신원이다.
2. `analyzeWorkflow`: `allSettled`가 빠른 실패 후에도 다른 요청이 끝나기를 기다린다.
3. `parallel scan keeps pinned source order...` 검사: 우측 사진이 먼저 끝나도 원사진·SHA·결과 순서는 유지된다.

입력 사진 → 고정 unit/index → 최대 2개 판독 → index별 결과 → 기존 연결/검증 → 한 번 저장.

용어: concurrency(동시 실행), source(원본), receipt(관측 기록), retry(재시도). “Keep the source order.” “Wait for both requests.” The result stays with its photo. Parallel calls reduce waiting time.
