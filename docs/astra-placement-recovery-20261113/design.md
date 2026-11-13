# 자동 배치 복구: 원인과 구현 계약

기준 `d1ab64635e6d240fdf9fa4154dcfe08562541a95`. 기존 3사진/9응답 무료 재생. 신규 판독·원본 변경·배포 없음. 사진은 직접 열었고 별도 독립 사진 판정은 `photo-evaluation/` 소유자에게 맡긴다.

## 직접 확인한 원인

- **VERIFIED — LC:** baseline의 live `board`와 같은 receipt의 `boardInstance`는 같은 bbox인데 live의 `spatial.board` alias가 없다. `collectStructureBoards`가 둘을 모두 만들고 `resolveStructureAnchor`가 서로 경쟁하는 판으로 취급한다. 실제 중복 실물 ID를 삭제할 문제가 아니다.
- **VERIFIED — 7W:** receipt에 spatial 관계가 없다. 75% 판 containment / 50% 카드 겹침만으로 연결하므로 노출 띠의 겹침이 작은 연속 카드와 판 밖 tableau를 놓친다. 원사진에서 판 주변에 여러 카드 띠가 있고, 관측된 판은 4개, 별도 가려진 판의 카드들은 실제 ref가 없다. `wonder-area`가 단계 역할 분기에 빠져 있다.
- **VERIFIED — Sagrada:** low에 window 관측이 없고 전경 dice는 draft 역할이다. 반복 격자 계산과 anchor 확인이 결합되어 상대 표시 구조도 사라진다. high/medium의 토큰은 명시 관계가 없어 도구 위에 충분히 겹쳐도 부착이 유보된다.

## 재사용 및 수정

`photoDrawingReference`의 출처 검증, qualified live/observed refs, `diceLattice`, 기존 게임팩 칸, 부분순서, 수동 v2 override, `EstimatedBoardView`의 평면/선택/부착, 기존 저장·재개를 재사용한다. 새 renderer/저장 시스템/원사진 분석기는 만들지 않는다.

1. **판 후보 동치:** 같은 receipt 안에서 판 관측과 boardInstance가 유일하고 거의 같은 원본 영역이며 명시 alias/종류 충돌이 없을 때 파생 alias를 연결한다. 두 live 후보 또는 여러 동등 boardInstance가 있으면 합치지 않는다. raw ID·geometry·receipt는 그대로 두고 파생 alias만 추가한다.
2. **기하 연결:** 7W의 명시 역할이 호환되는 단일 카드들에 대해 충분한 부분 겹침으로 관측 띠를 연결한다. 알려진 판과의 부분 겹침/짧은 경계 간격을 띠의 근거로 쓰되 여러 판이 지지되면 유보한다. 거리만 가까운 카드·동전, 미상 뒷면, 가려진 누락 판은 강제 연결하지 않는다. 기하 전파는 `estimated`, 명시 관계는 별도 basis로 유지한다. 원래의 연결 우선순위를 깨지 않는다.
3. **표시 구조와 판 참조:** 판이 없고 반복 격자/띠만 있으면 `anchorRef:null`인 표시 구조와 명시적 유보 사유를 둔다. 원래 draft/readout을 창문 사실로 변경하지 않으며 실제 판 연결 집계와 표시 복구를 분리한다. 기존 renderer에서 이 구조를 직접 보여준다.
4. **역할·부착:** `wonder-area`의 기존 의미를 stages로 전달한다. Sagrada 토큰은 도구에 대한 유일하고 충분한 containment가 있을 때만 추정 부착을 허용한다. 떨어진 토큰을 최근접 도구에 붙이지 않는다.

## 독립 interim 이후의 v2 보정

- **LC 표시 줄:** `suit:null`인 카드가 이미 판·편·탐험 역할을 얻어도 색만으로 묶으면 별도 줄로 떨어진다. 같은 판·관측편의 카드 중 겹침/명시 관계로 연결된 띠를 만들고, 색 모름 띠가 정확히 하나의 관측 줄과 연결될 때만 표시 group을 공유한다. 서로 떨어진 두 줄은 같은 색이어도 경쟁 후보다. `basisByField.lane='estimated'`와 설명을 남기며 `readout.suit`, 숫자, owner, 역할 원값은 바꾸지 않는다.
- **LC 범위 밖 꼬리:** 판의 관측 가로 범위를 넘는 탐험 카드도 같은 역할의 연속 띠에서 유일한 판 지지를 전달받을 수 있다. 두 판의 projection이 겹치는 경쟁은 별도 미확정 이유로 남기며 이웃 카드가 지지하는 한 판으로 축약하지 않는다.
- **7W 경계:** 작은 대각선 모서리 겹침을 edge-gap 0으로 취급하지 않는다. 부분 겹침이 충분하거나, 한 축에서 실제로 떨어져 있고 다른 축의 경계가 넓게 맞닿는 경우만 쓴다. 이 보강으로 interim의 연결 75개가 v2에서는 74개이며, 감소한 1건도 보고한다. upper-right의 남은 brown 띠는 두 판의 AABB 접촉이 경쟁하고 green은 지지 띠가 없어 유보한다.
- **표시/확정:** Sagrada low 18개 표시 격자는 `areaId='unclassified'`, `anchorRef:null`, 판·역할·방향 basis unknown으로 남긴다. 실제 판은 0개이고 이 18개는 배치 수에 포함하지 않는다. 표시 격자의 상대 slot은 수동 정식 칸 validator로 전달하지 않는다.

## 보존 계약

원 bbox·원값·ID·owner·receipt·정식 칸은 불변. 수동 정정과 native 배치가 우선이다. 표시 구조는 실제 `StructureAnchorRef` 종류를 늘리거나 가상판을 만들지 않는다. 값/수량/사진별 좌표/fixture ID는 소속 추론에 쓰지 않는다. 사진판정/새 bbox 교정 없이 좌표 배율 가설을 적용하지 않는다.

## 검증

수정 전후 같은 9응답을 task 폴더에 별도 저장. 게임/영역별 실물·자동연결·표시구조·미연결을 기록하고, 기존 사진 판정과 독립 재판정의 일치/오소속/유보를 따로 대조한다. 실제 `EstimatedBoardView` SSR에서 모든 파생 실물의 단일 선택 경로와 원입력 불변을 검사한다. 회전·이동·경쟁 판·가림 경계·누락판·수동/native/저장 보존의 집중 회귀와 타입검사를 실행한다. 전체 suite/build/브라우저는 감독 최종 통합 범위다.
