# 판독 후속 수정 — 2026-11-09

새 모델 호출·키/.keepboard 접근·커밋·배포는 0회다. 기준 HEAD는 source-freeze.json에 기록했다. 다른 연구의 동결 파일은 보존했다.

| 항목 | 수정 전 → 수정 후 | 상태/근거 |
|---|---|---|
| 1. 19개 실패 | 1194중19실패 → 1203중0실패 | failures.json: 실제 결함2(아줄 트랙 선택/생성본 인용순서), 낡은 기대17. 입력 slot/free/surface, 상태/모드, 각 영역칸수, 저장 areaId를 고정했다. null 수량과 모든 원값/owner/근거를 보존하며 직접 클릭→검증→JSON 재열기→그림 재표시까지 검사한다. |
| 2. 선택지 | 공식4속성에 직접 선택 가능값 추가 | Sagrada/Grand Austria Hotel 물리 눈1..6, 6nimmt 카드1..104 및 벌점1/2/3/5/7. correctionChoices로 UI추천과 기존 저장 검증을 분리하여 옛0도 그대로 표시/저장한다. 120게임의 구조목록은 choice-audit.json이며 전부 룰북 검증한 것이 아니다. |
| 3. 일반 자리 | 모델 사진좌표만 → 같은 사진의 이미 등록된 명시 배치를 활용하는 공통 후보 | 합성2회귀 통과. saved Sagrada46실물/등록anchor0/독립slot GT0이므로 정확도 null, 72게임 추천은 모두 off. 자동 cold-start 전체사진 정합은 미완료다. |
| 4. 카탄 위치 | 사진혼용/잘못된 한 anchor에 취약 → 사진별 독립 정합·hex중복제거·다수 일치fit | 합성3회귀(수정전2실패) 통과. unknown 건물은 그대로 유지. 실제 두 저장응답의 추천수/추천위치는 전후 동일하다. 새로운 실제 정확도 개선 주장은 하지 않는다. |

## 수정 파일

- 실제 수정 코드: `src/AzulScoreTrack.tsx`, `src/quickCorrection.ts`, `src/readouts/GameDetailFields.tsx`, `src/genericSlotSuggestion.ts`, `src/GameBoardRecord.tsx`, `shared/catanSlotSuggestion.ts`, `shared/readouts/types.ts`.
- 생성/정의: `tools/readouts/generate.py`, `tools/readouts/visible-choice-ranges.json`, `tools/lightweight-recognition/generate-photo-definitions.mts`, 3개 readout catalogs, `gamepacks/generated/game-essentials{,.manifest}.json`, `game-photo-definitions/{index,manifest}.json`. Catan 출처 순서 이외 runtime 값/판본은 불변. 기존 contract hash를 바꾸거나 임의 revision을 허용하지 않았다.
- 직접 회귀: 기존19개 실패의 tests 및 `tests/helpers/current-board-record.ts`, `tests/visible-choice-ranges.test.ts`, `tests/generic-slot-suggestion.test.ts`, `tests/catan-slot-stability.test.ts`. 전체 목록/전후 SHA는 source-freeze.json.

## 검증

| 명령 | 실제 결과 |
|---|---|
| `npm run typecheck` | exit0 |
| `npm test` | 1203/1203 PASS, 0 FAIL |
| `npm run build` | exit0; 기존 large-chunk 경고 |
| `node --import tsx --test tests/catan-slot-stability.test.ts tests/quick-correction.test.ts tests/generic-slot-suggestion.test.ts` | 12/12 PASS |
| `node --import tsx --test tests/visible-choice-ranges.test.ts tests/quick-correction.test.ts tests/photo-definitions.test.ts` | 15/15 PASS |
| readout/catalog/fixture/definition/역사 관련 집중검사 | 250/250 PASS |

전체 로그는 tests.log/typecheck.log/build.log. 로컬 IPC 제한 때문에 npm test만 승인된 샌드박스 밖 실행을 사용했다. 실제 브라우저/운영 사용자 저장소/실제 공급자 재판독은 실행하지 않았다.

## 평가와 남은 한계

- 카탄의 원 저장view/receipt는 exact private경로에 남아 있었고 변경하지 않았다. 첫 회차에 모델이 놓은 도로16/건물13을 숨긴 뒤 29/29 같은칸 추천, 둘째 미배치30개 중 사진위치로 첫회차와 일대일 대응 가능한28개는28/28 같은칸이다. **모델 간 위치 일치**이며 사람이 확정한 정답 정확도가 아니다. fit 잔차 감소는 동일 hex의 중복기준점을 제거한 결과이지 인식 정확도 점수가 아니다. catan-slot-replay.json.
- 일반 게임 후보의 leave-one-out 정합오차는 슬롯 간격15%, 배치거리30% 이내/유일대응만 허용한다. 별도의 독립 대응 정답95% gate와 정확한 현재 도판기하 일치가 있어야 제품 추천을 허용한다. 이를 충족한 자료가 없어 자격 목록은 비어 있다. 같은 모델끼리 일치했다고 gate를 통과시키지 않는다. generic-slot-evidence.json.
- 과거 도판의 Concordia display7/Brass43노선은 현재 runtime JSON에 없다. 이미 삭제된 구조를 복구했다고 말하지 않고 현 surface 입력을 명시 검증했다. Apiary 소인원 tableAsset 선언도 파일과 런타임 연결이 없는 기존 한계가 남아 있다. 이 작업으로 해당 게임의 상업판 전체 구조를 인증하지 않는다.
- 선택지 공식 근거는 [Sagrada 공식 룰북 pp.3–5](https://cdn.shopify.com/s/files/1/2319/3985/files/Sagrada_-_Rule_Book_FGG-SA201.pdf?v=1770446534), [Grand Austria Hotel 공식 룰북 pp.4,7–9](https://www.lookout-spiele.de/upload/de_grandaustriahotel.html_GAH_Retail21_Rules_152_EN_WEB.pdf), [6nimmt 공식 룰북 pp.1–2](https://blog.amigo-spiele.de/content/ap/rule/04910-GB-AmigoRule.pdf). 실제 확인한 범위만 사용하며, 기타 텍스트·상한 없는 수량의 선택지를 추측하지 않았다.
