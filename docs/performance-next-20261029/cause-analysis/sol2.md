# 이전·축약 실험·현재의 구현 비교

**VERIFIED:** 이번 누락은 화면에서 지운 결과가 아니라 공급자가 반환한 JSON 장면부터 8개였다. [진단](../../release-next-20261029/candidate-output-diagnosis.json)은 raw 장면 8, literal 8, 표시 8, 충돌 없는 단일-member 링크 8을 기록한다. 따라서 이 실행의 49→8을 decoder/연결 과정에서 행이 사라진 것으로 설명할 근거는 없다. **UNCLEAR:** 어느 입력 변경이 누락을 일으켰는지는 분리 실험이 없어 확정할 수 없다.

| 항목 | 이전 운영 | 거절한 축약 실험 | 현재 복원본 |
|---|---|---|---|
| Prompt 구성 | `observationPrompt` 전체 + 카탄 보드 편집기 지시 | 카탄 한 장용 직접 작성 지시; 공통 prompt 호출 제거 | 이전 native 모듈 bytes 복원 |
| 합성 fixture prompt 문자 수 | 14,893 | 2,263 (−84.8%) | 14,893 |
| 응답 schema | 기존 scene 전체 필드 유지; variant/ownerId/evidenceId 포함 8개 필수 | 같은 필드·enum·description·envelope 유지; 위 3개만 필수에서 제외 | 기존 8개 필수 복원 |
| 같은 fixture schema 문자 수 | 4,253 | 4,220 (−0.8%) | 4,253 |
| 실제 native 요청 코드 | 원본 bytes 한 장을 inlineData로 전송 | 같은 `readCatanScene` 메서드 | 이전 메서드와 byte 동일 |
| native decoder | 공급자 JSON을 기존 normalize로 전달, 원 assertion을 receipt에 보존 | clone에서 누락 evidenceId만 확장; 한 장/source 일치 guard 추가 | 확장/추가 guard 모두 제거; 이전 bytes 복원 |
| 준비·스캔 | 기존 hosted 준비/native 경로; 별도 scanObservation 모듈 없음 | 사진별 scan unit; anchor는 native, detail/crop은 literal; 최대2개 | 같은 scan orchestration 유지, native prompt/schema만 복원 |
| 실제 한 장 비교 결과 | 지형19+숫자17+도둑1+정착지8+도로4=49 | 지형4+숫자3+도둑1=8; raw가 full도 잘못 주장 | 이번 조사에서 재호출하지 않음 |

문자 수는 **실제 outbound payload를 보관해 센 값이 아니라**, 동일한 합성 fixture(`photo`, 공용 epoch, 빨강 플레이어 한 명)를 현재 함수와 snapshot 함수에 넣어 재현한 값이다. 토큰 수나 인과 효과를 뜻하지 않는다. schema 재귀 비교에서 유일한 차이는 `/properties/assertions/items/properties/value/properties/components/items/required` 배열이었다.

**VERIFIED — 실제 모델 입력에 영향을 줄 수 있는 변경:** prompt 교체와 schema required 변경은 `generationConfig.responseFormat`/텍스트에 직접 들어간다. 반면 누락 evidenceId 확장과 null quantity 보정은 공급자 응답 **이후** 처리이므로 공급자 JSON 자체가 8개였던 일을 직접 설명하지 않는다.

축약에서 실제로 빠진 지시·문맥은 다음이다.

- `CURRENT GAME CAPTURE CONTRACT`의 pack/선택 부분 설명과 관측 가능한 필드의 label·description·scope/type 목록. 게임 edition/version 문맥, 사진 label·capturedAt·captureEpoch도 빠졌다. 플레이어 정보는 전체 객체에서 id/color만 남았다. [기존 prompt 15–24행](../../../server/ai/prompt.ts:15), [capture contract 44–47행](../../../shared/photoCapture.ts:44).
- 본문에 중복 삽입하던 전체 scene JSON schema와 confidence/reason 등을 포함한 예시 envelope. 외부 structured schema의 속성 설명·enum 자체는 축약에서도 유지됐다. [기존 scenePrompt 8–10행](../../../server/ai/scenePrompt.ts:8).
- 같은 실물을 여러 사진에서 중복 세지 않는 상세 merge/대표 source/출처 순서 규칙. 항구의 legacy 표현·모든 해안 확인·모순 비수정 규칙과 opaque player id/name 및 자원 그림 색의 오인 방지 예시도 짧게 축소되거나 생략됐다. [기존 13–17행](../../../server/ai/scenePrompt.ts:13).

**VERIFIED — 빠지지 않은 중요한 지시:** 축약에도 작은·겹친·가장자리 실물 탐색, 도로/정착지/도시/도둑/항구, 지형과 숫자판 구별, 보이는 실물은 값/위치가 안 읽혀도 보존, 19칸을 실제 확인해야 full, 빈 inventory를 만들지 않기, null/관측0 구별, 소유자와 관측색 분리, hex/edge/vertex 및 원본 bbox 좌표, front face/attachment 보존이 명시돼 있었다. 따라서 “도로 지시를 삭제해서 도로가 빠졌다” 또는 “상세 지시를 전부 없앴다”는 설명은 코드와 맞지 않는다. [축약 snapshot 18–22행](../rejected-short/catanSceneReading.ts.snapshot:18).

**VERIFIED — 요청에서 유지된 통제:** 원배포에서 복구한 [reader snapshot 101–108행](baseline/geminiGameReader.ts.snapshot:101)의 `readCatanScene` 메서드는 [현재 101–108행](../../../server/ai/geminiGameReader.ts:101)과 byte 동일하다(메서드 SHA256 `eb9547f6ed70d01a346bab6cdf241d20cb3d416a9a85dcab3779718b91bf5637`). 모델 alias `gemini-3.8-flash`, candidateCount1, maxOutputTokens32768, thinking LOW, media HIGH, JSON schema, v1beta generateContent endpoint, timeout180초, user text+inline 원본 한 장이 같다. seed/temperature/topP는 이 메서드에서 별도 지정하지 않는다. Reader 파일 전체 변경은 generic/crop 경로의 transforms 전달·검증이다. 원배포와 현재의 `prepareHostedObservation` 함수도 byte 동일하다(SHA256 `2207c61da71e1b3b4d919513a2f5ea78acbd21a5e7db0093526866aaf76bcde8`).

**VERIFIED — 사진과 경로:** [기존 기록](../../release-next-20261029/live-baseline.json)과 [실험 기록](../../release-next-20261029/live-candidate.json)의 sourceSHA가 동일하며 각1회/retry0이다. [실행 스크립트 41–53행](../../release-next-20261029/live-native-check.mjs:41)은 같은 JPEG를 업로드하고 evidence 한 장, 공용 board, 동일 플레이어 id/color로 요청한다. frame/crop/target을 보내지 않는다. 실험의 scan 첫 unit은 anchor이므로 이 한 장은 native를 사용한다([경로 47·56행](../../../server/scanObservation.ts:47), [native 선택 28–34행](../../../server/hostedObservation.ts:28)). 최대2개 병렬화가 한 장을 둘로 자르거나 native 대신 literal로 바꾼 것은 아니다.

**UNCLEAR — 남는 혼재요인과 자료 한계:** 두 조건은 별도 세션·시점·배포에서 각1회 실행됐고 사진/evidence ID·epoch/시간 메타는 달라진다. 애플리케이션 전송은 운영 fetch와 실험 vercel-curl로 다르다(이 차이가 모델 입력 내용을 바꿨다는 증거는 없다). prompt와 schema를 동시에 바꿨으며 scan/투영 변경도 같이 배포됐다. 원배포/실험의 실제 outbound provider JSON 전체와 response envelope의 finishReason·usageMetadata·modelVersion·토큰 사용량은 이 live 보고서/receipt에 저장돼 있지 않다. [스크립트 60–76행](../../release-next-20261029/live-native-check.mjs:60)은 timing/count/save 보존만 보고하고, [native decoder](../../../server/ai/catanSceneReading.ts:22)는 assertion JSON만 receipt로 남긴다. job completed나 보고서 PASS는 provider STOP/내용 완전성 또는 인식 정확도 통과의 증거가 아니다.

**VERIFIED — 비교의 provenance:** [rejected stage 6–15행](../../release-next-20261029/rejected-candidate/stage.json:6)은 native SHA `d89caf…→9a2a50…`, [현재 stage 6–15행](../../release-next-20261029/stage.json:6)은 `d89caf…→d89caf…`를 기록한다. 현재 native SHA256은 `d89caf23705771a6c5113cef83f0ab669f0beb8b82bf3c8d881aa8cbb9b885bf`다. 기존 `recovered-production-source.json.stage` 폴더는 이후 overlay됐으므로 그 폴더를 원배포 bytes로 취급하지 않았다. 원 reader/hosted bytes는 [baseline manifest](baseline/manifest.json)의 beforeSHA와 일치하는 별도 snapshot을 사용했다.

**FAILED:** 축약 실험은 철회됐다. 21.340초는 객체가 대량 누락된 실행시간이며 품질을 유지한 30초 달성으로 계산할 수 없다. 현재 복원은 확인한 기존 prompt/schema를 되돌린 것이며, 복원 후 동일 사진의 새 인식 결과는 이 조사에서 측정하지 않았다. 제품/테스트 변경·추가 모델 호출·배포 없이 정적 diff와 합성 함수 probe만 수행했다.
