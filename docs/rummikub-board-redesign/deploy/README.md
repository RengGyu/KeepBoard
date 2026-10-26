# 루미큐브 최종 제품 운영 반영

VERIFIED · 2026-10-22 · https://keepboard-kappa.vercel.app

- deployment `dpl_A53yY7Z9Fo67VFtwJGpdtdbPR7DC` · READY/production · cached CLI65.0.0 prebuilt deploy exit0
- 고정 URL https://keepboard-9gaz65xyp-renggyus-projects.vercel.app
- 최종 JS `index-lb7ziqWz.js` / CSS `index-D7OcWrAc.css`
- [공개 자산 상태/SHA](verification.json), [clean manifest](static-manifest.json), [전환 전](operations-before.json), [전환 후](operations-after.json).

## 운영 보존·전환

4319 PID82226/cwd본프로젝트/data root `/tmp/keepboard-preview/data`를 whitelist로 재대조했다. Store 내용·파일명을 출력하지 않고 `/tmp/rummikub-deploy-nvhazf3i`에 opaque copy(parent0700)를 만들었다. 개인 파일명은 기록하지 않고 path digest→content digest 집합을 백업 내부0600 파일에만 보존했다. 복사본과 원본43파일이 같음을 확인 후 PID82226만 SIGTERM(exit0)로 종료했다.

동일 Store/PORT4319/NODE_ENVproduction으로 `npm run start` 재기동. 새 backend PID**14239**, 장기 output session**71289** 유지. source 자동마이그레이션/저장본 교체/원본 삭제 없이 전후 **43파일 bytes/SHA 동일·누락/추가0**이다. PIN과 AI routing/settings도 이 집합에 포함되며 내용을 출력하거나 수정하지 않았다. proxy4320 PID64200 / Cloudflare tunnel PID64203 / AI gateway4330 PID18287 그대로 유지. 합성4400/4401 및 이전 preview도 건드리지 않았다.

## 배포·직접 GET 결과

기존 프로젝트/auth와 API/uploads `https://mba-estate-aid-gordon.trycloudflare.com` route를 재사용해 clean prebuilt stage `/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-rummi-production-xdi60kvy`에 dist/static만 배포했다(541 files). zip/src/server/docs/PDF/.env/.keepboard/Store/키 미포함. 소스 변경/빌드 반복/git commit·push 없음.

- local4319/public health200, catalog120.
- Rummikub `1.1.0-essentials-2.fb4be402632a` / adapter essentials-2 / privatePolicy optional-pin 반환.
- local/public configured=true / provider=gateway / model=deepseek-flash / upstreamProvider=deepseek / effort=high 동일.
- 공개 HTML/JS/CSS 및 숫자타일·조커타일·rack SVG 모두200/MIME정상/SHA==dist. 위 verification.json 명령 exit0.
- root가 독립 공개 최종GET과 Store43파일 보존근거를 확인했다고 전달했다. 추가 사용자 보드/목록 조회나 공개 보드 생성/캡처를 하지 않았다.

4색 필터·기존green보존·선택형PIN·저장/확정 계약은 최신 서버 소스 로드와 앞 단계237회귀, compact12회귀/타입포함build에 근거한다. 실제 외부AI/사진송신/카메라/과금시험0. 개인사진 정확도를 검증한 것이 아니다. 최종 실제390UI는 [compact 캡처](../verification/rack-compact-390.png)와 [검수](../verification/compact-handoff.md) 참조. 이번 운영단계는 추가CUA검수 없이 정적bytehash/API로 확인했다.

Mac backend/proxy/tunnel/gateway를 켜둬야 하는 기존 호스팅 유지조건은 동일하며 영구서버 전환이 아니다. 기존 Store는 /tmp이므로 OS 임시파일 정리 위험도 그대로다. 운영자료 복원/덮어쓰기는 수행하지 않았다. 제품·배포 파일 소유권 반환.
