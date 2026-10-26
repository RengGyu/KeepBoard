# 반환 파일과 검증

## 반환 구조 (RECOMMENDATION)

```
result/
  README.md                         # 완료 게임/적용 순서/미실행·한계
  patches/keepboard.patch           # 현재 snapshot 기준 최소 변경
  files/shared/<gameReadout>.ts     # 타입·strict validation·optional legacy view helper
  files/server/ai/<gameAdapter>.ts  # 필요한 prompt/fresh model normalization
  files/src/<GameReadout>.tsx       # 표시·수정 (공통 구조 재사용)
  files/src/<game-readout>.css
  files/tests/<game-readout>*.test.ts
  fixtures/<gameId>/*.json          # synthetic임을 명시, 사진/키 없음
  docs/<gameId>.md                  # GAME-TEMPLATE 작성 결과·공식 근거
  integration-map.json             # 파일/함수/삽입 지점/현재 vs 추가 계약
```

위 경로는 제안이며 현재 파일이 이미 존재한다는 뜻이 아닙니다. 파일별 적용 위치와 기존 import 경계 수정이 함께 있어야 하며 코드를 말로만 나열하지 마세요. source research/판본/hash를 정답 맞추기 위해 바꾸지 마세요. 원앱 수정 권한 없이 배포하거나 모델 호출하지 마세요.

## 실제 저장소 적용 후 명령

- 집중 검사: `npx tsx --test tests/<새게임파일>.test.ts` (파일명을 실제 반환명으로 교체)
- 전체 회귀: `npm test`
- 타입 포함 빌드: `npm run build` (`tsc --noEmit` 포함)
- SSR에서 CSS import가 있으면 기존 테스트의 loader/실행 패턴 확인. ZIP만 독립 실행 가능하다고 주장하지 않기.
- 실제 브라우저: 390/320 및 desktop, field/tray 후보발견→상세·수정→명시적용→상단저장→reload. 스크린샷과 수행/미수행 구분.

## meaningful 완료 기준

- schema/kind/component 불일치·범위초과·NaN·잘못된색·알 수 없는 키 검증.
- null≠0, quantity≠점수/비용, full map의 생략색≠0.
- typed/manual/accept/import/export/snapshot/restore 왕복, 오래된 label/없는 readout 보존.
- accepted 상태의 ID/배열순서/placement/원본 연결은 분석만으로 바뀌지 않음.
- 반복 같은사진 candidate만 교체, 다른사진/accepted/실패 결과 보존.
- 같은 field dirty conflict 및 다른 field dirty React unmount 손실 방지.
- 다른 owner 사진/숨김정보/미허용field/가짜evidence/crop/AI placement 거절.
- 기존 native Catan/Rummikub와 Splendor 경로 보존.
- 게임별 필요한 실물보관/재개 데이터가 실제 표시·수정·저장에 연결됨.

합성 mock/SSR/UI 테스트는 연결과 보존의 증거이지 실사진 인식 정확도·공식규칙 정답의 증거가 아닙니다. 실제 모델 품질은 권한 있는 동일 사진과 사람이 사전 확인한 기준으로 별도 평가합니다. 필요한 공식 자료를 못 열면 미확인으로 적고 값은 만들지 않습니다.
