# 방 생성·참가·개인 기록 계약

상태: **RECOMMENDATION · 감독 검토용, 제품 변경 없음**. 현재 코드를 읽어 작성했다. 새 계정/DB/의존성 없이 기존 단일 Node 프로세스와 파일 Store를 재사용하는 한 가지 안이다.

## 사용자 흐름

새 보드의 기본 흐름을 `게임·판본 / 방 이름 / 총 인원 / 내 이름·색 → 방 만들기`로 바꾼다. 방장은 정원에 포함되는 플레이어 한 명이다. 빈 좌석은 대기 인원으로만 표시하며 가짜 플레이어/개인 상태를 만들지 않는다. 만들어진 뒤 게임·판본·정원은 고정한다.

방장이 초대 링크 복사 또는 코드 공유 → 상대가 `방 참가`에서 링크/코드를 입력 → 게임·남은 인원만 확인 → 자기 이름·색으로 참가한다. 참가 후 `공용 보드(보기)`와 `내 보드`만 진입한다. 방장은 공용 보드와 자기 보드를 편집한다. 다른 사람은 공개 이름·색과 공개 게임 정보만 보인다. 개인 화면에 자기 촬영/수정/선택 PIN을 둔다. 현재 게임팩의 지원 제한(수동 판독/physical-only)은 그대로다.

같은 브라우저의 새로고침·재방문은 기존 참가자로 돌아간다. 같은 브라우저의 여러 탭은 같은 사람이다. 링크나 `player=` URL만 바꿔 다른 참가자가 되지는 않는다. 기존 단일기기 보드는 현재 동작 그대로 열며 자동으로 방으로 전환하지 않는다.

## 현재 코드에서 확인한 경계 (VERIFIED)

| 근거 | 현재 동작 / 필요한 변경 |
|---|---|
| `src/Dialogs.tsx:12` CreateDialog, `server/index.ts:206` | 생성 요청이 전체 players 배열을 받는다. 방 생성은 정원과 생성자만 받고 참가자 ID는 서버 발급해야 한다. |
| `server/index.ts:122` authorizeMutation, `server/privatePin.ts` require | PIN이 설정된 owner만 검사한다. 무PIN 개인 영역에는 참가 신원/역할 검사가 없다. PIN과 독립된 방 권한 검사가 필요하다. |
| `shared/privacy.ts:4`, `server/index.ts:69` 응답 필터 | 잠긴 owner만 제거한다. 방에서는 PIN 유무와 무관하게 타인 개인 상태를 제외해야 한다. |
| `server/index.ts:88` uploads, `:182` 목록, `:395` export | 사진 URL은 PIN 기준, 목록은 전체 세션, export는 PIN 없으면 전체다. 방 권한을 각 경로에 적용해야 한다. |
| `server/index.ts:121` change, `server/store.ts:41` atomicWrite | 세션 단위 메모리 큐와 atomic rename은 있다. 동시 요청 직렬화는 가능하지만 오래된 UI 값의 덮어쓰기는 막지 않는다. |
| `server/index.ts:355`, `server/engine.ts:175`, `server/runtimeResume.ts:7` | commit은 전체 snapshot, 비교/복원은 마지막 snapshot이다. 방에서는 각 저장 범위의 마지막 snapshot을 골라야 한다. |
| `src/App.tsx:110` polling, `src/privateAccess.ts` | 4.5초 폴링, 일시 PIN 토큰·blob URL 정리는 재사용 가능. 참가 신원은 현재 없다. |
| `server/ai/index.ts:189`, `server/ai/prompt.ts:7` | owner/epoch별 분석과 범위 프롬프트는 있다. HTTP 권한 검증과 AI 입력·결과의 actor 범위 검증을 앞뒤로 추가한다. |

## 신원과 저장 형식

**초대는 입장 허가이고 참가 credential은 실제 권한이다.** 초대 코드/링크, roomId, playerId, 이름, 색, PIN 어느 것도 참가 credential로 사용하지 않는다.

- 서버가 256비트 난수의 기기 bearer를 HttpOnly·host-only cookie로 발급한다. HTTPS는 Secure, SameSite=Lax, Path=/, 180일 유지; loopback 합성 HTTP만 Secure 예외다. API/uploads는 기존 동일 origin 경로를 사용한다. 비밀은 URL/localStorage/응답 JSON에 넣지 않는다. `credentials: same-origin`을 명시한다.
- 방마다 credential의 SHA-256와 서버 발급 playerId를 연결한다. role은 생성 시 host 1명, 이후 member만 가능하다. 클라이언트가 role/playerId/membership를 지정하거나 PATCH할 수 없다. cookie가 없거나 방의 hash와 맞지 않으면 비참가자다. unknown cookie 자체에는 권한이 없다.
- `Session`에 optional 방 메타데이터를 추가한다. 공개 부분은 room version/capacity/hostPlayerId/revisions, 서버 내부 부분은 invite와 membership hash다. **같은 세션 파일에 저장**해 좌석·색·membership·players 변경을 기존 change 큐+한 번의 rename으로 확정한다. 별도 두 파일의 가입 transaction은 만들지 않는다. 서버 내부 필드는 공통 projection에서 제거하고 SessionView에는 별도 `roomAccess: {role, playerId, canEditPublic, revisions}`만 반환한다.
- 초대는 난수 링크 token(128비트 이상)과 혼동 문자를 뺀 8자리 코드다. `/#join=<token>`을 사용하고 확인 후 주소에서 제거한다. invite 원문은 로컬 서버 내부 메타데이터에만 보관, 파일 권한 0600, 로그/export/list/snapshot 제외. host의 초대 보기 API에서만 반환한다. 유효 코드로도 기존 좌석을 선택하거나 host가 될 수 없다. 신규 입장 시도는 IP별 횟수 제한, 실패는 통합 메시지, 정원이 차면 신규 가입 409다.
- 사람 수는 앱 상한 12명(게임 규칙상 인원 보장이 아닌 기능 상한), 최솟값 1명, 생성자 포함이다. 이름은 trim·1..40자, 색은 정규화한 `#rrggbb`로 정확 중복을 막는다. 근접색 구별까지 보장하지 않는다. 이름 중복은 허용하며 신원이 아니다. 재참가를 먼저 확인하므로 만석에서도 기존 신원으로 재입장 가능하다.
- 재입장은 cookie와 서버 hash가 유지될 때 가능하고 서버 재시작에도 유지된다. cookie 삭제/새 기기는 새 사람이다. PIN은 좌석 복구 수단이 아니다. 기기 간 본인 이전/분실 복구/방장 위임/퇴장·강퇴는 이번에 넣지 않는다. 최초 안내에 `이 기기에서 다시 들어올 수 있어요`만 짧게 표시한다.

## 권한표: 서버 판정이 기준

범위 P는 field.scope=public + 공용 메모/보관/사진이다. 범위 O(id)는 **모든** 해당 player field(공개 표시 필드도 포함) + 해당 개인 메모/보관/사진이다. 공개 읽기는 field.visibility=public인 player 값도 허용하지만 쓰기 소유권을 바꾸지 않는다. 공용 scene 안의 말 소유색은 공용판 내용이므로 host가 수정할 수 있다.

| 동작 | 비참가자 / invite만 보유 | host | member |
|---|---|---|---|
| 참가 전 정보 | 게임·판본·정원·빈자리만, 보드/사진/roster 없음 | — | — |
| 공용판·공개 player 정보 보기 | 불가 | 가능 | 가능 |
| 자기 비공개 정보 보기/쓰기 | 불가 | O(self)만 | O(self)만 |
| 타인 비공개/PIN 보기·쓰기 | 불가 | 불가 | 불가 |
| 공용판/공용 사진·후보·보관 수정 | 불가 | P만 | 불가 |
| 개인 사진 업로드/원본·crop 보기/삭제/분석/후보 수락 | 불가 | O(self)만 | O(self)만 |
| 이름·색 수정 | 불가 | 자기 것만 | 자기 것만 |
| 차례 시작·공용 맥락/방 이름·목록 숨김/복원 | 불가 | 가능 | 불가 |
| 저장/명시 복원 | 불가 | P 또는 O(self), 한 범위씩 | O(self)만 |
| 전체 export/import | 불가 | 방에서는 사용 불가 | 방에서는 사용 불가 |

PIN은 선택한 경우 **본인 credential + 본인 PIN unlock**을 모두 요구한다. 타인의 올바른 PIN을 알아도 자기 credential로는 열기/변경/해제가 불가하다. 설정/변경/해제 모두 본인 membership 검사를 먼저 하고 기존 PIN 확인 규칙을 유지한다. 새로고침·다른 화면 이동 때 unlock은 만료시킨다. 무PIN도 타인에게 공개되지 않으며 기존 방 없는 무PIN 보드의 선택 정책은 바꾸지 않는다.

`PATCH players` 전체 교체는 방에서 금지하고 `/rooms/:id/me`로 자기 이름/색만 바꾼다. ownerId/field/status/id를 조작한 raw 요청, 없는 assertion/preservation ID, 다른 owner의 crop source도 mutation 전에 거절한다. PIN 토큰에도 방 membership 일치가 필요하며 토큰 단독으로 room에 접근할 수 없다. 모든 변경은 검증 후 원자적으로 적용하며 부분 성공하지 않는다.

## API·UI 연결

| 새 경로/입력 | 계약 |
|---|---|
| `POST /api/rooms/device` | 만들기/참가 전에 cookie 확보. 기존 정상 형식 bearer는 유지, 없으면 서버 발급. 응답은 `{ok:true}`만. 이 단계만으로 방 권한은 생기지 않는다. |
| `POST /api/rooms` `{gamePackId,gamePackVersion?,name,capacity,me:{name,color}}` | 현재 resolver로 팩 고정, host와 신원 생성, 201 SessionView. 새 생성 중복 클릭은 clientRequestId+동일 기기 idempotency로 방 1개만 만든다. |
| `POST /api/rooms/preview` `{invite}` | 제한된 참가 전 정보만. invite은 query/log가 아닌 body. |
| `POST /api/rooms/join` `{invite,name,color,clientRequestId}` | 같은 credential이면 원래 참가자 반환. 새 playerId는 서버 발급. role/타인 ID 입력은 거절. |
| `GET /api/rooms/:id/invite` | host만 링크·코드 조회. |
| `PATCH /api/rooms/:id/me` `{name,color,expectedRosterRevision}` | 자기 profile만, 중복색과 roster revision 원자 검사. |
| 기존 `/api/sessions/:id` read/write/evidence/analyze/accept/PIN/commit/resume | room 여부로 동일 actor policy 적용. 새 endpoint만 보호하고 옛 endpoint로 우회하는 구조를 만들지 않는다. |

세션 목록에는 room 기록은 자기 membership만 표시하고 개인 내용 없는 요약을 반환한다. legacy 기록은 기존 정책을 유지한다. 기존 archive/delete 전체 선택은 legacy만 대상으로 하며 room ID가 명시되면 host 검사를 한다. 일반 import에서 room/auth/revision 메타데이터 수입은 거절한다. room export는 당분간 서버 403으로 막아 보호 해제를 통한 전체 내보내기 우회도 없앤다. 기존 legacy export는 변경하지 않는다.

SessionWorkspace는 roomAccess를 기준으로 host `공용 / 내 보드`, member `공용 보기 / 내 보드`를 표시한다. 공개 다른 플레이어 정보를 보여도 그 개인 편집 탭은 생성하지 않는다. 참가자는 readonly 공용 개요와 자기 native/generic 편집기를 재사용한다. `?player=다른ID`는 권한을 주지 않고 내 화면으로 정규화한다. 기존 편집기에는 readonly/권한 props를 넘겨 동작을 막으며 버튼 숨김만으로 완료하지 않는다. public-only AI/manual 지원 문구는 기존대로다.

## 조회·사진·AI에서 누출 방지

1. read/mutate와 `/uploads` 모두 membership을 먼저 검사한다. 방의 무PIN 개인 사진도 본인만 접근한다. 목록·session·snapshot·briefing·differences·actions·analysisSummary·보관 위치·activity와 사진 원본/crop 전 경계에 동일 projection을 사용한다. 사진이 여러 snapshot에 남아도 더 넓은 권한으로 노출하지 않는다. `no-store`와 기존 blob URL revoke를 유지한다.
2. 응답 projection은 타인 개인 base/rule assertion을 제거한 복사본에서 파생·요약을 재계산한다. 전체 private 상태로 계산한 공개 점수/요약을 이름만 public이라 통과시키지 않는다. 공개값으로 **명시 입력한 값**은 공개로 유지하고 비밀 점수로부터 공개값을 새로 만들어 내지 않는다. unknown/physical-only/role-limited는 기존 fail-closed다. 목록/초대정보에는 ready·개인 완료 수 같은 파생 상태도 넣지 않는다.
3. room 분석은 `scope`와 정확한 evidenceIds가 필수다. P는 host만, O는 자기만, 혼합 scope 요청은 거절한다. 공개 AI context는 공개 데이터만, 개인 AI context는 공개+자기만 전달한다. 저장된 타인 private assertion을 model 입력에 전달하지 않는다. 결과도 서버가 target scope와 source refs를 다시 검사하고 타 owner 결과를 저장하지 않는다. 공개 사진은 개인 rack 후보를 생성하지 않는다. public 분석에서 player-scoped 출력은 타인 영역을 건드리지 않도록 제외하며, 필요한 개인 공개 항목은 각자가 정정한다.
4. Rummikub 원본/후보/직접편집 초안 정책을 유지한다. 사진 읽기로 pristine candidate를 확정하지 않으며 분석 실패는 accepted/candidate/원본을 바꾸지 않는다. 모델/alias/키/팩/437아트 변경은 없다.

## 충돌·저장·복원

- 기존 세션 change 큐를 **join/profile/room API에도 한 곳에서** 공유한다. 입장 정원/색 검사와 membership 저장을 같은 job에서 처리한다. 두 기기가 마지막 자리 또는 같은 색으로 동시에 참가하면 큐에서 먼저 유효 검증된 요청 하나만 성공, 나머지는 409. 실패는 자리나 색을 점유하지 않는다. 반복 join/create는 같은 요청 결과를 반환한다.
- session ID가 아직 없는 create는 별도 공통 생성 큐에서 동일 기기+clientRequestId 재사용과 invite 중복 여부를 검사한다. 따라서 응답 유실 뒤 재전송도 새 방을 만들지 않는다. ID 발급 뒤 모든 방 변경은 세션 큐에 들어간다. room mutation은 JSON 및 동일 origin 검증을 하고 쿠키를 URL/폼으로 전달하는 우회는 받지 않는다.
- room에는 단조 증가 `rosterRevision`, `publicRevision`, `ownerRevisions[playerId]`를 둔다. target 범위의 expectedRevision을 변경 요청에 필수로 받아 큐 안에서 비교한다. 서로 다른 owner 저장은 충돌하지 않고 같은 scope의 낡은 값은 409다. profile은 roster만, P 변경은 public만, O 변경은 해당 owner만 증가시킨다. body가 여러 범위를 건드리면 필요한 모든 revision을 검사한다.
- UI는 active editable scope의 기준 revision을 보관한다. 폴링은 roster/읽기 전용 공용 개요를 갱신하되 active scope에 다른 변경이 오면 draft/기준 revision을 조용히 교체하지 않는다. 충돌 시 초안을 유지하고 `다른 창에서 바뀌었어요. 최신 기록을 확인해 주세요`로 알려 명시적으로 다시 확인한다. 409 뒤 자동 재시도/자동 덮어쓰기/자동 후보 확정은 없다. 서버가 어떤 값을 먼저 저장했는지 revision이 최종 기준이다.
- room commit은 explicit `scope:'public'|'owner',ownerId?,expectedRevision`을 받는다. 현재 화면의 draft flush가 성공한 뒤 **그 범위만** snapshot으로 저장한다. Snapshot에 optional `savedScope`를 추가하고 room snapshot에는 해당 범위와 필요한 공개 출처만 넣는다. 타인 개인/다른 범위의 미저장 내용을 내 저장으로 확정하지 않는다. 읽을 때는 범위별 마지막 snapshot을 선택한다. 비교·마지막 저장표시·복원도 같은 selector를 사용한다. legacy snapshot 형식과 `.at(-1)` 동작은 room 없는 기록에 유지한다.
- room public restore는 P만, owner restore는 O(self)만 바꾼다. 기존 `resumeSnapshot`의 public=`!privateField`와 달리 room에서는 field.scope로 쓰기 범위를 결정하여 타인의 공개 player 필드도 되돌리지 않는다. 원본 참조 보존과 turn-lifetime rebase 규칙은 재사용한다. owner 복원은 전역 turn/epoch/공개/타인 원본 불변, public 복원도 현재 logical turn과 모든 O 데이터를 보존한다. 단순 열기/재입장은 복원·차례 진행을 호출하지 않는다.
- 기존 전역 captureEpoch는 유지한다. 명시 public restore가 바꾸면 진행 중이던 다른 기기 업로드는 expectedCaptureEpoch 불일치 409가 될 수 있다. 원본/전송 실패 draft를 유지하고 재촬영 안내하며 새 epoch로 조용히 분류하지 않는다. owner restore는 전역 epoch를 바꾸지 않는다. 새 per-owner clock 시스템은 이번에 만들지 않는다.
- room의 명시 next-turn은 host만 가능하며 PIN 유무와 무관하게 타인의 기록/사진/보관 내용을 삭제하지 않는다. 전역 turn 변화에 따른 유효성 계산과 원래 구매 턴·이력은 구분한다. 공개 게임 동작을 개인 영역 쓰기 권한으로 해석하지 않는다.
- 현재 analyze는 긴 모델 호출도 change 큐 안에서 기다린다. room 경로만 `큐에서 권한·입력 snapshot 확보 → 큐 밖 모델 호출 → 큐에서 권한/해당 revision/epoch 재검사 후 후보 추가`로 분리한다. 분석 도중 다른 owner 입력은 가능하다. target이 바뀌면 결과를 적용하지 않고 409, 기존 상태는 유지, 추가 유료 자동 재호출은 없다. mock transport로 검증한다.

## 호환·한계

Session.room/snapshot.savedScope가 없는 과거 기록은 권한·팩·PIN·값·좌표·저장본을 그대로 유지한다. room 생성은 새 session만 만들고 기존 ID/팩을 전환하거나 마이그레이션하지 않는다. 방 유무는 서버 저장 메타데이터로 판정하며 요청의 room=false로 우회하지 못한다. imported/legacy 세션을 room API에 ID만 넣어 가입할 수 없다. 기존 source/freeze/119 기록판 매핑·아트는 쓰지 않는다.

계정 없는 기기 credential은 **그 브라우저를 쓰는 사람**을 구분하는 수준이다. 공유 기기/credential 탈취/사이트 저장소 삭제 후 복구까지 사람 본인임을 보장하지 않는다. 선택 PIN은 같은 기기의 개인 화면에 추가 잠금이며 참가 신원을 대체하지 않는다. invite을 받은 사람이 빈자리를 차지하는 것은 허용된 입장이고, 기존 사람을 사칭하는 것은 허용하지 않는다.

파일 Store의 한 프로세스 운영 범위를 유지한다. 다중 Node replica/분산 잠금/실시간 소켓은 도입하지 않는다. production 전환 때 Vercel rewrite의 Set-Cookie 전달 및 동일 origin cookie/uploads 접근을 확인해야 하며 이번 설계에서는 운영 요청을 하지 않았다.

## 예정 파일 소유권 · 단일 구현자

| 파일 | 역할 |
|---|---|
| 신규 `shared/rooms.ts`, `server/rooms.ts` | 공개 access 타입/범위 classifier, credential·invite·join·원자 권한/리비전 검사. 서버 비밀 타입은 server에만 둔다. |
| `shared/types.ts`, `shared/privacy.ts` | room 공개 메타데이터, scoped snapshot, actor projection. legacy branch 유지. |
| `server/index.ts`, `server/store.ts`, `server/engine.ts`, `server/runtimeResume.ts`, `server/privatePin.ts` | 공통 queue/방 API·기존 endpoint 보호/파일권한·room import/export·scope 저장/비교·PIN actor binding. |
| `server/ai/index.ts` (필요 시 `prompt.ts`) | room 분석 입력/결과 범위와 큐 분리; provider transport 그대로. |
| 신규 `src/RoomEntry.tsx`, `src/roomAccess.ts`, `src/rooms.css` | 생성/참가/초대 UI·access/revision 상태. 기존 GamePicker·색상 표시 재사용. |
| `src/App.tsx`, `src/Dialogs.tsx`, `src/api.ts`, `src/SessionWorkspace.tsx`, `src/privateAccess.ts`, `src/PrivatePin.tsx` | 새 흐름·cookie·역할 탭·권한별 액션·active scope 충돌/초안 보존·개인 원본 fetch. |
| `src/SceneWorkspace.tsx`, `src/RummikubWorkspace.tsx`, `src/GameEssentials.tsx`, 필요 최소 `Fields.tsx`/`Packing.tsx`/`PhotoTargets.tsx` | 공용 readonly 재사용, scoped 저장/복원·dirty/revision 연결이 필요한 호출만. native 표현/정규화 재작성 없음. |
| 신규 `tests/multiplayer-rooms-*.test.ts`, `docs/multiplayer-rooms/**` | 합성 API/권한/동시성/UI 회귀·실제 화면 증거. |

위 범위는 감독의 다음 구현 카드에서 한 구현자에게 배정하는 제안이다. 기존 기록판 패키지는 동결한다. 새 파일이 기존 큰 index의 queue를 중복 구현하지 않도록 공유 job runner 추출만 허용 범위에 포함하면 된다. 새 gamepack/spec/art/의존성/운영 설정은 불필요하다.

## 검증 계획 / 완료 조건

1. fresh temp Store, 독립 cookie jar H(host)/A/B/외부 X: 방 생성→초대→3명 참가. 호스트 포함 정원, 동일 credential 재입장·만석 재입장·idempotency, 마지막 자리/색 동시 요청에서 정확히 한 성공. 다른 방 cookie·playerId·role 조작·invite만으로 host/타인 쓰기 실패.
2. public/native Rummikub 또는 Catan, generic owner 판, physical-only 게임을 합성 fixture로 검사한다. H/A/B의 개인 값을 서로 다르게 저장해 session/list/briefing/snapshot/difference/summary/activity/export/upload 원본·crop·AI mock 입력과 결과까지 타인 값/근거가 없는지 확인한다. 무PIN·PIN 양쪽, 타인 PIN을 아는 경우도 거절. public AI에 private photo ID를 넣으면 모델 호출 전에 거절.
3. 서로 다른 owner 변경은 둘 다 보존, 같은 owner의 stale tab은 409와 UI draft 유지, roster/name/color 수정은 다른 내용 불변. 지연 mock 분석 중 다른 참가자 저장 가능, target 변경 후 후보 미적용, 실패 후 accepted/pristine candidate 보존.
4. H 공용 저장과 A 개인 저장을 서로 다른 순서로 수행→서버 재시작→각 scope 재열기/복원. 타인 미저장 상태를 내 snapshot에 넣지 않음, scoped 최신 baseline 선택, public restore의 타인/turn 보존, owner restore의 공개/타owner/turn/epoch 보존 및 source refs 유지. 기존 turn-lifetime/구매 이력·native tile 순서/중복/optional PIN 회귀.
5. 서로 독립된 실제 브라우저 저장소(예: Chrome와 IAB, 도구가 지원하면 별도 browser context)로 H/A를 열어 390px 생성·링크/코드 참가·공용 readonly·자기 촬영 진입·선택 PIN·수정→저장→reload를 확인한다. 단순 두 탭은 동일 신원이므로 독립 사용자 검증으로 세지 않는다. 독립 CUA 저장소가 없으면 API cookie jar 검증과 한 브라우저 화면 검증으로 나누고 실제 다중 브라우저 클릭 미확인을 명시한다. 카메라/실AI 호출은 불필요하다.
6. 320px overflow/44px controls와 기존 focused+전체 test/type/build는 구현 동결 후 한 차례 확인한다. 운영 배포/프로세스/모델 전환은 별도 승인 범위다.

자체 검토: invite과 identity, 공개 읽기와 쓰기 소유권, room과 legacy, PIN과 membership, public/owner 저장 기준을 각각 분리했다. 해결되지 않은 기존 데이터 이행이나 새 계정 인프라 요구는 없다. 제품 동작과 합성 e2e는 **아직 구현/검증하지 않았다**.
