# 미확인 구성물 81분류 공식 자료 재확인

2026-10-21. **81 → 확정 55 / 부분확정 16 / 공개근거부족 10.** 55분류의 원명세와 대표형 아트를 실제 갱신했다. 120게임 ID·437분류 ID와 81분류의 `quantity:null`은 유지했다. 카탄의 의도적 `unknown` 1개도 그대로다. 현재 갤러리의 미확인은 26+1=27개다.

- [81개 전수 결과표](RESULTS.md), [기계 판독 결과](results.json), [CSV](results.csv)
- [남은 26개의 정확한 필요 자료](remaining-materials.md)
- [공식 근거 manifest](source-manifest.json): 원 URL·문서 제목·판본·확인 위치·접근일·로컬 경로/해시·권리 제한
- [baseline](baseline.json), [이전 120개 원명세 해시](source-hashes-before.json), [일관성 검증](verification.json)
- [최종 검증](final-validation.json): 통합 4/4, 120명세 구조 검사, PNG 크기/해시, ZIP CRC·현재 파일 일치
- [아트 갤러리](../../public/game-art/index.html), [아틀라스](../../public/game-art/atlas.html), [검증/사용 방법](../game-art/README.md)

**VERIFIED:** 선택 판본의 공식 본문/구성물 도해 또는 공식 제품 본문이 뒷받침하는 대표 종류만 확정했다. `results.json`의 각 행에 사실과 근거 위치를 남겼다. 도형은 기존 스타일로 단순화한 새 벡터이며 원화나 정확한 인쇄 지도 복제물이 아니다. 예: 이클립스 2판은 영향력 원반·인구 큐브·양면 식민선 타일을 구별하고, SETI는 같은 탐사선 피겨의 위치에 따라 역할이 달라짐을 반영했다. Gloomhaven은 2025년 2판, Arkham LCG는 AHC100 2026 규칙을 확인해 구판으로 대체하지 않았다.

**UNCLEAR:** 부분확정은 공식 제품 설명에서 일부 명칭/형태만 확인한 경우다. 공개근거부족은 선택 판본의 구분·도해·상태 의미까지 뒷받침할 본문을 얻지 못한 경우다. 검색 요약이나 제3자 설명으로 confidence를 올리지 않았다. 같은 물체의 총 인쇄 수량과 현재 장면 수량도 합치지 않았다. 모든 상업 카드 앞면·인쇄 변종·세부 규칙, 제품의 실제 120게임 기능 지원, 실물 인식 정확도는 확인하지 않았다.

다운로드는 공개 공식 자료의 연구용 로컬 사본이다. 공개 접근은 재배포 허가가 아니다. 원 규칙·사진의 저작권은 출판사에 있으며 `sources/`의 PDF·HTML·텍스트·확인 페이지 PNG는 아트 ZIP에 넣지 않는다. 실패·403·이동된 링크는 `download*-results.json`에 남겼으며 인증서 오류나 로그인 제한을 우회하지 않았다. 공식 페이지의 다운로드가 열리지 않아 웹 도구에서 본문만 열람한 자료는 `local_path:null`이다.

`decisions.py`가 근거를 담은 편집 원본이고 `apply.py`는 baseline 81 중 확정 항목만 반영한다. 미확정 원명세는 baseline과 동일하게 남긴다. 29개 게임의 해당 구성물과 연결된 source record/index/coverage만 변경하며 기존 ID를 삭제하지 않는다.

```sh
python3 docs/art-confirmation/decisions.py
python3 docs/art-confirmation/apply.py
python3 docs/game-art/build.py --limit 120
python3 docs/art-confirmation/verify.py
python3 docs/game-art/validate.py
node --import tsx --test tests/art-integration.test.ts
```

`apply.py` 뒤에는 매핑을 다시 생성해야 원명세 해시가 맞는다. 전체 연구 명세를 재작성하는 별도 authoring 도구를 실행했다면 이 확인 패치를 다시 적용해야 한다. 그림 변경 시 20종씩 6개 SVG/PNG와 overview를 함께 갱신하는 절차는 아트 README를 따른다. 원명세 구조 검증과 XML·참조·브라우저 도형 영역 검사는 사실 해석 및 실물 식별 품질 검증과 별개다.

## Outer Rim 공식 링크 재점검

2026-10-21 최종 재점검에서 `Learn to Play v2` URL은 웹 도구가 `not accessible`로 응답했다. 앞선 열람 기록은 `results.json`의 `outer-rim-web`(pp.2–4/2–5)이며 원문 사본은 보존하지 못했다. 이 과거 기록을 현재 재접근 성공으로 표시하지 않는다. 링크의 삭제·허위·문서 내용 오류가 확인됐다는 뜻도 아니다.

대신 **공식 기본판 [Rules Reference](https://images-cdn.fantasyflightgames.com/filer_public/01/91/01919a54-ddc4-44e6-a721-068dfb73bca0/sw06_rules_reference-compressed.pdf)**를 웹에서 다시 열고, 이미 확보한 [동일 PDF](sources/outer-rim-reference.pdf)와 대조했다. SHA-256은 `b73e388691b5f1378b8468852918141cbfad06e9ba6c656a4ef01f93e19eb23f`다. 아래는 문서에 인쇄된 쪽 번호이며 웹 PDF 인덱스는 0부터 시작한다.

| 확정 분류 | 독립적으로 재확인한 근거 |
|---|---|
| `map` | p.2 Adjacency: 타일 인접·항로·끝 캡 순찰 더미. p.5 Contact Tokens: 공개/비공개 및 색·점 개수 class. p.10 Map: 구역 타일과 끝 캡. p.16 Setup/Random Map Setup: 6개 구역의 연결·양 끝 캡·순찰·접촉 배치. |
| `markers` | p.5 Credits: 화폐 토큰. p.6 Damage: 피해 토큰을 인물 카드/함선 시트에 따로 배치. p.9 Fame: 개인판 트랙의 명성 표식 이동. p.13 Reputation: 4세력별 긍정/중립/부정. p.16 Setup 4–5: 피해·크레딧 공급, 플라스틱 명성 표식과 세력별 평판 토큰. |

따라서 두 분류의 **대표형 정체와 기록된 상태 의미**는 접근 가능한 공식 보조 규칙만으로도 뒷받침된다. `markers.support_sources`에 이미 이 PDF가 기록되어 있고, 여기서 `map`의 추가 대조 위치도 명시한다. 지도 SVG는 연결 가능한 구역/끝 캡의 예시이며 실제 인쇄 지도를 복제하지 않는다. 명성 슬라이더도 플라스틱 표식의 단순화한 표현으로 정확한 규격이나 모든 인쇄 변종을 주장하지 않는다. 확정 수와 명세·매핑·도형은 이 접근 재점검으로 바꾸지 않았다.
