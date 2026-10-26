# 사진 읽기 약 1분 — 현재 원인 진단

2026-10-23. **REPORTED:** 사용자는 ‘1분 정도’라고 답변. 게임명·사진장수·완료/오류·요청ID는 미확인. 따라서 **정확한 현재 요청 타이밍 UNKNOWN**이며 과거 Splendor 48~97초를 이번 요청 시간으로 대입하지 않았습니다. 대기 요청 중단/재시도/실AI호출0.

## 확인된 사실과 구간

|구간|VERIFIED / 확인 한계|
|---|---|
|현재 설정|공개 status whitelist `configured=true / gateway / deepseek-flash / deepseek / high`. 모델·옵션 변경0. [status.json](status.json)|
|업로드·사진|원본 해상도·바이트를 보존해 보내며 서버는 base64로 읽습니다. 사진 읽기는 선택 owner의 최근 최대6장, 신규 sweep은 실제 저장된 해당 run ID만 사용. **현재 사진 수/크기/업로드 시간 UNKNOWN**; 사용자 사진파일/세션내용 미열람.|
|요청 scope|현재 게임·공개 또는 본인 허용 binding의 component만 prompt에 포함. `gameReadoutPrompt`는 현재 source/edition/version 정의 한 개를 선택. **다른117게임 schema 전체 동봉 아님**.|
|중복·대기열|동일 UI run의 in-flight/analysisClaimed 방지, 버튼 busy guard, gateway fetch 자동retry 없음. owner+epoch 별/6장 batch 단위 순차 분석. 비room은 같은 세션 변경 queue 안에서 분석하므로 다른 요청이 먼저 있으면 추가 대기 가능. **실제 현재 중복/대기열 길이 UNKNOWN**.|
|모델·네트워크|gateway는 detail=high, reasoning high(현재 status), stream=false로 최종 JSON을 받아야 화면에 결과 반환. 입력 업로드/외부 queue/추론/출력 수신이 합쳐진 roundtrip이지 ‘순수 모델 추론시간’이 아님. **현재 구간시간/토큰/실패 여부 UNKNOWN**.|
|파싱·검증|아래 source-only 합성 오프라인 50piece 검사에서 ms 단위. **휴대폰/현재 사용자 응답 실측 아님**.|
|결과/UI|Server-Timing과 scanTiming은 기존 응답헤더·해당 브라우저의 memory/performance에 남음. 현재 사용자 탭/요청을 특정하지 못해 회수하지 않음. nonroom 헤더는 응답 후에만 제공, room analyze는 해당 timing헤더 연결 없음. 결과를 받기 전 UI는 ‘사진 읽는 중’으로 대기.|

## 오프라인 재현 (실제 모델·사진 없음)

`node --import tsx docs/photo-read-latency/offline.mts` **exit0**. 현재 코드·팩, fake source 1개, 2대표만 검사. [수치 원문](offline.json).

|대표|prompt 문자 / UTF8 bytes|다른 게임 schema|prompt 조립|50piece JSON 왕복 / typed검증|
|---|---:|---:|---:|---:|
|Splendor|5803 /5902|0|0.55ms|0.18ms /2.65ms|
|Carcassonne|7902 /8557|0|0.34ms|0.15ms /2.38ms|

1회 탐색값이고 캐시/환경 편차 미측정. 문자 수는 토큰 수가 아닙니다. 신규117 상세 계약이 없는 Splendor에도 같은 대기 경로가 있으며 위 오프라인 값만으로 실제 모델 시간·게임 간 속도를 비교하지 않습니다.

## 판단·다음 최소 조치

**INFERRED:** 코드상 외부 모델/전송·출력 완료 대기가 큰 비중일 가능성이 있습니다. 현재 관측만으로 약60초를 ‘정상’ 또는 ‘장애’라고 단정할 수 없습니다. 불필요한 다른게임 schema 동봉/자동재시도/분 단위 로컬 JSON 처리의 직접 근거는 없어 **억지 코드 수정 없음**. high 설정만으로 현재 60초의 원인을 확정하지 않습니다.

**다음 최소 조치:** 현재 요청은 다시 누르지 않고 완료/오류를 기다립니다. 같은 요청의 Server-Timing(provider/images/normalize/queue) 또는 기존 gateway 숫자진단을 확보할 수 있을 때 병목을 확정합니다. 현재 stdout이 파일이 아닌 gateway pipe라 과거 완료 메타를 회수하지 못했고, backend 일반 로그에는 단계 timing이 기록되지 않습니다([metadata.json](metadata.json)). 요청·사진을 열어 식별하거나 새 분석으로 추측을 보완하지 않았습니다. 속도 우선 모델/추론등급 변경은 별도 제품 선택과 품질 확인이 필요하며 이번에 변경/성능개선 약속을 하지 않았습니다.

## 기존 코드의 속도 우선 선택지 (설정 미변경)

**VERIFIED — 앱 계약만:** gateway config validator는 `effort: low`와 `effort: none`을 허용하고 Responses 요청의 `reasoning.effort`로 그대로 전달합니다. effort 생략도 허용되며 이때 reasoning 필드를 보내지 않습니다. **medium은 현재 코드에서 거절**합니다. 순수 synthetic config 검사 low/none/생략 허용·medium 거절 **exit0**, credential read/network/model 호출0 (`gateway/server.mjs:26,69`).

**UNKNOWN — 현재 DeepSeek 동작·품질:** 이번에 low/none을 실제 provider에 호출하지 않았으므로 수락 여부·속도 개선폭·판독 품질 영향은 미측정입니다. `none`이 실제 비추론 모드가 되는지 검증하지 않았고, 명시 `thinking disabled` 같은 별도 토글은 현재 adapter에 없습니다. effort 생략 역시 비추론을 보장하지 않습니다. 따라서 **기존 코드상 선택 후보는 low/none이지만 바로 검증된 빠른 설정이라고 제시하지 않습니다.** 현재 요청 및 alias는 high 그대로입니다.

근거: `server/ai/index.ts:194`(6장/owner·epoch 분석), `server/ai/gameReadouts.ts:29`(현재 게임 scope), `gateway/server.mjs:69,116,122`(최종응답/숫자진단), `server/index.ts:155,325`(queue/분석), `src/SessionWorkspace.tsx:105,127`(inflight/사진읽기), `src/scanTiming.ts`(비민감 메모리 timing).

제품 소스/설정/프로세스/배포 변경0, 사용자 기록·사진 열람0, 실AI0, 전체test/build0. 문서와 오프라인 프로브만 작성. 소유권 반환.
