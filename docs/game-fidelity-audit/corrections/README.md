# F001–F020 교정 인계

**VERIFIED (범위 한정): 승인된 20건/18게임의 대표형·유형색·소유색 교정 및 SVG/매핑 재생성을 완료했다. 제품 수정 동결·파일 소유권 반환.** 테마 전용 배포에는 포함하지 않았다. 사용자 기록이나 운영 프로세스에 접근하지 않았다.

- [20건 before/after 및 공식 근거](results.json): 원 감사의 선택 판본·URL·페이지를 유지하고 정확한 component 경로와 새 변형/색 정책을 기록했다. [원 교정 계획](../review/correction-plan.md)과 감사 원장은 변경하지 않았다.
- [검증 결과](verification.json), [집중 회귀 TAP](focused-tests.tap): 18/18, exit 0. 고정 유형색은 입력 소유색과 독립, owner 변형은 소유색 적용, 미확인 이름/앞뒷면은 임의 추정하지 않는다. Sagrada 5색×6눈, Tokyo 검정 base·초록 extra 각각 6면을 생성했다. owner SVG 자체가 색 변형을 지원하는지도 검사했다.
- 원본 ID·순서·수량·null/0·placement·구판 팩 값은 이행하지 않는다. 과거 변형명 52개는 미확인으로 남기고, 명확한 Agricola 울타리/외양간 이름만 유지했다. 기존 모호한 이름이 새 유형으로 자동 승격되지 않는다.
- 감사 대상 비교정 **414분류 매핑 전체 동등**, 기존 개별 SVG **357파일 해시 불변**. 새 생성 도중 건물 공통 ID 선점이 비대상 참조를 바꾸는 부작용을 발견해 수정했고, 최종 위 두 검사를 통과했다. 120개 원명세 중 **Agricola description 1곳만** 바뀌었다. 원 baseline과 원 findings 해시는 불변이다.

## F001의 좁은 원명세 예외

[정확 old/new 및 SHA](F001-source-correction.json). `/components/1/description`의 가족 원반→사람형 말 문구만 변경했다. components 전체 deep equality는 유지하면서 이 정확한 old/new 한 값만 허용한다. 다른 설명·ID·수량·배열 순서 변경은 거절하는 회귀를 포함했다. 이전 variant ID `가족 원반`은 호환을 위해 남았으며 그림은 미확인이다.

Agricola 현재 생성 팩 버전은 `1.0.0-essentials-2.02ad9e2fba26` → `1.0.0-essentials-2.a0327f380960`. 이전 팩 사본은 [agricola-pack-before.json](agricola-pack-before.json)에 보존했다. 실제 세션의 pinned pack은 교체하지 않았다. freeze/source SHA/manifest 및 생성 팩을 새 원문 해시에 맞췄다.

## 생성·검사

다음 명령은 모두 exit 0. 전체 suite/build는 통합 담당 범위라 실행하지 않았다.

```sh
python3 docs/game-art/build.py --limit 120
python3 docs/game-art/finalize.py --skip-raster --zip
python3 tools/game-board-visuals/generate.py
python3 docs/game-fidelity-audit/corrections/verify.py
python3 docs/game-art/validate.py
node_modules/.bin/tsx --test tests/game-fidelity-corrections.test.ts tests/art-integration.test.ts tests/game-essentials-data.test.ts tests/game-essentials-runtime-final.test.ts
node_modules/.bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --jsx react-jsx --esModuleInterop --resolveJsonModule --skipLibCheck --allowImportingTsExtensions src/artResolver.ts src/GameComponentArt.tsx tests/game-fidelity-corrections.test.ts
```

패키징 후 board coverage를 생성해야 `originalAssetHashes`에 최종 ZIP/atlas 해시가 반영된다. `verify.py`는 아트 재생성 동일성 및 boards `--check`를 검사한다. 최종 XML 490파일, 중복 ID/중복 새 SVG body/끊긴 참조 0. 120게임·437분류, 미확인 source 26 + 의도적 unknown 1 유지. `public/game-art/keepboard-game-art-120.zip`은 656파일(최종 용량은 docs/game-art/package.json 참조)(원본 참조 자산은 복제하지 않음).

## 시각 근거와 제한

[대표 PNG](screenshots/contact.png)와 [SVG](screenshots/contact.svg)는 **실제 GameComponentArt를 사용한 합성 원화 비교표**이며 앱 전체 화면이나 실물 인식 결과가 아니다. CUA에서 가족 원반→사람형, 고정 유형색/owner 분리, Sagrada 30칸을 직접 보았다. 브라우저 연결이 끊겨 Tokyo extra-green 전체 격자의 최종 시각 확인은 못 했다(12조합 데이터/XML/회귀만 확인).

**중요:** 대표 PNG/SVG는 최종 건물 owner 수정 전 캡처다. F018/F020의 owner 건물 칸은 최종 결과 증거로 쓰지 않는다. 해당 두 최종 SVG는 owner CSS를 포함하고 회귀를 통과했지만 실제 브라우저 재렌더 시각 확인은 통합 단계에 남겼다. 추가 브라우저 탐색·캡처 인프라 확장은 하지 않았다.

전체 갤러리·atlas·6개 checkpoint SVG는 현재 산출물이다. 기존 public checkpoint PNG와 overview는 과거 자료를 보존했으며 최신 교정 증거가 아니다(`package.json.raster_status`에 명시). 정확한 상업 인쇄 색조/전체 앞면/실물 수량/인식 정확도를 보장하지 않는다. 감사의 44 scoped/64 partial/11 held 미확정 내용을 추가 확정하지 않았다.

## 변경 파일과 반환 범위

[변경 목록](changed-files.json). 핵심은 `src/artResolver.ts`(variant별 role/owner/unresolved/back), `docs/game-art/{build.py,fidelity.py,fidelity_shapes.py,fidelity-corrections.json,finalize.py}`, public 아트·갤러리·매핑·ZIP, F001 명세/freeze/manifest/생성 팩, boards pending/coverage/mapping, `tools/game-specs/essentials-check.ts`, 관련 회귀와 이 인계 폴더다. `GameComponentArt.tsx` 및 Sol1의 방 기능 파일은 수정하지 않았다. 본인 keyless 프리뷰 서버는 종료했다. 공유 dist/build/운영 변경 없음.
