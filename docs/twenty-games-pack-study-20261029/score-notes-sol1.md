baseline 10개를 먼저 동결한 다음, 같은 reference로 보강 3개를 채점했습니다. 참조/원사진/요청/원응답/parsed/decoded SHA를 대조했고, 원응답 재디코드도 저장 decoded와 일치했습니다. 리뷰어 API 호출·제품 편집·reference 수정은 0입니다.

|게임|개별 대응 / 참조 물체|종류 복원 / 참조 물체|읽히는 요청 속성 복원 / 고정 속성|
|---|---:|---:|---:|
|Azul|5/5|5/5|9/9|
|Blokus|0/2|0/2|0/2|
|Bohnanza|0/4|0/4|0/6|
|Calico|11/24|11/24|18/58|
|Carcassonne|17/31|17/31|32/60|
|Cascadia|17/39|17/39|34/78|
|Codenames|25/25|25/25|42/48|
|Dominion|13/13|13/13|39/39|
|Kingdomino|6/7|6/7|25/31|
|Patchwork|5/5|5/5|11/14|

이 합계 99/155·210/345는 제한된 AI reference의 산술 micro 집계입니다. 전체 사진/게임 정확도나 공인 정답률이 아닙니다. reference 문제를 분모에서 몰래 제거하지 않았고, 추가 설명 속성/unknown은 별도 제외 이유를 기록했습니다. 한 predicted item은 한 reference에만 대응합니다. Dominion은 더미 전체 수량이 아니라 각각 구별되는 맨 위 카드 앞면 하나씩만 평가합니다.

중요한 관측 차이: Blokus/Bohnanza는 정상 HTTP/decoded이지만 빈 items입니다. Calico 안쪽 패치와 Carcassonne 지도 타일은 개별 출력이 없었습니다. Cascadia의 habitat quantity16 전체 묶음은 21개 개별 타일 검출로 배분하지 않았습니다. 영역 밖 예비 부품/다른 생태계는 실제 존재하더라도 목표 물체 복원으로 세지 않았고, reference가 불완전한 곳의 추가 실물을 곧바로 FP라고 부르지 않았습니다.

reference 자체의 문제는 `referenceIssues`에 분리했습니다. Calico 초승달 두 개의 cat 명칭은 원사진에서 버튼으로 보입니다. Codenames 여섯 단어는 frozen AI 판독과 재열람이 다릅니다. 이 8속성 및 Patchwork의 포괄적인 shape 서술 1속성은 판정을 보류해 성공으로 자동 크레딧하지 않았습니다. Kingdomino `domino-top-yellow`는 한 가로 실물인지 불명확합니다. strict frozen 6/7·25/31은 유지하고 그 refID/5속성을 제외할 때의 민감도 6/6·25/26을 별도 표시했습니다. 이를 모델이 맞았다는 확정으로 해석하면 안 됩니다. Carcassonne의 미주석 초록 미플도 별도 불완전성으로 남겼습니다.

|보강 비교|개별 대응 baseline → 보강|속성 복원 baseline → 보강|
|---|---:|---:|
|Cascadia|17/39 → 18/39|34/78 → 36/78|
|Kingdomino|6/7 → 6/7|25/31 → 25/31|
|Dominion|13/13 → 13/13|39/39 → 39/39|

Cascadia는 파랑 새 토큰 하나가 추가로 대응하지만, baseline의 앞쪽 habitat 전체 묶음조차 보강에서 사라졌습니다. 양쪽 개별 habitat 점수 0과는 별개의 중요한 관측 누락입니다. 조건별 한 번씩이므로 보강의 인과 효과·반복 성능·전체 상태 복원 성공을 주장하지 않습니다. 토큰/시간은 감독 집계 대상입니다.
