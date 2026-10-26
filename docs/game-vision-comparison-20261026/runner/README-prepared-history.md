# 카탄 literal 비교 실행기

제품과 분리된 `game_runner.py`를 추가했다. 기존 일반 OCR/Florence 실행기는 변경하지 않았다. 집중 검사 **29/29**, 실제 데이터 check/prepare 성공, 새 모델 호출은 아직 0회다. [검증·변경파일 SHA](verification.json) · [고정 계획](prepared-plan.json).

D1은 Gemini3.8 Flash LOW의 사진-only 게임 과제, D2는 같은 조건에 model-safe 필드 문맥만 추가, D3은 D2와 같은 원본 bytes·지시·스키마·문맥을 DeepSeek native Responses API로 보낸다. DeepSeek의 `reasoning.effort=low`와 Gemini LOW는 같은 내부 계산량이라는 뜻이 아니다. Gemini는 image HIGH, DeepSeek는 detail original이며 제공자 내부 영상 처리는 다르다.

과제는 지형 hex·숫자 **원판**·도둑의 보이는 실물뿐이다. 공통 `box_1000=[ymin,xmin,ymax,xmax]`/kind/terrainType/number를 받고 null·빈 관측을 보존한다. 개수/정답 슬롯/재고/숨김값을 주입하거나 GT를 요청에 넣지 않는다. 출력 상한32768·HTTP timeout180초·순차·자동 retry0이며 첫 HTTP/shape/잘림 실패에서 batch를 멈춘다. 별도 experiment 장부가 모든 batch의 시도를 6회 이하로 제한한다. timeout은 제공자 취소나 무료 청구를 보장하지 않는다.

GT v2는 실제 원판/hex/도둑 경계를 사전에 별도 동결했다. bbox는 수작업 근사 범위이지 정밀 segmentation이 아니다. **종류/값을 사용하지 않는** reciprocal unique maximum IoU>=0.25로 대응한 뒤 kind/속성 정답, unknown/누락/모호/미대응을 분리한다. matched IoU와 중심 오차px도 기록한다. 0.25는 사전 비교 정책이지 서비스 합격선이 아니다. 구버전 tilecenter 점수는 쓰지 않는다.

비용은 현 일반 list rate·cache miss·DeepSeek peak 가정이다. 입력/출력 각32768 가정에서 D1+D2+D3 **$0.344064**, 최대6회를 모두 더 비싼 Gemini로 가정하면 **$0.884736**로 $1.70 계획 envelope 안이다. 입력은 UTF8 text/schema byte수+공식 image max+4096 여유의 오프라인 proxy를 검사한다. 이는 공식 tokenizer/count API 결과나 실청구 보장이 아니다. 실제 usage/청구 UNKNOWN을 분리한다.

공식 계약: [Gemini 모델/LOW](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [media image HIGH 최대1120tokens](https://ai.google.dev/gemini-api/docs/media-resolution), [요금](https://ai.google.dev/gemini-api/docs/pricing). [DeepSeek Responses](https://api-docs.deepseek.com/guides/responses_api/)는 `/responses` image/text.format/completed 상태를 사용한다. [thinking](https://api-docs.deepseek.com/guides/thinking_mode/)의 low effort를 지정한다. [요금·모델](https://api-docs.deepseek.com/quick_start/pricing/)상 alias `deepseek-flash`는 DeepSeek-V4.1-Flash-1017, peak 입력$0.3/M·출력$1.2/M이다. 실제 응답이 revision을 노출하지 않으면 alias 문서와 구분한다. [Vision](https://api-docs.deepseek.com/guides/vision/)상 original도 제공자 내부 resize/token화가 있다. 확인일2026-10-26.

원관측은 source/request pin과 함께 `variant`/`number`/region 이름으로 lossless offline 투영한다. 로컬 ReaderIdentity를 위조하거나 실제 product job/assembly 통합 완료로 주장하지 않는다. hosted identity·제품 검증 연결은 별도 작업이며 이번 제품 변경은 0이다. D4는 현재 source-bound 확인 frame이 없어 NOT_RUN, 독립 holdout도 없으며 개발사진1장 결과만 얻는다.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/hosted-vision-benchmark.test.py
PYTHONDONTWRITEBYTECODE=1 python3 tools/hosted-vision-benchmark/game_runner.py --check --manifest docs/game-vision-comparison-20261026/data/benchmark-manifest.json --evaluation-contract docs/game-vision-comparison-20261026/data/contract.json
```

키는 기존 외부 업로드 파일을 `--gemini-key-file`/`--deepseek-key-file`로 프로그램 메모리에만 읽는다. 값/접두/해시를 출력하거나 원본을 변경하지 않는다. 정확 execute 명령·승인 planSHA는 [execute-command.txt](execute-command.txt)에 있다. 내부 감독 검토 후 실행한다.
