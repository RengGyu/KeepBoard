# 사진 처리만 수정한 결과 — 2026-10-29

**VERIFIED:** 제품 수정은 `server/scanObservation.ts` 한 파일이다. 기존 지시문·출력 schema/필수 항목·모델·화질·출력 한도·게임 정의는 유지했다. 해당24파일 전후 SHA가 모두 같고, 고정된 같은 입력으로 실제 reader가 구성한 provider 요청 body도 바이트 단위로 같았다. 이 요청 동등성 검사는 fetch 대역을 사용했으며 실제 판독 결과와 구분한다.

**변경:** `prepareScanObservation` 한 번 안에서 같은 원본을 여러 번 다운로드하던 부분만 재사용한다. 다른 사진/사용자/촬영 단계와 섞지 않으며 준비가 끝나면 재사용 범위도 끝난다. 실제 분석 단계는 원본을 다시 읽고 SHA를 확인한다. 사진의 픽셀·선택·crop 영역·읽기 순서·기존 native/literal 판독 경로는 바꾸지 않았다.

기존 최대6장 선택·원본/crop 연결·최대2개 병렬화는 이미 구현된 상태라 이번 신규 변경으로 세지 않았다. 이번 개선은 기존 설계 계약을 유지하는 내부 중복 I/O 제거이며 새 촬영·선별 설계를 도입한 것이 아니다. [설계 조항 매핑](astra/design-mapping.md).

## 실제 같은 사진의 앱 판독

기존 배포와 변경 배포에 각각 같은 원본1장을 업로드하고 기존 Gemini 판독을1회씩 실행했다. 총2회, retry0. 원본 SHA `28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc`가 같다.

| 항목 | 변경 전 | 변경 후 |
|---|---:|---:|
| 사진 준비 prepareMs | 4.193초 | 3.346초 |
| 모델 요청 구간 providerMs | 54.537초 | 55.910초 |
| job total | 70.631초 | 64.011초 |
| 반환된 실물 행 | 51 | 49 |
| 지형/숫자판/도둑 | 19/17/1 | 19/17/1 |
| 건물 합계(마을+도시) | 8(6+2) | 8(5+3) |
| 도로 | 6 | 4 |
| 수정 없이 저장·재열기 | 원문/장면 일치 | 원문/장면 일치 |
| 저장 원본 bytes | 일치 | 일치 |

**한 번씩의 관측값이다.** 전체 시간 차이를 전부 이번 변경 효과로 돌리거나 검출 정확도 개선으로 해석하지 않는다. 실물 행은 정답률이 아니며 전량 GT는 없다. 출력 행51→49와 분류 차이를 그대로 기록한다. 같은 입력에서도 달라질 수 있는 모델 응답을 이번 재사용 로직의 인식 효과로 판정할 근거는 없다. 두 앱 실행의 session/evidence ID·시각은 다르며, 고정 fixture 요청 동등성 검사와 구분한다.

providerMs는 네트워크·응답 처리까지 포함한 reader 시간이며 job total은 사진 촬영·업로드·최종 화면까지의 종단 시간이 아니다. 모델 요청 구간이 약56초로 유지돼 **30초 목표는 미달**이다. 지시문을 줄여 속도를 만들지 않았다. [이전 실행](live-baseline.json), [변경 실행](live-candidate.json), [비교와 한계](comparison.json).

## 중복 읽기 감소의 직접 근거

| 준비 입력 | 이전 읽기 | 변경 후 읽기 | 검사 범위 |
|---|---:|---:|---|
| 원본1장 | 2 | 1 | 합성·실사진 HTTP 재생 |
| 원본3장 | 6 | 3 | 합성 |
| 같은 원본의 기존 crop2개 | 6 | 3 | 합성 |
| 원본+기존 crop2개 | 8 | 3 | 합성 |

같은 실제 JPEG의 HTTP 읽기를 ABBA 순서로2회씩 재생한 별도 준비 검사에서는 이전11.104/9.439초, 변경5.165/4.495초였다. 모든 plan/request가 deepEqual이었고 원본 해시가 같았다. **이 수치는 공개 사진 HTTP 전달을 재생한 준비 시간이며 실제 내부 BlobStore 전송·모델·앱 전체 시간과 같다고 하지 않는다.** 모델 호출0, 서비스 쓰기0. [실사진 HTTP 준비 재생](network-preparation.json).

## 구현과 검증

- 읽을 diff: `server/scanObservation.ts`, `prepareScanObservation` 16행 부근. 이전은 helper에서 읽은 사진을 SHA/plan 조립과 crop 부모 참조에서 다시 읽었다. 이후는 같은 준비 호출의 사진 identity별 Promise를 재사용한다. 실제 분석의 fresh read는 유지한다.
- 입력→준비의 원본 재사용→같은 plan/request→기존 판독→기존 원문/그림→저장·재개. 실패 사례는 다른 scope/epoch 사진의 잘못된 재사용과 준비 후 원본 변경이다. 새 `tests/scan-photo-preparation.test.ts`가 그 경계를 검사한다.
- 집중41/41, 전체 **789/789**, `git diff --check` 통과. 타입 검사를 포함한 `npm run build:vercel`와 원격 빌드 READY.
- 이전 모듈 snapshot과 동일 의존성으로 실행해 모든 고정 request/plan/transform을 deepEqual 및 JSON 문자열 전체로 비교했다. 다른 준비 호출 간 비공유, 실패의 다음 호출 비전파, 원본 변경 후 provider 호출 전 SHA 거절을 확인했다. [worker 검증](sol2/verification.json).
- 판독 관련24파일 변경0: [동결 목록](luna/frozen-reading.json), [동결 대조](frozen-reading-check.json). 실제 사진 bytes를 넣은 reader의 전후 요청 body도 동일: [대역 outbound 검사](model-body-equality.json). 이 결과의 빈 응답은 합성 transport fixture이며 인식 검사가 아니다.
- 이전 배포에서985소스 파일을 해시 확인해 복사한 뒤 `server/scanObservation.ts`만 반영했다. 실제 새 배포985파일과 drift0: [단일 파일 변경 경계](source-freeze.json), [원격 소스 대조](deployed-source-check.json).
- 배포 `dpl_AZnCBfqqJEr7vBnFLHvLwpV1T68T`, [운영 KeepBoard](https://keepboard-kappa.vercel.app). 운영 health/저장소와 자체 시험 기록은 [운영 검사](production-check.json), 최종 alias는 `production-deployment-inspect.txt`에 기록한다. 기존 사용자 사진/기록은 수정하지 않았다.
- 브라우저 제어 비활성 상태이므로 실제 폰 촬영·화면 클릭은 이번 검사 범위 밖이다. 새로운 crop 판독 실험·선별 알고리즘·모델 변경은 하지 않았다.

source(원본), cache(임시 재사용), request(요청). “Read the photo once.” “Keep the same request.” The image stays the same. The model settings stay the same.
