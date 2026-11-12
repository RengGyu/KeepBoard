# 원사진 3종 직접 감사 — Sol 부분 정답·위치 대조

**VERIFIED(검토 행위·집계):** 원사진을 실제 `view_image`로 열고 원본 픽셀 crop/확대/회전으로 읽었다. 그 판정은 **Sol의 시각 검토이며 사람 독립 정답 인증이 아니다.** 원사진 판본/확장/모드는 미확정이다. 제품·원관측·bbox·값 수정, 새 모델/API 호출, 외부전송은 0회다.

사진 읽기를 먼저 [독립 메모](independent-photo-notes.json)에 기록했다. 9사례를 열기 전 고정 시각은 **2026-11-12 22:31:29 UTC**(한국 11월13일 07:31:29), SHA는 `5e9529a3f68f0fbea7830358af6239175c5bf360783514cbe4a555e9dd3bd943`다. [고정 증거](independent-freeze.json)를 보존했다. 이후 원본 확대에서 발견한 초기 메모 오류 2건(먼 yellow 카드 수6→5, left 판 이름 Halikarnassos→ALEXANDRIA)은 [명시 정정](photo-amendments.json)에 분리했고 원 메모는 덮지 않았다. 응답 간 일치도를 정답 근거로 쓰지 않았다.

## 파일과 분모

- [ground-truth.json](ground-truth.json): 사진 SHA·평가 단위·사그라다20칸(점유18/빈2)·LC 공개 원정 카드35개 및 중앙 역할·7W 물리 앵커/판정. 부분 정답이고 `null`은 유보다.
- [matched-results.csv](matched-results.csv): 값·색·투자 여부/face의 개별 비교. 원 bbox, pieceId, 사진 실물 ID, crop, 대응 상태를 포함한다.
- [placement-audit.csv](placement-audit.csv): 사그라다 행·열, LC 편·색줄·실물순서, 7W117관측의 현재/사진 anchor를 비교한다. `stratified_minimum_sample=true`인31개는 개별 crop도 있다.
- [metrics.json](metrics.json): 9사례/강도6건의 일치·오독·모름·사진 유보·대응 유보·미대응·추가 후보를 분리한다. 사진 전체 정확도/누락/허위검출률은 계산하지 않는다.
- [correspondence.json](correspondence.json): 값/색 강제 일치 없이 위치·노출 영역으로 연결한 목록. LC medium은 별도 가설이다.
- [crop-manifest.json](crop-manifest.json): 원본 파일·픽셀 crop 범위·회전/확대·bbox 진단 이미지의 구분.
- [source-integrity.json](source-integrity.json): 사례9/팩3/구조9 파일의 SHA·불변 검사. 9사례 모두 사진 SHA가 실제 원사진 SHA와 같다.

`app_unknown`은 사진은 읽히지만 응답 값이 null인 경우다. `photo_unjudgeable`은 작은 숫자/가림으로 사진값을 확정하지 못한 경우다. `correspondence_unclear`는 동일 실물 대응을 확정하지 않은 경우다. 미대응을 오독·누락·추가로 자동 환산하지 않는다. 투자 카드의 number, 카드 뒷면의 suit/number, 중앙 가린 카드 아래 값은 숫자 분모에 넣지 않았다.

## 사그라다 — 전경 창문18개

위에서 아래, 사진 왼쪽에서 오른쪽 기준이다. **주사위 윗면 눈**만 읽었으며 앞면 눈은 대입하지 않았다. [전체 전경 crop](crops/sagrada-foreground.png), [노란 윗면 확대](crops/sagrada-yellow.png).

| 행 | c1 | c2 | c3 | c4 | c5 |
|---|---|---|---|---|---|
| r1 | purple6 | blue5 | red3 | green1 | yellow5 |
| r2 | yellow4 | 빈칸 | green1 | blue2 | 빈칸 |
| r3 | blue3 | green5 | purple4 | red1 | yellow5 |
| r4 | purple6 | yellow3 | red1 | blue3 | green2 |

| 사례 | 값·색 일치/36속성 | 오독 | 응답 모름 | 사진 칸 일치/18 | 미대응/누락/추가 |
|---|---:|---:|---:|---:|---|
| baseline | 33 | 1 | 2 | 18 | 0/0/0(전경 범위) |
| high | 32 | 2 | 2 | 18 | 0/0/0(전경 범위) |
| medium | 35 | 0 | 1 | 18 | 0/0/0(전경 범위) |
| low | 34 | 2 | 0 | 0 | 0/0/0(전경 범위) |

high는 r1c1의 **purple6을 yellow4로 읽었다**(색·눈2속성). baseline/low는 r1c4 green1을2, low는 r1c5 yellow5를2로 읽었다. high r1c3/r1c5의 눈, medium r1c5의 눈은 모름이다. low는 같은 실물18개가 대응되지만 `draft.scene`이고 창문 칸이 미확립이라 **값34일치와 칸0을 구분**한다. 이 결과는 배경 트랙·도구·목표·토큰 전체 정확도나 추론 강도의 일반 우열을 증명하지 않는다.

## LC — 실물 편·줄·순서와 6/9/추가8

`near`는 대각선 판의 아래/오른편, `far`는 위/왼편이다. 사람 이름/소유자를 뜻하지 않는다. 순서는 **판 가까운 쪽 → 줄의 바깥쪽**이다. 상대편 카드는180도 회전해 숫자 방향을 확인했다.

| 물리 줄 | 판에서 바깥쪽 순서 | 실제 근거 |
|---|---|---|
| near green | 6,7,8,9 | [crop](crops/lc-near-green.png): 첫6과 끝9의 점/모양 |
| near white | 투자,2,3,4,8 | [crop](crops/lc-near-white.png): 4와8 사이 별도 노출 카드 없음 |
| near blue | 2,3,5,7,9 | [crop](crops/lc-near-blue.png): 끝9이며6으로 돌려 읽지 않음 |
| near yellow | 3,4,5,9,10 | [crop](crops/lc-near-yellow.png): 9의 점, 10 전체 면 |
| far green | 투자,투자,2,4 | [180도 crop](crops/lc-far-green-rot180.png) |
| far white | 5,?,7,?,10 | [180도 crop](crops/lc-far-white-rot180.png): 작은 두 숫자는 유보 |
| far blue | 투자,? | [180도 crop](crops/lc-far-blue-rot180.png) |
| far yellow | 투자,투자,?,?,? | [회전 crop](crops/lc-far-yellow-rot165.png):5개 노출 띠, 숫자3개 유보 |

중앙에서 앞면이 보이는 윗카드는 **blue 투자 카드**다([crop](crops/lc-center.png)). 그 아래 가장자리는 가려져 카드 수·색·숫자를 확정하지 않았다. 왼쪽 아래 빨간 그림 더미는 **뒷면만 보인다**. 현재의 `front`/빨강 버림 역할은 별도 오독이며, 가린 숫자를 오독으로 세지 않는다. 이것을 실제 덱인지 다른 더미인지까지 규칙으로 확정하지 않았다.

| 사례 | 직접 연결(원정35개 중) | 값속성 일치/오독/모름/사진유보* | 위치 결과 | 미대응·추가 |
|---|---:|---|---|---|
| baseline | 35 | 68/2/17/12 (99속성) | 편·줄33맞음/2색모름 | 전경 후보 미대응0; 전체 누락/추가 미확정 |
| high | 34 | 69/1/14/12 (96속성) | 편·줄33맞음/1색모름 | far green4의 bbox=null인 후보1과 사진실물1 대응 유보 |
| medium | 0직접/35가설 | 87대응유보/12사진유보 | 35대응유보 | 후보36개; yellow8 추가후보1 |
| low | 20 | 25/0/21/10 (56속성) | 연결20개 중18맞음/2색모름 | 넓거나 경쟁하는 후보20/사진실물15 유보; 후보40개 |

*위 표는 **원정 카드 값**만이며 중앙윗장/뒷면 역할 행은 제외한다. 중앙 윗장 suit/투자 여부는 직접 대응된 baseline/high/low 모두 모름2속성이다. 빨간 뒷면을 `front`로 쓴 역할 오독은 baseline4/high4/low2 **관측행**이며, 실제 독립 카드 수/숫자 오독 개수로 환산하지 않는다.

baseline은 near yellow 첫3을2, high/baseline은 near yellow9를6으로 읽었다. medium/low에도 같은6 및 추가8 후보가 있지만, 해당 bbox가9/10의 이웃 노출면과 겹치므로 **추가8을 독립 허위 실물로 확정하지 않았다**. low의 white6도4/8 사이 별도 면으로 대응되지 않아 추가 후보로 남겼다. [low bbox 진단](crops/lost-cities-low-bbox-diagnostic.png).

medium은 원 bbox의 y가 사진 위치보다 약0.75배로 압축된 형태다([원 bbox 진단](crops/lost-cities-medium-bbox-diagnostic.png)). `y×4/3`은 좌표 단위 착오에 대한 **미확정 진단 가설**이고, 원 bbox·source transform·값을 바꾸지 않았다. 35개 줄 구성의 가설 대응은 남겼지만 값을 맞게 보이도록 보정해 직접 정확도로 채점하지 않았다.

far의 현재 표시 `order`는 바깥쪽→판 방향으로 증가하고, 사진표는 판→바깥쪽이다. CSV에 둘을 그대로 기록했다. 현재 `order`의 의미가 판 국소 방향으로 명시되지 않았으므로 방향 차이를 전부 잘못된 카드 순서로 자동 집계하지 않았다. 숫자를 오름차순 정렬해 실물 순서를 바꾸지 않았다.

## 7W — 31개 층화표본,117관측 전수 소속 검토

사진에서5개 물리 tableau를 구분했다: front(Gizah), left(Alexandria), upper-left(손에 가린 별도 판, 이름 유보), upper-right(이름 유보), right(Rhodos). 현재 결과의 wonder 앵커는4개다. **사진 소속은 판/카드 띠와 겹침·방향의 연결이며 사람 소유 확정이 아니다.**

| 사진 판정 단위 | 개수/117관측 |
|---|---:|
| 현재 anchor와 사진 소속 맞음 | 74 |
| 다른 anchor에 붙음 | 15 |
| 사진 소속을 읽을 수 있으나 현재 미분류 | 12 |
| 사진 소속 유보(중앙 뒷면/떨어진 동전·토큰/경계) | 16 |

사진 소속을 판단한 분모는101관측이다. **74/101을 사진 전체 정확도라고 부르지 않는다.** 117은 모델의 관측행이며 사진 전체 실제 부품 수가 아니다.

- 손에 가린 [upper-left 별도 판](crops/7w-fifth-board-occluded.png)의 카드/끼운 뒷면16관측 중15개가 left 또는 upper-right로 갈라져 붙고,1개는 미분류다. 예: index2 `scan-ecad825b8ae1bb06893e84d84ea9`([개별 crop](crops/7w-sample-002.png)), index107 yellow([crop](crops/7w-sample-107.png)), index112 green([crop](crops/7w-sample-112.png)). 이름/카드색을 동일성 조건으로 쓰지 않았다.
- right의 purple 길드2개, green3개가 미분류다. 예: index67 `scan-7703cab849b3974c04a020201043`([개별](crops/7w-sample-067.png), [판 주변 문맥](crops/7w-right.png)).
- upper-right brown4개가 미분류다. 예: index14 `scan-4efa1e329802ae1d1c846cd50fc3`([개별](crops/7w-sample-014.png), [문맥](crops/7w-upper-right.png)).
- front의 yellow1/purple1이 미분류다. index43 yellow([crop](crops/7w-sample-043.png)), index57 purple([crop](crops/7w-sample-057.png))는 [Gizah 주변 띠](crops/7w-front.png)에 속한다.
- 중앙 loose AgeIII 카드와 떨어진 동전·토큰은 가까운 판으로 강제 귀속하지 않았다. index79([crop](crops/7w-sample-079.png))와83([crop](crops/7w-sample-083.png))는 유보다. 판 아래로 끼운 카드의 **소속**은 확인해도 숨은 앞면 이름/효과는 채점하지 않았다.

31개 표본은5개 물리 구역, 여러 카드색, 판·군사토큰·동전·끼운 카드·경계를 포함한다. 모든 pieceId/bbox/현재anchor/사진anchor/맞음·틀림·유보/근거는 CSV에 연결돼 있다.

## 확인한 범위

`python3 docs/pro-implementation-20261113/photo-audit/build-audit.py`는 수동 시각 판정을 파일로 집계하고, 독립 메모 SHA·입력21파일 SHA·원사진3종과9사례의 SHA 일치를 검사한다. 사진 판정 자체를 자동 검증하는 테스트는 아니다. 강도 기본값 변경, 사진 전체5~10% 달성, 사람 정답 인증, 새 사진 일반화는 **미확인**이다.
