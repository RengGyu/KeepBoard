# 서버 사진 분석 지속 작업 — A1 동결 인계

**VERIFIED:** 격리사본에서 서버 job 시작·재접속·후보 확인까지 연결했습니다. 공유 제품/공유 dist/운영/모델 설정은 변경하지 않았고 실AI 호출은 0회입니다.

현재 inline `/analyze`는 브라우저 응답을 중단해도 서버 계산이 계속될 수 있었습니다(mock 재현). 그러나 클라이언트가 응답을 잃으면 재접속 시 동일 요청을 찾는 영속 상태가 없었습니다. 새 경로는 저장 완료 원본으로 job을 먼저 저장하고 202를 반환하며, UI 이탈·새로고침 후 해당 권한 범위의 작업을 조회합니다. 실제 모델 처리 시간을 단축했다고 주장하지 않습니다.

- API: POST/GET `/api/sessions/:id/analysis-jobs`, 개인 조회는 `?ownerId=`. 시작 body/intent·scope 정책은 [design.md](design.md). 같은 requestId 또는 진행 중 동일 intent는 재사용, 다른 원본 순서/목적/권한 범위/대상 revision은 409. 재시도는 모델 자동 retry와 구분됩니다.
- 시작 전·완료 직전 epoch/범위 digest/원본/PIN 설정/room CAS 재검사. 결과는 candidate만 저장합니다. Catan/Rumi 이동·사진 준비는 미수정 후보를 확정하지 않으며, 편집 초안과 명시 저장 경로는 유지합니다. 무관 owner 개인 편집은 public job을 무효화하지 않도록 규칙 파생 타임스탬프를 digest에서 제외했습니다(RED→GREEN).
- 후보에 job receipt를 저장하여 candidate 저장 이후 상태 저장 전 재시작도 중복 적용하지 않습니다. queued/running만 남은 재시작은 interrupted, 유료 자동 재호출 없음. PIN 잠금 시 조회 차단; 이미 승인된 작업은 계속되고 PIN 설정 변경은 stale입니다.
- 파일 Store 단일 프로세스 기준 실행2/대기포함16/종료 metadata24시간. 이 숫자는 모델 속도 개선 실증이 아닙니다. 상태는 summary/provider 오류 원문 없이 숫자 timing과 제한된 오류코드만 반환합니다.

**검증:** 집중14/14, 전체573/573 exit0. 이후 완료 안내 한 줄만 중립 문구로 변경하여 UI3/3 및 타입 포함 최종 build exit0으로 갱신했습니다. [verification.json](verification.json), 전체 [full-test.log](full-test.log), [build.log](build.log). 390px CUA에서 읽기→로비 이탈→재진입·reload→동일 job 완료(후보1/accepted0)→수량3·파랑 정정→명시 적용→상단 저장→reload 보존을 확인했습니다. 원본/세션 준비만 API이며 나머지는 실제 UI 클릭입니다. 가로 넘침0, viewport 복원. 단일 브라우저 외 독립 권한/PIN/실패/epoch/원본순서/CAS/native는 mock API 근거입니다.

**적용 파일:** `server/analysisJobs.ts`, `server/index.ts`, `server/privatePin.ts`, `shared/analysisJobs.ts`, `shared/types.ts`, `src/SceneWorkspace.tsx`, `src/SessionWorkspace.tsx`, `src/analysisJobMessage.ts`, `src/api.ts`, `tests/background-analysis-api.test.ts`, `tests/background-analysis-ui.test.ts` (11개). exact 격리경로·파일별 before/after SHA는 [source-manifest.json](source-manifest.json), 적용용 [integrated.patch](integrated.patch). shared baseline drift 0. **아직 적용/배포하지 마세요.** 감독/Astra 최종 검토용으로 파일 소유권을 반환합니다.

최종 JS `index-CjSzjoVo.js`, CSS `index-u-JBb3AS.css`. 격리 전체 source digest `b19811fa48d6b1bedffb15a6119daba351abb771173af71f23b5012748d571ab`. 합성 프리뷰 http://127.0.0.1:4408/?session=cbd41025-1e31-420c-93b8-ba0afb6dbd14 (출력 session98561, 기존 프로세스 불변).

**한계:** 업로드가 서버에 도착하기 전 종료는 계속할 수 없습니다. 미확정 작업은 서버 재시작 후 자동 모델 재실행하지 않습니다. 재시작 검증은 저장 metadata+새 scheduler instance이며 운영 프로세스 강제종료 검증이 아닙니다. 실AI 정확도/실휴대폰 백그라운드 OS 동작·다중 Node 분산 실행은 미검증입니다. 첫 두 캡처는 최종 완료 문구 한 줄 교정 이전이고 saved-reopened 캡처는 최종 빌드입니다.
