# Terra 공통 판독 연결

**VERIFIED:** Terra를 기존 hosted 스캔 실행·자동 반영·저장 경로에 연결했다. 일반 게임은 기존 정의의 literal 관측을, 카탄 공용 판 anchor는 기존 native scene/슬롯을 사용한다. 기본 선택은 Terra이며 기존 Gemini/local 선택과 저장 기록을 유지한다. 배포·운영 설정 변경은 하지 않았다.

- `gpt-6.1-terra`, Responses, low / image detail high / 출력32768 / store:false / service_tier:default / timeout240초 / retry0. M1은 named box + 승인된 fill 문장 + 원본이다. 확대나 속성 축약은 없다.
- 120게임·455개 비어 있지 않은 정의 영역의 요청 구성 검사 통과. 이는 모델 정확도나 120게임 실제 사진 통과를 뜻하지 않는다.
- 같은 기존 claim·CAS·owner/epoch·수동값 보호 경로를 재사용한다. 실제 OpenAI 응답과 Terra identity/wire를 receipt에 남기며 Gemini 응답으로 위장하지 않는다.
- 인접 `LightweightReaderControls.tsx`도 수정했다. 기존 선택기에 Terra를 추가하고 이미 폐기된 ‘마지막 한 장/항상 후보’ 안내를 현재 동작에 맞췄다. 전용판·GameBoardRecord·팩·아트는 수정하지 않았다.

## 직접 검증

| 검증 | 결과 |
|---|---|
| 저장된 Terra 응답→실제 디코더→조립 | 18/18, 기존 디코드와 deepEqual; 관측속성749/749, 앞면41 유지 (`replay.json`) |
| 집중 회귀 | 88/88 (`focused.log`): Terra/Gemini, native, cloud, claim, 역순/부분실패, fusion의 수동 null/0/false·삭제 보호, 기존 UI |
| 타입·빌드 | `npx tsc --noEmit` exit0, `npm run build` exit0 (`build.log`); 큰 청크 경고 있음 |
| 실제 loopback 제품 HTTP | Catan native/Splendor generic 각 once, 수정→commit→resume, receipt 불변; cloud Terra 재전달 추가 요청0 |
| 실제 Chrome CUA | Splendor 결과 자동 표시→점수 `?`를 수동 `2`로 입력→저장→새로고침 후 `2` 확인. 이는 저장 시연값이며 정답 보정/모델 점수에 사용하지 않음 |
| 모바일 | 실제 Chrome 기기 툴바 390×844 확인·스크린샷 직접 열람. 그림/카드/`?`/저장 표시 확인. 이미지가 도구 출력에 표시된 사실과 별도 이미지 파일 저장은 구분하며, 보고서 폴더에 캡처 파일을 저장했다고 주장하지 않음 |

브라우저 전용 CUA surface는 unavailable이었다. native Chrome 앱으로 새 검수 탭을 사용했으나 이후 활성 탭이 다른 작업으로 바뀌어 즉시 중단했다. **Quacks UI 저장·전용판 수동 배치/저장은 미검수**이며 기다리거나 다른 탭을 추가 조작하지 않았다. Quacks 결과의 자동 accepted 저장은 GET으로 확인했고 snapshot 버튼 경로는 아직 실제 UI로 검증하지 못했다.

## 승인된 V1 실제 요청

각 1회·총2회, peak2, retry0, 두 HTTP200/completed. 카탄은 승인된 SHA `29f02bc…` 원본 부재로 **NOT_RUN**이며 다른 사진으로 대체하지 않았다. 카탄 실제 native 품질/endpoint 수용은 아직 UNKNOWN이고 동일 원본 재첨부가 남은 조건이다. 합성 native 연결 검사와 구분한다.

| 게임 / 고정 W 원본 | 부분 기준 개별 물체 | 읽을 수 있는 속성 | raw→관측→편집 객체 | provider 시간 |
|---|---:|---|---|---:|
| Splendor | 12/12 대응·종류 일치 | 18 중16일치·2모름·0오독 | 15→15→15 | 27.826초 |
| Quacks | 0/8 개별 회수 | 16 모두 개별 물체 미회수 | 9→9→9 | 15.743초 |

Splendor의 나머지3행은 사진에 실제 보이는 카드 더미다. 부분 기준에 없는 행을 환각으로 세지 않는다. Quacks는 재료 칩을 색별4묶음과 책5행으로 읽었다. 녹색 칩 실물 자체를 완전히 못 본 경우와 **개별 칩/숫자를 회수하지 못한 경우**를 구분한다. 묶음의 수량은 null 그대로이며 실물 여러 개로 복제하지 않는다. 두 사진을 직접 다시 열람했으며 고정 부분 기준/값/사진 SHA는 바꾸지 않았다. 전체 사진 정확도나 일반 성능 보증은 하지 않는다.

두 요청~제품 최종 반영까지 병렬 wall 28.320초. 업로드·촬영·첫 그림 렌더의 별도 실측은 UNKNOWN이며 종단 스캔 속도로 부르지 않는다. UI 조작/승인 대기 시간 역시 모델 지연에 포함하지 않는다.

| 게임 | input | cache write / hit | output (reasoning 포함) | reasoning | total |
|---|---:|---:|---:|---:|---:|
| Splendor |3341|3338 / 0|2159|66|5500|
| Quacks |3394|3391 / 0|1081|68|4475|

공식 Standard 짧은 문맥 가격(input $1/M, cache-write30분 $1.25/M, output $5/M)으로 각각 약 $0.0149705 / $0.00964675, 합계 **$0.02461725**이다. 캐시 쓰기는 일반 입력 가격을 대체하며 실제 청구·잔액은 확인하지 않았다. [모델](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [가격](https://developers.openai.com/api/docs/pricing), [캐시](https://developers.openai.com/api/docs/guides/prompt-caching).

`v1-storage-verification.json`: Splendor 관측속성50/50 표현(앞·뒤15는 기존 native kind로 표현), Quacks15/15 유지. 두 receipt/providerResponse는 UI 전후 deepEqual이다. Splendor snapshot2개와 점수 한 값의 수동 수정이 확인됐다. 이는 읽힌 값 보존 검사이며 그 값의 사실 정확도와 별개다.

## 인계

- 자기 delta와 전후 SHA: `product.delta.patch`, `source-freeze.json`; HEAD 전체 diff가 아니라 dirty 시작점 기준이다. 두 인접 파일은 처음 디스크 복사에서 누락되어 정확한 자기 치환의 역변환·수정 전 도구 읽기로 복구한 preimage임을 명시했다.
- 사전 입력/본문 SHA: `v1-preflight.json`; 호출 ledger/usage: `v1-execution.json`; 부분 기준 채점: `v1-scores.json`. 원사진·요청 본문·raw·세부 정답은 repo 밖 private directory에만 있다.
- 재실행: `node --import tsx docs/terra-integration-20261030/replay.mts`는 호출0이다. **`v1.mts --run`은 재실행하지 않는다.** run/unit claim과 최대2회 guard로 같은 입력의 유료 중복을 거절한다. 키는 provided-upload를 시험 프로세스의 메모리 인증에만 사용했다.
- 전체 suite/build:vercel·배포는 감독 통합 범위다. 이 패키지는 위 집중/type/build 결과만 주장한다.
