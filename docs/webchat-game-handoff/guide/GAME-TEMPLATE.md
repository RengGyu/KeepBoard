# 게임별 개발 양식

각 게임은 아래를 채운 README와 기계 판독 가능한 JSON 한 개를 함께 반환합니다. 아래 양식은 신규 작업 지침이며 현행 API payload가 아닙니다.

- gameId / runtimePackId / 한국어 이름:
- editionId / editionName / pinned sourceSHA / packVersion:
- 사용한 공식 URL·페이지·확인 날짜 / 확인된 주장 / 미확인·가림·판본 차이:
- 현 binding key / sourceId / areaIds / componentIds / 공개·본인 scope:
- 재사용할 아트 mapping component/variant/layers 경로 / 대표 그림의 한계:
- 실제 작업 범위: 기존 공통 판독으로 충분한 부분 / 새 상세 판독·표시가 필요한 부분 / 수동 또는 실물보존만 가능한 부분:

## 관측값 표 (게임별로 필요한 행만)

|항목|대상 component / field|자료형·범위·단위|null/0 의미|사진 관측 가능 조건|짧은 표시·아이콘|수정 입력|저장·실물정리·재개에 필요한 이유|공식 근거|
|---|---|---|---|---|---|---|---|---|
|예: 카드 인쇄 점수|확인된 binding|integer≥0 또는 null|안 읽힘 / 인쇄0|앞면 전체가 읽힘|숫자+점수 기호|빈칸 허용 숫자|재개 후 상태 확인|해당 판본 공식 자료|

이 예는 모든 게임에 점수 카드가 있다는 뜻이 아닙니다. 비용/수입/보너스/소지량/위치/완료효과/덱 내부를 각각 구별합니다. 사진에 없는 과거 행동과 숨은 정보는 요청하지 않습니다. 출처에 없는 칸수·재료색·상업 카드 ID·규칙을 만들지 않습니다.

## 필수 동작 시나리오

- 빈 기록/기존 readout 없는 기록/새 typed 기록을 각각 열기.
- 사진 후보가 첫 선택 영역이 아닌 다른 field/tray로 돌아와도 찾을 수 있기.
- 후보 미확정 상태에서 재읽기/실패/상단저장/탭변경으로 accepted가 바뀌지 않기.
- 같은 field dirty 초안과 적용 충돌, 다른 field dirty 초안 보존.
- 명시 적용/수정→상단저장→reload→snapshot/범위 복원에서 값과 출처 보존.
- null/0·별개 복제실물·순서·원label·crop/수동placement 의미 보존.
- 공개와 본인 사진/필드 분리, room/PIN 경계 우회 불가.
