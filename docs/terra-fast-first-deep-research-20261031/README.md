# 빠른 1차 판독과 선택적 Terra 보강: 결론

2026-10-31 · 연구 Astra · 제품 수정 0, 신규 모델/API 판독 0, 가중치 설치·실행 0.

**권고: 브라우저의 전용 OCR·기하 처리가 위치와 문자 후보를 먼저 만들고, Terra는 종류·문양·관계 및 어려운 부분의 의미 판독을 맡는 혼합 구조를 개발한다. 다만 최초 버전에서는 기존 Terra low 전체 판독을 병행 유지한다.** 전용 검출기의 게임 물체 회수율이 확인되지 않았으므로 이를 즉시 없애면 처음부터 놓친 물체를 복구할 경로가 사라진다. 전체 high를 모든 사진에 기본 적용하는 안, low 완료 후 반드시 crop-high를 이어 붙이는 안은 우선안으로 권하지 않는다.

이번 조사의 새로운 근거는 다음과 같다.

- 공식 저장소의 **PaddleOCR.js 0.4.2 소스**에 브라우저 Worker·WebGPU/WASM 및 `검출 → 실제 픽셀 crop → 문자 판독` 구현이 있다. PP-OCRv6 small ONNX 두 모델은 합계 약 31.1 MB이며 Apache-2.0로 제공된다. **폰·보드게임에서의 속도와 숫자 정확도는 아직 UNKNOWN**이다. SDK의 기본 반환값은 빈 OCR의 위치를 버리므로, 누락 탐지용으로 쓰려면 검출 polygon을 별도로 보존해야 한다. npm 게시본은 접근403으로 미확인이다. [공식 구현](https://github.com/PaddlePaddle/PaddleOCR/tree/dab3fe35379033fdcb2d0e9572fac0b36c9a9ebf/paddleocr-js), [논문 §3.4](https://arxiv.org/html/2606.13108#S3.SS4)
- 실제 보드 상태 복원 구현인 **chesscog**는 판 정합·칸 점유·기물 종류를 분리한다. 그러나 새로운 기물 외형에는 적응 학습이 필요했다. 이 사례는 역할 분리의 근거이며, 120게임을 무학습으로 읽는다는 근거는 아니다. [논문 §4–5](https://pmc.ncbi.nlm.nih.gov/articles/PMC8321354/)
- 원응답 9개의 SHA를 확인한 오프라인 집계에서 **관측값으로 확정한 오독과 아예 출력하지 않은 물체**를 구분했다. `unknown` 항목만 다시 읽어서는 둘을 충분히 겨냥할 수 없다. 반대로 이름을 알 수 없는 타일 등의 모든 unknown을 재판독하면 불필요한 호출이 커진다. [재현 결과](offline-audit.json)
- 현재 KeepBoard는 이미 최대 6단위 병렬 호출과 첫 완료 단위 overlay를 제공한다. 현재 병목을 해결하려면 **읽을 작업과 생성할 출력 자체를 줄이고, 전체 완료 전 편집 가능한 초안을 제공하는 계약**이 필요하다. 단순한 병렬화·SSE 추가가 같은 개선은 아니다.

첫 구현은 **한 장의 사진에 대한 OCR polygon/문자 증거 → 기존 게임팩의 보이는 속성과 연결 → 누락·충돌 이유가 있는 작은 ROI만 보강하는 실험 모드**로 한정한다. 카탄 인쇄 숫자와 카드형 게임의 문자/숫자를 포함하되, 주사위 눈·색 말·문양은 OCR 성공으로 세지 않는다. 숫자·위치만 읽힌 후보를 완성된 판으로 표시하지 않는다. 새 반복 확인 버튼 없이 기존 정정·저장·재개 흐름에 연결한다.

**속도·품질 개선은 아직 가설이다.** 기존 whole-high는 사진별 79.1–174.4초였고, D crop-high 3회 wall 97.0초는 재사용한 whole-high 시간을 포함하지 않는다. 62개 선택 표본 회수는 전체 장면 정확도가 아니다. 새 구조의 휴대폰 준비 시간, 추가 판독 비율, 첫 편집 시간, 실제 정정·복원 시간은 새 사진으로 비교해야 한다.

| 문서 | 내용 |
|---|---|
| [research.md](research.md) | 대안 비교, 설계, 처리 흐름, 정확도·대기·비용의 한계, 현 코드 연결 |
| [primary-sources.md](primary-sources.md) / [evidence.json](evidence.json) | 논문 방법·실측 조건, 공식 코드 위치·판본·라이선스, 적용/배제 근거 |
| [implementation-cards.md](implementation-cards.md) | 기존 구현솔이 실행할 최소 수직 구현과 후속 단계·수용 조건 |
| [evaluation-plan.md](evaluation-plan.md) | 새 사진 선정·정답/분모·라우팅·속도·복원 비교, 제한된 후속 호출 제안 |
| [offline-audit.py](offline-audit.py) / [offline-audit.json](offline-audit.json) | 이번 무과금 원응답/출력량 점검과 시간 산술. OCR 성능 실험 아님 |
| [input-inventory.json](input-inventory.json) / [validation.json](validation.json) | 검토 시점 제품 해시와 산출물 검사 |

검증 표기: **VERIFIED**는 직접 읽은 코드·원응답/공식 자료의 해당 사실, **INFERRED**는 그 근거에서 도출한 설계 판단, **UNKNOWN**은 미측정 항목이다. 다른 논문의 수치를 KeepBoard 성능으로 사용하지 않았다. 현재 공유 소스를 읽었으며 실제 배포 상태를 조회하지 않았다.
