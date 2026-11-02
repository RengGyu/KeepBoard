# Terra 6.1 별도 API 비교

**6회 실제 실행, 재시도0. 정확한 `gpt-6.1-terra`가 모두 HTTP200/completed를 반환했다. 그러나 동일한 기존 정규화기를 통과한 응답은2/6이다.** 나머지4개는 일부 박스의 최소/최대 좌표가 뒤집혀 거절됐다. 설정 변경·좌표 보정·재호출은 하지 않았다. 제품 모델/소스/저장 기록은 바꾸지 않았다.

## 동일 조건과 실제 API 확인

- [공식 모델 페이지](https://developers.openai.com/api/docs/models/gpt-6.1-terra)를 검색 후 실제 열어 정확ID·이미지 입력·구조화 출력·low 추론·출력한도를 확인했다. 제공된 인증파일은 accessor 메모리에서만 읽었으며 보고에는 `provided-upload`로만 남겼다. 추론 전 `GET /v1/models/gpt-6.1-terra`도 HTTP200/동일ID였다(`access.json`).
- 이전 Gemini의 Splendor/Quacks W·C·D **6사진 bytes, 본문 지시문, JSON schema 내용은 SHA로 동일**하다. 참고 답/기준 개수/좌표를 지시에 추가하지 않았다. 참조 SHA는 Splendor `9b2c95be…`, Quacks `6b7dc260…` 그대로다.
- 공급자 wrapper만 Responses API의 `input_text/input_image`, base64 data URL, `text.format`으로 변환했다. 이미지 `detail:high`, `reasoning.effort:low`, `max_output_tokens:32768`, standard `service_tier:default`, `store:false`, 도구 없음. schema 자체는 바꾸지 않았고 OpenAI의 name/strict wrapper만 추가했다.
- low/HIGH의 이름을 맞춰도 두 공급자의 연산량·이미지 전처리·토큰화는 같지 않다. OpenAI 출력한도에는 reasoning도 포함된다. 두 요청 body가 바이트 단위로 같다고 주장하지 않는다. 변경점과 각 요청 SHA는 `preflight.json`에 있다.

## 같은 사전 기준으로 위치와 값을 함께 회수한 결과

W=전체/넓은 프레임, C=W 무손실 crop, D=다른 시점의 실제 근접 프레임. 같은 AI 부분참조이며 사람 인증 정답/전체사진 정확도가 아니다. geometry-only reciprocal unique maximum IoU≥.25로 일대일 대응하고 값으로 맞춰 찾지 않았다. 원본 Gemini6점수도 같은 함수로 메모리에서 재계산해 기존 결과6/6 일치를 확인했다.

|게임·조건|Gemini 개별 대응|Terra 유효 raw 개별 대응|Gemini 맞힌 속성|Terra 위치대응 포함 회수 속성|Terra 전체 정규화|
|---|---:|---:|---:|---:|---|
|Splendor W|12/12|4/12|16/18|5/18|거절: 잘못된 box10행|
|Splendor C|12/12|3/12|15/18|4/18|거절: box7행|
|Splendor D|12/12|12/12|16/18|16/18|통과|
|Quacks W|0/8|0/8|0/16|0/16|거절: box3행|
|Quacks C|8/8|2/8|15/16|3/16|거절: box13행|
|Quacks D|0/8|0/8|0/16|0/16|통과|

**이 표의 Terra 일부 행 점수는 전체 응답 정규화 성공이 아니다.** 진단용으로 원문의 정상 박스 행만 같은 decoder에서 독립 검증해 평가했다. 4개 거절 응답의 미대응 표본은 좌표 대응 불명확으로 남기며 물체가 사진에서 안 보였거나 모델이 전부 못 읽었다고 단정하지 않는다. 전체 응답을 앱에 넣을 수 있는지와 유효 부분에 담긴 정보는 별개다. 원문81행 중33행은 명시된 `[ymin,xmin,ymax,xmax]` 순서에서 min<max를 위반했다. 셋째/넷째 좌표 혼동이 의심되지만 순서를 바꿔 정답 처리하지 않았다.

- Splendor D는 두 모델 모두 보너스12+점수4=16값을 회수했다. 나머지 점수2값은 Gemini가 잘못된0, Terra는unknown이었다. Terra는 raw component `development`12개를 맞췄지만 별도 visible subtype `kind` 속성은 반환하지 않아 이 둘도 분리 기록했다.
- Quacks W/D는 Gemini가 books5개만 반환했던 것과 달리 Terra가 실제 칩 **묶음**4/3행도 반환했다. 종류 존재 정보는 늘었지만 개별 칩/숫자8개 회수는 아니다. C는 개별 칩20행을 반환했으나 그 중13행의 박스가 잘못돼 표본 대응이 제한됐다. 반환 행수를 개별 정답 수로 세지 않는다.
- 누락·좌표불명확·묶음·속성unknown·오독은 `results.json`과 private per-object score에서 분리했다. 미주석 이웃/그룹/박스불량을 모두 환각으로 계산하지 않았고 전체 precision/중복률은 미측정이다.

## 시간·usage·가격 환산

|조건|Gemini 경과초|Terra 경과초|Terra 입력/출력/총 토큰|출력 중 reasoning|
|---|---:|---:|---|---:|
|Splendor W|21.574|25.281|3237 / 1980 / 5217|77|
|Splendor C|20.023|23.629|1653 / 1853 / 3506|59|
|Splendor D|21.853|21.670|3237 / 1424 / 4661|66|
|Quacks W|12.668|17.099|3290 / 947 / 4237|33|
|Quacks C|14.657|21.613|1094 / 1703 / 2797|73|
|Quacks D|9.485|13.812|3290 / 884 / 4174|40|

Terra 실제 최대동시6, 전체 벽시간25.282초. Gemini는 앞 시험에서 게임별 동시3회씩 따로 실행했으므로 두 벽시간을 단순 속도 우열로 비교하지 않는다. 개별 시간도 네트워크·로컬 수신/파싱을 포함하며 앱 스캔 종단시간/서버 내부 추론시간이 아니다.

Terra 총 입력15,801(캐시 read0/write15,783), 출력8,791(**reasoning348 포함**), 총24,592토큰. Gemini 총23,067토큰이며 reasoning은 미보고다. 공급자 토큰 수를 같은 계산량으로 취급하지 않는다.

[공식 요금](https://developers.openai.com/api/docs/pricing)의 Standard short-context 입력$1/출력$5/캐시read$0.05, 기본30분 write$1.25(각1M토큰당)를 적용한 **usage 요금 환산은 $0.06370175**다. 실제 청구내역 확인은 하지 않았다. [캐시 문서](https://developers.openai.com/api/docs/guides/prompt-caching)에 따라 write는 일반 input 요금을 대체하며 이중 합산하지 않았다. TTL 옵션을 생략했으므로 기본30분 요율이다. 응답의 최대 보존 정책 `prompt_cache_retention:24h`는 그 최소 TTL과 별개다.

기존 Gemini 시험의 공식 단가/실청구는 확인하지 않았으므로 두 모델의 금액 우열은 판정하지 않았다.

## 동결 자료와 한계

`access.json`, `sources.json`, `preflight.json`, `ledger.json`, `execution.json`, `normalization-diagnostic.json`, `results.json`, `verification.json`. 원응답/parsed/정규화/진단용 정상행/per-object score/모델 요청은 `preflight.privateDir`의0700디렉터리/0600파일에만 있다. 인증값/인증 헤더/HTTP 오류 본문은 출력·저장하지 않았다. `run.mts --execute`는 이미6회 소진한 단일 claim이므로 **재실행 금지**다.

두 게임의 기존 development 장면에 조건별1회만 실행했다. 프롬프트를 Terra에 맞게 조정한 비교도 아니며, 시각 능력 일반 순위나 게임 전체 정확도를 결론내리지 않는다. 다른 시점 자동 정합·실제 앱 저장/재개·제품 모델 교체는 이번 범위 밖이다. 후속 호출·제품 변경0.
