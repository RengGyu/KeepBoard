# Gemini 3.8 게임 사진 제품 경로 인계 (2026-10-26)

## 현재 상태

백엔드는 `reader.kind: "gemini-game-observation-v1"`을 기존 `/api/sessions/:id/analysis-jobs`에 연결했다. 현재 게임팩/사진 정의와 촬영 epoch·영역·원본 SHA를 고정하고, Gemini 3.8 Flash의 `LOW` 사고 수준·`MEDIA_RESOLUTION_HIGH`·출력 한도 32768로 사진의 보이는 실물만 읽는다. 완료된 네이티브 JSON은 기존 관측 검증·게임별 조립을 거쳐 **후보**가 되며, 확정된 수동 상태를 자동으로 덮지 않는다. 기존 명시 검토 저장·재개 API를 그대로 쓴다. 모든 사진 판독 대상 필드는 현재 동적 `PhotoDefinition`에서 정한다. 특정 카탄 definition SHA는 제품 코드에 고정하지 않았다.

서버 전용 키는 `KEEPBOARD_GEMINI_GAME_API_KEY_FILE` 절대 경로나 `GEMINI_API_KEY`로 공급한다. 파일값은 실제 요청 시 메모리에서만 읽으며, 토큰·접두·해시를 출력하지 않는다. 기존 업로드 형식의 명시 라벨과 구분자, JSON `api_key`, BOM, 백틱, 마침표 포함 토큰을 합성 검사했다. 실제 키 내용은 확인하거나 출력하지 않았다. 기존 서비스 설정과 기본 AI 경로는 변경하지 않았다.

`src/**`는 이번 작업에서 편집하지 않았다. 화면의 판독기 선택·후보 확인·빠른 편집은 별도 UI 담당 작업이다. 제품이 Gemini를 선택 가능하게 표시하려면 UI가 `GET /api/recognition/readers`의 hosted 항목을 읽고, 작업 POST에 아래 `reader`를 넣어야 한다.

```json
{"kind":"gemini-game-observation-v1","definitionSHA":"<현재 정의 SHA>","areaId":"<선택한 촬영 영역>"}
```

`ObservationReceipt.reader`와 `AnalysisJob.reader`는 로컬·hosted 구분 유니온이다. hosted 결과를 로컬 리더로 표시하지 않는다. 공용 사진과 선택한 owner-private 사진은 각자의 허용 영역만 읽고, 차례·소유자·역할·가린 면은 이미지에서 추측하지 않는다. 일반 원본 사진 경로를 지원하며, 확인된 카탄 공용 판의 선택적 frame만 기존 제한으로 허용한다. 동영상·여러 프레임 병합은 지원하지 않는다.

## 확인 근거

- 합성 wire/검증/범위/키 형식 검사 **6/6**, 실제 HTTP 모의 job→후보→정정→commit→resume 검사 **1/1**, `npm run typecheck` 종료 0.
- 로컬 포트 검사는 sandbox 안에서 `EPERM`이 나서 허용된 로컬 실행 권한으로 재실행해 통과했다. 외부 모델 호출은 **0회**.
- 소스: [Gemini 네이티브 판독](/Users/jeonggyuju/Project_folder/KeepBoard/server/ai/geminiGameReader.ts), [사진·영역 고정](/Users/jeonggyuju/Project_folder/KeepBoard/server/hostedObservation.ts), [작업 API](/Users/jeonggyuju/Project_folder/KeepBoard/server/index.ts). 현 SHA는 각각 `a669683b3e2b8dcbfd1c3ec60a3405a683c60ee11a05eb23f26e0e1575627813`, `aedeab507300efa3960b597f16b515ac0d60c435a9f8d303497780e8a190954d`, `c92d327801da58b1a6e402664c2a0f7c123d9dc4c0e3c403b0bd8d16848c34e1`.

## 격리된 실제 제품 스모크: 준비만, 실행 안 함

[product-smoke.mts](/Users/jeonggyuju/Project_folder/KeepBoard/docs/gemini-game-integration/product-smoke.mts)는 승인된 첫 카탄 사진의 SHA를 확인하고 별도 임시 저장소/임시 로컬 포트에서 합성 세션을 만든다. 기존 도로를 수동 확정한 뒤 원본 사진 한 장을 업로드한다. 분석 작업은 정확히 **1개**만 시작하고 재시도하지 않는다. 완료되면 후보 중 지형 하나를 **합성 정정**해 명시 검토 저장·재열기한다. 보고에는 작업 상태, 후보·실물 수, 도로·영수증·정정 유지 여부만 넣는다. 모델 원문과 키는 출력하지 않는다. 실행 시 새 임시 저장소가 생성되며 운영 기록·`.keepboard`는 쓰지 않는다. 단, 사진 업로드와 응답은 그 격리 저장소 안에 남으므로 사용 후 소유자가 보존/삭제를 결정한다.

검토자가 아래 경로와 코드·현재 동적 정의를 사전 대조한 다음 실행한다. 두 명령은 같은 **아직 존재하지 않는** `--data-dir`을 사용한다. `check`는 외부 호출 0이고, `execute`만 Gemini 호출 최대 1회다.

```sh
KEEPBOARD_GEMINI_GAME_API_KEY_FILE=/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API node --import tsx docs/gemini-game-integration/product-smoke.mts --mode check --data-dir /private/tmp/kb-gemini-product-smoke-20261026 --photo /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/paseo-attachments-BMUIjY/823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6.jpg
KEEPBOARD_GEMINI_GAME_API_KEY_FILE=/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API node --import tsx docs/gemini-game-integration/product-smoke.mts --mode execute --data-dir /private/tmp/kb-gemini-product-smoke-20261026 --photo /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/paseo-attachments-BMUIjY/823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6.jpg
```

한 번의 요청 상한은 모델 출력 32768토큰·180초다. 기존 단가와 사진 1장·프롬프트 규모 기준 **$0.20 미만 계획치**이며 실제 청구액은 응답 후에도 별도 확인이 필요하다. 코드는 중복 작업 시작을 막기 위해 `single-attempt.claim`을 선점한다. 실패·중단 시 이 파일과 결과를 유지하고 자동 재호출하지 않는다. 스크립트 SHA: `44b37b97ff73da51b6d9db3c96c9cce66f254090ff91725cad8cb877d724f586`.

## 남은 작업

1. 별도 UI 작업을 통합하고 실제 버튼이 hosted capability·선택한 area·현재 definition SHA·작업/후보 상태를 정확히 전달하는지 확인한다.
2. 현재 게임팩/사진 정의 생성본이 동결되면 타입·빌드·전체 회귀를 감독이 최종 실행한다. 생성본 SHA 변경은 제품 코드에 상수로 반영하지 않는다.
3. 검토 후 위 격리 스모크를 **1회만** 실행한다. 모델이 후보를 내지 않거나 일부 값을 잘못 읽으면 그 상태를 그대로 기록한다. 성공 전에는 실제 인식 정확도나 전 게임 품질을 주장하지 않는다.
4. hosted 경로의 운영 배포·활성화는 별도 최종 검토 대상이다. 이 인계에서는 배포와 서비스 설정 변경을 하지 않았다.
