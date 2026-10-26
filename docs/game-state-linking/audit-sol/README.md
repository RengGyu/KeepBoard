# 전게임 사진 → 상태 연결 독립 감사

**결론:** 기본 저장/복원 형식은 있으나, generic 118게임의 미귀속/다른 영역 실물을 실제 상태로 옮기는 공통 연결 UI가 없다. 그중 105게임은 플레이어별 공개 구성물 목적지가 있어도 사진 경로가 직접 도달하지 못한다. 또한 이 공개 플레이어 상태를 방에서 서로 보는 UI와 Splendor 공용 공급 토큰 목적지는 별도 보완이 필요하다. 이 세 건은 감독에게 조기 전달했다.

기준: `5598415fffdf1a86968095487d879867b8dd43f54cc0b9dfc23c50856c27139d`. 배포 manifest의 **1337파일 SHA 일치, drift 0**, 120 source JSON SHA가 각 pinned pack과 일치한다. 작업 중인 제품/WIP 대신 manifest가 가리키는 고정 사본을 읽었다. git HEAD와 source digest를 혼동하지 않았다.

## 확인한 필수 누락

| ID | 직접 근거 / 영향 | 필요한 최소 완료조건 |
|---|---|---|
| L1 | `shared/recognition.ts:46–50`은 public 사진에 public-scope, owner 사진에 player+owner 필드만 허용. generic **105게임의 player/public 구성물 필드**는 어느 쪽에도 직접 포함되지 않음. `capture-profiles.json`의 player_public **141영역 전부** `__photo.public`. `GameEssentials.tsx:38,67,95`는 후보의 원 field/owner로만 적용·수정하며 목적지 선택이 없음. 미귀속은 저장돼도 구매/보유/버림/배치 상태로 승격되지 않는다. 모든 generic118은 tray→다른 상태 이동 기능이 없음(항상 실패한다는 뜻은 아님: 직접 public/owner 필드는 정상 경로가 있음). | 기존 실물을 명시 선택하여 실제 field/owner로 연결. ID/readout/quantity/null/0/근거·crop 보존, 중복 재적용 방지, accepted 이동 시 selected만 원래 목록에서 제거. 원문 후보와 무관한 초안 유지. |
| L2 | `SessionWorkspace.tsx:199`는 room에서 자기 owner 탭만, `RoomEntry.tsx:18–20`는 public-scope만, `GameEssentials.tsx:63`은 room에서 플레이어 공개기록 목록을 숨김. `server/rooms.ts:41–42`/`shared/privacy.ts`는 타인의 public 필드를 보존하므로 서버 손실이 아닌 **표시 누락**이다. L1과 같은105게임 영향. Wingspan actual React SSR에서 서버 view에는 타인 `habitats.scene`이 있으나 두 room 공용 renderer에 없고 단일기기 공용에서는 보임. | 타인의 public 보유/배치 상태를 읽기 전용으로 표시. owner/private 데이터나 사진은 공개하지 않음. |
| L3 | Splendor source `/components/0/description`은 “색 종류와 보유/공급 구분.” 그러나 `/state_fields`에서 chips를 받는 실제 목적지는 player/public `player.scene`뿐. market/noble-area는 chips 불허. 미귀속 tray는 공급 상태 선택이 아니다. `probe.mts`가 두 public 목적지 거절을 확인. | 공용 공급 목적지의 최소 호환 보완. 기존 pack에 없는 상태라는 이유만으로 누락을 유지하지 않되 구버전 답/판본 자동 이행은 하지 않음. source 의미 직접 확인 / 공식 사실은 기존 연구의 `reported` 수준. |

## 전120행 근거

- [matrix.csv](matrix.csv): 모바일/스프레드시트용 120행 요약. 고유 gameId120, 누락·중복0.
- [matrix.json](matrix.json): 각 게임의 edition/sourceSHA, 모든 binding의 역할·scope·visibility·component·area·lifetime·편집지원, 실제 실행한 capture 필터 결과, 질문/보관 제한, 별도 UNKNOWN 포함.
- native2(Catan/Rummikub), generic118 중 typed117 + Splendor전용1. 기본팩의 manual 표기를 그대로 성공 판정하지 않고 effective recognition을 실행해 구분했다.
- 각 행은 **선언된 의미+공통 연결 경로 감사**다. 120게임 각각의 실물 규칙과 API/브라우저 여정까지 실행했다는 뜻이 아니다. 54게임의 manual player 속성, Carcassonne 부착 관계 등 기존 상세값은 이미 수정·저장할 수 있으므로 새 기능이 없는 것으로 취급하지 않았다.

현재 readout418분류 중 일반 component record 바인딩 밖 10개는 다음처럼 구별한다. 아트/상세 양식 보유가 바로 사진 수집 허용을 뜻하지 않는다.

| 게임 / component | 현 지원 및 한계 (원명세/팩 검토) |
|---|---|
| Aeon's End / turn-order | 덱은 hidden 실물보관. 현재 공개 차례는 별도 turn/메모로 기록. 덱 내부 전체 수집 요구 아님. |
| Arkham Horror3 / mythos | 컵 hidden 보관, 뽑은 토큰은 opaque `mythos-state` 확인 메모. 구조화 실물 대상은 미연결. |
| Azul / score | player/public `score` 숫자 직접 입력 가능. 점수 말 자체의 readout 이동은 미연결. |
| Cascadia / nature | `nature-count` 숫자 입력 가능. 토큰 인스턴스 연결은 미연결. |
| Codenames / key | role-limited 키카드는 실물보관. 공개 필드 신설로 해결하면 안 됨. |
| Just One / cards | 정답/미공개 덱은 role-limited/hidden 보관. 공개 힌트는 별도 지원. |
| Patchwork / buttons | `buttons` 보유 화폐와 `income` 수입 숫자는 별개로 입력 가능. 인쇄 비용과 물리 수량 합치지 않음. |
| Star Realms / authority | player/public `authority` 숫자 입력 가능. 점수 카드 실물의 대상은 미연결. |
| Stone Age / dice | `resolution`의 확인 메모로 굴림/처리 중단 지점 보존. 주사위 readout 객체 경로는 미연결. |
| Ticket to Ride / score | player/public `score` 숫자 입력 가능. 점수 말 실물 대상은 미연결. |

이10개를 모두 새 scene 필수 요구로 만들지 않았다. 116게임에 opaque/physical-only 제한이 적어도 하나 있으며 행렬에 정확히 남겼다. 비밀 내용을 입력하지 않고 실물 보관하는 제한과, 공개 상태의 구조화 지원 미완성을 구별한다. scalar/메모로 충분한지 또는 추가 실물 연결이 꼭 필요한지는 규칙/사용 목적 근거 없이 완성으로 승격하지 않았다.

## 실행 근거와 한계

| 검사 | 실제 결과 / 경계 |
|---|---|
| `node --import tsx docs/game-state-linking/audit-sol/audit.mts` | exit0. 고정파일1337/source120 SHA, 고유120행, capability/capture 필터 전수 실행. |
| `node --import tsx docs/game-state-linking/audit-sol/probe.mts` | exit0, 합성12case. Splendor tray/보유·공급/private, Wingspan/Azul/Monopoly/SCOUT target 저장, Carcassonne owner/부착 관계, native2 확인. [probe-results.json](probe-results.json). |
| 저장·복원 | 실제 `answerField`, typed validation, JSON serialize/reopen, `resumeSnapshot` 실행. fixture snapshot은 commit의 데이터 멤버를 복사한 합성이며 **HTTP commit/Blob API 실행이 아님**. source의 commit route는 별도 읽기 확인. |
| UI | 실제 frozen React `renderToStaticMarkup`으로 L2 재현. CSS/DOM/click/모바일 검수 아님. 초기 fixture는 두 React 사본 혼용, 이어 classic JSX runtime 누락으로 각각 exit1; frozen React+renderer와 fixture-only React binding으로 고친 뒤 최종 exit0. 제품 결함으로 세지 않음. |
| 사진 정확도 | metadata만 읽음: corpus found93/partial27. 파일 존재나 기존 사진 분류를 전게임 GT/실모델 정확도 통과로 간주하지 않음. **이번 실AI0, 원본사진 열람0**, 전게임 실제 판독정확도 UNKNOWN. 기존 Splendor 증상 보고는 배경이며 해당 사용자 기록을 다시 열지 않음. |

이미 받은 새 설계는 L1 해결 가능하지만 L2 표시와 L3 목적지는 추가 연결이 필요하다. [계약 대조](contract-review.md)에 UI 완료조건·snapshot 범위·권한을 정리했다. **제품 변경0 / 운영 접근0 / 배포0 / 전체 suite·build 불필요 실행0.** 이후 수정본은 별도 카드에서 독립 검증해야 한다.
