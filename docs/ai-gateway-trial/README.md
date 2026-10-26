# 연결 시험 결과 · 2026-10-21

**VERIFIED** 독립 loopback gateway 4330 및 프리뷰 4319 `/api/health`, `/api/settings` HTTP200. model `deepseek-flash`, alias `board-vision`, effort `high`. 기존 4320/터널 변경 없음. 기본/프리뷰 Gemini 설정 bytes 불변 확인, 라우팅 파일만 변경.

실제 호출 총 **2회**, 자동 retry/fallback 없음. 동일 모델/effort가 upstream 응답에도 확인됨.

|호출|HTTP|총시간|최종 JSON|확인 범위|
|---|---:|---:|---|---|
|간단 JSON smoke|200|1,055ms|정상|연결/최종 출력|
|공개 카탄 사진 239,177bytes|200|57,446ms|정상|기존 팩/프롬프트 경유 board.layout 후보1개·경고6개, 임시 Store만 저장|

시간은 단회 wall time이며 모델 순수 추론시간/평균 성능이 아니다. 인식 정확도는 독립 대조하지 않았으므로 미검증. 기존 Gemini와의 속도/정확도 우열 시험도 아니다. 안전한 수치 근거는 `smoke.json`, `photo.json` 참조. 원본 prompt/이미지/응답내용/키는 보고에 포함하지 않는다.

검증 exit0: gateway 합성회귀5개, 전체168테스트, `npm run typecheck`, `npm run build`. alias hot reload/provider/model/effort 변경, 이미지 bytes 전달, thought 제외/미완료/JSON오류/auth/timeout/비재시도, 기존 Gemini 복구를 합성 검증했다.

변경: `gateway/{package.json,server.mjs,server.d.mts,config.example.json,setup-local.mjs,live-test.ts,README.md}`, `server/ai/gateway.ts`, `server/ai/index.ts`, `shared/types.ts`, `.gitignore`, `tests/ai-gateway.test.ts`, 본 보고 및 JSON2개. 로컬 전용 `.local` secret/config/ledger와 각 dataDir의 `ai-routing.json`은 소스/보고 제외.

관리/다른 서비스 연결/복구는 `gateway/README.md`. 현재 gateway와4319는 별도 로컬 프로세스로 실행 중. commit/push/클라우드배포 없음.
