# 117게임 외부 패키지 격리 통합 — 조건부 READY

**VERIFIED:** 현재 dirty 소스와 외부 수정6파일의 base hash가 모두 일치해 `files/`만 적용했습니다(patch 중복 적용 없음). 안전추출809항목, 경로탈출/절대경로/symlink0. 입력 ZIP SHA `5448d0646a76b5cda41dc88f13fb8e81b0389614a98a57ff4c8c85f9275a8fed`.

**결론:** 아래 호환 수정·출처 경계 수정을 포함하면 현재 앱에 적용할 수 있는 소스 패키지입니다. **공유 제품 소스·dist/운영에는 미반영**이며 후속 카드 전까지 적용·배포하지 않았습니다. 게임별 인식/공식 규칙 정확도 출시 인증은 아닙니다.

## 실제 결과

|검사|실제 결과|
|---|---|
|적용 전 검사|`check-apply.py` exit0, 280 preimages 일치. read-only 스크립트 내용 확인 뒤 실행.|
|첫 전체/type|552중549pass/3fail, build2. 사본 누락 의존성과 실제 타입 오류2개를 구별해 해결([수정 근거](fixes.md)).|
|새 API 대표|Carc/Scout/Sagrada 후보 미확정·명시적용·manual·snapshot/export/import/resume; Carc 관계/다른schema 거절. data회귀 포함8/8 exit0. 모델 mock이며 실AI0.|
|독립 P2|실제 API 출처 변경 RED1→최소 경계 수정 후 관련13/13 GREEN. 수동 재확인 재연결은 허용.|
|최종 전체|**559/559 pass, exit0**, [로그](full-test-verified.log). 기존 native/Splendor/room·PIN/source 및 원본해시 회귀 포함.|
|최종 타입·빌드|**npm run build exit0**, tsc 포함. [로그](build-verified.log). JS `index-C0mKZ3GJ.js`, CSS `index-u-JBb3AS.css`.|
|현재 원앱 적용 검사|`git apply --check integrated.patch` exit0, 실제 apply0. 공유 base 파일 해시 drift0.|

타입/전체검사는 코드 수정·실패 복구가 생긴 경우에만 다시 실행했으며 소스 무변경 반복은 하지 않았습니다. 최초 suite 진입 전 tsx IPC EPERM은 sandbox 실행제한으로 분리했습니다.

## 실제 화면 / 저장

키 없는 fresh Store 서버 **http://127.0.0.1:4407**, output session39745. [대표 합성 세션 URL](preview-sessions.json). 운영의 어떤 서버도 건드리지 않았습니다.

**CUA390 실제 앱:** Carcassonne 상세 문장수0→null·도로표시 true·수동gridX=-2 수정→완료→상단저장→reload→공개저장복원. UI와 보조 API/snapshot 값 일치. Scout 숫자/방향, Sagrada 색/눈/위치 양식 실제 표시·편집 패널 확인. 세 게임 page overflow0/broken images0, viewport reset 완료. [카르카손 편집](captures/carc-editor-390.jpg) · [복원](captures/carc-restored-390.jpg) · [Scout](captures/scout-editor-390.jpg) · [Sagrada](captures/sagrada-editor-390.jpg). [UI/API 대조](ui-api.json).

화면은 external UI+타입호환 수정 빌드의 실제 렌더입니다. 마지막 P2 서버 수정은 별도 fresh API·최종 전체로 검증했으며 기존 4407 장기 서버를 재시작하지 않아 그 서버에는 P2 server 함수가 hot-reload되지 않았습니다. UI 산출물 ID는 최종 빌드에서도 같았습니다. PIN/다기기 실제 클릭·320/desktop·117 전게임 화면·실사진·모델 품질은 이번에 전수검증하지 않았습니다.

## 적용물·경계

[통합 소스 ZIP](integrated-source.zip) 또는 [통합 diff](integrated.patch) **하나만** 적용하세요. 282파일=기존7수정+275추가. 정확 파일·pre/post SHA와 source digest는 [manifest](source-manifest.json), dist/ZIP/patch SHA는 [artifacts](artifacts.json). 현재 소스 물리복사1016+공식 local_text 의존성, node_modules만 읽기 재사용; `.git/.keepboard/env/설정/사용자사진·운영문서` 제외. 격리경로는 [paths](paths.json). code/팩/art 원본 바이트 보존.

외부 주장117게임/418분류/1800필드가 source-pinned catalog/fixture로 연결됨을 기존+외부 회귀에서 확인. **408 수집 가능/10 collection-boundary**는 원 binding을 그대로 유지하며 비밀 수집을 확장하지 않습니다. Carc/Scout 공식 일부만 외부가 재확인했다고 보고했으며 나머지115는 첨부명세 기반입니다. 이번에 규칙 전수재연구하지 않았습니다. 기본 GenericPiece union에 broad GameReadout runtime interface가 연결되고 상세 generated union은 보조 정적타입입니다. 실제 strict 검증은 registry의 pinned edition/hash/version+field/value/source 검사입니다.

한계: 1800필드 존재가 모든 실물·룰·숨은 상태를 완전 복원한다는 의미가 아닙니다. AI prompt 공급 및 소비경로는 연결됐지만 실제 provider의 117schema 준수/언어오독/사진성능은 미검증. 상용 인쇄판을 재현하지 않고 기존 대표 아트·수동좌표만 사용합니다. 빌드 JS 약1.31MB(gzip261KB), Vite 500KB chunk 경고는 남았으며 코드분할/성능 최적화는 범위 밖이라 미적용.

새 원본 보안체계/팩 migration/자동상태추론/자동후보확정/설정 변경은 추가하지 않았습니다. **실AI0, 운영변경0, 공유제품쓰기0.** 후속 적용·배포 승인 대기하며 소유권 반환.
