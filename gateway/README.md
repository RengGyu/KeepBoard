# Local JSON AI gateway

Node 22+ 별도 프로세스. KeepBoard 서버와 별개로 loopback `127.0.0.1:4330`에서만 실행한다. 4320 Cloudflare/Vercel 중계와 관계없다. 새 의존성 없음.

```sh
node gateway/setup-local.mjs /absolute/path/to/credential-file
node gateway/server.mjs
```

첫 명령은 키를 출력하지 않고 `gateway/.local/secrets/deepseek.key`(600)에 복사한다. `.local`/secrets 디렉터리는 700, config는 600, 전부 git 제외. 기존 파일을 덮어쓰지 않는다. 서비스 관리자가 `AI_GATEWAY_CONFIG=/absolute/config.json`으로 다른 관리 경로를 선택할 수도 있다. 키는 config에 직접 넣지 않고 provider의 `apiKeyFile` 또는 `apiKeyEnv`로 지정한다.

중앙 `gateway/.local/config.json`의 각 alias는 provider/model/effort/vision/timeoutMs를 독립 지정한다. 매 요청 config를 다시 읽으므로 alias 변경은 다음 요청부터 반영된다. 포트 변경만 프로세스를 재시작한다. 잘못된 config는 503이며 이전 설정/다른 모델로 fallback하지 않는다. DeepSeek vision은 확인된 `deepseek-flash`만 허용한다. Gemini는 effort 매핑을 임의 추정하지 않는다.

API: `GET /health`, `GET /v1/aliases`, `POST /v1/json`.

다른 프로젝트 서버에서 다음과 같이 사용할 수 있다. 브라우저 직접 사용 금지(Origin 요청 거절). URL은 upstream을 받지 않으며 gateway 내부 고정 provider endpoint만 사용한다.

```js
const response = await fetch('http://127.0.0.1:4330/v1/json', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({alias:'board-vision', prompt:'Return JSON describing this board.',
    images:[{mimeType:'image/jpeg',data:base64Image}]})
});
const {data,target,diagnostics,error} = await response.json();
```

최대 6장/HTTP body 80MiB. 입력 해상도/bytes를 변경하지 않는다. output_text 최종 JSON만 읽고 reasoning은 제외한다. 비정상 JSON/미완료/거절/auth/quota/timeout을 구별해 안전한 code/status만 반환한다. 자동 retry/fallback 없음. 로그에는 대상모델/effort와 시간/토큰수/사진수·크기만 남고 키·헤더·prompt·이미지는 기록하지 않는다. 동일 맥의 신뢰할 수 있는 로컬 프로세스를 위한 구조이며 원격 공개 gateway가 아니다.

KeepBoard는 각 데이터 경로의 `ai-routing.json`으로 연결한다:

```json
{"mode":"gateway","url":"http://127.0.0.1:4330","alias":"board-vision"}
```

서비스마다 다른 alias를 선택 가능. `KEEPBOARD_AI_GATEWAY_URL`, `KEEPBOARD_AI_ALIAS` 환경변수가 파일보다 우선한다. 현재 로컬 기본 `.keepboard/`와 프리뷰 `/tmp/keepboard-preview/data/`는 별도 데이터 경로이므로 각각 라우팅 파일이 필요하다. 라우팅은 요청마다 읽는다. `GET /api/settings`는 실제 alias 대상 model/effort를 반환하며 키를 반환하지 않는다.

복구: 환경 override가 있다면 제거한 뒤 해당 `ai-routing.json`을 `{"mode":"direct"}`로 바꾸면 기존 Gemini/OpenAI `ai-settings.json`을 다시 사용한다. 기존 설정/키는 수정하지 않는다. 이미 진행 중인 요청은 기존 대상을 사용한다. gateway 중단은 해당 4330 PID에 SIGTERM(또는 실행 터미널 Ctrl-C). 프리뷰 4319와 터널/4320은 별도 프로세스다.

검증: `node --import tsx --test tests/ai-gateway.test.ts` (합성 upstream), `npm test`, `npm run typecheck`, `npm run build`. 실제 호출은 `node --import tsx gateway/live-test.ts smoke` 다음 `photo`만. `.local/live-ledger.json`은 시도 전에 기록하고 총2회/동일 arm 재실행을 차단한다. 초기화하거나 재시도하지 않는다. 사진 출력 후보는 임시 Store만, 보고는 `docs/ai-gateway-trial/*.json` 메타데이터만.

공식 근거(2026-10-21 확인): [모델](https://api-docs.deepseek.com/quick_start), [Responses vision](https://api-docs.deepseek.com/guides/responses_api/), [reasoning effort](https://api-docs.deepseek.com/guides/thinking_mode/). HTTP/JSON 연결 성공은 사진 인식 정확도 검증과 별개다.
