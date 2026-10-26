# 비동기 사진 분석 독립 검토

결론: **검토한 변경에서 추가 필수 수정 결함을 확인하지 못했다.** 단일 서버 프로세스에서 저장된 원본으로 시작한 작업을 재발견하고, 기존 확정값을 덮지 않는 목적에 적합하다. 모델 속도·실사진 정확도·운영 적용 성공을 인증하는 결론은 아니다.

대상은 `docs/background-analysis/integrated.patch`와 명시된 격리 사본이다. sourceDigest `b19811fa48d6b1bedffb15a6119daba351abb771173af71f23b5012748d571ab`. 변경 11파일을 직접 읽고 SHA를 다시 계산해 전달 manifest와 일치함을 확인했다. 전체 source-map의 digest도 일치한다. 변경하지 않은 모든 파일까지 다시 해시한 것은 아니다. [직접 계산 결과](sol1-source-check.json).

## 독립적으로 확인한 코드 경계

|검토 항목|확인 결과와 위치(격리 사본)|
|---|---|
|작업의 정확한 의도|`server/index.ts:345`의 signature에 owner, 현재 epoch, 원본 ID 순서, purpose, instruction, 고정 pack/version/sourceSHA가 포함된다. `server/analysisJobs.ts:19`는 같은 requestId의 다른 signature, 활성 작업의 다른 signature/revision을 409로 거절한다. 다른 사진을 조용히 기존 작업으로 바꾸지 않는다.|
|짧은 시작과 독립 실행|시작 전 원본 저장·권한 확인 후 job 파일을 먼저 저장하고 202를 반환한다. session queue 밖에서 모델을 호출한다. 스케줄러 실행 2/전체 진행·대기 16은 **프로세스 전체** 기준이다.|
|소유자·원본 경계|POST는 같은 owner/public 원본만 허용한다. 입력은 redact/roomInput, 결과는 fieldScope·evidence ID·component validator를 통과한다. GET은 room actor와 PIN을 다시 확인하고 요청 owner와 정확히 일치하는 메타만 반환한다. 프롬프트/개인 요약/공급자 오류 원문을 job 상태에 넣지 않는다.|
|완료 충돌|모델 진입 전과 저장 전 현재 epoch, accepted 및 candidate를 포함하는 scope digest, 원본 목록, PIN 설정 stamp, 방의 쓰기권한/예상 revision을 재검사한다. `appendGenericObservation`의 동일 근거 후보 교체도 이 검사 뒤에서만 실행한다.|
|파생값 timestamp 제외|`scopeVersion`은 `basis==='rule'`만 제외한다. 원래의 수동/accepted/candidate는 남는다. 무관 owner 편집에 따른 규칙 재계산 timestamp만으로 공용 작업이 stale이 되는 문제를 피하면서 사용자 편집 충돌은 유지한다.|
|후보와 확정 revision 분리|candidate 완료에서 `rooms.bump`를 하지 않는다. 사용자 PATCH·명시 accept는 기존 `change/authorizeMutation/rooms.bump` 경로를 사용한다. 완료가 자기 초안의 base revision을 무효화하지 않으며, 사용자 수정 이후의 새 요청/완료는 여전히 충돌한다.|
|재시작|job ID가 붙은 저장 assertion이 있으면 완료로 복구한다. 미완료 queued/running만 남으면 interrupted; 자동 모델 재호출은 없다. 같은 requestId 재제출도 기존 상태를 돌려준다. 프로세스 강제 종료 시험은 실시되지 않았다.|
|화면 이동과 업로드|`SessionWorkspace`는 저장 완료 evidence ID로만 시작한다. 업로드 전 이탈은 지속되지 않으며 `flush`가 미완료 전송을 막는다. Catan `SceneWorkspace`는 `acceptCandidate:false && !dirty` 이동/사진준비만 skip하고 dirty 및 명시 저장은 유지한다. poll은 owner/session 불일치 상태를 즉시 숨기고 완료 시 세션을 재조회한다.|

`SceneWorkspace`의 다른 필드 선택(select)은 기존 `saveEditor.current()` 경로를 그대로 유지한다. 이번 변경이 모든 종류의 화면 전환을 새 저장 정책으로 바꾼다고 일반화하지 않는다.

## 검증 근거의 수준

- **VERIFIED_CODE_ONLY:** 위 11파일 diff와 연결된 권한·redaction·generic append·호출 흐름, 변경 파일 SHA. API는 라우트와 호출 테스트를 독립적으로 추적했다.
- **REPORTED_WITH_LOG:** 집중 14/14, 전체 573/573 및 build/typecheck exit 0. 실제 로그와 테스트 내용은 확인했지만 연구 worker가 다시 서버를 띄워 실행하지 않았다. 마지막 완료 문구 1줄 변경 뒤 UI 3/3 및 최종 build가 별도 실행됨을 구분했다. [전달 검증 기록](../background-analysis/verification.json).
- **REPORTED_CUA:** 390px에서 이탈·재진입·reload, 후보 1/accepted 0, 수동 색/수량 변경→명시 적용→저장→재열기. mock 1, 실제 AI 0. 4408 preview의 초기 화면은 최종 guard가 아닌 이전 프로세스이므로 최종 서버 guard 검증 근거로 삼지 않았다.
- 연구 검토 중 제품 변경, 운영 서버 조작, 실AI 호출은 **0**.

## 남는 한계와 작은 후속

1. 모델 결과가 정상적으로 0후보인 경우 assertion receipt가 없다. 세션 저장 뒤 terminal metadata 저장 전이라는 좁은 실패 구간에서는 재시작 시 완료 대신 interrupted가 될 수 있다. 자동 유료 재실행은 없고 기존 기록도 보존되므로 이번 목적의 필수 차단 결함으로 분류하지 않는다. 향후 이 상태까지 정확히 표시하려면 결과 본문 없는 완료 receipt를 세션 저장과 함께 남기는 작은 수정/회귀가 필요하다.
2. requestId가 같은 재시도는 같은 요청이며, 새 모델 실행 의도라면 새 requestId가 필요하다. UI의 “다시 읽기”는 새 ID를 사용한다. 전송 오류 후 재시도와 사용자가 새로 읽기를 선택한 경우를 측정에서 따로 센다.
3. 새 API의 job timing은 서버 내부 숫자다. 전체 사용자 대기는 사진 준비·업로드·queue·provider·parse·commit·2초 폴링·렌더를 별도 측정해야 한다. `api.ts`의 기존 `analysis-roundtrip` 계측은 `/analyze`만 잡으므로 새 job에 그대로 적용됐다고 말하면 안 된다. [최소 실험 카드](latency-experiment.md).
4. 입력 사진 ID/epoch 고정은 **같은 물리 상태 촬영을 증명하지 않는다.** 서로 다른 공개 사진을 한 번의 스캔으로 합쳐 시험하지 않는다. 게임별 공개/owner 구획 계약은 별도로 유지한다.

이 검토는 동결본에만 유효하다. 제품 통합·배포 결정은 감독의 범위다.
