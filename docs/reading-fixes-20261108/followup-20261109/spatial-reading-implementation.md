# 공간 판독 연결 구현 — 2026-11-09

VERIFIED: 일반 사진/스캔 단위의 선택적 공간 결과를 Terra high v7 및 Gemini 요청 → 관측 조립 → 기존 편집/저장/재개 → 전용 판 표시까지 연결했다. 기본값은 꺼짐이다. 실제 provider 호출·유료 모델 호출은 **0회**다. 입력 연구 문서는 수정하지 않았다.

UNCLEAR: 도구로 현재 세션의 effective 모델/추론 설정을 확인할 수 없었다. `gpt-6.1-sol / high`라는 실제 적용값을 검증했다고 주장하지 않는다. 모델 변경·새 에이전트 생성은 하지 않았다.

## 스위치와 요청 호환

서버 환경변수는 하나다.

```sh
# 미설정 또는 1 이외 값: 기존 요청
KEEPBOARD_SPATIAL_READING=1 npm run dev
```

이번 작업에서 운영 환경변수를 설정하거나 배포하지 않았다. 실제 사진 시험 후 사용자 결정으로 켠다. 스위치는 새 요청에 공간 sidecar를 붙일지 결정한다. 이미 저장한 공간 기록은 스위치를 꺼도 읽고 수정/재개할 수 있다.

OFF 회귀 fixture는 변경 전 합성 입력 113개 촬영 영역의 `ObservationRequest`, Gemini 본문, Terra high v7 본문 SHA를 고정했다. 현재 OFF 결과와 byte 단위 JSON 동일성을 검사한다. Catan `readCatanScene`의 전용 판독 동작·모델 선택은 변경하지 않았다. 게임별 분기나 별도 활성 게임 목록은 추가하지 않았다.

## 배포 데이터와 핀

- 운영 import는 `game-photo-definitions/spatial/index.json`이다. 연구 폴더를 운영 서버/브라우저에서 import하지 않는다.
- 생성기는 원 연구 파일 byte SHA·canonical spatial SHA·schema SHA, 원명세/readout/board/frame SHA, pack/source/photo tuple을 검사하고 배포용 최소 자료만 만든다. 원명세·팩 버전·기존 사진 정의 JSON은 변경하지 않았다.
- 요청과 저장 출처에 원 spatial/schema SHA 및 배포 runtime/schema SHA를 묶었다. 현재 선택 촬영 영역·partition·허용 component와 교집합만 요청한다. 알려진 세션 인원수의 영역/칸 활성 조건을 적용하고 미지 인원수를 추정하지 않는다.
- `photoDefinition(pack, expectedSHA)`는 같은 pack/source tuple 중 정확한 expected SHA를 검색한 다음 기존 내용 해시 guard를 검사한다. 구판을 최신 geometry로 바꾸지 않는다.
- 새 데이터 경로는 `.gitignore`와 `.vercelignore` 제외 대상이 아님을 확인했다. git 인덱스는 조작하지 않았다.

재생성:

```sh
npx tsx tools/lightweight-recognition/generate-spatial-definitions.mts
```

## 저장·표시 계약

`ObservationRequest.spatial`, `ObservationResult.spatial`, `HostedObservationWire.spatial`, `GenericPiece.spatial/spatialAlternatives`는 모두 선택 항목이다. 기존 receipt/저장본의 필수 키나 버전은 바꾸지 않았다.

- 판 인스턴스·variant·읽는 방향/근거, 원사진 box, 주소/footprint/완전성, 실제 회전/반사, 관측 층/부착/순서를 보존한다. object ref를 한 번 실제 ID로 연결하며 board ref는 task별 이름공간을 쓴다.
- canonical 위치는 사진 bbox가 아닌 **해시가 일치하는 frame/area/address의 실제 slot 기하**에서 얻는다. asset 해시/좌표가 달라지면 그림상 정합을 강제하지 않고 기록을 미배치로 남긴다.
- 다칸 조각은 실물 ID 하나와 별도 점유 윤곽으로 표시한다. 60도 등 임의 관측 각도를 유지하며 90도로 반올림하지 않는다. 같은 칸 여러 실물의 상단은 관측 관계로만 선택하고 관계가 불명확하면 순서 `?`로 표시한다.
- invalid 주소/관계는 해당 항목을 deferred/미상으로 남긴다. 숫자 0·다른 정상 칸을 버리지 않는다. null 수량·방향과 0, 빈칸과 미응답을 구분한다. 빈칸 관측은 기존 수동값을 삭제하지 않는다.
- 공개 개인판은 명시적인 사람 연결 전 `__photo.public`의 미배정 후보다. 원 `player_public` partition을 보존하고 공용판/owner-private로 바꾸지 않는다. 기존 구성물 연결에서 공개 개인 필드+명시 owner를 선택한다. 새 승인 대기열은 없다.
- 직접 수정은 `manualAnchor`, `manualCovered`, `manualCoverageComplete`, `manualRotationDegrees`, `manualReflected` 등에 분리한다. 모델 원값/raw는 보존한다. 기존 자유 배치 편집은 `manualOverride`로 구분한다.
- 같은 원본 crop은 기존 transform을 한 번 적용한다. 합쳐진 관측의 서로 다른 공간 주장도 출처별 대안으로 남긴다. 늦은 작업은 기존 epoch/revision guard로 수동 정정을 덮어쓰지 못한다.

## 게임별 연결 범위

아래 ready/partial은 **연구 데이터 판정**이며 실사진 정확도 판정이 아니다. 영역 수는 모든 frame의 합이며 실제 요청은 현재 scope/인원수로 다시 좁힌다.

| 게임 | 데이터 상태 | 칸 영역 / 이름 영역 | 연결 |
|---|---|---:|---|
| `agricola` | ready | 12 / 4 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음; 구조 namespace 주소 보존, 전용 구조 그림 투영은 미연결 |
| `akropolis` | partial | 3 / 2 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `avalon` | ready | 2 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `azul` | ready | 28 / 11 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `blokus` | ready | 1 / 1 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `codenames` | ready | 1 / 0 | 유효 주소·한/다칸 투영 |
| `halligalli` | excluded | 0 / 0 | 공간 확장 제외, 기존 일반 관측 유지 |
| `hanabi` | partial | 0 / 4 | 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `isle-of-cats` | ready | 4 / 17 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `just-one` | excluded | 0 / 0 | 공간 확장 제외, 기존 일반 관측 유지 |
| `king-of-tokyo` | ready | 3 / 7 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `kingdomino` | partial | 9 / 0 | 유효 주소·한/다칸 투영 |
| `lost-cities` | partial | 1 / 6 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `six-nimmt` | partial | 1 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `tiny-towns` | ready | 1 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `apiary` | partial | 16 / 20 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음; 구조 namespace 주소 보존, 전용 구조 그림 투영은 미연결 |
| `calico` | ready | 3 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `dixit` | partial | 2 / 2 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `dominion` | partial | 0 / 15 | 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `five-tribes` | ready | 4 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `galaxy-trucker` | partial | 16 / 60 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `istanbul` | partial | 3 / 3 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `machi-koro` | partial | 0 / 6 | 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `patchwork` | ready | 3 / 1 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `sagrada` | ready | 5 / 15 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `seven-wonders-duel` | partial | 12 / 12 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `space-base` | partial | 16 / 2 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `splendor-duel` | ready | 2 / 5 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `splendor` | partial | 1 / 10 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `star-realms` | partial | 1 / 5 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |
| `terraforming-mars` | ready | 12 / 60 | 유효 주소·한/다칸 투영; 이름 있는 영역·관계 보존, 내부 고정 좌표 생성 없음 |

미연결/제외 경계:

- Agricola 울타리 edge와 Apiary 벌집/프레임 structural namespace는 주소·관계·raw 보존까지다. 기존 UI의 일반 칸으로 위장하거나 새 구조 그림 투영을 만들지 않았다.
- 이름만 있는 자유 영역은 area/인스턴스·관계를 보존하지만 내부 고정 칸이나 사진→SVG 변환을 만들지 않는다. 기존 자유 배치 편집을 계속 쓴다.
- 일반 게임 사용자 등록 frame 입력은 이번 UI에 추가하지 않았다. 실제 보이는 landmark/방향으로 정합된 응답만 canonical 연결하고 `request-registration`을 임의 생성하지 않는다.
- Azul bag, Duel의 현재 cards를 받지 않는 discard, Istanbul 별도 보너스 덱 목적지, 검증되지 않은 Apiary 2–3인판 대응, Kingdomino 미등록 원점/7×7, Galaxy Trucker 미등록 flight slot은 활성 canonical 목적지로 넓히지 않았다.
- 숨은 면·역할/의도/이력·사람 소유 추정은 계속 금지다. 관계/미배치 정보의 보존은 모든 구조를 그림으로 자동 복원한다는 뜻이 아니다.

## 검사

VERIFIED 최종 결과:

| 명령 | 결과 | 로그 |
|---|---|---|
| `npx tsx --test tests/lightweight-recognition-scope.test.ts tests/spatial-reading.test.ts tests/spatial-reading-api.test.ts tests/spatial-reading-ui.test.ts` | 16/16, 실패·skip 0, exit 0 | `/private/tmp/kb-spatial-final-focused-20261109.log` |
| `npm run typecheck` | exit 0 | `/private/tmp/kb-spatial-verified-typecheck-20261109.log` |
| `npm test` | **1216/1216**, 실패·skip 0, exit 0 | `/private/tmp/kb-spatial-verified-all-tests-20261109.log` |
| `npm run build` | exit 0 | `/private/tmp/kb-spatial-verified-build-20261109.log` |

기준선 1203개에 공간 검사 13개를 추가했다. 기존 테스트 기대값을 낮추거나 삭제하지 않았다. 첫 전체 검사에서 발견한 UI 2건, 인원수 전달 후 검사에서 발견한 최소 입력 1건은 수정했으며 실패 로그도 임시 경로에 남아 있다. 빌드에는 500KB 이상 chunk 경고가 남는다(주 chunk 약 2.91MB, gzip 약 519KB). 이번 범위에서 경고 한도를 변경하지 않았다.

동결 입력 inventory 154파일 중 변경된 9개는 이번 허용 제품 접점이고, 나머지 145개(원명세·팩·readout·판 자산 포함)는 입력 SHA와 일치했다. 연구 31개 game JSON·schema 및 각각의 입력 핀은 생성기에서 검증했다.

직접 추가한 13검사: OFF 113본문, 31정의 주소/마스크/hidden 경계, 다칸·60도·null, invalid 주소와 0, 두 개인판/권한, empty/미응답/관계, Gemini/Terra native mock, 역사 SHA 선택, pinned 그림·수동 0, schema/인원수 핀, 실제 API mock 저장/재개·지연 guard, crop/재전달, React 그림/수정/재열기.

React 렌더 검사는 실제 컴포넌트 트리와 이벤트를 합성 환경에서 검사했다. 실제 브라우저 육안 검사나 실사진 정확도 측정으로 표현하지 않는다. 기존 Duel/Jaws UI 및 최소 세션 입력에서 발견한 회귀는 기대값 변경 없이 수정했다.

## 켜기 전 최소 실사진 시험 제안

RECOMMENDATION: 실제 Terra high v7 **4회**만 먼저 제안한다(미실행).

1. 읽는 방향과 두 개인판이 보이는 단일 칸형 1장(Sagrada/Azul): 인스턴스 분리·미배정·0/unknown.
2. 다칸형 1장(Blokus/Patchwork): 조각 ID 하나·가림/footprint·비직각 방향.
3. 이름 영역/가변 배치 1장: 주소 추정 없이 raw/관계·미배치 유지.
4. 1번 원본의 실제 crop 1장: 원본 좌표 변환·중복/출처·수동 정정 후 저장/재개.

reference 없이 호출 수만 늘리지 말고 실제 사진에서 보이는 주소/방향/물체와 저장·재열기 그림을 대조한다. 이번 mock 통과는 provider의 새 스키마 수용이나 사진 판독 정확도를 증명하지 않는다. 추가 호출/활성화는 이 구현에서 수행하지 않았다.

## 수정 파일

이번 패키지 소유 파일(기존 보드 제작·타 작업자의 dirty 변경과 구별):

- `game-photo-definitions/spatial/index.json`
- `shared/spatialDefinition.ts`
- `shared/spatialObservation.ts`
- `shared/spatialPlacement.ts`
- `shared/lightweightRecognition.ts`
- `shared/genericRecord.ts`
- `shared/photoCapture.ts`
- `shared/componentLinking.ts`
- `server/spatialReading.ts`
- `server/spatialProjection.ts`
- `server/photoDefinitions.ts`
- `server/hostedObservation.ts`
- `server/scanObservation.ts`
- `server/analysisTask.ts`
- `server/componentLinking.ts`
- `server/engine.ts`
- `server/index.ts`
- `server/observationFusion.ts`
- `server/ai/spatialWire.ts`
- `server/ai/spatialAssembly.ts`
- `server/ai/geminiGameReader.ts`
- `server/ai/terraCompact.ts`
- `server/ai/terraGameReader.ts`
- `server/ai/observationAssembly.ts`
- `server/ai/generic.ts`
- `src/SpatialPieceDetails.tsx`
- `src/realBoards.ts`
- `src/GameBoardRecord.tsx`
- `tools/lightweight-recognition/generate-spatial-definitions.mts`
- `tools/lightweight-recognition/generate-photo-definitions.mts`
- `tests/spatial-reading.test.ts`
- `tests/spatial-reading-api.test.ts`
- `tests/spatial-reading-ui.test.ts`
- `tests/fixtures/spatial/builders.ts`
- `tests/fixtures/spatial/off-requests.json`

## 주요 산출물·로그 SHA256

- `game-photo-definitions/spatial/index.json`: `9da3ef79dbad77ca1334b137d4ade9a7b4cf8819c158a72866ae7620f76d7ea7`
- `server/spatialReading.ts`: `0bf80016d28fffa10f2ca0520eeb027d65eca95a0a8a648a41cfb81752fbe2c7`
- `server/ai/spatialWire.ts`: `c34c115b1fe84a72439267d1b5c9b2750a2c040ae8a59e0dec6bdeb78afdeaf9`
- `shared/spatialObservation.ts`: `5db300aae0eae37972fa154d3391ad4dbebccfb16ae346950e4a50a402e4414f`
- `tests/fixtures/spatial/off-requests.json`: `d3cc10084be0dba9f90f1cf8745a345528ed163d1adf22348180cd7f309fcf5f`
- `/private/tmp/kb-spatial-final-focused-20261109.log`: `7b2dc0d99378a39c5e5b8f119f4694d0aec601b1742829ea16081ff5f5f86e22`
- `/private/tmp/kb-spatial-verified-typecheck-20261109.log`: `5e78c610aa7ef718387fbafafff780b966223bb02ab5614b0cb6e295275f2fe2`
- `/private/tmp/kb-spatial-verified-all-tests-20261109.log`: `caaaf40ec145c0639994290e6862b41a4d7cd11355377e5e3924156e4c1be2b4`
- `/private/tmp/kb-spatial-verified-build-20261109.log`: `a3395304fceabab9bcd774236d92d24624ddbbc3af598950c0d34ce5559e46ca`
