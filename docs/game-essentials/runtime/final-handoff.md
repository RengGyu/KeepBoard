# 두 fix 최종 빌드·새 미리보기 인계

VERIFIED · 2026-10-22. 이번 단계는 제품 소스/테스트/원명세/아트/generated/source freeze 수정0이다. 승인된 두 수정이 들어간 dist를 빌드하고 새4397만 기동했다. 소유권을 반환하며 미리보기는 유지한다.

## 접속·빌드

- **http://127.0.0.1:4397** — 새 fresh 임시 Store/loopback, AI configured=false. 기존4393/4396/4330 등 종료·재시작0, gateway/키/사용자 자료/실AI 접근0.
- 실행: `RUNTIME_PREVIEW_PORT=4397 node --import tsx tools/game-runtime/preview.ts`.
- `npm run build`: **exit0**, [final-build.log](final-build.log). 테스트225/225·타입 통과는 앞 단계 근거를 유지하며 요청대로 반복하지 않았다.
- 홈200, catalog120, 새 정적 JS/CSS200 및 dist SHA 일치: [final-verification.json](final-verification.json).
- JS `index-Ca6-pUiM.js` / SHA `43cfc8d47beef22a091f98ebb18d362db3d8370c2fb3d07b8e7c7698140317f4`.
- CSS `index-Bd4K20ak.css` / SHA `291d57c55609f2b2a71600635cb337811e1c86beae71fe99818125e3ebd3b58a`.

## 1. 보관 위치: 실제 브라우저 클릭

새 카르카손 합성 기록에서 두 보관 위치를 입력했다. **개별 ‘위치 저장’은 누르지 않고**, 화면으로 이동해 보이는 상단 ‘저장’을 실제 클릭했다. 저장 성공 표시 후 reload했다.

- `파란 봉투 · 위에서부터 순서 유지`
- `상자 오른쪽 · 공용 배치 사진 참고`

CUA 실제 input 값 두 개가 그대로 남았고 두 포장 checkbox는 false였다. 추가로 새4397 API의 현재 기록과 snapshot에 두 위치가 모두 있고 packed/restored가 모두 false임을 확인했다. 위치 입력만으로 완료 승격하지 않았다.

[해당 합성 기록](http://127.0.0.1:4397/?session=b2987b7b-9678-4e7a-817f-cd60f11ded0a)

- [390px 새로고침 전체 화면](screenshots/final-location-reload-390.jpg)
- [1440px 두 위치·미포장 상태](screenshots/final-location-reload-1440.jpg)

첫 자동화 시도에서 화면 밖 상단 버튼에 대한 locator click은 저장을 활성화하지 않았다. 상태·버튼 위치를 확인하고 화면을 위로 옮겨 보이는 상단 버튼을 AX로 직접 클릭한 뒤 성공을 확인했다. 이 초기 자동화 실패를 제품 저장 실패로 보고하지 않는다. 별도 위치 저장 버튼은 이 과정 내내 누르지 않았다.

## 2. turn 복원: 실제 버튼+새 API 확인

새4397 API로 공개 카탄 합성 기록만 준비했다: build/주사위8 → 저장 → explicit next-turn. CUA에서 복원 전 단계가 모름임을 확인하고, **‘공개 저장 기록 복원’ 버튼을 실제 클릭**했다.

- UI의 ‘어디까지 했나요?’가 **건설/개발 카드 구매(build)**로 복원됐다.
- 같은 새4397 API에서 phase=build, dice=8, 두 필드의 질문 없음, briefing의 ‘현재 턴 단계: 건설/개발 카드 구매’와 ‘이번 주사위 합: 8’을 확인했다.
- explicit next-turn 이후의 전역 turn UUID는 유지됐고 public resume의 capture epoch는 새로 만들어졌다.
- 실제 화면 확인은 단계 선택과 복원 버튼이다. 주사위/질문/briefing과 UUID는 API 응답에서 확인했으며 화면에 전부 표시됐다고 주장하지 않는다.

[해당 합성 기록](http://127.0.0.1:4397/?session=280aeca5-a46b-4f2d-bc3f-a571e9af6c92) · [복원 단계 화면](screenshots/final-turn-restored-1440.jpg)

## 경계

CUA390/1440에서 overflow0/broken images0을 확인하고 viewport override를 reset했다. 미리보기와 결과 탭은 유지한다. PIN·실패/재시도·owner 복원 전체 경계는 앞 단계 실제 fresh API/컴포넌트 회귀 근거이며 이번 브라우저에서 모두 재검증하지 않았다. 카메라·실AI 인식 검증은 하지 않았다.

기존 프로세스들은 재시작하지 않았으므로 신규 API 코드를 제공한다고 볼 수 없다. 공용 dist 디렉터리를 읽는 기존 서버가 새 클라이언트 자산을 제공할 가능성과 해당 프로세스의 API 코드 반영 여부는 별개다. 최종 두 fix의 새 API/클라이언트 조합을 직접 확인한 주소는 **4397**이다.
