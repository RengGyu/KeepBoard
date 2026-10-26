# 한 기기 생성·선택 이름 인계

**VERIFIED · 구현 동결 · 263/263, type/build exit0.** 후속 A3 카드로 frontend/backend를 함께 production에 반영했다: **https://keepboard-kappa.vercel.app**. [최종 배포·보존·공개 검수](deploy/README.md). 아래는 앞선 로컬 구현 단계의 근거다.

## 동작

- 새 보드 기본 선택은 **한 기기에서 모두 기록**. 선택한 게임/판본, 1~12명 명단의 이름/색을 기존 `POST /api/sessions`로 보낸다. `room` metadata·가짜 membership은 만들지 않는다. 모든 개인 탭/사진/기존 각 owner PIN을 한 기기에서 관리한다.
- **초대로 함께 기록**은 기존 방식 그대로: 방장1명만 만들고 실제 참가 시 좌석을 추가한다. host 공용+self/member self 권한과 private/PIN 경계는 그대로다. 기존 기록/방의 전환이나 좌석 claim/위임은 없다.
- 이름은 선택. 신규 create/join과 명시적 roster/profile 이름 편집에서 서버가 빈 값/공백/생략을 좌석 순서 `플레이어 N`으로 채운다. 직접 입력한 이름은 trim 후 유지하며 최대40자다. room 재입장은 입력한 새 이름/색을 무시하고 기존 신원·이름·색을 유지한다. room profile을 비우면 현재 고정 좌석 인덱스를 쓴다.
- UI 초기 명단은 빈 이름과 서로 다른12색 팔레트이며, 인원/모드를 오가도 선택 초안을 보존한다. native 루미큐브 타일 인쇄색과 플레이어 표시색은 별개다.
- legacy color는 기존 문자열/named color를 그대로 허용·보존한다. room만 기존 hex/중복색 검사를 한다. 기존 import/load를 정규화하거나 기존 세션을 이행하지 않았다. PIN 정책 역시 선택한 기존 게임팩 정책 그대로다.

## 변경 파일 / 좁은 diff

| 파일 | 이번 변경 |
|---|---|
| `src/RoomEntry.tsx` | 기본 단일기기/초대 모드, 선택 수의 PlayerRows, optional host/join/profile 이름, 모드별 기존 API dispatch |
| `src/creationPlayers.ts` 신규 | 12개 구별색과 빈 이름·개별 UUID 초안 생성 |
| `src/Dialogs.tsx` | PlayerRows 재사용용 fixedCount, 이름 선택/40자/자리 placeholder, 최대12명. 다른 편집 기능 유지 |
| `src/rooms.css` | 모드 radio44px, 명단 폭/색 input44px 범위 스타일 |
| `src/api.ts` | createRoom/joinRoom 입력 타입에서 name optional |
| `server/rooms.ts` | 공통 기본명 helper, 실제 새 join 좌석 번호, reentry early-return 유지 |
| `server/index.ts` | 새 생성/명시 roster 수정 이름 정리·1~12명 검사. legacy 색 검사/기존 import validator는 유지. room profile 실제 좌석 index 전달 |
| `tests/single-device-setup.test.ts` 신규 | fresh Store API 회귀4개 |
| `tests/multiplayer-rooms-ui.test.ts` | 변경 전 ‘초대만’ SSR 기대치를 기본 단일기기+선택 이름으로 갱신. 기존 권한/CAS 검사는 유지 |

workingtree의 이전 room 등 변경이 많아 git base 전체 diff를 이번 패키지 diff 크기로 주장하지 않는다. 정확한 최종 해시는 [verification.json](verification.json).

## 실행 근거

| 명령 | exit / 결과 |
|---|---|
| `node --import tsx --test tests/single-device-setup.test.ts` 변경 전 | 1 · 0/4, 빈 이름 유지/초대 거절 재현 [red.log](red.log) |
| 새 API + 기존 room API 집중 | 0 · 9/9 [focused.log](focused.log) |
| 새 API + room SSR/CAS 집중 | 0 · 7/7 [ui-focused.log](ui-focused.log) |
| 최종 `npm test` | 0 · **263/263** [tests.log](tests.log) |
| 최종 `npm run typecheck` | 0 [typecheck.log](typecheck.log) |
| 최종 `npm run build` | 0 [build.log](build.log) |

새 API 검사는 1/12명·13명 거절, blank/whitespace/omitted/custom·40자/타입/ID, legacy red/blue 유지, 단일기기 public+서로 다른 owner 저장/snapshot/reopen·한 owner PIN 잠금, invite 기본명·실제 좌석·재입장·본인 profile fallback·엄격색/중복색·타인/공용 수정 거절을 실제 서버에서 검증한다. 기존 room 권한/사진/PIN/분석 지연/legacy 검사는 최종 전체 회귀에 포함한다.

첫 UI 집중 실행의 별도 실패는 SSR HTML attribute 순서를 하네스가 잘못 가정한 것이었고, checked와 value의 의미를 확인하는 기대치로 고쳤다. 제품 회귀의 red→green과 구분한다.

## 실제 모바일 (합성 source 앱)

**http://127.0.0.1:4404/** · keyless fresh Store · PID47657/output session28363 유지. [preview.json](preview.json). 기존 preview/운영 프로세스는 건드리지 않았다. Vite source 앱 검수이며 built dist를 브라우저에서 재검수했다고 하지 않는다.

390×844 실제 클릭: 새 보드의 단일기기 기본값 → 루미큐브 검색/선택 → 3명 → 이름 첫째 빈 값/둘째 ‘다온’/셋째 공백 → 초대 모드 전환/단일기기 복귀 시 명단 초안 유지 → 생성. 결과 **플레이어1/다온/플레이어3**, room metadata 없음(API 회귀). 같은 브라우저에서 공용·첫째/다온 개인 메모를 각 상단 저장하고 reload 뒤 확인했다. 두 개인 탭 모두 사진 추가/받침대 버튼과 선택 PIN 진입이 있었다. 카메라는 활성화하지 않았다.

단일기기/초대 두 패널 각각320px page/dialog overflow0, 초대에는 명단행0·단일기기는 선택3행. 390 캡처 후 viewport reset 완료. 빠르게 묶어 수행한 첫 두 번째 메모 저장은 확인되지 않아 별도 클릭·저장 완료 상태·reload로 재수행해 보존을 확인했다. 이를 데이터 손실 원인 확정/별도 제품 수정으로 주장하지 않는다.

캡처: [단일기기 명단](screenshots/single-390.jpg), [초대 방식](screenshots/invite-390.jpg), [개인 저장 재열기](screenshots/reopen-390.jpg). 마지막 캡처는 reopen 이미지 알림이 사라진 뒤 저장했다.

초대 이름을 비워 실제 가입/재입장하는 동작은 독립 cookie API로 검사했으며 이번 브라우저에서는 초대 모드 표시까지만 확인했다. 실폰 손가락/키보드·실촬영·실AI는 미확인/미실행이다. 개인정보 보호 범위를 기존 방에 넓히거나 기존 데이터를 바꾸지 않았다.

## 빌드·후속 운영

- JS `index-Bq6MHVSs.js`
- CSS `index-OaHCSuLT.css`

새 기본명은 새 backend가 필요하다. 로컬 단계 반환 후 후속 A3 카드에서 동일 Store의 backend와 frontend를 함께 갱신했다([운영 인계](deploy/README.md)). source/art/spec/freeze/PIN 설정 데이터는 범위를 넘겨 바꾸지 않았다. 소유권 반환.
