# 참조 스냅샷의 누락 의존성

아래는 상대 import를 기계 검사한 현재 미첨부 목록입니다. 원래 저장소에서 연결할 파일이며 새로 대체 작성하라는 뜻이 아닙니다. npm 외부 패키지는 snapshot/package.json 참고. 동적 import/URL 전체의 실행 검증은 아닙니다.

|참조 파일|미첨부 import|
|---|---|
|`server/engine.ts`|`../shared/catanSummary.ts`|
|`server/engine.ts`|`./actions.ts`|
|`server/engine.ts`|`./compare.ts`|
|`server/engine.ts`|`../shared/sceneBridge.ts`|
|`server/index.ts`|`../shared/playerColors.ts`|
|`server/index.ts`|`./store.ts`|
|`shared/boardRecording.ts`|`./sceneBridge`|
|`src/Fields.tsx`|`../shared/catanSummary`|
|`src/Fields.tsx`|`./ui`|
|`src/Fields.tsx`|`./presentation`|
|`src/PhotoTargets.tsx`|`./SceneEditor`|
|`src/PhotoTargets.tsx`|`../shared/sceneBridge`|
|`src/PhotoTargets.tsx`|`./presentation`|
|`src/PhotoTargets.tsx`|`./ui`|
|`src/SessionWorkspace.tsx`|`../shared/catanSummary`|
|`src/SessionWorkspace.tsx`|`./CatanOverview`|
|`src/SessionWorkspace.tsx`|`./Dialogs`|
|`src/SessionWorkspace.tsx`|`./SceneEditor`|
|`src/SessionWorkspace.tsx`|`./Capture`|
|`src/SessionWorkspace.tsx`|`./scanBatch`|
|`src/SessionWorkspace.tsx`|`./scanUploads`|
|`src/SessionWorkspace.tsx`|`./scanTiming`|
|`src/SessionWorkspace.tsx`|`./scanQuality`|
|`src/SessionWorkspace.tsx`|`./ui`|
|`src/SessionWorkspace.tsx`|`./BoardFeedback`|
|`src/SessionWorkspace.tsx`|`./brandImages`|
|`src/SessionWorkspace.tsx`|`./PrivatePin`|
|`src/SessionWorkspace.tsx`|`./RoomEntry`|
|`src/SessionWorkspace.tsx`|`./correction-workspace.css`|
|`src/api.ts`|`./scanTiming`|
|`src/api.ts`|`./privateAccess`|
|`src/api.ts`|`./roomAccess`|
|`src/GameEssentials.tsx`|`./ui`|
|`src/GameEssentials.tsx`|`./genericDraft`|
|`src/GameBoardRecord.tsx`|`./ui`|
|`src/SceneWorkspace.tsx`|`./SceneEditor`|
|`src/SceneWorkspace.tsx`|`./sceneWorkspaceModel`|
|`src/RummikubWorkspace.tsx`|`./RummikubBoard`|
|`src/RummikubWorkspace.tsx`|`./ui`|
|`src/RummikubWorkspace.tsx`|`./rummikub-workspace.css`|
|`server/ai/prompt.ts`|`./scenePrompt.ts`|
|`server/ai/index.ts`|`./sceneAssembly.ts`|
|`server/ai/index.ts`|`./gateway.ts`|
|`tools/game-runtime/generate.ts`|`../game-specs/validate.ts`|
|`tools/game-runtime/generate.ts`|`../game-specs/io.ts`|
