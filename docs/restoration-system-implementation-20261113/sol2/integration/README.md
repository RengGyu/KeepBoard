# Backend 통합 회귀 / LC 표시 영역 마감

**VERIFIED — 원인과 최소 수정**

- `server/index.ts::change`의 거래용 `structuredClone`이 BlobStore의 WeakMap CAS token을 잃어 기존 세션을 create-only 저장하려 했습니다. `Store.cloneSessionForUpdate`가 이미 있는 `transferVersion` 훅으로 **읽어 온 정확한 버전만** 복제합니다. 새 버전을 다시 조회하거나 stale guard를 완화하지 않습니다.
- 독립 클라우드 client의 정상 draft 저장200, 이전 draft409, 최신 draft 재저장, 원 loaded object 불변, 0/null 보존을 직접 검사했습니다.
- LC에만 분기하지 않고 profile macro `opposed-sides`를 소비하는 `arrangeSceneSubregions`를 추가했습니다. 실제 판 identity와 표시 패널을 분리합니다. 같은 실제 `boardEntityId` 아래 관측 판·공용 recipe(버림)·검증된 A/B편 recipe가 별도 패널이며, source-qualified 판 근거와 side가 일치하지 않으면 편 미확정으로 남습니다. 새로운 판/사람/소유자/원좌표는 만들지 않습니다.
- projector와 명령 후 synchronize 모두 같은 공통 함수를 사용합니다. 최신 동일 실제판의 frame을 subregion에 연결하며, 원값·raw·ID·native placement는 그대로입니다. A→중앙→B 관계는 `profile-opposed-display` 표시 관계이고 실제 이웃/소유 증거가 아닙니다.

**UI 소비 계약**

`SceneRegion.displayContext?: {kind: 'physical-board'|'shared-center'|'opposed-side'|'unknown-side'; boardSide?: 'A'|'B'}`. 실제 판은 기존 `boardEntityId`로 참조합니다. `SceneGroup.presentation.boardEntityId?: string|null`은 표시 side의 source-qualified 판 근거입니다. 기존 panel/region/group 렌더 계약을 그대로 사용하므로 새 UI 추론은 필요하지 않습니다.

**직접 검사**

1. `npx tsx --test tests/cloud-contract.test.ts tests/cloud-gemini-execution.test.ts tests/component-linking-api.test.ts tests/performance-storage.test.ts tests/cloud-persistence.test.ts` — **16/16 PASS** (`green.log`). 기존 실패 재현은 `red.log`(7FAIL)로 보존했습니다.
2. `npx tsx --test tests/retired-pack-continuation.test.ts tests/restoration-system-http.test.ts` — **9/9 PASS** (`retired-scene.log`, LC 추가 이전). 구판 source/version, PIN/room, component 이동, 원자 실패/명령 동일성 유지.
3. `npx tsx --test tests/restoration-system-http.test.ts tests/restoration-system-projection.test.ts` — **13/13 PASS** (`lc-subregions.log`). 실제 LC 입력으로 판 명령→commit→reopen→resume의 중앙/A/B 분리·동일 실제판·원 assertions 불변 확인. 최초 synthetic field fixture는 recipe 근거를 바꿔 실패했으므로 이 LC 검사만 원본 field/assertions와 exact catalog wrapper를 쓰도록 교정했습니다.
4. `npx tsc --noEmit` — **PASS / exit0** (`typecheck.log`, empty).
5. `npx tsx docs/restoration-system-implementation-20261113/sol2/replay-nine.mts` — 기존9응답 input unchanged. LC baseline은 2→5 표시 영역(관측판1, 버림5, A19, B16, 미위치1), high6/low5/medium5영역. 이는 구조/보존 재생이며 사진 정답·새 인식 정확도가 아닙니다. 기존 재생 스크립트가 `sol2/replay-nine.json`을 갱신했고, provider 원본/팩/사진은 바꾸지 않았습니다.

**긴 기존 검사**

`real-board-free-save-resume-api.test.ts`에는 Frosthaven 위치223개 저장 loop가 있습니다. 60초/180초 bounded 실행은 timeout으로 취소됐으며 단언 실패는 없습니다. private diagnostic copy는 원본 검사/제품을 바꾸지 않고 request/response 메타만 추가했고, 60초 내388개 요청 중387개 응답을 확인했습니다. 이 취소를 기능 PASS로 보고하지 않습니다. 최종600초 bounded 원본 실행은 기능 PASS, **349.538초**였습니다(`free-save-resume-final.log`). 감독이 확인한 과거 동일 검사의64.009초 대비 성능 회귀이므로 성능 PASS는 아닙니다.

**변경 범위 / 남은 범위**

이번 delta는 `source-inventory.json`의14파일입니다. 기존 공유 dirty 변경은 보존했습니다. 이전38파일 freeze 및 그 SHA 기록은 역사적 근거로 유지합니다. 이번 inventory는 현재 전체 파일 SHA이며 기존 타인/이전 delta까지 전부 새로 수정했다는 뜻이 아닙니다. src 편집·새 provider·전체 suite/build·commit/deploy0. 실제 브라우저 표시와 전체 통합 검사는 감독 소유입니다.

## 저장/복제 비용 후속

30초 CPU 샘플19,816개 중 structuredClone7,579개(38.2%): codec.expand3,419 / redactSession1,628 / snapshotRestoration1,297 / transaction clone1,069. JSON read2,023, GC1,999개입니다. 샘플은 private 원본 검사 사본에만 계측했으며 시작 로딩과 동시 실행 영향을 포함합니다. 운영 latency가 아닙니다.

추가 최소 수정: 기존 codec의 content-addressed object table로 동일 `profile`/`restorationProfile`을 중복 저장하지 않습니다(버전·bytes·literal/null/0 유지, decode 복사본은 서로 독립). privacy는 이미 isolated structuredClone한 응답에서만 snapshotRestoration의 detached 경로를 사용해 추가 전체 clone을 생략합니다. 필터/닫힌 scope 검증은 같은 코드이며 보통 snapshot 호출은 계속 pure입니다.

동일 원본의 assertion/body를 바꾸지 않은 private 계측 사본은 **826요청/253.889초 PASS**였습니다. 현재 보완 전349.538초보다 관측상27.4% 감소했지만 과거64.009초보다 여전히 느립니다. 동시 실행·계측 차이가 있는 로컬 실행이며 통제된 성능 인증은 아닙니다. 최대251snapshots, 응답 최대12,613,501bytes; 요청p50 276.7ms/p95 708.7ms/max947.1ms. 중첩 가능한 누적 getSession110.74s/saveSession54.31s/transaction clone24.93s/atomicWrite7.52s입니다. 상세는 `performance-summary.json`·`free-after-metrics.json`(요청별)·`after-probe.json`(사본 출처)입니다. 검사의 의도적인400/409 요청도 포함되며 모든 응답이200이라는 뜻은 아닙니다.

감독의 설계 확인에 따라 commit/save-intent의 additive sidecar 및 snapshot pin은 계속 보존합니다. lazy 생략·새 캐시/응답 형식·데이터 삭제로 수치를 낮추지 않았습니다. **성능 회귀 잔존**으로 동결 인계합니다.

마지막 detached closure 교정: prune 전 entities/groups/regions 수와 entity별 binding 수를 먼저 캡처하므로 같은 객체를 정리해도 closed 판정의 원뜻이 유지됩니다. private 잔여 실물/그룹을 제거하면 lastCommand/questionDecisions/appliedCommandIds/명령 digest도 정리하며 원본·원profile/readout/raw는 변하지 않습니다. 위 시간 계측은 이 후속 교정 직전이며 실제 부분 scope 의미는 최종 직접 회귀에서 확인했습니다.

**최종 현재 소스 검사: 41/41 PASS**, `npx tsc --noEmit` exit0 (`final-focused.log`, `typecheck.log`). 기존 개별 실행 수와 중복되므로 합산하지 않습니다. 전체suite/build와 실제 브라우저 LC 표시는 감독에게 남깁니다.
