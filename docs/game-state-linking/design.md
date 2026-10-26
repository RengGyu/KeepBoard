# 판독 실물의 상태 연결 설계·실행 계획

목표는 이미 읽은 실물을 게임팩의 허용된 필드/영역/소유자에 **사용자가 명시적으로 연결**하고 기존 기록·근거·저장/재개를 보존하는 것이다. 서비스 모델은 deepseek-flash/high를 유지하며 이번 구현에서 유료 재분석을 전제하지 않는다. 기존 사용자 데이터는 자동 변경하지 않는다.

접근: 기존 `GenericRecord`/fieldBindings와 공통 API를 재사용한다. 118게임별 별도 소유권 엔진이나 모델의 자동 소유자 추측은 만들지 않는다. native Catan/Rummikub는 기존 전용 경로 그대로 검증한다. 판독시 owner 추측을 푸는 대안은 사진 접근 문맥과 실제 소유를 혼동하므로 사용하지 않는다.

## 프런트 계약 (초기 고정)

- 새 `shared/componentLinking.ts`: `ComponentLinkTarget {field:string; label:string; ownerId?:string; ownerName?:string; visibility:'public'|'owner'}` / `ComponentLinkRequest {sourceAssertionId:string; pieceIds:string[]; target:{field:string;ownerId?:string}; expectedTargetAssertionId:string|null; corrections?:GenericPiece[]; clearPlacement?:boolean}`. 소스 ID가 현재 스냅샷의 관측/확정값과 맞아야 하며 대상 accepted ID도 대조한다.
- `GET /api/sessions/:id/component-links/:assertionId?pieceIds=a,b` → `{sourceAssertionId,pieces,targets,targetVersions}`. 현재 선택 구성물의 타입·영역·소유자·사진 공개범위·PIN/방 권한과 교집합인 대상만 반환한다. field/owner 선택이 구매·예약·시장 상태 선택이다. 정의 없는 상태를 새로 만들지 않는다.
- `POST /api/sessions/:id/component-links` → 기존 `SessionView`. selected 실물을 **대상의 기존 목록에 추가**하고 다른 카드/수량/dirty 영역을 덮지 않는다. 같은 출처 실물의 같은 연결 재전송은 중복되지 않는다. 다른 연결로 재적용은 충돌로 거절하고 현재 보유 기록에서 명시적으로 이동해야 한다.
- GenericPiece에 서버 발급 `linkOrigin`(원래 assertion/piece/field/owner, 필요한 이전 배치 참조)을 선택적으로 둔다. 새 AI는 이를 만들 수 없고 수동 편집은 기존 원본 연결을 임의 변경할 수 없다. candidate 원문은 보존하며 UI는 이미 연결한 실물을 구별한다. source가 accepted면 사용자의 이동 명령에 한해 해당 목록에서 selected만 제거한다. 스냅샷/export/import는 기존 piece 구조와 함께 origin을 보존한다.
- 공개 후보를 본인이 보유 기록으로 연결하는 것은 원문 수정이 아니므로 room 멤버도 본인 목적지에 허용한다. 확정 source를 바꾸는 이동은 기존 source/destination 쓰기 권한 모두 필요하다. private 원본을 공개 필드로 내리는 것은 금지한다. 원본 crop/ID/readout/null/0/부착 참조를 보존하고 관계가 끊어지는 부분 이동은 거절한다. 다른 영역의 배치는 추측하지 않으며 사용자가 명시해 unplaced로 옮길 때만 이전 배치를 origin에 남긴다.
- Splendor는 기존 `player.scene`=구매 카드·토큰, `reserve.scene`=예약, `market.scene`=시장으로 연결한다. `shared/splendor.ts`의 순수 `splendorBonusSummary`로 **기록한 구매 카드**의 보너스만 보여준다. 예약/시장/미귀속/귀족/토큰은 제외하고, 모르는 bonus/quantity는 총값을 확정하지 않는다. 전게임 자동 점수 엔진은 만들지 않는다.

## 실행 계획

- [ ] 1. 격리 snapshot/preimage를 고정하고 현재 tray→보유 누락 RED 합성 회귀를 만든다.
- [ ] 2. 공통 target/명시 link/보호 provenance/재전송·부분선택·기존값 보존을 구현하고 순수 및 API 회귀를 통과시킨다.
- [ ] 3. Splendor 구매/예약/시장 의미·보너스 summary를 검증하고 정확 타입/API를 UI 담당에 인계한다.
- [ ] 4. 현재120팩의 binding/component/readout 실제 허용 여부·owner/area·저장/export/import/resume를 evidence matrix로 기록한다. native2는 강제 변환하지 않으며 지원하지 않는 secret/opaque는 구별한다. 독립 감사 결과와 연결 공백만 반영한다.
- [ ] 5. UI 연결 후 focused/기존 회귀·타입·별도 outDir build, 같은 프로젝트 synthetic preview의 실제 API/UI로 구매/예약 명시 적용→저장→재열기를 확인한다. 구체 diff/배포 대상을 감독 확인 후 같은 production alias에 반영한다.

검토 초점은 중복·다른 owner/epoch의 근거 재귀속·private 공개·수동 dirty 덮어쓰기·참조/배치 유실이다. 실제 사용자 세션은 A0 공개 진단만이며 수정하지 않는다. 실제 모델 정확도/응답시간은 별도 제한된 비교안으로 제시하고 합성 통과와 혼동하지 않는다. 새 에이전트/커밋은 하지 않는다. 계획은 본 세션이 직접 실행한다.
