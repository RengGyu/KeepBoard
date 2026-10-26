# 최종 UI + backend 통합 — preview 배포 준비

**VERIFIED:** backend14(R1 포함)와 UI15(src14·test1)를 exact preimage로 결합했다. 최종 1346파일 맵은 Sol1이 검수한 동결본과 같다. [source-manifest.json](source-manifest.json)의 source digest는 `0255142408c9035805725fdb74c2a93b9679c81458acd18f2358c9240d8cfe7d`, 누적29파일 [integrated.patch](integrated.patch) SHA는 `06ba2e088da281f74329cf72064e054ecc3a43f0f4de31b5150c2d60e4552830`이다.

승인된 A1 범위에서 공유 제품에는 **정확29파일을 copy1회** 적용했다. 사전 preimage 불일치0·비소유 등록파일 변경0·적용 후 전체1346 SHA 일치. 기존 dirty baseline을 보존했고 git 조작·의존성 설치·프로세스 변경·운영 데이터 수정은 하지 않았다. 복원용 원문과 [shared-apply.json](shared-apply.json)은 해당29파일만 대상으로 한다. 옛 Store 복원이나 migration을 다시 하는 릴리스가 아니다.

## 검증과 자산

- `npm test`: 전체 **613/613, exit0**, 1회. [full-test.log](full-test.log)
- `tsc --noEmit`: exit0. [typecheck.log](typecheck.log)
- `vite build --configLoader native --outDir cloud-dist`: exit0, 새 격리본의 별도 outDir. [vite-build.log](vite-build.log)
- `nitro build`: exit0. [nitro-build.log](nitro-build.log)
- 실제 배포 allowlist stage의 타입검사도 exit0. [stage-typecheck.log](stage-typecheck.log). 검사용 의존성 symlink는 종료 후 제거했다.

최종 JS `index-BF7iduh2.js` / SHA `4d4a7d781c5ca60c556e4b23b736045b4901b3ec701e94507ecc12f465a100c4`, CSS `index-Dn5eUjP5.css` / SHA `4b8f3e5e68574bd999e4bc836bedca7d22e65e3de716a860ec21f729954fa420`은 Sol1의 마지막 CUA 자산과 같다. 기존 500kB 초과 chunk 경고는 남아 있다. UI를 추가 변경하지 않았으므로 [Sol1 실제 화면 검증](../../mobile-ui-claude/sol-finish/README.md)을 사용하며 같은 모바일 화면 전수 검수를 반복하지 않았다.

짧은 접점 검토: 부분 후보 연결은 선택 ID/명시 field·owner·대상 accepted ID로 POST하며, 남은 후보만 원래 field에 확정하는 경로도 같다. 다른 목적지로 원문 전체를 재적용하지 않는다. dirty 대상/이동 source는 UI가 먼저 차단하고, API는 target/CAS·PIN·room scope·근거/부착·배치 동의를 검증한다. 타인의 public 보유는 읽기 전용이고 private 예약은 노출하지 않는다. 이 검토에서 추가 확정 의미 결함은 없었다. 모든 실제 게임 규칙이나 모델 정확도를 보증하는 검토가 아니다.

## 배포 stage와 정확 실행안

[stage-manifest.json](stage-manifest.json): source stage `/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-linking-cloud-stage-t8xfag20/app`, 948파일 / 36,850,497B / stage digest `2cfb9224c4e1769155a2a4df3fb8bc2a4039801cceeef3458da7f60f71eb30a5`.

포함: src/server/shared/gamepacks/workflows·기존 승인 public 에셋·gateway 실행 모듈·정확 package-lock 및 빌드 설정·같은 project.json. **docs/tests/tools/원본 corpus/.keepboard/운영 uploads/env/키/설정값/개인 사진은 제외**했다. 필요한 `workflows/analyze.ts`가 들어 있고, tests를 제외한 소스 stage도 타입검사를 통과했다. 로컬 macOS 함수 prebuilt를 전송하지 않고 **remote Linux source build**를 사용한다.

```sh
/Users/jeonggyuju/.npm/_npx/67eb4586ca667318/node_modules/.bin/vercel deploy --yes --archive=tgz --scope renggyus-projects --cwd /private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-linking-cloud-stage-t8xfag20/app
```

같은 project `prj_HPh7BKpxtkcFNY6X40w3kbAyPL0V`, team `team_RgOQUIJZTU9MufwDOGzuJYA6`. **이 시점 외부 배포0**이며 감독의 해당 artifact 범위 확인 후 preview를 실행한다. production `--prod` 실행은 별도 exact 확인 전 하지 않는다. 리소스/플랜/환경변수를 만들거나 바꾸는 명령이 아니다.

preview READY 후 기존 preview 전용 private Blob/mock 설정을 먼저 확인하고, 실제 AI 없이 새 명시 합성 기록만 사용한다. 최소 HTTP 여정: mock 작업 완료 후보 조회 → 기존 후보 일부 구매/예약/공급 연결 → 원문/잔여/재전송 보존 → 올바른 범위 commit/reload/export/import/resume → PIN 개인 접근·방의 타인 public/private 분리. 성공하면 remote deployID·최종 공개 자산 SHA·결과를 추가하고 production exact 실행안을 반환한다. 기존 사용자 세션을 수정하거나 새 사진을 유료 재분석하지 않는다.

## 알려진 한계와 원복 범위

- [실사진 비교](../evaluation/README.md)의 GT 오독은 남아 있다. 원본17/19 대 ROI16/19이고 자동 ROI·추가 재시도·none 전환은 하지 않는다. 기존 구성에는 비교 가능한 다른 vision alias/키 참조가 없다. 수동 정정·연결 기능 완료를 모델 정확도 개선 완료라고 보고하지 않는다.
- 120게임/747 합성 연결 조합은 선언된 상태를 저장하는 계약 검사다. 120게임 실사진 정확도나 전규칙 통과가 아니다.
- 이 단계에서는 production alias/Store를 건드리지 않았다. 향후 릴리스 실패 시 이29파일과 해당 배포 alias만 대상으로 되돌린다. cloud에 새 사용자 쓰기가 생길 수 있으므로 과거 Store 전체 복원·재이전은 금지한다. 기존 Vercel Blob namespace·PIN·room·Workflow 설정을 그대로 유지하는 코드 릴리스다.
