# 구성물 아트 제품 연결

게임 메뉴의 **기록할 게임**은 실행 가능한 게임팩만, **구성물 보기 · 120종**은 그림 라이브러리를 표시한다. 검색 → 게임 → 분류 → 변형 선택을 앱 안에서 사용할 수 있다. 소유색 지원 그림은 색 선택, 뒷면이 정의된 구성물은 앞·뒷면 전환을 제공한다. 라이브러리 추가가 120종 게임 기록·규칙 지원을 뜻하지는 않는다.

## 연결

- `src/artCatalog.json`: 원본 mapping에서 추출한 ID·한국어/영어 이름만 담은 검색 목록. 구성물 명세는 복제하지 않는다.
- `src/artResolver.ts`: 실행팩 별칭(`catan-base` → `catan`), 정확한 구성물/변형 선택, 소유색과 종류색, 뒷면/미확인 및 레이어 선택.
- `src/artLoader.ts`: 선택한 게임 mapping, 자산 인덱스, 필요한 SVG만 요청해 캐시한다. 실패 요청은 캐시에서 제거한다. 전체 갤러리 HTML·ZIP·overview 이미지·전체 games.json은 로드하지 않는다.
- `src/GameComponentArt.tsx`: 기존 카탄·카르카손 React 어댑터 또는 SVG 레이어/transform 합성. SVG 내부 ID를 인스턴스별로 분리한다.
- `src/ArtLibrary.tsx`, `src/art-library.css`, `src/Dialogs.tsx`: 실제 게임 메뉴의 검색·그림 선택·색/뒷면 조작.
- `src/SceneEditor.tsx`: 보드·추가 팔레트·선택 도구·부품 목록·드래그 미리보기가 같은 렌더러 사용.
- `src/Fields.tsx`, `src/CatanOverview.tsx`: 개인 수량 입력의 그림도 게임 ID를 전달해 같은 렌더러 사용.

새 호출부는 `GameComponentArt`에 `game`, `componentId`, `kind`, 선택적 `variant`, `color`, `face`, `size`를 전달한다. `componentId`는 선택한 게임 mapping의 정확한 ID이며 내부 호출 계약이다. 사용자 화면에는 이름만 표시한다. `face`는 `front | back | unknown`을 지원한다.

카탄 편집의 기존 호출은 동기식 기존 어댑터를 사용해 숫자·항구 비율·소유색·기하를 유지한다. 여러 변형이 있는데 변형을 모르면 첫 그림으로 추정하지 않는다. 모르는 정체, 미확인 명세, 정의되지 않은 뒷면은 물음표로 표시한다. 수량 `null`과 `0`을 그림 개수로 변환하거나 저장 사실을 수정하지 않는다.

## 검증 (2026-10-21)

- `node --import tsx --test tests/art-integration.test.ts`: 4개 통과, exit 0.
- `npm test`: 전체 176개 통과, exit 0.
- `npm run typecheck`, `npm run build`: 각각 exit 0.
- 원본과 대조: 120개 게임, 437개 분류, 1,006개 변형, 미확인 82개, 자산 342개. 모든 참조 경로 존재. 새 SVG의 안전한 fragment 처리, 기존 어댑터, 레이어/transform, 소유색과 유형색 분리, 뒷면, 미확인, SVG ID 분리를 회귀 검사한다.
- CUA 실제 앱: 아줄 전용 그림, 오딘의 복합 레이어·소유색·카드 뒷면, 에이언즈 엔드 미확인, 카르카손 기존 어댑터 확인. 390×844 및 1440×1000에서 확인한 화면의 가로 넘침 0·깨진 이미지 0.
- 합성 카탄에서 마을 소유색 변경 → 저장 → 새로고침 후 유지, 파란 도로 추가 → 저장 → 새로고침 후 묶음 수량 2→3 유지. 기존 18개 숫자 표시와 그룹 목록 유지.

브라우저 이미지는 [카르카손 모바일](library-390.jpg), [데스크톱](library-1440.jpg), [카탄 모바일](catan-390.jpg), [복합 레이어](mixed-1440.jpg), [미확인](unknown-390.jpg)에 있다.

합성 전용 실행: `node --import tsx tests/fixtures/art-integration-preview.ts` (loopback 4381, 임시 Store). 현재 확인 주소는 http://127.0.0.1:4381/?session=cc85ed07-1bbf-4605-9a07-87303a15c7b1 이다. 기존 서버를 재시작하거나 실제 사용자 데이터를 사용하지 않았다.

## 경계

120종의 규칙·편집 기하·실행팩을 새로 구현하지 않았다. 일반 장면 저장 계약에 임의의 게임별 component ID를 추가하지 않았다. 렌더러는 정확한 component ID를 받을 수 있지만, 기존 장면의 모호한 종류를 임의 ID에 연결하지 않는다. 새 게임 실행팩에서 이 API를 연결하는 작업은 별도다. 그림 대표형은 실물의 모든 인쇄 내용을 보증하지 않는다. 실카메라·AI 인식 정확도·원격 배포는 이번 검증 범위 밖이다.
