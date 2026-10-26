# 고정 3사진 high / none 실험

**VERIFIED:** 승인 카드의 순서대로 정확히 6요청, 실패 포함 상한 6, 자동 재시도 0. 모두 upstream HTTP 200이었다. `none`은 `reportedEffort:none`과 reasoning tokens 0으로 실제 수용됐다. 운영 모델은 **deepseek-flash / high 그대로**다.

|게임|high 응답 완료|none 응답 완료|high reasoning tokens|none reasoning tokens|정규화 실물 high / none|
|---|---:|---:|---:|---:|---:|
|Splendor|78.73초|4.74초|12,904|0|6 / 6|
|Sagrada|71.15초|8.12초|10,689|0|0 / 21|
|SCOUT|89.65초|8.64초|14,128|0|0 / 17|

시간은 로컬 HTTP 요청 시작부터 gateway 전체 응답 수신까지다. gateway의 upstream 대기 측정은 각각 78.717/4.733, 71.150/8.119, 89.641/8.628초였다. 순수 모델 추론시간·모델 첫 토큰시간은 측정하지 않았다. 파일/요청 준비는 2.6–13.1ms, 정규화는 0.9–3.1ms였다. 원격 업로드만의 시간, provider 내부 큐, 실제 앱 저장시간은 분리 측정하지 않았다. 저장 API를 호출하지 않았다.

**품질 유지 gate: FAILED. 운영 none 전환 근거로 채택하지 않는다.**

|고정 GT의 앱에서 사용 가능한 typed 결과|high: 정답 / 오류 / 누락|none: 정답 / 오류 / 누락|지원 불가로 별도 제외|
|---|---:|---:|---:|
|Splendor|11 / 0 / 1|9 / 1 / 2|0|
|Sagrada|0 / 0 / 7|1 / 0 / 6|5|
|SCOUT|0 / 0 / 3|0 / 0 / 3|0|

- Splendor none은 high에서 맞았던 고정 GT 보너스 한 항목을 틀리고 비용 한 항목을 추가 누락했다. null은 누락으로 세며, GT에 없는 비용색의 0/null을 정답으로 가산하지 않았다.
- Sagrada/SCOUT high는 상세값을 냈으나 `readout.sources`에 `observation` 대신 원본 ID를 넣어 현재 strict normalizer가 전체 해당 필드를 거절했다. raw 21/15개가 앱 후보 0/0개인 이유다. 응답을 고치거나 다른 정규화로 재평가하지 않았다.
- Sagrada/SCOUT none은 raw에 readout 자체가 없었다. 앱은 원본 설명/실물은 보존하고 typed 상세를 null로 만들었다. 설명에 읽은 값과 유효한 typed 값은 구분했다. Sagrada raw/설명에는 두 조건 모두 선택 주사위 눈 오독이 있었고, SCOUT도 앞 카드/별 표식 GT를 완전히 맞히지 못했다.
- Sagrada의 행·열·빈 칸·인쇄 효과는 현재 typed 표현이 없고, 투명 돌은 이 pinned photo binding에 연결되지 않는다. 이 5개는 정답/오류 양쪽에서 제외했다. 19개 주사위 수는 반환된 개별 관측 수로 비교했으며 quantity null을 1로 바꾸지 않았다.
- SCOUT 앞 카드의 숫자와 색 끝 대응이 모호한 raw 항목은 ambiguous로 남겼다. 별 4개 값 배열은 하나의 GT 항목이며 부분 일치를 전체 정답으로 세지 않았다. crop과 상대 위치는 원본 대응에만 썼고 칸·손패 순서로 바꾸지 않았다.

**Unknown / scope:** 허용 field·owner·evidence 경계 위반은 6요청 모두 0. placement, 추정 레벨, cell, activeEnd, handPosition을 새로 확정한 항목은 0. 다만 Sagrada high raw는 카드가 미확인으로 지정한 canonical dieColor 19개를 확정했으며 이 raw 결과는 위 형식 오류로 전부 보류됐다. 모든 unknown이 보존됐다고 주장하지 않는다. 미기재/가린 숫자의 전수 사실 검증은 하지 않았다.

**동일 조건:** 세 쌍의 원본 SHA, prompt SHA, request body SHA가 각각 일치한다. 같은 `createGateway`, alias `board-vision`, model `deepseek-flash`, detail high, max_output_tokens 32768, timeout 180초를 사용했다. 임시 설정 차이는 `aliases.board-vision.effort` 한 필드뿐이다. 기존 credential은 기존 런타임 경로로만 참조했고 값 열람·복사·기록은 하지 않았다. prompt에 GT를 넣지 않았다. provider가 보고한 input token 수는 각 쌍에서 24개 차이 났으나 실제 전송 prompt/image/body는 동일했다. 내부 계산 원인은 UNKNOWN이다.

**운영/종료:** 4319·4330 PID와 비민감 settings/alias before/after 동일. 운영 설정/Store 쓰기 0, 제품 소스 수정 0. 임시 loopback 서버는 finally에서 종료했고 해당 listener가 없음을 확인했다. 설정은 private temp 파일이며 공개 경로에 서비스하지 않았다. CUA는 지시대로 사용하지 않았다.

근거: [요청별 측정](requests.json), [GT 집계](evaluation.json), [입력 검사](preflight.json), [소스 해시](source-manifest.json), [최종 검사](verification.json). 원문 prompt/응답·정규화·항목별 GT 대응은 `preflight.json`의 privateDir 아래 0700/0600으로만 보관했다. Astra는 `gt-evaluation.private.json`과 각 `*.response.json`/`*.normalized.json`을 독립 대조할 수 있다. 사진/원문 응답은 이 문서나 공개 정적 에셋에 넣지 않았다.

재현 도구: `prepare.mts`는 무과금 입력 검사, `evaluate.py`는 기존 결과 오프라인 대조다. **`run.mts`는 유료 실행 도구이며 실행 claim으로 재실행을 차단한다. 이 카드의 예산은 소진됐으므로 다시 실행하지 않는다.** `python3 docs/photo-read-experiment/evaluate.py` exit 0. 전체 테스트/빌드는 제품 변경이 없어 실행하지 않았다. 세 쌍 1회 관측이므로 평균 개선율·p95·통계 유의성·120게임 정확도로 일반화하지 않는다.
