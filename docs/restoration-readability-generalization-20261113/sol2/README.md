# 기존 5종 실제 제품 재생 인계

**VERIFIED:** 기존 8장 중 루미큐브·하나비·아줄·카르카손·도미니언의 원사진과 실제 저장 응답을 현재 createApp/Store/App에 재생했습니다. 제품 수정 없이 원래207개 실물의 값·ID·원문·scope를 보존합니다. 새 판독/새 사진 일반화/전체 정확도 검증이 아닙니다.

## 바로 열기

서버 **http://127.0.0.1:58114** 유지 중. 개별 URL과 임시 Store는 `serve-manifest.json`입니다. 보존 검사 사본5개는 삭제하지 않고 목록에서 숨겼으므로 기본 목록은 원본 fixture5개입니다.

- rummikub: http://127.0.0.1:58114/?session=b0b337d1-23e1-4f81-8ef8-77dbcd74e8c7
- hanabi: http://127.0.0.1:58114/?session=bf4842be-f079-4436-9b95-d17c1e5ddd65
- azul: http://127.0.0.1:58114/?session=a2c2e195-713e-42e2-a6fb-9fd457d8a208
- carcassonne: http://127.0.0.1:58114/?session=cdfeb3c7-9f65-4cba-9ff0-966ccf8a3e32
- dominion: http://127.0.0.1:58114/?session=3fe85a80-c79c-4482-b290-c37a57971a8c

## 원본과 연결 범위

`manifest.json`은 원사진5개와 각 view/request/decoded/native/summary 파일의 실제 SHA, exact 원팩 ID/version/source, 원정의 SHA, 기존 요청 body/wire SHA를 고정합니다. 요청 파일은 descriptor의 `request` 안에 실제 계약이 있습니다. 정답/사진/기존 평가 파일은 수정하지 않았습니다. 원래 호출은2026-11-10의 Terra high v7이며 이번 실행은 무료 기존 응답 재생입니다. manifest의 originalJobMs는 그 과거 호출 시간입니다.

| 게임 | 원관측/저장 실물 | 현재 실제 UI 경로 | 한계 |
|---|---:|---|---|
| 루미큐브 |58/58|기존 native Rummikub 판·값 편집기|원기록은 groups0/loose58. 새로운 합법 줄·묶음을 만들지 않았음. generic으로 위장하지 않음|
| 하나비 |35/35|일반 전체 복원판·원 구성물 편집|기존 요청은 fireworks 영역. 카드35개를 모든 손패/버림/사람 소유로 새 분류하지 않음|
| 아줄 |22/22|일반 전체 복원판·사진 미배정 tray 편집|관측 boards3/tiles19, 원요청 pattern·공개 미배정. 영역 label도 그 요청에 따르며 실제 공장/벽/바닥 소속 인증 아님|
| 카르카손 |43/43|일반 전체 복원판·구성물 편집|tiles9/followers34라는 기존 출력. 지도 연결/회전/점수말 정확성을 추가 추정하지 않음|
| 도미니언 |49/49|일반 전체 복원판·구성물 편집|기존 supply 카드49. 미판독 제목·수량을 보완하거나 전체 덱/더미를 새로 만들지 않음|

원래 unknown property는 각각0/32/33/59/101개입니다. 이것은 원 receipt의 필드 수이며 화면의 적용 가능한 모름 수·실물 누락 수·사진 정답률이 아닙니다. 현재 scene의 canonicalCells는 모두0, retained canonical/manual 위치도0입니다. 원 bbox 기반 사진 연결은 보존하지만 정식 칸/지도 복원까지 성공했다고 세지 않습니다. 표시 영역/역할 fallback은 실물 소유·실제 판 인증과 다릅니다.

## 직접 확인

- 사진 실제 bytes의 SHA 및 실제 JPEG decode 치수, view의 exact pack/version/source와 request source/이미지 SHA 일치.
- 현재 HTTP GET: accepted 값·실물 ID·owner·receipt 원문 proof 불변. 원사진 제공 bytes 동일.
- 현 projector의 binding207개 전량, source-qualified live identity 중복0, 표시 그룹에 중복/누락0.
- 별도 격리 사본에서 commit→GET→public resume와 원 ID의 같은 값 PATCH→commit→GET. 값/readout/geometry/실물 ID/receipt 불변. 새 정정 값/가짜 수동 배치를 seed하지 않음.
- GET `/` 및 `/src/main.tsx` **200**, 기본 보드 목록5개, settings configured=false. 실제 Chrome 화면/가독성 판정은 감독 소유이며 이 HTTP 확인으로 대체하지 않음.
- `npx tsc --noEmit -p docs/restoration-readability-generalization-20261113/sol2/tsconfig.json` **exit0** (`typecheck.log`). 전체 suite/build 미실행. 제품 수정0이라 추가 backend 회귀 변경도0.

초기 harness의 Vite cwd가 임시 Store여서 화면404였고 이를 교정했습니다. 서버 모듈은 임시 cwd에서 먼저 import하여 workspace `.env`를 읽지 않습니다. createApp는 ui:false로 API를 재사용하고, 동일 실제 App/Vite config를 root=repository·envDir=격리폴더로 명시한 middleware로 연결합니다. 새 renderer/정적 모조 뷰어가 아닙니다.

## 재현 명령

저장된 원본 자료가 같은 경로에 있어야 합니다. 비밀·키 인자는 필요하지 않습니다.

```sh
npx tsx docs/restoration-readability-generalization-20261113/sol2/serve-five.mts --check
KB_REVIEW_PORT=58114 npx tsx docs/restoration-readability-generalization-20261113/sol2/serve-five.mts --serve
```

각 실행은 새0700 임시 Store를 만들며 기존 사용자 Store를 읽지 않습니다. serve는 화면 검수 동안 실행 상태로 둡니다. `--check`의 verification.json URL은 실행 종료 후 닫히므로 실제 검수에는 serve-manifest.json URL을 씁니다. 위 포트를 이미 사용 중이면 기존 검수 서버를 임의 중복 기동하지 말고 다른 포트로 실행합니다.

provider reader/analyzer를 모두 실패 stub으로 주입하고, 설정/generate 경로를 격리 wrapper에서 차단하며 서버 외부 fetch도 거절합니다. 준비 검사에서 providerAttempts0/externalFetchAttempts0. UI에서 새 판독을 시도해도 실제 모델로 전송하지 않습니다. 원래 provider 응답이나 운영 설정을 덮지 않습니다.

**소유 delta:** 이 sol2 폴더의 loader/harness/설정/메타·검사 근거뿐입니다. src·shared·server·팩·3종 profile 수정0. 재사용 가능했던 현재 수집/호환 경로에 이번 자료 기준의 공통 결함은 재현되지 않았습니다. 그림 가독성·모름/관계 부족은 위 한계와 별개이며 감독의 실제 Chrome 검토로 확인합니다.
