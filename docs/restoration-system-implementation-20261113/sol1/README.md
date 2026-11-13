# 전체 복원 작업면 UI — 소스 동결

**VERIFIED:** 실제 제품 경로에 UI를 연결했다. 별도 viewer/저장 앱이 아니다. 변경 15파일과 원상태·최종 SHA는 [freeze.json](freeze.json), 자기 delta는 [delta.patch](delta.patch)에 있다. 다른 작업자의 shared/server/profile 변경은 포함하지 않는다.

| 범위 | 실제 진입·연결 | 직접 확인 |
|---|---|---|
| T3 전체 가로 장면 | `SessionWorkspace → GameEssentials → restorationScenesForView → RestorationSceneView/sceneLayout`. 허용된 현재 scope의 여러 field를 한 pan 평면에 표시. 실제 shared label/양편/색/부분순서/grid/cell hints 소비 | 원 ID마다 한 번 표시, 가독 크기·상대관계·순환 분리·pan/jump. native Catan/Rummikub 주 경로 유지 |
| T4 정정 | 실물 선택→`entities.bindings`→기존 `GenericComponents/GameBoardRecord/GameDetailFields`; 묶음 판/역할/frame/split/merge/undo→기존 `api.update({sceneCommands,answers?})` | 원 field/piece 선택, 편집 중 answer와 명령 원자 PATCH, 0/null·raw 불변, self/cycle/chain/cross-field 선택, 기존 상세/수동 회귀 |
| T6 선택 구조 판독 | 기존 `읽기 설정 → 구역·묶음 관계 함께 읽기`→`HostedReaderSelection.scene:true` | 기본 생략/기존 reader payload 유지. 설정 클릭은 job 0회, 명시 기존 판독에서만 동일 reader+scene flag 전송. 모델/강도 변경 없음 |
| T7 부분 보완 | `묶음 고치기 → 원사진에서 확인·부분 읽기`→기존 PhotoDialog/명시 ROI 판독. 새 근접 사진은 기존 대상 실물 upload 경로 | 원사진·원영역 전달. 관계/단순 열기는 판독 0회. 기존 fusion/수동값·삭제 보호 경로 재사용 |
| T8 진행·실물 보존 | 기존 field/차례·메모 열기, `question-decision` skip, 실제 기존 Preservation 선택→`link-preservation` | skip은 답을 만들지 않고 같은 입력 재열기에서 유지. 보관 링크 저장/재열기와 packed/restored 불변. 변경된 링크는 needs-review 표시 |
| T9 다른 시점 | `다른 시점 사진·판별 연결`에서 실제 두 판 선택→기존 사진 tap surface로 같은 지점4쌍→`register-view`; 유일 후보에만 `confirm-identity` | sourceSHA/실제판/stateKey 포함. 미등록·경쟁·과거 상태 별도. 사진/실물 ID와 원값 자동 병합 0 |

원사진과 개발용 붙여넣기는 접힌 영역에 보존하고 복원판을 앞에 둔다. 집중 보기는 기존 Modal의 body portal/focus trap/Escape를 재사용한다. 전역 header/footer가 가리지 않으며 선택·원사진·메모·보관 진입 시 집중을 닫는다. 전체를 viewport에 축소하지 않는다. 반복 필드 라벨만 작업면에서 숨기고 실제 값과 기존 상세 편집을 유지한다. 실제 판이 없는 구역은 표시 구역임을 명시한다.

## 검증

- [focused-ui-tests.log](focused-ui-tests.log): 실제 UI 이벤트/관련 기존 회귀 **80/80 PASS**, 실패0. 정확한 12개 test 파일 실행 명령은 freeze.json에 기록했다.
- `npx tsc --noEmit -p docs/restoration-system-implementation-20261113/sol1/tsconfig.json`: **exit0**, [typecheck-final.log](typecheck-final.log).
- 기존 로컬 HTTP 저장 재저장 회귀 `node --import tsx --test tests/restoration-save-resave-ui.test.ts`: **1/1 PASS**, [save-resave-tests.log](save-resave-tests.log). 첫 sandbox 실행은 listen EPERM으로 차단돼 해당 검사만 loopback 허용 후 재실행했다.
- `git diff --check` 담당 파일 범위: exit0. 전체 suite/build, provider 호출, commit/push/deploy: **0회**.

**REPORTED:** 감독 Chrome 844×390에서 원사진 접기/주보기 선두, 공통 Modal 집중 보기의 닫기·toolbar/pan과 전역 header/footer 덮임 교정, 반복 속성명 제거를 직접 확인했다고 전달받았다. 작업자가 직접 Chrome/Safari를 검사한 결과로 표기하지 않는다.

## 남은 통합·확인

- 복합 `question-decision + dirty answers`의 요청 전 digest를 baseline으로 검증하고 최종 digest로 저장하는 경계는 감독이 Sol2에 좁게 교정 요청했다. UI는 digest를 임의 재조립하거나 저장을 2회로 분리하지 않는다. 단독 skip/보관 연결 및 JSON 재열기 직접회귀는 통과했다.
- 감독이 최종 실제 App 3게임 정정·저장/재개와 전체 type/suite/build를 담당한다. 실제 iPhone Safari/직접 터치, 새 co-output provider schema 수용·품질·지연, 실제 다른 시점 정합 품질은 미확인이다. 합성 대응점/후보 검사는 실제 사진의 동일성 정답 인증이 아니다.
- root 소유 PROJECT_CONTEXT 갱신 요지: 전체 장면 UI와 기존 값 편집/scene 명령/선택 co-output/부분읽기/진행·보관/명시 사진 등록 연결 구현, 위 직접 검사 범위만 VERIFIED. 새 판독 정확도·전게임 구조 정답·실기기 완료를 주장하지 않는다.

담당 제품 소스는 freeze.json 기준으로 동결하고 감독에게 소유권을 반환한다. 추가 변경은 조율 후 별도 delta로 한다.
