# 120게임 그림·보드 감사 — baseline 동결 인계

**VERIFIED:** 120게임·437분류·1,300등록변형의 현 React 출력과 게임별 sheet/metrics를 확보했다. 등록asset532 및 raw SVG511/PNG7 decode 실패0, 변형 blank/load 오류0. **게임 적합성 전수 확인이나 실사진 정확도를 뜻하지 않는다.**

[전게임 인덱스](index.html) · [JSON](games.json) · [CSV](games.csv) · [요약](summary.json) · [6장 contact overview](contact-index.json) · [영역 원장](areas.json)

| 실제 확인 범위 | 결과/제한 |
|---|---|
| 등록변형 | 1,300 × red64/blue64+90°/red24/back32 = SVG출력5,200. 앞면64 red/blue raster 비교. 명시미확인79개 유지 |
| 기본분류/readout | 437분류, variant=null·quantity null/0. 117typed fixture 및 Splendor 별도 renderer |
| 보드 | generic 허용영역437 +native4 =441표본. 6중립판은 수동기록도이며 인쇄판 복각 아님 |
| 522영역 | generic437, hidden/not-needed82 제외, Catan owner-hand1, 배치보드 fixture 미완료1, fieldKeys없는 supply1 |
| 기계 레이아웃 | baseline desktop1920 pageOverflow0/boardScrollOverflow0/bbox120초과0. 모든 작은 기호 가독성 보장 아님 |
| 직접 눈검토 | 7게임 대표 sheet: Agricola/Carcassonne/Sagrada/Wingspan/King of Tokyo/Catan/Rummikub. 나머지113은 기계렌더만. [범위](human-visual-reviews.json) |
| CUA | Sagrada390에서 원형 주사위 결함/readout/null/0/overflow없음 확인. 이후1440 set/reload중timeout. after화면·viewport reset 미확인 |

게임별 variants SVG/PNG는 실제SVG 직렬화 출력이다. categories는 기본그림+readout텍스트, boards는 실제 childSVG와 DOM측정위치/텍스트의 **투영**이며 전체UI스크린샷이 아니다. overview6장은 출력의 축소목록이므로 의미판정은 게임별원본을 연다. raw/page들은 원본decode시트. public의 과거PNG7개는 새감사통과근거가 아니다.

표시결함2건은 [findings](findings.json), 공유제품에 미적용인 격리2파일은 [patch](fix/display-corrections.patch)에 있다. kind=die8분류와 Wingspan먹이기호주사위1변형만 교정. owner픽셀불변51개는 정상유형그림도 포함하므로 [관측목록](owner-invariant-observations.json)으로만 전달하고 일괄recolor하지 않았다.

**VERIFIED:** `node --import tsx --test docs/game-visuals-full-audit/fix/renderer.test.ts` exit0 **5/5**. 8die/기타기본그림, dicealias/token/원래값 유지, Wingspan exactoverride/기타1299변형 해석 유지, 행동큐브 소유색, Catan감사fixture bridge 검사. **pure React element/resolver 검사이며 after이미지 검사 아님.** [preimage/afterSHA](fix/manifest.json) · [검증](fix/verification.json).

**남은 actual화면:** after9게임(Castles Burgundy, Grand Austria Hotel, King of Tokyo, Machi Koro, Sagrada, Space Base, Stone Age, War of the Ring2, Wingspan), 고정먹이주사위/행동큐브/기존token, 390/desktop. Catan구형예시를 기존toComponentScene으로 바꾸도록 감사도구만 보완했고 pure검사 terrain19/edge road/vertex settlement 확인. 새배치화면은 없음. baseline빈19칸은 제품결함근거로 쓰지 않는다.

재현:

```sh
node --import tsx --test docs/game-visuals-full-audit/fix/renderer.test.ts
python3 docs/game-visuals-full-audit/tools/finalize.py
node docs/game-visuals-full-audit/tools/serve.mjs
```

work-paths.json의 snapshot에는 2수정 적용. preview의 **수정 경계 재검사** 버튼은 renders/fix/games에만 쓴다. **카탄 native 영역 추가**는 기존Catan baseline파일을 대체하므로 복사보존후 실행해야 한다. 새snapshot 필요시 prepare.py가 source를격리복사하고 이전시트입력 준비(키/env/Store없음). patch를 **그새snapshot에만** patch -p1로 적용. 기존baseline과다른source를 덮어쓰면 안 된다. 전수버튼 불필요재실행X.

inventory.py exit0, browserfullrun120/120, raw재검사 성공파일, finalize.py exit0 및 focused5/5가 근거. 초기snapshot Catan외부SVG35참조누락과 blue90도직렬화누락은 감사도구에서 보완했고 제품오류로 집계하지 않음. 최신종합본 renders/final-all-metrics.json; all-metrics.json은 보완전 이력.

공유source/art쓰기0·AI0·사용자자료접근0. [해시](hash-verification.json): baseline799경로/source878경로 동일. 격리제품2파일 외asset/pack/값이행0. 자기임시서버만종료하고소유권반환. Astra가 별도공식/실물근거로 semantic판단하며 합성시트만으로 규칙/인식정확도를 보증하지 않는다.
