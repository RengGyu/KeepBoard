# KeepBoard 120종 구성물 아트

기존 카탄·카르카손의 크림색, 숲색 윤곽, 목재 옆면과 결을 이어 만든 **편집 가능한 구성물 대표형 라이브러리**다. 제품에서 사용하는 매핑/로더 계약을 유지한다. 이번 확인 작업은 제품 소스나 실물 인식 모델을 변경하지 않았다.

- [120종 검색 갤러리](../../public/game-art/index.html) — 자체 포함 HTML, 인터넷 없이 열 수 있다.
- [406개 에셋 64px 아틀라스](../../public/game-art/atlas.html)
- [전체 120종 대표 PNG](../../public/game-art/overview.png) — 2880×4680px
- [전체 아트 ZIP](../../public/game-art/keepboard-game-art-120.zip)
- [게임별 범위 인덱스](INDEX.md), [검증 결과](validation.json), [브라우저 관찰](browser-validation.json), [패키지 크기](package.json)

## 제작 범위

120개 게임 ID와 437개 `component_id`를 원본 명세 해시와 함께 매핑했다. 신규 개별 SVG는 **351개: 공통 215개, 전용 136개**다. 기존 카탄·카르카손 에셋 55개는 원본 참조이며 새 개별 SVG 사본을 만들지 않았다.

| 구성물 분류 상태 | 수 |
|---|---:|
| 공통 재사용 | 291 |
| 전용 그림 | 66 |
| 공통·전용 합성 | 38 |
| 기존 그림 참조 | 15 |
| 미확인 표현과 gap 유지 | 27 |
| 알려진 분류 중 대표형 미제작 | 0 |

[81분류 공식 근거 재조사](../art-confirmation/README.md)에서 확정 55개를 실제 갱신했다. 부분확정 16개·공개근거부족 10개는 `confidence=unclear`를 유지했다. 현재 미확인 27개는 이 26개와 카탄의 명시적 unknown 1개다. 공통 물음표 그림으로 표시하고 세부 형태를 확정하지 않았다. 명세에 포함된 알려진 **분류의 대표형**을 그렸다는 뜻이며, 모든 상업 카드 앞면·인쇄 변종·실물 수량을 완성했다는 뜻은 아니다. 각 매핑의 `preset_inventory_limit`에 이 제한을 남겼다.

카드에는 자원·동물·공간·인물·행동 등 의미 도형을 합성했다. 분할 서식지, 회전 원판, 육각/삼각 우주 구역, 댐과 건설 바퀴, 방향 연결 트럭, 복층 지형 등은 전용 벡터를 사용한다. 공통 큐브·말·토큰·카드틀·주사위·자원 도형은 같은 asset ID를 참조한다. 배치 예시는 실제 지도·합법 배치가 아니며 고정맵 없는 게임에 카탄 보드를 적용하지 않는다.

## 사용과 수정

`public/game-art/games/{game_id}/mapping.json`의 `components[].variants[].layers[]`에서 `asset_id`를 찾고, `assets.json`에서 실제 파일을 찾는다. `transform`은 선택적 합성 위치·크기이고 회전 중심은 `(60,60)`이다. 신규 파일은 공통 `viewBox="0 0 120 120"`을 사용한다.

- 소유색은 지원 표시가 있는 그림의 CSS `--owner`로 적용한다. `color_role`과 변형의 `color`가 유형색인 경우 소유색과 혼동하지 않는다. 다섯 부족의 다섯 색은 부족 종류다.
- `hidden_layers`는 알려진 카드의 뒷면 표현이다. 미확인 카드는 그대로 unknown을 쓴다. 덱 순서·공개 여부·실제 소유권은 장면 데이터가 담당한다.
- 수량은 실측 데이터로 별도 표시한다. `null`은 `?`, 실제 0은 `0`이며 카드 층이나 장식 수는 수량이 아니다.
- `area_preview.layers`는 공통 공간 프레임과 기존 구성물의 참조 합성이다. 실제 좌표·방향·연결·칸 수를 이 예시 그림에서 추론하지 않는다.
- Catan/Carcassonne adapter는 기존 작업공간 소스를 가리킨다. 갤러리·아틀라스의 미리보기는 포함되지만 ZIP에 기존 원본 소스나 연구 명세를 복사하지 않는다.

[스타일 계약](style-contract.md)과 [기계 판독 값](style-contract.json)을 유지한다. 게임별 선택은 `directions.json`, 확인된 55분류의 선택은 `confirmed-components.json`, 실제 도형은 `draw.py`·`specials.py`·`confirmed_shapes.py`, 표시 문구는 `labels.json`에서 수정한다. 결과 SVG만 직접 수정하면 재생성 시 덮어쓴다.

```sh
python3 docs/art-confirmation/decisions.py
python3 docs/art-confirmation/apply.py
python3 docs/game-art/build.py --limit 120
python3 docs/game-art/validate.py
python3 docs/game-art/finalize.py --zip
```

빌더와 검증기는 Python 표준 라이브러리를 사용하고, PNG 연락시트 조합은 기존 Pillow를 사용한다. PNG는 Chrome에서 실제 SVG를 canvas로 렌더했다. 도형 변경 시 `capture.py`의 임시 로컬 미리보기에서 해당 체크포인트의 `render.html?checkpoint=120&save=1`을 열고 ‘PNG 렌더’를 실행한 뒤 `finalize.py`로 연락시트와 ZIP을 갱신한다. 생성기는 제품 서버를 시작하거나 중단하지 않는다.

## 체크포인트와 검증 한계

[020](../../public/game-art/checkpoints/020-representative.png) · [040](../../public/game-art/checkpoints/040-representative.png) · [060](../../public/game-art/checkpoints/060-representative.png) · [080](../../public/game-art/checkpoints/080-representative.png) · [100](../../public/game-art/checkpoints/100-representative.png) · [120](../../public/game-art/checkpoints/120-representative.png): 각각 다음 20종을 보여주는 1440×1560px PNG다. 같은 번호의 SVG와 범위 JSON을 함께 저장했다.

**VERIFIED:** 120 ID/437분류 대응, 현재 원명세 해시 일치·수량 유지, 신규 중복 도형 없음, XML/ID/clip/use 참조 검사, 406개 실제 64px 렌더, 390/1440px 화면과 24/32/48/64px 크기·색 변경·검색·확대 동작을 확인했다. SVG 기준 영역 밖 도형은 없었다. 수평선인 담보 오버레이 1개는 기하학적 높이가 0인 stroke이므로 별도 기록했다. 이를 미표시로 판정하지 않았다.

**UNCLEAR:** 실물 사진과의 대응 정확도, 모든 세부 종류의 식별성, 전체 게임 지원은 검증하지 않았다. 24px는 단순 실루엣용이며 카드·지형의 의미 도형은 48px 이상, 복잡한 공간은 64px 이상을 권장한다. 신규 벡터는 원화 크롤링이나 유료 생성 없이 코드로 그렸다. 명칭과 게임 참조는 원 게임의 권리와 별개이며 재배포 허가를 새로 부여하지 않는다.
