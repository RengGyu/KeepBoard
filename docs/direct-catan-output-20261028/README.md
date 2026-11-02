# 같은 카탄 사진의 API 직접 출력

이전과 같은 원사진·동일 SHA의 요청 본문. Flash 1회, 재시도0, 앱 연결0.

응답 45.66초 / HTTP 200 / STOP

|종류|출력 개수|
|---|---:|
|지형|19|
|숫자 원판|17|
|도둑|1|
|도시|2|
|정착지|2|
|도로|0|
|항구|0|

출력 개수는 정확도나 실제 정답 수가 아니다. 이번 실행은 앱 표시·저장 검증을 하지 않았다.

## 원응답의 항목별 값·위치

|ID|종류|값|색|모델이 지정한 위치|
|---|---|---|---|---|
|hex-r1c1|지형|mountains|?|r1c1|
|token-r1c1|숫자 원판|3|white|r1c1|
|hex-r1c2|지형|forest|?|r1c2|
|token-r1c2|숫자 원판|6|white|r1c2|
|hex-r1c3|지형|pasture|?|r1c3|
|token-r1c3|숫자 원판|2|white|r1c3|
|hex-r2c1|지형|pasture|?|r2c1|
|token-r2c1|숫자 원판|8|white|r2c1|
|hex-r2c2|지형|hills|?|r2c2|
|token-r2c2|숫자 원판|5|white|r2c2|
|hex-r2c3|지형|fields|?|r2c3|
|token-r2c3|숫자 원판|4|white|r2c3|
|hex-r2c4|지형|forest|?|r2c4|
|token-r2c4|숫자 원판|5|white|r2c4|
|hex-r3c1|지형|mountains|?|r3c1|
|token-r3c1|숫자 원판|10|white|r3c1|
|hex-r3c2|지형|fields|?|r3c2|
|token-r3c2|숫자 원판|6|white|r3c2|
|hex-r3c3|지형|desert|?|r3c3|
|hex-r3c4|지형|pasture|?|r3c4|
|token-r3c4|숫자 원판|9|white|r3c4|
|hex-r3c5|지형|fields|?|r3c5|
|token-r3c5|숫자 원판|10|white|r3c5|
|hex-r4c1|지형|forest|?|r4c1|
|robber-1|도둑|?|black|r4c1|
|hex-r4c2|지형|mountains|?|r4c2|
|token-r4c2|숫자 원판|3|white|r4c2|
|hex-r4c3|지형|fields|?|r4c3|
|token-r4c3|숫자 원판|11|white|r4c3|
|hex-r4c4|지형|hills|?|r4c4|
|token-r4c4|숫자 원판|8|white|r4c4|
|hex-r5c1|지형|hills|?|r5c1|
|token-r5c1|숫자 원판|12|white|r5c1|
|hex-r5c2|지형|pasture|?|r5c2|
|token-r5c2|숫자 원판|11|white|r5c2|
|hex-r5c3|지형|forest|?|r5c3|
|token-r5c3|숫자 원판|4|white|r5c3|
|city-blue-1|도시|?|blue|r1c2.SW|
|settlement-blue-1|정착지|?|blue|r2c1.SE|
|city-red-1|도시|?|red|r3c5.NW|
|settlement-white-1|정착지|?|white|r4c2.SE|

주의: 모델 요약에는 도로가 있다고 쓰였지만 실제 components에는 road 행이 없다. 요약을 구조화 검출 결과로 계산하지 않는다.

원응답은 `/private/tmp/kb-direct-catan-20261028-once/native.json`, 파싱한 원문은 `/private/tmp/kb-direct-catan-20261028-once/parsed.json`에 보존했다.
