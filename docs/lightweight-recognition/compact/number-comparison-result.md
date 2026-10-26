# N1/N2 실제 제품 경로 비교 — 2회 종료

**VERIFIED:** 같은 독립 사진·고정 프레임으로 원본1회와 Atlas1회를 순차 실행했다. 실제 모델 요청 **2/2**, 재시도0, 유료 API0, 둘 다 `finish_reason=stop`이다. 추가 튜닝·세 번째 요청은 없다.

| 조건 | 정답/18 | 오독 | null | 누락 | 모호 | 미대응 extra | panel 보류 | reader | 전체 job 벽시간 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| N1 원본 | 16 | 1 | 0 | 1 | 0 | 1 | 0 | 57.54초 | 58.49초 |
| N2 고정 Atlas | 16 | 2 | 0 | 0 | 0 | 0 | 0 | 57.70초 | 58.71초 |

숫자 값으로 재매칭하지 않고 원본 GT 중심의 strict reciprocal containment로 대응했다. N1의 미대응 extra1은 독립 눈검토 전에는 확정 false-positive로 부르지 않는다. 두 조건 모두 **raw18 → 정규화18 → 실제 후보18**, 숫자 값·물리 수량1의 변환 유실0이다. 사용자 검토 전 후보는 미배치이며, frame의 canonical 위치 제안은 별도 후보다. 이 표는 실제 hex 배치 정확도를 보증하지 않는다.

**해석:** 이 사진에서는 정답 수가 같고 reader/job 시간도 비슷했다. Atlas는 미대응/누락이 줄었지만 숫자 오독2개가 남았다. 한 쌍의 결과로 정확도·안정 속도 개선을 확정하거나 기본 입력을 전환하지 않는다. 다른 사진의 D2 17/18과 직접 우열을 비교하지 않는다.

## 시간·사용량

- N1: 준비27.55ms, 큐3ms, runtime prompt17.678초 / decode39.405초, prompt1211 / completion698 tokens, cache0.
- N2: 준비278.15ms, 큐0ms, runtime prompt10.023초 / decode47.368초, prompt1231 / completion818 tokens, cache0.
- job 벽시간에는 폴링이 포함된다. assembly만의 시간은 별도 계측하지 않아 UNKNOWN이다. 독립 UI 정정·명시 반영·저장·재열기 시간은 **PENDING**이며 모델 시간과 합치지 않았다.
- 사전 frame 확인58.773초는 도구·조율이 섞인 wall time이며 실제 손 조작 시간은 UNKNOWN이다. 모델 로드·사진 업로드·UI 정정을 포함한 전체 사용자 완료시간은 아직 미완료다.
- 클라우드 모델 청구0. 기기·전력 비용, 전체 Metal 메모리, 실제 image token은 UNKNOWN이다. image-min1024 실행 설정을 확인한 것과 실제 image token을 측정한 것은 구분한다.

## 원본·결과 보존과 UI 인계

고정 source08942c… / GT9ef0… / frame478d… / Atlas600cba… / 19panels·1008×808. 전체18/unique panel 포함18이다. 원GT·frame은 변하지 않았다. 새 증거 ID에 대한 frame.sourceEvidenceId 재결합만 기록했다.

[실행 결과·timings/usage](number-comparison-result.json), [원응답 SHA·receipt/후보 대조](number-comparison-audit.json), [실행기/ledger 계약](number-runner.json). 원문·사진·GT·일대일 점수행은 private Store/receipt 경로에만 있다. `wx` 배치·조건별 ledger가 재전송을 막으며 평가 UI의 새 분석 요청도 차단한다.

- [N1 실제 후보](http://127.0.0.1:56275/?session=ca7aad5a-dcda-4697-9612-6befc9283769) — job `faaa628e-ff86-484b-a26f-d1bdb10542bc`
- [N2 실제 후보](http://127.0.0.1:56275/?session=d77545f9-5f9c-4f4b-996d-380fa199c66a) — job `2e18c0dd-5cd2-4de6-a910-1cbd6f8b99a1`

두 세션의 같은 수동 도로 baseline은 그대로이며 결과를 서로 섞지 않았다. 별도 소유 평가 서버 **56275 / PID17830 / exec29060**을 UI 검토용으로 유지한다. 기존 mock51328·GT08493세션·모델97187 설정·운영/공유제품은 변경하지 않았다. UI에서는 재판독이 아니라 이 후보의 정정·명시 검토·저장만 진행한다.

[전체674검사·타입·빌드와 union59 사전대조](../integration/README.md)는 별도 합성/통합 근거다. 실제 사진의 숫자 성과를 전보드·전게임 성능으로 확대하지 않는다. 실행 및 파일 소유권을 감독에게 반환한다.
