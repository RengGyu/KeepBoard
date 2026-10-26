# 첨부 판독·표시 진단

**VERIFIED: 판독 세부 누락과 표시 계약 부족이 함께 있다.** screenshot2에는 시장 카드의 점수/보너스/비용이 label 문장으로 보인다(예:3점·흰색 보너스·초록3/빨강3/검정3). 그러나 같은 첨부1로 승인된 새1call은48.39초에 market12/noble3/tray26을 찾고도 **raw부터** 모든 세부 값이 빠진 종류·위치 label만 냈다. 정규화가 이번 정보를 지운 것이 아니다. 전량 quantity=null도 raw와 동일하다. 이전 응답 원문/사용자 Store는 열지 않았으므로 두 출력이 동일한 raw였다고 단정하지 않는다. `probe.json`; raw/normalized은0700 임시 폴더의0600파일에만 보존했다.

| 대상 | 직접 원본 | 새 raw→normalized | 해석 |
|---|---|---|---|
| 시장 | 12장, 점수/보너스/비용 표시 | 12→12, 세부0, quantity12개 null | 객체 검출은 됐으나 필요한 값은 누락 |
| 귀족 | 3장, 점수/요구 보너스 표시 | 3→3, 세부0 | 요구 보너스는 구매 비용과 분리 필요 |
| 미귀속 | 덱3+공급더미6+낱개토큰7+하단카드10 | 26→26, 하단 소유/예약 미확정 유지 | 이번26은 서로 다른 실물로 설명되며 중복이라고 줄이면 안 됨 |
| 원본 영역 | evidenceId 동일 | crop41개 범위형식은 통과 | 내용 정합은 보장 안 됨. 하단 시장 crop y끝.531(약577px)은 비용 하부를 자름. 오른쪽 하단 카드 crop y끝.831/.822도 카드 하부 비용을 제외함 |

원본의 읽을 수 있는 카드 값은 모델 호출 전에 `human-baseline.json`으로 고정했다. 새 raw에는 costs/bonus/points 등의 추가 key 자체가 없다. 그림은 `GenericPieceArt.tsx:8–11`의 중립 종류 그림이며 비용·보너스와 무관하다. `generic.ts:35–36`은 세부 값을 label에만 허용하고 variant=null/quantity=null 예시를 준다. `GameEssentials.tsx:42`는 각 후보 앞6개만 긴 label+‘수량 모름’으로 표시한다. 따라서12/26표시와6개 미리보기 차이는 누락 근거가 아니다.

**후보 누적 VERIFIED:** 실제 임시 API+mock 두번으로 같은 사진 market candidate1→2, accepted0을 재현했다(`accumulation.json`, exit0, 유료0). server/index의 analyze가 매번 push하고 UI가 전candidate를 열거한다. 한 normalize 응답에서 동일field중복은 보류0개지만, 서로 다른 전용field/tray에 같은crop를 넣으면2개를 통과한다. 다중 epoch/6장 초과 API batch도 별도 결과를 합친다. screenshot의 두market12가 정확히 어떤 요청에서 왔는지는 기존 raw/요청기록 없이 확정 못 한다.

‘계속 읽는다’는 보고는 세션 타이밍/카메라 상태를 열지 않아 원인 미확정. source상 카메라 스캔은 마치기 후1회 분석, in-flight/finished guard가 있고 실패 자동 재호출은 없다. 새 실제call은48.39초에 완료했다. 로컬 프레임 품질 검사와 유료 분석을 같은 것으로 보지 않는다.

최소 권고: optional Splendor structured observation(points/bonus/cost/requirements/color/level/kind), 기존 quantity는 실물수량만 유지. nullable5색map은 생략/못읽음을null, 확인된 부재만0. label/crop/ID 보존, typed우선·기존 명시 label은 보수적 읽기전용 fallback. 새 valid/nonempty 결과가 있는 같은field/owner/evidence집합의 이전candidate만 교체하고 accepted/다른사진/실패·무결과는 보존. 정확 source+crop+component 교차field중복만 전용field 우선 제외. 제품수정/배포 없이 A0진단을 마쳤고 후속A1카드로 이어간다.
