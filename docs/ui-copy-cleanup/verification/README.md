# 문구 정리판 모바일 직접 검수

VERIFIED · 2026-10-22 · Chrome CUA390×844. 제품 소스 수정 없음. fresh keyless preview http://127.0.0.1:4399/ · output session34215 유지. Store `/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-essentials-preview-ngtsZC`. 기존 운영/합성 프로세스 변경 없음.

실제 검수한 합성 기록은 두 개뿐이다:
- 루미큐브 `c5bf32ac-abeb-4ce7-9655-99a473187cdd`
- 카르카손 `4246f0d7-94c1-42a6-b2c6-62cc30600a20`

## 실제 조작과 결과

1. 새판 게임선택→루미큐브 생성. 공용묶음·타일 추가·모름·보관 기능 유지. 자동 인식 꺼짐은 짧은 한 줄로 표시. 상단 명세/PIN 중복 설명 없음. [공용화면](rummikub-public-390.jpg)
2. 빨강 개인 탭 선택→PIN 설정 전 안내/4자리 필드/설정 버튼만 표시. PIN 실제 입력·설정 없음. [PIN화면](rummikub-pin-390.jpg)
3. 카르카손 새판 생성. 게임 기록/성장하는 지도/점수판/구성물 추가/누구 차례/중단한 지점/미확인 유지/아직 모름 유지. `수동 기록 · 자동 판독 없음` 표시.
4. 보관 조건 더 보기 클릭→게임별 단계와 순서/앞뒤 보존 목록 표시. 보관 위치 `검수 봉투 A`, 중단한 지점 `타일 배치 후 · 합성` 입력. 별도 위치저장 없이 상단 저장 실제 클릭→저장됨→reload 후 두 값 유지. AX 포장완료 값0 유지. [조건·위치](carcassonne-preservation-390.jpg) · [재열기 위치](carcassonne-preserved-location-390.jpg)
5. 저장 후 `저장 기록 복원 +` 클릭→`공개 기록만 복원해요. 개인 기록은 그대로예요.`와 `공개 저장 기록 복원` 버튼 표시. 긴 resume notes/hash/rules/gaps 덤프 없음. 복원 버튼 자체는 실행하지 않음. [복원영역](carcassonne-restoration-390.jpg)
6. 직접 DOM 본문 검사에서 lifetime/모르면 null/참고 명세/명세 hash/gaps 미노출. 카르카손390 overflow0/broken images0. viewport reset 완료.

Playwright role=button으로 summary를 찾은 첫 시도는 no_matches였고, DOM snapshot의 generic summary를 확인 후 실제 텍스트 클릭으로 정상 진행했다. 제품 오류로 분류하지 않았다. 초기 sandbox preview bind는 listen 실패 후 null address 오류; 승인된 로컬 실행으로4399 정상 기동. 제품/서버 코드를 수정해 우회하지 않았다.

## 한계

실제 손가락/실폰 가상키보드/Safari 미확인. PIN 해제 후 개인 필드·스캔 실제 카메라·실AI·후보 생성 미검증. 보관 조건 원문은 의도대로 남아 있으며 내용 자체를 다시 수정하지 않았다. 전체227/type/build pass는 Claude 인계 보고이며 이 작업은 동일 dist를 검수·배포, 반복 실행하지 않았다. 읽기/쓰기 모두 명시된 새 합성2개에 한정. 사용자 자료/키/모델 호출 없음.
