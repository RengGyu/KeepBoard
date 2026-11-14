# 일자 배치 원인과 구현 설계 — 2026-11-14

**VERIFIED:** 여러 게임이 일자 목록으로 보이는 직접 원인은 공통 복원판이 `grid/track/stack/free-area` 등의 팩 분류를 실제 표시기로 연결하지 않고, 현재 3종 추정기의 `presentation.grid/slots`가 없는 묶음을 모두 `EstimatedGroupBody → .estimated-row`로 보내기 때문이다. 사진 bbox는 남아 있지만 이 경로에서 기존 사진 줄 배치기를 사용하지 않는다. 팩이나 보드 그림이 전혀 없어서 생긴 현상은 아니다.

**VERIFIED:** 그 앞에도 별도 문제가 있다. 원 5종 요청은 구조 판독을 요청하지 않았고, 개별 관측의 `sourceAreaId`도 없다. 전체 사진을 `fireworks/pattern/map/supply` 같은 단일 요청 영역으로 취급한 뒤 같은 출처·역할의 물체를 한 묶음으로 합친다. 따라서 표시기를 고쳐도 손패/버림/벽/공급 더미/지도 연결을 모두 복원할 수는 없다.

**RECOMMENDATION:** 먼저 기존 위치와 표시기를 연결하고, 이어 구조 의미를 연결한다. 유효한 수동·canonical 위치와 기존 native/typed map 표시를 먼저 보존하고, 남은 관측에 기존 `PhotoLayoutBoard`/`layoutDrawingItems`를 적용한다. 동시에 관측 역할과 요청 범위를 구분하며, 저장된 구조 관계의 scope 내 연결·순서 소비를 고친다. 팩에는 실제 칸, 표시용 칸, 더미, 가변 지도 구조를 구별하는 최소 계약을 둔다. 아래 설계는 제품 구현 전 인계용이다.

| 게임 | 저장된 관측 수 | 현재 재생의 구조/경로 | 핵심 경계 |
|---|---:|---|---|
| 루미큐브 | 58 | 기존 native 사진 배치, 9줄 | 사진 줄을 소비하는 재사용 사례. 합법 멜드 정답은 아님 |
| 하나비 | 35 | 1묶음/1영역, 한 줄 | bbox는 있으나 역할·더미 관계 없음. 프로필의 5×5는 사진의 실제 칸 근거가 아님 |
| 아줄 | 22 | 4묶음/4영역, grid 힌트 없는 행 경로 | 원요청은 `pattern`; 실제 벽·패턴·바닥 소속과 칸은 없음. 기존 캡처 픽셀은 불완전 |
| 카르카손 | 43 | 1묶음/1영역, 한 줄 | 타일 9관측·말 34관측. 원자료에 지도 좌표·회전·인접 관계 없음 |
| 도미니언 | 49 | 1묶음/1영역, 한 줄 | single 35 + group 14. 49개가 49개 공급 더미라는 뜻은 아님 |
| 사그라다 | 42 | 11묶음/4영역, 주사위 18칸 추정 | 유효한 저장 canonical 18개가 scene에 전달되지 않음. 현재 추정 칸은 우연히 18개 모두 같은 주소 |
| 로스트 시티 | 42 | 12묶음/5영역, 원정/색상별 행 | 기존 전용 추정·관계 경로가 작동. 단일 일자 목록과 다른 문제 |
| 세븐 원더스 | 117 | 45묶음/17영역 | 기존 추정기가 분할하지만 큰 작업면·분절이 남음. 모든 판 소속 정확성은 미확인 |

408은 **저장 관측의 live binding 수**이며 사진 속 실물 정답 수가 아니다. 사그라다는 여기에 저장 spatial 판 참조에서 만든 보조 scene entity 1개가 추가된다.

## 새로 확인한 근거

- **VERIFIED:** 8장 원사진과 대응 서비스 캡처 8개를 직접 열었다. 사진 사본·원사진·manifest SHA가 일치한다. 캡처 기준 commit과 현재 기준 commit 사이 지정 제품 경로 diff는 없다.
- **VERIFIED:** 원 5종의 native compact 전개가 기존 expanded rows와 같고, 원 decoded 결과가 저장 receipt와 같다. 현재 정규화를 다시 실행해도 생성 ID를 제외한 값·bbox·목적 필드가 모두 같다. 검증기가 대량으로 관측을 버려 일자가 된 사례가 아니다.
- **VERIFIED:** 8종 전체 live binding 408개가 scene에 중복·누락 없이 들어간다. 순수 저장 코덱의 encode→JSON→decode도 값·receipt·scene을 보존한다. 현재 HTTP/실제 Store/재개를 새로 검증한 것은 아니다.
- **VERIFIED:** 무료 반례 7개로 bbox 미소비, 수동 위치의 두 단절, 실제 canonical 미전달, typed map 미선택, `precedes` 미소비, 필드 간 관계 탈락, 구조 변경 digest 누락을 확인했다. 실제 저장자료 반례 2개와 메모리 합성 반례 5개를 구분했다.
- **UNCLEAR:** 아줄 캡처는 4패널/22개라는 기존 DOM 기록과 달리 왼쪽 위 조각만 보인다. 이 이미지로 22개 표시 완료나 제품의 21개 소실을 판정할 수 없다. 로스트 시티 캡처에도 상단 잘림이 보인다.

## 인계 파일

- [evidence.md](evidence.md): 원사진 확인, 게임별 전달 경로, 정확한 코드 trigger, 반례와 제한.
- [design.md](design.md): 입력·출력 계약, 우선순위, 팩 의미, 기존 표시기 재사용, 유보 정책과 대안.
- [implementation-cards.md](implementation-cards.md): 수정 경계와 단계별 완료 조건. 첫 작업은 무료 기존 자료만으로 가능하다.
- [replay-results.json](replay-results.json), [counterexample-results.json](counterexample-results.json), [capture-check-results.json](capture-check-results.json): 기계 확인 결과.
- [input-pins.json](input-pins.json), [input-invariance.json](input-invariance.json): 지정 입력/제품 488파일의 전후 SHA·HEAD 확인.

## 무료 재현

프로젝트에 이미 설치된 의존성만 사용한다. 아래 명령은 이 task 폴더의 결과 JSON만 갱신한다.

```sh
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-diagnosis-20261114/replay.mts
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-diagnosis-20261114/counterexamples.mts
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-diagnosis-20261114/capture-check.mts
python3 docs/linear-layout-diagnosis-20261114/pins.py
```

**VERIFIED — 최종 실행:** 위 네 명령 모두 exit 0. 재생8종, 반례7개, 사진/캡처8쌍 검사를 마쳤다. 지정488파일의 변경0·추가0, HEAD 동일이며 지정 제품 경로의 working diff도 비어 있다. 문서의 로컬 파일 링크72개가 존재한다. 기존 `PROJECT_CONTEXT.md`와 `docs/work-sessions.md`의 수정 상태는 작업 시작 때부터 있었으며 이번 작업에서 편집하지 않았다.

`counterexamples.mts`는 **현재 결함이 재현됨을 assert**한다. 수정 후에는 기대값을 새 완료 조건으로 바꿔야 하며, 현재 PASS를 제품 정상 판정으로 읽으면 안 된다. 컴포넌트 확인은 실제 `RestorationSceneView`가 반환한 React tree를 읽고 effects를 실행하지 않는 방식이다. 새 브라우저 paint·실기기 속도·인식 정확도 검증은 아니다.

제품·팩·원사진·응답·평가·context/work-sessions 변경, 설치, 전체 suite/build, provider 호출은 수행하지 않았다. 작업 범위 안에서 완료를 막는 필수 자료 누락은 없다. 실제 게임 구조의 정답과 보이지 않는 정보는 별도 유보했다. 런타임 모델/effort/Normal 검증은 감독이 전달한 [runtime-verification.json](runtime-verification.json)의 **REPORTED** 근거로 취급했다.
