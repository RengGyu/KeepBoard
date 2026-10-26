# DeepSeek 복귀 및 루미큐브 개인 받침대 확인

VERIFIED · 2026-10-22 · 대상 https://keepboard-kappa.vercel.app

| 확인 | 이전 | 복귀 후 |
|---|---|---|
| local4319 /api/settings | true / gemini / gemini-4-argon | true / gateway / deepseek-flash |
| public /api/settings | true / gemini / gemini-4-argon | true / gateway / deepseek-flash |

양쪽 모두 upstreamProvider=deepseek, reasoningEffort=high. 기존 gateway4330 `/v1/aliases`의 board-vision이 deepseek/deepseek-flash/high인지 먼저 대조한 뒤 전환했다. status 조회뿐이며 모델 생성 API/사진/과금 호출0. 운영 PID4319=82226, gateway4330=18287 유지.

운영 `/tmp/keepboard-preview/data/ai-routing.json`만 이전 routing-only 백업의 gateway route로 복귀. direct Gemini 설정/키는 읽어 출력하거나 변경·복사하지 않았고 전역 alias도 변경하지 않았다. 요청마다 hotreload, 서버/프록시/터널/gateway/439x 재시작0·배포0. 이번 전환 전 direct routing-only rollback: `/tmp/keepboard-model-switch/deepseek-return-2026-10-22/ai-routing.previous.json` parent0700/file0600. 비민감 확인 로그는 같은 폴더 verification.json. 전환/whitelist 검증 명령 exit0.

## 개인 받침대 사용법과 근거

**지원한다. 공용 사진에서 개인패를 자동 분리해 배정하는 방식은 아니다.**

1. 보드의 해당 플레이어 가로 탭을 선택한다.
2. 새 runtime 기록은 PIN 설정 후 입력 가능하다. 보호된 영역은 PIN을 잠금 해제해야 촬영·업로드·편집을 사용할 수 있다. 이전 무PIN 기록은 기존 선택 정책을 유지한다.
3. 열린 개인 영역에서 **받침대 스캔** 또는 **개인 사진 추가**로 받침대를 별도로 촬영/올린다. 업로드 batch나 스캔 마치기 뒤 연결 모델로 해당 사진을 읽는다.
4. 이미 그 개인 영역/현재 촬영 단계에 사진이 있으면 **사진 읽기**로 다시 읽는다. 공용 탭에 올린 사진은 이 버튼의 개인 사진 목록에 들어오지 않는다.
5. 개인 받침대의 타일 후보를 확인·정정하고 저장한다. 모델 변경만으로 이전 그림/후보/사진이 바뀌지 않는다.

직접 읽은 코드:
- src/SessionWorkspace.tsx:39–43 개인 루미큐브 및 PIN 잠금 판별, 178–179 받침대 스캔/개인 사진 추가 라벨, 186–197 잠긴 상태에서 버튼/편집 숨김과 개인 안내. 180–182 currentPhotos는 owner/scope/epoch별로 제한.
- 같은 파일 newCaptureRun/saveRunPhoto/readStoredPhotos/finishCaptureRun: 선택 owner를 촬영 run에 고정, scope=player+ownerId 저장, 개인 최근 최대6장만 읽기. 자동분석은 configured일 때만, pristine 후보를 사진읽기 선행확정하지 않는 옵션 유지.
- server/index.ts:122–140 개인 evidence/analyze의 PIN·owner 권한 검사.
- server/ai/index.ts:197–214 사진 owner+epoch별 batch 분리. server/ai/prompt.ts:7–8 owner에 따라 전용 prompt 호출.
- server/ai/rummikubPrompt.ts:12–18 공용 사진은 받침대 타일 제외, 개인은 해당 받침대만 읽고 타일 인쇄색으로 소유자를 추정하지 않음. 개인 받침대 줄은 groups로 보존.

기존 회귀 정의 직접 대조:
- tests/rummikub-model.test.ts:28–35 rack.scene player/owner 및 private 사진 ID만 prompt에 포함.
- tests/rummikub-runtime-integration.test.ts:16–23 공용 사진→개인 rack 추론 거부·다른 owner 사진 거부, 54번 이후 테스트의 개인 업로드/저장/PIN/red owner 접근, 116번 이후 local mock 판독에서 공용사진으로 rack 후보 생성 금지.
- tests/rummikub-ui-save.test.ts: 개인 field/owner 및 green 보존 계약.

이번에는 이 테스트를 재실행하지 않고 코드/기존 회귀 정의를 읽었다. 227테스트 통과는 이전 검증 보고다. 실모델 개인패 판독 정확도·사용자에게 버튼이 안 보였던 실제 원인은 사용자 세션/PIN/사진을 읽지 않아 미확정. PIN 잠금·공용 탭·잘못된 사진 범위는 가능한 조건이며 특정 원인으로 단정하지 않는다. 이번 사용자 자료/후보/보드 변경0, 실AI0, 제품 코드변경0. 파일 소유권 반환.
