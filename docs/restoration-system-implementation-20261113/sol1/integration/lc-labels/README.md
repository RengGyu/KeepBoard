# LC 제목·줄 라벨 후속 재동결

**VERIFIED:** `RestorationSceneView`의 표시만 좁게 교정했다. 이미 조합된 `presentation.label`의 ` · ` 구분 문구와 side/color의 정확히 같은 표기를 중복 표시하지 않는다. 관측값이나 의미 alias를 바꾸지 않는다. `관측편 A · 관측편 A · blue · blue`는 `관측편 A · blue`가 된다.

패널 제목은 region.label을 항상 유지하고 실제 binding이 있는 판의 이름을 보충한다. 같은 boardEntityId를 쓰는 A/B subregion도 서로 다른 region ID·제목·패널로 남는다. UI가 판 ID로 구역을 다시 합치지 않는다. bindings 없는 spatial 판의 의미 있는 영역명 fallback도 유지한다.

관련 직접 검사 **16/16 PASS**, 범위 tsc **exit0**. 정확 명령·전후 SHA는 [freeze.json](freeze.json), 자기 delta는 [delta.patch](delta.patch). `tests.log`, `typecheck.log` 보존. source2파일 외 제품 변경0, shared/server/raw/owner/물리 순서 변경0, 유료/전체suite/build/commit/deploy0. 실제 Chrome 최종 검수는 감독 소유다.

현재 두 파일 SHA는 이 freeze가 이전 integration 및 sol1 freeze보다 우선한다. 나머지 파일은 이전 인계 기준을 유지하며 소유권을 반환한다.
