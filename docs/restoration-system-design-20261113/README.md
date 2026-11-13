# KeepBoard 전체 복원 설계

**상태: 연구·설계 완료 제안. 제품 구현·새 사진 판독·제품효과 측정은 하지 않았다.**

기준 HEAD `fedc73535240933f287da30b2d7374e064e18814`, 제품 변경 `818c7f1`. 작업 권한은 [task.md](task.md). 원사진 3장, 고정 응답 9개, 최신 구조/화면, 관련 제품 경로를 직접 확인했다. 120종 전체 규칙·사진 정확도 인증은 아니다.

**핵심 결론 — 판독과 그림 사이에 “전체 장면” 계약이 필요하다.** 현재 구현은 관측값을 보존하고 판·줄 연결을 상당 부분 회복했다. 그러나 `GameEssentials → GameBoardRecord`는 필드별 표시이고 `EstimatedBoardView`는 판별 줄 목록이다. 판 사이 관계, 판이 안 읽힌 영역, 여러 필드에 걸친 한 무리, 복원에 중요한 진행 문맥을 하나로 표현하지 못한다. 최근접 임계값만 조정해서 해결되는 범위가 아니다. [문제 지도](problem-map.md)

주요 확인과 제안은 다음과 같다.

- **VERIFIED:** 게임 지식·아트는 이미 있다. 다만 원명세의 공간 설명, `board.json`의 `tableModel/tableZones`, 모델 입력, 파생 배치가 하나의 실행 계약으로 연결되지 않는다. 7W는 판 자산에 전체 테이블 의미가 있지만 현재 공간 정의가 없다.
- **VERIFIED:** 기존 9응답의 literal 회전은 모두 null이다. Sagrada low는 창문 관측 없이 전경 18개를 draft로 분류했다. LC 일부 bbox는 숫자 범위 검증을 통과해도 실제 대응이 유보된다. 구조 코드가 새 값을 읽거나 없는 판 관측을 만들 수는 없다.
- **RECOMMENDATION:** 원관측 → 게임팩 기반 장면 관계/가설 → 가독 표시 계획을 분리한다. **표시 구역은 실제 판 identity 없이도 존재**할 수 있다. 추정 구역에 묶었다고 owner·정식 칸·원래 값이 확정되지는 않는다.
- **RECOMMENDATION:** 기존 renderer·아트·정정·저장 경계에 장면 합성기를 추가한다. 한 판/묶음의 확인을 관련 구성물에 전파하며 원값 수정은 기존 편집기를 호출한다.
- **UNKNOWN:** 새 구조 입력의 실제 판독 이득, 새 장면 일반화, iPhone Safari 종단 사용성·시간·비용. 기존 1,430검사나 363관측 대조로 이를 인증할 수 없다.

**먼저 구현할 묶음은 T1–T4 “기존 응답으로 전체 평면 + 묶음 정정 + 저장/재개”다.** 새 유료 호출 없이 현재 성공한 연결과 미확정 구역을 같은 가로 작업면에 보여주고, 한 번의 판/그룹 수정이 재열기까지 유지되게 한다. 기존 120종 표시 경로는 유지하고 공통 영역 계약부터 연결한다. 이후 T5–T7에서 지식·판독 입력과 필요한 부분 판독을 보강한다. 전120종 규칙 재조사나 30초 달성을 선행조건으로 삼지 않는다. [구현 카드·순서](implementation-plan.md)

| 문서 | 용도 |
|---|---|
| [problem-map.md](problem-map.md) | 현재 결함, 해결된 것, 자료 부족의 경계 |
| [technical-design.md](technical-design.md) | 대안, 알고리즘, 모듈, 저장·호환·실패 처리 |
| [contracts.md](contracts.md) | 제안 TypeScript/JSON 계약과 불변식 |
| [walkthroughs.md](walkthroughs.md) | Sagrada/LC/7W 세로 관통 및 다른 구조군 재사용 |
| [validation-plan.md](validation-plan.md) | 관측/실물/관계/유보 분모와 새 장면 반례 |
| [evidence.md](evidence.md) | 직접 코드·사진 확인, 1차 규칙 자료, 미확인 사항 |
| [evidence-summary.json](evidence-summary.json) | 현재 데이터의 기계적 집계 |
| [source-manifest.json](source-manifest.json) | 조사 대상 원자료·제품 71파일 SHA-256 |
| [design-validation.json](design-validation.json) | 문서 링크·계약 예시·원자료 무변경 확인 결과 |

추천은 설계자의 판단이며 사용자의 구현 승인으로 간주하지 않는다. `PROJECT_CONTEXT.md`와 작업 세션 기록은 감독 소유다.

문서8개와 계약 TypeScript 예시6개를 검토했고 보호 대상71파일의 hash가 모두 동일했다. 제품 diff는 없다. 문서 폴더는 기존 Git ignore 대상이므로 이번 산출물은 로컬에 작성했으며 추적 설정을 바꾸지 않았다.
