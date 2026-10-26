# 사진 인식 공통 연결 · 실행 계약

## 직접 확인

현재 generated120은 native/native2 + generic/manual118이다. `SessionWorkspace.newCaptureRun:83–85`가 generic AI를 끄고, `server/index.ts:146`도 manual analyze를 거절하며, `ai/fields.ts:4–7`은 manual을0필드로 만든다. 생성 generic 필드는 ask이고 GenericRecord normalizer/prompt가 없다. `GameEssentials:28–31,48–57`은 accepted만 편집한다. 따라서 UI gate 하나를 없애도 끝까지 연결되지 않는다.

무과금 pure probe(exit0): Splendor observable0/candidate0, 동일 GenericRecord 수동 검증1·명시 대표그림 resolve 성공. 임의 variant 문자열은 기존 validator가 허용하지만 renderer는 unknown. 공용 player.scene에 private owner사진 참조를 넣으면 현재 engine 허용 source 규칙이 거절한다. 사용자 사진/Store/운영 호출 없이 코드·합성 값만 확인했다.

## 최소 공통 계약

1. **고정 원명세에서 photo 허용을 별도 index로 생성**한다(game/edition/sourceSHA/sourceField/acquisition/scope/component/area). current + 실제 예전 source 증거가 있는 SHA만 호환 등록한다. pinned pack/raw source/version/기존 답변을 바꾸지 않고 binding 대조로 effective capability를 계산한다. native2는 기존 dispatch 그대로, generic118는 eligible fields/exclusions를 전수 보고한다. 출처 미확인/custom/mismatched source는 manual로 남긴다.
2. component-catalog + 원명세 acquisition photo + safe public/owner만 허용한다. opaque/physical-only/own-hidden/role-limited/덱 내부/시간·차례·기록메모는 제외한다. scalar는 photo 원명세 **및** 가시적인 scalar whitelist를 둘 다 요구한다. 현재 generic 원명세의 photo scalar는0개이므로 임의로 ask 숫자를 관측으로 승격하지 않는다.
3. **미귀속 관측함**을 effective pack overlay의 예약 필드/바인딩으로 제공한다. raw `session.gamePack`/version/hash는 유지하고 API/view/engine에만 같은 overlay resolver를 적용한다. 공개 관측함은 공개 사진의 공개 물체만, 개인 관측함은 해당 owner만. Splendor 공급 chips처럼 기존 public binding이 없는 실물을 공용 관측함에 남기며 잘못된 market/owner/geometry에 넣지 않는다. save/snapshot/reopen/import/restore도 동일 effective binding으로 처리한다. 이 영역은 원명세의 공식 공간이라고 표시하지 않는다.
4. **개인 사진→공개 player 필드 출처 충돌은 권한 완화로 풀지 않는다.** player/public 필드로 갈 물체를 개인 사진에서 읽었다면 private owner 관측함에 보존한다. private 필드는 자체 원래 owner binding을 사용한다. 공개 결과에 private crop/ref를 넣지 않고 기존 room/PIN/redaction을 재사용한다. public source의 owner 미확인은 공개 관측함, room public 분석은 host가 타인 owner field를 쓰지 않게 한다.
5. 출력은 영역별 assertion 1개에 `game-component-record-v1/pieces[]`. 실물ID 독립, componentId는 허용값/null, variant는 유효한 **표현 선택**/null(상업 카드 정체 아님), quantity null≠0, evidenceId는 실제 해당 source, region은 그 사진의 정규화 영역, placement는 허용 수동 area/유한 좌표만이며 기본 미배치다. 모르는 실제 카드 ID/비용/소유자/정밀 지형을 만들지 않는다. 의미가 불명확한 extras는 저장하지 않는다. 같은 필드 중복 응답은 마지막 값으로 덮지 않고 보류한다.
6. 그림은 기존 art mapping을 재사용한다. variant=null이면 crop/원본 또는 종류의 중립 대표형+확인한 label을 보여 주고 첫 variant를 정체로 자동 지정하지 않는다. 읽기 가능한 비용·색·눈금은 label/anchor에 근거 있는 내용만 보존하며 새 규칙 엔진/상업 카드 데이터베이스를 만들지 않는다.
7. 필드별 후보 미리보기→원본/그림 확인→선택 수정→**이 후보 적용**으로만 accepted를 바꾼다. 상단 저장/탭 전환/사진읽기 flush는 pristine 후보를 확정하지 않는다. 명시 교체는 그 field만 바꾸고 unrelated IDs/order/placement·원본은 유지한다. 후보 검토 초안은 분석/poll로 초기화하지 않는다. 기존 accepted 편집 초안 보존 정책도 유지한다.
8. 기존 업로드 사진에 **사진 읽기**를 제공한다. configured/eligible/허용 owner 조건을 공통 helper로 판정하고 finish/batch6/epoch/revision/한 번 호출은 유지한다. stored-only/no AI/unsupported/no-result/failed/success를 구분한다. UI/카탈로그는 effective ‘사진 보조 인식’ 표시이며 전체 규칙/정확도 완료가 아니다.

## 경계 검증

- RED: 현재 Splendor raw assertion가 observable0로 사라짐, accepted-only UI, manual analyze 거절.
- normalizer: field/component/variant/source/region/placement/unknown/null0·중복물체·중복필드/숨김/시간값 거절, 대표 card/dice/tile/owner.
- API: 고정 예전팩 원문 동일, public tray의 은행 chips, owner 사진 private tray, PIN/room foreign/public403/CAS·지연실패 accepted 유지; explicit apply 후 save/reopen/import/restore.
- UI: mock 실제 Splendor crop/대표그림 후보→수정/적용→상단저장→reload, 기존사진 재읽기, 390/320overflow. mock과 실제 모델 품질을 구분한다.
- 120 dispatch/118게임별 eligible+제외 JSON, frozen source/type/test/build. 허용 실제 smoke는 **새 합성 PNG 최대2회**만, 기존 설정은 프로그램으로 사용하고 키/유저사진을 열지 않는다. 실패 시 유료 재시도 없음.

예정 파일: shared recognition/index·genericRecord의 좁은 계약, ai generic adapter/fields/prompt/index, server/index의 effective resolver·validation, Generic candidate UI/GameEssentials/GameBoardRecord/SessionWorkspace·capability label, 전용 tests/docs. 원명세/아트/기존 source freeze/운영은 수정하지 않는다.
