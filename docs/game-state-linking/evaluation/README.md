# 공개 참고사진 원본/ROI 비교 — 6회 완료

**VERIFIED_SCOPED:** 승인된 3사진·3쌍을 같은 `deepseek-flash/high`, detail high, 출력 상한32768로 **정확히6회** 실행했다. HTTP200·유효 JSON·현재 normalizer 이후 후보가 모두 생성됐고, 검사한 field/owner/evidence scope 위반0, 자동 retry0이다. **ROI의 일괄 자동 적용은 권고하지 않는다.** 좁은 사진이 빨랐지만 검정 보너스 오독이 새로 생겼고 주사위 눈 오독은 남았다. 운영 모델·입력 정책은 변경하지 않았다.

## 이번 관측

A=원본, B=무보정 lossless ROI. 같은 ROI 안에서 사람이 직접 대응한9실물·19개 인쇄 속성이 분모다. raw typed와 앱에서 사용 가능한 normalized typed를 따로 채점했으며 이번 선택 GT에서 결과는 같다.

| 게임 | 원본 A: 정답/오독/null·누락 | ROI B: 정답/오독/null·누락 | A→B 응답 완료 | 입력 토큰 A/B | 출력 토큰 A/B |
|---|---|---|---|---|---|
| Splendor | 10 / 0 / 0 | 9 / 1 / 0 | 35.20초→11.40초 | 2071 / 1787 | 6708 / 1896 |
| Sagrada | 3 / 2 / 0 | 3 / 2 / 0 | 65.78초→60.57초 | 2809 / 2501 | 13639 / 13272 |
| SCOUT | 4 / 0 / 0 | 4 / 0 / 0 | 108.59초→95.91초 | 2482 / 2197 | 22310 / 18886 |

- Splendor 아래 가운데 개발 카드는 보너스가 검정이다. A는 black, B는 red로 잘못 확정했다. 점수·공통 GT의 인쇄 비용은 둘 다 맞았다. 사용자 문제 사진의 다른 흰 보너스 카드와 동일 사례라고 주장하지 않는다.
- Sagrada 사진 기준2행2열 눈4는 A=6, B=5로 틀렸다. 같은 줄4열 눈5는 A/B 모두4로 틀렸다. 선택된 관찰색2개와 가운데 눈6은 맞았다. 행/열은 대응용 설명이며 앱의 manual cell·게임 배치·실제 소유자의 정답을 만들지 않았다.
- SCOUT 네 별 표식의 값5/10/10/2는 양쪽 모두 맞고 중복10은 다른 두 실물로 남았다. B는 각 quantity를 null로 남겼다. **인쇄값 정답이 수량·총점 정답을 뜻하지 않으며 null을1이나0으로 보정하지 않았다.** 맨 앞 카드9/3의 canonical top/bottom·activeEnd는 사전 계획대로 primary GT에서 제외했다.

38개 비교 속성(조건당19)은 전부 후보에서 대응 가능했고, 선택 GT의 typed null·누락·대응 불명은0이었다. **이것이 사진 전체에서 누락·오독이 없다는 의미는 아니다.** 원문 후보 개수 A/B는 Splendor6/3, Sagrada21/24, SCOUT16/8이다. 서로 다른 촬영 범위의 전체 개수를 재현율처럼 비교하지 않는다. Sagrada B는 주사위19개 외 창문 종류 조각을5개로 나누어 반환했다. 창문판 전체를 제대로 식별했다고 보장하지 않으며 선택한 주사위 GT와 별도로 수동 확인이 필요하다. 원본 SCOUT의 별 표식 crop은 인쇄값·상대 anchor와 대응되지만 절대 y좌표가 사진보다 위로 치우쳐 있었다. crop 정확도 전수 점수는 만들지 않았다.

## 비용·시간·실행 근거

실행 source **`bfb1572283c5e559be971602b7a0d6788dacb0117e0356cf7af528faabb90c3d`**, source/prompt/image SHA는 [preflight.json](preflight.json), 요청별 실제 usage와 완료시간은 [requests.json](requests.json), GT 집계는 [evaluation.json](evaluation.json)에 있다. 고정 입력·GT·ROI·예산은 [plan.md](plan.md)에 보존했다. 실행 승인 메시지는 `f93bd40a-9b7a-430f-b052-af103fdab7da`이다.

반환 usage 총 입력13847 / 출력76711(그중 추론62171)토큰이다. 실행일 [공식 피크 요금](https://api-docs.deepseek.com/quick_start/pricing/)으로 할인 없이 계산하면 **US$0.0962073**, 승인 최대US$0.30 이내다. 이는 usage 기반 피크 요금 계산이며 실제 청구서·캐시/시간대 할인·세금/환전 비용은 조회하지 않았다. 요청당 입력·출력 예산을 초과한 응답0이었다.

시간은 소유 loopback gateway 요청 시작부터 전체 응답 수신까지이며 provider upstream 시간도 ledger에 별도 남겼다. crop 준비·normalization 시간은 별도다. Vercel 실제 사용자 업로드/Workflow 대기·commit 시간과 provider 내부 큐/첫토큰 시간은 이번에 측정하지 않았다. 3쌍1회로 p95·안정적 개선율이나 전120게임 정확도를 주장하지 않는다. 출력 상한32768은 비교 안전장치로 양 조건에 동일 적용했으며 운영 서버의 설정을 바꾸지 않았다.

실행 전 image SHA를 pack SHA로 덮어쓴 로컬 사전검사 버그를 SHA guard가 잡아 **네트워크 요청0회 상태로 중단**했다. [preflight-failed-0.json](preflight-failed-0.json)에 영수증을 남겼고 최초 claim은 삭제하지 않았다. 속성명을 분리한 뒤 이전 요청 배열0개를 검증하고 별도 v2 claim으로 승인된6회를 실행했다. 유료 요청·불명확 timeout을 재호출한 것이 아니다. 여섯 요청 뒤 소유 임시 gateway를 닫았고 7번째 호출은 하지 않았다.

원본3장·ROI·prompt·응답·상세 대응표는 preflight의 소유 private temp(0700/파일0600)에만 있다. repo/public/배포에 복사0, 사용자 세션/사진 전송0, 사용자 데이터·production 설정 쓰기0이다. 원본 세 SHA와 crop 픽셀 일치, 쌍별 prompt SHA 동일을 검증했다. 이전 공개 참고사진의 정확 인쇄판·재배포 권리는 여전히 미확정이다.

재평가 명령은 `python3 docs/game-state-linking/evaluation/evaluate.py`이며 **오프라인**이다. `run.mts`는 실행 claim이 있어 재실행하지 않는다. 이번 승인6회는 소진됐다.

## 적용 판단

**RECOMMENDATION:** high 유지, 사용자가 필요할 때 기존 부분 촬영/원본 보기/typed 정정을 사용하게 한다. ROI 자동 재시도나 ‘더 가까이 잘랐으므로 정답’ 처리, 수량/누락 자동 채움은 채택하지 않는다. 이번 연결 기능은 이미 읽은 카드의 상태·플레이어를 명시 지정해 저장하는 별도 개선이며, 모델이 보너스 색/눈을 잘 읽게 됐다는 근거로 전환하지 않는다. 추가 유료 비교·모델 전환·새 점수/상태 엔진을 요구하지 않는다.
