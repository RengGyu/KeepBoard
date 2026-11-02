# 993bc44 UI 독립 검토

대상: `993bc4461baff9708b92c5a209ee8a7ac957f9cf`의 읽기 전용 archive. 아래는 실제 호출 경로를 확인한 기능 문제다. 제품 파일은 수정하지 않았다.

1. **P2 — 미확인 수량을 한 번의 빠른 조작으로 확정값 0/1로 바꾼다.** `src/GameBoardRecord.tsx:45`의 수량 `?`에서 `줄이기`는 `(null ?? 1)-1`로 0, `늘리기`는 `(null ?? 0)+1`로 1을 초안에 기록한다. 버튼은 `null`일 때 활성이다. `src/GameEssentials.tsx:109`가 이 변경을 편집 초안으로 받고 저장 경로(`:101`)에서 확정할 수 있으므로, 사용자가 모르는 개수를 단순 증감한 것이 정확한 0/1이라는 새 사실로 저장된다. 미확인 수량에서는 증감 버튼을 비활성화하고 수량 입력에서 기준값을 명시하도록 하는 최소 수정이 적합하다. 근거: 코드 경로 직접 확인, 해당 클릭의 브라우저 재현은 미실행.

2. **P2 — 스플렌더 값을 고친 뒤에도 ‘읽기 어려움’이 사라지지 않는다.** `src/GapNote.tsx:11-14`는 `readout.values[property]`만 읽는다. `splendor-v1`의 `points` 등은 `readout`의 직접 속성이므로, 점수를 3으로 고친 뒤에도 빈 객체를 검사하여 확인 필요 안내가 남는다. 이 컴포넌트는 `src/GameEssentials.tsx:109`와 `src/ComponentLinkDialog.tsx:57`의 스플렌더 정정 UI에서 호출된다. `splendor-v1`의 직접 속성과 일반 readout의 `values`를 각자 읽도록 고치면 된다. **SSR 재현:** 점수 3의 development piece와 points gap을 렌더하니 `<b>확인 필요</b><span>points 읽기 어려움</span>`이 출력됐다(exit 0). 이 문제는 저장값 자체가 아닌 정정 상태 표시의 오류다.

3. **P2 — 연결하면서 기존 타일을 부착 대상으로 지정할 수 없다.** `src/ComponentLinkDialog.tsx:57`은 `GameDetailFields`에 이번에 선택한 후보 조각만 `record.pieces`로 전달한다. `src/readouts/GameDetailFields.tsx:46-51`의 reference 선택지는 그 배열에서만 대상 조각을 찾는다. Carcassonne `attachedTo`는 `tiles`를 대상으로 허용(`shared/readouts/catalogs/01-spatial-tiles.json:683-690`)하지만, 이미 확정된 목적지 기록의 타일은 선택지에 없다. 서버는 실제 연결 시 기존 대상 조각과 새 조각을 합친다(`server/componentLinking.ts:23-33`). 따라서 기존 타일에 새 follower를 연결하기 전 정정 화면에서는 유효한 `attachedTo`를 선택할 수 없다. 선택된 목적지의 현재 accepted 조각을 정정 UI의 reference 후보에 함께 제공하되, 수정·전송 대상은 선택한 원본 조각으로 유지하는 것이 최소 수정이다. 근거: 현재 caller→필드 컴포넌트→catalog→server merge의 정적 경로 확인; 해당 조합의 브라우저 조작은 미실행.

검토 범위: 저장된 generic 보드의 직접 편집, 후보/연결 정정, 확인 필요 표시, 숫자 빠른 편집, Gemini 선택·작업 요청 호출을 읽었다. Gemini 외부 응답, 실제 PIN/room 브라우저 세션, 모바일·데스크톱 실화면은 이 읽기 전용 검토에서 확인하지 않았다. 전체 테스트·빌드는 수행하지 않았다. 검사한 snapshot 파일 SHA256: `GameBoardRecord.tsx baf55a9f…`; `GapNote.tsx 5a06d6e5…`; `ComponentLinkDialog.tsx b1080b27…`; `GameDetailFields.tsx 5635d45d…`. 앞의 두 파일은 원본 저장소의 해당 commit blob과 SHA256 일치한다.
