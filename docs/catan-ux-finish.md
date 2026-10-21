# 카탄 UX 마무리

2026-10-21. 규칙 추가 없이 기록·정정·저장을 간소화했다.

**VERIFIED — 변경**

- 저장/이어하기 탭과 재개 버튼을 제거했다. 저장해도 같은 편집 화면에 머물며 내 보드에서 열면 현재 저장 기록을 바로 편집한다. 열기·페이지 전환은 resume/next-turn을 호출하지 않아 epoch/turn을 바꾸지 않는다. 기존 snapshot·resume API와 저장본은 호환된다.
- 새 판과 기존 판 모두 이름·실제 색을 편집한다. 기존 player.id는 유지하고 기존 플레이어 제거 UI는 제공하지 않아 개인 자료 연결을 보존한다. 추가 플레이어는 새 ID를 받는다. 차례와 부품 소유색은 이름·실제 색칩으로 선택한다.
- 새 판 폼의 기본색(#c65d4b/#6285aa/#d5a44d, 세 번째 orange)과 서버 기본색(#cf6656/#5c83a8/#d1c7b7, 세 번째 white)이 달랐다. 공통 DEFAULT_PLAYERS로 통일했다. 기존 판의 색은 소급 변경하지 않는다. 이 기본 팔레트는 실제 사진 측정값이 아니다.
- 이전 scene에는 독립 관측색 필드가 없어 미연결 색은 note로만 남았다. 선택적 observedColor를 저장·정규화·장면 조립·목록에 보존한다. 프롬프트는 사용자 색을 기준으로 식별하고 id/name의 red 같은 단어로 소유자를 추정하거나 기본 플레이어에 강제 연결하지 않도록 명시한다. 알 수 없는 모델 ownerId는 비운다. 색→플레이어 자동 최근접 매칭이나 새 플레이어 자동 생성은 하지 않는다.
- 사용자가 소유색을 고르면 같은 관측색의 미확인/같은 기존 소유자 부품을 한 번에 연결한다. 다른 확정 소유자와 비소유 지형은 바꾸지 않는다. 한 번 undo 가능하며 원본 crop·출처·수량·위치는 유지한다.
- 일반 화면의 모든 설정 진입과 SettingsDialog를 제거했다. 서버 AI 설정 API/데이터는 유지한다. 사진 판독 가능 여부만 내부적으로 사용하며 키·모델 폼을 노출하지 않는다.
- 카드별 삭제/보드 메뉴 전체 삭제/삭제한 보드 목록/복원/즉시 되돌리기를 연결했다. Store의 별도 session-list.json 목록 메타데이터만 바꾸고 세션·snapshot·원본 파일은 수정/영구 삭제하지 않는다. 전체 삭제 undo는 그 작업에서 숨긴 ID만 복구한다. API: DELETE /api/sessions/:id, POST /api/sessions/archive {hidden,ids?}, GET /api/sessions?includeDeleted=true. hidden:false에는 명시 IDs가 필요하다. 일반 GET 목록은 숨긴 보드를 제외한다.

**VERIFIED — 실행 근거**

- npm run typecheck exit **0**, npm test exit **0** (**129/129**), npm run build exit **0** (`index-Ab5GbfLT.js`). 파이프 없이 실행했다.
- 새 4개 회귀: 임시 Store 개별·전체 삭제/복원/Store 재로딩 및 원본 세션 파일 바이트·사진 목록 불변; 저장→GET의 epoch/turn·snapshot·개인정보 불변과 이름/색 변경; 관측색 보존/미확인 소유자와 프롬프트 매핑; 관측색 연결의 원자성·출처·수량 보존.
- 일회성 임시 Store/임의 포트의 합성 보드3개만 사용한 Chrome 390px: 이름 민수/색 #2578bb 편집, 재편집 값과 차례 칩 rgb(37,120,187) 일치, 새 판의 공통 기본색 확인. 저장 후 같은 보드1개 유지 → 내 보드 → 같은 구성물 위치·메모·차례로 바로 열기. 설정/이어하기 버튼0개.
- 같은 임시 UI에서 개별 삭제3→2→undo3, 삭제 후 새로고침→삭제 목록1→복원3, 전체 삭제3→0→undo3. 이전 복원 토스트가 새 undo를 가리지 않게 정리했다. 실제 사용자 보드는 삭제하지 않았다.
- 같은 임시 UI에서 관측색 blue/소유자 null의 합성 도로2개를 민수에 한 번 연결하여 기존6개 그룹이8개가 됐고, undo 한 번으로 미확인2개가 돌아왔다. 다시 연결/반영하여 두 ID의 ownerId=red, observedColor=blue, 수량1, 원래 위치 유지도 확인했다. red는 변경하지 않은 ID이며 표시 이름/색만 민수/#2578bb다.
- 모바일 가로 넘침 없음, 콘솔 오류·경고 없음. [단일 보드](screenshots/board-single-mobile.png), [차례 색칩](screenshots/board-turn-colors-mobile.png), [합성 보드 목록과 삭제](screenshots/board-list-delete-mobile.png). 임시 viewport를 복구하고 일회성 서버/자료를 종료·정리했다. 기존 서버 재시작·배포는 하지 않았다.

**UNCLEAR / 한계**

실제 사용자 인식 응답/사진/개인 실행 데이터/키를 읽지 않았고 실제 AI·카메라를 호출하지 않았다. 기본 팔레트 불일치와 관측색 저장 부재는 코드에서 확인한 문제이며, 사용자가 본 색 오귀속의 정확한 모델 응답 원인이나 인식 정확도 개선율을 뜻하지 않는다. 과거 note에만 있던 색은 임의 변환하지 않는다. 복원은 원본 purge 없이 목록 복구하는 방식이고 계정 간 동기화/인증 추가는 하지 않았다.

**변경 파일**

src/App.tsx, src/Dialogs.tsx, src/SessionWorkspace.tsx, src/SceneEditor.tsx, src/sceneGroups.ts, src/api.ts, src/styles.css; shared/playerColors.ts(추가), shared/scene.ts, shared/types.ts; server/store.ts, server/index.ts, server/ai/index.ts, server/ai/sceneAssembly.ts, server/ai/scenePrompt.ts; tests/board-ux.test.ts(추가); 이 문서와 위 PNG3개, dist 빌드 산출물.
