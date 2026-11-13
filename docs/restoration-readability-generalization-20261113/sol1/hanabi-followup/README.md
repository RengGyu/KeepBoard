# Hanabi 관찰 후속 — 공통 compact 표시

**VERIFIED — 관련26/26, 범위 tsc exit0, 소스 재동결.**

- 실제 저장값은 이름 `"4"`와 숫자 `4`가 별도 필드에 있었다. compact에서 숫자와 표시문자열이 정확히 같은 텍스트 필드만 생략한다. 서로 다른 숫자 필드/카드 이름/값/상세 편집은 변경하지 않는다. 게임명 분기나 숫자 추측은 없다.
- RestorationSceneView의 GenericPieceArt에 정확한 assertion/piece의 `requestedFaceProperties`를 전달한다. 기존 receipt의 요청·적용성 판정을 그대로 사용한다. 요청됐지만 모르는 값만 `?`로 보이고, 묻지 않은 필드는 새로 미상으로 만들지 않는다.
- Hanabi 숫자중복/색만아는 카드의 요청된 숫자모름, 상세 양필드 유지, 실제 장면→helper→compact 미상 연결, 기존 die/structure/pan/focus/선택/원값 회귀를 확인했다.

명령:
```
node --import tsx --test tests/visible-piece-face.test.ts tests/restoration-scene-ui.test.ts tests/piece-readout-art.test.ts tests/structure-followup-ui.test.ts
./node_modules/.bin/tsc --noEmit -p docs/restoration-readability-generalization-20261113/sol1/tsconfig.json
```
[집중검사](focused-tests.log) · [범위 타입](typecheck.log) · [정확 delta](delta.patch) · [전후 SHA](freeze.json)

제품2파일 + 직접검사2파일만 후속 변경. 기존 최초 freeze/delta는 보존했다. geometry/backend/profile/raw/저장값 수정0, 유료 호출0, 전체 suite/build0. 실제 Chrome 최종 확인은 감독 담당이다.
