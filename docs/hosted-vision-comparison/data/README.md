# Hosted vision 데이터 인계

**VERIFIED — 로컬 준비만 완료, 모델/API/업로드0.** 실행 파일은 [benchmark-manifest.json](benchmark-manifest.json), SHA `70196537a28496797bd8c3f0f1b241a4c69c8dfa65a757bd8d2f9bacea5b7bbb`. Sol2의 `hosted-vision-benchmark-v1` 계약을 그대로 사용한다. image2개를 catalog에 두되 **사용자 제공82a495… 사진1장에만 정확6runs**를 계획했다: 사진-only OCR/구성물 위치 × Gemini/Florence4 + Gemini 문맥 조건2. 자동 축약/실행은 없다.

사용자 사진은 현재2026-10-26 명시 비교 요청과 감독 `6f3d474c`에 따라 `approvedForHosted:true`다. 이번 Google/Roboflow 비교 목적에 한정하며 재배포·훈련 권한은 부여하지 않는다. corpus08942…는 `false`이며 runs에서 사용하지 않는다. 사용자의 사진 추가 승인부터 다시 요구하는 흐름은 필요 없다. 실제 계정·모델·키 연결은 감독/Sol2 담당이다.

| 자료 | 직접 확인한 범위 | 모델 입력 연결/한계 |
|---|---|---|
| 게임 정의·팩 | 고유120 ID, source/edition/pack SHA 일치. native bridge3 + typed117 | 보이는 필드·분류 계약. 사진 학습 데이터나 실제 인식 성공이 아님 |
| 기존 규칙 연구 |120개 JSON의 요약·출처·접근상태 존재. 새 공식문서 조사0 | Catan 실제 분류 문맥과 Splendor/Sagrada 작은 예시를 export. Catan 구현 참조/미재확인 공식 인용, 다른 예시 search-index 근거를 그대로 표시 |
| 대표 그림 |437분류 매핑, 현재 asset registry532항목. 실제 SVG2개 경로·SHA 참조 | 표시용 대표형. 상용 실물 앞면/카드 ID의 정답 참조로 넣지 않음 |
| 실제 사진 | 이전 corpus278건 metadata는 있으나 **현재 원 경로0/278 존재**. 사용자 사진은 원 경로·decode·SHA 확인 |08942…는 알려진 N1 평가 사본의 동일 SHA를 확인해 locator만 명시 변경. 사진 복사/다운로드0. 선정한3게임 참고사진 예시는 metadata만 남고 현재 원본 누락 |
| 참조 이미지 집합 |판본·권한·인쇄 정체성까지 확인된 집합0 | runner references는 비어 있다. 임의로 대표 SVG나 평가 사진을 정답 참조로 붙이지 않음 |

**문맥과 관측의 구분:** `contexts/catan-definition.json`과 `catan-reading-categories.txt`는 실제 정의/연구 요약에서 추출했다. 보이지 않는 수량·소유권·진행 상태를 채우는 정보가 아니다. GT·기대 실물 수·이전 오독·frame은 포함하지 않았다. Gemini 문맥 조건에서만 전송한다. Florence는 고정 `OCR_WITH_REGION`/`OD` 과제이며 자유 규칙 해석은 N/A다. 외부 deterministic lookup으로 인식 라벨에 게임 분류를 붙이는 일과 모델의 픽셀 관측은 별개다. 정확한 호스팅 task/응답 지원은 Sol2 검증 대상으로 남긴다.

**평가 범위:** 두 이전 카탄 사진은 이미 평가된 **development pilot**이며 held-out0이다. [offline-evaluation.json](offline-evaluation.json)에만 비공개 GT locator/SHA를 둔다. 양쪽 모델은 같은 인쇄문자 OCR 과제를 받지만, 기존 GT는 숫자 토큰만 주석했다. 따라서 숫자 subset의 값·원본 위치·누락·모호함을 채점하고 미주석 카드/범례 문자·숫자의 raw unmatched는 따로 보존·scope 판정한다. 이를 자동 물리적 FP로 세거나 전수 OCR 정답률로 주장하지 않는다. 구성물 label/location과 규칙 해석 GT는 UNKNOWN이며 unscored다. 저장 성공도 raw 판독 정확도와 다르다.

**파일:** [input-manifest.json](input-manifest.json)은 판본·권한·경로 변경 provenance, [inventory.json](inventory.json)/[game-coverage.json](game-coverage.json)은 실제 보유 범위, [reference-assets.json](reference-assets.json)은 실사진 후보와 표시 SVG 구분, [task-capabilities.json](task-capabilities.json)은 지원/미지원 구분, [verification.json](verification.json)은 검사 결과다. 원본 사진/raw/fullGT는 이 폴더에 없다. [build.py](build.py)는 기존 로컬 자료만 읽고 이 폴더만 생성한다.

**다음 입력:** 실행 계정/정확 모델 접근은 runner 담당자가 연결한다. 새 독립 정확도 결론이 필요할 때만, 기존 두 사진과 독립적인 본인/권한 있는 사진 및 출력 전 GT를 추가하면 된다. 이미지 path/SHA/권한을 manifest에 추가·선택하면 provider 코드를 바꿀 필요가 없다. corpus 복원·전체 규칙 재조사·참조집합 구축은 이 pilot 실행의 새 선행조건이 아니다.
