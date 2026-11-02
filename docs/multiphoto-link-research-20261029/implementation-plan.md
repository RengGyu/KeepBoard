# 구현 인계: 읽힌 관측을 잃지 않는 작은 연결 단계

설계 기준 2026-10-29. 이 문서는 권고이며 제품 변경은 하지 않았다. 기존 빠른 6사진 실행·판독 내용·자동 기록/수동 정정·저장 흐름을 유지한다. 기존 데이터의 숨은 소유자/턴 상태를 추정하지 않는다.

## P0 — 같은 원본 누락 보충과 애매한 겹침

**단일 제품 소유자 권고.** 새 스케줄러/LLM/게임팩 이관 없이 아래 모듈만 바꾼다. 실제 배정은 감독이 한다.

| 파일/현재 함수 | 최소 변경 |
|---|---|
| [shared/scanObservation.ts](../../shared/scanObservation.ts) `linkScanObservations`, `ScanBundleReceipt` | 강한 연결과 가능한 겹침을 분리한다. 기존 link는 물체 대응 후보로 유지하고 optional `unresolvedGroups`만 추가. 원본/영역/owner/epoch가 다르면 겹침 후보도 만들지 않는다. IoS는 설명 가능한 후보 지표로 추가할 수 있으나 자동 확정 임계값 변경은 하지 않는다 |
| [server/scanObservation.ts](../../server/scanObservation.ts) `projectScanResults` | crop-only `overlaps>0`로 그냥 제외하는 대신 그룹에 연결. 정상 anchor/기존 수동 실물을 유지. baseline이 있다는 이유만으로 신규 관측을 잃지 않게 하고, 진짜 미일치면 미해결 그룹으로 남긴다. 입력 ref와 목표 물체 연결은 분리 |
| [src/ScanObservationResults.tsx](../../src/ScanObservationResults.tsx), [src/SceneWorkspace.tsx](../../src/SceneWorkspace.tsx) | 기존 그림과 가까운 위치에 미해결 관측 묶음·읽힌 값·원사진 영역을 재사용 표시. 물리 수량에 합산하지 않음. 원본 overlay는 `PhotoObservationOverlay` 재사용. 확인 단계나 필수 질문을 추가하지 않음 |
| [server/analysisTask.ts](../../server/analysisTask.ts) `commitAnalysisTask` 및 저장 소비자 | 새 optional 파생 정보가 receipts와 함께 저장/재열기되는지 집중 확인. 기존 scope/revision/CAS/멱등 commit을 약화하지 않음. 정상 경로는 변경하지 않아도 됨 |

### 제안하는 최소 파생 계약

provider 요청/응답 schema와 `ObservationResult`는 그대로 둔다. 다음은 저장 파생 metadata의 optional 확장이며 기존 저장은 `[]`로 해석한다.

```ts
// ScanBundleReceipt에 추가 제안. 물체 목록이 아니라 관측 간 미해결 관계다.
unresolvedGroups?: {
  id: string; // planId + sorted member refs + reason의 안정 hash
  reason: 'possible-same-object' | 'unregistered-view' | 'missing-source-box';
  members: ScanMember[];
  relatedPieceIds: string[]; // 기존 실물이 있으면 연결 후보. 확정된 componentRefs가 아님
}[];
```

- 같은 단위/ref는 한 번 처리한다. 재전달 receipt만 멱등 처리하며 서로 다른 판독 호출 결과를 “동일 JSON”이라는 이유로 지우지 않는다.
- 그룹은 연결 후보의 연결요소를 시각적으로 묶을 수 있지만 **동일 물체의 동치관계로 쓰지 않는다**. A-B/B-C만 겹칠 때 1개 실물로 만들지 않는다. 두 별개 물체가 한 그룹에 들어가도 관측·값은 각 member에 남는다.
- 원문이 변형되지 않도록 그룹에는 ref만 둔다. 종류/값/박스는 해당 receipt에서 읽는다. 수량은 미확정이며 관측 2건을 물체 2개로 세지 않는다.
- 원본 영역을 가진 경쟁 없는 crop-only는 미배치 편집 구성물로 만든다. bbox가 없거나 기존 구성물과의 동일성이 애매하면 그룹으로 남긴다. 전체 anchor가 읽기 실패해도 같은 root의 crop은 위 규칙대로 보존한다.
- 기존 componentRefs는 **확정한 편집 객체 대응만** 기록한다. 미해결 ref를 엉뚱한 대표 실물에 연결해 저장 검사를 통과시키지 않는다.
- 강한 동일성의 물체는 속성별 보충만 한다. 알려진 수동값, owner, 위치를 자동 교체하지 않는다. 충돌한 속성은 원문에 양쪽 값이 남고 정상 속성·anchor는 살아 있어야 한다.
- `unresolvedGroups`가 없는 과거 receipt도 기존 미연결 link에서 표시 가능하다. 과거 저장 데이터를 전량 재생성하거나 packVersion을 바꾸지 않는다.

## P1 — 코드가 할 수 있는 배치와 필요한 추가 근거

수정 후보: [shared/photoGeometry.ts](../../shared/photoGeometry.ts) `mapObservationRegion/geometryCandidates`, [shared/scene.ts](../../shared/scene.ts) `COASTAL_EDGES/coastalEdge`, [shared/lightweightRecognition.ts](../../shared/lightweightRecognition.ts) 파생 기하 타입. `harborPoint`는 렌더 용도로 유지한다. 필요시 단일 `shared/boardRegistration.ts`에 순수 기하를 분리하되 별도 서비스로 만들지 않는다.

1. crop→원본 변환을 그대로 보존한다. 다른 시점 homography가 생기면 bbox를 바로 축 정렬 상자로 덮지 않고 변환된 사각형과 원 bbox를 함께 사용한다. 이는 정확한 물체 윤곽/분할 mask가 아니다.
2. 기존 사용자 frame은 그대로 사용한다. 자동 frame을 지원할 때만 optional 파생 `registration`을 추가한다: `id/sourceSHA/topologyId/definitionSHA/method/state/matrix/landmarkRefs/validRegion/residualUnit/residualSummary/referenceId?`. `method`는 user-frame/image-match/model-centres를 구별한다. 모델 중심의 임시 fit은 proposed 상태이며 `confirmedByUser`를 만들지 않는다.
3. 평면 기준점으로 구한 정합과 항구 **인쇄 접점**을 연결한다. 항구 symbol bbox의 중심만으로 edge를 확정하는 빠른 지름길은 넣지 않는다. 부두 끝점이 정확히 두 topology vertex에 대응하거나, 확인된 판본/프레임 조각의 유일한 인쇄 anchor가 edge를 지지할 때 후보를 하나로 좁힌다. 위치 제안과 자동 확정 조건은 별도로 둔다.
4. 현재 사진만을 위한 정합 점을 제품 상수로 넣지 않는다. 독립적으로 검증할 실물 landmark/판본 참조가 아직 없으므로 우선 existing frame 입력+합성 정합 검사로 함수 경계를 구현할 수 있다. 실제 자동 배치 효과는 이 자료가 생기기 전 UNKNOWN이다. 사용자에게 기준점 선택을 필수로 요구하지 않는다.
5. terrain.number/독립 원판은 raw 수정 없이 관계로 표현한다. 현재 단일 숫자 표시 소비자를 재사용하되 위치 관계가 확인된 경우에만 대표 원판을 정한다. 숫자가 같다는 이유로 identity를 생성하지 않으며, 상충 숫자를 조용히 지우지 않는다. 수동값 보호를 유지한다.

**사전 자료 담당 범위:** 기본판 topology는 이미 있으므로 재작성하지 않는다. 추가 참조가 필요하면 소수의 확인된 판본/인쇄 프레임 조각에 `edition/assetSHA/license/source/landmark/port attachment pairs/assembly-variable`만 넣는다. 실물 아트의 배포 권리가 없으면 제품 번들에 넣지 않고 일반 topology와 선택적 사용자 사진 대응으로 남긴다. 사진의 현재 게임 상태나 특정 항구 정답을 참조 사전에 저장하지 않는다.

## P2 — 다른 시점은 별도 단계

추가 촬영 사진과 원본의 국소 특징을 맞춰 평면 homography를 추정한다. 먼저 기존 OpenCV 방식의 작은 오프라인 구현을 검토하고, 실제 부족이 보일 때만 LightGlue 같은 학습 matcher를 선택한다. 이번에는 설치/실행하지 않았다. source SHA, 동일 정지 상태, 공개성, owner, epoch, 게임/판본과 검증된 대응의 유효 범위가 맞을 때만 매칭 근거를 쓴다.

반복 타일·대칭 방향·부품 이동·다른 턴·입체 말의 시차는 검증 실패/미연결 사유다. 인쇄판 정합 성공을 모든 말의 동일성으로 전파하지 않는다. 실패한 사진도 독립 관측 묶음으로 남기고 추가 유료 호출을 발행하지 않는다. 데이터가 없는 상태에서 120게임 정합을 완성했다고 보고하지 않는다.

## 오프라인 수용 검사 — 다음 구현자가 실행

현재 진단이 실행한 것은 원문 재집계, 현 linker 역순 비교, 모델 중심 fit이다. 아래는 **아직 실행하지 않은 개선판 수용 조건**이다.

| 검사 | 기대 결과 |
|---|---|
| 현재 저장 응답 그대로 재생 | anchor 항구 0이어도 crop 8관측의 raw/ref가 모두 남음. 기존 6 후보 유지, 빠진 두 관측은 하나의 미해결 묶음으로 노출. 물리 총수 7/8로 확정 금지 |
| 중간 IoU/큰 IoS와 인접 동일 무늬 | 상자 크기 차이는 후보 관계로 남음. 같은 종류/ratio만 같은 이웃 항구·카드·말을 합치지 않음. NMS처럼 낮은 점수 관측 삭제 금지 |
| 강한 두 관측/전이 A-B-C/한 단위 복수 검출 | 유일한 강한 대응만 한 편집 객체. 전이적 겹침·경쟁 후보는 그룹. 일부 충돌로 정상 anchor 소실 0 |
| crop-only/anchor 실패/기존 baseline | 경쟁 없는 신규 관측은 편집 후보 보존. 서로 다른 source/상태를 합치지 않으며 기존 수동 기록은 유지. baseline의 존재만으로 누락시키지 않음 |
| 순서·부분 도착·재전달 | 고정된 5개 단위 결과의 120순열에서 의미상 동일한 최종 물체/그룹/속성/ref. 단위 중복 전송에도 수량 증가 없음. random assertion ID/시각 필드는 비교에서 제외 |
| 속성 충돌/null/0/수동 | identity와 속성 합의를 분리. 알려진 수동값 유지, 0 보존, null 자동 0 변환 금지. 새 수동수정 후 늦은 결과는 기존 CAS/stale 처리를 따름 |
| 사진→보드 기하 | 합성 동일 원본 crop 역변환, 회전·원근·퇴화 4점·이상점·대칭 대안/경계 밖. 해안 연결이 유일하지 않으면 강제 edge 없음. harborPoint 렌더 간격 사용 금지 |
| terrain.number와 원판 | 하나의 원판이 확인되면 그림에서 중복 생성/중복 계산 없음. 값이 다르거나 관계 불명이면 대안 보존. 수동 terrain 값을 지우지 않음 |
| 다른 원본/진행 상태/owner/epoch/edition | 숫자/색/배경이 같아도 직접 identity 생성 0. 같은 SHA라도 다른 owner scope를 넘지 않음. 같은 평면 매칭만으로 다른 진행 상태 결합 0 |
| 저장·재열기 | 구성물, 원문 hash, transforms, ref, 미해결 그룹, 관계·수동값 보존. 기존 저장의 optional field 누락도 정상 열림. 필수 정정/확인 단계 없음 |

테스트 위치는 기존 `tests/scan-observation.test.ts`, `tests/scan-recognition-integration.test.ts`, `tests/scan-observation-results-ui.test.ts`와 기하 테스트에 추가하면 충분하다. 새 대형 평가 틀은 필요 없다. 실제 원사진은 공개 fixture에 복사하지 않고 private 경로에서 재생하며, 합성 테스트에는 일반적인 상자/기하만 쓴다.

## 최소 다음 검증과 완료 보고

P0는 기존 고정 응답 재생만으로 먼저 끝낸다. 실모델 호출 0으로 누락 보존·중복 방지·순서·저장을 확인할 수 있다. P1의 실제 자동 배치를 판단하려면 현재 사진의 **독립적인 평면 landmark·부두 끝점 대응** 또는 정확한 판본 참조가 필요하다. 이를 모델 입력으로 넣지 않고 평가용으로 고정해, `기존 모델 bbox 중심 제안`과 `검증된 정합+접점`의 차이를 비교한다. 한 사진의 fit 성공과 다른 판 일반화를 분리한다. 같은 정지판의 다른 시점 사진은 현재 fixture에 없으므로 P2 검증은 자료 확보 전 UNKNOWN으로 남긴다.

완료 보고는 (1) 반환한 관측 수와 실제 연결한 물체 수, (2) 미배치/미해결 그룹 수, (3) 저장 보존, (4) 원본/보드 위치 정확성의 검증 범위를 분리한다. 원본 그림을 보며 정정한 시간은 직접 측정 전 수치화하지 않는다. 추가 토큰은 P0/P1 코드 경로에서 0이지만, 기하 CPU·기기 메모리·실물 복원 개선 시간은 미측정이다.
