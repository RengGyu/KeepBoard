# Backend/shared 최소 계약안 · 감독 확인 전

1. **새 Classic 입력:** `RUMMIKUB_COLORS`/AI schema·prompt·신규 수동 색 선택은 `black/red/blue/orange`만 제공한다. 불명확·목록 밖 관측색은 `null`, orange 자동 치환 없음. [공식 Classic PDF p.1, 2025-06 공개본](https://rummikub.com/wp-content/uploads/2025/06/4600-0236-0013-EN-_rummikub-Classic.pdf)의4색 기본세트 범위이며 XP/Large Numbers를 혼합하지 않는다(열람2026-10-22).
2. **기존 색 원본:** 저장형의 legacy `green` 호환 타입/읽기 정규화는 유지하고 새 AI 관측 정규화만 명시 Classic 모드로 분리한다. PATCH는 기존 accepted/candidate의 동일 실물ID·미변경 legacy색을 허용하되 새/색 변경 항목의 green은 거절한다. 관련 없는 이동/메모/저장이 과거 green·조커 representedColor·증거/순서/snapshot을 지우지 않게 한다. 기존값은 원본/미지원색으로 표시하고 사용자가 명시 정정할 때만 바꾼다.
3. **선택형 PIN 앱 정책:** 유효 보호 집합은 `PrivatePins.owners(sessionId)`의 실제 설정자만이다. 새 기록과 이미 있는 PIN 미설정 기록은 개인 스캔/읽기/쓰기 바로 허용한다. `pin-before-content`가 들어 있는 과거 고정팩도 앱의 현재 선택형 정책으로 접근 판단하며 pack/version 자체는 교체하지 않는다. PIN 자동 삭제/해제·데이터 마이그레이션 없음.
4. **설정된 PIN 유지:** 응답·목록·snapshot·원본/확대사진·쓰기·AI 근거·owner 복원은 기존 token 검증/가림 유지. PIN 변경/해제는 기존 currentPin 확인과 token 폐기를 유지한다. export는 설정 PIN이 하나라도 있으면 차단; 미설정 기록은 허용하고 import도 표현불가 비밀 거절을 유지하며 PIN 자격증명을 복사/자동 설정하지 않는다.
5. **독립 비밀 경계:** `physicalOnlyField`·unsupported hidden/own-hidden/role-limited/shared-secret 필드/import 거절과 해당 내용용 개인사진 거절은 선택형 여부가 아닌 runtime/지원능력으로 판정한다. `strictPrivate`를 완화한 결과 이 guard까지 꺼지는 경로를 분리한다.
6. **프런트 계약:** `privacy.protectedOwnerIds`=설정된 owner만, `unlockedOwnerIds`=유효 token owner, `setupRequiredOwnerIds=[]`; 세 UI의 잠금은 configured/unlocked 집합만 사용한다. PIN 체크박스는 선택사항이고 기존 PIN 변경/해제 API 형태는 유지한다. 새 Classic 색4개와 legacy색 표시/보존 경계만 공유하며 UI 시안 파일은 수정하지 않는다.
7. **버전 최소안:** 새 생성팩 metadata의 `privatePolicy`에 `optional-pin`을 추가하고 adapter/native Classic 설명·버전을 갱신해 재생성한다. 서버 validator는 과거 `pin-before-content`도 읽기 호환한다. 과거 metadata는 당시 정책 기록이며 현재 유효 접근 정책의 강제값으로 재사용하지 않는다.120 원명세 freeze/437 아트는 불변이고 이미 저장된 전체 팩은 그대로다.
8. **수정 예정 파일:** `shared/{rummikub,gameEssentials,privacy,types}.ts`, `server/{index,engine}.ts`, `server/ai/{index,rummikubPrompt}.ts`, `gamepacks/rummikub.ts`, `gamepacks/generated/game-essentials{,.manifest}.json` 및 필요한 generator. 프런트 담당 연결: `src/{PrivatePin,SessionWorkspace,GameEssentials,RummikubWorkspace}.tsx`의 PIN/색 선택(이번 단계 편집X).
9. **핵심 검증:** 합성 fresh Store에서 새/과거 고정팩·PIN 미설정의 개인 CRUD/사진, 설정 후 GET/list/snapshot/photo/PATCH/AI/export/wrong-owner 차단과 PIN 미변경, unsupported-secret/PIN 독립 거절, 새 AI green→null·manual 신규green 거절·legacy green 포함 이동/저장/명시수정/복원 원본 보존,4색·null·중복/순서·owner 회귀를 검사한다. 기존 테스트의 ‘필수PIN’ 기대만 새 정책으로 갱신하고 보호 기대는 유지; 실제 AI/사용자 데이터/운영 변경 없음.

읽기와 이 문서 작성만 완료. 제품 수정은 감독 확인 후 별도 권한으로 시작한다.
