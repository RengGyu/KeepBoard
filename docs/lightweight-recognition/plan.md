# 실행 순서와 소유권

사용자의 구현·비교 승인이 이미 있다. 아래 routine 선택은 별도 일반 승인 단계 없이 진행한다. 배포/새 유료 인프라는 제외한다. 연구아스트라는 계약 checkpoint를 맡고 소스 수정/모델 실행은 하지 않는다.

| 순서/담당 | 소유 파일·작업 | 인계/완료 증거 |
|---|---|---|
| 0 — Sol2 단독 | **현재 공유 소스에서 새 격리 stage를 한 번만 생성.** src/server/shared/gamepacks/workflows/gateway/tools/tests 및 필요한 package/build 설정을 명시 allowlist로 복사. 기존 frozen stage/공유 사용자 수정은 불변. .git/.keepboard/환경·자격·사용자사진·세션·기존 빌드/연구 archive는 복사하지 않음 | 선택 파일 preimage SHA와 제외 목록. 기존 소스를 reset/clean/stage/commit하지 않음. 새 stage 경로를 감독이 두 worker에 전달 |
| 1 — Sol1 | read-only hardware/assets/runtime inventory. `src/**`, 신규 제안 `game-photo-definitions/**` 및 해당 generator/test만 담당 | 실제 OS/CPU/GPU/RAM·runtime 버전/미설치, 모델/projector 필요 파일, 기존 아트의 schematic/physical/licensing 분리. 키/개인원본 없음 |
| 1 — Sol2 | 명시 배정받은 `shared/**`, `server/**`(ai 포함), `gateway/**`, `workflows/**`, backend tests. 필요 package/script 변경도 Sol2 단독 | contract v1 타입/컴파일러, real reader adapter, mapper와 기존 job 연결. Sol1 정의 파일은 수정하지 않음 |
| 2 — Sol1 | Catan 사진/frame 확인·원본/후보/정정 UI, 게임 촬영 정의 생성. 현재 SceneWorkspace/Capture/PhotoTargets 재사용 | 실제 이미지의 geometry 후보→교환/정정→명시 반영→저장/reload. Splendor 같은 reader 경로도 표시 |
| 2 — Sol2 | 같은 stage의 고정 정의를 읽어 Catan native·Splendor·117typed·Rummikub bridge 연결 | 모델 body/output receipt, 원본 좌표/값 보존, owner/epoch/범위 검증, 부분 상태 보존. mock만으로 완료 표기 금지 |
| 3 — 기존 Claude | 감독이 frozen diff와 계약/실측만 전달해 code review. 새 thread/모델을 연구 worker가 만들지 않음 | 코드 결함과 사진 품질 미확인을 분리. 원시 비밀/전체 대화 전달 없음 |
| 4 — Astra/감독 | 감독이 실측/리뷰 결과를 제공하면 architecture checkpoint. 감독이 최종 통합/사용자 설명 | 정확도/시간/비용·한계로 A/B/보완 판단. source 배포는 별도 범위 |

Stage 준비는 [stage-manifest.json](stage-manifest.json)에 인계됐다. 감독 보고는 source preimage1,352개 동일 복사이며 manifest도 copy mismatch/read drift와 shared/frozen 수정 여부를 기록한다. **단계0을 다시 실행하거나 이전 frozen 사본을 편집하지 않는다.** 구현자는 인계된 stage에서 자기 소유 경로만 수정한다.

**구현 시작 인터페이스 — 제안 symbol, 아직 제품에 없음**

- `shared/lightweightRecognition.ts`: `PhotoDefinition`, `ObservationRequest`, `ObservationResult`, `GeometryCandidate`, `compileObservationTask(pack, area, scope)` / `validateObservationResult`. [contract.json](contract.json)의 wire schema와 동적 per-game allowlist를 구현한다. JSON Schema만으로 scope/판본/해시 검증이 끝나지 않는다.
- `game-photo-definitions/index.json` + generator: Sol1 소유. 기존 `shared/capture-profiles.json`, `shared/readouts/catalogs/*.json`, `gamepacks/generated/game-essentials.json`에서 생성한다. 120개의 ID/판본/source는 그대로; 승인된 최소 native property bridge만 부가한다. `contract.json.games`를 전수 연결 기준으로 삼되 source 변경 시 조용히 재귀속하지 않는다.
- `server/ai/localReader.ts`: Sol2. 실제 llama.cpp 이미지 Chat Completions에 컴파일한 schema/prompt와 원본 또는 atlas를 보낸다. 기본 paid gateway/alias를 덮어쓰지 않는 명시 reader 선택. daemon을 매 사진마다 재시작/weight 재다운로드하지 않음. 프로그램 시작과 warm request 시간 분리. 작은 로컬 설치/weight 취득은 구현 범위로 승인됐다. Sol2가 새 stage 전용 runtime/cache에 단독 준비하고 hash/license를 기록한다. 시스템 전역 설정·기존 운영 alias를 바꾸지 않는다.
- `server/ai/observationAssembly.ts`: Catan→`normalizeSceneDetailed`, Rummikub→`normalizeRummikubDetailed/normalizeRummikub` 연결, Splendor→`validateSplendorObservation`, typed→`validateGameReadout`. UUID/근거/nullable manual을 코드로 생성한다. 추가 해석 LLM 없음. opaque/physical state는 보존만.
- `shared/photoGeometry.ts`: frame/point·homography/변환 조합·slot 후보. 현재 프로젝트에 없는 일반 CV 프레임워크를 먼저 만들지 않는다. 기존 native topology 좌표를 사용하고 행렬 변환/퇴화 검증을 작은 순수 함수로 둔다. 자동 feature matching은 자료/라이선스/실측이 확보될 때 B1의 작은 추가다.
- `server/ai/index.ts`의 `analyzeEvidence`, `server/analysisTask.ts`의 `AnalysisTask/commitAnalysisTask`, `server/index.ts` job 시작에 reader plan/definition/input SHA를 고정한다. 기존 `AnalysisJobs/CloudJobs`·유료 retry0·candidate-only·명시 적용을 재사용. 서버 job에 실제 모델 완료가 없으면 simulated/unavailable로 기록하며 live 성공으로 부르지 않는다.

**Catan v1의 구체 입력/출력**

public `board`, 현재판본/source를 핀한다. A: 원본→terrain/number-token/robber 등의 literal 관측+사진 bbox. B0: 같은 원본+확인 frame→지형 panel atlas→같은 literal 필드. B의 panel ref는 원본 polygon 및 hex 후보와 대응하지만 값을 제공하지 않는다. atlas를 모델이 재출력한 index로 임의 위치 재배열하지 않고 요청에 존재하는 panel만 수용한다. 한 panel에 여러 물체가 있으면 분리하며 숫자가 가려졌으면 null. 근거 crop을 synthetic atlas 좌표만으로 저장하지 않는다.

지형과 숫자가 완주한 뒤 도로/건물/항구를 같은 컴포넌트 allowlist로 이어서 비교하되, full coverage를 자동 선언하지 않는다. Catan 첫 결과에서 model slot 문자열을 받아 바로 위치를 확정하지 않는다. 프레임 없이는 미배치, 프레임 있으면 geometryCandidate, 사용자 반영 후 native location. 다른 native state나 이전 accepted layer를 지우지 않는다.

**필수 최소 검사**

1. 120 ID 정확히 일치, duplicate0. source/edition/pack version/readout schema 불일치 시 현재 saved record는 보존하고 새 판독만 거절. visible/manual/physical 분리 전수 확인. 이것은 120게임 실물 정확도 검사가 아니다.
2. literal0/null, 알 수 없는 색/심볼, 앞면 아닌 카드, 같은 숫자 두 실물, 가림/범위 밖, 잘못된 imageIndex/field/owner/epoch. 비용≠수량·사진색≠플레이어·코드 기하≠모델 사실. unknown reason은 모름을 없애는 근거가 아님.
3. crop/rotation/atlas 왕복 좌표와 기준점 퇴화/오류. Catan hex 확인 후 지형/숫자 반영, 충돌·unplaced·부분범위·기존 말 유지. source bbox를 canonical placement로 직접 쓰지 않음.
4. 실제 로컬 reader가 승인된 사진을 받고 최종 JSON을 반환하는 smoke와 end-to-end 저장/reopen. model absent/비정상 종료/truncation/OOM은 FAILED 또는 UNKNOWN이며 성공 synthetic 응답으로 대체하지 않음.
5. 기존 scene/native/readout/component-linking/job 관련 focused tests. UI390px에서 실제 사진·후보 정정. 마지막 frozen 통합본에 typecheck/build와 해당 회귀를 한 번 수행; 이후 새 실패/변경 없으면 반복하지 않음.

**다음 bounded 실제 비교 — 승인된 구현·로컬 비교 범위에서 실행, 이 연구는 실행0**

- 첫 checkpoint는 **Catan 기존 문제 사진1+미사용 다른 실제판1, Splendor 시장 미사용1**의 최대3원본. 이미지/판본/권리가 확인된 승인 corpus만 사용. 기존 문제 사진은 diagnostic, 새 판은 holdout으로 구분하고 crop을 별도 독립 표본으로 세지 않는다. 소장 사진이 없으면 기존 public corpus로 시작하고 미확인 edition/GT를 그대로 남긴다.
- A/B0 각1회/원본: 최대6 local reader requests, automatic retry0, 동시1. 별도 첫 load/ready 및 첫요청 cold 여부 기록. B1 참조가 없으면 B0로 기록하고 참조 실험했다고 하지 않는다. 추가로 설치된 Tesseract의 Catan 숫자 OCR1회(별도 CPU 보조, 학습 reader6회와 분리)를 허용된 비교 카드에서 수행할 수 있다. OCR 성공을 전체 판독 성공으로 합산하지 않는다. 실패 후 임의 모델 변경·무제한 재검색/재콜은 없음. 이 수는 자원 제한이지 품질/시간 합격선이 아니다.
- A/B의 literal GT 범위를 사전에 동일하게 고정한다. Catan terrain·실제 읽을 수 있는 number·robber, Splendor 읽을 수 있는 points/bonus/cost. 조립 위치는 별도. GT 미확인은 분모에서 은폐하지 않고 unscorable로 기록. bbox 매칭은 값과 독립적으로 정한다. slot 정답은 사용자 frame을 제공한 B에서만 따로 채점한다.
- 기존 paid 결과는 이미 실행된 diagnostic baseline으로 사용한다. 동일 조건의 새로운 cloud 비교가 꼭 필요해지면 필요한 원본/조건/최대 요청수를 감독에게 요청하며 이전 허가를 재사용하지 않는다. 이번 로컬 비교에 paid provider 자동호출0.
- 보고: 속성 정답/오독/null/미대응, FP/누락/중복, bbox/slot, 원본→후보와 후보→수정→저장/reopen, 사용자 조작 수, load/encode/inference/parse/assembly 시간, output length/truncation, peak memory와 실제 backend. Local provider fee0, 기기/전력/호스팅 실비 UNKNOWN. KRW 임의 환산/150초 이하 합격 같은 기준 없음.
- 결정: 실제 동작 여부를 먼저 확인하고 기존 경로보다 어떤 품질/시간/정정 부담이 달라졌는지 제시한다. 개선/악화가 섞이면 그 범위를 사용자에게 보여주고 다음 한 변수만 선택. 계약/기능 합격을 모델 품질 합격으로 승격하지 않는다.

**지금 필요한 것과 중단 경계**

Sol1 preflight의 M1/16GB/Metal·가용디스크·runtime/weight 없음이 출발점이다. Sol2는 공식 Q4_K_M와 F16 projector 및 호환 llama.cpp build 한 조합만 준비한다. 최초 context8192/output2048을 유한 smoke 설정으로 시작하되 이미지+schema가 실제 context에 들어가는지 확인한다. 초과/잘림은 실패로 보고하고 몰래 재요청하지 않는다. 이 숫자는 성능 합격선이나 전120게임 기본값이 아니다. 본인 machine에 실행할 수 없고 설치/weight도 제공받지 못하면 실제 inference 경로는 미완료다. 이때 인터페이스·촬영 정의·assembler·정정 UI는 계속 만들고, 필요한 모델 파일/호환 runtime 또는 사용할 기존 실행 host 중 가장 작은 결정을 감독에게 반환한다. 유료 GPU/새계정/서비스 구입을 대체 기본안으로 진행하지 않는다.

ECC search-first는 기존 함수와 공식 runtime 탐색, eval-harness는 사전 GT/실행 실패 보존에 한정했다. Ponytail 원칙으로 공통 reader1개·현재 저장모델 재사용·현재 기능을 끝까지 연결한다. 독립 학습·대형 RAG·새 평가 서비스·120개 비전 엔진은 없다. Astra는 이 계약을 인계한 뒤 후속 측정 결과를 받는 checkpoint에 대응한다.
