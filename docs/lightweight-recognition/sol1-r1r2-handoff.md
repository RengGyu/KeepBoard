# R1/R2 UI 최종 인계

검증된 소유 UI 변경을 동결했습니다. 카탄은 항목별 위치 검토로 바꾸어 정상3개/미확정1개를 함께 저장할 수 있고, 기존 도로·수동 기록은 자동 교체하지 않습니다. 루미큐브는 ‘기존 판과 함께 정정’을 명시적으로 눌러 기존 순서·ID·loose와 새 관측을 함께 정정합니다. 저장은 공유 `observationReview` DTO를 쓰며 stale/409에서는 초안을 유지합니다. Typed/Splendor 후보는 기존 기록이 있으면 실물 연결로 진입하고, 종류 미상 카드의 독립 레벨도 표시·수정합니다.

- 집중47/47 · 타입 exit0. 전체suite/build는 이번 UI 카드에서 반복하지 않았습니다.
- 실제 CUA390: 카탄3배치+1null 미배치/undo→적용→저장→reload, 기존 road 보존. 루미큐브9→5 묶음+loose3 보존, 새7→8 정정·제거/undo→저장→reload. 두 화면 가로 넘침0, 루미큐브360 넘침0, viewport 원복.
- 보조 GET: accepted/snapshot 값·receipt 일치, 사용 projection 소비. 루미큐브 저장값3/8/9와 원문 receipt7/9 구분. 다른 pending은 이 두 fixture에 없으므로 보존을 이 CUA로 주장하지 않습니다.
- 모델0/추가OCR0/배포0. 사진은 사전 준비된1px 합성이라 판독 정확도 근거가 아닙니다. stale/dirty 및 typed/Splendor는 집중 컴포넌트/순수함수 검사와 backend 별도 근거이며, 실제 브라우저 동시접속 검수로 세지 않습니다.

정확 파일/pre/postSHA·불변 snapshot·명령은 [sol1-r1r2-implementation.json](sol1-r1r2-implementation.json). [적용 delta](sol1-r1r2.patch)는 직전 UI 동결본 위에만 적용합니다. 이전16파일 patch/report는 그대로 보존했습니다.

변경 digest: `aae9d193d3fd0c1625f9383416321f2fe0d493bb5e328635a67b24a0b9abe7c5`.

[카탄 검토](sol1-r1r2-ui/catan-review-390.png) · [루미큐브 재열기](sol1-r1r2-ui/rummikub-reopened-390.png) · [실제 CUA](sol1-r1r2-ui/verification.json) · [저장 API 대조](sol1-r1r2-ui/saved-api.json)
