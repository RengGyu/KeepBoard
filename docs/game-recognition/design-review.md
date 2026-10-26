# 공통 사진 인식 설계 · 독립 A0 검토

이 변경은 고정된 게임팩을 교체하지 않고 사진 허용 근거를 연결해, 118개 generic 게임의 사진을 수정 가능한 구성물 후보로 만든다. 공개·개인 관측함을 분리하고, 사용자가 명시 적용한 필드만 기존 기록을 바꾸는 설계다.

**판정: 설계 방향은 현재 저장/권한 구조와 연결 가능하다. 출시 전 아래 R1을 닫아야 한다. R2는 검토 도중 소스가 보완되어 열린 결함으로 세지 않는다. 구현 진행 중의 설계/연결 검토이며 최종 코드 승인·실행 결과 검수가 아니다.**

## R1 · P1 · 같은 필드의 기존 편집 초안과 명시 후보 적용이 충돌한다 — 계약 보완 필요

- **직접 근거:** 설계 `design.md:17`은 후보의 명시 교체와 기존 accepted 편집 초안 보존을 함께 요구하지만 같은 필드에 두 값이 있을 때의 규칙은 정하지 않았다. 현재 `src/GameEssentials.tsx:51–57`은 dirty이면 incoming accepted 변경을 무시하며, 그 초안을 save callback으로 계속 등록한다. `src/SessionWorkspace.tsx:78–81`의 상단 저장은 그 callback을 실행한다. 후보 UI는 이 검토 시점에 아직 이 기존 경로에 연결되지 않았다.
- **구체 발생 조건/결과:** 공개 market의 accepted A를 A′로 편집한 상태에서 이미 도착한 후보 B를 명시 적용한다. 서버 accepted가 B가 되어도 기존 dirty editor는 A′를 유지한다. 이어 상단 저장을 누르면 A′가 다시 accepted로 올라가 B의 명시 적용 결과를 덮는다. 반대로 무조건 editor를 remount/reset하면 저장 전 A′를 사용자 의사 없이 잃는다. 다른 필드 초안까지 초기화하면 설계의 unrelated 보존도 깨진다.
- **최소 요구 수정:** 같은 field+owner에 dirty accepted 초안이 있으면 적용을 막아 먼저 처리하게 하거나, 명시 적용 동작 안에서 해당 초안 교체를 분명히 선택하게 한다. 성공 후 그 필드의 scene/base/save callback만 새 값과 동기화한다. 실패는 초안을 유지하고, 다른 필드 초안은 그대로 둔다. 일반 polling/분석 완료에는 이 reset을 적용하지 않는다.
- **종료 기준:** A′ dirty + B candidate → 명시 적용 → 상단 저장 → reload에서 선택한 정책대로 값이 유지된다. 다른 field/owner 초안의 ID/순서/placement 보존, 적용 실패 후 초안 유지, pristine 후보를 flush로 확정하지 않는 경우를 함께 확인한다.
- **검증 수준:** 기존 코드의 guard/callback을 그대로 계산한 pure 상태 전이에서 incoming B 후 `local-draft`가 남고 다음 save도 `local-draft`를 쓰는 것을 확인했다. 브라우저의 새 후보 UI를 실행한 증거로 주장하지 않는다.

## R2 · P1 → 소스 보완 확인 · explicit accept도 typed/source 검증을 거쳐야 한다

- **최초 근거:** 최초 관측한 `server/index.ts` SHA `33f3a4fb06fffc079416654d9fcbb2c422290ea552f150179465910fe6330caa`의 `/accept:374–383`은 `validateValue`만 호출했다. `server/engine.ts:68–84`는 JSON 필드의 구성물·수량·사진 참조를 검사하지 않는다. 반면 수동 `answerField:94`는 `validateGenericRecord`를 호출한다.
- **구체 발생 조건/결과:** 과거/import된 market.scene candidate가 허용되지 않은 componentId, 음수 quantity, 다른 영역의 evidenceId를 가지면 normalizer를 새로 통과하지 않아도 raw `/accept`로 accepted가 될 수 있다. pure 호출에서 같은 합성 값은 `validateValue=pass`, `validateGenericRecord=reject`였다. 새 normalizer만 추가하는 것으로 이 경로는 닫히지 않는다.
- **최소 요구/현재 상태:** 검토 중 갱신된 `server/index.ts:384`는 assisted `/accept`에 `genericCandidateValue`를 추가했다. `server/ai/generic.ts:9–23`에서 effective field, GenericRecord, source partition, 실제 evidence, variant, region 및 AI placement를 검사한다. **최초 지적은 최신 소스에서 보완됨을 확인했다.** 이 문서에서는 열린 결함이 아니다. import/저장된 모든 기존 값을 무조건 재작성하거나 새 규격으로 마이그레이션하라는 요구가 아니다.
- **남은 최종 증거:** 기존/import candidate의 invalid explicit apply 거절과 기존 accepted 불변, 유효한 수정 후보 적용 성공을 구현 담당의 focused/API 회귀로 확인해야 한다. 이 검토는 해당 API를 실행하지 않았다.

## 대조한 나머지 경계 — 추가 확정 blocking finding 없음

| 경계 | 대조 결과 / 확인 한계 |
|---|---|
| 고정 팩·판본·출처 | 설계 §1–3은 raw pack/version/source를 보존한다. 새 `recognitionCapability:14–28`은 등록 SHA/edition과 binding의 scope/visibility/component/area를 대조한다. `effectiveRecognitionPack:31–42`는 clone을 만든다. current generic118 pure probe에서 원본 변경0, 임의 SHA assisted0이었다. 실제 과거 저장본의 전 경로 검증은 하지 않았다. |
| overlay 저장/가져오기/복원 | 처음 raw-only였던 경로가 검토 중 바뀌었다. 최신 `rawStoredPack/storedPack/sessionFor:118–129`는 raw 저장본과 effective 실행팩을 분리하고, import `:207–216`도 effective 필드로 확인한다. commit은 raw version과 assertion을 보존하며 resume는 전달받은 effective pack으로 public/owner를 나눈다. 설계에 요구가 명시되어 있어 별도 설계 결함으로 세지 않는다. source를 모르는 다른 설치에서는 manual/가져오기 거절을 허용할지의 외부 호환 정책까지 새로 요구하지 않았다. |
| 공개/개인/비밀 | `recognitionFields:45–49`는 public 사진에서 public fields/tray, owner 사진에서 실제 owner-private field/private tray를 고른다. 기존 `answerField:94`의 private ref→public 거절을 완화할 필요가 없다. `rooms.authorizeRoom:27–39`와 analyze target/fieldScope 필터는 host의 타인 개인 쓰기를 제한한다. `privacy`/uploads/PIN guard 및 `runtimeResume`는 effective pack을 동일하게 전달받아야 하며 최신 연결 소스에서 이 경로를 대조했다. 실사용 데이터/네트워크 권한 테스트는 안 했다. |
| 관측 대상 | 생성 index와 새 capability를 pure 호출한 결과 generic118 전부 assisted, eligible binding441, opaque/unsupported-secret eligible0이었다. 원문 photo scalar0 확인. 이는 규칙이나 사진 인식 정확도 검수 결과가 아니라 저장된 eligibility 계약 집계다. |
| 후보·타입·미확인 | 새 generic helper는 실물 ID를 새 후보에서 독립 생성하고, null≠0, 허용 component/variant, 실제 source/region, 기본 미배치, extras 제외를 검사한다. generic 중복 필드도 normalize에서 hold하도록 바뀌었다. 실제 모델의 색/수량/정체 판독 품질은 이 검토 대상이 아니다. |

## 재실행 가능한 작은 증거

파일 생성·Store·AI 호출 없이 실행한 pure 검사다. JSON pack은 생성 제품 데이터만 읽었다.

```sh
node --import tsx --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {validateValue} from './server/engine.ts';
import {validateGenericRecord} from './shared/genericRecord.ts';
const p=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8')).find(p=>p.id==='splendor');
const f=p.fields.find(f=>f.key==='market.scene');
const v={version:'game-component-record-v1',pieces:[{id:'same',componentId:'not-in-market',variant:null,quantity:-1,label:'synthetic',anchor:'',evidenceId:'private-only',region:null}]};
for(const [name,run] of [['shallow',()=>validateValue(f,v)],['typed',()=>validateGenericRecord(v,p,f.key,['public-only'])]]){
 try{run();console.log(name,'pass');}catch{console.log(name,'reject');}
}
JS
```

결과: `shallow pass / typed reject`. 기본 검증의 차이를 보여 주며, 보완된 최신 `/accept`가 여전히 우회된다는 뜻이 아니다.

## 관측 버전과 범위

HEAD `98d573cdb80ff64af09b576b66d1c403392dced8`, 작업트리는 병렬 변경 중이었다. 전체 diff를 이번 구현 책임으로 귀속하지 않았다. 최초 server SHA와 이후 보완을 R2에 분리했다. 아래는 보고 시 읽은 파일별 SHA256이며 원자적인 저장소 스냅샷은 아니다.

| 파일 | SHA256 |
|---|---|
| `docs/game-recognition/design.md` | `697b0475a1ecd6944f446faaa97d1c184b30400d8a636898947f68d418a27b93` |
| `shared/recognition.ts` | `7d483351ec87b8b15638346dc936c636c1fbcfb198deb1da4bc39a2904e4bc44` |
| `shared/recognition-index.json` | `dd713ceb3675c77c916242e4a7765ca623182d6786ad6fd6bd493f848d8aab21` |
| `server/ai/generic.ts` | `478ad02e4254c3a9256009ce96a0c523a3acb785b5232083216cd90808079c6d` |
| `server/index.ts` | `faf7c26096fef2b8a212ca109ca6a0238c7a359bcba0d9b88852d2d74a3ce275` |
| `server/ai/index.ts` | `5f88a8dc65afa759b697aa0ffac0a82c379ace8a50e7774f2690e31e09a3d823` |
| `server/ai/fields.ts` | `4c425ddb79daf9dfa14ed1b6c5488c3fc8f9447cfb4f724c1243b540f4fda0e8` |
| `shared/genericRecord.ts` | `d7d48c5a1d015cdb4b1566f7ca331ecff131f692c9f4e1dca3454ebb2585217a` |
| `shared/privacy.ts` | `f183c50323b9203b3e3bf29456ff26664b51d2245d51f306805a4a10cc41254a` |
| `shared/rooms.ts` | `7cd7dfbddd032ad630218b30010bdd3613072253c5642c0ce7b68b2235e7289e` |
| `server/rooms.ts` | `556e837bb9d1d3cebc73bfefe1598d37c62d8ccb754ce92c01ccc8764bfe94b3` |
| `server/runtimeResume.ts` | `5f06eec7dedaf7ad1946273fa4d4f4e5529379f8b7611b5f170ad527a9d305c0` |
| `src/GameEssentials.tsx` | `9f7bc0921fc8b727ac3b42296c1e5a311c758314a37c1964f7d7d08fccdb9b0b` |
| `src/GameBoardRecord.tsx` | `4a93fd86f0c2e708ba0ccf025d22e7a385e5f66d26b673cd236eddd3afbb1788` |
| `src/SessionWorkspace.tsx` | `a7d3ed271c7bd71e61d023ce294e3ced11d2508bf66d2864bc453978afec88ed` |

설계/관련 소스/생성 index/기존 단일기기 검증 기록만 읽고 작은 pure probe를 실행했다. Store/사용자 사진/키 읽기, AI/운영 API, build/전체 테스트/재생성/제품 수정은 하지 않았다. 이 보고서만 작성하고 소유권을 반환한다. **미확인: 최종 UI/API 통합, 실제 사진 인식 품질, 실제 저장·가져오기·복원 실행 결과.**
