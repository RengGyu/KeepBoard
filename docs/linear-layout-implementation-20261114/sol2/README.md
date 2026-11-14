# Sol2 동결 인계

**VERIFIED — 소스 동결.** C1 retained / C2–C4와 계약검토 material 1·3을 구현했습니다. provider 호출 0, Git·배포 0, src·sceneDisplay·sceneLayout 편집 0입니다.

## 실제 변경
- `sceneProjection`은 요청 영역을 `requestAreaIds/contextRoleIds`로 분리하며 관측 역할은 explicit sourceAreaId 또는 검증된 scene region만 사용합니다.
- 신규 `sceneStructure`가 같은 허용 scope/출처의 unique live entity를 참조합니다. 반복 receipt는 중복 연결하지 않고 foreign·삭제·충돌·모호 참조를 제외합니다. 검증 scene의 precedes 및 지원 spatial before/stack/attachment/overlap/adjacency를 연결하고 branch/cycle을 부분순서·미확정으로 전달합니다. 관계만으로 판/셀을 만들지 않습니다.
- 소비하는 검증 구조·출처와 projector version을 fingerprint에 포함합니다. 수동 split/merge·역할·판·frame·보관을 재연결하고 불가능한 결정은 `unappliedEdits`로 보존합니다. 새 구조 때문에 사라진 region을 향하는 파생 관계/frame은 닫힌 그래프에서 제거합니다. 부분 scope 응답에서는 unapplied 원결정도 기존 inverse와 같이 제외하며 원본 저장 상태는 변이하지 않습니다.
- boardContexts는 최종 presentation에만 적용합니다. asset 없음/valid/mismatch에서도 semantic entity/group/region/membership/geometry/revision은 같습니다. 실제 Sagrada canonical18은 원주소를 보존해 retained adapter hint로 전달하며, unsupported estimator의 유효 manual/board/group도 retained로 유지합니다.
- server catalog의 exact pack/version/source/edition lookup이 현재 생성 profile을 선택합니다. shared는 선택 pack profile을 previous 캐시보다 먼저 쓰며 정확한 새 metadata가 없는 구판은 호환 previous fallback을 유지합니다. 저장 gamePack/snapshot의 과거 pin은 직접 변경하지 않습니다. 이전 historical-cache 회귀는 이 승인 정책에 맞춰 ‘exact metadata 없음’ fallback을 검사하도록 조정했고 별도 정상 HTTP 최신선택 검사를 추가했습니다.
- 네 semantic source만 추가했습니다. Hanabi display grid/더미, Azul 1..5 pattern·5×5 wall·7 floor, Carcassonne tile network·50칸 track, Dominion 17 supply pile 단위를 분리합니다. 기존 board.json과 spatial pin을 참조하고 canonical 주소·표시 자리·물리 더미를 혼동하지 않습니다. 원래 generator를 재사용했으며 생성120 중 해당4만 변경되고 다른116은 동일함을 검사했습니다. 원팩 ID/version/source/edition tuple은 전부 불변입니다.

## 직접 검증
- `node --import tsx --test tests/linear-scene-contract.test.ts tests/restoration-system-projection.test.ts`: **20/20 PASS**, 3.01초. 기존 실제9사례 입력·값·ID·raw digest 불변과 재투영 안정성 포함.
- `node --import tsx --test tests/linear-scene-http.test.ts tests/restoration-system-http.test.ts`: **9/9 PASS**, 10.01초. localhost 권한만 별도 허용. 준비된 asset UI의 명령→context없는 서버, exact 최신 profile의 정상 저장 view 선택, 수동 split/merge·role·board·frame·preservation과 구조 갱신→commit→reopen→resume, 기존 원자성/멱등/foreign/stale 경계 포함.
- `npx tsc --noEmit`: **exit0**, 로그 0 bytes. 전체 suite/build는 실행하지 않았습니다.
- 최종 로그는 `focused.log`, `http.log`, `typecheck.log`. 소유15개 파일과 SHA는 `source-inventory.json`; 기존 tracked source delta는 `tracked-delta.patch`(대형 generated diff는 제외, source-inventory에 별도 pin), 새 파일은 inventory 경로에 있습니다. 생성 전 기준 `profiles-before.json` 보존.

## 남은 확인 경계
- C2의 최종 photo component 순서, free/slot frame 태그 및 실제 adapter/DOM은 Sol1 소유입니다. 본 검사는 shared 부분순서와 서버 계약까지입니다.
- 새 사진 정확도·새 판독·실운영 데이터 검증이 아닙니다. role/관계가 없으면 계속 미확정이고 display-grid/pile은 canonical 점유·숨은 수량의 증거가 아닙니다.
- root가 전체 suite/build, 실제8 App 및 독립 최종 검토를 이어받습니다. 추가 소스 변경/검사 반복 없이 반환합니다.
