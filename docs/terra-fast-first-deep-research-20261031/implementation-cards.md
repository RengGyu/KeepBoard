# 기존 구현솔 인계 카드

본 문서는 구현 제안이다. 이번 연구에서 제품·기본 모델·계정·판독 호출은 변경하지 않았다. 기존 Sol1이 최소 수직 패키지를 소유하는 구성이 적합하다. Sol2의 보드 자산·`GameBoardRecord` 작업과 겹치지 않게 한다. 새 에이전트·새 큐·새 GPU 서비스가 필요하지 않다. 실제 작업 배정은 감독이 현재 소유권을 확인해 진행한다.

## 첫 패키지: 실제 OCR 증거와 1회 국소 보강을 연결하는 실험 모드

**사용자 효과:** 원사진의 읽힌 문자·숫자 위치를 빨리 확인하고, 의미가 불명인 영역만 Terra가 보완한다. 일부 입력에서 도움이 없는지까지 같은 자료로 비교한다. “첫 overlay”와 “첫 편집 가능 판”을 분리해 기록한다.

**범위:** 선택한 원본 한 장/한 owner·epoch·area에서 시작한다. Catan의 인쇄 숫자를 실제 대상으로 포함하고, 카드형 영역의 문자/숫자도 같은 evidence 표현으로 읽는다. 카탄 전체 물체 인식과 주사위 pip 판독을 OCR 기능으로 주장하지 않는다. 다른 게임·미지원 언어·로컬 실패는 기존 Terra 경로를 유지한다. 전용 자산이나 정답 수량을 만들지 않는다.

| 소유 파일/심볼 | 변경 계약 |
|---|---|
| 신규 `src/perception/ocrWorker.ts`, `ocrClient.ts` | 공식 PaddleOCR.js와 검증할 small det/rec 모델을 고정 버전으로 실제 로딩·실행. Worker 1개, 선택 원본만 처리. 초기화/예측 시간 분리. fallback은 기존 경로이며 성공하지 않은 빈 OCR을 정상 완료로 포장하지 않음. |
| 필요한 vendor adapter 또는 SDK patch | `OcrPipelineRunner.predict`에서 검출된 polygon과 빈 rec 결과도 노출. 공개 index가 det factory를 실행 함수로 내보내지 않으므로 현재 API만으로 가능하다고 가정하지 않음. 최소 노출 확장과 Apache 고지·원본 diff를 함께 보존. |
| 신규 `shared/perceptionEvidence.ts` | `sourceImageSHA/inputImageSHA`와 `definitionSourceSHA/definitionSHA`를 구분. polygon, proposal ID, text/unknown, model/asset/backend, scope/epoch, 수치 원점·단위·변환·실측 timing. 기존 Qwen local identity나 Terra wire로 위장하지 않음. |
| `src/Capture.tsx`, 필요한 `SessionWorkspace.tsx` 접점 | 원본 준비/업로드와 비차단으로 local 실행. 품질 샘플·thumbnail 대신 실제 원본 사용. 모든 영상 프레임 실행 금지. 페이지 전환 시 pending UI 작업만 정리하고 저장 원본은 유지. |
| `src/ScanObservationResults.tsx`, 기존 overlay | 문자영역과 기물영역을 구분해 표시. 빈 검출은 누락 근거로 남김. 기존 정정/저장 조작을 사용하고 추가 승인 양식을 만들지 않음. |
| `server/ai/observationAssembly.ts`, `shared/photoGeometry.ts` | 허용되는 관측만 기존 editable 형식으로 조립. 확실한 physical-unit 연결 없는 OCR text는 독립 기물로 만들지 않음. 확인된 frame이 없으면 원본 위치/미배치로 보존. |
| 신규 `server/refinementSelection.ts` | source/area 내 이유 기반 ROI 선택·중복 묶기·최대 예산. 기존 crop transform 재사용. expected count, 사진별 좌표·값 분기 금지. |
| `server/ai/terraGameReader.ts`, `shared/lightweightRecognition.ts` | 실험 task/reader profile을 명시. 국소 `region-refinement-v1`와 기존 whole-low를 구분. default low 불변. 보강 profile은 high를 기록하며 모델·effort·prompt/schema/input SHA를 고정. |
| `server/scanExecution.ts`, `server/scanObservation.ts`, `workflows/analyze.ts` | 기존 durable claim/index/source 매핑을 재사용. 같은 원본·동일 요청 hash의 중복 발행 없음. 자동 retry0. 전체6단위 예산 내에서 시험용 보강0–2개; 빈 검출 때문에 호출을 무한 추가하지 않음. |
| `server/observationFusion.ts`, `shared/scanObservation.ts` | 이미 알려진 값 충돌은 작은 ROI만으로 교체하지 않음. null 보완·중복 링크·수동 보호·퇴역 aggregate 보존. 새 OCR claim의 원문도 따로 보존. |

### 입력·출력 계약

```text
Local input:
  selected original bytes + source/input SHA + dimensions + owner/epoch/area/definition
  optional existing confirmed photo frame; no answer labels or expected quantities

Local output:
  text polygons including empty recognitions + raw text/alternatives/unknown
  engine/asset/backend identity + source transform + measured load/predict times
  object association may remain null; detector proposal ID is not physical piece ID

Refinement input:
  exact source crop + transform + allowed kinds/fields + proposal IDs + task reasons
  local text is alternative evidence, not a prescribed answer

Refinement output:
  exists yes/no/unknown; literal requested values; reject/split/new/group allowed
  same source lineage; new physical object boxes only when actually observed
  raw preserved; no fill from game inventory or legal-state rules
```

### 최소 수용 검사

1. 실제 브라우저에서 모델을 로딩해 적어도 한 원사진의 detector/recognizer 출력을 얻는다. 가짜 adapter·mock만으로 완료 처리하지 않는다. 아직 가중치 다운로드/실행 승인 범위를 받지 않았다면 구현자는 이를 별도 범위로 명시한다.
2. OCR에서 찾았으나 읽지 못한 polygon이 살아 있어야 한다. 0/6/9/빈 값, 회전문자, 여러 숫자를 가진 한 카드, 카드 위 말 등의 합성 contract 검사와 실제 사진 결과를 분리한다.
3. 원본·crop 좌표 round-trip, 동일 proposal 재전달, 순서 역전, source/owner/epoch 다름, undefined/null/0을 검사한다. OCR 글자 box를 카드 전체 box로 쓰지 않는다.
4. frozen 사그라다 AC/BC에서 정답을 아는 값을 주입하지 않고, crop 크기만으로 알려진 상충 값을 덮어쓰는 경로가 없어졌음을 검사한다. 이 정책 변경 자체를 숫자 정확도 개선이라고 주장하지 않는다.
5. local 실패/느린 cold load에서도 기존 스캔·Terra·저장·재개가 계속된다. 모든 입력을 local 완료 대기 뒤로 옮기지 않는다.
6. 실제 읽힌 후보가 기존 정정/저장/재열기에 남는다. 로컬 text-only 후보를 전체판 복원 성공으로 세지 않는다. scoped focused tests와 관련 저장 회귀를 수행하며 전체 테스트의 반복 실행을 새 선행 마일스톤으로 만들지 않는다.

**중단/범위 축소:** 호환폰에서 OCR runtime이 작동하지 않으면 기본 활성화하지 않는다. 검출 polygon을 보존하려면 거대한 fork가 필요한 경우 먼저 노출 범위만 검토한다. 낮은 인식 결과를 게임 룰로 채우거나 익숙한 사진별 threshold로 보정하지 않는다.

## 다음 단계: 먼저 온 의미 결과를 편집하고 늦은 보강은 비파괴로 반영

현재 `commitAnalysisTask`는 같은 job 반영을 한 번으로 취급하고, scan 전체 결과를 요구한다. 따라서 이 단계는 UI 문구 수정이나 SSE 옵션이 아니다.

**소유:** 같은 Sol1, `server/analysisTask.ts`, `server/scanExecution.ts`, job metadata 타입/저장소의 필요한 부분, `server/observationFusion.ts`, `src/ScanObservationResults.tsx`, `SessionWorkspace.tsx`. `GameBoardRecord`/보드 아트 수정은 제외한다.

**최소 계약:**

- 논리 scan generation에 `initialProjectionId`, 반영한 receipt ID 집합과 field projection digest를 추가한다. 기존 saved session에는 optional metadata로 호환한다.
- initial base 완료 시 기존 규칙대로 현재 편집 기록을 만든다. 이미지 일부만 온 경우 완료한 영역만 표시하고 최종 완료로 표기하지 않는다.
- 나중의 보강은 기존 whole object 배열을 통째로 교체하지 않고, 아직 반영하지 않은 receipt의 관측만 결합한다. 사용자 값·삭제·새 epoch·다른 owner는 우선한다. 자기 initial commit으로 올라간 revision과 외부 수동 변경을 구분한다.
- 외부 변경이 있으면 새로운 raw는 보존하고 해당 필드의 자동 반영만 보류한다. 전부 stale로 버리거나 유료 재발행하지 않는다. 기존 소유자/권한 검사를 약화하지 않는다.
- 저장은 pending 보강과 무관하게 가능하다. 불완전 상태·원사진·미배치 근거를 함께 재개한다. 사용자에게 일괄 정정 완료를 요구하지 않는다.

**검사:** base→edit→late-high, base→delete→late-high, 저장/reload 중 수신, high 먼저 도착, 같은 receipt 재전달, owner/epoch 변경, 초기 unit 실패·보강 성공, 충돌/unknown/0, legacy session을 실제 loopback 저장·재개로 확인한다. 첫 편집 시간을 측정한 뒤에만 그 개선을 보고한다.

## 이후 조건부 단계

1. **일반 물체 후보:** 실측에서 OCR 밖 물체의 누락이 지배적이면 공개 detector를 독립 비교한다. 라이선스·실제 CPU/browser/hosted 지원을 먼저 확인한다. 합법적인 게임별 참조가 없으면 이름만 등록해 정체성 매칭이 된다고 주장하지 않는다.
2. **whole 생략:** 새 사진에서 독립 candidate 회수/false-safe/정정 부담이 충분히 확인된 장면에만 opt-in으로 비교한다. unknown 비율만 낮다고 생략하지 않는다.
3. **다중 이미지:** current single-image compiler를 명시적으로 확장하고 imageIndex/transform/owner 계약을 보존한다. 요청 수만 줄었다고 더 빠르다고 판단하지 않는다.

개발 속도는 새 플랫폼 대신 기존 photo definition/transform/claim/receipt/fusion/editor를 재사용해 높인다. 이 개발 속도와 모델 추론 시간을 같은 지표로 보고하지 않는다.
