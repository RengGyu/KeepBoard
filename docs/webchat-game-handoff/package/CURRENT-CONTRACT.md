# 현재 경계와 삽입 지점

아래는 snapshot 코드로 확인한 VERIFIED 사실입니다. 함수명을 검색하면 실제 호출부가 있습니다. 운영 설정/키/사용자 레코드와 실제 모델 출력은 첨부하지 않았습니다.

## 데이터 흐름

1. `src/SessionWorkspace.tsx`: 촬영 run/선택 사진 업로드와 명시 사진 읽기. 현재 선택 owner/stage/epoch와 실제 성공 evidence ID에 한정합니다. AI 미연결·실패·원본 보관은 구분합니다.
2. `shared/recognition.ts`: recognitionCapability → 고정 source/edition/hash의 사진 허용 필드와 safe binding만 관측; effectiveRecognitionPack → 미귀속 tray `__photo.public`/`__photo.owner` overlay; recognitionFields → 공개 또는 본인 범위. 예전 pinned pack도 호환 source 목록으로 판독하되 저장팩 자체를 바꾸지 않습니다. `recognition-index.json`은 판독 허용의 근거이며 그림용 변형 목록과 혼동하면 안 됩니다.
3. `server/ai/fields.ts`, `prompt.ts`, `generic.ts:genericObservationPrompt`: native/common dispatch, 허용 field/component와 원본 ID·crop를 모델에 전달합니다. 공통 label 관측과 Splendor 전용 readout 요청이 있습니다.
4. `server/ai/index.ts:normalizeObservations` → `genericCandidateValue` → `shared/genericRecord.ts:validateGenericRecord`. fresh AI만 `server/ai/splendor.ts` 색 동의어 등을 처리하며 manual/import strict와 분리됩니다. 원본/종류/variant/소유범위/좌표를 검사하고 새 실물 ID를 줍니다. AI placement는 금지, crop는 원본 내 정규화 0..1입니다.
5. `server/index.ts` analyze는 revision/CAS 및 scope 뒤 candidate로만 저장합니다. `appendGenericObservation`은 valid nonempty 같은 field+owner+동일 evidence 집합의 이전 candidate만 교체합니다. accepted/다른사진 후보/실패·빈 결과는 보존. dedicated/tray 간 동일 원본+정확crop+component만 중복 제거하며 비슷한 카드의 identity는 합치지 않습니다.
6. `src/GameEssentials.tsx`: 후보 field/count를 노출하고 명시 apply; 같은 필드 dirty 초안은 충돌 차단, unrelated dirty 편집기를 자동 전환·유실시키지 않음. `GenericComponents`/`GameBoardRecord`는 실제 accepted 또는 사용자 편집 초안을 표시합니다. `GenericPieceArt`가 Splendor readout 또는 일반 아트/원본을 연결합니다. `SplendorEditor`는 null/0 개별 수정; 종류 미상은 표시와 편집 시작값을 구분합니다.
7. `server/index.ts` accept와 `server/engine.ts` 수동 answer/typed 경계 모두 검증. 명시 사용자 적용/저장 뒤 accepted → commit/snapshot. `runtimeResume.ts` 범위 복원은 공개/타owner/전역 시계 보존 계약을 가집니다. 상단 저장은 등록된 editor/보관위치 draft를 flush하지만 pristine 후보를 몰래 확정하면 안 됩니다.

## 현행 GenericRecord (실제)

`{version:'game-component-record-v1',pieces:GenericPiece[]}`. 각 piece: `id, componentId:string|null, variant:string|null, quantity:number|null, label, anchor, evidenceId:string|null, region:normalized rect|null`, optional `placement:{areaId,x,y,rotation:0|90|180|270}`, optional `readout`.

- ID는 서로 다른 실물마다 달라야 하며 같은 모양 복제품을 합치지 않습니다. 배열 순서·label·anchor·evidence/region을 손실 없이 유지합니다.
- placement는 binding 영역의 수동 위치이며 photo crop와 다릅니다. 오래된 placement가 없으면 자동 채우지 않습니다.
- field binding의 componentIds와 areaIds, owner와 사진 scope가 맞아야 합니다.
- `readout`이 존재하면 현재는 **Splendor만** 허용되며 `schema:'splendor-v1'` strict key/kind/component 검증을 합니다. 다른 게임에 readout을 넣으면 거절됩니다.
- Splendor readout: kind development/noble/token/deck/null; points, bonus, full5색 cost/requirements maps, color, level. 수치는 null 또는 0 이상 정수, full map의 미확인색은 null. quantity는 바깥 piece 값입니다. 전체 face가 보이며 없는 색임을 확인한 때만 0입니다.
- `getSplendorReadout(piece)`는 structured > strict legacy-label > unread. 원label을 rewrite하거나 영구 migration하지 않습니다. UI 숫자 편집과 fresh AI 언어 정규화는 다릅니다.

## 확장 제안 (아직 없는 API)

다른 게임에 `game-x-v1` 같은 schema discriminant와 게임별 payload를 공통 registry로 dispatch하는 설계는 RECOMMENDATION입니다. 현재는 이 registry가 없습니다. 구현한다면 genericRecord와 AI/manual/accept/import 경계를 함께 갱신하고, unknown schema를 암묵적으로 통과시키지 마세요. 기존 splendor-v1 및 readout 없는 레코드는 그대로 유지하세요. 무리하게 모든 게임이 동일 수치 구조라고 가정하지 마세요. 새 판본 고정/호환 설계와 recognition-index 생성 근거를 검토하고 대량 팩/version 변경을 자동으로 하지 마세요.

## 안전한 연결 범위

공개 이미지는 숨은 손패·역할·덱 내부를 관측하지 않습니다. owner 사진은 그 owner만 쓰며 공개 필드에 private 원본을 연결하지 않습니다. PIN은 참가신원과 별개; 방 host도 타인 비공개 내용을 볼 권한이 없습니다. room host 공용+self, member 공용 읽기+self 수정. 기존 단일기기 모드의 다른 owner 선택과 초대방 권한을 혼동하지 마세요. photo/analyze/accept/PATCH/commit/snapshot/restore 모든 서버 경계를 유지해야 합니다.

## 실행 부분집합의 누락

snapshot은 import closure 전체가 아닙니다. server Store/launcher/설정 모듈 일부, 앱 진입/전체 UI/CSS, 일부 native helper/fixture, lockfile과 node_modules가 없습니다. `server/index.ts`/`SessionWorkspace.tsx`는 삽입위치 참조용입니다. 실제 repo에서 import를 연결하고 npm test/build를 실행해야 합니다. 요청한 게임과 무관한 파일 전체를 새로 생성하거나 기존 연결부를 통째로 갈아엎지 마세요.
