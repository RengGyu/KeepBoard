# 외부 117게임 readout 패키지 · 독립 semantic 검토

**후속 상태:** R117-01은 허가받은 격리 수정판의 추가 검토에서 해결 확인했다. [최종 한 페이지 보고](final-report.md). 아래는 원 ZIP에 대한 최초 독립 관측을 보존한다.

**최초 판정: 이 bounded 검토에서 P0/P1은 확인하지 못했다. 관측값의 원본 고정을 UI만 보장하는 P2 1건을 확인했다. 최종 통합·출시 승인은 아니다.**

이 패키지는 기존 GenericPiece에 선택적인 게임별 readout을 추가하고, 새 AI 응답의 정규화·수동 수정·관계를 연결한다. 저장팩·게임팩 버전·권한을 새로 정의하지 않는다. 현재 저장소와 원 ZIP을 독립 대조했으며 구현솔의 통합 사본이나 선택한 결론은 읽지 않았다.

## 확인된 finding

### R117-01 · P2 · 관측값을 다른 허용 사진의 관측으로 재귀속시키는 저장 입력이 통과한다

- **원 ZIP 책임 경로:** `files/shared/readouts/registry.ts:41–54,79–85` (`validateGameReadout`, `canRelinkReadoutEvidence`), `files/shared/genericRecord.ts:10–25`, `files/server/engine.ts:87–92` (`validateComponentRecord`). UI의 원본 selector는 `files/src/GameEssentials.tsx:95`에서 `canRelinkReadoutEvidence`로 비활성화된다.
- **현재 저장 경로와 연결:** 현재 `server/index.ts`의 PATCH answers → `answerField` → `validateComponentRecord` → 새 `validateGenericRecord`. 앞선 값과 뒤의 값을 대조하는 인자가 없고, 관측 근거는 값마다 `observation/user`이며 해당 piece의 단일 evidenceId를 따른다. `answerField`가 이전 assertion의 evidenceIds를 유지해도 piece가 가리키는 원본/크롭의 재귀속은 막지 않는다.
- **재현:** 카르카손 타일에 `face=front, shields=1`, 두 sources는 `observation`, 원본 `photo-a`를 둔다. 양쪽 모두 권한이 있는 공개 사진 `photo-b`로 piece.evidenceId만 바꾸고 region을 null로 보내면 validator가 통과한다. UI helper는 원래 piece의 사진 변경을 false로 막지만 동일 관측값의 저장 입력은 통과한다.
- **직접 관측 결과:** `UIallowsSourceChange=false`, `sameObservationReboundToOtherAuthorizedPhotoAccepted=true`. 실제 API·사용자 사진을 사용하지 않은 pure validator 재현이다.
- **사용자 영향과 범위:** API 클라이언트/편집기 우회 입력에서 A에서 읽은 값이 B 사진 관측인 것처럼 표시·보존될 수 있다. 일반 UI가 이 변경을 자동 수행한다고 확인한 것은 아니다. 권한 밖 사진 접근, PIN 우회, 다른 사람 자료 노출로 분류하지 않는다. 기존 GenericPiece의 자유 근거 재선택에 더해, 이번 readout이 내세운 ‘관측값 원본 유지’ 보장이 UI에만 있는 불일치다.
- **최소 방향:** 동일 저장 실물의 observation 값이 남아 있는 원본 변경은 저장 경계에서 이전 값과 대조한다. 새 후보의 명시 교체 및 사용자 직접 재확인과 기존 관측의 조용한 재귀속을 구분한다. 모든 레거시 값의 자동 마이그레이션이나 새 권한 체계는 필요 없다.
- **종료 기준:** 같은 사진/같은 값 수정은 허용하고, A 관측을 그대로 B에 연결하는 수정은 거절하며, 새 후보/명시 직접 확인은 선택한 계약대로 동작한다. 거절 시 기존 accepted와 원본이 유지되어야 한다.

### 재현 명령

`DELIVERY`는 아래 안전 추출 폴더 또는 동일 ZIP을 별도로 안전 추출한 경로다. 부분 ZIP에서 빠진 runtime dependency만 현재 저장소에서 독립 temp의 files/에 복사했다: `shared/{splendor.ts,gameEssentials.ts,recognition.ts,recognition-index.json,types.ts}`, `server/ai/splendor.ts`. 첨부된 원 구현 파일은 변경하지 않았다. 프로젝트 루트에서:

```sh
DELIVERY=/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-readout-independent-m12wilb7/KeepBoard_Readouts_117 node --import tsx --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
const load=async p=>{const m=await import(process.env.DELIVERY+'/files'+p);return m.default??m;};
const {emptyGameReadout,canRelinkReadoutEvidence}=await load('/shared/readouts/registry.ts');
const {validateGenericRecord}=await load('/shared/genericRecord.ts');
const {effectiveRecognitionPack}=await load('/shared/recognition.ts');
const pack=effectiveRecognitionPack(JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8')).find(p=>p.id==='carcassonne'));
const readout=emptyGameReadout(pack,'tiles');
readout.values.face='front';readout.sources.face='observation';
readout.values.shields=1;readout.sources.shields='observation';
const piece={id:'synthetic-tile',componentId:'tiles',variant:null,quantity:1,label:'synthetic',anchor:'',evidenceId:'photo-a',region:{x:0,y:0,width:.5,height:.5},readout};
const switched={...piece,evidenceId:'photo-b',region:null};
validateGenericRecord({version:'game-component-record-v1',pieces:[switched]},pack,'map.scene',['photo-a','photo-b'],{playerIds:['p1']});
console.log({UIallowsSourceChange:canRelinkReadoutEvidence(pack,piece),changedObservationAccepted:true});
JS
```

## 직접 확인한 경계

| 경계 | 결과와 한계 |
|---|---|
| ZIP/패치 기준 | 절대 경로·`..`·symlink·중복 경로를 막고 temp에 추출했다. 809 entries, 총 24,281,538 bytes. `check-apply.py`는 읽기 전용임을 먼저 확인하고 실행: 280 files, alreadyApplied0, problems0, exit0. 제품에 patch를 적용하지 않았다. |
| 고정 팩/자료 계약 | 117개 정의의 sourceSHA/edition/packVersion가 현재 generated pack과 모두 일치했다. source가 다른 팩은 readoutDefinition이 적용하지 않는 구조이며, legacy readout 없는 값에 자동 구조화는 하지 않는다. |
| 418분류/10제외 | 현재 effective component-catalog binding과 대조해 408연결/10제외를 확인했다. `collection-boundaries.json`의 미연결 분류를 새 사진 수집 허가로 승격하는 코드는 확인하지 못했다. 원 readout schema가 있다는 것과 수집 권한은 별개다. |
| 검증·AI | 408개 legacy fixture, 408개 unknown readout, 408개 populated typed fixture를 현재 팩으로 검사: 오류0. freshAI fixture 408개를 새 normalizer → typed validator로 검사: 오류0. 이들은 제공된 생성 fixture로서 실제 게임 정답의 독립 증거가 아니다. `mode:ai`는 manual/사용자 근거를 거절하고 faceOnly/허용 kind/구조/참조를 검사한다. Splendor 분기는 별도 유지한다. |
| 저장/내보내기/가져오기 | 본인 fresh temp Store에 Odin 공개 일꾼/개인 카드와 합성 1px PNG 두 개를 만들어 save→load→Store export→Store import를 실행했다. typed assertion·snapshot assertion·pinned pack JSON이 동일했다. 이는 실제 HTTP import/commit/resume·PIN·방 권한 검사를 실행한 결과가 아니다. |
| 개인 구분 | 위 합성 자료를 현재 redactSession에 잠긴 owner로 전달하자 현재 assertion/사진과 snapshot assertion에서 개인 자료가 제외되었다. 실제 PIN 설정/잠금 재접속 또는 room API 실행 성공으로 주장하지 않는다. |
| candidate/apply·UI | 원 ZIP이 기존 same-field dirty 차단, explicit apply, 사진 범위 filter를 유지하는지 현재 코드와 연결해 읽었다. 새 controlled editor와 detail 표시·기존 아트 연결·reference 대상 선택·삭제 방어를 읽었다. 브라우저/API 후보 적용은 직접 실행하지 않았다. |
| 관계/복원 | `validateReadoutRelations`는 동일 허용 record 내 다른 실물/허용 component/존재하는 feature만 연결한다. snapshot/restore 코드는 readout을 통째로 clone하는 기존 경로라 추가 드롭 지점은 찾지 못했다. 실제 HTTP restore를 실행한 증거는 없으며 개별 게임의 실물 복원 완전성을 판정하지 않았다. |

## 관측 기준

- ZIP: `/Users/jeonggyuju/.paseo/uploads/upload_b5b75080-7de1-4209-a6a0-7b3c1db39bc8/KeepBoard_Readouts_117.zip`
- ZIP SHA256: `5448d0646a76b5cda41dc88f13fb8e81b0389614a98a57ff4c8c85f9275a8fed`
- 현재 HEAD: `98d573cdb80ff64af09b576b66d1c403392dced8`. 작업트리의 관련 파일을 직접 읽었으며 전체 diff를 이번 작업에 귀속하지 않았다.

| 파일 | SHA256 |
|---|---|
| ZIP `files/shared/readouts/registry.ts` | `fabd125c14886e6e0c808ac40721db35cb2ba72cfba769e0bf7a43a7e4da8144` |
| ZIP `files/shared/genericRecord.ts` | `cc9447e2ef337036b96228dee136122eb3c8c55bf75785c557e97286028e09d0` |
| ZIP `files/server/engine.ts` | `14aca89f4ab3983835c460ccdbb91f83ecaba31d154b75da4f3a9b08f9e45a08` |
| ZIP `files/server/ai/gameReadouts.ts` | `4f349538fcf60961eeb5fef766912524301bffd2e6e9cf8c522d2e95fc9e04e3` |
| 현재 `server/index.ts` | `080d5187c10885f8fc145a49b5ac775886ce3f5fb2750f42b9445fb2846f891d` |
| 현재 `server/engine.ts` | `36ac1f3c180e8a05ddcae89a1cc6ebfaae4a2f8af8c99c72674b9080d2e4f5f1` |
| 현재 `server/store.ts` | `6f0e8e20ead475981385cd2e868586e68b6d7021c669cdfb307779c9e6bcbc0a` |
| 현재 `src/GameEssentials.tsx` | `99cf14291590894a2ebf85cdc6f89dd263166f388c1f0d6835b5d70f7971ac6f` |

제품/통합 사본/기존 테스트/설정은 수정하지 않았다. 첨부 생성·설치·브라우저 script는 실행하지 않았으며 전체 suite/build도 실행하지 않았다. `.keepboard`, 사용자 Store/사진/키/운영 API·프로세스·AI·네트워크에 접근하지 않았다. 검토 소유권을 반환한다.

**미확인:** 전체 앱 타입·회귀·빌드, 실제 UI/HTTP 저장→재열기→복원, PIN/rooms 실행 통합, 117개 게임 규칙/실사진 정확도. 합성 통과를 인식 정확도나 출시 승인으로 해석하지 않는다.
