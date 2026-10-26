# 로컬 판독 UI·정의 최종 인계

- VERIFIED: 정확120 ID 정의, canonical SHA·판본 고정. 기존 120 index SHA `c8efa2bb79a06101beba90ae9c0fb384f0b38a3b824233bbdf8ea4836fbb2f60` 불변.
- VERIFIED: 최종 focused17/17, tsc --noEmit exit0. 전체suite/build는 통합 담당 범위로 재실행하지 않음.
- VERIFIED CUA: 390/360 기준점·방향 확인→original+frame 모의분석1→원본/null 확인→수동정정→명시반영→전체저장→reload→공개snapshot복원. 가로넘침0, 제목·닫기 가림 미관찰, viewport 원복.
- geometry는 수동정정 성공과 구분: 합성 reader의 quantity:null로 미배치→보드 이동 거절. 같은 후보의 수량만1인 복사본은 계산 위치 r2c1 적용 순수함수 PASS. 실제 CUA에서는 수량1·목초지·타일1을 직접 정정해 저장. 거절 이유를 그대로 전달하는 좁은 문구수정은 RED→GREEN.
- 브라우저 파일 업로드는 extension file-URL 제한으로 실패. 설정 변경 없이 합성PNG1장만 API 준비. 수정 전 atlas 자동선택 시작 실패(모델호출 전) 보존, 현재는 프레임 있어도 original 유지.
- 실AI0/추가OCR0/운영·공유제품·타소유편집0/배포0. 모의UI를 정확도/실제 처리시간 근거로 삼지 않음.
- 미확인: 실제 폰 촬영·손가락·키보드, 이번 CUA의 Splendor 결과, production bundle/gzip 증분. 기존 Vite HMR websocket 오류로 일반 reload 사용.

최종16파일 digest: `ee4e6735399f3f4f5c4e40dff86516ff08bc37066837ea651a4db4778c1e2161`

정확 파일/pre/post SHA와 불변 복사본: [sol1-review.json](sol1-review.json). 전체 변경 patch: [sol1-final.patch](sol1-final.patch). 이전16파일 대비8파일 delta: [sol1-review.patch](sol1-review.patch). CUA/API: [verification.json](sol1-ui/verification.json), [saved-reopen-api.json](sol1-ui/saved-reopen-api.json).

대표 캡처: [frame390](sol1-ui/frame-390.png), [correction360](sol1-ui/correction-360.png), [saved/reopened390](sol1-ui/saved-reopened-390.png).
