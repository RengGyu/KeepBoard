# 사진 분석·촬영부분 계약 통합 — 적용·배포 완료

**VERIFIED:** 같은 KeepBoard 앱에 exact27소스·검수dist 적용 및 배포를 완료했다. [공개 앱](https://keepboard-kappa.vercel.app) · [최종 릴리스 보고](release/README.md) · [운영 검증](release/verification.json). 기존 Store71파일 보존, 명시적 합성검수1개 추가, 설정/high 유지, 실제 AI0. 아래 구현·격리 검증 이력은 최종 릴리스 보고와 구분한다.

- [exact source/변경27파일/원해시](source-manifest.json) · [통합 patch](integrated.patch) · [검증](verification.json) · [미리보기](preview.json)
- source digest: `c061328e56121b6b5a2ef5a13185fd722ae33688604181a8de685bb9d472b692`
- background 입력 digest `b19811fa48d6b1bedffb15a6119daba351abb771173af71f23b5012748d571ab`; 연구120계약 digest `7db2cb75ded4e4249082d8a1850784fcb7774b1d9ed610b8c4c9f82554f11a5d`. 원해시 불일치/공유 baseline drift0. 생성프로필213,333bytes이며 연구 JSON전체를 앱/모델로 보내지 않는다.

실제 연결: 현재 게임·edition/sourceSHA가 맞는 profile만 선택→공용/본인 탭에서 짧은 촬영안내·부분 선택(미지정/건너뛰기 허용)→원본 업로드→서버 job202→이탈/재접속 시 같은 작업 조회→후보 정정·명시 적용→저장·복원. 기존 accepted/수정중 초안을 분석 완료가 자동 적용하지 않는다. 기존 질문·보관 절차·native Catan/Rummikub·Splendor 전문값 경로는 유지했다.

`shared/photoCapture.ts`의 captureProfile/captureAreas/captureFields/validateCaptureObservation이 프로필과 **기존 허용 field/component/visible typed attr**의 교집합을 적용한다. 공개 개인물은 public 미귀속 tray이며 자리를 보고 owner를 만들지 않는다. 개인 원본은 공용 근거로 내려가지 않는다. 한나비 own-hidden 손패·코드네임 역할 키·비밀 더미의 내용 수집은 열지 않는다. 선택부분 밖 응답은 후보에 넣지 않으며 가린 상태를0/빈칸으로 만들지 않는다. 원본이미지 좌표와 게임판 자리는 별개다.

선택 메타데이터는 `Evidence.captureTarget?={version:1,gameId,sourceSHA,areaId}`. 새 업로드에서 범위/판본을 검증하고 crop은 원본 선택을 상속한다. 기존사진은 미기재 그대로 열고 저장·복원·export/import한다. 기존사진 재읽기의 job captureTarget은 **요청 사본에만** 적용하고 원본 metadata를 이행하지 않는다. 서로 다른 사진을 captureEpoch만 보고 같은 판이라고 주장하지 않는다. 2장이상은 `sameStaticState:true`를 UI에서 명시 확인하며, 마지막1장만 읽기/사진만 보관도 가능하다. 확인 전 upstream 호출0을 검사했다.

실험 후 최소교정2건: fresh 응답의 source-basis가 해당 piece.evidenceId와 정확히 같은 **이번 허가 scope/epoch의 첨부 원본 ID**인 경우만 observation으로 canonical화한다. 다른ID/다른owner/다른epoch/user/manual은 그대로 거절하고, 기존 수동 저장/import/provenance 재귀속 검사는 바꾸지 않았다. 활성 typed 게임은 마지막 JSON예시에 실제 matching values/sources를 포함하며 optional이라는 모순을 제거했다. 근거사진 ID와 observation|null 근거 enum은 분리한다.

**VERIFIED:** 고정 원응답 오프라인 재생 [offline-replay.json](offline-replay.json): high Sagrada21/SCOUT15개 및 visible typed60/42개가 변환됐다. 이는 **변환 성공이며 모델 정확도 개선이 아니다**. 원응답의 실제 눈/카드 오독은 교정하지 않았다. readout이 없던 none21/17개의 typed nonnull은0이며, 값은 **null로 남겼고 숫자0으로 채운 것이 아니다**. label에서 GT/비용을 추측해 채우지 않았다. high/none 운영 설정과 모델은 그대로다.

**검사:** [최종 전체 로그](release/full-test.log) **591/591 exit0**, [타입](release/build.log) exit0, [별도 outDir Vite build](release/vite-build.log) exit0. 정확명령은 [최종명령](release/verification-run.json). 신규4테스트 파일18개는120프로필·scope·선택prompt·manual금지·source별칭·null/0/cost·legacy사진·실제workspace 이벤트·API 후보/적용/저장/복원/import·die8/Wingspan을 검증한다. 기존 scan-api는 명시적인 동일판 확인을 추가했고, recognition-normalize는 epoch가 아닌 명시확인 문구를 검사하도록 바꿨다. 보호검사를 삭제하거나 legacy로 우회하지 않았다. source를 마지막으로 변경한 뒤 전체591/type/별도build를 갱신했다.

**화면 범위:** 본 worker 신규 CUA는 inventory만 회복되고 자체탭 getTab에서 CDP focus10초timeout. 실제 after스크린샷0·viewport reset미확인([기록](browser-verification.json)). 앞 감사의120 baseline 렌더는 after근거로 세지 않는다. after9게임, Wingspan고정/owner비교, Catan변환된19칸배치, 촬영안내→모의분석→이탈/재접속→정정/저장/reload의 실제화면은 별도Sol1 검수 범위다.

최신 **정적dist+모의API** preview는 `http://127.0.0.1:64188`이며 세션 링크는 preview.json. 입력은 명시된1x1 합성PNG, 분석은 mock만 사용하며 actual photo 정확도를 뜻하지 않는다. 자기 서버 exec session3649는 감독 인계 동안 유지한다. 이전63646 dev서버는 Sol1검사중이라는 메시지 수신 전에 정적전환으로 종료돼 타이밍충돌이 있었음을 즉시 보고했다. 추가서버조작 없이 현재64188을 고정한다. 격리 구현 단계에서는 운영 서버/사용자 세션에 접근하지 않았다. 후속 릴리스는 승인된 health/설정 whitelist/Store opaqueSHA 및 명시적 합성1건만 사용했다.

재현은 `tools/prepare.py`(새 사본·exact13파일 적용)→`generate-profiles.py`→동결 patch/manifest 대조가 기준이다. 초기 연결 스크립트 connect*.py는 구현 이력이며 재실행하면 안 된다. 통합 patch는 source-manifest의 **beforeSHA가 전부 일치하는 별도 새 사본**에 한 번 적용한다. `tools/verify.mjs`는 그 격리사본 전체검사·타입·dist빌드만 한다. `tools/replay.mts`는 승인 고정실험의 raw응답만 읽으며 이미지/설정파일/모델에는 접근하지 않는다.

격리 인계 뒤 Astra 독립통합검토·Sol1 화면검수와 감독의 같은 앱 적용 승인을 받아 릴리스를 수행했다. 제품 소스는 최종 digest로 동결하고 소유권을 감독에게 반환한다. 모든120게임의 실사진 정확도·전용 지형 복각·규칙 전수 검증을 완료했다고 주장하지 않는다.


최종 후속 교정: 카탄 안내의 내부 좌표용어를 UI 전용 한국어로 분리했고(profile/기계prompt/허용범위 불변), 다른 부분으로 다시 읽은 저장후보 accept API의 최초upload-target 재강제를 제거했다. fresh 응답과 서버 완료 시의 요청범위 검사는 유지한다. 정확 UI3파일 diff와 accept2파일 hash, RED400→GREEN200 및 릴리스591개 로그는 [release](release/README.md)에 있다. 최종 patch SHA256 `fb98a47d11a3c9c3e2edc3b96a293557f9a74159dca4ec3e2afaeb379893eace`.

64188 정적UI는 한국어 안내 dist와 일치하지만 실행중 backend는 accept 수정 전 module이다. 재기동/정적경로 추가쓰기 없이 유지했다. 최신 backend API 수정은 별도 합성 API/독립검토로 확인한 뒤 운영4319에도 적용했다. preview64188의 과거 로딩상태와 현재 운영은 구분하며, 최종 전환·배포·좁은 복원 절차는 [release](release/README.md)에 있다.
