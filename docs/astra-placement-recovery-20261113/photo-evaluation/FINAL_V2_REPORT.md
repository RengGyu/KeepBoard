# 최종 자동 snapshot 원사진 대조 — final-v2

**VERIFIED:** 기존 원사진 기준과 관측 대응 363행을 그대로 적용했다. LC baseline 투자카드 2개의 줄 분리는 해소됐고, 판정 가능한 줄 사이의 잘못된 합침은 확인되지 않았다. 7W는 최초 변경 전보다 올바른 판 연결이 33→74로 늘었지만 **interim의 올바른 연결 1개가 최종에서 풀렸다**. Sagrada low는 표시 18칸만 복구됐으며 실제 판 연결·canonical 칸은 0이다.

이 보고서는 감독이 전달한 `final-v2/freeze.json`을 평가한다. [중간 보고서](README.md), `interim-v1` 및 기존 원장은 보존했다. 사진 기준·유보 변경은 0건이다. 수동 정정은 포함하지 않았다. 제품 편집·추가 provider 판독·배포는 각각 0회다.

**동일 분모의 최종 표.** 각 셀은 **맞음 / 오연결 / 미연결 / 유보**다. LC는 판·편·원정/버림 역할, 7W는 판 무리 소속, Sagrada는 전경 칸을 평가한다. LC 줄·순서는 아래에서 별도로 평가한다. 관측행 수는 독립 실물 수나 전체 사진 정확도가 아니다.

| 사례·범위 | 변경 전 | interim-v1 | final-v2 |
|---|---:|---:|---:|
| Sagrada baseline 전경18 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 |
| Sagrada high 전경18 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 |
| Sagrada medium 전경18 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 | 18 / 0 / 0 / 0 |
| Sagrada low 전경18 실제 연결 | 0 / 0 / 18 / 0 | 0 / 0 / 18 / 0 | 0 / 0 / 18 / 0 |
| LC baseline42 | 16 / 0 / 25 / 1 | 41 / 0 / 0 / 1 | 41 / 0 / 0 / 1 |
| LC high43 | 40 / 0 / 1 / 2 | 40 / 0 / 1 / 2 | 41 / 0 / 0 / 2 |
| LC medium43 | 1 / 0 / 0 / 42 | 1 / 0 / 0 / 42 | 1 / 0 / 0 / 42 |
| LC low46 | 24 / 0 / 1 / 21 | 24 / 0 / 1 / 21 | 25 / 0 / 0 / 21 |
| 7W117 | 33 / 0 / 64 / 20 | 75 / 0 / 22 / 20 | 74 / 0 / 23 / 20 |

Sagrada baseline18은 native 정식 칸 보존이다. high/medium18은 판 참조가 있는 상대 격자이며 native 칸으로 승격해 세지 않았다. low의 표시 칸 일치는 **0→18→18**이다. 최종18개는 모두 `areaId=unclassified`, `anchorRef=null`, `displayHypothesis=unanchored-grid`이며 빈 r2c2/r2c5도 맞는다. [실제 제공 HTML](final-v2/rendered/sagrada-low-0.html)에 “판 미확정 표시 격자 18개 · 배치 수 제외”가 있고, 4×5의18개 표시 위치가 고정 source 칸과 일치한다. 판 소속·창문 역할·인쇄 방향·canonical 위치 확정으로 해석하지 않는다.

**LC 줄 분리와 합침.** 최종 baseline의 far-blue index4 `scan-fb92c5d311ca8386eb2560dfb033`는 같은 줄의 index3과 한 그룹이다. near-white index24 `scan-b9a531070f1c7cd9581119df8965`도 같은 줄의 나머지4관측과 한 그룹이다. [far-blue 원사진 crop](../../pro-implementation-20261113/photo-audit/crops/lc-far-blue.png), [near-white crop](../../pro-implementation-20261113/photo-audit/crops/lc-near-white.png)을 다시 열어 기존 사진 판단을 유지했다. 해결된 관계는 **2카드에서 생긴 같은줄 쌍5개**이며, 카드5개 수정으로 세지 않는다. 원응답의 색·값은 변경되지 않았고 줄 연결을 새 숫자·색 판독으로 인정하지 않았다.

| LC 사례 | 고정 같은줄 쌍: 변경 전 | interim-v1 | final-v2 | 다른 실제 줄의 쌍 검사 / 최종 잘못된 합침 |
|---|---:|---:|---:|---:|
| baseline | 맞음10·미연결53 | 맞음58·분리5 | 맞음63 / 63 | 532 / 0 |
| high | 맞음55·미연결4·분리1 | 동일 | 맞음60 / 60 | 501 / 0 |
| low | 맞음18·분리2 | 동일 | 맞음20 / 20 | 170 / 0 |

위 줄 판정은 사진 대응이 유효한 관측만 포함한다. 최종 구조 JSON과 HTML 그룹 모두 같은 결과다. baseline의8실제 원정 줄이 다른 줄과 합쳐진 사례는 없었다. 고정53개 순서쌍은 변경 전 명시 관계32/미확정21 → interim48/5 → 최종53/0이며, 최종 HTML의 그룹 내 DOM 순서도53개 모두 사진의 판→바깥 방향과 일치한다. far-yellow 개별 정체가 불확실한 쌍은 순서 분모에서 계속 제외했다. high50·low17 순서쌍은 명시 관계가 없어 유보 상태다. 같은줄 성공을 물리 순서 성공으로 대신하지 않는다.

LC baseline의 중복 판 context는 변경 전2→interim1→최종1이다. 하나의 연속 공용판이라는 사진 판단과 맞는다. 최종41맞음은 판1·원정35·버림5 관측의 판/편/역할이다. 손 아래 뒷면 카드/덱1의 역할은 계속 유보한다. high index15와 low index25의 near-yellow 미연결이 해소돼 각각 맞음1개가 늘었다. 반면 **유보였던 medium5행·low2행의 자동 연결 증가에는 정답 점수를 주지 않았다**. medium의 좌표 대응 유보42, low의 경쟁 bbox20+역할 유보1은 유지된다.

**7W의 남은 연결과 회귀.** 고정 분모는 판 소속을 판단할 수 있는97행과 유보20행이다. 최종97행 중 맞음74·오소속0·미연결23이다. 그74행은 front25·left26·right16·upper-right7로 원사진 판 무리와 맞는다. 가려진 upper-left16개가 다른 판으로 전파된 사례는 없다. 실제5무리와 응답판4개 차이는 여전하다.

| 최종 미연결 원사진 무리 | 관측 index |
|---|---|
| upper-left16 | 2, 3, 4, 5, 6, 7, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116 |
| upper-right6 | 13, 14, 15, 16, 17, 19 |
| right1 — interim에서 풀림 | **76** |

index76 `scan-415237aab21c5edfeb55ba109a0b`는 [기존 원본 bbox 진단](crops/7w-right-indices.png)을 다시 열어 오른쪽 판 무리임을 확인했다. interim의 올바른 right 연결이 최종에서 `anchorRef=null`, `no-supported-board-relation`으로 바뀌었다. 이것은 오소속 발생이 아니라 **올바른 연결1개 감소**다. 숨은 원인이나 구현 의도를 추정해 상쇄하지 않았다. 떨어진 동전 index38/39/41/42의 소속 유보도 전후 동일하게 유지했다.

**근거와 검증 범위.** [최종 관측 CSV](final-v2-photo.csv), [관측 상세](final-v2-photo-rows.json), [줄·순서 쌍](final-v2-photo-relations.json), [3단계 비교 JSON](final-v2-comparison.json), [검증 기록](final-v2-validation.json)에 재현 가능한 ID와 판정을 보관했다. [복사 manifest](final-v2/snapshot-freeze.json)는 원본 최종패킷47파일의 SHA를 기록한다. source9·reused source11·input21·output46개 manifest 항목과 source snapshot9개의 SHA가 일치했다. 기존 평가105파일의 해시도 유지됐다.

제공 HTML21개에서 그림 버튼439개를 구조와 대조했다. native18개와 source bbox 없는1개는 제공 replay가 별도 경로로 세며 이 HTML에 그리지 않는다. Sagrada 은총20개는 명시 부착 관계에 따라 부모 도구 그룹 안에 그려지는 경로도 구별했다. **HTML 정적 구조 확인이며 브라우저 화면·터치·실제 iPhone Safari·처리시간 검증은 아니다.** 원사진의 숨은 장수, far-yellow 숫자, 전체 사진 오답률, 모델 강도 우열은 판정하지 않았다. 원사진 기준 정정은 필요하지 않았다.

**정확한 SHA-256**

| 파일 | SHA-256 |
|---|---|
| 제공 final-v2/freeze.json | `8e500f29507fad285a0692f66d633fa7ed5a2c839c7a9f2b42befc8b3a18294c` |
| source-basis.json | `f438cc4f10db0f3c9342f650ef30694eb652bc04b1e676e1fad85c4be7f1b61f` |
| source-matches-v1.json | `8ffaa818b7dba0486981f9a8dfa5ce7477aac5f736293308b74e12a0054f58ea` |
| final-v2/snapshot-freeze.json | `7744181683d27ece8f591693abb249dd8e42c7ac2c35d3d02631f3e7a7f4b231` |
| final-v2-photo.json | `ec0a85176b2b0bab84efc53b77c2e8138d80300c589b75053472b126b3753d06` |
| final-v2-comparison.json | `8f09b93b0a9169a918b9297db5a04aff90f1e5337d13278b9df401cc4b8442ee` |
| final-v2-validation.json | `8f863c2badcc101eb44838ba86bc2b80c9b66107c97fbb1dccf4acb1ff308f33` |

집계기는 중간 평가와 동일 SHA `f401c6650ea0546806d49d15733e255600afe5d2b5c4e4ecced285c7284f66a6`다. 저장소 루트에서 아래처럼 **새 출력 이름**으로 집계를 재현할 수 있다. 사진 기준을 재생성하거나 제품 코드를 실행하는 명령은 아니다.

```sh
python3 docs/astra-placement-recovery-20261113/photo-evaluation/compare-snapshot.py --structures docs/astra-placement-recovery-20261113/photo-evaluation/final-v2/structures --output final-v2-reproduce
```

`validate-final-v2.py`는 이번 해시·정적 HTML 대조의 실행 원문이며, 이미 기록한 검증 파일을 덮지 않도록 재실행을 거부한다. 모든 신규 인계 파일의 SHA는 [최종 인계 무결성 기록](final-v2-delivery-integrity.json)에 별도로 묶었다. `PROJECT_CONTEXT.md`는 쓰기 소유 범위 밖이므로 이 보고서를 감독에게 인계한다.
