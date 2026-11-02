# 구현 인계용 최소 계약 — 제안, 실행 승인/완료 아님

> **감독 검토 정정 — 사용자 흐름:** 기본은 판독 결과를 기존 그림판에 자동 반영하고, 사용자가 필요할 때만 수정한 뒤 저장하는 흐름이다. 아래의 ‘후보·명시 반영·사용자 확인’ 표현을 모든 판독에 추가 확인 버튼이나 필수 정정 절차를 넣는 요구로 해석하지 않는다. 연결이 확실한 결과는 자동 반영하고, 불확실한 연결·값은 원사진 근거와 함께 미배치/충돌/?로 남겨 수정 없이도 저장할 수 있게 한다. 기존 사용자 정정값을 늦게 온 판독으로 덮지 않는다. 대상 지정·근접 재판독은 선택 기능이다. 내부 후보/출처 검증 계약과 사용자에게 강제하는 확인 단계는 구별한다.


현재 판독/저장 계약을 덮어쓰지 않는 선택 경로다. 한 구현자가 아래 공유 계약과 백엔드 경로를 소유하고, UI 담당자는 합의한 타입만 사용한다. 실제 작업 배정은 감독이 기존 세션에서 수행한다. 이 연구는 제품 편집권을 행사하지 않았다.

## 1. 작은 추가 데이터

기존 단일 이미지 `ObservationRequest/Receipt`를 유지하고 상위 묶음만 추가한다. 아래 이름은 제안이며 아직 구현되지 않았다.

```ts
type ScanPlan = {
  version: 'scan-observation-plan-v1';
  id: string;
  gameId: string; editionId: string; definitionSHA: string;
  scope: ObservationScope; // 같은 partition, owner, captureEpoch
  anchorEvidenceId: string;
  sameStaticStateConfirmed: boolean;
  units: Array<{
    id: string; evidenceId: string; sourceSHA: string;
    inputSHA: string; inputWidth: number; inputHeight: number;
    areaId: string; role: 'anchor' | 'crop' | 'detail';
    transformId: string | null; // crop에만 정확한 원본 역변환
    target: null | { assertionId: string; pieceId: string };
  }>;
};
type ObservationLink = {
  members: Array<{unitId: string; observationRef: string}>;
  targetPieceId: string | null;
  basis: 'same-source-overlap' | 'confirmed-frame' | 'user-target' | 'model-proposal';
  status: 'candidate' | 'user-confirmed' | 'conflict' | 'unlinked';
};
```

스캔의 동일 scope 안에서도 areaId는 다를 수 있다. 공용판과 공개 개인 영역을 여러 양식으로 읽으면 각 child는 해당 area의 필드만 사용한다. owner_private는 다른 묶음이다. 현재 epoch가 같아도 물체가 안 움직였다는 증거는 아니므로 기존 같은 상태 확인을 재사용한다.

`ScanBundleReceipt`에는 고정 계획·단위별 기존 receipt·성공/실패/잘림·관측 연결·속성 충돌을 보존한다. 요청마다 `item-1`이 다시 생기므로 모든 참조 키는 `(unitId, observationRef)`다. raw 관측은 불변이고 최종 출력 순서를 ID로 쓰지 않는다. 일부분 실패는 bundle 부분 완료로 남기되 실패한 child를 성공으로 검증시키지 않는다. 같은 job reload/재접속 때문에 다시 유료 요청하지 않는다.

입력 사진 수와 읽기 요청 수를 구분해 전송 전에 총 unit 수를 고정한다. 기존 최대 6장 선택과 서버 동시 실행 제한을 재사용하고, 각 job 안에서 또 무제한 병렬 요청을 만들지 않는다. 같은 scope·epoch·사진 bytes·task/모델 설정·대상 revision의 활성 job 재사용만 유지하며, 다른 상태를 유사하다는 이유로 캐시 재활용하는 시스템은 추가하지 않는다.

crop 변환은 `PhotoTransform`의 원본/입력 SHA·크기·행렬 원칙을 재사용하되 현재 atlas 전용 validator를 **명시적인 일반 crop 종류**로 좁게 확장한다. 다른 시점 사진에 `transformId`를 임의 부여하지 않는다. `panelRef`는 atlas에서만 사용하고, 슬롯 ROI를 실제 모델 box로 바꾸지 않는다.

## 2. 연결과 보충의 정확한 의미

- **같은 원본:** 교차 crop의 원본 box와 물리 층이 일치하는 일대일 후보만 연결한다. 수치 임계값은 기존 사진의 인접 실물/겹침 반례로 정하고 숨기지 않는다. 숫자·지형·도둑처럼 겹쳐도 별개인 층을 유지한다. 두 종류가 충돌하면 중복 삭제로 한쪽을 소거하지 않는다. 완전하게 보이는 crop을 표시 우선으로 삼을 수 있지만 그 값이 정답이라고 확정하지 않는다.
- **다른 시점:** 확인한 frame 대응 또는 사용자의 대상 선택이 필요하다. ‘이 영역 사진’은 범위일 뿐 개별 실물 대응이 아니다. 자동 후보끼리 비슷한 값·색으로 기존 실물에 붙이지 않는다. 여러 개가 대응할 때는 미연결로 남긴다. 처음에는 대상 실물 선택+근접 결과의 해당 관측 선택만 지원해도 된다.
- **기존 기록 보충:** `target`은 accepted 실물의 snapshot ID와 revision을 고정한다. 읽은 속성별 제안을 만들고 사용자가 반영한다. null은 기존 값 유지, 모순은 비교, 수동 정정은 자동 덮기 금지. accepted 전체와 새 raw 관측을 concat하지 않는다. 미관측 실물 삭제도 금지한다.
- **새 실물:** 기존 대상과 연결되지 않았다는 이유만으로 모두 새 부품으로 더하지 않는다. 새 부품 추가는 검토에서 선택한다. 사진상 위치만 있을 때는 원본 근처의 후보/미배치로 보존하고 canonical 슬롯은 별도다.
- **현재 연결 기능과 구별:** `componentLinking`은 실물을 저장 필드/플레이어 영역으로 옮기는 기능이다. 서로 다른 사진의 동일 실물에 속성을 보충하는 기능으로 간주하지 않는다. 새 기능은 이를 대신할 범용 조정 엔진이 아니라 대상이 지정된 속성 패치다.
- **참조 데이터:** 첫 단계에서는 기존 관측에 정적 값을 끼워 넣지 않는다. 후속 참조 제안은 `referenceId/assetSHA/edition/field/source`를 별도로 남기고 사용자 반영 시 기존 사용자 정정 경로를 쓴다. 자동 참조값 저장을 하려면 readout의 현재 basis로 충분한지 별도 결정한다. 120 sourceSHA를 표현상 이유로 바꾸지 않는다.

## 3. 적용 파일과 소유권 제안

| 담당 | 현재 파일·심볼 | 최소 변경 |
|---|---|---|
| UI: 기존 구현솔 | `src/SessionWorkspace.tsx`: `readStoredPhotos`, `finishCaptureRun`, `analyzeBatch`; `src/Capture.tsx`; `src/scanBatch.ts` | scoped 모드의 마지막 한 장 절단을 새 bundle 경로에서만 해제. 기준 사진/분석할 사진을 명시하고 기존 최대 6장 선별 유지. 미분석 원본 보관과 분석 결과를 구별. |
| 백엔드: 기존 구현솔2 | `server/hostedObservation.ts`: `prepareHostedObservation`, `analyzeHostedObservation`; `server/index.ts` job 준비·commit; `server/analysisJobs.ts` | 한 job에서 단위별 reader 실행. 전체 계획/definition/이미지/대상을 signature에 포함. scope/epoch/accepted revision 검사를 재사용. 제한 동시성·retry0, 부분 결과와 재접속 유지. 새 작업 시스템은 만들지 않음. |
| 공유·AI 소유자 1인: 감독이 기존 구현자에게 명시 배정 | `shared/lightweightRecognition.ts`; `shared/photoGeometry.ts`: `mapObservationRegion`, `geometryCandidates`; 제안 `shared/scanObservation.ts` | 기존 v1과 구별되는 bundle 타입, 일반 crop 출처 변환, child ref namespace, 일대일 연결/충돌의 순수 함수. 기존 frame의 평면/종류 한계 유지. |
| 같은 공유·AI 소유자 | `server/ai/geminiGameReader.ts`: `buildGeminiGameBody`, `decodeGeminiGameObservation`; `server/ai/observationAssembly.ts`: `assembleObservations`; `server/ai/catanSceneReading.ts` | 현재 endpoint·flat wire 재사용. 새 crop/detail 경로는 literal 판독, 현재 native Catan 한 장 경로 유지. assembly 전 연결을 정리하고 receipt→후보 관계 보존. 단일 이미지 validator를 무조건 느슨하게 하지 않음. |
| UI + 공유 계약 담당 순차 작업 | `src/catanObservationReviewModel.ts`: `catanReviewScene`; `src/SceneWorkspace.tsx`; `src/GameEssentials.tsx`; `server/observationReview.ts`; `shared/boardRecording.ts` | 기존 부품 보충과 새 부품 추가 구별. 기존 명시 반영·undo·저장/재열기·원본 전환 유지. 단순 필드 이동 UI를 동일 실물 병합으로 재사용하지 않음. |
| 후속 선택 자료 담당 | `game-photo-definitions/index.json`, `server/photoDefinitions.ts`를 읽고 별도 reference manifest 제안 | 현재 정의/과거 판본은 보존. 원본 정본과 별도의 선택 참조 버전. 표시용 아트 복사로 실물 참조를 만들지 않음. 첫 구현 필수 작업 아님. |

현재 `docs/work-sessions.md`의 공유/AI 소유권과 충돌하지 않도록 배정 후 한 사람만 수정한다. 격리 구현/검증 방식은 현재 팀 절차를 따른다. 이 문서에서 새 세션·모델·배포를 요구하지 않는다.

## 4. 실행 순서와 최소 수용 사례

1. **A — 한 장 계약 보존 + 묶음/보충:** 현재 한 장 Catan 그림과 generic typed 값을 유지한 채 실제 선택 사진을 job에 고정한다. 동일 실물 보충 한 건을 명시 반영하고 저장·재열기까지 연결한다. 무작정 다중 사진의 후보를 append하는 구현은 수용하지 않는다.
2. **B — 같은 원본 crop 연결:** 기존 네 crop 결과를 새 모델 호출 없이 좌표·namespace·중복 처리의 fixture로 사용한다. 원문·기존 평가를 수정하지 않고 ambiguity를 그대로 둔다. 기계 병합 결과를 기존 사후 눈대조 55와 강제로 맞추지 않는다.
3. **C — 실제 근접 사진 비교:** 아래 작은 실사진 비교로 보충이 촬영/정정 부담을 줄이는지 확인한다. 자동 feature registration과 영상 tracking은 이 단계의 선행조건이 아니다.
4. **D — 필요할 때 참조:** 도시/마을 등 같은 혼동이 남는 경우에 한해 별도로 확인한 소수 실물 예시를 넣어 비교한다. 현 사진 crop을 정답 참조로 재투입하거나 모든 카드 목록을 먼저 모으지 않는다.

작은 회귀 사례는 다음이면 충분하다. 제품 변경 파일에 맞는 기존 검사와 함께 수행하되 새로운 광범위 감사 체계는 만들지 않는다.

- crop 두 장의 같은 숫자토큰은 연결 후보 1개, 나란한 동일 숫자토큰 2개는 2개. 지형+숫자+도둑은 별개. 종류/값 충돌은 출처 둘 다 남는다.
- 요청별 `item-1` 충돌 없음. crop의 원본 좌표 round-trip과 모서리/회전/패딩 처리. 잘못된 모델 box는 성공 좌표로 꾸미지 않음.
- 실제 다른 사진에 정합 없이 동일 슬롯/동일 개체를 확정하지 않음. 사용자 지정 대상과 모순된 다중 관측은 보류.
- accepted 숫자 6에 보충 null이면 6 유지; 보충 9이면 충돌 제안; 사용자 수정 8 이후 늦은 job 도착이 9로 덮지 않음.
- 한 child 실패/잘림 뒤 다른 유효 결과 검토 가능, 재접속으로 child 자동 재호출 없음. 아직 읽지 않은 사진은 별도 표시.
- owner_private 관측의 public 합류 없음. Catan terrain+number와 Splendor 카드/비용/칩 수량 구별. 새 참조가 없어도 동작.
- 신규·기존 판본 저장을 열어 원본·typed null·배치·메모·실물 보존 정보가 유지됨. 새 후보가 기존 미관측 부품을 삭제하지 않음.

## 5. 최소 실사진 비교 제안 — 이번 실행 0

**우선 최대 6요청, 실패 포함·자동 retry0**을 제안한다. 현재 API·모델·thinking·해상도·출력 정책을 고정하고 다른 모델 비교를 섞지 않는다. 별도 실행 카드에서 실제 input/output 한도·예산을 고정해야 하며 이 문서는 호출 권한이 아니다.

- **자료:** 카탄 서로 다른 정지 상태 2개. 상태별 전체 사진 1장+같은 상태의 실제 근접 사진 1장. 알려진 사진만 재사용하면 개발 사례로 분리한다. 기존 사진 corpus가 동일 상태 다중 시점을 보장하는지는 UNKNOWN이므로 확인 못 하면 해당 비교를 실행하지 않는다. 임의로 다른 판을 한 스캔으로 만들지 않는다.
- **대상:** 한 상태는 건물/도로/숫자가 함께 있는 영역, 다른 상태는 해안/항구를 포함한 영역. 범위 선택을 값 GT와 무관하게 먼저 고정한다. 해당 범위의 모든 실제 물체와 읽히는 속성을 사전 주석으로 남기고 가림/판본 불명은 unknown. 숫자 원판의 box를 타일 중심점으로 대체하지 않는다.
- **상태당 3요청:** A 전체 사진 한 번, B A에서 잘라낸 고정 영역 한 번, C 같은 영역의 실제 근접 사진 한 번. 비교는 A, A+B, A+C이며 A 응답은 재사용한다. B/C는 같은 종류·visible 필드·wire·지시를 쓴다. 이는 crop 확대와 새 촬영 정보의 실용 차이를 비교하며 입력 토큰이 같다는 실험은 아니다. 기존 4크롭 벽시계와 직접 속도배수를 만들지 않는다.
- **분리 측정:** 실제 물체 누락/추가·종류·값, 원본 box, 중복/잘못 합침, 슬롯/관계, 저장·재열기를 따로 본다. 미상 GT는 값 정답 분모에서 제외하되 미상 수를 함께 적는다. 촬영·대상 선택/기준점·정정·저장에 걸린 실제 시간과 provider/전체 시간, 모든 토큰·추정요금/실청구 여부를 분리한다. 보정에 GT를 쓰지 않는다.
- **판단:** A+C가 새 관측을 유용하게 보충해도 전체 사용시간·잘못 합친 실물·추가 부담이 악화하면 자동 기본 경로로 승격하지 않는다. 반대로 몇 값이 모름이어도 간단 정정과 원본으로 충분히 저장/복원되면 불합격으로 몰지 않는다. 2상태는 경로 선택 증거이며 120게임 성능 인증이 아니다.
- **선택 후속:** 같은 종류 혼동이 남고 판본/권리가 확인된 실물 예시를 확보한 경우에만 C와 동일한 두 입력에 참조만 추가한 최대 2요청을 별도 제안한다. 이때도 모델·지시·나머지 조건을 유지하고 참조 토큰/잘못된 정체 확정을 측정한다. 이번 6요청과 자동으로 묶어 실행하지 않는다.

새 사진·참조가 없으면 A/B를 기존 자료로 준비하는 독립 작업은 가능하다. 미확보 자료를 생성 이미지·다른 판·oracle crop으로 대체하여 실스캔 검증이라 부르지 않는다.
