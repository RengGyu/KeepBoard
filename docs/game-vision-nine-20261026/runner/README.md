# 사진9장 D1 실행 준비

현재 **9/9회 실행 완료**, 재시도0. [실측 결과](../results/README.md)와 [최종 검증요약](final-verification.json)이 현재 상태다. 아래는 송신 전 고정한 준비 계약 설명이다. 같은 보드/세션의 연속 사진9장을 원래 순서로 각각1회 처리한다. **독립 장면9개가 아니다.** 기존 D1의 Gemini3.8 LOW·사진-only 과제·schema·32768출력·mediaHIGH·180초timeout을 그대로 사용하고 원본 bytes를 보낸다. 건물·도로·문맥·크롭·새모델은 추가하지 않았다.

`nine_runner.py`가 기존 `game_runner.body/parse/evaluate/literal_projection/send`를 재사용한다. 기존6회 실험과 분리된 새9회 hardcap·순차·retry0이며 최초 HTTP/잘림/schema실패에서 전체를 중단한다. 실행 claim이 존재하는 batch는 재전송하지 않는다. 소스/GT/본문/코드pin은 전송 전에 다시 확인한다.

GT는 모델 입력 밖에서 독립 동결됐다. 종류/값을 쓰지 않는 reciprocal unique maximumIoU>=.25로 대응하고 뒤에 종류/값을 채점한다. visible 물체는 모두 위치 분모에 남고, 명시된 `valueScorable`만 값 분모에 넣는다. 사진04/05의 숫자 각1개는 값unknown으로 제외한다. 도둑은 valueScorable=false이며 위치/종류만 평가한다. 미상값을 정답으로 세지 않고 미대응 출력은 자동FP로 분류하지 않는다. 근사/가림 경계는 정확한 segmentation이 아니다.

집중검사32/32·실데이터check/prepare 통과. 9원본 SHA/1170×1560 header 확인. [검증·코드SHA](verification.json), [고정 계획](prepared-plan.json), [정확 execute 명령](execute-command.txt). 키는 기존 외부 업로드 파일을 프로그램 메모리로만 읽으며 값/접두/해시는 출력하지 않는다. 실제 호출은 감독이 이 고정 계획을 검토한 뒤 진행한다.

현재 공개 list 단가에서 요청당 입력32768·출력32768 가정의9회 계획 envelope는 **$1.327104**다. text/schema UTF8 byte proxy+공식 imageHIGH 최대1120token+4096여유는 이미지마다6822다. 이는 공식token count나실청구 보장이 아니다. 실제usage/실청구UNKNOWN을 분리해 기록한다.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/hosted-vision-benchmark.test.py
PYTHONDONTWRITEBYTECODE=1 python3 tools/hosted-vision-benchmark/nine_runner.py --check --index docs/game-vision-nine-20261026/data/index.json --inventory docs/game-vision-nine-20261026/runner/source-inventory.json
```

제품·저장·기본모델·기존6회 장부·다른 서버·프로세스는 변경하지 않는다.
