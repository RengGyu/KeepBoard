# R1/R2/C5 후속 교정 재검토

**VERIFIED — 기존 material 결함 3건의 교정을 수락한다.** 최신 후속 동결본에서 원래 실패 경로와 직접 관련된 보존 경계를 독립 실행했고, 이 세 경계의 잔여 material 결함은 발견하지 못했다. 이전 [최종 검토서](../final-review.md)와 실패 probe/결과를 고치거나 덮어쓰지 않았다.

## 판정

| 경계 | 직접 확인한 후속 결과 | 판정 |
| --- | --- | --- |
| **R1: 경쟁 수동 역할의 재연결** | 실제 `set-role` 명령으로 두 자동 그룹에 `discard`/`fireworks`를 지정한 뒤 validated region을 결합했다. 새 그룹은 선택값 없이 `conflict`, 원 claim과 대상 entityIds를 가진 미적용 결정 2개를 보존한다. 이전 그룹 순서를 뒤집어도 동일하며, 반복 투영에서도 원 결정이 유지된다. | **VERIFIED — 수락** |
| **R1: 적용 범위** | 부분 멤버만 지정한 수동 역할은 새 전체 그룹으로 확대되지 않고 `live-group-expanded`로 남는다. 전 멤버가 같은 역할에 동의한 경우에는 두 manual support를 모두 보존해 적용한다. | **VERIFIED — 수락** |
| **R2: 최신 관측 순서** | 실제 `split-group` 후 `A → B`를 `B → A`로 교체했다. 수동 membership을 유지하고 현재 edge 1개만 남으며 가짜 cycle은 0이다. 그 관측 관계를 삭제하면 파생 edge도 0이 된다. | **VERIFIED — 수락** |
| **R2: 수동 순서와 관측의 구별** | 별도로 `manual` basis를 가진 기존 relation claim을 공급하면 원 claim을 보존한다. 새 반대 관측과 실제로 충돌할 때에는 두 관계와 두 멤버를 미확정으로 남긴다. 수동 relation은 저장 schema의 합성 입력이며, 새 UI 명령으로 생성했다고 주장하지 않는다. | **VERIFIED — 수락** |
| **C5: 지원되는 visible-stack 소비** | decoded `discard` region + 검증 spatial `same-visible-stack`를 실제 `RestorationSceneView → 기존 group body/PhotoLayoutBoard`에 전달했다. 관계가 있으면 두 물체는 가시 더미 1개, 나머지 1개는 사진 배열이다. 관계를 제거하면 더미 표시가 0이 되며, 양쪽 모두 원 3개를 각각 한 번 표시·선택한다. 내부 순서·숨은 총수 미확정 문구도 있다. | **VERIFIED — 수락** |
| **C5: qualified 선택과 유보** | 다른 assertion의 같은 bare pieceId 두 개를 포함한 3개 모두 올바른 `(assertionId,pieceId)`로 선택된다. 두 독립 pair는 별도 더미 2개이고 singleton은 유지한다. 관계 사슬과 observation support가 빠진 경우에는 더미 확정을 유보하고 실물 선택을 유지한다. | **VERIFIED — 수락** |

교정의 실제 코드 경계는 `reconcileSceneSelections`의 차원별 수동 claim 수집·coverage 판정, 현재 source에서의 physical order 재생성, `resolveSceneDisplay`의 검증된 visible-stack part, `RestorationSceneView`의 기존 body 소비다. 새 위치·숨은 수량을 만들거나 원값/ID를 재작성하는 경로를 추가한 것으로 판정하지 않는다.

## 실행 및 입력 보존

```sh
TSX_DISABLE_CACHE=1 node --import tsx docs/linear-layout-implementation-20261114/astra-review/recheck/probe.mts
```

**VERIFIED:** 독립 probe 5개 검사 묶음, 실패 0, 프로세스 exit 0. 실행 파일은 [probe.mts](probe.mts), 출력은 [results.json](results.json), 원 실행 기록은 [execution.log](execution.log), 명령·cwd·exit 기록은 [execution.json](execution.json)이다. 이 실행에서 fetch는 금지해 network/provider 호출이 없도록 했다. 메모리에서 만드는 관계/정정은 합성 검사이며 실사진 정답표가 아니다.

- 후속 동결 파일 7개: 시작 시 인계 SHA와 7/7 일치, 실행 후 동일.
- 직접 의존 파일 9개: 실행 전후 SHA 동일.
- 기존 실패 probe 2개·결과 2개·최종 검토서·기준 pin·입력 fixture 총 7개: byte SHA 동일.
- 투영/표시 입력 session과 scene: 해당 호출 전후 digest 불변. 정상 `applySceneCommands`의 의도된 메모리 변경은 검사 준비이며 원 저장 파일에는 쓰지 않았다.
- 이번 작성은 `astra-review/recheck/` 아래로 한정했다. 제품·팩·기존 결과·GT·사진을 변경하지 않았다.

정확한 파일별 SHA와 전후 비교는 [source-pins.json](source-pins.json), [results.json](results.json)의 `invariance`에 있다. 검토한 제품 후속 SHA는 다음과 같다.

| 파일 | SHA-256 |
| --- | --- |
| `shared/sceneProjection.ts` | `326290e40d810e75245cc4536241beb36e17f6d3f3bf1dfc2055d171f0fcea68` |
| `shared/sceneDisplay.ts` | `67add5c09902670e9e8c7f28939cac3fe10297fd02f94078c5ff17c24fe02b24` |
| `src/RestorationSceneView.tsx` | `53c3c76c7446e84fa023d2ce28a195e90e20a34dc379020bff90b78cc3b47352` |
| `src/restoration-scene.css` | `7abe42ea62aacde16f0c556e997292bb6479045d04dd0977ed7b56405eea10d5` |

## 보고된 검사와 남은 확인 경계

**REPORTED:** Sol1 후속 집중 32/32 및 범위 타입 exit 0, Sol2 후속 집중 24/24 및 HTTP 11/11. Sol2 당시 타입 검사는 병행 중 stack fixture 필수 필드 누락 때문에 exit 2였으며, 이후 Sol1 동결본에는 필수 필드가 채워져 있고 범위 타입 통과가 보고됐다. 이 재검토에서는 전체 타입·suite/build·HTTP/Chrome을 중복 실행하지 않았으므로 그 결과를 독립 통과로 바꾸어 기록하지 않는다.

**REPORTED:** supervisor가 actual/effective/runtime Astra/max/Normal을 확인했다.

**UNCLEAR / 범위 밖:** component 함수와 클릭 callback을 직접 실행했으며 브라우저 픽셀·실폰을 재검수한 것은 아니다. 전체 8게임/408개 통합 결과와 실사진 더미 정확도는 supervisor의 별도 근거를 따른다. 완전한 관측 근거가 없는 chain/경쟁/다른 source의 더미, 이미 상위 위치·순서 adapter가 소비하는 물체는 이번에 임의로 합치지 않는다.

`N1-source-mismatch`는 정상 승인 전이로 확정되지 않은 별도 음성 검사다. 카드에 따라 이번 수정 조건으로 확장하거나 재실행하지 않았으며, 해결됐다고 보고하지 않는다. 과거 코드가 이미 원 수동 결정을 제거한 기록에서 사라진 결정을 추측 복원하는 검사도 아니다.

이번 수락은 **기존 R1/R2/C5 세 결함의 후속 교정**에 한정한다. 전체 제품 정확도나 실기기 검증 완료를 뜻하지 않는다.
