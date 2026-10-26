# 서버 사진 읽기 작업

- POST `/api/sessions/:id/analysis-jobs`: 저장 완료 원본 1–6장, requestId, expectedCaptureEpoch, scope/owner, purpose/instruction. 작업을 먼저 저장하고 202 반환. 동일 intent는 같은 작업, 같은 범위의 다른 intent는 409.
- GET 같은 경로(`?ownerId=`): 현재 room/PIN 권한으로만 상태 조회. UI가 2초마다 찾고 완료 후보를 재조회한다. 이전 owner 상태는 화면 전환 즉시 숨긴다.
- intent는 session/scope/owner/epoch/원본 ID 순서/purpose/instruction/pinned pack·source를 고정. 별도의 scope digest로 동일 대상 정정·후보·원본·PIN 설정 변경을 모델 진입 전/완료 저장 전 다시 검사한다.
- candidate만 추가하며 accepted는 자동 변경하지 않는다. candidate-only 완료는 방 accepted 편집 revision을 올리지 않는다. 명시 적용/수동 수정은 기존 CAS를 그대로 사용한다. 다른 owner 개인 메모는 public 작업을 stale로 만들지 않는다.
- 저장 후보에 analysisJobId receipt를 붙여 완료 상태 저장 직전 재시작에도 중복 후보 적용 없이 완료를 발견한다. queued/running만 남은 재시작은 interrupted; 유료 자동 재요청 없음.
- 단일 프로세스 최대 2개 실행/16개 진행·대기, terminal metadata 24시간. 숫자 timing만 노출하며 provider 오류 원문·summary는 상태 API에 넣지 않는다. PIN 잠금은 상태를 가리며 이미 승인된 서버 작업은 계속된다. PIN 설정 변경은 stale.
- 업로드 도착 전 브라우저 종료는 지속할 수 없다. 사진 준비/전송이 끝나고 서버가 job을 받은 뒤부터 지속된다. 기존 inline `/analyze`는 API 호환용으로 남긴다.

격리사본만 변경. 운영·공유 제품·모델/effort/프롬프트 변경 없음. 실제 AI 호출 0.
