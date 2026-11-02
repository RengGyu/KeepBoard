# 게임팩 의미 수정 재시험 입력

`initial-manifest.json`은 이전 119게임 평가 중 판독·처리 문제가 명확히 기록된 **48게임**의 기존 사진과 독립 참조를 고정한 입력이다. `worker-assessment.json`의 57행에서 `reference-error` 4건, `uncertain` 4건, `manual-field` 1건을 제외했다. 후속 게임팩 의미 수정으로 새로 재시험이 필요한 게임은 감독이 따로 추가한다. 이 입력 자체로 API 요청이나 새 제품 계획을 실행하지 않았다.

각 행의 사진 바이트 SHA, 참조 JSON SHA, 실제 디코딩한 가로·세로, 현재 `game-photo-definitions/index.json`의 area/partition을 **48/48** 확인했다. `owner_private`인 Love Letter의 `evaluation-owner`는 사진에서 소유자를 추측한 값이 아니라 기존 동결 실행 입력 `docs/service-all-games-20261027/cases-005.json`의 합성 ownerId를 같은 source/ref/area/scope 해시 조건으로 재사용했다. 다른 partition에 ownerId를 임의로 추가하지 않았다.

`selection.json`은 선택 사유, 제외 9게임, 원본·사진 정의 해시, 비교 기준의 요약/원응답 경로와 SHA를 기록한다. 이전 24게임 재시험 대상 중 **18건은 최종 v5** (`/private/tmp/kb-service-retest-v5-Hm4kjd`), 나머지 **30건은 최초 119게임** 결과를 비교 기준으로 사용한다. 기존 참조의 모호한 속성과 희소 anchor는 그대로 둔다. 자동 박스 겹침은 참고값이며 시각 정확도 판정이 아니다.

게임팩/판독 소스가 최종 동결된 후에만 기존 `docs/service-all-games-20261027/runner.mts`의 `--mode check`로 현재 정의·요청 본문·비용 계획을 새 개인 data-dir에 고정한다. 감독이 그 계획과 실행 상한을 검토한다. 기존 attempt ledger와 결과 폴더는 재사용하지 않는다. 이 준비 단계에서 키 파일·`.keepboard`·운영 저장본을 읽거나 모델 API를 호출하지 않았다.
