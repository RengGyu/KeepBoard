# 실사진 후속 판정: 짧은 native 판독 실험 보류

2026-10-29 · 연구아스트라 독립 해석 · 제품 변경/추가 호출/배포 0회

**FAILED — 이번 짧은 prompt + 선택 필드 schema 패키지는 실사진 수용 조건을 충족하지 못했다. 후보를 승격하지 않고, 이번 릴리스에는 검증된 기존 긴 native prompt/schema를 유지한다.** 21.340초는 불완전한 응답이 빨리 끝난 기록이며 목표 품질을 유지한30초 달성으로 보고할 수 없다. 이전 [설계](design.md)의 구현 제안은 이 실사진 판정으로 보류한다.

## 직접 확인한 증거

| 같은 source SHA, 각1회/retry0 | 기존 운영 | 후보 |
|---|---:|---:|
| provider 구간 | 45.034초 | 9.890초 |
| 기록된 전체 | 58.333초 | 21.340초 |
| 화면 구성물 | 49 | 8 |
| 지형/숫자/도둑 | 19/17/1 | 4/3/1 |
| 정착지/도로 | 8/4 | 0/0 |
| 저장·재열기·원본 bytes 보존 | 성공 | 성공 |

**VERIFIED:** [live-baseline.json](../../release-next-20261029/live-baseline.json), [live-candidate.json](../../release-next-20261029/live-candidate.json)에 같은 원본 SHA와 위 값이 기록돼 있다. `syntheticRecord=true`는 별도 시험 세션이라는 뜻이며 사진 API의 실제 호출 결과다. 이번 연구자가 호출을 재실행한 것은 아니다.

**VERIFIED:** [candidate-output-diagnosis.json](../../release-next-20261029/candidate-output-diagnosis.json)의 provider 원문 `hostedWire` 자체가 지형4/숫자3/도둑1, 총8개다. literal observations=8, 표시=8, 링크8개 모두 member1·conflict 없음이다. **이번49→8 차이를 downstream 정규화·연결·저장 과정에서 행을 잃은 문제로 설명할 근거가 없다.**

원문은 지형4개만 내면서 `field=board.layout`, `coverage=full`도 주장했다. 이는 기존 전체판 조건과 맞지 않는다. 구조화 JSON과 저장 성공이 내용 완전성을 보장하지 않는 직접 사례다. 두 live 파일의 `status=PASS`는 기록된 실행·저장 보존 검사에만 해당하며, 인식 수용 판정을 뜻하지 않는다.

**UNKNOWN:** 기존49개가 모두 정확한 GT인지, 각 프롬프트의 반복 결과 분포, 짧은 prompt와 optional schema 중 어느 변경이 얼마나 기여했는지는 확인되지 않았다. 두 요소를 함께 바꿨고 조건별1회다. 운영 `fetch`와 후보 `vercel-curl` 전송·배포 환경도 달라 시간차 전체를 prompt의 독립 효과로 단정할 수 없다. 이 한계는 현재 후보를 승격할 근거를 만들어 주지 않는다.

## 이번에 분리해 유지할 수정

**RECOMMENDATION:** prompt/schema 실험을 제외하고 아래 기존 수정은 별도 패키지로 유지할 수 있다. 표의 통과 수는 해당 저장된 검증 기록을 확인한 것이며 이번 연구자가 다시 실행한 수가 아니다. 최종 조합의 빌드/회귀 확인은 감독의 기존 릴리스 절차에서 마무리한다.

| 유지할 변경 | 파일/확인 근거 | 이번 실패와의 관계 |
|---|---|---|
| 스캔 최대2개 병렬 실행, 원 index 유지, 전체 wave join | `server/scanObservation.ts`, `workflows/analyze.ts`; [이전 완료 기록](../../scan-parallel-20261028/implementation/completion.json) 집중21개 | 사진 내용·native prompt를 바꾸지 않는다. 단일 사진의 검출 누락을 고치는 변경이라고 주장하지 않는다. |
| scan unit의 기존 provider timing 전달 | `server/cloudRuntime.ts`; 위 집중 검사와 현재 코드 | 계측 누락 보정이다. 합산 providerMs를 병렬 wall time으로 해석하지 않는다. |
| 명시 quantity:null 보존 | `shared/scene.ts`, `tests/scene.test.ts`; [native 검사 기록](../sol2/verification.json) null/0 및 legacy 호환 | undefined일 때만 count/default를 사용한다. 인식 최적화 없이도 필요한 보존 결함 수정이다. |
| 선택한 frame source를 먼저 검증·고정 | `server/scanObservation.ts`; [local-regression-verification.json](../sol2/local-regression-verification.json)18개 | 부적합/비공개/다른 source frame이 다른 사진 처리에서 사라져 검증을 건너뛰던 회귀 수정이다. |
| 실패·중단 unit의 원사진 열람 | `src/ScanObservationResults.tsx`; [구현솔1 기록](../../release-next-20261029/sol1/README.md)12개·타입검사 | 성공 receipt가 없어도 저장 원본을 볼 수 있게 한다. 읽은 구성물 수를 줄이지 않는다. |

자동 반영과 저장된 구후보 호환을 나눈 [테스트 정리](../../release-next-20261029/sol1/legacy-reconciliation.md)14개는 회귀 근거로 유지한다. 테스트 정리 자체를 새로운 제품 성능 개선으로 표시하지 않는다.

## 제한된 실행 결론

- **NO_GO:** 현재 짧은 prompt/optional schema가 활성인 후보의 운영 승격.
- **RECOMMENDATION:** 이번 릴리스 입력에서 `catanScenePrompt`와 `catanSceneResponseSchema`를 확인된 기존 운영 버전으로 복원한다. 축약 설계/소스는 실패 실험 근거로 보관할 수 있으나 기본 판독에 활성화하지 않는다. 기존 공개 scene·receipt·원본 보존 계약을 유지한다.
- sparse decoder 호환/원문 clone 처리가 남더라도 그것을 검출·속도 개선이라고 주장하지 않는다. 기존 full wire를 받는 경로에 영향을 주지 않는지는 관련 기존 회귀로 확인한다.
- **UNKNOWN 유지:** 정확도 개선·정상 품질의30초 달성. 전체 GT도 반복 측정도 없는 상태에서 누락률·재현율 또는 보편적 속도배수를 만들지 않는다.
- 추가 유료 호출·새 모델·새 연구 단계는 이 패키지에 제안하지 않는다. 이미 완료된 두 호출로 이번 채택 여부를 결정하고, 독립적인 보존·병렬·원사진 수정의 릴리스를 막지 않는다.

핵심은 출력 토큰이 줄어든 이유를 구분하는 것이다. 이번에는 작은 말뿐 아니라 지형·숫자도 모델 원문에서 대량으로 빠졌다. 불완전한 읽기를 빠른 완성으로 인정할 수 없다.
