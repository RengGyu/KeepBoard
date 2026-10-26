# 상세 카탄 계약 결함 수정

2026-10-21. **VERIFIED:** 확인된 계약 결함을 수정했다. 기존 간단한 화면을 유지하며 새 질문·설정·JSON·보관 탭을 추가하지 않았다. 실제 AI 호출·카메라·개인 데이터 열람·배포는 0회다.

| 수정 전 문제 | 현재 처리·근거 |
|---|---|
| 신규 수동판이 components.observed에만 저장되어 요약은 빈판 집계 | 새 공용 편집기의 기본 필드는 board.layout. 공용판과 설치물·점수·항구 요약이 같은 확정 장면을 읽는다. |
| 부분 사진 정정 후에도 기존 기준판만 남음 | 새 공용 부분 장면을 기존 기준판과 **편집 전에** 결합한다. 같은 자리·층의 유일한 대상을 교체하고 다른 자리·층은 유지한다. 점유 이동은 기존 교환 helper를 그대로 쓴다. 결과 반영/저장은 board.layout과 도둑 앵커를 한 answers 요청에 넣는다. 원래 부분 assertion·사진·snapshot은 지우지 않는다. 오래된 부분 결과는 새 기준판에 재적용하지 않는다. |
| 중복/불완전 관측을 완전 정보로 오해 | 여러 점유자는 자동으로 하나를 선택하지 않고 편집기에 그대로 남긴다. 부분 관측으로 변경한 층은 unknown으로 돌아간다. 19지형만으로 숫자·소유·항구 complete를 만들지 않는다. 다른 사진의 닮은 미배치 카드는 병합하지 않는다. 근거 영역은 복제/추정하지 않는다. |
| 자원 합계2와 별도 총수7인데 화면은 확정7 | 충돌의 value는 null이며 ‘확인 필요’로 표시한다. 소유자에게만 두 수와 ‘합계로 맞추기’를 보여준다. 공개 화면은 종류별 개인 수를 표시하지 않고 공개 총수 정정만 제공한다. 개인 수량·공개 총수의 후보도 기존 반영/저장 흐름으로 확인한다. |
| 과거 구매 종류 때문에 매 턴 신규 카드 제한이 재생성 | 구매 종류 assertion의 turnInstanceId가 현재 턴과 같은 때만 신규 제한/VP 예외를 도출한다. 종류·정체·보유 수량은 session 수명으로 유지한다. 구매 턴 없는 기존 값은 현재 구매로 추측하지 않는다. |
| 사람 정정만 가능하고 실제 다음 턴 진입 없음 | 공용 차례·메모에 ‘새 차례 시작’ 한 버튼을 연결했다. 선택 사람 정정 PATCH는 턴을 바꾸지 않는다. 명시 버튼만 pending drafts 저장 후 next-turn을 호출한다. 단순 열기·저장·개인 화면 전환으로는 턴/epoch를 바꾸지 않는다. |
| 교역 validRatio/messages 미표시 | 비율 충족/불충족과 관련 안내를 짧게 표시한다. 소유자 화면에서도 교역을 열어 그 소유자의 손패 확인 결과를 볼 수 있다. 원본 위반 거래 기록은 저장 가능하고 카드 자동 차감은 없다. |
| 별도 숨은 승점 옛값이 수정한 handCounts보다 우선 | 현재 프로필은 미사용 보유 개발 카드의 victory-point 수를 우선한다. 별도 값과 다르면 conflict로 알리고 한 번 정정할 수 있다. 두 값을 더하지 않는다. 구판의 ‘기존 카드만’ 의미는 기존 별도 승점 해석을 유지한다. |
| 사진 허용 필드에 규칙 파생 boolean 포함 | derivedRules의 출력 필드를 prompt와 정규화 양쪽에서 제외했다. 실제 관측 필드에는 key/label/description/type/scope/visibility/presentation/options만 전송한다. 최소 팩에서 derivedRules가 생략된 기존 adapter 경로도 호환한다. |
| 현재 UI에 없는 레이어/타이틀/판본/남은효과 전문 질문이 완료를 계속 요구 | 새 Catan UI 세션과 UI의 명시 저장은 optional recordingMode=simple을 사용한다. 이 모드에서는 전문 requirements/새 보존 체크리스트를 생성하지 않는다. 기존 보존 기록·고정 팩·판본·필드·snapshot은 유지한다. 모드가 없는 기존 상세 API는 종전 질문과 보존 엔진을 유지한다. |

단순 모드의 ready는 **저장에 앞서 강제할 질문이 없다는 뜻**이다. 모든 정보/규칙/복원이 검증됐다는 뜻이 아니다. 레이어 완전 확인·타이틀·과거 구매·효과 완료를 새로 묻는 큰 양식은 도입하지 않았다. 확인분만 있는 설치물/점수는 ‘확인 N’, 미확인은 ‘모름’이며 정확 총수·완전 항구율로 자동 승격하지 않는다. 기존 판본을 변경하거나 과거 기록을 사실로 보충하지 않는다.

## 검증

- **수정 전:** 새 핵심 회귀 8개 실행, 1통과/7실패, exit 1. 신규판·자원·턴 만료·승점·AI 허용 필드·단순 모드 실패를 직접 재현했다.
- **수정 후:** 신규 회귀 12개 포함 전체 `npm test` **150/150, exit 0**. 첫 전체 실행의 최소 팩 derivedRules 생략 호환 실패 1건을 보완한 후 다시 전체 통과했다. 테스트 실행기는 sandbox IPC에서 EPERM(exit 1)이 나 승인된 로컬 실행으로 검사했다. API 사용은 임시 Store/로컬 합성 및 모의 provider만이다.
- `npm run typecheck` **exit 0**.
- `npm run build` **exit 0** (tsc + Vite).
- 회귀에는 부분 사진의 원본 crop/층/점유 교환, 애매한 중복 유지, 개인 범위 분리, 구매 턴 미상, VP 예외, 상세 API 기본 동작, 단순 모드 전환 시 고정 팩·보존 기록 유지, 명시 저장→GET의 같은 턴/epoch·개인 정보·source ID 유지가 포함된다. 기존 스캔 큐/자리교환/삭제/색/공용1개/파서 회귀도 함께 통과했다.

**UNCLEAR:** 이번 작업에서 브라우저 390px 조작·실기기·실사진/실제 모델 정확도·지연·원격 배포는 검증하지 않았다. 기존 상세 arm의 과거 실제 응답 파싱 실패 원인은 raw 미보존으로 계속 미확정이다. 이전 thought 분리/메타 진단 수정은 그대로 유지했다. 실제 인식이 경량보다 좋아졌다고 주장하지 않는다.

감독 브라우저 확인 경로: 임시 합성 판에서 공용 마을 추가→개인 설치 확인분, 자원 총수7/종류합2 정정, 개발 VP2/별도0 충돌 정정, 교역3:1 불일치, 새 차례 시작, 저장→내 보드→그대로 열기. 개인 탭에서 공용 그림이 복제되지 않는지도 확인한다. 실제 사용자 판 삭제·카메라·AI는 필요 없다.

## 변경 파일

- 공통 계약/집계: `shared/types.ts`, `shared/catanSummary.ts`, `shared/boardRecording.ts`(신규)
- 엔진/API: `server/engine.ts`, `server/actions.ts`, `server/index.ts`
- AI 관측: `server/ai/fields.ts`(신규), `server/ai/prompt.ts`, `server/ai/index.ts`
- 화면: `src/api.ts`, `src/sceneWorkspaceModel.ts`, `src/SceneWorkspace.tsx`, `src/PhotoTargets.tsx`, `src/CatanOverview.tsx`, `src/SessionWorkspace.tsx`
- 회귀: `tests/catan-review-fixes.test.ts`(신규)
- 문서: 본 문서, `docs/catan-detailed-pack-review.md`, `docs/catan-detailed-pack-fixes-verification.json`(신규)

아트·CSS·게임팩 원문은 변경하지 않았다. 빌드로 `dist` 산출물은 재생성됐다. 배포/commit/제품 서버 재시작은 감독에게 반환한다.
