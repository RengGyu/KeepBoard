# Terra 지속 사용: 다음 구현 권고

확인일 **2026-10-30**. 연구 세션은 `gpt-6-astra / effective max` 확인. 제품·운영 설정 변경 0, 새 모델 호출 0. 현재 공유 소스를 읽었으며 운영 배포본·계정 잔액은 조회하지 않았다. 아래 수치는 새로운 사진 판독 결과가 아니라 기존 응답의 독립 재계산이다.

근거 구분: **VERIFIED**는 이번 직접 소스 확인·오프라인 재생, **REPORTED**는 인용한 기존 실행 보고, **RECOMMENDATION**은 후속 설계, **UNKNOWN**은 아직 분리·측정하지 못한 사항이다.

**권고: Terra를 현재 스캔→그림 정정→저장·재개 경로에 먼저 연결한다.** 게임팩·편집기를 다시 만들 필요는 없다. `Responses API + 이름 붙은 좌표 + 기존 관측/장면 계약`을 실제 제품 어댑터로 옮기는 것이 첫 마일스톤이다. 다음은 **빠진 속성의 출력 구조 개선**, 그다음은 **필요한 부분 사진의 활용**이다. 범용 다른 시점 정합과 전체 판 자동 배치를 이 작업의 선행조건으로 두지 않는다.

## 1. 이번에 직접 확인한 근거

| 확인 | 결과 | 해석 범위 |
|---|---|---|
| 기존 24개 요청/원응답/decoded 해시 | **72/72 일치**, HTTP 200·completed 24/24 | 성공적인 전송·형식 처리. 시각적 정답 보장은 아님 |
| 9게임×2조건의 기존 점수 재계산 | **18/18 일치**, 두 부분 기준표 SHA 불변 | 같은 채점법의 재현. AI가 만든 부분 기준 자체의 사실성을 인증한 것은 아님 |
| 현재 디코더→실제 조립 함수 재생 | **18/18 조립**, 이미 observed인 속성 **749/749 보존** | 일반 관측 조립 경로. Terra 서버·UI·저장 종단 시험은 아님 |
| 위 조립의 앞뒷면 보존 | 원응답의 명시적 `face`로 상세 face **41개 복원** | `observationAssembly.ts`에 **이미 구현됨**. 새 필수 수정으로 중복 권고하지 않음 |

재현 파일: [evidence.json](./evidence.json), [assembly-replay.json](./assembly-replay.json). 실행 코드는 [audit-evidence.py](./audit-evidence.py), [replay-assembly.mts](./replay-assembly.mts). 원사진·raw·정답 내용을 새 폴더에 복제하지 않았다.

### 보고서의 수치를 서비스 판단에 쓰는 방법

[기존 Terra 시험](../terra-accuracy-20261030/README.md)의 9사진 부분 기준에서 개별 물체 대응은 과거 Gemini **68/235**, Terra base **123/235**, 보강 **128/235**였다. Terra를 계속 사용할 실용적 근거는 있다. 그러나 사진별 한 쌍이고 과거 실패 사례에서 선별한 자료이므로 120게임 정확도나 모델 자체의 우월성으로 일반화하지 않는다. Gemini에는 같은 보강을 적용하지 않았다.

특히 다음을 구분해야 한다.

- **5→50/109는 숫자 정확도가 아니다.** face·말의 자세·지형 특징 등 비문자 필드 합계다. 숫자/주사위 눈만 분리한 보강 결과는 **20/27 일치, 5 오독, 2 모름**: Quacks `chipNumber` 5/8·오독1·모름2, Sagrada `dieValue` 15/19·오독4. 기존 부분 기준과의 비교이지 사람이 인증한 정답률이 아니다.
- Bohnanza·Calico의 base에서 빠진 `face` 속성 행은 top-level `face`에 실제 값이 있다. 현재 제품 조립은 이를 복원한다. 따라서 decoded 속성 표만으로 실제 앱이 face를 모두 잃는다고 판단하면 안 된다.
- **Cascadia의 0/21은 21개 habitat 타일에 대응하는 개별 관측이 없어서 발생한 missing-object**다. 대응한 타일의 face를 21개 잘못 읽었다는 뜻이 아니다. Carcassonne도 face/city/road 분모 28개는 대응 물체 없음이며, 개선된 5→13은 주로 follower `posture`다. 원응답에는 city/road가 존재하지만 null인 타일도 있다. 이전 요약의 ‘전부 행 누락’ 설명을 그대로 원인으로 채택하지 않았다.
- Ticket to Ride 보강의 개별 대응은 **6/78**에 그쳤다. raw에 묶음과 quantity=null 관측이 남는다. 이를 inventory로 나눠 개별 열차로 만들면 안 된다. 현재 채점기는 quantity>1을 제외하지만 null/0은 매칭 후보로 허용하므로 이 숫자 자체가 물리적 개별성의 증명도 아니다.
- 부분 기준 밖 출력은 자동으로 환각이라 세지 않았다. bbox 대응, 속성 값, 개별/묶음, 전체 복원 가능성은 별개다.

## 2. 현재 있는 것과 빠진 것

| 경로 | 현재 확인 | 남은 최소 작업 |
|---|---|---|
| 사진·crop·스캔 작업 | 원본 SHA, crop 변환, owner/epoch, 단위별 claim·결과 보존이 있음. hosted는 최대6단위 fan-out | Terra도 동일 hosted 경로로 연결. 새 큐·2-job 대기를 추가하지 않음 |
| 모델 호출 | `GeminiGameReader`와 여러 kind 분기가 Gemini에 고정 | 실제 Terra reader, Responses envelope 처리, provider 식별·capability·cloud factory |
| 일반 관측 | 실험의 named box 24회 정상; 현재 decoder/assembly 재생 18회 정상 | 연구 실행기의 가짜 Gemini envelope를 제품의 Terra 정체성으로 남기지 않고 공통 payload decoder로 분리 |
| 카탄 | anchor는 **native scene**, detail/crop은 literal 관측. 기존 hex/edge/vertex 편집 유지 | Terra `readCatanScene` 필수. 일반 bbox 실험 성공만으로 카탄 자동 배치 연결 완료라 부르면 안 됨 |
| 결합·정정·저장 | 알려진 동일 원본 crop 결합, 사용자 값 보호, 정정·snapshot·resume 경로 존재 | provider 추가 후 그대로 통과하는지 좁은 종단 검사. 저장판본 변경 불필요 |
| 일반 게임 그림 | 관측 `region`과 수동 `placement`는 별개 | 사진 좌표를 전용판 슬롯으로 그대로 옮기지 않음. 미배치 물체·원사진·직접 배치 보존 |
| 전용판 아트 | `realBoards.ts` loader와 `GameBoardRecord.tsx` 실제 consumer 이미 있음 | 제작 중인94개를 기다리지 않고 완료된 소수 아트로 배치·저장·재열기 확인. 아트 정확성/전체 연결은 이 연구에서 미검증 |

구체 근거: [Gemini reader](../../server/ai/geminiGameReader.ts), [hosted 경로](../../server/hostedObservation.ts), [scan 실행](../../server/scanExecution.ts), [결합](../../server/observationFusion.ts), [commit](../../server/analysisTask.ts), [전용판 소비](../../src/GameBoardRecord.tsx). 파일 해시는 evidence.json에 있다.

**현재 동작을 유지할 것:** 새 hosted scan 결과는 `commitAnalysisTask`에서 **현재 편집 가능한 accepted 기록**으로 반영되고 사용자가 그대로 저장할 수 있다. 레거시 candidate 명시 적용은 호환 경로로 남아 있다. 이번에 별도의 승인 화면이나 필수 정정 단계를 다시 넣지 않는다. `accepted`를 시각적 진실의 인증으로 해석하지도 않는다.

## 3. 첫 마일스톤과 이후 순서

### M1 — Terra로 읽고 기존 화면에서 저장·재개

**필수:** 같은 reader 인터페이스에 Terra를 추가하고, 일반 사진과 카탄 native를 모두 잇는다. 무료 크레딧의 실제 잔액·운영 키 연결은 UNKNOWN이며, 실험 키 파일을 제품 경로에 복사하지 않는다. 키 공급은 서버의 기존 비밀 설정 주입 방식으로 담당자가 처리한다.

첫 프로필은 **실측했던 모델·low effort·high image detail·32768 출력 한도·retry0**, generic은 named-box와 속성 누락 방지 문장을 사용한다. **첫 제품 연결에서는 입력 원본을 그대로 유지**한다. 이는 저가 모델 선택이 아니라 전송·조립과 이미지 확대의 효과를 섞지 않고 연결을 완성하려는 작은 변경이다. fill-only의 일반적인 정확도 이득은 아직 UNKNOWN이며 보강 50/109를 이 프로필의 성능으로 광고하지 않는다.

Lanczos 확대는 버리지 않는다. 보강 패키지가 유망하므로 후속 품질 후보로 유지하되, 현재 실험은 **문장+확대+재인코딩을 동시에 바꿨고** 개발 사진 2회 중 1회는 묶음으로 무너졌다. 원래 휴대폰 고해상도 사진에서도 일괄 2배 확대가 유효한지는 모른다. 클라우드 제품에 로컬 Pillow 실행을 그대로 옮기는 것도 별도 구현이다.

M1 완료의 의미는 **Terra 결과가 누락 없이 수정·저장·재개되는 동작**이다. 올바른 개별 물체·값·배치가 실제로 늘어나는지는 별도 표로 평가한다. 카탄 native의 실 Terra 요청·배치는 아직 미측정이므로 최소 실사진 검증에 반드시 포함한다.

### M2 — 속성을 빼먹는 문제를 구조로 줄이기

현재 flat `attributes[]`는 `strict:true`라도 **각 종류의 모든 속성 행을 출력하도록 보장하지 않는다**. 직접 세면 base9 응답의 허용 속성 슬롯 중 **142행 생략**, 보강9에서는 **0행 생략**이었다. ‘행이 있음’과 ‘값이 맞음’은 다르다.

후보는 게임팩을 새로 쓰는 대신, 해당 촬영 영역·종류의 **visible 속성만 nullable 필수 key로 생성**하는 Terra 전용 wire다. 종류별 nested `anyOf`와 고정 key→기존 ObservationProperty 변환이면 충분하다. manual/owner/숨김/차례는 계속 제외한다. 이미 쓰는 top-level face를 다시 읽게 하지 않고 정규화에서 일관되게 사용한다. JSON Schema는 출력 형식만 강제하며 숫자 정답을 강제하지 않는다. [공식 Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

이 변경은 더 긴 출력·스키마 처리 비용을 만들 수 있으므로 M1과 분리해 기존 원본 두 장으로 작게 비교한다. 새 schema가 API에서 수락되기 전에는 ‘누락 해결’로 표시하지 않는다. 모델을 한 번 더 호출하는 interpretation 단계나 자동 cheap→strong 재판독은 추가하지 않는다.

### M3 — 실제 부족한 영역만 더 읽기

묶음·작은 값은 기존 원본 crop/보충 대상 기능으로 접근한다. 전체→모든 crop을 항상 호출하는 정책은 보류한다. 촬영할 때 정보가 없거나 흐리면 디지털 확대는 새 정보를 만들지 못한다. 사용자는 누락을 그대로 두거나 직접 고치거나 부분 사진을 추가할 수 있다.

다른 시점 정합은 지금 필수 작업이 아니다. **REPORTED:** [실제 영상 W/C/D 시험](../ten-games-closeup-20261029/video-attempt/README.md)은 Splendor·Quacks의 **정지된 대상 부분** 두 사례를 확보했다. Splendor는 D의 추가 이득이 없었고 crop은 속성 오독3개도 추가했다. Quacks는 W/D 모두 개별 칩0, C는8개를 읽었다. 이는 crop의 효용 사례이며, D가 필요 없다는 일반 결론은 아니다. 이 연구에서 영상 전체의 동일 상태를 새로 검증하지는 않았다. 서로 다른 사진의 ingestion·병렬 실행과 물체 정합은 구분한다. 먼저 다른 시점에서만 새로 읽힌 핵심 물체/값이 확인될 때 낮은 복잡도의 연결을 별도로 검토한다.

## 4. 시간·비용과 아직 모르는 것

| 기존 9회 조건 | 평균 요청 시간 | 입력/출력 토큰 합계 | 공식 표준요금 환산 합계 |
|---|---:|---:|---:|
| Terra base | 22.41초 | 14,987 / 16,630 | $0.101877 |
| Terra fill+확대 | 30.40초 | 32,240 / 21,308 | $0.14683325 |

24회 전체는 **$0.30070045 환산**, 실청구가 아니다. 캐시 쓰기·읽기를 입력 토큰과 중복 계수하지 않았고 reasoning은 출력에 이미 포함된다. 표준 짧은 입력 요금은 입력 $1/M, 출력 $5/M, cache-read $0.05/M, 30분 cache-write $1.25/M이다. 무료 크레딧 잔액·고갈 시점은 UNKNOWN. [공식 가격](https://developers.openai.com/api/docs/pricing)

요청 평균은 업로드·prepare·결합·그림 표시·사용자 정정·저장까지의 시간이 아니다. 최대동시3의 실험으로 제품 최대6의 실제 지연/한도도 인증하지 않는다. 병렬화는 벽시계를 줄일 수 있지만 호출 수·토큰은 줄이지 않는다. 30초 완료, 재촬영/정정 시간 절감률, 전체 게임 복원 성공률은 모두 미측정이다.

필요한 측정은 기존 timing·usage에 이어 **첫 그림, 전체 결과, 저장 완료** 시각을 분리하는 정도면 된다. 소수 사용자에게 원래 흐름을 수행하게 해 필요한 정정과 원본/실물 보존을 기록한다. 임의 합격률·정정 클릭 수를 만들지 않는다.

## 5. 외부 계약과 경계

- Terra는 이미지 입력·Responses·Structured Outputs를 지원한다. 현재 어댑터에서 쓸 `reasoning.effort:'low'`는 실험 조건이며, 이 연구 세션의 Astra `max`와 별개다. [모델 문서](https://developers.openai.com/api/docs/models/gpt-6.1-terra)
- Responses의 completed/refusal/incomplete를 구분하고 완료 텍스트만 payload decoder에 넘긴다. 중단·토큰 한도·429는 기존 단위 실패/원본 보존 경로를 사용하며 자동 유료 재시도하지 않는다. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- 작은 글자·회전·개수·공간 위치는 비전 모델의 공식 한계다. 공식 이미지 표에서 **정확한 gpt-6.1-terra의 내부 patch 한도**는 이번에 확인되지 않았다. 2048px/2500 patch는 **해당 실험 전처리 설정**으로만 인용한다. 모델명 비슷한 행의 수치를 그대로 API 보장으로 옮기지 않는다. [이미지 입력 문서](https://developers.openai.com/api/docs/guides/images-vision)
- 120게임 정의는 허용 관측 필드·저장 양식이며 실제 카드 이미지 참조셋이나 전체 정답 규칙집이 아니다. 전용판 SVG도 화면 표현 자산이다. 이를 보고 빈 수량·소유·카드 정체·사진 위치를 확정하지 않는다.

구현 파일별 계약·수용 검사·다음 소규모 실사진 시험은 [implementation-cards.md](./implementation-cards.md)에 있다. 제품 파일·기존 실험/평가기준·아트는 변경하지 않았다.
