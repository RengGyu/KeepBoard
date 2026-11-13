# 원사진 기준 자동 배치 대조 — 중간 결과

**VERIFIED:** 같은 사진 판정·관측 대응·분모로 구현 전후를 비교했다. 세븐 원더스의 확인된 판 연결은 **33→75**, 로스트 시티 baseline의 판·편·역할 연결은 **16→41**이다. 이 범위의 새 오소속은 확인되지 않았다. LC의 두 투자 카드 줄 분리, 7W의 미연결22개, 사그라다 low의 실제 판 연결 부재는 남는다. 연결 수를 전체 위치 정확도나 출시 완료로 표현하지 않는다.

이 결과는 구현자가 제공한 **중간 자동 snapshot**이다. 제품 구현 freeze·실기기 확인을 대신하지 않는다. 원본 사진3장과 원본 픽셀 crop을 실제 `view_image`로 열었다. 기존 요약 수치와 crop 이름에는 노출됐으므로 맹검 사람 정답 인증이 아니다. 제품·원관측·기존 사진 원장은 수정하지 않았다.

## 고정 기준과 재현

- [source-basis.json](source-basis.json): 응답표·현재 구조를 열기 전 사진 판단과 비교 계약. SHA256 `f438cc4f10db0f3c9342f650ef30694eb652bc04b1e676e1fad85c4be7f1b61f`. 원본3사진 SHA, 열린 crop19개와 변환을 포함한다. [동결 증거](source-freeze.json).
- [source-matches-v1.json](source-matches-v1.json): 같은 물체/무리의 363개 **관측행** 대응. 사그라다 전경72행, LC174행, 7W117행. SHA256 `8ffaa818b7dba0486981f9a8dfa5ce7477aac5f736293308b74e12a0054f58ea`. 원답의 색·숫자 일치를 대응 조건으로 쓰지 않았다.
- [source-evidence-addendum.json](source-evidence-addendum.json): 기존 Sol 원장과의 차이, 추가 crop·진단 overlay, A/B·줄·순서 비교 규약. 최초 source basis는 덮지 않았다.
- [interim-v1/snapshot-freeze.json](interim-v1/snapshot-freeze.json): 전후 구조 JSON·재생 결과·필드별 HTML62개를 평가 폴더로 복사하고 SHA 고정. 이후 제품 작업의 변동과 분리했다.
- [전후 요약](interim-v1-comparison.json), [변경 전 CSV](interim-v1-before-v2.csv), [변경 후 CSV](interim-v1-after-v2.csv), [변경 후 상세 관측](interim-v1-after-v2-rows.json), [줄·순서 관계](interim-v1-after-v2-relations.json).
- [validation.json](validation.json): 사진·입력 해시, 복사62파일 불변, 사그라다72개 위치 표식과 bbox 대응, 9사례 동일 분모, 수동 배치/프레임0 확인. 최초 현재 제품 기준은 [baseline-v2.json](baseline-v2.json)이며 제공받은 before의 9사례 판정과 같다. `*-v1`/초기 집계 파일은 보존했고, 표시 격자 분리 열을 추가한 `*-v2`가 이 보고서의 표다.

저장소 루트에서 다음 명령으로 새 이름의 집계를 재생한다. 사진 판정을 다시 생성하는 명령이 아니며 원본·제품·기존 결과를 변경하지 않는다.

```sh
python3 docs/astra-placement-recovery-20261113/photo-evaluation/compare-snapshot.py --structures docs/astra-placement-recovery-20261113/photo-evaluation/interim-v1/before/structures --output reproduce-before
python3 docs/astra-placement-recovery-20261113/photo-evaluation/compare-snapshot.py --structures docs/astra-placement-recovery-20261113/photo-evaluation/interim-v1/after/structures --output reproduce-after
```

## 동일 기준의 전후 판정

표의 순서는 **맞음 / 오연결 / 미연결 / 유보**다. LC는 **판·편·원정/버림 역할**, 7W는 **판 무리 소속**, 사그라다는 **전경 칸 배열**을 본다. 줄과 물리 순서의 성공을 이 합계에 합치지 않았다.

| 사례·범위 | 변경 전 | 변경 후 | 해석 |
|---|---:|---:|---|
| 사그라다 baseline 전경18 | 18 / 0 / 0 / 0 | 동일 | 기존 native 정식 칸18 보존 |
| 사그라다 high 전경18 | 18 / 0 / 0 / 0 | 동일 | 실제 판 참조가 있는 상대 격자18; native 칸 아님 |
| 사그라다 medium 전경18 | 18 / 0 / 0 / 0 | 동일 | 실제 판 참조가 있는 상대 격자18; native 칸 아님 |
| 사그라다 low 전경18 실제 연결 | 0 / 0 / 18 / 0 | 동일 | 별도로 표시 격자 일치는 0→18 |
| LC baseline42관측 | 16 / 0 / 25 / 1 | 41 / 0 / 0 / 1 | 줄 분리는 아래와 같이 남음 |
| LC high43관측 | 40 / 0 / 1 / 2 | 동일 | bbox 없음1·역할 유보1 포함 |
| LC medium43관측 | 1 / 0 / 0 / 42 | 동일 | 판1만; 카드42는 좌표 대응 유보 |
| LC low46관측 | 24 / 0 / 1 / 21 | 동일 | 넓거나 경쟁하는 bbox20·역할 유보1 |
| 7W117관측 | 33 / 0 / 64 / 20 | 75 / 0 / 22 / 20 | 사진상 소속 판정 가능97행 |

**사그라다 low:** 변경 후18개 모두 `areaId=unclassified`, `anchorRef=null`, `slotBasis=relative-band`, `displayHypothesis=unanchored-grid`다. 표시상의 r/c는 원사진18칸과 일치하고 빈 r2c2/r2c5도 유지한다. 실제 판 소속·창문 역할·canonical 위치를 얻었다고 세지 않는다. 복사 HTML에도 판·역할 미확정 표시가 있다. 실제 모바일 렌더링/터치 검증은 하지 않았다.

**LC baseline:** source photo의 공용판은 하나다. 변경 전에는 같은 `sourceRegion`을 가진 live-piece/observed-board 참조2개가 있었고 변경 후1개다. 변경 전 미연결26개 사유는 **중복 판 영역24 + 판 근거 부족2**이며, 중간 메시지의 “중복 판26”은 정정한다. 새 결과는 판1·원정관측35·버림관측5의 판/편/역할이 맞고, 손 아래 뒷면 카드/덱 관측1의 역할은 유보한다. 41행을 독립 실물41개 또는 전체 줄 복원41개라고 부르지 않는다.

LC의 **far-blue 투자 index4** (`scan-fb92c5d311ca8386eb2560dfb033`)와 **near-white 투자 index24** (`scan-b9a531070f1c7cd9581119df8965`)는 각각 같은 실제 줄과 별도 색모름 그룹에 있다. [far-blue 원본 crop](../../pro-implementation-20261113/photo-audit/crops/lc-far-blue.png), [near-white 원본 crop](../../pro-implementation-20261113/photo-audit/crops/lc-near-white.png). 고정된 같은줄 관측쌍63개는 변경 전10연결/53미연결에서 변경 후58연결/5분리다. 5분리는 두 카드가 만든 관계이며 오소속 카드5개가 아니다. 다른 실제 줄을 합친 사례는 확인되지 않았다. Far-yellow 개별 대응을 제외한 동일53순서쌍은 명시 관계48개가 판→바깥 방향과 일치하고5개는 관계 미확정이다. 화면 정렬 숫자만으로 물리 순서를 인증하지 않았다.

**7W:** 변경 후75개 연결은 모두 원사진의 같은 판 무리에 붙는다. 미연결22개는 손에 가린 **upper-left16개**와 **upper-right6개(index13–17,19)**다. 가려진/미관측 판 주변 카드가 다른 판으로 전파된 사례는 이번 snapshot에서 확인되지 않았다. 실제5무리와 응답판4개 차이는 유지되며, 숨은 판의 윤곽·이름을 만들어 채우지 않았다. [upper-left 진단](crops/7w-upper-left-indices.png), [upper-right 진단](crops/7w-upper-right-indices.png).

## 기존 원장과 달라진 사진 판단

**VERIFIED:** LC 먼 노란 줄에는 **6개 노출 띠**가 보인다. [원본 픽셀 확대](crops/lc-far-yellow-nearest.png), [6띠 표시](crops/lc-far-yellow-six-strips.png). 숫자 판독·숨은 총 장수는 별개다. 기존 원장의5장 개별 정답에 응답을 억지로 대응시키지 않고, 기존 후보들은 이 줄의 소속만 비교한다. 이 차이를 근거로 새 카드·값·bbox를 제품에 채우지 않았다.

**VERIFIED:** LC 왼쪽 아래 빨간 더미의 윗장에는 빨간 모서리 숫자3과 앞면 삽화가 보인다. [직접 crop](crops/lc-lower-left-stack-nearest.png). 기존 “뒷면만 보인다” 단정은 지지되지 않는다. 아래 가린 장수·값·독립 관측 대응은 유보하며, 원정 줄 밖 공용판 버림 영역이라는 위치 관계를 평가한다.

**UNCLEAR:** 7W 상단 오른쪽의 떨어진 동전 index38/39/41/42는 판과 직접 붙은 근거가 없어 소속 유보다. 따라서 이번 기준은 **97판정가능 + 20유보**다. 이전의101+16 및 과거 알고리즘 수치와 혼합하지 않았다. 전후 양쪽에 동일하게 적용했다.

LC medium의 변위/좌표 배율, high의 null bbox, low의 넓고 경쟁하는 관측은 원사진 가림과 별도로 기록했다. 임의 좌표 보정이나 읽힌 값으로 대응을 강제하지 않았다. 유보를 정답·오답·허위검출로 환산하지 않으며, 이번 결과로 모델 강도 우열·전체 사진 오답률·실기기 성능을 주장하지 않는다.
