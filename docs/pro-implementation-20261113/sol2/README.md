# Pro P0/P1 shared/backend 인계

**VERIFIED:** source-qualified 수동 cross-field, 판/관계·부분순서와 수동 frame을 기존 estimator/저장 경로에 연결했다. 새 provider·키·운영 데이터 접근은 0회다. `contract.md`와 실제 optional export를 사용한다. src/UI 및 safety helper는 편집하지 않았다. 전체 suite/build는 감독에게 남겼다.

## 실제 변경

- 같은 view의 허용 live 기록을 먼저 모으고 수동 참조를 검증한다. qualified ref는 assertion까지 식별한다. 거절된 링크는 raw q를 보존하되 파생 legacy/qualified anchor·attachment와 group 링크를 null로 내려 UI에 가짜 부착을 만들지 않는다.
- 실제 live/receipt 판 인스턴스, 원본 1회 변환, source/epoch/definition/evidence를 재사용한다. 새 판은 만들지 않는다. 동일 객체키 순서는 identity에 영향을 주지 않는다.
- 수동 v2는 optional frame/qualified anchor·attachment/beforeRefs/active를 보존한다. v1·기존 canonical/manual 위치는 유지한다. source·실물 identity가 검증된 accepted 수동 수정만 새 assertion ID로 참조를 재식별한다. 후보/삭제/foreign/geometry 변경은 승계하지 않는다.
- LC는 discard 역할과 판별 key를 보존한다. A/B는 판내 관측 선/semantic frame을 기준으로 하며 사진 중앙이나 사람 소유와 연결하지 않는다. 겹치는 판 근거는 미확정이다.
- 7W는 명시 관계/유일 containment/겹침 연결요소를 사용한다. 거리는 후보 정렬만 한다. 누락된 다섯 번째 판을 만들지 않고, 판 미연결도 역할/색/관측 stack별 표시 그룹과 선택 가능한 실물을 남긴다.
- Sagrada는 실제 관측 anchor를 재사용한다. low의 draft를 창문으로 바꾸지 않는다. track은 relative bands이며 같은 band 여러 dice를 허용한다. 도구와 bbox가 겹친다는 이유만으로 토큰을 부착하지 않는다.
- 수동 frame의 3D bbox 사용성 결함을 재현·교정했다. local 중심+반복 lattice를 함께 사용하고 실제 경계/충돌은 unknown으로 남긴다. 감독의 기존 in-memory probe는 18→18 cells다. 정답 숫자/색/slot을 주입하지 않았다.

## 직접 검사

```sh
npx tsx --test tests/estimated-board-structure.test.ts tests/structure-relations-http.test.ts tests/estimated-structure-safety.test.ts tests/component-linking.test.ts tests/observation-fusion.test.ts
npm run typecheck
npx tsx docs/pro-implementation-20261113/sol2/replay.mts
npx tsx docs/pro-implementation-20261113/supervisor/probe-manual-window.mts
```

- 집중 **53/53 PASS**: `focused-final.log`. 타입검사 exit0: `typecheck-final.log`.
- 실제 격리 Store/HTTP의 PATCH→새 assertion→다른 field 참조 재식별→commit→GET→resume 통과. frame/refs뿐 아니라 원값·원문·owner·메모·ID·region을 비교했다. 삭제 대상의 옛 ref는 원문에 남고 파생 링크는 null이다. 후보·삭제·변경 source 반례도 포함한다.
- `replay-result.json`: 고정9사례 원사진 SHA, 입력/팩/자산/옛 구조 SHA, derived 결과 SHA·private locator. 모든 입력 바이트/원관측/known 값/geometry/canonical 보존. 새 호출·새 live latency 없음.
- `manual-frame-result.json`: 코너는 근사 사용자 탭이며 photo truth가 아니다. 18개 셀 보존과 원문 불변을 검사한 사용성 재생이다.

## 보수화의 실제 손실과 남은 한계

아래는 **구조에 연결된 관측 수이며 정확도가 아니다.** 이전 수치는 Pro 전달 당시 동결 structures, 이후는 현재 같은9입력 재생이다.

| 사례 | 이전→현재 연결/관측 |
|---|---:|
| LC baseline | 41→16/42 |
| LC high | 41→40/43 |
| LC medium | 42→37/43 |
| LC low | 45→42/46 |
| Sagrada baseline | 38→38/42 |
| Sagrada high | 38→33/42 |
| Sagrada medium | 38→33/42 |
| Sagrada low | 19→14/41 |
| 7W baseline | 101→33/117 |

LC baseline은 겹친 판 영역 근거가24개에서 경쟁한다. 판을 근거 없이 합치거나 최근접으로 복원하지 않았으며 qualified 판/묶음 정정 경로를 제공한다. medium 원 y좌표가 압축된 가설은 **미확정**이고 원 bbox를 교정하지 않았다. Sagrada high/medium은 bbox만 겹친 토큰5개의 가짜 도구부착을 더 이상 구조 성공으로 세지 않는다. low18개는 여전히 draft/anchor 없음이며 창문 칸을 확정하지 않는다. baseline은 기존 정식 칸18개를 retained로 보존하므로 위 windowCells 파생 수와 혼합하지 않는다.

7W의 동결 사진 감사상 기존74맞음/15오소속이 감독 중간 비교에서33맞음/0오소속/68미연결/16유보로 바뀌었다(**REPORTED**, `supervisor` 근거; 최종 재측정은 감독 소유). 이는 잘못된 소속을 없애는 대신 실제 맞던 연결도 놓치는 절충이다. 누락 판·관계 없는 카드의 자동 소속을 해결했다고 주장하지 않는다. 현재117개 전부 원 ID/값과 표시 그룹으로 남으며, 판이 실제 응답에 없으면 사용자 frame/묶음 정정 없이는 확정할 수 없다. 새 가상판 생성은 범위 밖이다.

9재생은 보존/계약 확인이고 사람 정답률·전체 게임 정확도·새 모델 성능 시험이 아니다. 사진 감사의 원값 오류는 이번 구조 코드가 바꾸지 않는다. 전체 통합 검수·최종 사진 소속 비교/실제 UI 사용성은 감독 인계 항목이다.

## 동결·차이

`freeze.json`은 본인8파일의 before/after SHA 및 검사 로그 SHA를 기록한다. `implementation.patch`는 해당8파일만의 delta이며 safety/UI/PROJECT_CONTEXT/타인 dirty 변경은 포함하지 않는다. 이전 test 기준은 11월12일 본인 freeze SHA와 일치하도록 보존 snapshot+기존 patch를 재구성했다. `before/`는 작업 시작 제품 snapshot 및 그 검증된 test snapshot이다. `genericRecord.ts`는 기존 validator 연결을 재사용해 이번 delta가 없다. PROJECT_CONTEXT의 통합 상태 갱신은 감독 소유에 따라 감독에게 반환한다.

후속: Chrome에서 확인된 미분류 줄의 판 정정 시 역할 영역이 따라가지 않는 계약을 좁게 보완했다. 최신 optional 계약/실제 PATCH 저장·재개 검사 및 새 source pin은 [role-correction/README.md](role-correction/README.md), [후속 동결](role-correction/freeze.json)에 있다. 위 최초 동결/재생 자료는 변경하지 않았다.
