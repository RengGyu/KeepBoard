# 자동 위치 복원 구현 인계 — final-v2

**VERIFIED — 제품 구현·집중 검증 완료, 소스/결과 고정.** 기존 출처 검증·게임팩·평면 renderer·아트·정정/저장 흐름 안에서 자동 연결을 복구했다. 유료 판독·새 원자료·원값 교정은 없다. 전체 suite/build·실제 브라우저와 고정 원장에 대한 최종 독립 사진 재대조는 감독의 최종 통합 범위다.

동결 manifest: [final-v2/freeze.json](final-v2/freeze.json)  
SHA256: `8e500f29507fad285a0692f66d633fa7ed5a2c839c7a9f2b42befc8b3a18294c`

제품4파일·테스트3파일·재생/freeze harness의 원문 snapshot, 원자료21파일 SHA, 결과46파일 SHA를 포함한다. 이 인계 이후 제품 소스를 수정하지 않는다. 최초 before와 중간 after, 독립 interim, 기존 Pro 결과는 보존했다.

## 원인과 변경

[design.md](design.md)에 최초 원인·구현 계약과 독립 interim 이후의 보정을 구분해 기록했다.

- **판 alias:** 같은 출처·receipt의 live 판과 관측판이 유일한 상호 동치일 때만 파생 alias를 합친다. 중복 live/관측판, 다른 receipt, 방향/명시 binding 충돌을 임의 소거하지 않는다. 삭제한 live 판을 retained receipt로 부활시키지 않는다.
- **7W:** 명시 역할이 맞는 카드의 부분 겹침 띠와 유일한 판 접촉을 추정 근거로 사용한다. 여러 판의 지지를 받으면 유보한다. `wonder-area` 카드는 기존 단계 영역으로 전달한다. 모서리의 작은 겹침·가려진 누락판·근거 없는 동전/뒷면을 강제 연결하지 않는다.
- **LC:** 판 내부 기준편과 역할을 보존하고, 범위 밖 꼬리 카드는 같은 역할의 연속 띠에서 유일한 판 지지를 얻을 수 있다. 색 모름 띠가 같은 판·편의 정확히 한 관측 줄과 연결되면 표시 group만 공유한다. 원 `suit:null`, 숫자, owner는 그대로이며 lane basis는 estimated다. 같은 색이라도 분리된 두 줄은 경쟁 후보다.
- **Sagrada:** anchor 없는 반복 격자를 `unclassified`, `anchorRef:null`, `displayHypothesis:unanchored-grid`로 표시한다. 판·창문 역할·정식 칸을 새 사실로 만들지 않고 배치 수에서 제외한다. 유일한 도구에 충분히 포함된 토큰만 추정 부착한다.

수정 파일: `shared/structureRelations.ts`, `shared/estimatedGeometry.ts`, `shared/estimatedBoardStructure.ts`, `src/EstimatedBoardView.tsx`. 추가 저장 형식/새 renderer는 없다.

## 같은 입력의 자동 재생

아래는 **자동 배치 집계**다. 원사진 정확도·독립 실물 수·완전한 줄/순서 복원율이 아니다. 9응답의 원입력 SHA, ID, bbox, owner, receipt, 원값, 읽힌 값 집계가 보존됐다. [영역별 전후 비교](final-v2/automatic-comparison.json), [재생 요약](final-v2/replay-result.json), [구조 JSON](final-v2/structures).

| 응답 | 변경 전 배치 | final-v2 배치 | 추가 표시/유보 |
|---|---:|---:|---|
| LC baseline | 16/42 | 41/42 | 두 색 모름 투자 카드도 유일한 표시 줄에 연결 |
| LC high | 40/43 | 41/43 | bbox 없는 관측1은 별도 fallback 유지 |
| LC medium | 37/43 | 42/43 | 좌표 대응 유보; 배치 증가를 정확도로 해석하지 않음 |
| LC low | 42/46 | 45/46 | 넓거나 경쟁하는 bbox의 사진 대응 유보 |
| Sagrada baseline | 38/42 | 38/42 | native 정식 칸18 보존 |
| Sagrada high | 33/42 | 38/42 | 도구 위 토큰5 추정 부착 |
| Sagrada medium | 33/42 | 38/42 | 도구 위 토큰5 추정 부착 |
| Sagrada low | 14/41 | 19/41 | 표시 격자18 별도, 실제 판0·배치 수 제외 |
| 7W baseline | 33/117 | 74/117 | tableau47·단계8·판4·동전8·군사7, 미연결43 |

7W interim의75개에서 final-v2는74개다. 작은 대각선 접촉을 경계 근거에서 제외한1건이며 숨기거나 이전 수치를 최종 결과로 사용하지 않는다. 관측판이 있는 upper-right brown 띠도 두 판의 접촉이 경쟁하므로 유보한다. 누락판 카드를 지지 없는 다른 판에 붙이지 않는다.

## 사진 대조의 범위

독립 평가자는 [photo-evaluation/README.md](photo-evaluation/README.md)와 고정 원장/사진 대응을 소유한다. 그 문서의 **interim-v1**은 같은 기준으로 LC baseline 판·편·역할16→41/41판정가능, 7W33→75/97판정가능, 새 오소속0을 보고했다. LC의 같은줄5관계 분리가 후속 보정의 계기다. 이 중간75개나 줄 판정을 final-v2의 정확도 수치로 옮기지 않는다.

최종 독립 재대조 대상은 이 폴더의 `final-v2/structures/`와 위 manifest다. Sagrada low는 표시 격자18의 사진 일치와 실제 판 연결0을 별도 평가한다. LC medium/low의 관측 대응 유보, 다른 실제 줄 간 오병합, 7W 새 미연결1건도 유지된 분모로 비교한다. 전체 순서 복원·출시·실기기 성능 완료를 주장하지 않는다.

## 직접 검증

- 집중 회귀 **53/53**: 판 동치 충돌/중복/다른 receipt/삭제, 회전·이동, 경쟁 판·모서리 접촉·누락판, 색 모름 줄의 유일성/동색 경쟁, projection 경쟁, 표시격자/manual/native, 토큰 부착 경계. [로그](final-v2/checks/focused-v2.log)
- HTTP 정정·PATCH·commit·재개 **3/3**: 임시 저장소와 localhost만 사용. 원 실물·receipt·메모 및 수동 정정 보존. [로그](final-v2/checks/http-preservation-v2.log)
- 타입 검사 및 diff 공백 검사 통과. [타입 로그](final-v2/checks/typecheck-v2.log)
- 실제 `EstimatedBoardView` + `GenericPieceArt`와 기존 SVG symbols를 SSR해 각 필드의 파생 실물이 정확히 한 번 선택 경로에 나타남을 확인했다. 필드별 배치/판/그룹/셀은 전체 구조와 일치한다. Sagrada baseline의 native18개와 LC high의 원bbox 없는1개는 기존 `GameBoardRecord`의 다른 경로에 속하므로 이 estimated SSR이 그 화면까지 검사했다고 주장하지 않는다. 각 개수/ID는 재생 요약에 명시했다.

```sh
node --import tsx --test tests/placement-recovery.test.ts tests/estimated-board-structure.test.ts tests/estimated-board-ui.test.ts tests/pro-structure-controls-ui.test.ts tests/estimated-structure-safety.test.ts
node --import tsx --test tests/structure-relations-http.test.ts
npm run typecheck
node --import tsx docs/astra-placement-recovery-20261113/replay.mts after
```

`final-v2` stage와 freeze는 덮어쓰기를 거부한다. 위 `after` 명령은 별도 작업 결과만 갱신한다. HTTP 검사는 sandbox의 localhost 허용으로 실행했다. `npx tsx`의 IPC 생성은 sandbox EPERM이라 `node --import tsx`를 사용했다.

기존 회귀2곳도 계약에 맞춰 조정했다. 완전 containment를 “단순 겹침”이라고 부르던 토큰 fixture는 실제 작은 모서리 겹침으로 바꾸고, 신규 회귀에서 containment와 경쟁 도구를 따로 검사한다. 고정 yellow 카드가 자동 복구된 HTTP 테스트는 여전히 미연결인 관측 tableau를 선택해 동일한 정정/저장 보존을 검사한다. 초기 실패 로그도 삭제하지 않았다.

`PROJECT_CONTEXT.md`, `docs/work-sessions.md`, task `supervisor/`, `photo-evaluation/`는 각각 다른 소유자가 관리한다. 원자료와 기존 audit, 운영 `.keepboard/`는 변경하지 않았다. commit/push/deploy는 수행하지 않았다.

## 감독 최종 통합

전체1430/1430·타입/Vercel/viewer 빌드, frozen source/입력/output SHA와 Chrome 모바일·데스크톱 화면을 확인했다. 독립 final-v2 대조에서 LCbaseline41맞음/1유보·같은줄63/63·오합침0, 7W74맞음/0오소속/23미연결/20유보로 마감했다. mid75에서 맞던1개가 유보된 회귀도 남겼다. [최종 결과·실제 화면](RESULTS.md), [독립 최종 보고](photo-evaluation/FINAL_V2_REPORT.md), [통합 근거](supervisor/verification.json), [변경3곳](DIFF_GUIDE.md). 제품커밋 `818c7f18107486d2a5c2b5ccab74a8c77f8f96d7`.

Sites 갱신은 클라이언트 Git 미지원409로 중단되어 기존 Site는 이전버전이다. source체크아웃·게시버전 변경0, 최신화면은 RESULTS.md에 보관했다. 운영backend·실제Safari·전체사진/120종 정확도 완료를 주장하지 않는다.
