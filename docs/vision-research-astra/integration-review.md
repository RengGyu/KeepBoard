**촬영 계약 통합본 독립 검토 · 2026-10-23**

검토 대상은 120게임의 촬영 안내·선택 범위, 서버 비동기 분석, 후보 확인·저장 경로를 연결한 격리 통합본이다. **발견한 승인 API 결함 1개는 교정 후 독립 재현에서 해결됐으며, 검토 범위에서 추가 필수 수정을 확인하지 못했다.** 최종 집중검사 34/34가 통과했다. 운영 적용이나 실사진 정확도를 승인하는 결론은 아니다.

최종 동결 source digest는 `c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692`이다. 1,323개 실제 파일·변경 27파일·시험 당시 소스와 manifest가 모두 일치한다. 통합 patch SHA는 `fb98a47d11a3c9c3e2edc3b96a293557f9a74159dca4ec3e2afaeb379893eace`다. 최초 동결 이후 차이는 허가된 문구 3파일과 R1 교정·회귀 2파일뿐이다. [최종 해시 대조](integration-review.final-hashes.json).

**R1 — 사진의 촬영 부분을 바꿔 다시 읽은 후보를 기존 승인 API가 거절함 · 해결 확인**

- 위치: 최초 동결본 `server/ai/generic.ts:15`, `server/index.ts:450`.
- 재현: Splendor 공용 사진을 `market`으로 업로드 → 재읽기 요청에서 `player` 선택 → `__photo.public` 후보 생성 성공 → `/assertions/:id/accept`가 400으로 거절. 메시지는 “선택한 촬영 부분 밖의 결과입니다.”다. 같은 후보를 실제 Generic 화면이 사용하는 `PATCH answers`로 적용하면 200이다.
- 원인: 요청 사본의 새 촬영 부분은 후보 생성에 사용되지만 원본 메타데이터는 보존된다. 승인 때 `genericCandidateValue`가 원본의 옛 촬영 부분을 다시 강제한다.
- 최소 수용: 새 응답과 후보 저장은 요청의 선택 범위로 제한하고, 이미 검증·저장된 후보를 사용자가 승인할 때 옛 업로드 선택을 재강제하지 않는다. field/owner/evidence/typed 검증과 기존 관측값의 사진 재귀속 금지는 유지한다.
- 영향: 기존 승인 API의 호환 결함이며 현재 화면의 전체 정정·저장 흐름이 막힌다는 뜻은 아니다. [교정 전 독립 재현](integration-review.behavior.red.json), [실패 로그](integration-review.tests.red.log).
- 실제 교정: `genericCandidateValue` 안의 촬영 부분 검사를 `if(freshIds)`로 제한했다. 새 응답 정규화와 job/inline 저장의 독립 범위 검사는 그대로다. owner·근거·typed 검증과 기존 관측값의 사진 재귀속 금지도 유지된다. 같은 재현에서 승인 API 200, UI PATCH 200을 직접 확인했다. [교정 후 결과](integration-review.behavior.json), [회귀](integration-review.tests.mts), [34/34 로그](integration-review.tests.log).

**직접 확인한 연결 범위**

| 항목 | 확인 결과 |
|---|---|
| 고정 계약 | 최초 source digest `ecb937282bf255371b499cddc752fe997da5f6d5bbc0f09094e89d44b4021a70`의 1,323파일과 변경 27파일·patch SHA가 일치했다. [해시 근거](integration-review.hashes.json). |
| 120게임 | 각 게임의 ID·edition·sourceSHA 및 영역/부품/visible 속성 투영이 원연구 파일과 정확히 일치했다. [120행 근거](integration-review.contracts.json). 공식 규칙 사실성 재검증과는 다르다. |
| 441 촬영 영역 | 모든 영역에 현재 권한과 교집합인 목적 필드가 있다. 프로필이 기존 사진 허용 필드를 추가로 열지 않는다. [범위 대조](integration-review.scope.json). |
| 입력과 선택 | `PhotoCaptureGuide` → `SessionWorkspace.newCaptureRun` → 업로드 `Evidence.captureTarget` 또는 재읽기 요청 사본 → 서버 검증 → 현재 게임·선택 부분 프롬프트로 연결된다. 기존 사진은 메타데이터가 없어도 읽을 수 있고 재읽기 override로 원본을 이행하지 않는다. |
| 공용/개인 | 공개 개인 보유물은 공용 미귀속 영역으로 받는다. 자리·색으로 owner를 정하지 않는다. owner 사진은 그 owner 범위에 머문다. 한나비 own-hidden 손패와 코드네임 역할 키는 선택·관측 필드로 열리지 않는다. |
| 여러 장 | UI는 두 장 이상에서 같은 멈춘 상태인지 확인하며 마지막 한 장·사진만 보관도 제공한다. 서버도 명시 확인 전 분석을 거절한다. 실제 분석은 owner/epoch/선택 부분별로 나눈다. epoch만으로 같은 실물 상태라고 주장하지 않는다. |
| 값과 근거 | source 별칭은 새 모델 응답의 명시 piece 사진 ID가 요청의 허가 owner/epoch 첨부 목록과 일치할 때만 처리된다. 다른 사진·owner·epoch 및 user/manual 표기는 거절된다. 기존 관측값을 다른 사진으로 옮기는 합성 사례도 직접 거절을 확인했다. null·0·물리 수량·인쇄 비용은 분리된다. |
| 작업·재접속 | 같은 요청·입력의 job 재사용, 다른 의도 409, 재조회, 같은 범위 편집·epoch·원본·PIN 설정 변경 시 stale, 재시작 자동 실호출 0을 확인했다. candidate 완료가 accepted 편집 revision을 올리지 않으며 사용자 명시 적용은 기존 revision 경로를 따른다. |
| 정정·저장 | 완료는 후보만 만든다. Catan의 수정하지 않은 후보는 이동/사진 준비로 자동 승인되지 않는다. 수동 수정과 명시 저장은 유지된다. 합성 API 검사에서 null/0/비용/원본·crop·차례를 저장·재열기·export/import까지 보존했다. |
| 표시 수정 | 총 437개 분류 중 8개 `die`의 주사위 그림과 Wingspan 특정 먹이 주사위의 고정 색만 바뀐다. 다른 분류의 기존 경로, 행동 큐브의 소유색, 원본 mapping은 유지된다. |

카탄 안내의 영문 내부 용어 수정은 `PhotoCaptureGuide.tsx`의 표시 함수, `SessionWorkspace.tsx`의 호출, 해당 UI 회귀에 한정된다. 기계용 프로필·원명세 SHA·선택 권한은 그대로다. 보드와 개인 카드 안내를 짧은 한국어로 제공하며 같은 표시 함수를 촬영 화면에도 사용한다. 최초 동결 이후 추가 기능 변경은 R1의 조건 한 줄과 그 회귀뿐이다.

현재 게임만 프롬프트에 넣으며 120계약 전체 JSON을 모델 입력으로 보내지 않는다. 프로필의 판본·원명세 SHA가 안 맞으면 기존 관측·수동 정정 경로를 유지한다. 현재 촬영 선택은 안내와 관측 제한이다. 물리 보드 좌표·숨은 정보·차례 이력을 새로 계산하는 기능은 아니다.

**검증 수준과 한계**

- **VERIFIED:** 직접 소스/호출 경로 검토, 최초 1,323파일 SHA, 120계약 투영 및 441영역 권한 교집합, 독립 합성 집중검사. 초기 R1 재현은 32개 중 31통과·1실패, 교정 후 새 경계 회귀를 포함한 최종 34개는 모두 통과했다. 새 응답의 선택 범위 이탈 거부 및 기존 관측값 재귀속 금지도 직접 실행했다.
- **REPORTED_WITH_LOG:** worker의 최초 전체 588개, 최종 전체 **591/591** 및 타입·별도 출력 디렉터리 Vite build exit 0을 전달 로그·명령에서 확인했다. 이 리뷰에서 전체 검사를 다시 실행했다고 표시하지 않는다. [최종 실행 기록](../game-photo-integration/release/verification-run.json).
- **UNKNOWN:** 120게임 실사진 정확도, 운영 계정의 속도·대기·업로드 성공, 실제 브라우저의 최종 화면. 이번 카드에 따라 CUA는 사용하지 않았다. 다른 담당자의 UI 결과는 별도 근거다.

**REPORTED_UI:** [Sol1의 별도 화면 기록](../game-photo-integration/ui-check-sol/verification.json)은 Splendor 정정·명시 적용·저장·reload·복원, 카탄 합성 API 시작 후 19칸 화면에서 숫자 수정·저장·reload, 390/320px overflow·broken image 0을 보고한다. 8개 die와 Wingspan 표시도 실제 React 화면에서 확인했다고 보고했다. 카탄 브라우저 업로드는 도구 권한으로 미확인이고, API 시작 대체를 업로드 성공으로 세지 않는다. 기능 확인 당시 자산과 후속 한국어 문구 자산을 구별한다. 이 리뷰어의 브라우저 재실행이나 실제 사진 판독 증거는 아니다.

64188 미리보기의 backend 메모리에는 R1 교정이 다시 로드되지 않았다. 따라서 R1의 성공 근거는 해당 미리보기가 아니라 **최종 소스를 새로 읽은 독립 합성 fixture의 34/34 결과**다. 운영 새 backend 적용·기동 확인은 감독의 후속 범위로 남는다.

첫 실행의 loopback `listen EPERM`과 JSX 설정 오류는 리뷰 실행 환경 문제였다. 승인된 합성 로컬 서버 실행과 고정 snapshot tsconfig 지정 후 해소했으며 제품 결함 수에 넣지 않았다. [초기 환경 로그](integration-review.sandbox.log).

검사에서는 별도 임시 합성 Store와 가짜 analyzer만 사용했다. 외부 fetch는 차단했으며, 키·운영 설정·개인 세션·원본 실사진을 읽지 않았다. 제품/운영 쓰기·추가 실AI·브라우저 사용은 0이다. 전게임 실물 평가를 제품 연결의 새 선행 조건으로 추가하지 않는다.

재현 명령(로컬 loopback 실행 권한 필요):

```sh
TSX_TSCONFIG_PATH=/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-photo-integration-f3wlxy9s/app/tsconfig.json node --import tsx --test docs/vision-research-astra/integration-review.tests.mts
node --import tsx docs/vision-research-astra/integration-review.contracts.mts
```

최종 동결 상태와 교정 후 판정은 [integration-review.json](integration-review.json)에 함께 기록한다.
