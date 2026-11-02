# 빠른 스캔 구현 동결

승인 설계 `docs/scan-merge-design-20261029/fastest-{path,implementation-plan}.md`의 hosted local/cloud 경로를 구현했다. 모델·지시문·판독 출력 schema·게임팩·영상 선별은 변경하지 않았다. 실제 모델 호출·배포·커밋은 0회다.

- **A/B:** hosted scan은 최대 6개 선택 단위를 즉시 시작한다. 기존 local model/legacy의 2-job 정책은 유지한다. 안정 intent를 먼저 저장하고, 실행에서 고유 사진/부모 bytes를 병렬 취득하여 prepare와 판독에 재사용한다. prepared task와 단위 claim/result를 따로 보존하며 최종 accepted commit은 한 번이다.
- **C:** 서버 batch manifest가 evidence ID/부모를 먼저 고정한다. 독립 ticket과 PUT가 병렬이고, 성공한 부모-폐쇄 부분집합만 한 번의 Evidence 등록 CAS에 넣는다. 카메라는 촬영 중 전송하고 종료 시 등록하며, 갤러리는 준비한 집합의 ticket을 함께 발급한다. upload-ready를 아직 등록되지 않은 Evidence로 가장하지 않는다. 응답 유실 후 등록을 반복해도 ID가 늘지 않는다.
- **D:** 진행 조회는 이미 받은 단위 receipt를 다시 싣지 않는다. 먼저 나온 관측은 기존 사진 overlay로 표시하고 accepted 그림과 구별한다. hosted active 상태는 1초→60초 이후 3초, 최대 140회/5분 수명이며 hidden/terminal/오류에서 멈춘다. 진행 응답은 poller의 유효 generation accept 뒤에만 UI에 반영한다. 전체 SessionView 조회는 완료 때 한 번이며 기존 편집기의 dirty 초안 보호를 유지한다.
- **결합:** 원응답을 복제하고 unit/ref를 namespace한다. 기존 정상 anchor와 수동 non-null을 보호하며 속성 충돌은 별도 보존한다. 겹침 사슬/다대일은 ambiguity로 남기고, 구별되는 같은-root crop-only는 미배치로 보존한다. 새 inline 숫자와 실제 원판의 유일한 비충돌 대응만 표현을 정리한다. 완료 순서는 ID·값·연결을 바꾸지 않는다.

## 검증과 소유권

`handoff.json`에 **27파일(제품 18 + 테스트 9)**의 pre/post SHA, `implementation.patch` SHA, 산출물 SHA와 실제 명령을 기록했다. 기존 dirty 내용은 시작 사본을 기준으로 보존했다. 세 기존 테스트 파일은 원본에 새 테스트를 덧붙인 변경뿐이며, preimage를 원본 prefix로 복구한 사실을 baseline에 표시했다.

- 직접 무과금 단위 회귀 26/26, local/cloud HTTP 저장·재전달 회귀 8/8, 최종 cloud once/timing + batch/room HTTP 3/3 통과.
- 감독 최종 **전체 803/803**, `build:vercel`(타입 포함) **exit 0**. 해당 로그를 직접 읽었으며 전체 명령 실행 소유자는 감독이다. 중간 802검사의 구형 cloud 경로 테스트 실패는 새 실제 실행 경로로 갱신하고 once/receipt/timing 검증을 유지했다.
- 감독 cap2/cap5 보존 응답 재생: 조건별 120순열, anchor 28/28·49/49와 입력 불변 PASS. 이는 물리 정답률 또는 최종 행수의 정답 인증이 아니다.
- 브라우저: worker CUA surface는 불가(REPORTED). 감독은 native Chrome 390×844에서 부분 관측→최종 그림→무정정 저장→reload를 직접 확인했다(REPORTED). 저장 GET artifact의 scene/5 receipts와 snapshot 일치는 worker도 파일로 확인했다(VERIFIED). 실제 provider는 호출하지 않은 검수다.

## 한계와 남은 실행

단일 hosted scan step을 선택했다. source config의 300초와 reader timeout 180초는 확인했지만 실제 배포의 실효 duration/memory·공급자 quota는 미확인이다. 30초 종단 속도·새 실사진 정확도는 측정하지 않았다. 준비 시 원본이 없거나 형식이 잘못되면 provider 송신 전에 준비가 실패할 수 있다. status 네트워크 오류는 자동 조회를 멈추고 기존 명시 새로고침을 제공한다. started claim은 유료 재발행하지 않으며 5분 비활성 이후 인증된 상태 조회에서 중단으로 복구한다.

기존 4crop 시간 비교의 private 원본과 request4개는 현재 사라졌다. 대체 사진으로 바꾸지 않았다. 아래 **준비 전용** 명령은 `BLOCKED_FROZEN_INPUT_BYTES_MISSING`, exit 2, 모델 호출 0으로 정확하게 보고한다. 기존 SHA와 키 없는 manifest만 남긴다. 최신 cap2/cap5 보존 원응답 재생 근거와는 별개다.

```sh
node docs/scan-parallel-20261028/implementation/fastest/prepare-timing.mjs
```

제품 소유권을 반환한다. 이후 실제 호출·배포는 별도 승인 작업이다.
