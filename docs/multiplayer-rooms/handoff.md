# 방 기능 인계

**VERIFIED · 제품 소스 동결 / 집중 검증 완료.** 운영 미반영. 전체 suite/build는 Sol2 반환 후 감독의 통합 카드에서 실행한다. 이번에 기존 dist·운영 서버·모델·라우팅·사용자 Store·원명세·아트는 수정하지 않았다.

## 실제 연결

- 새 보드에서 게임/판본·정원(본인 포함)·자기 이름/색으로 방 생성. 초대 링크 복사 또는 8자리 코드로 참가한다. 기존 참가자는 만석에서도 같은 기기 cookie로 재입장하고 이름/색을 다시 정하지 않는다.
- HttpOnly 기기 bearer의 hash membership이 신원이다. invite/playerId/PIN은 신원이 아니다. host는 공용+자기, member는 공용 보기+자기만 편집한다. 무PIN도 타인 개인 내용은 응답/원본에서 제외한다. 본인 PIN만 설정/해제/열기/잠금 가능하다.
- 기존 sessions API·업로드 URL·crop·후보 수락·PIN·보관·목록·export/import까지 서버 권한을 적용했다. 방 전체 export/import는 미지원으로 거절한다. legacy 기록의 API/팩/데이터는 전환하지 않는다.
- public/owner revision CAS로 낡은 저장을 409 처리한다. 폴링이 active scope의 기준 revision/초안을 덮지 않는다. 다른 owner 저장은 독립적이다. room snapshot은 저장한 범위만 포함하고 비교/복원은 그 범위의 최신 저장본을 선택한다.
- 공개 복원은 다른 owner 값과 현재 logical turn을 유지하고, 개인 복원은 공개/타owner/turn/epoch를 유지한다. 유효했던 turn-lifetime 상태의 rebase와 구매 이력 보존은 기존 helper 규칙을 따른다. 공개 next-turn도 타인 private 원본을 삭제하지 않는다.
- room 분석은 권한·입력 snapshot 확보 후 모델 대기만 큐 밖에서 처리하고 결과 적용 시 해당 revision/epoch를 다시 검사한다. public 입력에 타인 private context/사진이 없고 scope가 다른 결과는 저장하지 않는다. 실패·stale 결과로 accepted/pristine candidate를 바꾸지 않는다. 이번 검증은 mock만 사용했다.

## 정확한 제품 변경 파일

신규: `shared/rooms.ts`, `server/rooms.ts`, `src/roomAccess.ts`, `src/RoomEntry.tsx`, `src/rooms.css`.

기존: `shared/types.ts`, `server/index.ts`, `server/store.ts`, `server/engine.ts`, `server/runtimeResume.ts`, `src/api.ts`, `src/App.tsx`, `src/SessionWorkspace.tsx`, `src/GameEssentials.tsx`, `src/PrivatePin.tsx`.

`shared/privacy.ts`, `server/privatePin.ts`, `server/ai/index.ts`와 native 정규화/그림 원본은 수정하지 않고 helper를 재사용했다. `src/main.tsx`, `src/styles.css`, `src/lobby-theme.css`는 감독 소유 변경이며 이 패키지의 변경으로 집계하지 않는다. Sol2 소유 아트/매핑/팩/freeze는 수정하지 않았다.

검증 신규: `tests/multiplayer-rooms-api.test.ts`, `tests/multiplayer-rooms-ui.test.ts`, 이 폴더의 preview/fixture·증거 파일. 실행계획은 [plan.md](plan.md), 계약은 [design.md](design.md).

## 직접 실행 근거

| 명령/로그 | 결과 |
|---|---|
| room API 최초 재현 `api-red.log` | exit 1 · 새 endpoint 없음 |
| scoped snapshot 재현 `scopes-red.log` | exit 1 · 기존 전체 snapshot에 savedScope 없음 |
| 타인 PIN 토큰 잠금 재현 `foreign-lock-red.log` | exit 1 · 200을 반환하던 경계 확인 후 actor 검사 추가 |
| `node --import tsx --test tests/multiplayer-rooms-api.test.ts tests/multiplayer-rooms-ui.test.ts tests/game-essentials-runtime-turn-resume.test.ts tests/rummikub-runtime-integration.test.ts tests/rummikub-board-ui.test.ts tests/preservation-draft.test.ts` | exit 0 · 20/20, `focused-final.log` |
| 마지막 PIN actor 수정 후 room 전용 두 파일 실행 | exit 0 · 8/8, `room-final.log` (Hanabi own-hidden 실제 거절 포함) |
| `npm run typecheck` | exit 0, `type-final.log` |

20개 집중 검사 이후 마지막 동작 수정은 `/privacy/lock`도 room actor의 토큰만 잠그게 하는 검사다. 그 뒤 room 8개와 타입 검사를 통과했다. 별도로 긴 참가자명 줄바꿈을 room 전용 CSS에 한정했다(긴 이름 실제 렌더는 미확인). 새 전체 suite/build를 했다는 뜻은 아니다. 초기 loopback EPERM은 sandbox 권한을 받아 재실행했다. restart 회귀의 최초 fetch 실패는 테스트 연결 pool의 종료 socket 재사용이었으며 하네스에 `Connection: close`를 지정한 뒤 새 서버/같은 cookie·PIN 보존을 검증했다. 자동 유료 재시도는 없다.

서로 독립된 H/A/B/outsider cookie jar로 마지막 자리/동일색 원자 참가, 기존 좌석/host 사칭 거절, 타 owner raw PATCH/사진/PIN·token 우회, 범위 저장/복원·global turn, restart 후 membership/PIN, 다른 owner 저장 중 지연 mock 분석, stale 분석 미적용, 실패 후 facts/원본 유지, Wingspan private record의 ID/null/원본 경계, Hanabi 비수집을 확인했다.

## 실제 브라우저 근거

새 keyless 실제 앱 **http://127.0.0.1:4403/**. 임시 Store와 설정은 [preview.json](preview.json). 이번에 만든 프로세스만 같은 임시 Store로 갱신했고 기존 다른 preview/운영 프로세스는 건드리지 않았다. Vite HMR 없이 수동 reload로 확인했다.

390×844에서 생성→링크 복사→코드 참가→중복색 오류 정정→공용 readonly→자기 숫자13/주황 **타일 1개**·메모 수정→상단 저장→reload, 자기 이름/표시색 수정, 초대 링크 재입장·같은 playerId를 확인했다. 방장 쪽은 공용 숫자7 타일 1개와 자기 메모를 실제 저장/reload했다. 실제 AI 결과나 타일13개를 판독한 검증이 아니다.

최종 PIN lock actor 검사 반영 후 캡처 재확인은 CUA의 `Browser is not available: 2`로 중단됐다. 마지막 시도는 viewport 설정 단계에서 실패해 기존 캡처를 덮지 않았다. 앞선 여정 후 viewport reset은 성공했다. 최종 helper/API source는 집중 검사로 확인했고 이 마지막 수정 이후 실제 브라우저 클릭을 다시 했다고 주장하지 않는다.

같은 신원의 두 탭에서는 다른 창이 먼저 저장한 뒤 원래 초안의 저장이 거절되고 텍스트가 남는 것을 실제 확인했다. 두 탭을 두 사람으로 세지 않는다. 제공된 CUA는 Chrome 저장소 1개여서 다른 사람은 독립 API cookie jar로 만들었다. 다른 기기/두 독립 실제 브라우저 클릭은 미확인이다.

합성 PIN은 로컬 helper fixture로 설정(실제 API 설정/해제 보호는 별도 회귀), CUA에서 재열기 잠금·1111 오답·기존 0007 정답·원래 개인 타일 재표시·링크 재입장 시 재잠금을 확인했다. 카메라는 활성화하지 않았고 촬영 버튼의 본인 범위 표시만 확인했다. 공용/개인 320px page overflow 0·깨진 이미지 0, viewport 복원. [verification.json](verification.json)에 수행/미수행을 구분했다.

화면: [host 공용](captures/host-public-390.png), [member 공용 보기](captures/member-public-390.png), [member 자기 기록](captures/member-own-390.png), [PIN 잠금](captures/member-locked-390.png), [충돌 초안](captures/conflict-draft-390.png). 이 캡처 일부는 감독의 후속 테마 import보다 먼저 촬영했다. 기능 여정을 새 테마 배포 검증이라고 주장하지 않는다.

## 한계·후속 통합

기기 cookie 공유는 같은 사람이며 삭제/다른 기기 이동 시 기존 좌석 복구가 없다. PIN은 좌석 복구/본인 인증을 대신하지 않는다. 계정·채팅·강퇴·방장 위임·분산 Store는 추가하지 않았다. 코드/credential/PIN은 실제 사용자 자료로 시험하지 않았다.

기존 단일기기 기록은 참가 권한으로 자동 보호되지 않는다. 방 데이터만 새 policy를 따른다. 모든120게임을 CUA로 확인하거나 모든 규칙/인식을 지원한다는 주장은 하지 않는다. 기존 공개 AI관리 API 정책은 이 패키지의 계정/관리자 인증으로 확장하지 않았다.

새 프런트와 새 backend가 함께 필요하다. 생산 Vercel rewrite의 same-origin cookie/Set-Cookie/업로드 전달, 전체 tests/build 및 최종 theme/art 통합은 감독 카드에서 확인해야 한다. source freeze 전후로 실제 운영을 전환하지 않았다. 전역 epoch는 유지하므로 host의 명시 public 복원/새 차례가 다른 기기의 진행 중 촬영을 409로 중단시킬 수 있고 원본/전송 초안을 유지한다.
