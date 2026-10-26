# 격리 통합 수정과 검사 분류

1. **실제 타입 호환**: GenericPiece.readout union 확장 때문에 기존 `getSplendorReadout(piece)` 호출이 타입 오류. 입력 readout을 unknown으로 받고 기존 Splendor strict validator를 그대로 적용. 다른 게임 schema를 Splendor로 허용하지 않음. `shared/splendor.ts` 1줄.
2. **외부 테스트 타입 오류**: carcassonne 테스트의 union `.values` 접근을 assertion으로 좁힘. 검사 삭제/완화 없음.
3. **독립 P2, 실제 API RED→GREEN**: 기존 관측 후보를 명시 적용한 뒤 같은 piece.id/관측값을 다른 허용 photo-b로 연결하면 PATCH200. 새 `validateReadoutEvidenceChanges`를 engine typed 경계에서 호출해 같은 field/owner의 accepted/candidate에 남은 관측값의 조용한 사진 재지정을 거절. 사용자가 직접 재확인하여 source=user인 값과 readout 없는 legacy 수동 기록은 재연결 가능. import 최초 출처에 과거 이력을 새로 만들어 검증하지 않으며, 새 권한체계/전 게임 원본 고정은 추가하지 않음. API 재현 및 기존 common/Splendor/room 경계 집중13/13 통과.
4. **사본 구성 누락(제품 결함 아님)**: gateway/server.mjs·타입, 공식자료 evidence의 local_text, coverage가 해시로 참조하는 공개 아트ZIP을 현재 저장소 그대로 보완. stub/테스트 삭제 없이 첫 전체3실패가 해결됨. 제외한 비밀/개인/운영자료는 계속 미첨부.
5. **통합 회귀 추가**: Carcassonne/Scout/Sagrada 실제 API upload→mock normalize→candidate 미확정→명시accept/manual→commit/export/import/resume, null/0·ID/원본·기존팩, 잘못된 snapshot schema/Carc 대상 연결 거절.

변경은 모두 임시 앱 사본에만 존재합니다. 공유 제품 소스·dist 수정 없음.
