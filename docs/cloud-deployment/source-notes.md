# 확인한 현재 소스 경계

- `server/index.ts:76` createApp / `:519` production static / `:537` 실행부: Express 상시 listen, production dist 제공, HOST/PORT 지정 가능. HTTP JSON은80MB.
- `server/store.ts:34` constructor: KEEPBOARD_DATA_DIR, JSON atomic rename, uploads binary. 기본 임시 컨테이너 filesystem으로 이전하면 자료가 없어지므로 별도 영속 경로가 필요하다.
- `server/privatePin.ts:14` records: 같은 root/private-pins.json. unlock token/실패횟수는 프로세스 메모리다. `server/rooms.ts:15` actor는 sessions의 membership과 기기cookie 해시를 사용한다.
- `server/analysisJobs.ts:7` AnalysisJobs: 단일 프로세스 최대동시2/최대16, root/analysis-jobs에 저장. 재시작 시 오래된 완료작업을 정리하고 active는 interrupted 또는 기존 receipt로 복구한다. 수평2replica로 늘리는 구조가 아니다.
- `server/ai/gateway.ts:10` gatewaySettings: env KEEPBOARD_AI_GATEWAY_URL 우선, loopback만 허용. app/gateway를 서로 다른 Docker network hostname으로 분리하면 그대로는 연결되지 않으므로 이번 런처는 같은 프로세스/네트워크를 사용한다.
- `gateway/server.mjs:73` upstreamRequest: apiKeyEnv 지원. `:69` reasoning effort 포함. `:133` startGateway는127.0.0.1 bind. 기존 high/vision/timeout값을 공개 config로 옮기며 key 본문은 runtime/env에만 둔다.
- `server/ai/index.ts:18` dataDir / directSettings와 readImage: 같은 Store 아래 설정·사진. direct Gemini/OpenAI 경로로 우회하면 현재 DeepSeek/high 설정을 그대로 보존할 수 없으므로 선택하지 않았다.
- `server/index.ts:251` roomOrigin, `:79` private token, uploads guard: Vercel→nginx→앱에서 Origin/Host/X-Forwarded-Host와 cookie/private-token 헤더를 보존해야 한다. 합성 직접 전달 경로는 확인했고 실제 cloud/Vercel proxy 경로는 후속 gate다.

변경은 `docs/cloud-deployment`와 독립 temp snapshot에만 있다. 기존 server/shared/src/public/gamepacks는 읽기 전용이며 새 schema/DB/모델 기능을 추가하지 않았다.
