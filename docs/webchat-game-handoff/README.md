# 웹챗 Pro 전달 패키지 — 완료

[ZIP 다운로드](KeepBoard-WebChat-Pro.zip) · [복사할 요청문](guide/REQUEST-KO.md) · [시작 안내](guide/START-HERE.md)

ZIP을 첨부한 뒤 요청문을 복사하세요. 첫 대상은 예시로 `carcassonne`이며 원하는 gameId로 바꿀 수 있습니다. 나머지 117개는 작은 batch로 진행하도록 요청했습니다.

## VERIFIED 검사 결과

- ZIP 2,322,299 bytes (약 2.32MB), 833파일, CRC 무결성 PASS.
- 120게임 ID 중복0, 대상117 ID 중복0. catan/rummikub/splendor 제외 정확.
- 120판본/sourceSHA 일치, 필드/binding/component/출처 JSON 및 CSV 기계추출.
- 120 아트 mapping /437 component 분류, 532 asset manifest 항목의 참조 파일 모두 존재. SVG는 중복참조를 제외한 504파일 XML 파싱 PASS.
- JSON254 파싱 PASS; snapshot820파일 원본 바이트일치; 모든 MANIFEST SHA 일치; 안내문 정확경로 참조 존재.
- 명시 소스/데이터/벡터 allowlist만 첨부. 운영 Store/설정/env/키/실사진/raw/배포문서/백업 미첨부. 제품 수정0.
- `python3 docs/webchat-game-handoff/build-package.py` exit0.
- `python3 docs/webchat-game-handoff/verify-package.py` exit0. 상세: [verification.json](verification.json).
- ZIP SHA256: `c8415b80fb60a5a1440196518cb856735a7cb5b3c5368bdd22987bd7b6c2afe7`.

## 계약/한계

현재 공통 판독118/native2와 Splendor strict readout을 실제 코드로 설명했습니다. 새 타게임 readout registry는 제안이며 현행 API와 구분했습니다. 현재 120팩/연구 원문과 실제 아트 전체 참조를 포함했지만 앱 전체 코드는 아닙니다. 실제 누락 상대 import45개를 DEPENDENCIES.md에 명시했습니다. 독립 앱처럼 실행된다고 주장하지 않습니다.

현행 타입의 수동 합성 Splendor null/0 fixture를 포함했습니다. 실제 규칙 전수연구/실사진 정확도 평가/모델호출/앱빌드/운영변경은 수행하지 않았습니다. 코드·이미지·게임 데이터는 읽기전용으로 복사했고 작성 범위는 이 폴더뿐입니다. 파일 소유권 반환.
