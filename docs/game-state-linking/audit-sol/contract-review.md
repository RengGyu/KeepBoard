# 제안 계약 대조 (제품 구현 검토 아님)

검토한 입력: `docs/game-state-linking/design.md`의 초기 고정 계약. 기준 제품은 `5598415f…`이며 구현 리드의 WIP는 읽거나 수정하지 않았다.

- **L1 해결 가능:** `sourceAssertionId + pieceIds + target.field/ownerId`가 미귀속/다른 영역의 실물을 실제 상태로 연결한다. 기존 target 목록에 selected만 추가하고 candidate 원문을 보존하는 방식은, 전체 필드 교체나 물리 개체의 무조건 복제를 피한다. 같은 origin 재전송 중복 방지, 다른 목적 재적용 충돌, accepted 이동의 양쪽 권한, 관계가 끊어지는 부분 이동 거절은 필수 완료조건이다. API가 실제로 이 조건을 지키는지는 이번 감사에서 실행하지 않았다.
- **L2는 API만으로 해결되지 않음:** room의 공용 화면은 `scope=public`만, 소유자 탭은 자기 것만 표시한다. 연결이 완료된 **다른 사람의 public 플레이어 기록**도 읽기 전용으로 볼 UI가 필요하다. 개인 사진·owner 기록·PIN은 함께 보여주지 않는다. Wingspan 합성 SSR로 현재 누락을 확인했다.
- **L3는 existing-field-only로 해결 불가:** Splendor 공용 공급 chips에 맞는 기존 public 목적지가 없다. 현재 source의 보유/공급 구분 의미에 맞춘 최소 공급 필드/바인딩 또는 동등한 명시 역할 표현이 필요하다. 과거 pack/version/답을 자동 교체하지 않는 호환 연결이 조건이다. 원명세의 해당 주장 confidence는 `reported`이며, 이번 감사에서 공식 웹사이트를 새로 검증하지 않았다.

UI 수용조건: 후보의 실물 선택 → 목적 영역/플레이어와 **추가/이동** 구분 → 선택 실물 정정 → 명시 적용 → 목적지의 실제 그림/수치 표시 → 해당 저장 범위의 snapshot/reopen/resume에서 유지. pristine 후보를 탭 이동·촬영·상단 저장만으로 연결하지 않는다. 같은 필드 dirty draft와 충돌하면 명시 차단하고, 무관한 draft를 unmount/자동 확정하지 않는다. `placement`가 목적 영역에 맞지 않으면 사용자 동의 후 미배치로 옮기며 crop·원본·실물 ID/readout/null/0는 남긴다.

호환/비공개 조건: private 원본으로 public 목적지를 만들지 않는다. public source를 owner-private 대상으로 연결해도 원본 사진의 기존 공개성을 소급해서 바꾸거나 비밀이 됐다고 주장하지 않는다. room host는 타인 owner 영역의 이동/저장/PIN을 우회하지 못한다. legacy 단일기기의 public restore는 player/public도 복원하고, owner restore는 그 owner의 private만 복원한다. room은 fieldScope별 저장·복원이므로 UI가 저장 범위를 정확히 선택해야 한다.

10개 unbound readout component는 자동 신설 요구가 아니다. scalar로 이미 보유량을 기록하는 경우와 비밀/실물보관 항목을 구별한 `README.md` 표를 따른다. 이 계약으로 전 게임의 모든 실제 규칙·기하·사진 정확도가 완성됐다고 판정하지 않는다.
