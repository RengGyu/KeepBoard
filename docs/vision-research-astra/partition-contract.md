# 사진 구획과 표시 계약 — 구현 인계

120개 개별 계약은 [coverage.md](coverage.md), 기계 입력은 `games/<game_id>.json`이다. 기존 고정 명세·런타임 팩·typed 양식을 대조한 **연결 제안**이다. 공식 규칙을 이번에 모두 다시 검증했다는 뜻은 아니다. 각 파일의 `basis`, `source_rule_gaps`, `schema_gaps`를 함께 읽는다.

## 현재 코드에 맞는 정보 경계

|실물 영역|현재 사진 입력/결과|정정·재개|
|---|---|---|
|공용판·시장·공개 버림|public 원본→허용된 공용 field. 부품 종류/자리가 불확실하면 `__photo.public`|원본과 후보 유지. 명시 적용한 값만 저장된 그림에 반영.|
|공개 개인판·보유 카드·말|public 사진이어도 주인을 모르면 `__photo.public`에 미지정. 자리/색으로 player ID를 추정하지 않음|사용자가 참가자·영역을 선택해 연결. 공개 정보라는 것과 누가 소유했는지는 별개.|
|본인에게 보이는 비공개 손패·개인 목표|선택한 owner의 private 원본→그 owner의 허용 private field. 함께 찍힌 공용물은 `__photo.owner`에 남음|개인 원본을 공용 field의 근거로 붙이지 않음. 공용화하려면 비밀 내용 없는 별도 원본과 사용자 확인이 필요.|
|자기에게 숨겨진 패·역할 전용 키·봉인/더미 내부|현재 physical-only. 사진을 찍을 수 있다는 이유로 일반 owner 필드를 열지 않음|내용을 추론하지 않고 실물 순서/방향을 보존. 한나비 손패와 코드네임 키가 대표 사례.|

코드 근거: `shared/recognition.ts`, `shared/readouts/registry.ts`, `server/ai/generic.ts`. 한나비 자기 손패의 정보 경계는 [공식 규칙 PDF, printed p2](https://abacusspiele.de/wp-content/uploads/2021/01/Hanabi_Regel.pdf), 코드네임의 공개 단어판/비밀 키 분리는 [공식 제품 설명](https://www.czechgames.com/games/codenames)으로 제한적으로 확인했다.

혼합 사진은 **업로드 전부터 원본 전체의 접근 범위**를 정한다. 이미 공용으로 저장한 원본 위에 crop 표시만 씌우는 것은 비공개 분리가 아니다. 일단 owner 원본으로 저장하면 같은 원본의 공용물 관측도 owner에 남기는 현재 정책을 유지한다. 공용 원본에 비공개 앞면이 보이면 내용을 공용 결과로 만들지 말고 별도 사진을 요청한다.

## 읽기와 복원의 최소 불변조건

1. 물리 부품 수량과 인쇄값을 분리한다. 한 카드의 비용 6은 카드 6장이 아니다. 가린 더미는 `quantity:null`; 확인한 빈칸만 0/empty. 완전히 보이지 않은 비용 패널에서 빠진 색을 0으로 채우지 않는다.
2. 앞뒷면, 글자/숫자, 색과 모양을 원본에 연결한다. 인쇄 정체를 읽지 못하면 임의 상용 카드 ID나 대표 아트 variant를 넣지 않는다. `variant:null`과 crop을 유지한다.
3. typed의 `manual` 속성은 자동 관측 대상이 아니다. 소유자·칸 좌표·회전 기준·SCOUT 사용 방향·부착 대상·도구 사용 여부를 사진으로 무조건 확정하지 않는다. 보이는 카드 뒷면에서 정체/미래 순서/사용 이력을 만들지 않는다.
4. `region`은 **해당 evidence 이미지 안의 0–1 좌표**다. 보드의 grid/hex/graph 위치와 다르다. 여러 사진에서 같은 객체인지는 직접 연결 근거가 있어야 한다. 같은 색·숫자 복제 부품을 합치지 않는다.
5. 여러 장을 한 요청에 넣으려면 같은 정지 상태·같은 접근 범위를 확인해야 한다. 현재 captureEpoch는 저장 단계 식별자이며 물리 상태가 같다는 증거가 아니다. 공개 웹의 서로 다른 경기 사진을 묶지 않는다.
6. 저장된 accepted/manual 값과 후보는 분리한다. 실패·빈 결과·부분 촬영은 기존판을 지우는 명령이 아니다. 재열기는 원래 차례·메모·배치를 유지하고 새 차례나 새 추론을 자동 생성하지 않는다.

## 최소 확장 제안 — 현재 기능이라고 표시하지 않기

현재 `Evidence`는 public/player+owner+epoch를 표현하지만 영역별 공개 범위, 동일 정지 상태 확인, 여러 원본의 동일 실물 연결은 없다. 필요한 게임부터 다음 작은 부가 기록을 둔다. 기존 Evidence/저장본은 삭제하거나 재해석하지 않는다.

```ts
type CapturePartition = {
  id: string;
  evidenceId: string;
  areaId: string | null;             // pinned pack area 또는 미지정
  region: Region | null;             // 원본 이미지 좌표
  access: 'public' | 'owner';
  ownerId: string | null;            // 접근자; 물리 부품 주인과 구별
  observedRole: 'common' | 'player-public' | 'owner-private' | 'unknown';
  staticStateId: string | null;
  staticStateBasis: 'user-confirmed' | null;
};
// 관측은 { evidenceId, region, partitionId? }를 참조.
// 물리 owner/placement/attachment는 기존 manual 정정과 확인 근거를 유지.
```

첫 연결에서는 별도 crop 업로드·새 좌표 엔진 없이 게임별 촬영 안내와 현재 허용 field/component만 사용해도 된다. 위 추가 계약은 여러 사진을 자동 합치거나 영역별 처리할 때 필요하다. 이 연구 JSON을 그대로 전체 프롬프트에 넣지 않는다.

## 그림판 적합성

중립 공통 그림을 재사용하는 것은 결함이 아니다. **저장 후 서로 다른 실물 상태를 구별할 수 없게 만들 때** 수정이 필요하다.

|유형|반드시 구별할 것|현재 한계와 가장 작은 대응|
|---|---|---|
|공용판 없는 카드/토큰 게임|카드 앞뒷면, 줄/묶음 순서, 공개/개인 구분|장식용 고정 보드를 실제 필수판처럼 보이지 않게. 원본과 카드 열/영역 목록이 우선.|
|격자·자유 타일|타일 방향·인쇄 도형·말 자세·빈칸|수동 xy와 사진 보존. 카르카손 도로/도시/들판의 전체 연결 판정은 현재 typed feature 이름과 다름.|
|육각·노선·관계 그래프|60도 방향, 부모 칸/노선, 인접성|generic rotation은 0/90/180/270만. Catan native는 별도 고정 topology 유지. 필요한 게임에만 방향/칸 참조를 추가하고 원본 대조를 제공.|
|주사위·개인판|색, 윗면 눈, 칸, 인쇄 제약을 독립 표시|기호/숫자를 읽었으면 그림에 보이게. 가린 창문 제약은 주사위 색으로 추정하지 않음.|
|겹침·층·회전판|부착 대상·층·아래/위·동심층 회전|평면 generic xy로 실물 복원을 보장하지 않음. 아크로폴리스/SETI 등은 원본·수동 층/부모 정보가 핵심.|

윙스팬 카드의 비용·점수·둥지·알 한도 등은 별도 인쇄 정보다([공식 rules reference의 Bird Cards](https://wingspan.rulepop.com/#bird-cards)). 현재 typed가 이름/서식지만 저장한다고 이 인쇄 패널까지 보존됐다고 표시하면 안 된다. 당장은 카드 전체 crop을 남기고, 실제 사용자 수정에 필요한 항목만 선택적으로 확장한다. 7 Wonders/Ark Nova/Terraforming Mars도 같은 원칙을 적용하되 게임별 상세 공백은 해당 JSON에 따로 명시했다.

## 후속 구현 카드

**범위:** 사용자 촬영→후보 정정 흐름에 게임별 계약을 연결. 전규칙 엔진이나 120개 필수 질문 추가 없음.

첫 납품은 아래 작은 adapter로 충분하다. 연구 JSON6MB를 제품/모델 입력에 그대로 복사하지 않는다. 기존 UI에는 촬영 초점1줄과 필요한 경우 선택하는 영역만 추가하고, 모름/건너뛰기를 유지한다.

|계약 데이터|구현 위치·실제 동작|
|---|---|
|`game_id` / `pinned_source`|작은 생성 profile에 ID·edition·sourceSHA 저장. 현재 pack과 일치하는 현재1게임만 로드. 불일치 시 기존 사진·수동 정정 흐름을 유지.|
|`capture_focus` / `areas[].partition`|`src/PhotoTargets.tsx`, `SessionWorkspace.tsx`, `Capture.tsx`: 공용/본인 범위 선택 뒤 “먼저 찍을 곳”을 표시. 자신의 비밀 패가 섞이면 처음부터 본인 촬영. 전체 목록 완료 요구 없음.|
|`areas[].current_ai_destination_fields` / `allowed_component_ids`|`shared/recognition.ts` 및 `server/ai/generic.ts`: 기존 허용 field와 교집합. 프로필만으로 owner/physical-only 권한을 열지 않음. 공개 개인물은 미지정 tray로 받음.|
|`visible_attribute_keys` / `manual_attribute_keys`|`server/ai/gameReadouts.ts`: visible만 관측 요청; manual은 기존 정정에 유지. 처음에는 기존 prompt 그대로 두고 안내 연결부터 납품 가능.|
|`display_resume` / `must_preserve_readout_keys`|`GameBoardRecord`, 현재 후보 정정/저장 경로: 원본 열기·읽힌 인쇄값·null·명시 적용 보존. 원본 좌표를 게임 칸으로 자동 변환하지 않음.|
|`source_rule_gaps` / `photo_need` / 감사 상태|내부 출처·후속 작업용. 사용자에게 규칙 승인 질문·진단표·120게임 촬영 완료 목록으로 노출하지 않음.|

서버 비동기 patch와 Sol2 표시2파일의 연결은 각각 기존 인계 patch를 사용한다. 완료 후보는 accepted를 자동 덮지 않고 재접속 시 같은 job을 찾는다. `GameComponentArt`의 native Catan/Rummikub 경로와 typed 원값은 유지한다. 이번 시각 수정은8게임 die alias와 Wingspan의 특정 먹이 주사위뿐이며 통합 미리보기 after 확인을 남긴다.

1. `gamepacks/generated` 옆에 작은 versioned vision profile을 생성하거나 고정 pack runtime에 선택 필드로 연결. exact game ID/edition/sourceSHA가 맞는 프로필만 선택. `shared/recognition.ts`의 실제 허용 binding과 교집합을 사용하며 profile이 권한을 넓히지 않도록 한다. 원명세와 프로필이 어긋나면 기존 안전한 관측 모드+원본 보존.
2. `src/SessionWorkspace.tsx`·촬영 UI는 `capture_focus`를 현재 공용/owner 범위에 맞춰 짧게 표시. “전체판” 외에 카드 근접/개인판 안내를 제공하고 미확인 소유자는 뒤에서 한 번 정정. 사용자에게 sourceSHA/field key/coverage를 묻지 않는다.
3. `server/ai/generic.ts`·`gameReadouts.ts`는 선택 구획의 허용 components/visible attr만 보내는 옵션을 추가할 수 있다. 제외한 영역이 “없음”이나 0으로 저장되지 않는 회귀가 필수. 부분 구획 지원 전에는 기존 게임별 prompt를 유지한다.
4. `GenericPieceArt`·`GameBoardRecord`는 typed 값이 실제 보이는지 확인하고 원본 열기와 수동 자리 정정을 유지. Catan/Rummikub native와 Splendor 전문 readout은 일반화 과정에서 바꾸지 않는다.
5. 사진 추가/후보 적용/저장 재열기에서 source refs·owner·null·개별 실물 ID가 유지되는 대표 6게임 회귀를 먼저 수행. 나머지 게임은 계약 load/field 호환 전수 검사와 게임별 미확인 표시를 함께 인계한다.

최소 수용 예: 공용 Splendor 사진 속 개인 보유 카드는 owner 미지정; SCOUT 손패는 자동 정렬되지 않음; Sagrada 목표 포함 사진은 owner에만 남음; 한나비 손패/코드네임 키 양식이 사진 추가로 열리지 않음; 카르카손 부분 지도는 빠진 판을 지우지 않음; 새 결과가 와도 사용자가 수정 중인 초안과 기존 accepted는 보존.
