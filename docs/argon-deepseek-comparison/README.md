# Argon / DeepSeek 동일사진 비교 — 최종

**완료한 카탄·스플렌더 두 사진에서는 Argon이 더 정확했지만 더 느리고 비쌌습니다.** 사그라다는 Argon HTTP429로 중단되어 비교하지 못했습니다. 사진당 모델1회 관측이며 기본모델/제품을 바꾸지 않았습니다.

| 사진 | Argon 신규 raw | DeepSeek 신규 raw | 시간 Argon /DeepSeek |
|---|---|---|---|
| 카탄 — 사용자 문제 사진 | 지형19/19·숫자18/18 모두 정답, 모두 자기GT 중심 bbox 대응. 도둑1개도 대응 | 사진 행의 별도 의미대응으로 지형17/19·숫자13/18 정답. 엄격 bbox는 지형15/19·숫자8/18만 대응하며 그중 정답14·4, 나머지는 대응 불명. 도둑 누락 | 148.62s /85.95s |
| 스플렌더 | 시장 점수12/12(고신뢰10+중간2), 보너스11/12, 귀족점수3/3 정답. 시장12·귀족3 bbox 대응 | 개발카드38개의 points/bonus 전부null, 귀족4개 points도 전부null. 시장11/12·귀족3 bbox 대응. 비용 완전GT0은 양쪽 평가 제외 | 150.39s /76.02s |
| 사그라다 | 5번째 요청 HTTP429·관측 raw 없음 | 6번째 요청 미송신 | 미측정 |

**완벽한 판독은 아닙니다.** Argon 카탄은 GT 건물13개 위치/색을 모두 대응했으나 종류2개 오독(고신뢰GT 기준), 추가건물1개·도로 일부는 대응 미확정입니다. 도로14/16 anchor 대응, 일부 흰 anchor는 사전GT부터 불확실하며 정확한 topology 점수는 내지 않았습니다. 스플렌더 토큰 색은 Argon16일치/1오독/17대응, DeepSeek9일치/3오독/5대응불명입니다. DeepSeek는 코스터1개를 토큰으로 오인했고 Argon에서는 그 오인0개를 확인했습니다. 주변 카드61개 vs38개 출력은 겹친 실물 전수GT가 없으므로 정확도나 허위개체 수로 바꾸지 않습니다. 동일kind+정확box 중복은 양쪽0입니다.

**bbox와 의미대응 분리:** 엄격 기준은 값과 무관하게 GT 중심점이 유일하게 들어가는 원본box입니다(IoU/전체윤곽 정확도 보증 아님). 카탄 DeepSeek의 t1..t19/n1..n18을 원본·source-center overlay로 직접 대조한 상대행 값은 별도이며, 좌표나 예측값을 고쳐 맞추지 않았습니다. 사전GT61ee/f999/53d50과 B prompt3개·원본SHA는 불변입니다. 두 모델 모두 이번에 새로 호출했으며 이전 실험값을 섞지 않았습니다.

| 요청 | input /최종+thinking output /thinking tokens | 전입력 cache-miss peak 환산 |
|---|---|---|
| Catan Argon | 1400 /13553 /9648 | $0.1383300 |
| Catan DeepSeek | 716 /18699 /15876 | $0.0226536 |
| Splendor DeepSeek | 929 /15558 /12073 | $0.0189483 |
| Splendor Argon | 1474 /14843 /9431 | $0.1513780 |

완료4건 peak 환산합계 **$0.3313099**, 보고 cache hit 반영 peak 환산 **$0.33093358**입니다. 실제 청구서가 아닙니다. 실패한429 요청은 usage가 없어 과금UNKNOWN이며0달러로 단정하지 않습니다. 해당 요청 예약상한$0.393216을 더해도$0.7245259. 전체6회 입력·출력32768 가정의 이론상한$1.327104≤승인$1.40와 별도입니다. 완료건 실제 usage는 모두32768 이내. 입력 사전상한은 보수적 추정이지 공식 token-count 보증이 아닙니다.

**429 가용성 한계:** 코드 `too_many_requests`. 저장된 본문으로 RPM/TPM/일일/동시성 종류를 특정할 수 없으며, 응답헤더를 보존하지 않아 Retry-After/재개시각도 UNKNOWN입니다. 추가HTTP·quota조회·재시도0. 429를 사그라다 정답 오독으로 세지 않았습니다. 원claim/ledger를 그대로 유지합니다.

**실행 계약·검증:** [requests.json](requests.json), [evaluation.json](evaluation.json), [verification.json](verification.json), [failure-metadata.json](failure-metadata.json), [preflight.json](preflight.json). 실제 upstream5(성공4/실패1), 미송신1, retry0. 원본/GT/prompt SHA3쌍·원문JSON13개·0700/0600·승인runner/adapter/preflight SHA·기존config 불변 exit0. 원본/raw/GT/검토그림과 credential 참조 adapter는 privateDirectory에만 있으며 키값 출력/복사0. 운영/제품/사용자기록 변경0, 임시서버 미사용/남은서버0, 실앱 저장성공 주장0.

**공식 근거:** [Argon 모델](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon), [Interactions API](https://ai.google.dev/api/interactions-api), [Google 가격](https://ai.google.dev/gemini-api/docs/pricing), [DeepSeek 가격](https://api-docs.deepseek.com/quick_start/pricing/). Argon은 Interactions high thinking·image high·standard·max_output32768, DeepSeek는 Responses high·detail high·32768. 같은 high가 같은 연산량/내부 해상도라는 뜻은 아닙니다. Argon thought 토큰은 native total과 대조해 output에 기계 합산했고 좌표 단위변환0입니다. DeepSeek API 응답ID는 영수증에 보존했고 Argon 본문은 ID를 반환하지 않았습니다. 계정접근은 앞선 Argon2성공으로 확인되지만 다음 요청 가용성을 보장하지 않습니다. 일반 정확도·전게임 우위·배포준비 결론으로 확대하지 않습니다.
