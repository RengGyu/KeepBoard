# Hosted vision 비교 실행 준비

제품과 분리된 Python 표준 라이브러리 실행기다. **실제 모델 요청·사진 업로드는 아직0회**다. 오프라인 통과를 정확도·속도 검증으로 해석하지 않는다.

## 비교 범위

선택 manifest는 [data/benchmark-manifest.json](../data/benchmark-manifest.json)이다. 현재 사용자 제공 카탄 사진1장의 명시적6개 run을 사용한다: 두 provider의 photos-only OCR/구성물 위치4개와 Gemini game-context2개. 미선택 corpus 사진은 업로드하지 않는다. 이미지·문맥·모델 alias·요청 본문·실행기 SHA를 준비 단계에서 고정한다.

| task | Gemini | Florence |
|---|---|---|
| `ocr-with-region` | 전체 보이는 인쇄문자와 사각영역 | `<OCR_WITH_REGION>` native quad_boxes/labels |
| `component-location` | 보이는 구성물의 시각적 이름·영역 | `<OD>` native bboxes/labels |
| game-context 조건 | 선택한 정의·문자 규칙·허용된 실물 참조 | N/A, 요청하지 않음 |

같은 task끼리만 비교한다. OCR은 숫자 토큰 전용이 아니다. 토큰18개 GT는 OCR의 일부만 평가하며 미주석 문자·카드숫자를 자동 오검출로 세지 않는다. 구성물 task GT가 없는 경우 **unscored/정성 관찰**로 남긴다. 전체 판 상태·소유자·턴·규칙 판단은 이번 실행기의 지원 범위가 아니다. [오프라인 평가 입력](../data/offline-evaluation.json)은 읽거나 전송하지 않는다.

정의·규칙은 `contexts[].definitions/rules`의 path+SHA, 실제 참조는 `references[]`에 같은 이미지 메타데이터와 `approvedForHosted`를 둔다. 현재 검증된 실물 참조이미지는 없으므로 텍스트 문맥만 연결됐다. 참조 추가 시 주 사진과 별개로 업로드 허용을 검사한다. 미승인 선택 입력은 prepare에 blocker로 나오며 execute에서 거절한다. 6개를 넘으면 오류로 중단하고 임의 절삭하지 않는다.

## 오프라인 명령

프로젝트 루트에서 실행한다. 키를 읽거나 네트워크에 접속하지 않는다.

```sh
python3 tests/hosted-vision-benchmark.test.py
python3 tools/hosted-vision-benchmark/runner.py --check --manifest docs/hosted-vision-comparison/data/benchmark-manifest.json
python3 tools/hosted-vision-benchmark/runner.py --prepare --manifest docs/hosted-vision-comparison/data/benchmark-manifest.json --out /private/tmp/keepboard-hosted-vision-pilot-v1
```

새 비공개 결과 폴더0700에 plan.json0600을 만든다. 출력된 planSHA는 입력·문맥·코드가 바뀌면 달라진다. 기존 폴더/실행 claim을 덮어쓰지 않는다. 실행 전 root가 이 plan을 검토해야 한다.

## 기존 Gemini 키 재사용·Roboflow 준비

**기존 제공 Gemini 파일을 찾았으며 내용의 단일 credential 형식도 확인했다. 새 Gemini 가입·키 발급·재입력은 필요 없다.** 위치:

```text
/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API
```

`--gemini-key-file`은 이처럼 명시 제공된 소유자 정상 외부 파일을 읽기 전용으로 사용한다. 업로드 파일의0644 모드는 유지한다. 값·접두문자는 출력하지 않았고 네트워크 인증은 아직 확인하지 않았다. `.keepboard`는 읽지 않는다.

**남은 API 준비는 Roboflow 키다.** [Roboflow API settings](https://app.roboflow.com/settings/api)에서 기존 계정의 키를 확인하거나 계정이 없으면 사용자가 가입해야 한다. 데이터셋 업로드·훈련·별도 Workflow 생성은 필요 없다. 계정/크레딧·자동 유료 사용 여부는 실행 전에 확인한다. 이 작업에서 가입이나 결제는 하지 않았다.

사용자가 본인 터미널에서 아래 helper를 실행하면 **Roboflow만** 숨김 입력한다. 기존 JSON의 Gemini 항목이 있으면 보존한다. 기본 파일은 `~/.config/keepboard-hosted-vision/credentials.json`, 디렉터리0700·파일0600이다. 환경변수를 다른 터미널에 설정해도 agent에 자동 전달되지 않으므로 명시 파일 옵션을 권한다.

```sh
python3 tools/hosted-vision-benchmark/credentials.py
```

외부 JSON은 `GEMINI_API_KEY`/`ROBOFLOW_API_KEY` 항목만 허용한다. 해당 이름의 환경변수도 지원한다. 키를 CLI 인자 값이나 채팅에 붙이지 않는다. setup은 로컬 저장만 하며 API 유효성 검사도 호출하지 않는다.

이 프로젝트는 학습 작업을 실행하지 않는다. 별개로 Gemini [공식 요금표](https://ai.google.dev/gemini-api/docs/pricing)는 무료 tier 입력이 제품 개선에 사용될 수 있고 유료 tier는 그렇지 않다고 표시한다. 기존 키의 실제 tier는 UNKNOWN이며, 자동 유료 전환은 하지 않는다. 이는 제공자 데이터 정책에 관한 정보이며 새 가입·동의 절차나 필수 유료 플랜을 요구하는 조건이 아니다. 제공자 재사용 금지가 추후 요청되면 그 정책에 맞는 설정을 별도로 확인한다.

## 기존 비교 요청 범위에서 키 연결 후 실행

사용자는 이 제한된 비교를 이미 요청했다. 아래 명령은 **아직 실행하지 않았다**. 남은 사용자 입력은 Roboflow 계정/API 키이며, root의 코드 검토는 내부 실행 절차다. SHA는 [검증 결과](verification.json)에 기록한 준비본이다. 코드·manifest·입력·문맥이 바뀌면 새 prepare와 내부 검토가 필요하다.

```sh
python3 tools/hosted-vision-benchmark/runner.py --execute --manifest docs/hosted-vision-comparison/data/benchmark-manifest.json --out /private/tmp/keepboard-hosted-vision-pilot-v1 --approved-plan-sha cdc2a0dc879d0473450794c1ac1113dc33017f001956603131956dd6548f39f3 --gemini-key-file /Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API --credentials-file ~/.config/keepboard-hosted-vision/credentials.json
```

명시 선택 총6회 이하·동시1·재시도0, HTTP timeout120초다. timeout은 서버 작업 취소나 청구0을 보장하지 않는다. batch와 run별 독점 claim이 같은 폴더 재송신을 막고 첫 HTTP/형식/잘림 실패에서 batch를 중단한다. 새로운 폴더를 만들어 예산을 재사용하지 않는다. API 키는 인증 header에만 들어가며 URL·요청 본문·해시·보고서에는 없다. 응답이 credential을 되돌려 보내면 저장 전에 가리고 원응답 SHA와 redaction 여부를 기록한다.

raw 응답과 normalized polygon/bbox/text/label은 private 폴더에만 보존한다. `null`/빈 배열·반복 실물은 그대로 남기고 단위 추측·좌표 clamp·JSON 수리는 하지 않는다. Gemini는 STOP 아닌 응답을 거절한다. Florence는 명백한 잘림·미지원 shape를 거절하지만 네이티브 finish 정보가 없으면 **완전성 UNKNOWN**으로 기록한다.

## 공식 계약·비용

[확인한 출처와 세부 설정](official-sources.json). Gemini는 [공식 GenerateContent REST](https://ai.google.dev/api/generate-content), `gemini-3.8-flash`와 HIGH thinking/구조화 JSON을 사용한다. Roboflow는 [공식 Florence API](https://docs.roboflow.com/models/supported-models/florence-2)의 `/infer/lmm`, `florence-2-base`를 사용한다. [Microsoft 네이티브 출력](https://huggingface.co/microsoft/Florence-2-base)의 픽셀 좌표를 0..1로 변환하며 사각형 원형을 보존한다.

Gemini의 현재 일반 유료 list rate는 입력 US$0.75/M·thinking 포함 출력 US$3.75/M(2026-12-31까지)이다. usageMetadata 기반 추정치와 실제 청구/무료 계정 적용은 구분한다. Florence는 [500 실행초/credit](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api/pricing)인 VLM 요금이다. 응답 time이 있으면 processing-time 추정만 하고, 없으면 UNKNOWN이다. 클라이언트 wall 시간을 청구 GPU 시간으로 바꾸지 않는다. 실제 billed USD/credit은 응답으로 확인되지 않으면 null이다. 일부 인증 실패도 과금될 수 있어 임의 키 검사·재시도는 하지 않는다.

모델 alias/요청 hash는 고정하지만 호스팅 weight revision은 응답 전 UNKNOWN이다. 준비 파일은 제품과 연결하지 않았고 실제 모델 정확도·속도·계정 인증은 미검증이다.
