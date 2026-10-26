# 117readout production 반영 — VERIFIED

**공개 URL:** https://keepboard-kappa.vercel.app  
**Deployment:** `dpl_4arttU6t2BKB2AfbpKquRfEFh1NF` · READY · [고정 URL](https://keepboard-4uf5fvgzo-renggyus-projects.vercel.app). 2026-10-22 배포 CLI exit0.

## 반영·보존

- frozen integration 282파일(기존7/신규275)을 **manifest 파일 복사 한 방식**으로 적용. patch 중복0, unrelated dirty 파일 보존. 전/후 hash 대조 및 최종1311 source 파일 drift0.
- full source digest `d93219eaca6fc2bafbda74efb04f4a0c5ac4372cc4e64ed237230cee3a986fef`. 기존 검증559/559·타입포함build0의 exact dist를 복사, 재test/rebuild0.
- 새 backend4319 **PID23791 / output session79261**, 동일 Store `/tmp/keepboard-preview/data`, 동일 production 런처. 이전 PID85677을 listener/cwd/command/허용env3개로 확인한 뒤 SIGTERM. [기동/health](backend-check.json).
- proxy4320 **64200** / tunnel **64203** / gateway4330 **18287** 모두 유지. 기타 preview 변경0.
- 운영 opaque backup `/private/tmp/keepboard-integrated-backup-1btj7su5` (0700, hashed0600). **기존66파일 전부 byte동일**, 삭제/변경0. 새 합성 세션 파일1개만 추가, 새 photo/PIN/settings파일0. [보존 결과](verification.json).
- key/model/route 변경0. local/public `configured=true, provider=gateway, model=deepseek-flash, upstreamProvider=deepseek, reasoningEffort=high` 일치.

## 공개 검증

|검사|실제 결과|
|---|---|
|HTML/JS/CSS|200·exact SHA 일치. JS `index-C0mKZ3GJ.js` SHA `6dc5f0429cb0475a00bfc65360ad803caffec7a421e118ff6633e3005b47257b`; CSS `index-u-JBb3AS.css` SHA `98c2cb1719e7ec34b23dac6b8e3afd5abf31c5472d8933506bfb138fd66b7b35`; HTML SHA `1e1c08662c5f2de060498d6af44350e09b7f89a386014c7770bfd831714d5e81`.|
|아트·manifest|추가3 public 정적 참조도200/hash 일치. [6asset/API 결과](public-assets.json).|
|API|local/public health200, catalog120 assisted118/native2.|
|새 synthetic/API|`[배포검수117] 카르카손 상세 기록`, ID `f6fa578c-5bfd-41e2-8f69-37ac85c74c0d`. manual typed1개·사진0·실AI0. invalid schema PATCH400.|
|실제 CUA390|새 합성 타일 상세에서 문장수0→null·gridX0→-3·도로표시true → 완료 → 상단저장 → reload → 공개저장복원. 실제 입력/저장/재개 화면 확인, API snapshot 일치. overflow0/broken0, viewport reset.|

[공개 편집 캡처](captures/public-editor-390.jpg) · [재열기 캡처](captures/public-reopened-390.jpg) · [합성 기록 대조](synthetic.json).

Clean prebuilt stage 674정적 파일만 포함. docs/source/env/Store/ZIP/private/synthetic사진 제외. 기존 Vercel 프로젝트·API/uploads 터널 경로 그대로. [stage](stage.json) / [deploy log](deploy.log) / [static SHA](static-manifest.json).

## 한계·복구

117게임에 구조화 양식/strict 저장경로를 연결했다는 뜻이며, 전117게임의 실제 사진 정확도·공식 규칙 완성을 인증하지 않습니다. 기존10 collection-boundary는 동결 검증대로 유지. 이번 배포의 실AI/사용자 보드 열기·수정0. PIN/타기기/전게임 화면 추가검수는 반복하지 않았습니다.

Mac 백엔드·proxy·터널·gateway가 유지돼야 API가 동작합니다. 운영 소스·process/data가 사라지는 상시 클라우드 백엔드로 전환한 것은 아닙니다. 실패 시 새 사용자 쓰기를 full Store backup으로 덮지 말고, 현재 Store를 유지한 채 이전 정적 배포/역patch 기반 별도 소스 사본으로 rollback 판단합니다. 이전 dist 위치는 applied.json에 기록했으며 rollback은 실행하지 않았습니다.

추가 소스수정·재빌드·검증 확대 없이 완료, 파일 소유권 반환.
