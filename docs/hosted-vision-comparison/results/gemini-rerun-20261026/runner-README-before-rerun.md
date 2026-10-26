# Hosted vision 비교 실행기

현재 상태는 [실측 부분 결과](../results/pilot-20261026/README.md)와 [정확한 집계·SHA](../results/pilot-20261026/results.json)에 있다. 실제 4/6회 사용 후 Gemini 프로젝트 월 지출 상한으로 중단했으며 자동 재시도하지 않았다. 준비 당시 문서는 [역사본](../results/pilot-20261026/runner-README-before-results.md)에 보존했다.

실행기는 제품과 분리된 Python 표준 라이브러리 도구다. 두 task는 `ocr-with-region`(전체 보이는 인쇄문자)과 `component-location`(시각적 종류/영역)이다. Florence 문맥 추론은 N/A다. Gemini의 정의·규칙·실물 참조는 별도 조건이며 정답 GT는 요청에 넣지 않는다. 현재 참조사진은 없고 텍스트 문맥 조건은 미실행이다.

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tests/hosted-vision-benchmark.test.py
python3 tools/hosted-vision-benchmark/runner.py --check --manifest docs/hosted-vision-comparison/data/benchmark-manifest.json
```

`--prepare --out <새 private 폴더>`는 키/네트워크 없이 요청을 고정한다. `--execute --approved-plan-sha <고정 SHA>`는 독점 claim을 만들며 첫 HTTP/형식/잘림 실패에서 중단한다. 최대 6회, 동시 1, 자동 retry 0, timeout 120초다. timeout은 제공자 실행 취소나 청구 0을 보장하지 않는다. 기존 batch나 남은 예산을 임의 재사용하지 않는다.

키 값은 명령/문서에 넣지 않는다. 기존 제공 파일을 `--gemini-key-file <외부 파일>` 및 `--roboflow-key-file <외부 파일>`로 읽기 전용 재사용한다. 원본 업로드 파일 mode는 바꾸지 않는다. 생성 JSON store는 0600이며, 명시 외부 업로드는 소유자 정상 파일인 경우 0644도 허용한다. 파서는 완전한 토큰을 읽으며 구두점에서 자르지 않는다. `.keepboard`는 접근하지 않는다.

공식 계약·요금 링크는 [official-sources.json](official-sources.json)에 있다. 사용량/응답 처리 시간의 추정과 실제 청구를 구분한다. 프로젝트는 가입·훈련·유료 플랜 변경·제품 provider 변경을 하지 않았다.
