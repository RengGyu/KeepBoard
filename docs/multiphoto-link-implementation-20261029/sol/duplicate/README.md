후속 연결 경계 수정 동결본입니다. 이전 P0 freeze는 그대로 두고 이 폴더에 별도 pre/post SHA와 patch를 기록했습니다.

원인: 같은 원본의 anchor에 같은 종류가 있어도 source box가 없으면 기존 `overlaps` 검사에서 제외되어 crop을 별도 실물로 추가했습니다. 일반 source 비교를 고쳐 비교 불가능한 호환 종류는 미해결 관계로 남기며 기존 anchor/manual 기록을 relatedPieceIds로 보존합니다. 숫자·색·종류 일치로 물리 정체성을 합치지 않습니다. city/settlement는 기존 호환층을 사용합니다. 다른 종류·확실한 비겹침·anchor 해당 종류 누락/실패의 crop 보충은 유지합니다.

- RED: 새 일반 회귀 2건에서 잘못된 추가가 재현됐습니다. 최종 집중 30/30, typecheck exit0입니다.
- 새 고정 응답: anchor 47개 및 알려진 값 유지, 133개 관측 모두 편집 참조 또는 미해결 관계로 설명됩니다. 새 투영 52행에서 영역 없는 anchor 관련 crop의 별도 물리 추가는 0입니다. 이 수는 판독 정답 수량이 아닙니다.
- 이전 고정 응답: 항구 8관측 = 6편집후보 + 2미해결 관측/1묶음 그대로입니다.
- 두 응답 세트 각각 120순열 동일, 단위 재전달 멱등, 원문/입력 session 불변, 명시 저장 및 JSON 재열기를 확인했습니다. 독립적으로 유효한 영역이 있는 anchor로 연결된 crop은 유지하고, 어떤 boxless anchor와 동일한지 모르면 미해결로 둡니다.
- 모델/API/배포/commit 0. UI 변경 없음. 전체 suite/build/실제 모바일 검수는 감독 담당입니다.

정확한 명령과 이번 3파일 delta는 `handoff.json`, raw 입력 SHA와 세트별 집계는 `replay-result.json`에 있습니다. private 원본/원응답은 repo에 복사하지 않았습니다.
