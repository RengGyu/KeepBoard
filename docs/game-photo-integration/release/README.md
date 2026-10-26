# 같은 KeepBoard 앱 릴리스 — 2026-10-23

**VERIFIED: 적용·배포 완료.** [공개 앱](https://keepboard-kappa.vercel.app) · [실행 검증](verification.json) · [공개 응답·Store 보존](verified-final.json). 추가 실제 AI 호출은 0회다.

- 최종 source `c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692`, patch `fb98a47d11a3c9c3e2edc3b96a293557f9a74159dca4ec3e2afaeb379893eace`. [27파일 명세](../source-manifest.json), [적용 receipt](applied.json). 변경 전 전체 1323경로 대조 후 exact27파일만 복사했고, 적용 후 동일1323해시를 확인했다. 기존 dirty 작업의 다른 파일은 덮어쓰지 않았다.
- Vercel `dpl_5aKfWTfqFsmqSSRfP6auC2gh8Vds`, READY / production / `keepboard`. [불변 배포 주소](https://keepboard-ckpkj5185-renggyus-projects.vercel.app), 기존 alias 유지. [배포 로그](deploy.log)와 [독립 inspect](deployment-inspect.log). 기존 project/org 및 `/api`, `/uploads` tunnel routing을 그대로 사용했다.
- 공개 JS `index-oIYMddFK.js`: `aae56eab81da713e1bdee88628e8ba512297849f5f1d16412ea61986ef267dfc`. CSS `index-u-JBb3AS.css`: `98c2cb1719e7ec34b23dac6b8e3afd5abf31c5472d8933506bfb138fd66b7b35`. HTML까지 최종 dist와 바이트 해시가 같다.
- clean staticstage는 674파일 / 28,945,795bytes. source/docs/raw 참고사진/설정/env/Store/사용자 uploads를 포함하지 않는다. 기존 배포와 같은 asset 경로만 허용하고 아트 ZIP은 제외했다. symlink·누락·여분파일0. [정적 manifest](static-manifest.json), [stage receipt](stage.json).
- backend4319는 지정 oldPID23791만 SIGTERM 후 같은 루트·같은 Store `/tmp/keepboard-preview/data`로 재기동했다. 새 listener PID6133, 실행 session31411. proxy4320 PID64200 / tunnelPID64203 / gateway4330 PID18287 유지. 설정 whitelist5개가 전후 동일하며 `gateway / deepseek-flash / deepseek / high`다. local/public health200. 설정·키 본문은 출력하지 않았다.
- 기존 Store71파일 /37,468,996bytes를 이름과 내용을 파싱하지 않고 opaque 해시로 비교했다. 원본 changed0/missing0. 명시적으로 승인된 합성검수 기록1개만 추가됐으며 사용자 기존 기록은 읽거나 편집하지 않았다. 전체Store 백업·복원·마이그레이션은 하지 않았다.

## 실제 연결 확인

[검수용 합성 Splendor 기록](https://keepboard-kappa.vercel.app/?session=1b5bdd3b-8c5f-415b-ab93-ce01cd31f0ae)은 이름에 합성·배포검수를 명시했다. 사진0, 분석시작0, local/public 새 jobGET200·빈목록을 확인했다. 현재 게임팩의 edition/sourceSHA와 market 촬영 프로필이 일치한다. 수동정정→미완료 명시 저장→공개 reload→export→공개 resume→공개 reload를 확인했고 quantity0, 비용6, 비용0, 모름null 및 같은 턴을 보존했다. [receipt](synthetic-check.json). import는 새 두 번째 운영 기록을 만들지 않기 위해 이번 운영 검수에서 실행하지 않았다.

최종 소스의 격리 전체검사는 **591/591**, 타입검사0, 별도 outDir Vite build0이다. [정확 명령/exit](verification-run.json), [전체 로그](full-test.log), [타입](build.log), [빌드](vite-build.log). source를 운영에 적용한 뒤 전체검사를 중복 실행하지 않고 source1323/dist675 exact 비교로 그 결과와 연결했다. Astra의 별도 [독립 검토](../../vision-research-astra/integration-review.md)는34/34 및120계약·441영역 대조이며, 운영 적용 검수와 구분한다.

Sol1의 [격리 실제 UI 검수](../ui-check-sol/README.md)는 Catan/Splendor 320·390px 안내/후보/정정/저장·재접속, after9 표시와 Catan배치를 다룬다. native 업로드 버튼은 직접 검증하지 못해 합성 API로 시작한 범위가 있고, 마지막 accept 교정은 API 검증으로 연결했다. 운영 공개 화면 클릭은 이번 worker가 수행하지 않았으며 위 합성 URL을 감독에게 인계했다. 64188 검수 preview는 이번 적용 중 변경하지 않았다.

## 핵심 차이 3개

1. `server/index.ts:337` jobGET/POST, `server/analysisJobs.ts:17` start: 탭을 닫으면 추적하기 어렵던 요청을 서버 작업으로 기록하고 재접속해 같은 후보를 확인한다. 분석 완료가 accepted를 덮지 않으며 사용자가 명시 적용한다.
2. `src/PhotoCaptureGuide.tsx:4` captureGuideText, `shared/photoCapture.ts:12` validateCaptureTarget: 게임·판본·공용/본인 범위에 맞는 촬영부분을 선택하고 짧은 한국어 안내를 본다. 기계용 좌표문구는 사용자 안내와 분리하고 선택범위만 분석에 전달한다.
3. `server/ai/generic.ts:12` genericCandidateValue: fresh 분석에는 선택부분 검사를 유지하지만, 이미 검증·저장된 후보를 승인할 때 최초 업로드부분을 다시 강제하지 않는다. 기존사진의 다른부분 재읽기 후 정상후보가400이 되던 API를200으로 교정했다. [RED/GREEN](accept-fix-manifest.json). owner·epoch·typed·provenance 검사는 유지했다.

## 한계와 운영 의존

사진 촬영과 실제 모델 판독은 이번 릴리스 검수에서 실행하지 않았다. 고정 high 원응답의 Sagrada21/SCOUT15 오프라인 재생은 **변환 성공**이며 정확도 개선이 아니다. readout이 없던 none 응답의 typed값은 **null로 보존**했고 0이나 정답으로 채우지 않았다. [재생 근거](../offline-replay.json). 전120게임 실사진 정확도나 원판 복각을 보증하지 않는다.

공개 API/uploads는 임시 tunnel과 이 Mac의 backend/proxy/gateway 실행에 의존한다. 서버 재시작 시 진행 중 작업은 interrupted로 남기며 유료요청을 자동 재시도하지 않는다. 현재 운영 검수는 새 유료작업 없이 수행했다. [전환·좁은 rollback 절차](transition-plan.md)는 이 릴리스 파일만 대상으로 하며 Store 전체복원은 금지한다.

소스·릴리스 파일 소유권을 감독에게 반환한다. 새 운영 backend는 유지하며 추가 배포·수정은 하지 않는다.
