# 루미큐브 실물 사진 조사

**확보·직접 검수 4장:** Classic과 호환되는 일반 숫자 타일 사진 3장(정확한 인쇄판/SKU 미상), **Large Numbers Edition 보조 사진 1장**. Classic 기본 상자 판본을 확정한 사진 수는 0이다. AI 이미지·디지털 게임 화면·도식·상자만 있는 상품 이미지는 수집하지 않았다.

- [manifest.json](manifest.json): 원문·정확한 다운로드 URL·작성자·라이선스 근거·크기·해시·용도 한계
- [labels.json](labels.json): 사람이 직접 확인한 타일/그룹과 대략적인 원본 픽셀 영역, 불확실·제외 영역
- [verification.json](verification.json): 파일 디코딩·해시·라벨 범위 검사

| 사진 | 실제 확보 파일 / 용도 | 출처·이용 조건 |
|---|---|---|
| ryan-tiles · 1024×683 | [JPEG](author-images/ryan-tiles.jpg). 실제 테이블의 낱타일·조커와 얕은 초점/중첩. 파랑12·빨강4/1·주황2/3·조커만 확실한 예시로 기록. 전체 실전 묶음은 흐려 라벨 없음. | [ryan harvey 원문](https://www.flickr.com/photos/87933807@N00/2151702932), [Commons 라이선스 확인](https://commons.wikimedia.org/wiki/File:Rummikub_Tiles.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| brewbooks-table · 1024×768 | [JPEG](author-images/brewbooks-table.jpg). 색별 두 사본의 1–13 **전개 배열**과 조커 2개. 숫자 104개가 읽히지만 게임 진행 중 meld 사진은 아니다. 줄 8개에 별도 ID를 주고 중복 사본을 보존한다. | [brewbooks 원문](https://www.flickr.com/photos/93452909@N00/14681648425), [Commons 라이선스 확인](https://commons.wikimedia.org/wiki/File:Rummikub_-_Flickr_-_brewbooks.jpg), [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |
| ella-table · 1024×768 | [JPEG](author-images/ella-table.jpg). 그릇 속 겹침·회전·뒷면 타일. 주황8 두 개와 검정4 두 개 등 선택 타일만 기록. 그릇의 타일을 run/set으로 만들지 않는다. | [ella / ella novak 원문](https://www.flickr.com/photos/82547169@N00/3600358059), [Commons 라이선스 확인](https://commons.wikimedia.org/wiki/File:Rummikub_(3600358059).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |
| evening-table · 1024×768 | [JPEG](author-images/evening-table.jpg). **Rummikub Large Numbers Edition** 상자가 보이는 실전 테이블. 감독이 보조 자료로 포함 승인. 분리된 공용 그룹 15개를 읽었고 조커·다른 그룹의 동일 타일도 구별한다. Classic 런타임 정확도 성공 사례로 세지 않는다. | [Governor Tom Wolf 원문](https://www.flickr.com/photos/130921112@N07/51040251522), 제목에 Carol Babinsack 표기. [Commons 라이선스 확인](https://commons.wikimedia.org/wiki/File:Evening_Routine_-_Carol_Babinsack_-_Fulton_County_(51040251522).jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) |

원본 카메라 해상도를 확보했다고 주장하지 않는다. 실제 파일은 **작성자 공개 페이지가 `og:image`로 제공한 1024px JPEG**를 바꾸지 않고 내려받은 것이다. 크롭·회전·보정·AI 처리·앱 업로드는 하지 않았다. 별도 크롭이나 contact sheet는 만들지 않았다. 출처/라이선스 기록을 먼저 전달한다.

## 바로 쓸 수 있는 수동 정답의 범위

Large Numbers 보조 사진에서 빨강 `3–9`, `11–13`, `8–10`; 파랑 `1–3`, `3–6`, `9–13`, `7–조커–9–10`; 검정 `1–10`, `10–12` 등이 구분된다. `red8`, `blue9`, `black10`이 서로 다른 묶음에 두 사본으로 나타나는 예시를 따로 기록했다. 조커 얼굴이 보여도 현재 대체 색/숫자는 `null`이다. 타일 순서는 사진에서 왼쪽→오른쪽이며 규칙의 합법성·등록 이력·점수·현재 차례를 정답으로 만들지 않았다.

**색 차이:** 이 보조 판본의 초록은 실제 관측색 `green`으로 유지했다. 현재 Classic 런타임의 `red/blue/black/orange` 계약에 맞추려고 주황으로 바꾸지 않았다. 초록 타일의 `runtimeColor`는 `null`이고 미지원 색으로 표시했다. 따라서 판본/색 차이가 있는 보조 그룹 읽기 자료다.

**사생활/불확실:** 받침대는 별도 개인 영역이며 공개 테이블 타일로 합치지 않는다. 소유자와 가려진 타일 수·정체를 추정하지 않았다. Large Numbers 사진의 상자 표면에 인쇄된 타일 그림도 실제 테이블 타일에서 제외했다. ryan 사진의 배경은 흐려 숫자/묶음을 채우지 않았고 6/9처럼 회전에 민감한 일부 글리프는 미확인으로 남겼다. 모든 사진의 전체 타일 수를 규칙의 기본 재고로 완성하지 않았다.

## 접근·권리 기록

Commons 설명/라이선스 페이지는 열렸지만 원본 이미지 CDN은 HTTP429, 페이지가 제공한 미리보기 CDN은 HTTP403으로 실패했다. 같은 원본 반복 요청이나 인증/접근 제한 우회는 하지 않았다. Commons에 연결된 **독립적인 작성자 Flickr 원문과 공개 이미지 URL은 HTTP200**으로 접근돼 네 장을 확보했다. 실패 기록은 `download-attempt-urllib.json`, `download-results.json`, `preview-results.json`, 성공한 작성자 경로는 `author-results.json`에 있다. urllib의 로컬 인증서 문제는 기존 requests의 CA 검증을 사용해 처리했고 TLS 검증을 끄지 않았다.

다운로드 이미지는 테스트 연구 폴더에만 있으며 제품 아트로 넣지 않았다. CC 사진을 다른 곳에 공유할 때는 작성자·원문·라이선스를 함께 유지하고 크롭 등 변경을 표시해야 한다. BY-SA 두 사진의 파생물을 공유한다면 명시된 동일조건을 따른다. 이는 루미큐브 상표/타일 도안에 대한 별도 허가나 권리자 보증을 뜻하지 않는다.

미확보 링크 후보는 [JIP의 전체 테이블](https://commons.wikimedia.org/wiki/File:Rummikub_board_game.jpg)(CC BY-SA4.0), [JuneAugust의 실전 테이블](https://commons.wikimedia.org/wiki/File:Rummikub_-_2.JPG)(CC BY-SA3.0)이다. **두 사진은 내려받거나 직접 보지 못했으므로 타일 라벨이 없고 확보 수에도 넣지 않았다.** 공식 [Rummikub 사이트](https://rummikub.com/)도 확인했으나 저작권 보유 표기만으로 사진 재이용 허가를 추정하지 않았다.

재다운로드 없이 일관성 검사만 다시 실행하려면:

```sh
python3 docs/rummikub-photo-research/build_manifest.py
```

사진을 실제 인식기에 넣은 성능 결과는 없다. 제품·게임 명세·테스트 파일·서버·AI 설정은 변경하지 않았다.
