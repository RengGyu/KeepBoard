# 복원판 가독성 UI 인계

**VERIFIED — 소스 동결. 관련 26/26, 범위 타입 검사 exit0. 신규 유료 호출0.**

- 기존 `GenericPieceArt`/심벌/색 대응을 재사용한다. 카드·토큰 면은 기존 모양과 읽힌 색·숫자가 보이도록 표시하며 숫자를 크게 쓴다. 색 필드의 blue/silver 등은 파랑/은색으로 표시한다. 임의 카드 이름 `Blue`는 번역하지 않는다. 묶음 라벨의 같은 색도 한글 표시한다.
- compact에서 보조적인 false/‘없음’ 선택지/빈 목록·빈 문자열만 덜어낸다. 숫자0·진짜 미상 `?`·읽힌 이름은 유지한다. 원 readout과 상세 편집은 그대로다. 기존 주사위 심벌·미상 눈/색 fallback도 유지한다. 기존 공통 그림으로 모르는 카드 무늬/제목을 복원했다고 주장하지 않는다.
- 기술적인 순서 설명은 닫힌 ‘배치 근거’에 보존하고 실물 뒤로 옮겼다. 작업면의 기술 안내도 접힌 길잡이로 옮겼다. 원순서/부분순서/원 ID 선택은 바꾸지 않는다.
- 기존 패널은 `rows*150 + grid220 +70` 추정 최소 높이와 외부 패널 측정값을 함께 쓰므로 짧은 내용도 최소 높이 아래로 줄지 못했다. 이제 외부 min-height와 독립적인 자연 내용 wrapper를 관측해 실제 높이로 배치한다. 접힌 근거의 공간을 예약하지 않고, 펼친 실제 내용은 확보하며 다시 접으면 반환한다. 패널 관계·기하 추정·읽는 크기·저장 데이터는 바꾸지 않았다. 기존 첫 패널/집중 재진입·pan·jump 상태 처리를 그대로 재사용한다.

## 직접 검사

```
node --import tsx --test tests/piece-readout-art.test.ts tests/visible-piece-face.test.ts tests/structure-followup-ui.test.ts tests/restoration-scene-ui.test.ts tests/restoration-scene-layout.test.ts
./node_modules/.bin/tsc --noEmit -p docs/restoration-readability-generalization-20261113/sol1/tsconfig.json
```

[집중 로그](focused-tests.log): 26통과/실패0/skip0. [범위 타입](typecheck.log): exit0.
기존 집중 첫진입·pan/jump/선택/수동4×5/실제 원편집·저장 callback 검사와 색·숫자/기존 심벌 회귀를 포함한다. 추가 직접회귀는 한글 compact와 원값·상세 보존, 세로 패널 자연 높이/열기닫기/반복 측정 안정성을 검사한다. 마지막 세로 모형은 390px 폭 작업면이며 실제 Chrome 인증은 아니다.

전체 suite/build와 실제5종 App Chrome은 감독/Sol2 담당이다. 해당 fixture/raw는 수정하지 않았다. 새 사진·실폰 Safari는 미검증이다. 소유 밖 `PROJECT_CONTEXT.md`/work-sessions 변경은 감독 소유로 보존했다.

## 정확한 변경

[파일별 전후 SHA](freeze.json), [자기 delta](delta.patch), [시작 해시](before.json), `preimages/` 보존. 제품6파일·직접 UI test3파일이다. shared/sceneLayout 및 shared 추정/관측/backend/profile은 변경0. 원기하의 빈 공간을 없애려고 관계나 실제판 여부를 다시 추정하지 않았다.

후속 현재 소스 동결: [숫자 중복·요청된 미상 표시](hanabi-followup/README.md). 최초 freeze는 변경하지 않았으며 최신 SHA는 해당 후속 freeze를 함께 소비한다.

현재 마지막 후속 동결: [끝 구역 jump 범위](end-jump/README.md). 감독의 두 문구 교정 이후 preimage 기준이며 기존 자연높이/원값/기하를 유지한다.
