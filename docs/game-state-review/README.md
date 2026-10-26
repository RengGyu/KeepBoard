# 120종 게임 명세의 저장·재개 필수 상태와 공개/비공개 검토

검토일 2026-10-22(KST). 검토자: Claude(claude-opus-5-5). 범위는 읽기 전용 검토와 합성 검증뿐이다. 제품 코드·명세·아트·기존 테스트는 수정하지 않았다.

- 게임별 120행 표: [games.md](games.md)
- 같은 내용의 JSON: [games.json](games.json). 게임마다 명세 파일 경로·SHA256, 비공개 필드, 보존 절차, 확인 질문, 발견 항목, 런타임 연결을 담는다.
- 루미큐브 합성 점검: [synthetic/rummikub-privacy-probe.ts](synthetic/rummikub-privacy-probe.ts) · [실행 결과](synthetic/rummikub-privacy-probe.out.json)
- 작업 자료: `work/`
  - 명세 인벤토리
  - 검토자 판정 원본 `judgments-*.json`
  - 생성 스크립트 `build.py`
  - 검토 시점 해시 `review-snapshot.txt`

## 결론 먼저

1. **명세 120종 모두 읽고 판정했다.** 공식 규칙 원문 전체와 대조한 게임은 0종이다.
   - 47종: 누락이나 불명확 항목을 식별했다.
   - 73종: 명세를 읽은 범위에서 추가 누락을 찾지 못했다. 이는 **공식 규칙 대비 필수 상태를 모두 확인했다는 뜻이 아니다.**
2. **실제로 앱에서 동작하는 게임은 카탄과 루미큐브 2종뿐이다** (`server/index.ts` `packs()`). 나머지 118종은 명세만 있고 런타임 연결이 없다.
3. **루미큐브 받침대처럼 남에게 보이면 안 되는 정보에 대해:**
   - 명세: 120종 모두 `privacy_policy: owner-scoped`로 선언되어 있다. 비공개 필드는 owner 127개, hidden 76개, role-limited 7개, own-hidden 1개다.
   - 실제 보호: **소유자가 4자리 PIN을 설정했을 때만** 적용된다. 기본 상태에서는 링크를 아는 누구나 다른 사람의 받침대를 읽고 덮어쓸 수 있다(합성 검증으로 확인, 아래 R1).
4. **런타임 타입이 명세의 공개 범위를 다 담지 못한다** (`shared/types.ts:7,10`).
   - visibility는 `public|owner`, scope는 `public|player`만 지원한다.
   - 그래서 하나비의 own-hidden(본인만 못 보는 손패), 역할 제한(코드네임·저스트 원·임페리얼 어썰트·리벨리온), 공동 비밀 더미(shared-secret)를 표현할 수 없다.

## 근거 라벨

| 라벨 | 뜻 |
|---|---|
| VERIFIED | 이 검토에서 합성 실행으로 직접 확인 |
| CODE | 코드를 읽어 확인했으나 해당 게임 전용 실행은 하지 않음 |
| SPEC | 명세 파일 내용(필드·절·gaps)만으로 판단 |
| INFERRED | 검토자의 일반 규칙 지식에 따른 판단. 선택 판본의 공식 원문과 대조하지 않음 |
| UNCLEAR | 명세 자체가 미확인으로 남겼거나 근거가 부족함 |

중요도는 다음과 같이 매겼다.

| 등급 | 기준 |
|---|---|
| P1 | 비공개 정보가 노출되거나 재개 시 실물 보존이 불가능함 |
| P2 | 같은 상태로 재개하는 데 필요할 가능성이 높은 상태가 빠짐 |
| P3 | 정확도·편의 |
| UNRATED | 무작위 더미 등 선택 판본 근거 없이는 중요도를 단정하지 않음 |

## 루미큐브 실제 구현 점검

검토 시점 파일 해시는 `work/review-snapshot.txt`에 있으며 검토 종료 시 재계산한 값이 모두 동일했다.

합성 검증 조건은 다음과 같다.
- 새 임시 Store와 임의 포트를 썼고, AI 관련 환경 변수는 모두 제거했다.
- 실사용자 자료나 서버 재시작은 사용하지 않았다.
- 실행 명령은 아래와 같다. exit 0.

```sh
env -u OPENAI_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY -u DEEPSEEK_API_KEY -u AI_PROVIDER -u AI_MODEL -u AI_BASE_URL -u AI_GATEWAY_URL -u KEEPBOARD_AI_ALIAS -u KEEPBOARD_AI_GATEWAY_URL \
  npx tsx docs/game-state-review/synthetic/rummikub-privacy-probe.ts
```

기존 관련 테스트 30개도 실행했다(`tests/private-pin`·`private-workspace`·`rummikub-*`). 30/30 통과했고 파일은 수정하지 않았다.

| ID | 우선순위 | 문제 | 재현 조건 | 근거 |
|---|---|---|---|---|
| R1 | P1 | **받침대 보호가 선택형이다.** PIN이 없는 소유자의 `rack.scene`이 공개된다.<br>· 토큰 없는 `GET /api/sessions/:id`와 `GET /api/sessions`에 그대로 포함된다(S1).<br>· 토큰 없는 `PATCH`로 덮어쓸 수 있다(200, S2).<br>· 다른 사람이 잠가도 PIN이 없는 플레이어는 계속 노출된다(S10). | 루미큐브 세션 생성 → p1 `rack.scene` 저장 → 토큰 없이 GET 또는 PATCH | VERIFIED. 원인: `shared/privacy.ts` `redactSession`이 `protectedOwners`(PIN 설정자)만 가림. `server/index.ts:68-77` 응답 투영 |
| R2 | P1 | **실물 보존 절차가 앱에 없다.** 팩의 `preservationTemplates: []`. 명세의 `rack.preserve`·`pool.preserve` 봉인 절차가 연결되지 않아, 앱이 플레이어별 받침대 타일을 따로 보관하라고 안내하지 않는다. | `gamepacks/rummikub.ts` 읽기 / probe의 S3 팩 필드 출력 | VERIFIED |
| R3 | P2 | **PIN 보호 소유자가 2명 이상이면 `/resume`이 항상 403이다.** 토큰 하나는 소유자 1명만 열고(`server/privatePin.ts` `allowed`), `/resume`은 보호 소유자 전원을 요구한다(`server/index.ts:132`). 현재 UI는 `api.resume`을 호출하지 않으므로 API·기존 경로에 한정된다. | p1·p2 PIN 설정 → 저장 → p1 토큰 / p2 토큰 / 토큰 없이 각각 `/resume` → 모두 403 (S8) | VERIFIED |
| R4 | P2 | **받침대 타일 장수(공개 정보)를 담을 필드가 명세·팩 모두에 없다.** 개인 장면 전체가 owner 전용이라 재개 시 공개 장수조차 공용 화면에서 대조할 수 없다. | 팩 필드 5개(table/rack/currentPlayer/opened/pending) | 팩: VERIFIED / 규칙상 장수 공개: INFERRED |
| R5 | P2 | 명세에 공용 묶음(`table.scene`)의 실물 보존 절차가 없다. 사진 복원만 전제한다. | `games/rummikub.json` `resume.preserve_procedures` | SPEC |
| R6 | P3 | 명세의 `score`·`timer`·`pool.scene`가 런타임 팩에 없다. | 팩 비교 | VERIFIED |

정상으로 확인한 부분(VERIFIED):
- **PIN 잠금 시 가림:** 목록·저장본·사진 URL(403)·내보내기(차단)·분석 요약에서 받침대가 가려진다.
- **공개 필드는 그대로 보임:** 공개로 선언한 `opened`는 잠금 중에도 보인다.
- **토큰 범위:** 소유자 토큰은 자기 받침대만 연다.
- **다음 턴:** `next-turn`은 잠긴 받침대를 보존한다.
- **활동 기록:** 타일 값이 남지 않는다.
- **AI 프롬프트(코드 확인):** 세션 기록 없이 허가된 사진 ID만 보낸다(`server/ai/rummikubPrompt.ts`).
- **공용 사진 판독:** 받침대 후보를 만들 수 없다(`server/ai/index.ts:117-126`, 기존 테스트 25).

같은 R1 구조는 카탄 런타임의 개인 필드에도 적용된다(CODE, 카탄 전용 실행은 하지 않음).

## 명세 전체에서 반복되는 문제

| 문제 | 해당 | 근거 |
|---|---|---|
| 런타임이 표현할 수 없는 공개 범위 | 하나비 own-hidden. 코드네임·저스트 원·임페리얼 어썰트·리벨리온의 role-limited. 공동 비밀 더미(shared-secret) 76필드 전체 | VERIFIED(`shared/types.ts`), 게임별 SPEC |
| 비공개 보유물의 공개 수량 짝 필드 부족 | 손패·보유 수를 명시한 게임은 10종뿐(`work/`의 교차 검색). 루트·티켓 투 라이드·루미큐브·듄 등에서 식별 | INFERRED |
| 시작/선 플레이어 상태 | "선 플레이어/시작 플레이어"를 언급한 명세는 7종. 라운드마다 이동하는 게임 중 아그리콜라·카베르나·스톤 에이지·테라포밍 마스·듄 업라이징에서 누락 식별. 파워그리드·바라지는 차례 순서 트랙 누락 | INFERRED |
| 공개 지도 위의 뒷면 구성물 | 메이지 나이트·네메시스·이클립스: 뒷면 토큰/타일이 공개 장면 안에 있어 숨은 정보로 분류되지 않음 | INFERRED |
| 숨은 뽑기 풀·순서 영역 누락 | 반지전쟁 사냥 타일, 파워그리드 발전소 더미와 Step 3 카드, 트와일라잇 임페리움 공개 목표, 아컴호러 3판 이벤트 덱, 자이푸르 덱. 그 밖의 무작위 더미 다수는 UNRATED | INFERRED |
| 실물 보존 절차 | 공개 보존 절차는 8종 11개뿐(카탄 4, 그 외 7). 비공개 필드 31개는 보존 절차가 없음. 14종은 비공개 필드와 보존 절차가 모두 없음 | SPEC(구조 집계) |
| 명세가 스스로 공개 범위를 미확인으로 남김 | 콩코르디아·매드 킹 루드비히·모노폴리·파워그리드·다섯 부족·이스탄불 등의 돈, 칼리코 손 타일 등. 대부분 보수적으로 owner 처리 | UNCLEAR |
| 외부 앱·실시간 게임 | 디센트·가운데땅 여정·광기의 저택 2판은 앱 저장 의존. 도블·할리갈리·갤럭시 트러커 조립은 중단 순간 재현 불가 | SPEC |

## 사진으로 알 수 없어 물어야 하는 내용

게임별 목록은 games.md의 "확인 질문" 열에 있다. 공통 항목은 다음과 같다.
- 현재 차례(모든 게임의 `turn`)
- 단계·라운드와 중단 지점(`pending`)
- 시작 플레이어 또는 차례 순서(위 누락 게임)
- 진행 중 효과·전투·경매·거래의 처리 지점
- 앱 저장 시점(앱 게임)

명세는 모든 게임에서 `must_ask_field_ids=[]`이다. 질문을 저장 조건으로 강제하지 않는 설계이며, 모름도 저장을 허용한다.

## 미검토·미확인 범위

- **공식 규칙 대조:** 120종 모두 하지 않았다. INFERRED 39건은 선택 판본 규칙으로 확인해야 한다.
  - 우선 확인 대상(P2): 시작 플레이어 5종, 차례 순서 2종, 지도 위 뒷면 구성물 3종, 숨은 뽑기 풀 5종, 7 Wonders Duel 버림 더미.
- **명세 원문 읽기 범위:** 각 명세의 state_fields·보존 절차·gaps를 읽었다. components·rules·recognition_correction 본문은 전체를 정독하지 않고 키워드 대조로 보완했다. 그래서 일부 누락으로 판단한 항목이 다른 절의 설명에 들어 있을 수 있다. 실제로 아줄의 상자 뚜껑, 도미니언의 폐기 더미, 러브레터의 제외 카드는 영역 설명 안에서 확인해 누락으로 세지 않았다.
- **런타임 대상:** 루미큐브만 합성 실행으로 점검했다. 카탄은 코드 읽기만 했다. 실사진·실제 AI 판독·UI 화면 노출은 점검하지 않았다.
- **동시 작업:** 검토 중 다른 작업자가 `src/**`를 수정 중이었다. 검토 대상 파일 18개의 해시는 시작과 종료 시점에 동일했다(`work/review-snapshot.txt`).
