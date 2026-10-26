# 작은 속도·판독 품질 실험 카드

이 연구 worker의 **실AI 실행 허가 0, 실제 호출 0**. 감독은 별도 Sol 카드에서 아래 원본의 기존 모델 전송 한정·최대6회 실험을 승인·배정했다. 결과는 추후 별도 검토이며 이 문서의 측정으로 간주하지 않는다. [고정 실행 카드 JSON](experiment-card.json)에 원본 전체 SHA, localPath, scope, 실제 본 GT와 unknown, 요청 순서를 고정했다. 사용자 “약 60초”는 REPORTED이고 해당 요청의 게임/사진 크기/구간 timing은 UNKNOWN이다. [이전 관측](../photo-read-latency/README.md).

## 지연을 나눠 읽기

|구간|현재 근거|다음 측정점|
|---|---|---|
|촬영 안정/중복 선별|기기 내 처리 후 최대6장. 이번 실제 휴대폰 시간 미측정|`Capture`의 안정 후보 시작/선택/최종 accept 시각. 모든 프레임을 AI로 보내지 않음.|
|파일 준비·업로드|원본 base64 전송; base64 문자열은 원본 byte의 약4/3이며 JS 문자열/복사 메모리는 별도|`src/api.ts`의 gallery-read/photo-upload, 원본 수·해상도·bytes, 서버 evidence 수신/저장 숫자만.|
|job 접수/queue|Sol1 서버 job은 접수 후202, 단일 프로세스 실행2. 사용자 이탈을 기다릴 필요가 없어짐|POST start RTT, job `prepareMs/queueMs`. 접수 빨라짐≠모델 빨라짐.|
|이미지 준비·외부 provider|현재 game/scope만 prompt. gateway high detail, high effort, 최종 JSON 대기. 정확한 실요청은 미측정|`imagesMs/providerMs`; gateway 숫자 timing/usage, 응답첫byte/완료 시각이 허용되면 추가. providerMs는 네트워크·공급자대기·추론·출력 수신이 합쳐진 값.|
|정규화·저장|합성 예전 50부품 검증은 수ms. 이번118 assisted prompt 조립 중앙값0.184ms/최대1.359ms. 실제 큰 응답/폰 렌더와 다름|`normalizeMs/commitMs`, output bytes·piece 수·null 수. 현재 prompt UTF8 5,816–17,187bytes(중앙10,039)는 토큰 수가 아님. [재현 원문](runtime-audit.json).|
|결과 발견·그림 표시|job 상태2초 poll, 완료 후 세션 GET, 사용자 명시 적용|terminal→poll발견→세션수신→첫그림 표시. 네트워크 정상이어도 poll 주기만큼 지연 가능. UI의 accepted/dirty 값 보존도 동시에 확인.|

전체 wall time은 한 작업의 클라이언트 단조시계로 측정한다. 서버 단계는 같은 서버 시계의 duration만 비교한다. 업로드/queue/실행은 겹칠 수 있어 무조건 더하지 않는다. 현재 `api.ts`의 옛 `analysis-roundtrip`은 `/analyze`만 잡으므로 새 job 완료 시간으로 재사용할 수 없다. 사용자 사진/프롬프트/응답 본문은 timing 기록에 넣지 않는다.

## 우선순위와 손실 가능성

1. **재접속·상태 발견:** Sol1 결과를 통합하면 요청을 잃었다고 생각해 다시 누르는 일을 줄일 수 있다. 재접속을 위해 유료 요청을 자동 재발행하지 않는다. 모델 속도 개선폭은 따로 측정한다.
2. **읽을 구획:** 전체판은 배치/범위, 작은 숫자는 근접 원본으로 받는다. 같은 owner·같은 정지 상태에서만 공동 판독. 현재 공개 corpus 사진끼리는 동일 상태가 검증되지 않았다. 구획 prompt를 줄여도 생략 영역이0/삭제로 바뀌면 실패다.
3. **추론 옵션:** DeepSeek **Responses API** 공식 계약상 `reasoning.effort=none`은 thinking을 끄며, 생략은 기본 thinking/high이다. `low`도 비교 후보이고 현재 gateway에서 `medium`은 거절된다. 이 문서 계약은 기존 운영 alias의 실제 수락·속도·정확도 측정과 다르다. 운영 high는 유지했다. [공식 thinking 문서](https://api-docs.deepseek.com/guides/thinking_mode/).
4. **이미지 크기:** 큰 원본의 전송비용을 줄일 가능성은 있으나 작은 비용 숫자·주사위 눈을 잃기 쉽다. 공식 Responses의 low detail은512×512, high/original/auto는 원해상도다. 전게임에 low를 일괄 적용하지 않는다. 전체판 미리보기+필요 패널의 근접 원본은 별도 후보다. [공식 image input/detail](https://api-docs.deepseek.com/guides/responses_api/).
5. **출력 최소화:** 지금도 다른117게임 정의 전체가 들어가지 않는다. 설명/반복 reason을 줄이는 것이 첫 후보이며 required typed key/null/source/evidence를 삭제해 빠르게 만들지 않는다. 현재 선택 게임·구획의 인쇄 attr만 요청하되 최소 품질 회귀 뒤 적용한다.
6. **병렬/부분 결과:** 서로 다른 owner job을 실행2 한도로 처리하는 것은 가능하지만 같은 실물을 각 crop에서 동시에 읽어 자동 합치면 중복 위험이 있다. 동일 scope 단일job의 공동 판독은 유지. SSE는 진행 상태 또는 검증된 완결 partition에만 이용하고 잘린 JSON을 accepted로 적용하지 않는다. DeepSeek `background/store/previous_response_id`는 미지원이므로 앱 job을 provider background로 대체하지 않는다([공식 Responses compatibility](https://api-docs.deepseek.com/guides/responses_api/)).

## 별도 Sol에게 배정된 작은 유료 파일럿

**상한: 3입력 × 2설정 = 6회**, 실패 요청 포함·자동retry0. 기존 모델/이미지 bytes/prompt/schema/output cap을 고정하고 A=현재 high, B=none 한 변수만 바꾼다. 3쌍으로 p95·전체120게임 정확도·안정 개선율을 발표하지 않는다. 해당 입력의 비교와 후속 진행 여부만 판단한다.

|입력 SHA 앞부분 / 범위|읽을 정답|미확인 또는 제외|
|---|---|---|
|Splendor `25c3ba99` / public 미지정 관측|두 카드의 points/bonus/실제로 보이는 cost. [photo-review.json](photo-review.json)의 개별12 관측|시장/개인 소유, level, 잘린 비용을0으로 채우기 금지|
|Sagrada `8ed0ebe4` / owner 범위|dice 윗면4/6/5, 창문의19개/빈칸, Green Focus 인쇄명. 이 사진은 신판 조항과 일치한다고 별도 표시|확정판본/총점/턴/가려진 window제약은 GT 아님. cell은 현재 manual이며 AI 정확도 점수에 섞지 않음|
|SCOUT `bc7259b0` / owner 범위|앞 카드 두 끝9/3, 별 토큰 액면5/10/10/2. 토큰이 함께 찍혔어도 owner tray에 남음|손패전체 순서/activeEnd/토큰주인·합계소유 추론 금지|

이 세 입력은 같은 상태의 다중 시점 실험이 아니다. Catan/Rummikub native의 모델 품질을 함께 인증하지 않는다. native 후보 사진은 Catan `08942...`(정확판본 미확인), Rummikub `26bad...`(Super Rummy/yellow)라 우선 판본·팔레트 정답을 확정한 후 별도 bounded card가 필요하다.

**실행 전 체크는 작게:** 세 원본 SHA 확인, 현재 모델 label·API·effort가 후속 카드와 일치하는지만 비민감 값으로 기록, 사진별 허용 scope와 GT 고정. 감독이 명시한 권한은 이 사용자 허가 원본을 기존 모델로 검증하는 전송 한정이며 라이선스가 새로 생긴다는 뜻이 아니다. 전체 mixed 사진은 owner 입력만. 원본/출력을 공개 리포트나 다른 서비스로 재게시하지 않는다. crop 생성 없이 위3개 원본을 그대로 쓰고 새 서비스·다른 사진·추가 요청은 범위 밖이다.

전체 SHA: Splendor `25c3ba99150e52870a9c40f360d0581a191ed1f64cc8344031f951f449584e3f`, Sagrada `8ed0ebe465eb7679298947eaab1d26c9adba4a3cba6fc6a5c1dc93aea09fbda4`, SCOUT `bc7259b0968cc2efd9fab73f9e14994f57c1b81677bae169fad7cc9fa864d6f3`. Sagrada/SCOUT의 owner ID는 시험 접근 범위용 `synthetic-review-owner`이며 실제 사진 속 플레이어를 추정한 ID가 아니다. SCOUT 9/3은 카드의 두 끝 값이며 top/bottom 방향·activeEnd는 자동 채점하지 않는다.

**합격 판단:** A/B 모두 파싱 및 typed/source 검증 성공; 판독 가능한 GT에서 B가 새로운 숫자·색 오류/누락을 만들지 않음; unknown에 거짓 확정값을 추가하지 않음; owner→public 유출·기존값 자동 덮어쓰기·중복 실물 증가0. 스키마가 지원하지 않는 정보는 별도 공백으로 보고하고 모델 오답/정답으로 억지 집계하지 않는다. 시간은 쌍별 provider/전체 wall값을 그대로 제시한다. 한 번 빨라졌다는 이유로 운영 설정을 바꾸지 않는다.

**중단:** 인증/과금 승인 없음, provider 옵션 거절, 범위 누출, 고정 GT에 영향을 주는 새 판본 충돌, 실패 자동 재시도 필요, 출력 잘림 중 하나면 해당 설정 중지하고 남은 호출을 임의 확대하지 않는다. 기록된 판본 불명 자체를 새 실패로 보지 않으며 인쇄된 가시값만 비교하고 구판 규칙을 추론하지 않는다. HTTP실패나0후보도 실패/미확인 그대로 남긴다. 같은 사진의 crop을 추가하더라도 “실제 카메라 다른 각도”로 표기하지 않는다.

**후속 구현 적용 파일:** timing은 `src/api.ts/scanTiming.ts`, `shared/analysisJobs.ts`, `server/index.ts` job구간; prompt/구획은 `server/ai/generic.ts/gameReadouts.ts`; 이미지 선택은 `Capture/scanBatch`; effort실험은 승인된 격리 runner만. 이 연구에서 제품/설정 변경은 하지 않았다.
