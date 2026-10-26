# 119게임 구성·판본·이미지 매핑 독립 재검수

기준일: 2026-10-22. Rummikub는 별도 교정 범위이므로 제외했다. 이 폴더만 작성했고 제품·원명세·아트는 변경하지 않았다.

## 결과

| 구분 | 게임 수 | 의미 |
|---|---:|---|
| VERIFIED_SCOPED | 44 | 선택 판본의 **기록한 페이지/구성/설정 범위**를 본문과 도해로 직접 대조 |
| PARTIAL | 64 | 공식 본문 일부 또는 참조문서 대조. 도해·정확 인쇄·일부 차원 미확인 |
| HELD | 11 | 선택 판본 고정 또는 구성물 원문 접근이 부족해 판정 보류 |
| 합계 | **119** | 누락 0, 중복 0 |

확정 불일치 **20건 / 18게임**이다. F001은 Agricola Revised 가족 말을 원반으로 표현한 문구·대표형 차이이며, F002–F020은 공용 유형/값/진영색과 플레이어 소유색을 한 매핑 계약으로 섞은 문제다. `VERIFIED_SCOPED` 안에도 불일치 게임이 포함된다. 상태는 검수 깊이이며 PASS/FAIL 개수가 아니다.

공식 PDF **49게임의 지정 페이지 contact sheet**를 직접 열었다. 그중 45게임에서 구성/배치의 시각 사실을 확인했으나 Machi Koro의 5주년 정확 인쇄는 고정하지 못해 PARTIAL로 낮췄다. Arkham Horror 3, Star Wars Rebellion, Outer Rim은 열람한 첫 4페이지가 Rules Reference 본문이므로 실제 구성물 그림색을 확인했다고 세지 않았다. Space Base 첫 4페이지도 구성물 p.5 전이라 PARTIAL이다. 나머지 70게임은 공식 웹/PDF 텍스트 또는 접근·판본 한계만 기록했다.

## 읽을 파일

- [ledger.json](ledger.json): 119 전수 행. 선택 판본, 실제 확인 차원·범위, 원문 URL/페이지·절, 사실·미확인, finding ID/layer, 명세/매핑 경로와 해시.
- [ledger.csv](ledger.csv): 같은 결과를 모바일/스프레드시트에서 보기 위한 축약판. UTF-8 BOM.
- [findings.json](findings.json): 20건 각각 **기존값 → 원문값 → 정확 JSON Pointer → 영향 → 최소 수정안 → 한계**.
- [correction-plan.md](correction-plan.md): 위 finding의 사람용 교정 목록. 아직 적용하지 않은 제안이다.
- [remaining.md](remaining.md): 11 HELD 및 64 PARTIAL의 개별 접근·판본·추가 필요자료.
- [summary.json](summary.json), [verification.json](verification.json): 집계 및 기록 구조/파일/해시 검사 결과.
- [claims.json](claims.json): 최초 읽은 119 명세·매핑의 주장 위치와 해시. 사실 검증 자체가 아님.
- [notes.json](notes.json), [web-notes.json](web-notes.json): 직접 원문을 읽고 작성한 독립 수동 메모. 기존 조사 결론을 그대로 채택하지 않았다.
- [local-documents.json](local-documents.json), [download-curl-receipts.json](download-curl-receipts.json): 보유 원문 연결과 이번 다운로드의 URL/해시/접근 결과.
- `pages/{game}.png`: 실제 열람한 PDF 지정 페이지를 렌더한 근거. 앱 스크린샷이나 현재 아트의 contact sheet가 아니다. `pages/*.txt`의 전 페이지 추출은 전 페이지를 읽었다는 뜻이 아니다.

## 적용 전 주의할 계약

유형색과 **소유 관계**는 다르다. 예를 들어 Sagrada의 빨간 주사위는 현재 어느 플레이어가 보유하든 빨간 유형이며, Terraforming Mars의 청동/은/금은 자원 값이다. 개인 말의 owner색은 유지하되, 공용 유형은 variant별 고정 색/값으로 나누는 최소 수정이 필요하다. 기존 component ID·저장된 owner·실물 수량·정정값을 삭제하거나 자동 재해석하라는 제안이 아니다.

F017 Azul의 ‘플레이어별 색 점수말’ 비교는 p.2 검정 점수말 그림으로 뒷받침되지 않아 삭제했다. 공용 단일 선플레이어 표식만 근거로 남겼다.

일부 넓은 묶음(Istanbul 기타 인물, Eclipse 함선/부품, Le Havre 일꾼/배, 공용 주사위 등)은 variant 정체가 부족하다. 근거가 확인된 20건과 별도로 `ledger.json`의 `unconfirmed`에 질문을 남겼으며 억지로 추가 확정하지 않았다. 양/공급이 null인 명세는 변형 개수나 그림 층수로 수량을 만들어 넣지 않았다.

## 판본·접근 한계

- Dominion 구판 PDF의 왕국 카드252/32종·Trash card를 선택 2판 근거로 쓰지 않았다. 공식 2판 PDF의262/26종·Trash mat를 별도 본문 대조했다.
- Ticket to Ride 북미 구판30/현행33 티켓, Orléans 8쇄부터의5인 추가, Lost Cities 기본5원정/다른 면6원정, 현행 Swift Start 등을 판본/모드 차이로 남겼다.
- Avalon 링크는 Big Box인데 선택은 기본판으로만 적혀 있어 HELD다. Gloomhaven 2판 원문을 Jaws에, Nemesis를 Lockdown에, Mage Knight Ultimate를 원 기본판에 대신 쓰지 않았다.
- Python urllib의 로컬 인증서 체인 실패는 공식 원문 비공개 판정으로 쓰지 않았다. 같은 공개 URL을 **일반 TLS 검증을 켠 curl**로 한 번 재시도했고 HTTP/timeout/HTML redirect와 구분했다. Web의 크기 제한·JS 전용·403/502도 실제 오류로 기록했으며 접근 우회는 하지 않았다.
- Root는 JS 라이브러리 실패 뒤 공식 Resources의 Oct2025 Law PDF에서 C.1 기본4세력과 p.2 공개범위 본문을 읽어 PARTIAL로 남겼다. 24쪽 이후 모든 확장 구성물을 기본4세력에 합치지 않았다.
- 공개 원문/PDF의 저작권은 출판사에 있다. `sources/` 사본과 `pages/` 렌더는 이 연구 검수용이며, 원문/그림의 제품 아트 재배포 허가로 간주하지 않는다.

## 재검증

프로젝트 루트에서 다음 두 명령만으로 기록을 다시 조립하고 확인할 수 있다.

```sh
python3 docs/game-fidelity-audit/review/build_ledger.py
python3 docs/game-fidelity-audit/review/verify.py
```

`verify.py`는 119 ID/집계, 20 finding의 JSON Pointer40개, 로컬 원문 해시·이미지 경로, 최초 **119 원명세 + 119 매핑 해시 불변**을 검사했다. exit 0. 이것은 원문 판독 사실의 자동 검증이나 게임 전체 정확성 보증이 아니다. 제품 코드를 바꾸지 않아 전체 테스트/빌드/생성기는 실행하지 않았다.

## 범위와 소유권 반환

수동 기록을 위한 대표형/매핑의 범위 검수다. 모든119게임의 전체 카드 앞면·실제 인쇄판 기하·전체 연결·모든 규칙/판본/수량을 확인한 것이 아니다. AI prompt/사진 판독 정확도·현재 UI·저장 데이터 변환은 이 결과로 검증되지 않는다. 실제 사용자 데이터/PIN/사진/키/모델 호출·운영 프로세스에 접근하거나 변경하지 않았다.

이 폴더의 작성과 검수 소유권을 감독에게 반환한다. 제품 교정은 별도 승인·담당 파일 경계에 따라 적용해야 한다.
