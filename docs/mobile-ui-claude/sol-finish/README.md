# 모바일 연결 UI 동결 인계

VERIFIED: Claude 격리 앱의 미완성 src를 이어서 완료했습니다. 공유 제품 소스·운영·실AI 변경은 0입니다. 파일 소유권을 반환합니다.

- 앱: `/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-mobile-ui-claude/app`, 합성 preview `http://127.0.0.1:4410` 유지.
- 최종 source digest `0255142408c9035805725fdb74c2a93b9679c81458acd18f2358c9240d8cfe7d`.
- [manifest.json](manifest.json)에 src14개 변경의 baseline/Claude-start/post SHA, 신규 UI test1개, 산출물 SHA가 있습니다. [ui.patch](ui.patch)는 baseline5598415f 기준 UI+신규 test만입니다. **files 복사와 patch 중 하나만** 적용하세요. 패치 격리 재적용15파일 SHA 일치.
- backend14+R1 동결본 exact 유지: **true**. server/shared/pack/public 해시 불일치0. backend는 이 패치에 넣지 않았습니다.
- 최종 JS `index-BF7iduh2.js` SHA `4d4a7d781c5ca60c556e4b23b736045b4901b3ec701e94507ecc12f465a100c4`; CSS `index-Dn5eUjP5.css` SHA `4b8f3e5e68574bd999e4bc836bedca7d22e65e3de716a860ec21f729954fa420`.

## 변경과 실제 확인

Claude의 부분 선택/연결·모달·접힌 빈 배치를 보존했습니다. 추가로 구매 카드 보너스, member 공용 화면의 타인 공개 보유, 전부 연결된 후보의 처리 표시를 연결했습니다. 홈은 작은 썸네일/정보/이어하기 배열, Rumi 공용개요는 기본 접기입니다. 연결 수량 입력의 묵시적 반올림을 제거하고 기존 validator에 맡겼습니다.

실제 CUA390: 후보1장 4점 정정→하나 구매, 다른1장 예약으로 분리; 남은 후보 유지. 시장6점 dirty 초안을 둔 채 공급 토큰 적용 후 초안 유지. 배치가 다른 영역 이동은 미배치 동의 전 disabled, 동의 후 선택1장만 이동. 상단/하단 공통 저장→reload→두리 owner 복원에서 값 유지. 보조 API는 같은 합성 기록만 대조했고 원 후보·원 위치 이력도 남았습니다([ui-api-values.json](ui-api-values.json)).

공개방은 CUA 방장+독립 API 손님, 독립 API 방장+CUA 멤버로 확인했습니다. 타인 공개 카드2개와 구매 보너스 표시, private 예약9점 미노출, 카드 클릭 시 편집 dialog0. API outsider403. 실제 두 브라우저 검수는 아닙니다.

390 홈 첫 카드 이름 bottom529/상태612/이어하기593, 클릭영역 높이128. Rumi는 UI로14개(7+7) 추가·저장·reload: 두번째 줄 bottom615 < 저장바774. 320 Rumi/360 Splendor 페이지 가로 넘침0. PIN 잠금 시 개인내용 DOM 미노출, 콘솔 error0. viewport1920×992 복원. 실측은 [captures/metrics.json](captures/metrics.json).

대표 캡처(실제 파일 bytes/SHA는 manifest):

- [홈390](captures/home-final-390.jpg)
- [14타일390](captures/rummikub-final-390.jpg)
- [멤버 공용 읽기](captures/member-readonly-390.jpg) — 마지막 수량 입력/CSS 조정 전 DOiLVqro 번들; 이 화면 기능은 해당 최종 delta의 변경 대상이 아닙니다.

## 명령과 한계

- 신규 SSR: RED3실패→GREEN3/3, exit0 (`ui-red.log`, `ui-green.log`).
- `node --import tsx --test tests/component-linking-ui.test.ts tests/game-recognition-ui.test.ts tests/rummikub-board-ui.test.ts tests/splendor-record-ui.test.ts tests/multiplayer-rooms-ui.test.ts`: **19/19, exit0** (`focused.log`).
- `npm run build` (**tsc 포함**): **exit0** (`build-final.log`). 기존 chunk-size 경고만 있습니다. 전체 suite는 후속 통합 담당 범위라 반복하지 않았습니다.

사진 placeholder/structured 합성 검수이며 판독 정확도 근거가 아닙니다. 실AI0, 실제 휴대폰 터치/가상 키보드 미확인. 320에서14개 한 화면 보장은 하지 않으며 줄바꿈을 허용합니다. 배포·공유 소스 반영은 아직 하지 않았습니다.
