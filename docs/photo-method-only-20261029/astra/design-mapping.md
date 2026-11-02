# 기존 사진 처리 설계 매핑 — 준비 단계의 동일 원본 읽기 재사용

2026-10-29 · 연구아스트라 · 제품 편집/모델 호출/배포0

**RECOMMENDATION: `prepareScanObservation` 한 번 안에서 동일한 고정 Evidence의 원본 bytes를 재사용하는 패키지 하나만 구현한다.** 입력 사진·선택 순서·읽기 단위·crop 사각형·프롬프트·필수 출력 필드·schema·모델 설정은 바꾸지 않는다. 최대2개 판독 병렬화는 이미 배포된 기능이다.

이는 기존 문서가 빠뜨린 신규 필수 기능을 찾아냈다는 뜻은 아니다. **문서에는 “이미지 bytes 캐시를 구현하라”는 조항이 없다.** 채택된 사진·출처 고정 계약을 그대로 수행하면서 반복 I/O를 제거하는 내부 구현 개선이다. 새 선별/촬영 알고리즘을 요구한 것으로 해석하지 않는다. 이 구분을 구현 완료 보고에도 유지한다.

## 설계 조항 → 현재 상태

| 기존 조항 | 직접 확인한 현재 코드 | 판정 |
|---|---|---|
| [묶음 설계 §1,40행](../../scan-recognition-design-20261028/implementation-plan.md): “전송 전에 총 unit 수를 고정”, “기존 최대6장 선택과 서버 동시 실행 제한을 재사용” | `scanBatch.finishScanBatch`가 현재 run의 저장된 ID를 한 번 전달. `SessionWorkspace.readStoredPhotos`는 현재 사진 최대6장, `finishCaptureRun`은 선택 ID 전체를 전달. `prepareScanObservation`이 해당 순서로 unit/plan을 고정. | **VERIFIED 구현됨.** 마지막 한 장 제한 해제를 이번 신규 작업으로 셀 수 없음. |
| [같은 §1,40행](../../scan-recognition-design-20261028/implementation-plan.md): 같은 scope/epoch/bytes/task/모델/대상 revision의 활성 작업만 재사용; 다른 상태를 유사성으로 캐시하지 않음 | job 재사용 및 고정 source 검사가 기존 경로에 있음. prepare 내부에서는 같은 Evidence bytes가 helper 및 plan 조립에서 다시 읽힘. | **VERIFIED:** 동일 준비 호출 안의 중복 I/O를 줄일 수 있음. 다른 job·상태·유사 사진의 결과 재사용 권한은 아님. |
| [같은 §1,42행 및 §3,60행](../../scan-recognition-design-20261028/implementation-plan.md): 원본/입력 SHA·크기·행렬 유지, crop/detail은 기존 literal, native Catan 한 장은 유지 | `PhotoDialog.saveCrop`이 sourceRegion을 전달. `prepareScanObservation`이 `cropPhotoTransform`, sourceSHA/inputSHA, 원본 evidenceId를 연결. `analyzeScanUnit`은 anchor/native와 detail/literal을 기존대로 선택. | **VERIFIED 구현됨.** crop 생성 방식/좌표/판독기 선택은 이번에 수정할 gap이 아님. |
| [병렬 채택 설계5–11행](../../scan-parallel-20261028/design.md): local worker2, cloud wave2/allSettled, index 유지, claim/retry0, source/receipt 유지 | `server/scanObservation.ts`, `workflows/analyze.ts`, `server/cloudRuntime.ts`에 반영됨. [릴리스 완료 기록](../../release-next-20261029/completion.json)에 포함. | **VERIFIED 소스·기록상 배포됨.** 이번에 다시 “병렬화 구현”이라 보고하지 않음. |
| [묶음 설계 §1,38행·§2·수용 사례](../../scan-recognition-design-20261028/implementation-plan.md): 원문 불변, unit/ref namespace, 모름/수동값/출처/부분 실패 보존 | 기존 projection/receipt/commit 경로가 담당. | 이번 개선은 이 경로를 그대로 사용. 행 삭제·추가·연결 알고리즘 변경 없음. |
| [scan-token 연구 §3A/B·§6](../../scan-token-research-20261028/README.md): 최선 대표 교체, 품질 메타데이터 및 API 선택 목록 보완 | 현재 `scanQuality`는 품질/중복 기준으로 후보를 확보하고 `accepted`에 fingerprint를 보관. `PhotoInput`에는 후보 품질 이력/교체 결정이 없음. | **연구 제안의 미구현 부분.** 이번 “기존 방식만” 지시로 새 품질 점수·대표 교체·재선별 정책을 채택하지 않음. |

묶음 인계 문서는 원래 제목에 “제안, 실행 승인/완료 아님”이 표시되어 있다. 이후 채택된 묶음·병렬 구현과, scan-token의 후속 연구 제안을 구분한다. `scan-token` §6은 기존 묶음을 계속 진행하고 추가 알고리즘을 선행 요구하지 말라고 명시한다. 자동6×4crop, 모든 null 재판독, 새 참조 이미지, 모델/출력 최적화로 범위를 넓힐 근거는 없다.

## 최소 수정 패키지

**제품 소유 파일:** `server/scanObservation.ts`의 `prepareScanObservation` 내부. 별도 전역 캐시나 공용 타입을 만들 필요는 없다. 관련 집중 테스트는 기존 `tests/scan-recognition-integration.test.ts` 또는 별도 `tests/scan-preparation-read-cache.test.ts` 한 파일로 구현자가 정한다. `server/hostedObservation.ts`, `server/localObservation.ts`는 기존 `readImage` 주입점을 재사용하면 수정하지 않아도 된다.

현재 경로는 `prepareHostedObservation`/`prepareLocalObservation`에서 사진을 읽고, 이어 plan의 SHA/크기 구성에 같은 사진을 다시 읽는다. crop마다 같은 부모 원본도 다시 읽을 수 있다. 선택 frame source를 미리 prepare하는 분기도 같은 바이트 공급자를 사용할 수 있다. **정확한 실행 read count와 준비 시간은 구현솔2의 계측/검사 대상**이며 이 문서에서는 실측값을 만들어 내지 않는다.

구현 계약:

1. `prepareScanObservation` 한 번의 지역 상태로만 읽기 결과/진행 Promise를 기억한다. 같은 고정 source identity는 한 번 읽고 모든 기존 prepare 호출과 plan 조립이 동일 bytes·mimeType을 사용한다. source ID에 연결된 URL/owner/scope/epoch 등 입력이 다르면 동일 사진으로 합치지 않는다.
2. `readImage`는 **필요해진 시점에만** 실행한다. 먼저 모든 사진을 prefetch하는 변경은 하지 않는다. 잘못된 frame/source/owner 입력이 이미지 읽기 전에 거절되는 기존 순서와 검사를 유지한다.
3. 원사진·crop을 다른 ID로 구분한다. crop 자신의 bytes와 부모 원본 bytes는 별도 항목이다. 기존 `sourceRegion`, SHA, 크기, transform, unit index, anchor/detail/crop role은 계산·검증 결과가 같아야 한다.
4. 원본을 재압축·리사이즈·회전·crop 재생성하지 않는다. 캐시된 Buffer는 읽기 전용처럼 취급하고 변형본으로 덮지 않는다. bytes는 job/plan/receipt/DB에 추가 저장하지 않는다.
5. 준비 함수가 끝나거나 실패하면 캐시 수명도 끝난다. 분석 단계의 `analyzeHostedObservation`/`analyzeLocalObservation`는 기존대로 원본을 새로 읽고 고정 SHA를 확인한다. 준비와 실행 사이 원본 변경을 준비 캐시로 숨기지 않는다.
6. 읽기 실패를 다른 내용/빈 이미지로 대체하거나 자동 재시도하지 않는다. 새로운 준비 호출은 이전 실패·이전 bytes를 재사용하지 않는다. 캐시 범위는 선택된 사진과 그 사진이 실제 참조하는 부모 source뿐이다.

이 계약은 **동일 source의 중복 I/O 제거**다. `ObservationResult` 재사용, 다른 사진 중복 판단, API 호출 생략, 이미지 선택 알고리즘은 아니다.

## 의미 있는 확인

- 고정 taskId/session/evidence/정의로 변경 전후 `PinnedScanObservation` 전체를 비교한다. unit 수·순서·request images·SHA·scope·target·frame·transforms가 동일해야 한다.
- 같은 원본 여러 번 참조, 부모 하나를 공유하는 crop들, 두 번째 사진의 frame에서 원본 읽기 횟수를 센다. source마다 준비 중1회이며 입력별 bytes·mimeType이 바뀌지 않아야 한다.
- 같은 ID라도 source identity가 다른 입력을 잘못 합치지 않음, 서로 다른 prepare 호출 사이 비공유, 읽기 거절 전파·자동 retry0을 확인한다.
- 기존 잘못된 frame의 사전 거절, owner/epoch 분리, crop 원본 좌표, null/0·수동값·source/receipt 저장·재열기 회귀를 유지한다.
- 준비 후 원본 bytes를 바꾼 fixture에서 실제 분석의 기존 SHA 불일치 거절이 계속 발생해야 한다.
- 이전/이후에 model fetch를 기록하는 대역으로 **동일 입력에 대한 모델 요청 body가 동일**한지 확인한다. native prompt 파일의 복원 SHA `d89caf23705771a6c5113cef83f0ab669f0beb8b82bf3c8d881aa8cbb9b885bf`, generic prompt/schema/reader profile도 변경하지 않는다. 새로운 source ID 때문에 생기는 정상 요청 metadata 차이는 별도 비교 실행에서 명시하되, 고정 fixture의 동등성 검사는 생략하지 않는다.

성공 기준은 원본 읽기 횟수가 줄고 동일 계획/입력/결과 보존 계약을 유지하는 것이다. 합성 지연을 주입한 시간은 스케줄링 검사일 뿐 실제 사진 준비 시간으로 보고하지 않는다.

## 같은 원사진의 실제 비교와 제품 변경을 구분

**이미 있는 결과:** 4crop cap1→cap2 101.206→50.910초는 [이전 동일 요청 실험](../../scan-parallel-20261028/README.md)의 결과다. 이번 준비 캐시의 성능값이 아니다. [기존 native 실제 실행](../../release-next-20261029/live-baseline.json)의 prepare3.873초/provider45.034초/전체58.333초는 단1회이며, prepare 전체가 중복 I/O라는 근거는 없다. **캐시로30초 목표를 달성한다고 예측할 수 없다.**

이번 제품 개선의 직접 비교는 감독이 사용할 **동일한 실제 원본 파일/기존 고정 crop bytes·source 사각형·선택 목록**을 그대로 두고 변경 전/후 준비만 실행하는 것이다. 원본 SHA, 읽은 바이트 수·호출 수·준비 wall time, 만들어진 plan/request 동등성을 기록한다. 파일이 실제 사진이어도 모델 대역을 쓰면 “실제 사진의 준비 단계 비교”이며 “실제 AI 판독 성능”이라고 하지 않는다. 이미지 재다운로드·재인코딩이나 다른 corpus로 교체하면 동일 사진 비교가 아니다.

실제 API 호출을 감독의 별도 실행 권한으로 수행한다면 같은 사진·같은 native/literal 경로·같은 원문 prompt/schema/설정·같은 unit 계획으로 실행하고 provider/prepare/전체 시간을 분리한다. API는 같은 픽셀과 지시를 받으므로 검출 향상을 기대하는 변경이 아니며 실행별 응답 차이를 캐시의 정확도 효과로 해석하지 않는다. 같은 crop 전략의 별도 사진 확대 비교는 기존 설계의 다른 검증 항목이지 이 준비 최적화의 전후 성능값이 아니다.

이 연구는 원사진을 새로 가져오거나 모델/운영 요청을 실행하지 않았다. 현재 도구 역할에서 추가 API 권한은 없다. 새 사진 선별 정책을 구현해야만 한다는 전제를 만들지 않고, 위 한 파일의 준비 단계 개선을 구현솔2에 인계한다.
