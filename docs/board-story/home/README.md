# 홈: 사진에서 저장한 판까지

## 구현

기존 홈의 배치·타이포·테마·버튼을 유지하고, 이전 `/demo-board.svg` 자리만 실제 사진 → 편집용 그림 → 저장한 판의 짧은 이야기로 교체했다. 사진은 **생성한 연출 이미지**이며 실제 사용자 사진이나 인식 결과가 아니다. 화면에도 `연출 이미지`로 표시한다.

시각 방향: 기존 앱 표면 위에 매트한 실물 보드와 인쇄된 벡터 타일을 한 장면으로 연결한다. 콘텐츠는 사진·그림 정정·저장 순서를 보여주고 기존 예시 열기/새 보드가 행동을 담당한다. 모션은 세 묶음으로 제한한다: ① 사진의 perspective/회전이 펴지며 그림으로 전환 ② 지형·카드·마을·주사위가 하나의 부모 그룹으로 천천히 이동/회전 ③ 마지막 저장 표시. 모두 10초 한 번으로 끝나며 반복하지 않는다. `prefers-reduced-motion`이면 정적인 그림과 저장 표시를 사용한다. 편집 화면에는 모션을 추가하지 않는다.

표지는 Catan 섬·바다, Carcassonne 길·성, 모르는 게임의 중립 그림으로 구분한다. 기존 native 아트를 재사용한다. 실제 evidence URL이 있으면 기존 원본 미리보기를 그대로 표시하고 표지로 바꾸지 않는다. 라이브러리에는 대표 표지 띠를 제공하며, 120종 모두 실행 가능하다고 표현하지 않는다. 조용한 표면 질감과 경로 표시는 그림의 가장자리에만 둔다.

## 파일

- `src/App.tsx`: 홈 story 및 사진이 없는 저장 카드의 cover 연결만 변경. 저장·privacy 동작 불변.
- `src/HomeBoardStory.tsx`: 연출 사진, native Catan 그림, 주변 부품 네 개, 과정 캡션.
- `src/GameCover.tsx`: native Catan/Carcassonne/중립 표지. 실제 기록에 대한 추정 없음.
- `src/home-board-story.css`: 위 컴포넌트에 한정된 표면·3그룹 모션·정적 접근성.
- `src/ArtLibrary.tsx`: 선택한 게임에 대표 표지 연결.
- `public/brand/home/paused-table.jpg`: built-in imagegen으로 생성한 단일 사진, 1100×733 JPEG, 약314KB. 외부 상업 아트 다운로드 없음.

## 생성 기록

Built-in `image_gen.imagegen` 1회 사용. 생성 PNG는 작업공간의 JPEG로 형식/크기 변환 후 연결했다. 새 API 분석 호출이나 사용자 이미지 사용은 없다.

최종 프롬프트:

> Use case: photorealistic-natural. Asset: single website hero photo, no UI. Generate ONE overhead studio photograph of a paused physical hex-tile island board game on a quiet pale neutral felt tabletop, wood roads and tiny settlements in red, blue and ivory, natural forest green, ochre fields, terracotta hills and slate mountains tiles, blue sea surrounding the island, small number tokens without legible lettering, two ordinary ivory dice and a small stack of resource cards at the perimeter. Entire board visible, centered, perfectly top-down, composition fills a landscape image with breathing room at corners. Soft daylight, real matte cardboard grain, understated wooden pieces, clean but lived-in table. No people, hands, logos, brand names, watermarks, text labels, phone, app interface or split-screen. Clearly an illustrative staged board scene rather than a real user's game. Keep board geometry visually clear and main island centered so it can dissolve into a flat vector illustration.

## 확인과 남은 확인

**VERIFIED:** `npm run typecheck` exit 0 (최종 CSS 보완 뒤 재실행). 생성 사진 직접 열어 피사체/잘림/브랜드·인물 없음 확인. 코드에서 실제 evidence URL 우선 분기, 10초 1회·3개 모션 묶음, reduced-motion 정적 처리, 기존 홈 버튼 핸들러 보존 확인. 새 의존성 없음. 공유 빌드 출력은 요청대로 생성하지 않았다.

**UNCLEAR:** 이번 작업자의 CUA는 기존 Browser2 연결 실패 후 `browsers: []`, `apps: []`를 반환해 실제 렌더·상호작용·390/1440 overflow/broken-image 검사를 수행하지 못했다. viewport를 변경하지 않았으며 추가 브라우저 탐색도 중단했다. 스크린샷은 생성하지 않았다. 감독관이 합성 HMR 프리뷰 `http://127.0.0.1:4392`에서 통합 확인한다. 실제 AI 인식 품질이나 사진과 벡터의 정확한 상태 일치는 이 연출이 보증하지 않는다.
