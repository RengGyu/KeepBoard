# 게임 사진 보조 인식 연결

VERIFIED: native 카탄·루미큐브 경로를 유지하며 generic118게임의 안전한 사진 허용 영역을 연결했다. 사진→후보→그림/원본 확인·수정→명시 적용→저장/재열기가 실제 공통 실행기를 탄다. 전 게임의 실제 사진 정확도나 규칙 자동 실행을 검증한 결과는 아니다. 운영은 미반영이며 별도 배포 승인이 필요하다.

## 연결과 호환

- `shared/recognition.ts` + `recognition-index.json`: 원명세 photo 허용·scope·visibility·source SHA/edition/binding 대조. `generate.py --check`, `coverage.mts --check`로 재현한다. 연구 원문/437아트/게임팩 파일을 변경하지 않았다.
- 현재120: native2 / assisted118. generic photo binding441, 공개 지원118게임, 개인 사진 지원114게임. 나머지4게임의 개인 영역은 근거 부족으로 사진 관측을 열지 않는다. photo scalar 허용 근거는 현재0개다. 게임별 지원/제외는 `coverage.json`.
- 저장된 pack 원문/version/source SHA는 고정한다. 알려진 과거 SHA의 동일 binding만 호환하고, 미확인 source는 manual로 남긴다. 실행용 pack 복사본에만 `__photo.public`, 필요한 경우 `__photo.owner` 관측함을 제공한다. 원래 공간에 연결할 근거가 없는 물체를 잘못된 공간/소유자에 넣지 않는다. Splendor 공개 공급 토큰이 그 예다. 개인 사진의 공개 보유물도 개인 관측함에 남겨 사진 비밀 범위를 낮추지 않는다.
- `server/ai/generic.ts`: 허용 field/component/null variant/수량 null≠0/실제 evidence/crop를 검증한다. AI placement·임의 카드 ID·숨김/시간/역할 필드를 거절한다. 새 후보는 기존 실물 ID와 억지 매칭하거나 합산하지 않는다. 원본과 crop를 보존하고 variant 미상은 종류 대표 그림으로 표시한다(물리적 세부/색의 확정이 아님).
- `engine.validateComponentRecord`를 수동 답변·후보 accept·import에 재사용한다. piece 원본뿐 아니라 assertion 근거 배열도 허용 범위를 검사한다. 사진읽기/업로드/상단저장만으로 미수정 후보는 확정하지 않는다. 실패/무결과는 accepted·이전 후보·원본을 유지한다.
- `GameEssentials`: 다른 영역 후보도 상단 검토 목록으로 보인다. `이 후보 적용`은 확인한 영역의 교체다. append나 동일 실물 추정이 아니다. `RoomPublicBoard`와 개인 화면 공용 개요는 비어 있지 않은 accepted 영역을 기본 선택하며 사용자가 선택한 빈 영역도 유지한다. 메인 편집기는 재열기에서 실제 기록을 기본으로 고르고 편집 중에는 같은 key를 유지한다.

## R1 / R2 검토 닫기

R1: 같은 영역의 미저장 초안이 있으면 후보 적용을 거절한다. incoming accepted가 바뀐 경우 낡은 초안 flush도 거절하며, 초안 보존/명시 폐기 후 최신값 열기를 제공한다. **다른 영역 초안이 있으면 후보 적용 후 자동 영역 전환을 하지 않는다.** 자동 flush/확정으로 해결하지 않는다. hook 이벤트 회귀는 부모 render의 동일 type/key 유지까지 확인하고, 실제 React 브라우저에서 market 초안→tray 적용→market 선택·초안·저장 버튼 유지→상단저장→reload를 확인했다. hook harness만으로 브라우저 lifecycle을 검증했다고 주장하지 않는다.

R2: 기존/import 후보의 invalid component/quantity/region/piece source 및 공개 assertion의 private source 우회가 accept/import에서 거절된다. 정상 후보 apply/save/reopen/export/import/restore는 통과한다. 관련 근거 `tests/game-recognition-api.test.ts`.

## 검증

- `node --import tsx --test tests/game-recognition-{api,normalize,ui}.test.ts`: 집중13/13 exit0(최종 assertion source 보강 API4/4도 별도 exit0). 로컬 서버 listen에 필요한 sandbox 권한을 사용했다.
- `npm test`: 최종276/276 exit0, `full-test.log`. 최초 전체 검사의 유일 실패는 기존 SSR이 카르카손을 manual로 가정한 기대치였다. `game-essentials-runtime-ui.test.ts`를 정확한 assisted 라벨로 갱신하고 미확인 SHA의 manual 및 native 라벨 검사를 유지했다. assertion source 보강 후 최종 전체검사를 다시 실행했다.
- `npm run typecheck`: exit0, `typecheck.log`.
- `npm run build`: exit0, `build.log`. JS `index-BBR7mnzn.js`, CSS `index-CtKEVc8C.css`; 해시는 `verification.json`. Vite의 >500KB chunk 경고는 남는다.
- index/coverage 결정적 생성 check exit0. 전체 회귀에 native·rooms·PIN·보존·원본·아트 검사가 포함된다. 새 범용 인식 계약을 native 정상 여부/사진 정확도로 혼동하지 않는다.

## 실제 브라우저와 실제 모델 경계

합성 mock 프리뷰: `preview.json`의 4405 URL, output session93554. 새 tempStore와 가짜 자격 문자열을 쓴 mock analyzer이며 유료 호출이 없다. CUA390에서 기존 사진 읽기→다른 초기 field의 tray 후보 그림 발견→수량/label 정정→명시 적용→상단저장→reload를 실제 클릭했다. 다른 영역 dirty 초안 보존도 실제 클릭했다. 저장 복원으로 epoch가 바뀐 뒤 기존 사진을 다시 읽어 후보 표시를 확인했다. 390/320 페이지 overflow0, broken images0. viewport는 reset했다. 캡처는 `captures/`의 JPEG이며 실사진/실제 스캔 성공 증거가 아니다. 독립 cookie room/PIN/CAS는 API 회귀이며 다중 실제 브라우저/실폰/카메라 검증이 아니다.

실제 모델: 승인된 **새 공개 합성 PNG 1회**, 기존 gateway/DeepSeek flash를 프로그램으로 사용했다. `live-smoke.json`: 12.24초 전체, provider 왕복12.23초, typed 후보2개(market + public tray). 출력은 `live-synthetic-result.json`. 키/운영 Store/사용자 사진을 읽지 않았고 설정/alias를 바꾸지 않았다. 최초 sandbox 상태조회는 gateway에 접근하지 못해 configured=false로 중단(유료0); 권한 적용 후 1회만 호출했다. 자동 retry/두번째 유료호출은 하지 않았다. 그림 속 단순 카드/원형은 실제 상업 게임 원본이 아니므로 정확도 평가로 쓸 수 없다. 전118게임 실사진 품질은 미검증이다.

## 인계

제품 변경 파일은 `changed-files.json`, 최종 소스/정적 산출물 해시는 `source-manifest.json` 및 `verification.json`. 기존 운영 서버는 새 backend 코드를 로드하지 않는다. 배포 시 정적 dist와 backend를 함께 반영해야 한다. 이 작업은 production/운영 자료·모델·라우팅·기존 프로세스를 변경하지 않았다.
