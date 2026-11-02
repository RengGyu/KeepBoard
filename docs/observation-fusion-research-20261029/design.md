# 최소 결합 계약과 구현 인계

상태: **RECOMMENDATION / 오프라인 연구 프로토타입만 실행**. 제품 수정 없음. 3개 저장된 실패 사례를 확인한 결과이며 일반 사진 정확도 인증이 아니다. [결과·대안 비교](README.md), [기계 결과](replay-results.json).

## 1. 먼저 구분할 네 가지

1. **관측:** 무엇을 어느 입력에서 읽었는가. 원문·unknown 이유·quantity·source/transform은 불변.
2. **물체 대응:** 어느 관측들이 동일 실물을 가리키는가. 값이나 색이 같다는 이유로 연결하지 않는다.
3. **값 선택:** 동일 물체의 각 필드에 무엇을 우선 표시할 것인가. identity가 맞아도 숫자·종류는 충돌할 수 있다.
4. **그림 위치:** source image 좌표와 게임판 slot/placement는 다르다. correspondence 성공을 canonical placement로 승격하지 않는다. 위치가 미확정이어도 개별 물체와 읽힌 값은 수정·저장 가능해야 한다.

이 네 단계를 하나의 `conflict` 전역 차단으로 처리하지 않는다.

## 2. 출처·실행의 기존 불변조건

- `scan.plan.id`, game/edition `definitionSHA`, partition/owner/epoch, area, sourceEvidenceId/sourceSHA, inputSHA, 요청과 transforms를 고정한다. `commitAnalysisTask`의 pinned receipt 검사와 `taskTarget`의 버전/CAS 검사는 유지한다.
- **알려진 같은 원본 crop:** 기존 `mapObservationRegion`으로 원본 bbox를 얻는다. 역변환은 등록된 sourceSHA/inputSHA에만 사용. crop에 신규 픽셀 정보가 생겼다고 주장하지 않는다.
- **다른 카메라 시점:** 같은 epoch/게임/색만으로 좌표계를 공유하지 않는다. 기존 명시 target·검증된 frame correspondence가 있을 때 그 범위만 사용할 수 있다. 그렇지 않으면 사진별 관측으로 남긴다. 이 예외가 같은 원본의 다른 정상 관측까지 막지는 않는다.
- 결과는 immutable unit claim ID로 dedup. 동일 unit 동일 payload의 재전달은 무효과, 다른 payload는 오류로 보존·보고하며 자동 재호출하지 않는다. 완료 순서가 아니라 plan unit index+ref 순으로 결합한다.
- 아직 안 온 unit은 빈 성공 응답이 아니다. 완료/실패/중단을 구분하고, 이 작업에서 기존 유료 요청/스케줄러 수를 바꾸지 않는다.

## 3. 개별 물체를 연결하는 가장 작은 규칙

첫 구현은 같은 원본·같은 영역·동일 소유 범위에 한정한다.

- **같은 unit 내 서로 다른 ref는 기본적으로 별도 관측이다.** 이웃 bbox의 작은 겹침은 중복 근거가 아니다. 동일 ref 재전달만 바로 제거한다. 동일 unit의 거의 같은 박스도 자동 합치지 말고 필요하면 해당 관측만 의심 표시한다.
- 교차 unit에서 동일 layer, 양쪽 quantity=1, 유효 원본 bbox를 가진 관측끼리만 개별 identity 후보가 된다. 이번 프로토타입은 **각 박스의 중심이 상대 박스 안에 있는 관계**를 사용했다. 이는 공간 휴리스틱이지 물체 동일성의 증명/확률이 아니다.
- 후보 연결 성분에 **unit당 최대1개**이고 **모든 쌍이 직접 대응**할 때만 identity를 묶는다. A↔B↔C만으로 A=C를 만들지 않는다. 한 crop 관측이 두 원물체와 경쟁하면 그 경쟁 부분만 보류하고, 나머지 독립 물체는 추가한다. 현 코드의 IoU0.75를 그냥 낮춰 전역 연결하는 방안은 채택하지 않는다.
- kind가 다른 별도 layer(판·타일·그 위 말)는 bbox가 겹쳐도 합치지 않는다. 기존 building layer의 settlement/city는 같은 실물의 종류 충돌 가능성으로 남기되 kind를 평균/추정하지 않는다. 첫 generic slice는 componentId가 같은 경우부터 적용해도 된다.
- 미대응 crop 개별물체는 **자기 unit의 이웃·다른 layer·집합 박스 때문에 차단하지 않는다.** 대응 가능한 다른 unit 개별물체와 경쟁하지 않을 때만 하나의 새 편집 항목으로 추가한다.
- 기존 anchor에 대응되면 기존 `scan-<hash(plan,unit,ref)>` ID를 유지한다. 새 crop 항목도 최초 plan identity에서 ID를 만들며 값·완료 순서·선택된 우세 속성이 바뀌어도 ID를 바꾸지 않는다. 다음 job에서 기존 ID 재사용은 보존된 provenance에 대한 유일한 대응이 있을 때만 한다.

실사진 재생에서 교차 연결37쌍의 양쪽이 모두 같은 고정 부분 참조 object에 대응했다. 그 범위에서 오연결0. 겹침/가림이 더 심한 독립 사진에서는 미검증이다. 이 조건 밖에 Hungarian/appearance matching을 즉시 추가하지 않는다.

## 4. 집합은 identity가 아니라 ‘부분 상세화’

명시 quantity>1인 같은 종류의 큰 관측과, 그 source 영역에 있는 다른 unit의 개별 관측을 분리한다. quantity=null이나 박스가 크다는 사실만으로 집합임을 확정하지 않는다.

- 관측한 개별 자식은 실제 편집 물체로 넣는다. 큰 집합 관측은 `refinement` 관계로 보존하며 활성 수량에 자식과 다시 합산하지 않는다.
- `refines-partially-not-identity`, 원집합 member, 자식 member 목록, `cropCoversAggregateBox`, `exhaustive:false`, `residualQuantity:null`만 필요하다. 자식 수를 원집합 수에 맞추거나 `16−21` 같은 잔량을 계산하지 않는다.
- crop이 전체 집합 박스를 덮어도 모델이 모두 읽었다는 보장은 없다. crop이 일부만 덮으면 보이지 않은 나머지는 더욱 미확정이다. 원집합의 읽힌 수량은 receipt에 그대로 남고 ‘원래 집합 관측, 상세화 일부’로 조회된다.
- 이 관계는 한 자식만 확인돼도 가능하다. 한 물체를 새로 읽었다고 기존 집합12+새1=13으로 만들지 않는다. 집합에 들어가는지 불확실하면 관계를 후보로 남기고 다른 확실한 개별 물체를 막지 않는다.
- 사용자가 수정한 집합의 quantity/구성은 자동 교체하지 않는다. 그 집합과 겹치는 새 자식만 비가산 관측으로 남긴다. 기존 흐름에서 사용자가 원할 때 수정할 수 있으며 새 필수 확인 단계는 없다.
- Cascadia의 큰16개 claim을 지운 것이 아니다. 21개 개별 물체를 편집 가능하게 하면서 **16이라는 옛 관측과 충돌 가능성도 보존**했다. 게임 재고나 시험 정답21은 알고리즘 입력이 아니다.

## 5. 속성은 필드별로 선택, 충돌은 계속 표시

| 조건 | 동작 |
|---|---|
| 사용자가 고침/수동 unknown/직전 AI 출력과 다름 | 현재 값을 보호. 충돌해도 자동 변경하지 않음 |
| 다른 source에서 null/unknown, 현재 값은 읽힘 | 현재 값 유지. 0/false를 unknown 취급하지 않음 |
| 한쪽만 읽힘 또는 값이 같음 | 읽힌 값을 채우거나 동일 근거를 연결. 다른 필드 충돌과 무관 |
| 정수·boolean·enum 값이 다름, 출처 우선 조건 충족 | 상세사진의 값을 **임시 선택**, 기존 AI 값과 양쪽 member 근거·충돌 표시 유지 |
| 문자/복합값 충돌 또는 우선 조건 없음 | 현재 표현 유지 + 대안 기록. 물체와 다른 읽힌 필드를 제거하지 않음 |

우선 조건은 **같은 원본의 완전한 object bbox를 포함하는 더 좁은 입력 FOV**, 원본 대비 입력 pixel density가 낮아지지 않음, 일대일 identity 대응, 유일한 우선 source다. 수치 confidence를 만들지 않는다. 동률은 기존 대표를 결정적으로 유지한다. ROI가 잘리거나 축소된 detail은 이 우선권을 얻지 않는다. 실제 provider 내부 resize/attention 효과는 UNKNOWN이다. 이는 새로운 시각 정답을 만드는 규칙이 아니라 관측값 간 표시 우선순위다.

최소형 정책은 기존 photo definition의 `PropertySpec.type`을 이용한다. 게임명·필드명·사진 정답으로 분기하지 않는다. `observedColor`의 자유서술을 임의 문자열 정규화하거나 `yellow`를 `gold`로 교정하지 않는다. 정규형 `dieColor`와 별개로 보존한다.

**수동 보호의 현재 공백:** `setReadoutValue`는 non-null 수동값을 `sources:'user'`로 남기지만 null로 지우면 source도 null이다. 또한 quantity/placement에는 같은 필드별 basis가 없다. 따라서 `accepted`라는 상태나 non-null만 보고 ‘수동/AI’를 결정하면 안 된다.

최소 내부 메타데이터로 마지막 projection의 **항목 ID+필드별 출력 digest**를 scan receipt에 보존한다. 다음 결합 전에 current값과 비교해 달라진 필드(명시 null·0 포함), 사라진 기존 ID, user basis를 보호한다. 비교 기록이 없는 구저장본은 known AI라고 단정하지 않고 해당 기존 항목을 보수적으로 유지한다. 같은 작업 도중의 편집은 기존 `taskTarget` CAS가 이미 막는다. 이 메타데이터는 API 모델 출력 schema나 게임팩 변경이 아니다.

## 6. 저장되는 최소 추가 근거

`ScanBundleReceipt`에 선택적 `fusion` 메타데이터를 추가하는 작은 계약이 필요하다. 기존 raw/model wire와 GenericPiece 포맷은 유지한다.

```text
fusion.version
fusion.decisions[]: pieceId, fieldPath, chosenMember|null,
                   basis(observed/focused-provisional/user-protected/unresolved),
                   alternativeMembers[], conflict
fusion.refinements[]: aggregateMember, childMembers[], exhaustive:false,
                      residualQuantity:null, cropCoversAggregateBox
fusion.projectionDigests[]: pieceId, fieldPath, digest
```

값 자체는 raw receipt 또는 편집 기록에 이미 있으므로 대안 JSON을 중복 복사하지 않는다. 원문 observation이 여러 개라는 사실과 실물 수를 분리한다. source 좌표는 변경하지 않고, `componentRefs`는 진짜 개별 identity 대상에만 연결한다. 집합 하나를 자식 하나에 억지 연결하지 않는다.

이 정보 없이 ‘기존 값을 자동 갱신하고 동시에 왜 바뀌었는지/무엇이 수동인지 보존’하는 것은 현 계약상 부족하다. **필수 추가는 이 선택적 내부 메타데이터뿐**이며 새로운 reconciliation 서비스나 필수 승인 화면은 필요 없다.

## 7. 최소 구현 범위·순서

기존 Sol 한 명이 공유/서버 결합 코드를 소유하고, UI 문구·대안 표시는 같은 패치 또는 별도 disjoint 소유자로 나눈다. 이번 연구에서는 어느 제품 파일도 수정하지 않았다.

| 순서 | 파일·함수 | 변경·수용 근거 |
|---|---|---|
| 1. 구조 회수 | `shared/scanObservation.ts`의 identity/possible relations; `server/scanObservation.ts::projectScanResults` | 같은-unit overlap을 crop 차단에서 제외, identity와 refinement 분리, 알려진 source의 미대응 개별 항목 추가. 3사례에서18→39/0→25 대응 재현, 정상 anchor/ID 보존 |
| 2. 값 선택·보호 | 위 projector/`mergeScanFacts`; 선택적 `ScanBundleReceipt.fusion` | 필드별 결합, typed source 우선, 대안·출력 digest, manual null·삭제·quantity·placement 보호. 저장된19눈값 중15일치 재현하되4불일치 유지 |
| 3. 현재 UI 연결 | `src/ScanObservationResults.tsx`; 기존 `GameDetailReadout`/구성물 편집 소비 경로 | 집합을 물체 수에 중복 합산하지 않는 설명, ‘부분사진 값 임시 선택/다르게 읽음’ 표시. 필수 확인 버튼 추가 없음. 기존 ‘연결이 확실’이라는 과도한 단정은 피함 |
| 그대로 유지 | `server/ai/observationAssembly.ts`, provider/prompt/팩, `server/analysisTask.ts::taskTarget`/commit | 원문→typed 조립은 이미 값을 가지고 있었음. 모델 재호출·새 분류·새 owner 추정은 필요 없음. final commit/CAS/한 번 반영 유지 |

첫 구조 변경을 위해 전120게임 실험이나 새 tracking 모델을 선행시키지 않는다. 값 자동 재선택은 보호·대안 근거와 같이 묶어야 하며, 메타데이터가 아직 준비되지 않았다면 구조 회수만 먼저 연결하는 것이 현실적 대안이다.

## 8. 좁은 수용 검사와 미검증

연구 실행 `node --import tsx docs/observation-fusion-research-20261029/replay.mts`는 아래 실제·합성 검사를 분리한다. 모델 송신 함수를 호출하지 않고 fetch를 금지한다.

- 실제 저장 native6개 SHA/decoder/receipt 일치; 현재 projector vs 저장 value 일치. 실제 변환과 crop 좌표 일치. 입력/GT 불변.
- 동일 결과 집합의 순서 역전·동일 unit 재전달·JSON 왕복에서 동일 IDs/records/선택근거. 변경된 unit 재전달은 거절.
- 3개의 현 typed record 검증 통과. 실제 대응을 GT와 독립적으로 구성한 뒤, 평가 단계에서만 frozen 부분 refs와 매칭. 기준표 밖13항목은 정확도 분모에 넣지 않음.
- synthetic: 이웃 두 같은 색 토큰의 살짝 겹친 박스, 같은 물체 두 view, A-B-C 전이, 동일 unit의 경쟁 후보, 상보값/null/0, 속성 충돌, AI 수치 갱신, user값/unknown, 집합 전체·부분·단일 자식·수동 집합, 미등록 source, 빈/누락 source를 검사.
- 통합 시 추가할 좁은 검사: 실제 session 저장→reload에서 fusion 근거 유지, 수정된 accepted값/수동 quantity/placement/삭제를 늦은 결과가 되살리거나 덮지 않음, root receipt/source가 다른 owner/epoch에 연결되지 않음, old record에 메타데이터 없어도 열림. **이 HTTP/UI 검사는 연구 단계에서 실행하지 않았다.**

### 남는 실패 조건

이 방식도 잘못된 bbox·quantity1로 표시된 집합·잘못된 componentId·작은 인쇄값 오독을 고칠 수 없다. Sagrada4눈값, Cascadia 타일 속성의 실제 정확도, Splendor Duel 색 용어3개는 자동 보정하지 않는다. source가 다른 실제 근접/각도 사진의 registration과 높은 물체의 시차, 수동 정정 시간 절감은 UNKNOWN이다. ROI 선택과 이 3사례의 오류를 알고 설계했으므로 독립 holdout 성능으로 부르지 않는다.

다음 데이터가 이미 있다면 동일상태의 **다른 원본2쌍**(조밀한 동일 외형 물체1, 가림/부분 집합1)을 사전 표본 주석 후 동일 정책으로 한 번 재생하면 된다. 없으면 자동값 재선택의 일반화는 보류로 명시한다. 새 유료 판독이나 전게임 수집을 이번 결합 구조 개선의 필수 조건으로 요청하지 않는다.
