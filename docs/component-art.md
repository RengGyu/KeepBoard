# KeepBoard 컴포넌트 아트

카탄의 지형·재료·목재 구성물을 구분하는 재사용 SVG입니다. 무광 목재의 옆면, 인쇄된 풍경, 두께 있는 종이 토큰을 같은 색·선 체계로 그립니다. 사진 원본과 관찰 crop은 계속 별도 근거입니다.

[전체 아트 시트](../public/component-art-preview.svg)는 실제 `ComponentArt`를 React 서버 렌더링한 **75개 인스턴스**입니다. 앱 서버의 `/component-art-preview.svg`에서도 볼 수 있습니다. 모든 종류·변형, 네 가지 소유 색, 32px 실루엣, 40px 숫자, 48px 자원 카드를 포함합니다.

## 사용 계약

```tsx
import { ComponentArt, type ComponentArtProps } from './ComponentArt';

<ComponentArt kind="terrain" variant="forest" size={96} />
<ComponentArt kind="terrain" variant="fields" number={8} size={96} />
<ComponentArt kind="number-token" number={6} size={48} />
<ComponentArt kind="settlement" color="#5687a0" label="파랑 플레이어 마을" />
<ComponentArt kind="resource-card" variant="grain" size={80} />
<ComponentArt kind="development-card" variant="knight" size={80} />
<ComponentArt kind="deck" variant="development" number={9} />
```

기존 named export와 props를 유지합니다. `ComponentArt.tsx`에서 전용 CSS를 가져옵니다. 새 의존성·외부 이미지·네트워크 요청은 없습니다.

```ts
export interface ComponentArtProps {
  kind: string;
  variant?: string;
  color?: string;
  label?: string;
  number?: number | null;
  size?: number;
  className?: string;
}
```

| 속성 | 동작 |
| --- | --- |
| `kind` | 아래 13종. 알 수 없는 종류는 `unknown`을 표시합니다. |
| `variant` | 지형·자원·개발 카드의 종류. 아래 문자열을 유지합니다. |
| `color` | 소유자 색/주색 교체. 목재 조각·도둑·표식·덱·용기의 주색, 지형 바탕, 카드 상단 띠에 적용합니다. 음영은 투명 색면이므로 밝은 플레이어 색에서도 형태를 유지합니다. 재료 기호는 고유색을 유지합니다. |
| `label` | SVG의 `aria-label`과 `<title>`. 생략하면 종류·변형·숫자로 접근성 이름을 만듭니다. 화면 내 별도 문구는 아닙니다. |
| `number` | 유한한 숫자를 `<text>`로 표시. 숫자 토큰 중앙, 지형의 작은 조립 토큰, 표식 중앙, 항구의 교역 비율, 덱/용기의 수량 배지에 사용합니다. 다른 종류에서는 사용하지 않습니다. |
| `size` | 가로·세로 CSS 픽셀. 기본 `64`. 내부 좌표는 `0 0 120 120`. |
| `className` | 추가 클래스. 회전·선택·드래그는 상위 편집기의 책임입니다. |

## 종류와 변형

| `kind` | `variant` | 그림 |
| --- | --- | --- |
| `terrain` | `forest`, `pasture`, `hills`, `fields`, `mountains`, `desert` | 두께 있는 육각 타일. 침엽수 숲길, 초원과 양, 점토 언덕과 벽돌, 이랑과 밀, 눈 덮인 산, 모래 언덕과 선인장. 기본 `forest`. |
| `number-token` | 없음 | 밝은 종이색 앞면과 얇은 옆면. 2–12 중 7을 제외한 숫자는 빈도 점, 6·8은 짙은 적갈색. 미상은 대시. |
| `road` | 없음 | 직선 목재 막대의 윗면·앞면·끝면. 가는 나뭇결. |
| `settlement` | 없음 | 한 채의 박공지붕 목재 조각. 창·문을 데이터처럼 추가하지 않고 면과 실루엣으로 구분. |
| `city` | 없음 | 낮은 몸체와 높은 건물의 계단형 실루엣. 마을보다 넓고 높은 목재 조각. |
| `robber` | 없음 | 머리·목·벌어진 밑동·받침이 있는 어두운 말. 표정 없는 회녹색 기본색. |
| `resource-card` | `lumber`, `brick`, `wool`, `grain`, `ore` | 이중 프레임 카드 안에 통나무, 쌓은 벽돌, 양털 실뭉치, 묶은 밀, 광석 조각. 기본 `lumber`. |
| `development-card` | `knight`, `road-building`, `year-of-plenty`, `monopoly`, `victory-point`, `unknown` | 투구와 검, 두 목재 도로, 풍요의 뿔, 자원을 모으는 주머니, 왕관을 얹은 건물, 미확인 표식. 기본 `unknown`. |
| `harbor` | `generic`, `lumber`, `brick`, `wool`, `grain`, `ore` | 바다색 테두리의 항구 표식. `number`에 알려진 비율 2/3을 전달합니다. 미상 비율은 ?:1이며 자원 종류도 추정하지 않습니다. 해안 접점·배치는 상위 장면이 담당합니다. |
| `token` | 없음 | 두께 있는 금빛 원형 표식. 숫자가 없으면 중앙 육각 기호. |
| `deck` | 생략 또는 `resource`, `development` | 세 장의 카드와 종이 옆면. 자원은 밀, 개발은 기사 기호. 수량 배지 지원. |
| `container` | 없음 | 경첩선·잠금쇠·빈 종이 라벨이 있는 목재 상자. 수량 배지 지원. |
| `unknown` | 없음 | 중립 종이색 점선 육각과 물음표. |

지원하지 않는 지형 변형은 사막, 카드 변형은 물음표로 대체합니다. `data-art-kind`와 `data-art-variant` 속성을 유지합니다. 숫자는 이미지에 굽지 않아 값·해상도·색을 독립적으로 조립할 수 있습니다.

## 색과 재료

| CSS 변수 | 기본값 | 용도 |
| --- | --- | --- |
| `--art-ink` | `#33483c` | 숲빛 윤곽·숫자 |
| `--art-cream` | `#fff9e9` | 종이·양털·빛면 |
| `--art-paper` | `#eee1c5` | 미확인 형태 |
| `--art-coral` | `#bc6048` | 기본 소유 색 |
| `--art-red-number` | `#a84632` | 6·8 숫자와 빈도 점 |
| `--art-forest` | `#7e9b68` | 숲 |
| `--art-pasture` | `#b7c882` | 목초지 |
| `--art-clay` | `#c88964` | 점토 |
| `--art-field` | `#e0c276` | 농경지 |
| `--art-grain` | `#d5ac54` | 곡물·금빛 표식 |
| `--art-stone` | `#9ba9a0` | 산·광석 |
| `--art-sand` | `#e0c89a` | 사막 |
| `--art-deck` | `#536e53` | 개발 카드 띠 |

120 단위 좌표에서 외곽선은 주로 1.5–1.7, 카드 라운드는 4–5입니다. 육각·집·도로의 각진 형태를 유지하며 접점만 조금 부드럽게 처리합니다. 깊이는 옆면과 작은 명도 차이로 표현합니다. 그라데이션·blur filter·래스터 질감·애니메이션은 없습니다. 여러 SVG를 함께 렌더링해도 충돌할 공통 ID/defs를 사용하지 않습니다.

색 변수는 `.component-art`에 정의됩니다. 테마는 더 구체적인 선택자 또는 뒤에 선언한 추가 클래스로 덮어쓸 수 있습니다. 소유 색은 기존 `color` prop을 사용합니다. 숫자는 Georgia → Times New Roman → serif로 대체되며 외부 폰트 로딩 없이 표시됩니다.

## 작은 크기와 범위

- **24–32px:** 도로·마을·도시의 외곽 식별용. 카드 세부와 나뭇결 판독에는 부족합니다.
- **40–64px:** 숫자·말·자원 카드 팔레트. 작은 10·11·12도 텍스트로 유지됩니다.
- **80–138px:** 지형 풍경·카드 기능·선택 상세. 미리보기 주요 견본은 138px입니다.
- 그림의 크기·회전·정보 배치와 실제 장면 렌더링은 기존 편집기가 담당합니다. 이번 작업은 공유 배치·규칙·데이터 계약을 바꾸지 않습니다.

모든 SVG path와 조합을 직접 작성했습니다. 다운로드하거나 생성한 외부 그림, 원작 카드 스캔, 로고·사진을 포함하지 않습니다.

검증: 75개 실제 SSR 인스턴스와 전체 종류/변형을 렌더링했고, Chrome 아트 시트에서 형태·잘림·밝은 소유 색·작은 크기를 시각 확인했습니다. 앱 전체 재디자인과 모바일 편집기 통합 검증은 감독이 담당합니다.
