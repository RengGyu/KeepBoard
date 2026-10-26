# 스플렌더 구조화 · backend/shared 인계

**VERIFIED · A1 소스 동결/소유권 반환.** 제품 frontend·운영·모델·아트·팩은 본 작업에서 변경하지 않았다. 전체tests/type/build·통합CUA는 감독의 다음 카드로 넘긴다.

- `GenericPiece.readout?` = schema splendor-v1, kind development/noble/token/deck/null, points/bonus/cost/requirements/color/level. nullable5색 완전map, 기존 quantity는 실물수량만 사용한다. label/crop/실물ID와 기존 값은 보존한다.
- shared `emptySplendorObservation`, `validateSplendorObservation`, `getSplendorReadout(piece)` 제공. get은 표시props+source(structured/legacy-label/unread), kindnull→unknown. typed우선, 기존 명시 label만 보수적으로 읽고 생략색은null. 해석값을 원기록에 자동 저장하지 않는다.
- freshAI만 명시 색 별칭을 canonical enum으로 바꾸며 모호한 색은null. malformed detail은 warning+unknown readout으로 남겨 다른 실물까지 숨기지 않는다. manual/import는 strict. 자유 label의 앞면/더미 휴리스틱도 freshAI에만 적용하여 ‘옛뒷면label 유지→사용자 앞면정정→저장’을 막지 않는다.
- 명확한 새 앞면 카드/귀족 개별 instance에만 quantity null→1 보완. uncertain/back/pile/이전수동·legacy는 그대로다. 비용/보너스/귀족조건/토큰색은 서로 대체하지 않는다.
- valid/nonempty 새generic후보가 있을 때 같은field+owner+evidence집합의 이전candidate만 교체. accepted/다른사진/실패·empty는 보존하며 room revision검사 후 적용한다. 한 응답에서 같은source+정확crop+component가 전용field/tray에 겹칠 때만 전용field 우선. 유사 카드끼리 합치지 않는다.

**최종 집중24/24 exit0**, `focused-final.log`: typed/legacy/null0/색·map·kind검증, sourceguard, manual앞면정정·옛label보존, accept/import/export/snapshot/restore, 같은사진repeat/다른사진·accepted·failure/empty보존, room owner경계 및 공통generic/Rummikub 회귀. 최초 readout유실·교차field중복 RED는 `structured-red.log`, 이후 GREEN 근거 포함. 정확 변경8파일/SHA는 `handoff.json`.

실첨부 진단1회+교정검증1회 = **총2회, 추가호출/자동retry0**. raw/normalized는 각0700 임시 폴더의0600파일에만 보존했다(`probe.json`,`structured-probe.json`의 경로). 사진을 생성/편집하거나 사용자 운영 기록을 읽지 않았다.

| 관측 | 결과와 한계 |
|---|---|
| 진단 기존prompt 48.39초 | market12/noble3/tray26, 모든 quantity null. raw부터 상세points/bonus/cost 미출력. screenshot에는 상세label이 있으므로 판독변동과 표시계약 부족 둘 다 있었다. |
| 구조화prompt 97.48초 | raw41개 전부readout 존재. 한국어색 enum으로 market/tray가 처음 거절되어 normalized noble3만. 명시alias 보완 후 **같은 raw 오프라인 재생**으로15market(덱3+앞면12)/noble3/tray23을 보존했다. 숫자를 baseline으로 고치지 않았다. 보완된 영문enum문구 자체를 실AI로 재호출하지는 않았다. |
| 앞면22장 수동기준 대조 | points22/22, bonus21/22, 비용전체map19/22. A2시장파랑3점 비용, D3하단청2점 비용, D5하단적1점 비용, D8하단흰1점 보너스가 다르다. 사진1회 관측이며 일반 정확도가 아니다. |
| 귀족3 | points3/3, 요구map은 사전수동기준과3개 모두 차이(세부 `comparison.json`). 규칙/카드DB 정답으로 보정하지 않았다. |

기준은 호출 전에 직접 전사한 `human-baseline.json`, 위치로 대응한 비교는 `comparison.json`/`replay-compare.mts`. 사용자가 올린 기존 응답의 요청횟수/원문은 조회하지 않았다. 같은field재읽기 candidate누적은 무과금 임시API로 별도재현했고, 이번패키지에서 교체 회귀를 닫았다. 실제스캔/실폰/전카드 정확도는 미검증이며 후보 확인·정정은 계속 필요하다.
