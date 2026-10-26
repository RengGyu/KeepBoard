# Cloud 세션 규칙 대조 — 2026-10-26

이 세션에서는 출판사 사이트에 접근할 수 없었다(WebFetch DNS 실패, 프록시 403). 그래서 **저장소에 이미 보관된 공식 규칙 텍스트**(`docs/art-confirmation/sources/*.txt`)가 있는 게임만 대조했다. 검색 요약은 규칙 근거로 쓰지 않았다. 어떤 게임도 전체 규칙서 검증 완료로 표시하지 않는다.

| 상태 | 게임 수 | 뜻 |
|---|---|---|
| `REVISED_FROM_LOCAL_RULES` | 9 | 로컬 원문의 쪽 근거로 정본 소스를 고침 |
| `CATEGORIES_MATCH_LOCAL_RULES` | 10 | 원문과 공용/공개 개인/본인/숨김 구분이 일치해 변경 없음 |
| `PARTIAL_LOCAL_TEXT` | 2 | 텍스트가 일부라 판단을 유보하고 변경 없음 |
| `REVISED_BEFORE_THIS_SESSION` | 8 | sol1·luna 인계분(부분 근거) |
| `NOT_REVIEWED_THIS_SESSION` | 91 | 이 환경에서 원문을 열 수 없어 미검토 |

게임별 확인 쪽·판단·미확인은 [review.json](review.json), 적용 스크립트는 [apply_local_rules_revisions.py](apply_local_rules_revisions.py)(재실행해도 결과 동일), 각 개정의 영수증은 [../revision-evidence.json](../revision-evidence.json)에 있다.

## 원칙

- 기존 필드의 범위·공개 여부는 바꾸지 않는다. 새로 분리할 공개/본인/숨김 부분은 **새 영역·필드**로 추가해 이전 기록이 다른 공개 범위로 재분류되지 않게 한다. 이전 기록은 자동으로 옮기지 않는다.
- 새 본인·숨김 필드는 사진 판독 대상이 아니다(수동·실물 보존만).
- 원문에 명시되지 않은 공개 여부(예: Marvel Champions 버림 더미, Res Arcana 버림 더미, Monopoly 현금)는 추측해 바꾸지 않았다.

## 생성 데이터

정본을 고친 뒤 `tools/game-runtime/revise-all.sh`로 런타임 팩·아트·인식 인덱스·readout·캡처 프로필·사진 정의 계약/정의·보드 시각을 재생성했다. 계약 SHA 고정값은 개정 행(17종)만 바뀐 것을 확인한 뒤 갱신했다. 개정되지 않은 게임의 캡처 프로필·계약 행·사진 정의는 과거 기록과 바이트 단위로 같다(`tests/gamepack-revision-history.test.ts`).
