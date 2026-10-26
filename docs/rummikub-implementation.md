# 루미큐브 Classic 기록 연결

## 작업자 소유 신규 파일

- `gamepacks/rummikub.ts`: `rummikubPack`(named/default), ID `rummikub`. 기존 연구명세 기반의 공용 `table.scene`, 개인 `rack.scene` 및 선택적인 `currentPlayer`/`opened`/`pending`. 개인 받침대는 `scope:player, visibility:owner`. 모든 상태는 session 수명이며 요구사항은 비어 있어 불완전한 판도 저장한다. `presentation:scene`은 지정하지 않는다.
- `shared/rummikub.ts`: `RummikubScene`, `RummikubTile`, `RummikubGroup`, `RUMMIKUB_VERSION`, `RUMMIKUB_COLORS`; `emptyRummikub`, `normalizeRummikubDetailed`, `normalizeRummikub`, `rummikubField`, `isRummikubField`, `rummikubAnswers`, `allRummikubTiles`, `createRummikubTile`, `visibleRummikubFace`; 순수 `applyRummikubCommand`, `recordRummikub`, `undoRummikub`.
- `server/ai/rummikubPrompt.ts`: `rummikubObservationPrompt`(별칭 `rummikubPrompt`), `RummikubPromptInput`, `rummikubSceneSchema`, `rummikubResponseSchema`.
- `src/RummikubWorkspace.tsx`: `RummikubWorkspace`, `RummikubWorkspaceProps`. 전용 타일·묶음 편집기와 기존 API 저장 연결.
- `src/rummikub-workspace.css`: 해당 편집기만 대상으로 하는 반응형 스타일, 최소44px 조작부.
- `tests/rummikub-model.test.ts`: 순수 모델·명세·프롬프트·표시 정책 회귀8개.
- 이 문서. 기존 파일은 작업자가 수정하지 않았다. 감독관이 등록·AI/엔진/비교·SessionWorkspace 통합을 별도 소유한다.

## 저장 모형과 정정

`version:'rummikub-classic-v1'`, `ownerId:null|string`, `coverage:'full'|'partial'|'unknown'`, `groups:[{id,label,tiles:[]}]`, `loose:[]`이다. 배열 순서는 실제 묶음·타일 순서이며 자동 정렬하지 않는다. 각 타일은 `id,kind,color,number,face,representedColor,representedNumber,evidenceIds,region,note`를 보존한다. `kind`는 number/joker/unknown, 인쇄색은 red/blue/black/orange/null, 숫자는 1~13/null이다. 7을 포함하고 0·범위 밖 값은 모름과 경고로 처리한다. 플레이어 색으로 인쇄색/소유를 추정하지 않는다.

같은 색·숫자의 두 타일은 ID가 다른 두 실물이다. 중복 ID가 들어온 판독은 항목을 삭제하는 대신 중복 ID를 분리하고 경고한다. 수량으로 실물을 복제하거나 중복 얼굴을 합치지 않는다. 잘못된 종류·가려진 값은 추측하지 않는다. 뒷면/앞뒤 모름/정체 모름이면 보존된 숫자·색이 있어도 화면의 확정 앞면으로 표시하지 않는다. 사용자가 이미 알고 입력한 숨은 값은 저장 모형에서 지우지 않는다.

편집기는 추가·삭제·숫자/조커/색/앞뒤 정정·묶음 안 앞뒤 이동·다른 묶음/loose 이동·그룹 재정렬·선택 타일부터 나누기·다른 묶음 뒤에 합치기·40회 이내 undo를 제공한다. 한 명령은 undo 한 단위이며 같은 자리 no-op은 undo를 소비하지 않는다. 규칙상 불완전한 조합이나 재배열 도중의 loose도 저장한다. 타일 근거는 원본 사진 버튼으로 연결하며 crop은 `evidenceIds[0]`에만 적용한다. 첫 원본이 허가 목록에서 빠지면 뒤 사진에 crop을 재사용하지 않는다.

## 감독관 통합 계약

1. Builtin pack에 `rummikubPack` 등록. 기존 저장팩을 자동 변경하지 않는다.
2. `pack.id==='rummikub'`에서 `table.scene/rack.scene`은 Catan `normalizeScene`, sceneAssembly, 숫자/위치 정규화를 거치지 않는다.
3. `normalizeRummikubDetailed(value,{ownerId,evidenceIds})`는 `{scene,recognized,warnings}` 반환. API 문맥 소유자와 허가된 실제 사진 ID를 전달한다. 명시적으로 다른 `ownerId`이면 recognized false. 공개판에 개인 사진을 연결하면 안 된다.
4. `rummikubObservationPrompt({evidence,ownerId?,instruction?})`는 전용 JSON 관측 지시를 반환한다. `rummikubResponseSchema(ownerId?)`는 assertions/summary/warnings envelope. AI 후보를 별도 정규화하고 자동 확정하지 않는다. 부분 관측을 전체판으로 확대하거나 이전 사용자 확정값을 자동 덮어쓰지 않는다.
5. `RummikubWorkspace` props는 `view,ownerId?,busy,mutate,onEvidence,onReadyToSave?`. 기존 SceneWorkspace와 같은 flush 등록 방식이다. 미저장 수정·새 후보·선택 메모가 있으면 hook에 async 저장 함수를 전달한다. `api.update` answers에 전용 scene 값을 저장하며 상위 저장/플레이어 전환 전에 flush한다. 후보를 고치지 않고 저장해도 사용자 기록으로 확정한다. 오류는 로컬 초안을 유지하고 다시 저장할 수 있다. 직접적인 다른 owner 전환은 상위에서 flush 후 key 변경한다.
6. 기존 PIN 잠금·원본 URL·내보내기·snapshot 보호를 그대로 적용한다. 편집기도 잠긴 owner일 때 개인 DOM을 표시하지 않는다. 공용 장면과 개인 rack은 별도 필드로 유지한다.
7. 저장/재열기만으로 턴·패널티·공급/손패 이동·조커 재사용·점수 계산을 수행하지 않는다. 비교는 배열 순서를 보존하며 관측 ID/crop 차이와 실제 타일 위치·정체 차이를 구분한다.

## 검증과 한계

**VERIFIED:** `node --import tsx --test tests/rummikub-model.test.ts` 8/8 통과, exit0. 중복 실물, 1/7/13, JSON 재읽기, 순서·원본 유지, 나누기/합치기/undo, unknown/0/범위, owner/색 분리, 개인 field scope, 첫 원본 crop 고정, 전용 AI scope, 숨은 앞면 표시 방지를 확인했다. `npm run typecheck`는 신규 편집기·공유 모형·프롬프트가 포함된 상태에서 exit0 확인했으며 최종 실행 결과는 인계 메시지에 기록한다.

**REPORTED:** 감독관의 `tests/rummikub-runtime-integration.test.ts`에서 임시 Store API 저장/재시작/PIN/재개 및 로컬 가짜 이미지 전송 2/2 통과, 비교6/6 통과를 전달받았다. 이 작업자는 해당 API journey를 별도 실행하지 않았다. 최종 전체 test/build 및 실제 합성 모바일 브라우저는 감독관이 소유한다.

**UNCLEAR:** 실제 카메라·실제 모델의 타일 인식 정확도와 다중 시점 동일 실물 대응은 미측정이다. 자동 규칙판정·시간제한·점수·Twist/Xpress·미공개 공급 정체 추정은 구현하지 않는다. 기존 아트는 대표 타일 외형이며 동적 숫자/인쇄색은 편집기에서 명시적으로 표시한다. 판독 실패나 구조를 알 수 없는 기존 값은 빈판으로 덮지 않고 원본 유지 안내를 표시한다.
