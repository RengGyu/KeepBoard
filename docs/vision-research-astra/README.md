# KeepBoard 전게임 사진 판독·표시 연구

**120게임의 개별 촬영 계약과 구현 연결안을 작성했다.** 사진을 공용판·공개 개인보유·본인 비공개·수집 제외 영역으로 나누고, 각 영역의 실제 field/component·인쇄 attr·정정·보존·재개 대응을 기록했다. 제품은 변경하지 않았다. 이 문서 작성이 제품 연결이나 전게임 실사진 검증 완료를 의미하지는 않는다.

지금 필요한 적용은 세 가지다. 게임마다 먼저 찍을 곳을 알려주고, 인쇄값이 작으면 그 구획의 근접 사진을 받는다. 공개 개인보유의 소유자를 자리/색으로 정하지 않는다. 원본에서 확인하지 못한 값은 null과 근거 사진을 유지한다. [후속 구현 카드](partition-contract.md#후속-구현-카드).

## 무엇을 확인했는가

|범위|결과|근거 수준|
|---|---:|---|
|카탈로그 ID / 고정 source SHA|120 /120 일치|직접 코드·파일 확인|
|게임별 촬영 초점·재개 구분|120개|개별 작성한 제안. 원명세의 미확인 규칙을 함께 유지|
|영역|525: 공용208 / 공개 개인141 / 본인93 / 수집 제외83|현재 명세 구조 추출. visibility의 전게임 공식 재검증 아님|
|현재 typed|117게임 /1,800 attr|코드 확인. 기존 official-partial2, attachment-only115라는 근거 수준 유지|
|이번 새 공식 조항 확인|7게임|한나비·사그라다·루미큐브·스카우트·코드네임·윙스팬·7 Wonders의 **한정 조항**만 확인|
|공개 실사진 직접 보기|7장 /6게임|읽힌 숫자·색·앞뒷면만 GT. 사진 나이/정확 판본/같은 상태 다중 시점은 미확인|
|연구 worker 실AI / 실제 인식 정확도 시험|0회 /0게임|고정3장×2설정의 별도 Sol 실험은 감독이 승인·배정. 결과는 이 보고서에 포함하지 않음|
|Sol1 비동기 작업 독립 검토|추가 필수 수정 결함 발견0|변경11파일 직접 SHA/코드 대조. 실행 결과는 worker 로그와 구분|
|Sol2 두 파일 독립 검토|추가 필수 수정 발견0 / 집중5검사 exit0|격리 코드·SHA 확인. after CUA 화면은 연결 장애로 미확인|
|Sol2 수정 전 전수 렌더|120게임 /1,300 variant /441 board instance|기계 렌더 결과. 직접 눈 검토는6게임9파일이며 전게임 실물 정확성 합격 아님|

**판본 차이의 실제 예:** 제공 Sagrada 사진의 Green Focus는 지정색 주사위마다3점이다. 이는 [Remastered SA201 PDF printed p5](https://cdn.shopify.com/s/files/1/2319/3985/files/Sagrada_-_Rule_Book_FGG-SA201.pdf?v=1770446534)의 한정 조항과 맞고, [원판 SA01 PDF p4](https://floodgategames.com/Sagrada/Sagrada-Rules-Floodgate-Games-SA01.pdf)의 지정색 눈 합계와 다르다. 사진의 정확 제조 인쇄판은 여전히 미확인이다. 원본이 선명하다는 사실만으로 기존 기본판 규칙을 붙이면 안 된다.

**속도:** 사용자의 약60초는 해당 요청 구간 측정이 없는 보고다. 비동기 job은 이탈 후 진행상태를 다시 찾게 하지만 모델이 빨라졌다는 근거는 아니다. 공식 DeepSeek Responses에서 `none`은 thinking disable이지만 운영 alias의 수락·품질·속도는 결과 수신 전이다([공식 문서](https://api-docs.deepseek.com/guides/thinking_mode/)). [고정 실험 카드](experiment-card.json)의3입력×2설정=최대6회, 실패 포함·retry0·운영 high 불변을 유지한다. 연구 worker 실행은0회다.

**최종 사진 인계:** collector의 `index.json`은120고유게임, found93/partial27이며 selected247장과 retained278장은 서로 다른 집계다. 이 metadata만 계약에 연결했고 원본 눈 검토를 전수 확장하지 않았다. 사진 확보는 판본·공개범위·GT 확인이 아니다. 기존7장 직접 검토와 실험용3장은 그대로 유지한다.

## 파일 읽는 순서

- [handoff.json](handoff.json): 동결된120계약 집합 digest, 입력 파일 해시, 구현 필수 수용 기준과 후속 확인 범위.
- [partition-contract.md](partition-contract.md): 공개/개인 경계, null/quantity, 최소 확장, 그림판 기준, 후속 적용 파일과 수용 사례.
- [coverage.md](coverage.md) / [coverage.csv](coverage.csv): 120게임 전체. `games/<game_id>.json`에 판본·원명세 SHA·영역·현재 허용 field/component·인쇄 필드·출처·공백을 담았다.
- [sources.json](sources.json) / [checked-evidence.json](checked-evidence.json): 기존 출처 metadata와 이번에 실제 읽은 조항을 분리. 링크를 열었다는 사실만으로 규칙 확인을 부여하지 않았다.
- [photo-review.json](photo-review.json): 직접 본7장과 제한된 정답·구획·판본/가림 한계. 원본은 재게시하지 않는다. [photo-requirements.json](photo-requirements.json)은120게임에서 아직 필요한 촬영 영역이다.
- [corpus-availability.json](corpus-availability.json): 최종 collector index의 확보 상태·selected SHA·판본 미확인과 직접 검토7장을 분리. producer의 usable/개인영역 판정은 공식 규칙·정확도 합격이 아니다.
- [latency-experiment.md](latency-experiment.md): 단계별 증거·변경 후보·작은 실험과 중단 조건.
- [sol1-review.md](sol1-review.md) / [sol1-source-check.json](sol1-source-check.json): 동결된 서버 job 변경의 독립 검토.
- [sol2-review.md](sol2-review.md) / [sol2-source-check.json](sol2-source-check.json): 수정 전 전수 렌더·격리2파일 수정·직접 집중 검사·after CUA 미완료를 구분. [visual-reviews.json](visual-reviews.json)은120게임별 판정이며9게임 격리 수정 확인/111게임 실물 근거 부족은 제품 연결 중단 요구가 아니다.
- [verification.json](verification.json): 연구 파일 무결성 검사의 실제 결과. 규칙 사실성·실사진 품질 검사와 다르다.

## 재현

```sh
node --import tsx docs/vision-research-astra/runtime-audit.mts
python3 docs/vision-research-astra/build-photo-review.py
python3 docs/vision-research-astra/build-visual-review.py
python3 docs/vision-research-astra/build-contracts.py
python3 docs/vision-research-astra/verify-contracts.py
```

첫 명령은 settings/Store/네트워크를 사용하지 않는 순수 현재 코드 조사다. 사진 스크립트는 허용된 corpus manifest의7개 원본만 SHA 확인하고 최종 index metadata를 읽으며 복사/다운로드/모델 호출하지 않는다. 나머지는 이 연구 폴더에만 쓴다. 재실행하면 corpus의 시점과 runtime 측정값이 달라질 수 있다. [입력 해시](input-hashes.json)를 함께 보존한다. Sol2의 실제 집중 검사 명령·로그는 별도 source-check에 고정했다.

2026-10-23 기준 structural 검사 exit0. exact120 IDs, sourceSHA120, 계약 파일 hash120, 출처참조, visible/manual 분리, 수집 제외83영역 비활성, 7개 사진 SHA 중복 없음 확인. 새 공식 확인 없이115개를 verified로 승격하지 않았다. 연구 산출물은 인계 가능하며 실제 촬영/분석 UI 연결·통합 after 화면·별도 실험 결과 검토는 후속 작업이다. 연구 worker 제품/팩/원명세/운영 변경0, 사용자 개인자료 열람0, 실AI0.
