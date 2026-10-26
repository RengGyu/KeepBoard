# 대표 4게임 실제 판독 진단 — 실행 전 고정안

상태: **정확4회 실행 완료 / 독립 정답 대조 진행 중 / 제품 수정·preview·production 배포 0**. 실제 시도 수는 `requests.json`이 기준이다. 이전 6회 평가는 종료했고 이번 권한에 재사용하지 않는다. 동결 소스는 `0255142408c9035805725fdb74c2a93b9679c81458acd18f2358c9240d8cfe7d`다.

## 신규4회 실행 결과 — 변환 검사와 정확도는 별개

HTTP200 4/4, 실제 upstream 정확4회, 자동 재시도0, 자기 임시 gateway 종료 확인. 계산 비용 합계 **$0.0975879**(할인 미적용 usage 계산, 청구서 미조회)다. private0700/모든 파일0600, 동결 소스1346파일 drift0. 원 사용자 기록은 읽기만 했다.

| 게임 | 응답 시간 | raw→normalized→편집기 입력 개수 | peak 계산비용 |
|---|---:|---|---:|
| Catan | 99.676초 | 53→53→53 | $0.0251481 |
| Splendor | 103.217초 | 37→37→37 | $0.0248106 |
| Rummikub | 123.463초 | 49타일→49→49 | $0.0308514 |
| Sagrada | 65.462초 | 19→19→19(주사위17) | $0.0167778 |

**VERIFIED 변환 경계:** Catan kind/variant/number/quantity/owner/region 변경0. 위치6개 변경 중4개는 동일 위치의 canonical alias,2개는 허용되지 않는 위치를 null로 남긴 것이다. 보드 위51/밖2라는 소스 조건 결과이며 실제 브라우저 캡처가 아니다. 새 raw에도 도둑은 없으므로 이번 누락은 최초 정규화 이전에 존재한다. 이전 저장 결과의 raw 부재는 여전히 UNKNOWN이다.

Splendor37/Sagrada19는 field·component·evidence·region의 고유 대응으로 모든 readout/quantity 값이 유지됐다. Rummikub49는 동일 tile ID별 number/color/kind/face/region 값 변경0이다. 이 보존 결과는 눈·색·카드·묶음·위치가 사진과 맞다는 뜻이 아니다. 응답값이 틀렸다면 앱에도 틀린 후보가 전달된다. 독립 GT 비교는 Sol1의 고정 GT로 별도 수행하며, 수동정정 가능성을 인식 정확도 해결로 주장하지 않는다.

기본 앱 요청과 다른 점: 세션·사진·플레이어 ID/표시명·메타데이터는 합성값, 카탄 색 관계/선택한 공개 설정3개만 유지, 출력(reasoning 포함) 상한32768을 추가 적용했다. 사용자 Catan 원 evidence처럼 captureTarget은 없고 instruction도 기본 빈 값이다. 과거 호출의 숨은 instruction/원 raw를 복원했다고 주장하지 않는다.

## 사용자 카탄의 기존 결과

**VERIFIED:** 허용된 세션 GET·jobs GET·연결 공개사진 GET 각 1회, 모두 200. 분석 작업 completed/live, 약 120.6초, 후보 1개. `board.layout` 후보 47개 구성물, 적용된 보드와 snapshot은 0개다. 핀된 native 팩은 `catan-base / 2.0.0-essentials-2.51a3a1dd68fe`, source SHA `51a3a1dd68fe5689a8741fd9e3bca31a0a924284524950ebb4824961caee5d61`다.

- 후보: 지형19(종류 모름2), 숫자토큰17(값 확인15·모름2), 도시2·마을4·도로2·항구2·보관용기1. 지형 외 보드 부품10개의 canonical 위치가 null이다.
- 저장 후보를 현재 `normalizeSceneDetailed`로 로컬 재생: 47→47, adjustments0, exit0. `SceneEditor.tsx:331`과 같은 `slotPoint` 조건에서 보드 위36/밖11, 위치미상 경고10. **현재 저장값→편집기 정규화의 삭제는 없다.** 위치가 없는 것을 임의로 배치하지 않는 동작이다.
- `SceneWorkspace.tsx:23`은 후보를 표시하지만 `catanSummary.ts:25`의 보드 요약은 명시 적용된 accepted만 쓴다. 아직 미적용이라는 이유만으로 판독 자체가 정확하다고 볼 수는 없다.
- **REPORTED / 독립 GT:** Sol1의 사용자사진 비교는 지형19=일치13·오독4·모름2, 숫자18=일치12·오독3·모름2·객체누락1. 도둑 누락과 건물/도로 인식 차이도 확인했다. 원문 GT는 private 경로에만 있다. GT SHA `61ee4343effc494d988a5098ba19f49431fa0e0f678fa2fb82439987cb0c48f6`, 비교 SHA `6166b99e4d6392c1e70271e6e32a505ef2832a397312b8f0919fc0ef69a147a3`.
- **UNCLEAR:** 이전 provider raw가 없으므로 잘못된 종류·숫자·위치가 모델부터 틀렸는지 최초 정규화가 바꿨는지 책임 단계를 확정할 수 없다. 새 1회는 이전 응답의 재현 보장이 아니라 현재 기본 요청의 새 측정이다.

## 정확 실행 제안

각 원본 1회, **실패 포함 최대4회·자동 retry0·총 US$0.20 이내(세금 별도)**. 기존 같은 DeepSeek `deepseek-flash`/`high`, image detail high, 모델·provider 변경0. 서버 키는 기존 허용 참조만 사용하며 값/경로를 출력하거나 보고서·번들에 넣지 않는다.

네 입력 모두 실제 UI의 **공용 사진 / 전체·부분 미지정 / instruction 빈 문자열 / capture** 기본 요청이다. `captureTarget`·맞춤 힌트·GT·crop·보정·추가 사진을 넣지 않는다. 사용자 카탄은 실제 핀된 팩과 기존 공개 선택값3개, 이름을 바꾼 합성 플레이어 ID와 기존 색 관계만 사용한다. 실제 이름·메모·세션 ID는 모델 입력에서 제외한다. 정확 ID/색 연결을 진단하며 실제 사람의 소유를 추측하지 않는다.

| 게임 | 고정 원본 SHA256 | 판독·비교 범위 |
|---|---|---|
| Catan | `82a495688f1130cbab488b4f30a736c915e32bb8059d4a393042c5456f929e22` | 사용자 제공850×637 원본. 지형19·숫자18·도둑·보드 건물/도로/항구의 존재·종류·위치 대응을 확인. 보드 밖 손패/카드 내용은 비교·공유 결과에서 제외. |
| Splendor | `210fe11683641690c26cdf41070c9b0f6eed1e950a4358a5cf81b06e9d37503f` | 전체 플레이 사진. 시장·공개 실물의 읽히는 보너스/명성/비용/토큰과 누락·중복. 실제 소유/구매·예약 이력은 사진만으로 정답화하지 않음. |
| Rummikub | `26bad7b14b6e865768aeff5c77e54867db56fec9e33c8f7ba932a3e3ee430efc` | 기본 public `table.scene`: 실제 테이블 그룹·타일 순서·1–13·조커·중복 사본. 랙/뒷면/공급은 원래 지시상 제외이며 누락 분모에서 제외. 노랑처럼 보이는 잉크와 Classic canonical orange를 자동 동일시하지 않고 미확정 색은 null로 평가. |
| Sagrada | `1d7d90e29e7fa9555598e72f2f5efe6fad030692793faa5a0414c39e3d87afb6` | 창20칸/주사위17/빈3의 실물 대응·눈·색·개수·region. manual cell/owner를 모델이 채우지 않는 것을 판독 누락으로 세지 않으며 GT 행열은 대응표시용. |

소유권/판본 차이·불명확 인쇄·가림은 GT에서 UNKNOWN으로 분리한다. Sol1 GT의 최종 완료·해시를 받은 뒤 고정하고 실행한다. 위 세 공개 reference의 원문 링크와 각 요청 prompt SHA/허용 필드는 `preflight.json`에 있다. 원본과 상세 GT/응답은 private0700폴더/0600파일에만 두고 repo/public/배포에 복제하지 않는다.

`prepare.mts`는 로컬 사전준비만 하며 네트워크/키/모델 호출이 없다. 기본 prompt는 6,429–15,412 bytes, 사진1024 tokens+protocol 여유1024를 더한 입력 상한 모두32,768 미만이다. 호출마다 입력≤32,768·reasoning 포함 출력≤32,768을 적용한다. 최대값 계산: `4 × (32768×$0.30 + 32768×$1.20)/1,000,000 = $0.196608`. [공식 가격](https://api-docs.deepseek.com/quick_start/pricing/), [공식 이미지 토큰·리사이즈 한도](https://api-docs.deepseek.com/guides/vision/) 확인일2026-10-23. 할인·캐시 적중은 예산에 기대지 않는다.

실행 승인 후 요청 전 attempt claim을 원자적으로 기록하고, 응답 raw→decode→normalize→최종 후보/실제 편집기 값의 단계별 개수·정답/오독/누락/null/대응불명·latency/usage를 보존한다. 실패/timeout도 1회 소진하며 자동 재요청하지 않는다. raw와 normalizer의 차이는 사진 GT 오독과 따로 집계한다. 합성/private 세션만 쓰며 원 사용자 기록/후보·accepted·권한을 변경하거나 live 분석 POST를 하지 않는다. 원사진·raw는 서비스 결과에 자동 적용하지 않는다.

감독 승인 `0c491a5d-e409-4b82-beaa-455f0fdba004`으로 위 정확4회/$0.20 실행이 허용됐다. 제품·운영 배포는 보류 상태를 유지한다.
