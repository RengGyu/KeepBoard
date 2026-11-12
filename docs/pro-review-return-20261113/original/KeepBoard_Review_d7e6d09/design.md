# 수정 설계 — 관측값을 바꾸지 않는 판별 관계 복원

기준 SHA: `d7e6d098116659b727dae50a8ae204b1ab566aae`

**성격:** 실제 코드에서 찾은 결함과 실행 반례를 바탕으로 한 구현 설계. 최소 패치에 포함된 것은 P0 두 항목뿐이다. 아래의 전체 관계 복원과 모델 전략을 운영에 구현·사진 검증했다고 주장하지 않는다. 원사진 바이너리 미확보로 사진 정답표/7W 표본20개 직접 판정은 미완료다.

## 1. 문제를 다시 분리한다

현재 `estimateBoardStructure`는 출처가 확인된 bbox와 일부 값으로 표시할 줄·칸을 추정한다. 그 결과는 원사진의 게임 관계가 아니라 **표시 가능한 배치 가설**이다. 101/117,38/42 같은 `placed`는 관계를 정답표와 비교한 수가 아니다.

원인층별 판단은 `findings.csv`에 있다.

- 판독: 카드/주사위 값·역할이 응답마다 다르다. 같은 물체라도 역할이 `window`에서 `draft`로 바뀌면 경로가 달라진다.
- 구조: 가까운 판 중심, 사진 중앙, 가로/세로 AABB 긴 축을 실제 소속·편·순서의 대리값으로 쓰는 부분이 있다.
- 검증/정정: 출처가 같은 다른 기록 영역을 자동 배치는 참고하지만 수동 anchor는 거부하는 불일치가 있다.
- 표시: 순환 부착과 다단계 부착의 일부 물체가 화면에서 빠지는 경로가 있다. 원 데이터가 사라지는 것은 아니다.
- 보존: 저장·재열기를 새로 만들 필요는 없다. 기존 raw/값/geometry/manual override가 계속 보존되는지 통합 검사한다.

게임별 숫자·정답 좌표를 추가하는 대신, **출처 범위 → 판 인스턴스 → 판의 국소 좌표계 → 역할·소속·부분순서 → 기존 평면 렌더러**로 연결한다.

## 2. 그대로 재사용할 것

| 기존 요소 | 재사용 방식 |
|---|---|
| `photoDrawingReference`/`projectGenericDrawing` | owner·epoch·sourceSHA·definitionSHA·transform 검증과 live ID 기준은 유지 |
| `StoredSpatialPiece` | 이미 `board`, `placement`, `relations`, `resolved`, source pinning이 있다. 새로운 병렬 원장부터 만들지 않음 |
| `SpatialBoardInstance` | template/binding/orientation이 미확정이어도 관측된 판 ref와 원본 영역 자체를 쓸 수 있음. canonical slot 확정과 별개 |
| `SpatialRelation` | `on/above/covers/attached-to/before/same-visible-stack` 활용. `above`는 공간상 위, `covers`는 겹침으로 구분 |
| `mapObservationRegion` | 패널·크롭 좌표를 원본으로 되돌리는 기존 변환 활용 |
| `diceLattice` | 관측 반복행·원근 열선 가설 생성기로 유지. 인쇄 방향·빈칸의 진실을 자동 증명하지 않음 |
| 기존 board art·spatial definition | 모양·칸·주소·네이티브 보드 렌더에 재사용 |
| `EstimatedBoardView`/`GameBoardRecord` | 같은 piece ID의 선택·원사진·수정과 연결. 새 게임별 렌더러 금지 |
| `GameDetailReadout`/`pieceFaceValues` | 읽힌 값·모름·0을 그대로 표현. 추정 위치가 읽힌 값을 바꾸지 않음 |
| `saveIntent`/`runtimeResume` | 판독중 저장·수동값·메모·snapshot 경계를 유지 |

`SpatialResult` 검증은 이미 잘못된 주소를 photo-local로 낮추고, 부정확한 spatial 일부 때문에 다른 값 전체를 버리지 않도록 설계돼 있다. 복원율을 올리려고 이 검사를 완화하지 않는다. `request-registration`은 현 validator에서 임의 생성이 허용되지 않는다. 새 코너 정정 입력을 만들 때 실제 등록 계약을 함께 구현하기 전 모델이 registration을 지어내게 하면 안 된다.

## 3. 최소 공통 계약

### 3.1 identity는 qualified reference로

현재 원본 대상은 `(assertionId,pieceId)`로 참조하고 실제 source는 `(ownerId,evidenceId,sourceSHA,captureEpoch,definitionSHA)`로 제한한다. 다른 assertion에 같은 문자열의 pieceId가 있으면 임의 선택하지 않는다.

판 앵커는 두 종류를 지원하는 파생 참조다.

```ts
type AnchorRef =
 | {kind:'live-piece'; assertionId:string; pieceId:string}
 | {kind:'observed-board'; taskId:string; boardInstanceRef:string};
```

두 번째는 응답에 **실제로 존재하는 boardInstance**를 가리킨다. 그림을 맞추려고 존재하지 않는 판을 만드는 기능이 아니다. 게임팩에 “판이 있다”는 사실만으로 instance를 생성하지 않는다. 모델 boardInstanceRef는 요청마다 바뀔 수 있으므로 서로 다른 요청의 동일 판 연결은 원사진/관측영역으로 별도 검증한다.

### 3.2 원관측과 파생 구조를 분리

저장된 `readout`, source bbox, 원응답, 원ID는 불변 근거로 둔다. 파생 `RelationPlacement`에는 다음만 추가한다.

```ts
interface RelationPlacement {
  pieceRef:{assertionId:string;pieceId:string};
  anchorRef:AnchorRef|null;
  areaId:string|null; groupId:string|null;
  slot:{basis:'canonical'|'relative-band'|'manual'; address:string|null; rank:number|null}|null;
  side:{basis:'board-local'; key:'A'|'B'; orientationConfirmed:boolean}|null;
  beforeRefs:{assertionId:string;pieceId:string}[];
  attachedTo:{assertionId:string;pieceId:string}|null;
  basisByField:Record<string,'manual'|'canonical'|'observed-relation'|'estimated'|'unknown'>;
  evidenceRefs:string[];
  unknownReasons:string[];
}
```

이 타입은 **제안한 파생 어댑터 계약**이지 현재 저장소에 이미 추가된 타입이 아니다. 기존 `EstimatedBoardGroup/Placement`에 필요한 부분만 확장하고 기존 뷰로 변환한다. 처음부터 모든 필드를 저장 API에 넣을 필요 없다. UI 편집으로 확정한 관계만 manual override 버전으로 명시 저장한다.

### 3.3 field별 우선순위

명시한 사용자 관계 정정 > 출처 검증된 정식 주소 > 같은 원본의 관측 관계 > 기하 추정 > 미확정. 단 “관측 관계”도 모델의 오독 가능성이 있으므로 충돌하면 유보한다. 타입의 우선순위만으로 모순을 자동 덮지 않는다.

한 필드를 사용자가 고쳤다고 나머지 자동 필드가 모두 사람 확인으로 바뀌지 않는다. 이동은 위치 관계만, 카드 숫자 수정은 해당 값만 갱신한다. 새 판독이 사용자 관계를 조용히 되돌리지 않는다. native 좌표 편집과 structureOverride 간에는 명시적으로 활성 모드를 전환하고 이전 필드의 override를 해제하거나 superseded로 남긴다. 두 계층을 동시에 활성으로 남겨 우연히 먼저 실행되는 branch가 이기게 하지 않는다.

## 4. 실제 공통 알고리즘

### 4.1 입력 scope부터 분할

`photoDrawingReference`가 통과한 대상만 photo geometry 경로로 보낸다. 같은 출처·소유 범위·epoch·definition으로 나누고, 현재 화면에 허용된 live assertion만 후보에 둔다. 삭제된 대상은 receipt에서 되살리지 않는다. cross-field는 허용하되 cross-owner/photo/epoch는 허용하지 않는다. 이번 최소 패치는 이 경계 내 수동 참조만 수정한다.

### 4.2 판 국소 frame 획득

1. 기존 정식 `resolved`/등록주소가 있으면 재사용.
2. 실제 판 landmark와 방향이 확보됐으면 원본의 의미 있는 4개 코너를 canonical plane에 매핑.
3. 판 외곽이 없지만 반복셀/판 기준선이 보이면 기존 lattice/PCA로 **상대 구조 가설**만 생성.
4. 후보 방향·원점이 여러 개면 합의되는 관계만 배치; 나머지는 같은 그룹의 `?`로 표시.

`analysis/relation_core.py::frame_from_corners/project`가 실행 가능한 호모그래피 원형이다. 입력 코너는 semantic TL/TR/BR/BL이며 사진 바운딩박스 네모가 아니다. 겹침/왜곡 부품까지 한 평면에 정확히 옮겼다고 취급하지 않는다. 4점 residual0은 정확성 증거가 아니므로 추가 landmark와 위치 불확실성 범위로 슬롯 경계를 검사한다. 경계를 걸치면 unknown.

코너를 알 수 없는 한 판만 사용자가 원사진에서 지정하면 그 frame을 해당 판의 모든 대상에 공유한다. 게임마다 배치법을 설명하거나 카드마다 점을 찍게 하지 않는다.

### 4.3 소속 anchor

`nearAnchor`의 가장 가까운 중심을 소속 확정자로 사용하지 않는다.

- 저장된 사용자 지정/정식 spatial boardInstance가 범위 검증을 통과하고 충돌하지 않으면 사용.
- 동일 사진의 `on`/`attached-to`/`same-visible-stack`와 실제 판 기준영역을 결합해 후보를 만든다.
- board 밖 tableau는 “판 bbox 안에 있어야 한다”로 제한하지 않는다. 판의 관측 방향에서 카드 띠의 부분겹침·간격·열 구조로 만든 연결요소를 판 주변 영역과 대조한다.
- 연결요소 안의 일부가 서로 다른 판을 지지하면 연결요소를 통째로 가장 가까운 판에 몰지 않는다. 충돌한 edge를 약한 후보로 남기고 경계 질문 한 번으로 구성요소의 연결을 정정한다.
- 색은 묶음 표시 속성이지 anchor identity의 hard gate가 아니다. 색이 바뀌어도 위치 매칭은 유지한다.
- 후보 하나만 남는다고 무조건 확정하지 않는다. 해당 geometry/관계 근거가 없으면 `anchor?` 목록에 그대로 보여준다. 거리순은 후보 UI 정렬에는 쓰되 정답근거가 아니다.

예시 점수식을 임의의 가중치로 출시하지 않는다. 초기 결정은 **명시 관계의 유효성·충돌·후보수**로 하며, 거리/영역 점수 threshold는 제공 원사진 정답표가 확보된 뒤 고정한다. 이 문서는 검증되지 않은 마진을 성능보장으로 제시하지 않는다.

### 4.4 줄/편/순서

공통 `groupKey = [sourceKey, anchorRef, role, laneKey]`. 색을 알면 lane label에 쓰지만 물리적인 줄 구분은 판별이 먼저다. 관측된 줄이 둘인데 색이 둘 다 미상이라고 한 줄로 합치지 않는다.

- 양편: 판 중심선과 실제 방향 landmark를 기준으로 A/B를 정한다. `side_of_line` 원형은 사진중앙을 쓰지 않고 translation/rotation 불변성을 검사했다. 사람 이름은 별도 owner 확인이다.
- 순서: 검증된 `before` 관계와 노출된 카드 겹침으로 DAG를 만든다. `partial_order`는 순서를 알 수 없는 동시 level을 그대로 남긴다. 화면에서 ID순 정렬할 수 있어도 실제 order라고 저장하지 않는다.
- 규칙상 오름차순이어야 해도 관측순서를 숫자로 재정렬하지 않는다.
- 같은 줄에서 카드가 가려져 있으면 보이는 카드만 개별기록하고 나머지는 실제 묶음 보존 조건으로 남긴다.

### 4.5 격자/지도/트랙/부착

격자는 기존 spatial definition의 행·열·주소를 읽는다. 사그라다 관측18개/4×5/특정빈칸을 일반 알고리즘에 박지 않는다. 현재4×5는 해당 게임의 정의로 이동할 수 있지만 프로토타입에 그 값을 재하드코딩하지 않는다. 전체 행·열이 없는 경우 lattice가 원점을 알 수 없다는 제한을 유지한다.

지도·노선은 기존 canonical slot graph의 칸·변·교점에 대응하고, 임의 최근접 snap으로 한 칸 건너뛰는 오류를 감추지 않는다. 높은 말은 바닥 접점 또는 수동 위치를 사용한다.

트랙은 인쇄주소가 읽혔거나 등록frame이 있으면 canonical. bbox10등분/보이는밴드순위는 `relative-band`. 화면은 `관측묶음 A/B`, `위치?` 등으로 표시하고 printed round1..10과 혼합하지 않는다. 한 칸에 여러 주사위가 있을 수 있다.

부착은 방향 그래프. 저장된 잘못된 순환은 원값 삭제 없이 derivedview에서break하고 모두노출한다. 깊이 2 이상도 렌더한다. 다른 field의 target은 외부 연결 표시를 유지한다. 실제 attachment 판단은 최소한 관측 관계 또는 충분한 접촉·겹침 근거가 필요하며 bbox가 1픽셀 겹친 것만으로 의미를 확정하지 않는다.

## 5. 세 게임에서 필요한 정보와 불필요한 정보

### Sagrada

재개에 필요한 정보는 창문·패턴의 식별 또는 원본, 점유한 칸과 주사위의 색·눈, 현재 라운드·진행 지점, 도구·공개 목표의 식별, 토큰 수와 사용 상태다. 개인 목표는 해당 사용자의 기록으로 남기고 공용 요청에 숨은 내용을 요구하지 않는다.

low의 전경 후보 18개는 `diceLattice`만 실행하면 18개 셀에 대응된다. 그러나 실제 창문 anchor의 누락과 `draft` 역할은 별도 문제다. 역할을 일괄 변경하거나 가상 창문을 추가하면 안 된다. 같은 epoch의 검증된 기존 anchor 또는 실제 응답의 board instance가 있으면 재사용하고, 없으면 해당 판의 외곽·방향을 한 번 정정한다.

공식 규칙에서 라운드가 끝난 뒤 남은 여러 주사위는 **같은 완료 라운드 칸**에 놓인다. 도구에 사용한 favor와 미사용 favor는 위치·역할이 다를 수 있다. 솔로에서는 트랙 주사위 합이 목표 점수에 쓰이고 favor를 사용하지 않는다. 따라서 모든 토큰을 도구에 부착하거나 트랙 눈을 항상 불필요하다고 판단하면 안 된다. 제공 사진의 모드·판본은 아직 식별하지 못했다. 눈 범위·칸 충돌은 의심 표시의 근거이며 실제 값을 자동 수정하는 근거가 아니다. [R-SAG]

### Lost Cities

판 인스턴스별 양편·색줄, 노출된 카드 값과 투자 카드 구분, 실물 순서, 버림 역할·윗장, 덱의 순서 보존 조건이 필요하다. 개인 손패·차례·메모는 기존 경로를 사용한다. 버림 더미 아래 보이지 않는 카드를 억지로 추론하지 않는다.

`[3,4,5,6,8,10]`은 중복 없이 증가한다. 따라서 증가·중복 규칙만으로 8이 추가 검출이라고 판정할 수 없다. 6/9도 숫자 순서만으로 교정하지 않는다. 같은 색의 투자 카드는 여러 장이 있으므로 동일 기호 반복을 일괄 오류로 표시해서도 안 된다. 공식 5색 기본 구성과 6색 변형이 있으므로, 사진의 판본을 모른 채 허용 개수를 고정하지 않는다. [R-LC][R-LC-OLD]

### Seven Wonders

실제 불가사의판 인스턴스와 면, 건설한 카드의 식별 가능한 모습·효과·필요 값과 올바른 판 소속, 동전·군사 토큰 값, 완성 단계에 끼운 카드 관계가 필요하다. 사진 위치만으로 사람의 이름이나 owner를 확정하지 않는다.

카드명 3/86은 이름 판독의 부족을 보여주지만, 그 수만으로 재개 가능 여부를 결정할 수 없다. 원본 크롭과 효과로 같은 실물 카드를 찾을 수 있다면 완전한 이름 OCR은 필수가 아닐 수 있다. 반대로 색은 같지만 효과가 다른 카드가 구별되지 않으면 정보가 부족하다.

**불가사의 단계 표시를 위해 뒤집어 끼운 카드의 이름은 읽을 필요가 없다.** 인용한 공식 규칙에서는 그 카드 자체의 효과를 사용하지 않고 해당 단계의 완성을 표시한다. 어느 단계인지와 필요한 방향·겹침을 보존한다. 제공 사진의 판본·확장 예외는 별도로 남긴다. [R-7W]

현재의 종류→tableau 분류를 단계 아래 카드·공용 버림·손패와 혼동하지 않게 한다. 직접 사진 감사는 판별·색별·기타 토큰·경계·부착에서 20개 이상을 층화 선정해야 한다. 이번에는 원사진을 확보하지 못해 해당 선정과 판정을 완료하지 않았다.

## 6. 화면 수정 — 새 렌더러 없이

정상 기록은 기존 `GenericPieceArt`를 사용한다. 추정 복원판의 넓은 화면에도 compact 전달이 이미 있으므로 같은 수정은 반복하지 않는다. 실제 문제 화면이 다른 경로인지 먼저 구분한다.

인쇄 주소와 표시용 순위를 라벨에서 구분한다. 큰 숫자 1이 실제 1라운드인지 단순 첫 번째 관측 묶음인지 혼동시키지 않는다. 선택한 물체에는 원사진 범위와 현재 anchor를 함께 보여준다. 한 묶음의 소속을 정정할 때 해당 연결 요소만 변경하고, 다른 소유자의 비밀 자료를 전달하지 않는다.

미확인·미배치 때문에 저장 버튼을 차단하지 않는다. 원사진·읽힌 값·물음표·수동 위치·메모를 보관하며 **저장됨과 위치 확인 완료를 분리**한다. anchor가 삭제돼도 가까운 다른 판에 자동으로 붙이지 않는다. 관계만 stale 또는 unknown으로 표시하고 원값은 유지한다.

순환 부착·외부 연결·미배치도 최소 한 번은 선택할 수 있어야 한다. 불확실한 물체를 화면에서 없애서 정돈된 것처럼 보이게 하지 않는다.

## 7. 공정한 채점과 모델 결정

대응은 동일 source SHA의 실물별 **보이는 면 영역**을 기준으로 한다. IoU와 화면 종횡비를 보정한 중심 거리를 결합하고 일대일 전역 할당을 사용한다. ID·값·색·영역 역할을 강제 일치 조건으로 사용하지 않는다. 색 alias는 대응 후 속성 채점에만 적용한다.

넓은 묶음 박스를 여러 개별 정답으로 분해하지 않는다. 겹친 카드에서 두 대응이 비슷하면 유보한다. `match_observations.py`의 임계값은 노출된 진단 기본값이며 실제 사진에 맞게 검증된 출시 기준이 아니다. 사진 정답표를 완성한 뒤 값을 보고 임계값을 유리하게 바꾸지 않도록 고정한다.

미대응·중복 후보·묶음·읽기 불가·값 오독의 분모를 분리한다. 전체 사진을 검토하지 않은 정답표에서는 사진 전체 누락·허위 수와 정확도를 계산하지 않는다. 같은 live ID의 상충 기록도 첫 값으로 조용히 채점하지 않는다.

사그라다 전경 후보의 medium은 기하 재대응에서 비교 가능한 상태가 됐다. 그러나 사진 정답과 LC·7W 검토가 미완료이므로 기본 강도를 변경하지 않는다. high라는 설정명도 정답 보증은 아니다. 먼저 기존 응답을 같은 사진 기준으로 비교하고, 추가 호출은 `experiments.md`의 조건을 충족할 때만 제한적으로 검토한다. 저장소의 공급자 alias를 공식 공개 모델의 성능으로 새로 인증하지 않는다.

## 공식 규칙 근거와 확인 범위

- **R-SAG:** [Floodgate Games 공식 Sagrada 규칙](https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf). 3–4쪽의 텍스트와 페이지 스크린샷을 확인했다. KeepBoard 원사진의 판본·모드 확인과는 다르다.
- **R-LC:** [Kosmos 공식 2018 규칙](https://cms.kosmos.de/game-instructions/4002051694135_Lost%20Cities_Duell_Manual_web.pdf). 6색 변형, 숫자 증가, 복수 투자 카드에 관한 공식 텍스트를 확인했다. PDF 스크린샷은 cache miss로 확인하지 못했다.
- **R-LC-OLD:** [Kosmos 공식 2015 규칙](https://fragkosmos.zendesk.com/hc/de/article_attachments/8088013281052). 5색 구성의 공식 텍스트를 확인했다. 페이지 스크린샷은 확보하지 못했다.
- **R-7W:** [공식 관리 Dized 규칙 — 불가사의 단계 건설](https://rules.dized.com/game/pmaODHsUS_65I0ac8XvnoQ/Vb8L5V6lR-qPb3Fh0J30lg/phase-2-build-a-stage-of-a-wonder). 뒤집은 단계 표시 카드의 정체·효과와 단계 완성의 의미를 구분했다. KeepBoard 사진의 판본·확장 예외까지 확인한 것은 아니다.
