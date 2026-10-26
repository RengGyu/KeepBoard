# 판독 실물 → 게임 상태 연결: backend 인계

**VERIFIED_SCOPED:** 기존에 읽은 실물의 명시적 목적지 연결·추가/이동 API를 구현했다. 새 모델 호출이나 사용자 기록 변경은 구현에 필요하지 않다. UI·통합 preview·배포는 별도 통합 단계이며 이 인계만으로 완료라고 주장하지 않는다.

최신은 [R1 delta](../backend-delta-r1/manifest.json)와 [누적 manifest](../backend-delta-r1/full-manifest.json)이다. 최초 `470f6b5c…` 동결본은 이 폴더에 보존했다. 독립 검토 R1의 원래 연결표식 없는 카드 복원 중복을 실제 HTTP에서 RED→GREEN으로 교정한 최종 backend source는 **`bfb1572283c5e559be971602b7a0d6788dacb0117e0356cf7af528faabb90c3d`**이다. parent `5598415f…`, 정확14파일(제품10·새 테스트4), src 변경0. 초기14파일 소비 후에는 R1 2파일만 델타 적용한다. 처음 소비할 때는 R1의 누적14파일 patch를 사용한다. 실제 경로·before/after SHA는 manifest를 따른다.

## 동작과 보존

- `GET .../component-links/:assertionId?pieceIds=a,b`는 선택 실물과 게임팩·사진·PIN·방 권한 교집합의 목적지를 반환한다. POST `.../component-links`는 `sourceAssertionId,pieceIds,target:{field,ownerId?},expectedTargetAssertionId` 및 선택 정정을 받는다. 기존 SessionView 응답·storage revision CAS·room expectedRevisions를 재사용한다.
- 후보 원문은 그대로 두고 목적지에 선택분만 추가한다. `linkOrigin`으로 처리 여부를 추적하며 같은 연결 재전송은 중복/덮어쓰기를 만들지 않는다. 다른 목적지 재적용은 충돌이며 현재 accepted 기록에서 명시 이동한다. accepted 이동은 양쪽 쓰기 권한이 필요하고 부분 이동이 부착 관계를 끊으면 전체 실패한다. 기존 대상·사진/crop·null/0·ID·순서·세부값을 보존한다.
- `unlinkedComponentPieces`로 남은 후보를 표시하고, 남은 선택은 **원래 field를 목적지로 같은 POST**를 사용해 확정할 수 있다. 이미 나눈 원문 전체를 구형 PATCH/accept로 재적용하는 중복은 거절한다. 서로 다른 목적지의 기존 dirty draft는 UI에서 먼저 해결하며 탭 변경이나 상단 저장으로 후보를 자동 연결하지 않는다.
- 다른 영역 배치는 추정하지 않는다. 호환되지 않는 placement는 `clearPlacement:true`를 사용자가 확인한 경우만 지우고 원배치를 origin에 남긴다. 수동 편집의 origin 위조/변경을 거절하며 import는 구조/사진/typed 검사를 유지한 채 저장된 origin을 보존한다.
- 부분 복원은 linked origin뿐 아니라 **이동 전 assertion.id/piece.id/evidenceId**도 비교한다. 다른 범위에 남은 실제 상태와 충돌하면 현재 상태를 변경하지 않고 복원을 거절한다. 연결표식 없는 과거의 다른 카드/중복을 임의로 같은 실물로 추측하거나 마이그레이션하지 않는다. legacy 단일기기 public 복원=player/public 포함, owner 복원=그 owner private만. room은 fieldScope별 commit/resume를 유지한다.

Splendor `player.scene`은 구매 카드·보유 토큰, `reserve.scene`은 예약, `market.scene`은 공개 카드다. 새 `supply.scene`은 base edition/chips 한정의 **effective additive overlay**다. raw pack/version/sourceSHA/기존 답은 교체하지 않고 import/재열기에서도 같은 capability를 적용한다. [공식 규칙](https://cdn.svc.asmodee.net/production-unboxnowcom/uploads/2022/02/Splendor-EN.pdf)의 Game setup / Buying a development card / The bonuses를 근거로 공용 토큰 공급을 구분한다. 새 사진 permission이나 인쇄판 기하·자동 게임 진행은 추가하지 않는다.

`splendorBonusSummary`는 accepted 구매 development의 보너스만 합산해 **‘기록한 구매 카드 보너스’**로 표시한다. 비용·예약·시장·토큰은 합산하지 않는다. 모르는 종류/보너스는 총값을 확정하지 않고, 수량 null은 해당 색을 null로 남긴다. 실제 모든 구매 카드를 기록했다는 보장은 아니다. 기존 명성 수동 기록이나 메모를 자동 덮지 않는다.

## 전게임 확인 범위

[독립 감사](../audit-sol/README.md)와 [실행 matrix](../implementation-matrix.json)는 다르다. 전자는 기존 원명세/팩의 지원·미지원 의미, 후자는 새 공통 실행기의 합성 저장 연결이다.

| 범위 | 실제 근거 | 한계 |
|---|---|---|
| 120개 고유 게임 | generic118/native2, 중복·누락0 | 모든 실제 규칙 재검증 아님 |
| generic118 | 선언된443목적지·747 component/목적지 조합, 실제 validator/linker→독립 BlobStore 클라이언트(MemoryObjects CAS)→재열기→resume | typed 세부값은 모름 양식, 실사진 인식 아님 |
| player/public | 141선언 목적지 포함, room 자기 상태 연결·타인 public 값 유지 | 화면의 타인 공개 상태 표시는 Claude UI 통합 필요 |
| Catan/Rummikub | 기존 전용 HTTP 회귀7개 통과, generic 강제변환0 | 모든 native 시각 판독 정확도 검증 아님 |
| hidden/opaque·scalar | 기존 실물보관·숫자·메모 경계를 유지 | 감사의 미연결10분류를 무조건 새 scene으로 만들지 않음 |

실행 명령·exit·테스트 수는 [초기 검증](verification.json)과 [R1 검증](../backend-delta-r1/manifest.json)에 기록했다. R1 최종 HTTP7/7, pure+120 matrix8/8, typecheck exit0. 초기 supporting pure25·native HTTP7의 결과와 새11개 테스트의 결과를 합쳐 전체 suite 수로 부풀리지 않는다. 최초 loopback EPERM은 권한 허용 후 해당3개만 다시 실행해 통과했다. R1 전 HTTP 실패2개는 수정 전 재현 근거로 보존한다.

원명세120파일·public672파일·pack6파일의 기존 SHA는 변하지 않았다. 공유 제품/운영 쓰기·사용자 자료 변경·실 AI 호출은 backend 구현 단계에서0. 유료 실사진 평가가 이후 별도 승인되어 진행되는 경우 [평가 ledger](../evaluation/requests.json)의 실제 횟수/비용을 별개로 본다. 같은 source/schema를 사용하는 합성/실사진 결과를 혼동하지 않는다.

## UI 통합에 필요한 계약

- 동결 `shared/componentLinking.ts`·`genericRecord.ts`·`splendor.ts`를 import한다. `componentTargetKey`/각 target의 targetAssertionId로 기대값을 보낸다. GET 목록은 현재 권한에 맞으며 일괄 client 추측으로 destination을 만들지 않는다.
- 같은 대상 dirty draft는 보존하며 연결 요청 전에 해결한다. API 409/400은 초안·선택을 유지하고 사용자에게 현재 연결/다른 창 변경을 확인하게 한다. 연결 성공 후 서버 view로 반영하고 그 **목적 scope**를 commit한다. public 원본을 private 목적지에 붙여도 원본 사진 자체가 비밀로 바뀐다고 표현하지 않는다.
- native 화면·PIN/방 접근 정책·기존 개인 사진 scope는 그대로 유지한다. 다른 플레이어의 public 상태는 읽기 전용으로 보이며 private 기록/사진은 섞지 않는다.

아직 남은 수용조건: Claude src 합성 → 전체 suite/type/별도 outDir build → 동일 프로젝트 preview 실제 UI/API → 감독의 구체 배포 범위 확인 → same alias 반영. 이번 backend 산출물만으로 공개 앱 반영을 주장하지 않는다. 소스는 R1 동결 상태이며 후속 수정은 정확 delta로만 인계한다.
