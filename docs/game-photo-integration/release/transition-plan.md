# 전환·rollback 범위

이번 실행은 승인 A3 범위로 완료됐으며, 아래 재실행은 향후 감독 지시 또는 이 릴리스 실패 복구시에만 한다. 현재 정상 상태에서 rollback을 실행하지 않는다.

## 이미 실행한 전환

1. `preflight.py`·`verify-ready.py`: source1323 전체, changed27 beforeSHA, patch/source digest, dist, StoreopaqueSHA, 프로젝트와routing, 공개 기존자산, PID/cwd/설정5개를 확인했다.
2. `apply-exact.py`: 모든 beforeSHA와 payload를 **쓰기 전에** 확인한 뒤 source27과 distdelta3만 적용했다. helper 첫 실행은 dist 상대경로 검사에서 쓰기 전에 실패했으며, helper 경로를 교정한 두 번째 실행이 exit0이었다. 제품에 중간 불완전 적용은 없었다. patch를 중복 적용하지 않았다.
3. `stop-exact-backend.py`: listener4319=PID23791, Node실행파일/cwd와 Store 불변을 즉시 다시 확인하고 그 PID에만 SIGTERM을 보냈다. proxy/tunnel/gateway는 종료하지 않았다.
4. 작업루트에서 동일환경으로 시작했다. 새 Node listener는PID6133이다.

```sh
env NODE_ENV=production KEEPBOARD_DATA_DIR=/tmp/keepboard-preview/data PORT=4319 /Users/jeonggyuju/.nvm/versions/node/v22.22.0/bin/node node_modules/tsx/dist/cli.mjs server/index.ts
```

5. 캐시에 있던 VercelCLI65.0.0으로 **staging**만 `deploy --prebuilt --prod --cwd <staging>` 했다. 기존 프로젝트ID·orgID와 routing은 stage에 고정돼 있다. 공유소스를 Vercel build에 전송하지 않았다.
6. `verify-after.py backend/public/final`: exactsource/dist, 공개assetSHA, health/settings, 원Store 해시와 유지PID를 확인했다. 마지막은 합성기록1파일 추가를 별도 허용해 대조한다.

## 해당 릴리스 파일만 복원하는 절차

- [transition-manifest.json](transition-manifest.json)의 27source +3dist delta만 대상이다. source-before15파일, 새 source12파일의 원래 부재, dist-before2파일이 보존돼 있다. 다른 dirty 파일·설정·Store·사용자 업로드는 대상이 아니다.
- `python3 docs/game-photo-integration/release/rollback-files.py`는 **검사만** 한다. 현재 대상 파일이 afterSHA와 정확히 같고 backup이 beforeSHA와 같아야 통과한다. 타인이 이후 바꾼 파일이 있으면 자동 덮어쓰기하지 않는다.
- 실패 시 운영 listener4319의 **즉시 PID/cwd/Node실행파일을 다시 확인**하고 이번 릴리스의 새 backend만 SIGTERM한다. PID6133이라고 무조건 종료하지 말고 다른 process로 교체됐으면 중단·보고한다. proxy64200/tunnel64203/gateway18287을 종료하지 않는다.
- 복원 권한·preimage가 충족되면 `python3 docs/game-photo-integration/release/rollback-files.py --apply`로 source15개와 dist기존2개를 복사하고, afterSHA가 정확한 이번 신규source12개/신규JS만 제거한다. 전체 source를 reset하거나 Store를 복원하지 않는다. 합성·사용자 신규 쓰기는 그대로 둔다.
- 같은 루트·같은 Store와 위 동일환경 명령으로 backend를 시작한다. 로컬/공개 health와 설정5개 및 originalStore보존을 확인한다. 이전 소스는 새 captureTarget metadata나 작업파일을 삭제·이행하지 않는다. 새 job UI는 rollback 동안 제공되지 않지만 기록파일을 지우지 않는다.
- 정적 rollback이 필요하면 같은 stage/project에서 이전 production 주소 `https://keepboard-4uf5fvgzo-renggyus-projects.vercel.app` (`dpl_4arttU6t2BKB2AfbpKquRfEFh1NF`)에 `vercel rollback <previous-production-url> --cwd <staging>`을 사용한다. alias와 이전 HTML/JS/CSS를 이전 staticmanifest와 대조한다. 별도 프로젝트를 만들지 않는다.

위 rollback은 **문서화 및 check-only 검증**했고 실제 실행하지 않았다. 현재 릴리스가 정상이라 파일·프로세스·alias를 추가 전환하지 않았다. 자연 사용자 쓰기가 발견되면 격리 보고하며 옛 전체Store로 되돌리지 않는다.
