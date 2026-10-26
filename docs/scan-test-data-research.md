# 실물 없이 시작하는 카탄 스캔 시험 자료

2026-10-20 · 자료 조사·다운로드만 수행. 앱 업로드, 모델 호출, 제품 수정은 수행하지 않았다.

**RECOMMENDATION:** 먼저 기존 사진 **07·02·08·10을 각각 별도 시험 방에 한 장씩** 넣는다. 이어서 **07 한 장을 화면에 고정하고 휴대폰으로 다시 촬영**하면 같은 상태의 카메라 스윕을 실물 없이 시작할 수 있다. 새로운 사진 수십 장이나 영상 입력 구현은 이 시작 묶음에 필요하지 않다. 기존 리뷰 사진의 권리 상태는 아래와 같으며, 공개 이용 허락이 명시된 카메라 시험 대안으로 CC 도식도 확보했다.

| 시작 파일 | 내용·해상도 | 바로 확인할 부분 |
|---|---|---|
| [07.jpg](../assets/research/catan-photos-recent/07.jpg) | 전체 판·주변 카드, 2000×1500 | 전체 배치·숫자·색상별 건물과 도로. 화면 재촬영의 고정 원본으로 가장 적합 |
| [02.jpg](../assets/research/catan-photos-recent/02.jpg) | 도둑·건물·숫자 접사, 1915×1080 | 가려진 숫자를 모름으로 남기는지, 부분 사진에서 전체 판을 지어내지 않는지 |
| [08.jpg](../assets/research/catan-photos-recent/08.jpg) | 카드 앞뒷면 배열, 2000×2000 | 카드 종류·앞뒷면·구성물 목록. 실제 손패나 플레이어 소유 관계의 정답은 없음 |
| [10.jpg](../assets/research/catan-photos-recent/10.jpg) | 네 색상의 도로·마을·도시·도둑, 2000×2000 | 말 모양·색 구분·목록 수량. 보드 위 자리 연결 시험용은 아님 |

**VERIFIED — 기존 자료.** `assets/research/catan-photos-recent/`의 10장 모두 디코딩·크기·SHA256가 기존 [manifest](../assets/research/catan-photos-recent/manifest.json)와 일치한다. 8장은 긴 변 1200px 이상, 03·09는 820×500이다. [접촉 인화표](../assets/research/catan-photos-recent/contact-sheet.jpg)를 다시 시각 확인했다. 04는 주로 지형·숫자와 준비된 판이므로 이미 놓인 플레이어 말 검증에는 다른 사진이 낫다.

| 해당 파일 | 원출처·게시일 | 저작자 표기와 사용 조건 |
|---|---|---|
| 01·02 | [WellPlayed](https://www.well-played.com.au/catan-6th-edition-review/), 2025-09-10 | 글 Adam Ryan. 사진 개별 촬영자·재사용 라이선스는 별도 확인되지 않음 |
| 03·09 | [Zatu](https://zatu.com/blogs/reviews/catan-6th-edition-review), 2025-07-08 | 글 Steve Conoboy. 사진 개별 촬영자·재사용 라이선스 미확인 |
| 04 | [Explosion Network](https://explosionnetwork.com/catan-6th-edition-review/), 2025-09-11 | 글 Dylan Blight. 사진 재사용 라이선스 미확인 |
| 05·06 | [Player2](https://www.player2.net.au/2025/09/catan-review-cant-hardly-wheat/), 2025-09-02 | 글 Stephen del Prado. 사진 재사용 라이선스 미확인 |
| 07 | [What’s Good To Do](https://whatsgoodtodo.com/catan-board-game-6th-edition-review/), 2025-06-10 | Jenny Bray의 리뷰이며 리뷰어 본인 사진이라는 캡션 확인. 재사용 라이선스 미확인 |
| 08·10 | [Catan Collector](https://catancollector.com/catan-news/220-catan-unboxing-2025-english-base-set), 2025-09-14 | 사이트 운영자 Nigel Morris. 개별 사진 촬영자·재사용 라이선스 미확인 |

이 날짜들은 **출처 게시일**이며 실제 촬영일은 미상이다. 원본 파일과 직접 이미지 URL은 기존 manifest에 있으므로 재수집할 필요가 없다. 저작권은 원 권리자에게 남으며 CC 자료로 취급할 수 없다. 다운로드되어 있다는 사실만으로 재배포·학습·외부 AI 전송 허가까지 확인된 것은 아니다. 이번 조사에서는 그러한 허가를 추가로 확보하지 않았다. What’s Good To Do는 웹 도구에서 403이었으나 공개 원문 일반 HTTP 요청으로 게시일·캡션을 확인했다.

**VERIFIED — 같은 상태로 묶으면 안 되는 경우.** 01의 도둑은 사막에, 02의 도둑은 벽돌 지형에 있다. 같은 리뷰에서 나온 두 사진도 동일 정지 상태가 아니다. 다른 출처 사진이나 카드·말 도감 사진을 함께 골라 “한 판의 여러 시점”으로 보내지 않는다. 나머지 원본 사이에도 동일 물리 상태가 보장된 시점 묶음은 확인하지 못했다.

**RECOMMENDATION — 현재 앱에 넣는 순서.**

1. 카탄 시험 방의 스캔 화면에서 **사진에서 가져오기**를 선택한다. 위의 원본은 처음에는 한 장씩, 서로 다른 방에서 시험한다. 같은 방에 다른 판을 계속 추가하면 이전 근거와 섞일 수 있다.
2. 카메라 경로는 노트북·태블릿에 **같은 사진 한 장**을 크게 고정한다. 휴대폰에서 현재 사용할 수 있는 HTTPS 주소로 앱을 열고 **카메라로 스캔**을 누른다. LAN HTTP에서 카메라가 막히면 휴대폰 기본 카메라로 찍은 JPG를 가져오면 된다. 이 대체 경로는 앱의 실시간 선별 시험은 아니다.
3. 전체 A → 위쪽 B → 아래쪽 C → 처음과 비슷한 구도의 A로 천천히 움직이고 각 지점에서 2–3초 멈춘다. 그림·말·숫자를 바꾸지 않는다. 중복을 피하려고 다른 판 사진으로 화면을 바꾸면 안 된다.
4. 자동 확보된 사진을 확인하고 마친다. 6장을 반드시 채울 필요는 없다. 이 경로로 움직일 때 보류되는지, 멈추면 확보되는지, 같은 구도로 돌아왔을 때 근접 중복이 줄어드는지 확인한다. 큰 시점 변화까지 같은 물체로 판별하는 기능이라고 기대하지 않는다.
5. 프린터가 이미 있으면 같은 원본을 A4/A3에 크게 인쇄해 위와 같이 비춘다. 인쇄는 화면의 모아레·주사 줄무늬를 줄이는 대안이지만 종이 반사·프린터 색·해상도라는 다른 조건이 생긴다. 두 방식 모두 평면을 다시 찍는 시험이다.

현재 [스캔 구현 문서](scan-implementation.md)와 `src/SessionWorkspace.tsx:153`, `:201`을 확인했다. **사진 업로드는 처음 6장까지 처리하며 카메라의 자동 품질·중복 탈락을 거치지 않는다.** 카메라는 기기에서 선별하며 최대 6장을 확보한다. AI가 연결된 앱에서는 업로드 완료나 촬영 마치기 뒤 그 묶음에 대한 공동 판독이 실행된다. 이번 연구에서는 그 동작을 실행하지 않았다.

**VERIFIED — 추가로 확보한 공개 보조 샘플 2장.** 파일은 [scan-test-data 폴더](../assets/research/scan-test-data/)에 있고 출처·직접 URL·날짜 종류·해시는 [별도 manifest](../assets/research/scan-test-data/manifest.json)에 기록했다. 둘 모두 원본 응답 바이트 그대로 저장·디코딩·시각 확인했다.

| 샘플 | 날짜·권리 근거 | 확보 및 쓰임 |
|---|---|---|
| [fixed-setup-cc-by-sa.png](../assets/research/scan-test-data/fixed-setup-cc-by-sa.png), 1280×1120 | [Cmglee의 원출처](https://commons.wikimedia.org/wiki/File:Catan_Universe_fixed_setup.svg). 최초 업로드 2019-08-31, 현재 파일판 업로드 2019-09-01. **도식으로 촬영일은 해당 없음.** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 표시 확인 | [공개 PNG](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Catan_Universe_fixed_setup.svg/1280px-Catan_Universe_fixed_setup.svg.png) 다운로드 성공. 저작자·출처·라이선스와 수정 여부를 표시하고 수정본을 배포하면 동일 조건을 따른다. 화면·인쇄 카메라 선별용. 꼭짓점에도 보조 숫자가 있으므로 실제 카탄 숫자·말 판독의 정답으로 쓰지 않는다 |
| [synthetic-board-45000.jpg](../assets/research/scan-test-data/synthetic-board-45000.jpg), 640×640 | [CatanSynth Meridian 배포자 카드](https://huggingface.co/datasets/nithinmanoj10/CatanSynth-Meridian-v1-50K). [공개 저장소 메타데이터](https://huggingface.co/api/datasets/nithinmanoj10/CatanSynth-Meridian-v1-50K?expand%5B%5D=createdAt&expand%5B%5D=cardData) 생성일 2026-09-17. 개별 합성 시각 미상·촬영일 해당 없음. 배포자는 MIT로 표시 | [고정 리비전의 개별 JPG](https://huggingface.co/datasets/nithinmanoj10/CatanSynth-Meridian-v1-50K/resolve/f29dc86c83d00472a55ee2e484eb1d2577568ad2/images/test/chunk_000/catan_board_45000.jpg) 무가입 다운로드 성공. 부분 판·회전 숫자·도로 모양 시험용. 50,000장을 받을 필요 없음. 별도 LICENSE 파일·원래 합성 소재 권리 근거는 확인되지 않았으므로 공식 CATAN 이용 허락으로 확대 해석하지 않음 |

합성 자료의 제공 라벨은 지형 육각형의 상자·꼭짓점이다. 전체 게임 상태, 모든 숫자·소유자·가림 뒤 물체의 정답을 제공한다고 볼 수 없다. 내려받은 샘플도 **전체 판이 아닌 부분 이미지**다. 실제 사진 4장이 기본 묶음이고 이 두 장은 입력·평면 촬영·부분 상태 처리의 보조 자료다.

**REPORTED / UNCLEAR — 실제 영상 후보.** [PBalewski / CATAN-video-tracking](https://github.com/PBalewski/CATAN-video-tracking)은 저자 PBalewski·KubaCzech, README 작성 시점 January 2025이며 [공개 저장소 메타데이터](https://api.github.com/repos/PBalewski/CATAN-video-tracking)의 생성일은 2025-01-04다. 실제 촬영일은 확인되지 않았다. README는 실물 영상 9개와 서로 다른 플레이 단계·각도·흔들림 조건을 설명한다.

[공개 파일 목록](https://api.github.com/repos/PBalewski/CATAN-video-tracking/contents/input_data)에서 MP4 9개와 Raw 경로를 확인했다. 예를 들어 [medium1.mp4](https://github.com/PBalewski/CATAN-video-tracking/blob/main/input_data/medium1.mp4)는 10,769,656바이트다. **기술적인 파일 경로는 있으나 실제 영상 다운로드는 하지 않았다.** 저장소에 재사용 라이선스가 확인되지 않았고 메타데이터의 `license`도 `null`이다. 같은 정지 상태의 여러 각도 구간을 직접 확인하지 못했으므로 즉시 사용할 묶음으로 추천하지 않는다. 여러 영상이나 임의의 몇 초 간격 프레임을 한 스캔으로 합치면 안 된다.

권리가 확인된 영상이 별도로 확보되면, 조각·도둑·카드가 움직이지 않고 편집 전환도 없는 구간을 먼저 확인한 뒤 3–6장을 JPG/PNG로 추출해 **사진에서 가져오기**로 넣을 수 있다. 이것은 앱 수정 없이 가능한 파일 준비 경로지만 실시간 카메라 선별을 통과시키는 경로는 아니다.

| 시험하려는 것 | 지금 가능한 입력 | 남는 한계 / 추가 구현 |
|---|---|---|
| 실물 사진의 구성물 인식·정정 | 기존 원본 한 장씩 업로드 | 현재 조사에서는 실제 AI 결과 미측정 |
| 카메라 흔들림·안정 대기·근접 중복 | 고정 화면 또는 인쇄물을 휴대폰으로 비추기 | 실제 폰에서 수행해야 함. 화면·인쇄 특유의 잡음이 추가됨 |
| 같은 상태의 공동 판독 | 고정 원본의 재촬영 사진 2–6장 | 평면 재촬영일 뿐, 가려진 말의 다른 면이 새로 드러나지 않음 |
| 기존 MP4 자체를 앱에서 훑기 | 현재 불가 | 파일 동영상 입력·프레임 공급 연결 구현이 필요 |
| 입체 말의 가림 해소·광택·실제 높이·카드 겹침 | 확인된 실물 정지판의 다중 시점 원본 필요 | 이번 조사에서 권리와 상태 동일성이 함께 확인된 공개 묶음은 확보하지 못함 |

**UNCLEAR:** 공개 영상의 다운로드 권한과 정지 상태, 리뷰 사진의 추가 이용 허락, 실제 폰·AI 결과는 미확인이다. 그 한계를 숨기지 않고 **독립 실사진 4장 + 고정 평면 재촬영 1회**부터 시작하는 것이 현재 가장 실행하기 쉽다. 데이터 확보를 위해 설치·가입·구매·연락하거나 앱을 재시작할 필요는 없다.
