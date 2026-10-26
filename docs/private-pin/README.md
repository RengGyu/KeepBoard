# 선택형 개인 PIN · 구현/검증

**VERIFIED** 개인 화면의 `4자리 비밀번호 설정`은 기본 해제. 켜면 숫자4자리(선행0 허용)를 가린 입력으로 설정한다. 다시 열기/플레이어 전환/새로고침/저장한 판 재열기에서는 PIN을 입력해야 개인 수량·카드·메모·사진을 볼 수 있다. 변경/해제에는 현재 PIN을 다시 확인한다. 공개 판/소유색/공개 총수·점수·말은 유지한다.

UI 가림만이 아니다. 서버는 보호된 owner의 비공개 필드와 메모, 개인 사진·분석 요약, 보존 내용, snapshot 내부의 같은 내용을 세션 응답에서 제외한다. 목록은 unlock 여부와 관계없이 보호 개인 내용을 제외한다. 개인 수정/사진추가·삭제·크롭/분석/후보확인/보존수정은 올바른 session+owner capability 없으면403. 공개 저장은 개인 원본을 바꾸지 않고 snapshot으로 보존한다. 공개 다음 차례는 잠긴 개인 과거 기록을 삭제하지 않고 턴 수명만 만료한다. 보호된 플레이어는 보호 해제 전 삭제하지 못한다.

PIN은 각 Store의 `private-pins.json`에 무작위 salt+scrypt64byte hash만600권한으로 저장한다. Session/snapshot/export에는 PIN/hash/salt를 넣지 않는다. 토큰은 무작위256bit, 서버메모리15분, session+owner+현재hash에 한정한다. PIN변경/명시잠금 시 폐기하며 서버 재시작도 잠금 상태다. 실패5회면 session/owner/접속주소별1분 제한. 제한은 프로세스 메모리 기준이다.

브라우저는 토큰을 메모리에만 보관하고 URL/cookie/localStorage에 저장하지 않는다. 개인 사진은 헤더 인증 fetch 후 blob URL로 표시한다. 사진 응답/API는 no-store. 전환 시 이전 blob/로컬 캐시를 폐기하고 개인 DOM을 제거한다. BFCache로 돌아오면 새로고침하여 잠긴 응답부터 읽는다. 직접 `/uploads/...`도 현재/삭제목록/snapshot 원본 참조를 확인하며 PIN 없이 보호 사진을 받을 수 없다. 사진 파일과 원래 기록 자체는 삭제하거나 암호화하지 않는다.

한계/명시 동작:

- 보호 owner가 하나라도 있으면 전체 JSON 내보내기를403으로 차단한다. 내보내려면 각 개인 화면에서 현재 PIN으로 보호를 먼저 해제해야 한다. 보호 내용을 조용히 누락한 불완전 export를 만들지 않는다.
- 옛 `/resume` API가 잠긴 개인 snapshot을 덮어쓰는 것도 차단한다. 현재 주 UI의 저장한 판 바로 열기는 정상이며 새epoch/턴을 만들지 않는다.
- PIN 분실 복구 UI는 없다. 계정/본인 인증 체계가 아니며 최초 보호 설정은 기존 무PIN 영역에 접근 가능한 사용자가 한다. 파일시스템을 직접 관리하는 사람에 대한 저장자료 암호화는 이 기능의 범위가 아니다.
- 이미 전달된 무PIN 자료나 사용자가 별도 저장한 이미지/내보내기를 사후 회수하지 않는다. 실제 사용자 자료/보호 설정은 이번 검증에서 읽거나 변경하지 않았다.

검증: `node --import tsx --test tests/private-pin.test.ts`(4개 API/Store 회귀), `npm test` 전체172개 exit0, `npm run typecheck` exit0, `npm run build` exit0. 구현 전 테스트3개는 보호 API 부재404로 실패했으며 구현 후 통과했다. 회귀 범위는0007/형식오류/오답/다른owner·다른session토큰/변경·해제/토큰폐기/시도제한/재인스턴스잠금/개인사진직접URL·크롭·후보·내보내기/snapshot·목록필터/공개판·총수/무PIN호환이다.

실제 Chrome390×844 합성 Store에서 체크박스 설정→오답403/단일 오류→0007로 카드·메모·개인사진 열기(blob 이미지 정상load)→저장→다른 플레이어 전환(이전 메모 DOM없음/blob이미지0)→다시 PIN 요구→공용판1개 유지→내 보드 재열기·새로고침 잠금을 확인했다. `scrollWidth=innerWidth=390`. 증거: `locked-390.jpg`. 실카메라/실AI/실사용자 보호변경 시험은 하지 않았다.

합성 브라우저 재현: `node --import tsx tests/fixtures/private-pin-preview.ts`는 새 임시Store와 loopback4341만 만들며 출력된 URL을 연다. 실데이터/AI연결은 사용하지 않는다. 소스 서버 재시작 후 새 임시 보드를 생성한다.

변경 파일: `shared/privacy.ts`, `shared/types.ts`; `server/privatePin.ts`, `server/index.ts`; `src/privateAccess.ts`, `src/api.ts`, `src/App.tsx`, `src/PrivatePin.tsx`, `src/private-pin.css`, `src/SessionWorkspace.tsx`, `src/Fields.tsx`; `tests/private-pin.test.ts`, `tests/fixtures/private-pin-preview.ts`; 본 문서/이미지. 게이트웨이 변경·실호출 근거는 별도 `docs/ai-gateway-trial/README.md`에 기록한다.

현재4319는 게이트웨이 단계에서 시작한 서버이므로 **PIN API 코드를 반영하려면4319 서버 재시작이 필요**하다. gateway4330과 중계4320은 유지한다. commit/push/배포 없음.
