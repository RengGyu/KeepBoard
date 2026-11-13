# Sol2 제품 구현 인계

2026-11-13. shared/profile/backend 소유 범위 동결. src, shared/sceneLayout, 운영 설정·데이터는 편집하지 않았다. provider/키/추가 에이전트/commit/push/deploy/전체 suite/build 0.

- **VERIFIED T1/T2:** exact120 profile 생성·서버 선택 팩에만 연결. shared는 선택된 pin 또는 순수 metadata fallback만 소비한다. 구판을 current pack으로 교체하지 않는다. 저장된 호환 과거 profile도 유지한다. scope 전체 accepted 실물과 기존 native를 묶고, 표시 구역과 실제 판을 구분한다. 상세 의미는 Sagrada/LC/7W, 나머지는 기존 metadata/아트 topology 참조와 family fallback이며 새 사진 품질 인증이 아니다.
- **VERIFIED T4:** 기존 PATCH/queue/room/PIN 안에서 cross-field assign/role/split/merge/frame, 전체 intent idempotency, stale·원자적 거절, scene-only undo. dirty answers+질문 결정은 검증된 baseline을 인정하고 최종 입력 digest를 저장한다. 같은 commandId에 다른 notes/answers를 붙이면409. commit/reopen/resume와 snapshot scope closure, 원래 값·ID·원문·메모 보존 직접 HTTP 검사.
- **VERIFIED 표시 소비:** 최신 scene frame을 source-qualified 기존 estimator에 transient 전달한다. 수동 네 모서리 후 실제 Sagrada18셀→18셀, 저장·재열기 동일. manual-slot-order와 observed-board-frame은 사진 각도/사람 소유 확정이 아니다. 정식·기존 수동 위치는 덮지 않는다. entity/group.presentation의 셀·슬롯·양편·색띠·부분순서가 UI 계약이다.
- **VERIFIED T5:** 기존 observed board alias/native 참조/attachment 재사용. 같은 공용 recipe의 내부 묶음을 별도 패널로 증식시키지 않는다. 기존9응답 재생에서 Sagrada baseline/high/medium4구역, low3구역·attachment5개. LC2–3구역, 7W17구역(누락 판 강제 생성0). 이는 관계/표시 재생이며 사진 정답 수치가 아니다.
- **VERIFIED T6:** HostedReaderSelection `scene?:true`일 때만 양 provider의 versioned scene co-output. 생략 요청/기존 strict literal wire 유지. 원wire/valid literal은 보존하고 잘못된 구조 조각만 deferred. crop quad는 원본으로1회 매핑, stored validation에서 재변환하지 않는다. schema·실provider 수용/품질/속도는 **UNCLEAR: 실호출 미실행**.
- **VERIFIED T7/T8 backend:** 기존 원본/부분읽기 UI가 소비할 refs와 providerRequired:false 구조 확인 action. input-bound 질문 결정, 기존 Preservation↔group 링크·재확인. skipped를 ready/완전복원으로 승격하지 않고 packed/restored를 자동 변경하지 않는다. split/merge/삭제 시 링크를 needs-review로 남긴다.
- **VERIFIED T9 backend:** 실제 두 관측판·현재 stateKey·사용자 동일상태 확인·4점 이상으로 판별 homography 등록. 후보는 geometry+kind/알려진 role/reciprocal uniqueness로 제한, 명시 확인 전 실물 합침0. 원 관측 ID/값은 남기고 `registeredSceneEntities`가 확인된 관측 alias를 별도 제공한다. 경쟁/순환/미등록 view는 원 실물을 유지한다. PATCH→commit/reopen 직접검사. 실제 다른시점 자료의 정합 품질은 **UNCLEAR**. same-source crop는 기존 fusion 그대로다.

## 직접 검사

- `npx tsx --test tests/restoration-system-projection.test.ts tests/restoration-system-http.test.ts tests/restoration-scene-reading.test.ts tests/restoration-scene-workflow.test.ts tests/terra-compact.test.ts tests/spatial-reading-api.test.ts tests/structure-relations-http.test.ts tests/multiplayer-rooms-api.test.ts tests/reading-modes-preview.test.ts` → **50/50 PASS**, `final-focused.log`.
- `npx tsc --noEmit` → `typecheck-final.log`, exit0.
- `npx tsx tools/game-runtime/generate-restoration-profiles.ts` →120 unique.
- `npx tsx docs/restoration-system-implementation-20261113/sol2/replay-nine.mts` → `replay-nine.json`:9/9 입력 digest 불변. 원사진/응답 수정0.
- `git diff --check -- server shared gamepacks/catalog.ts tests/multiplayer-rooms-api.test.ts` →PASS.

중간 RED/수정 로그는 같은 폴더에 보존했다. room 기존 비밀검사는 `includes('members')`가 새 의미 단어 membership까지 잡는 충돌이 있어 정확 JSON key `"members":` 검사로 고쳤으며 권한/PIN/원사진 단언은 유지했다.

## 변경·연결 경계

실제 export/요청 예시는 [공유 계약](../contract.md). 소유38파일의 경로/SHA/크기는 `source-inventory.json`; tracked delta는 `own-tracked.patch`. 신규 파일은 해당 원본+SHA로 인계하며 인덱스 변경0. root/Sol1의 별도 파일은 이 목록에 포함하지 않았다.

남은 외부 검증: root 통합 suite/build·실제 브라우저, 새 scene schema의 승인된 실사진 호출, 새 두시점 사진의 registration 품질 및 실제 iPhone/Safari. 무료 합성/고정 응답 검사를 실사진 정확도·배포 완료로 보고하지 않는다.
