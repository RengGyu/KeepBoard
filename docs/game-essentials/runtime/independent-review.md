# 120게임 데이터→앱 연결 독립 검토

VERDICT: **검토 원본의 아래2건을 수정·회귀 확인한 뒤 통합 판단.** 2026-10-22. 데이터작성자가 자신이 작성하지 않은 runtime 연결만 검토했다. 제품/테스트/원명세/아트는 수정하지 않았다.

이 변경은 동결된120게임 명세를 단일 어댑터로 고정 팩에 연결하고,2종 native/118종 수동 기록·보관을 제공한다. 새 개인 내용은 PIN 전 수집을 막으며, 현재 권한 모델로 표현할 수 없는 비밀은 실물 보관으로 남긴다. 사진인식120종·전용 기하·계정 본인인증·전체 게임 규칙의 완성이 검토 대상은 아니다.

## Must fix — 재현한 material defect

### 1. 명시 복원한 턴 한정 상태가 엔진에서 무시됨

**VERIFIED. 검토 최초 원본:** `server/runtimeResume.ts:13`이 저장본 assertion의 옛 `turnInstanceId`를 복사하지만 `:25–26`은 현재 논리 턴을 유지한다. `server/engine.ts:24`는 두 ID가 다른 턴 한정 필드를 현재 사실에서 제외한다.

발생조건: 새 기본 카탄 기록 → 현재자/단계build/주사위8 입력 → 저장 → 명시 새 차례 → 공개 저장 기록 복원. Fresh tempStore와 새 loopback API에서 직접 재현했다. 모든 응답은 성공했으며 실제 데이터·기존 서버를 사용하지 않았다.

결과:

```json
{"synthetic":true,"packRuntime":true,"savedTurnDiffers":true,"currentTurnRetained":true,"savedPhaseRetained":"build","phaseBriefing":false,"phaseAskedAgain":true}
```

원본 값 자체는 assertion에 남지만 engine의 현재 사실·안내·질문은 이를 미기록으로 취급한다. 저장 단계와 주사위가 유효한 재개 상태로 이어지지 않아 UI/엔진이 서로 다른 상태를 사용한다.

**최소 수정:** 복원하는 선택 partition의 턴 한정 값과 유지하는 현재 논리 턴의 연결을 일치시킨다. 다른 owner 값/전역 clock을 함께 되감거나 범위 밖 기록을 덮지 않는다. saved→next-turn→public resume에서 저장 단계/주사위가 다시 질문되지 않고 안내·조건에 반영되는 회귀가 필요하다. owner 복원도 동일 시간 의미를 명시해 검증한다.

감독에게 즉시 선보고했고 감독이 구현솔에게 수정 카드를 배정했다. 아래 재현은 **수정 전** 증거다. 이후 수정본을 이 문서가 통과했다고 인증하지 않는다.

### 2. 보관 위치 초안이 상단 저장의 flush에 포함되지 않음

**VERIFIED. 검토 최초 원본:** `src/GameEssentials.tsx:35`의 `PreservationItem`은 위치 초안을 부모 저장 map에 등록하지 않는다. `src/Packing.tsx:6,16`은 container를 지역 state에 두고 별도 ‘위치 저장’ 또는 포장 체크에서만 PATCH한다. 반면 `src/SessionWorkspace.tsx:67–70`의 상단 저장은 등록된 flush 후 commit하며 `server/index.ts:361`은 서버에 전달된 보관 정보만 복사한다.

발생조건: 새 카르카손 등 공통 기록에서 보관 위치 입력 → 별도 위치 저장/포장 체크 없이 상단 저장 → 다시 열기. 위치 입력이 성공 저장에 포함되지 않는다.

실제 `GameEssentials`/`PreservationItem` 함수를 이용한 **합성 React hook harness**에서 input.onChange → 부모 onReadyToSave flush를 호출해 다음 결과를 얻었다. 실제 브라우저/DOM 이벤트 시험은 아니다. 첫 하네스 실행은 window 미정의로 import에 실패했고, window stub을 넣은 아래 명령에서 정상 재현했다.

```json
{"synthetic":true,"draft":"synthetic zipper-bag A","mainSaveFlushAvailable":true,"mutateCalls":0,"persistedContainer":""}
```

**최소 수정:** 위치 초안도 부모 onReadyToSave/flush에 등록하고 오류를 전파하거나, 동등하게 전역 저장 전에 확실히 전달하는 정책을 적용한다. 기존 별도 위치 저장/포장 체크와 오류 표시는 유지한다. 위치 입력만 하고 상단 저장·영역 이동·재열기를 거치는 회귀가 필요하다.

감독에게 선보고했고 구현솔의 좁은 수정 카드에 전달됐다. 제품은 직접 수정하지 않았다.

## 그 밖에 읽고 확인한 경계

- 단일 어댑터/생성/registry: `shared/gameEssentials.ts`, `gamepacks/catalog.ts`, `tools/game-runtime/generate.ts`, 생성JSON/manifest. validator를 먼저 실행하고 stable source digest/판본/필드 ID를 유지한다. scalar/일반 구성물/opaque 메모/실물 전용 입력을 구분하며 규칙 전체 실행으로 표시하지 않는다.
- **독립 read-only hash 대조:** source120/120이 freeze와 generated metadata에 일치.1,360 source binding의 scope/visibility/lifetime/edition 대조에서 불일치0. 표현 불가 source98필드는 수집용 pack.fields에 없음. generated output SHA도 manifest와 일치. 숫자는 의미 완전성·정확도 수가 아니다.
- 수집/권한: `shared/privacy.ts`, `shared/genericRecord.ts`, `shared/types.ts`, `server/index.ts`, `server/ai/fields.ts`의 PATCH/사진·crop/원본/snapshot·목록/import/export/분석 경계를 읽었다. 새 owner는 PIN 전 차단하고 ownerless public/owner-private를 구분한다. 임의 비밀 free-text의 의미를 판별하는 기능이나 계정 인증까지 보장하지 않는다.
- 저장/다시 열기: pinned session.gamePack을 먼저 쓰며 기존 버전 fallback도 exact ID/version이다. 일반 GET은 turn/epoch를 변경하지 않는다. scope public/owner 복원은 서로 다른 partition을 보존하고 공유 원본 참조를 유지한다. 다만 위1번의 시간 유효성 결함을 발견했다.
- UI: `src/GameEssentials.tsx`, `SessionWorkspace.tsx`, `PrivatePin.tsx`, `Dialogs.tsx`, `api.ts`와 연결된 `Fields.tsx`/`Packing.tsx`를 읽었다. generic 장면은 독립 ID·pieces 배열 순서·null/0·원본 영역을 유지한다. source JSON 구조는 무단 변환하지 않고 원본/실물/확인 메모로 경계를 표시한다. PIN 잠금 시 개인 입력과 사진 버튼은 렌더되지 않는다. 지원 수준·판본/hash는 표시되나 모든120화면을 클릭한 검토는 아니다.
- 새 runtime adapter/API/UI/final 테스트와 README/verification/log를 읽었다. 기존 기록상 전체218/218·타입·빌드exit0을 확인했지만 이번 검토에서 이유 없이 전체 명령을 반복하지 않았다. 그 통과가 위2개 경로를 포함했다는 뜻은 아니다.

## 기존8개 테스트 변경 확인 범위

`board-ux`, `catan-information-api`, `journey`, `quick-save`, `scan-api`의 **추적된 git diff5개**는 legacy 생성에 `gamePackVersion:catanPack.version`을 명시하고 필요한 import를 더한 변경뿐임을 확인했다. assertion 삭제·보호 fallback 추가는 없다.

`catan-review-fixes`, `private-pin`, `rummikub-runtime-integration`3개는 현재 작업트리에서 untracked라 git 원본 diff가 없다. 현재 생성 호출이 legacy version을 명시한 것은 읽어 확인했지만, 이3개가 과거 대비 ‘그 변경만’ 있었는지는 독립 증거 부족이다. 전체 untracked 파일을 이번 구현 변경으로 귀속하지 않았다. 새 기본팩 무버전 생성의 보호 정책은 별도 runtime API 테스트에 있다.

## 수정 시점·검토 한계

감독이1번 선보고 후 `server/runtimeResume.ts`/관련 helper·회귀,2번 선보고 후 `src/Packing.tsx`/`GameEssentials.tsx`·회귀의 수정 소유권을 구현솔에게 재배정했다. **아래 명령의 최초 결과와 이후 수정 결과를 구분해야 한다.** 수정판이 도착하기 전 이 검토 원본의 결론은 ‘두 경로 수정 필요’다. 이후 변경을 다시 검토하라는 요청 전에는 제품/명세/기존 서버에 손대지 않는다.

실제 AI0, 외부 전송0, 실사용자 Store/사진/키/설정 접근0, build/dist/설치/process 변경0(검토가 만든 임시 서버 생성·정상종료만 수행), 커밋/배포0. 보고서만 작성하고 소유권을 반환한다.

## 재실행 명령 — 1번 fresh API

프로젝트 루트에서 실행한다. server 모듈을 import하기 전에 임시 cwd로 옮겨 프로젝트 .env를 로드하지 않으며, tempStore와 자신의 ephemeral 서버만 사용한다. 수정 전에는 위 JSON이 출력됐다. 수정 뒤에는 `phaseBriefing=true`, `phaseAskedAgain=false`가 되어야 한다.

```sh
node --import tsx --input-type=module <<'JS'
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {pathToFileURL} from 'node:url';
const project=process.cwd();
const dir=await mkdtemp(path.join(os.tmpdir(),'kb-independent-review-'));
process.chdir(dir);
const {createApp}=await import(pathToFileURL(path.join(project,'server/index.ts')).href);
const {Store}=await import(pathToFileURL(path.join(project,'server/store.ts')).href);
const store=new Store(dir,path.join(project,'public'));
const server=(await createApp({store})).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
const call=async(route,method='GET',body)=>{
 const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},
  body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw Error(JSON.stringify({status:r.status,data}));
 return data;
};
try {
 let v=await call('/api/sessions','POST',{gamePackId:'catan-base',players:[
  {id:'red',name:'R',color:'red'},{id:'blue',name:'B',color:'blue'}]});
 const route='/api/sessions/'+v.session.id;
 v=await call(route,'PATCH',{answers:[{field:'currentPlayer',value:'red'},
  {field:'turn.phase',value:'build'},{field:'turn.diceTotal',value:8}]});
 v=await call(route+'/commit','POST',{allowIncomplete:true});
 const savedTurn=v.session.turnInstanceId;
 v=await call(route+'/next-turn','POST',{playerId:'blue'});
 const activeTurn=v.session.turnInstanceId;
 v=await call(route+'/resume','POST',{scope:'public'});
 console.log(JSON.stringify({synthetic:true,packRuntime:!!v.pack.runtime,
  savedTurnDiffers:activeTurn!==savedTurn,currentTurnRetained:v.session.turnInstanceId===activeTurn,
  savedPhaseRetained:v.session.assertions.find(a=>a.field==='turn.phase')?.value,
  phaseBriefing:v.briefing.some(b=>b.field==='turn.phase'),
  phaseAskedAgain:v.questions.some(q=>q.field==='turn.phase')},null,2));
} finally {
 server.closeAllConnections();await new Promise(r=>server.close(r));
 await rm(dir,{recursive:true,force:true});process.chdir(project);
}
JS
```

## 재실행 명령 — 2번 합성 hook harness

DOM/브라우저를 흉내 낸 UI 품질 검사 전체가 아니다. 실제 함수의 지역 draft와 부모 flush 연결 유무만 검사한다. CSS loader는 기존 SSR 회귀용 도구를 재사용한다. 수정 전에는 draft만 바뀌고 mutate0, persistedContainer는빈값이다. 수정 후 별도 API 모의 fetch 또는 교체된 onReadyToSave 계약에 맞는 검증이 필요할 수 있다.

```sh
node --import tsx --input-type=module <<'JS'
import React from 'react';import {register} from 'node:module';
import {readFile} from 'node:fs/promises';import {recompute} from './server/engine.ts';
register('./docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){}};
globalThis.fetch=async()=>{throw Error('No network');};
const {GameEssentials}=await import('./src/GameEssentials.tsx');
const {PreservationItem}=await import('./src/Packing.tsx');
const pack=JSON.parse(await readFile('gamepacks/generated/game-essentials.json','utf8'))
 .find(p=>p.id==='carcassonne');
const session={id:'synthetic',name:'Synthetic',createdAt:'now',updatedAt:'now',
 gamePackId:pack.id,gamePackVersion:pack.version,gamePack:pack,
 players:[{id:'p',name:'P',color:'red'}],captureEpoch:'e',turnInstanceId:'t',
 stage:'capture',evidence:[],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false};
const view=recompute(session,pack);let flush,calls=0;
const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function renderer(){
 const states=[];let cursor=0;
 const d={useState(init){const i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;
  return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},
  useRef(init){const i=cursor++;return states[i]??(states[i]={current:init});},
  useEffect(fn){fn();}};
 return(fn,props)=>{cursor=0;const prev=internals.H;internals.H=d;
  try{return fn(props);}finally{internals.H=prev;}};
}
function find(node,predicate){
 if(!node||typeof node!=='object')return undefined;if(predicate(node))return node;
 for(const c of React.Children.toArray(node.props?.children)){
  const v=find(c,predicate);if(v)return v;
 }
}
const tree=renderer()(GameEssentials,{view,busy:false,
 mutate:async fn=>{calls++;await fn();},onEvidence(){},onReadyToSave:fn=>flush=fn});
const itemNode=find(tree,n=>n.type===PreservationItem),child=renderer();
let itemTree=child(PreservationItem,itemNode.props);
find(itemTree,n=>n.type==='input'&&n.props.id?.startsWith('container-'))
 .props.onChange({target:{value:'synthetic zipper-bag A'}});
itemTree=child(PreservationItem,itemNode.props);
const draft=find(itemTree,n=>n.type==='input').props.value;await flush();
console.log(JSON.stringify({synthetic:true,draft,mainSaveFlushAvailable:typeof flush==='function',
 mutateCalls:calls,persistedContainer:view.session.preservations
 .find(p=>p.id===itemNode.props.item.id).container},null,2));
JS
```
