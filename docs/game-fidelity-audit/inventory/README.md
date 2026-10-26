# 기계적 게임 명세 위치 색인

119개 게임의 판본·명세 필드·아트 매핑·기존 원문 위치를 찾기 위한 인덱스입니다. 규칙 사실의 참·거짓이나 공식 출처의 완전성을 판정하지 않습니다.

## 파일

- `build_inventory.py`: 표준 라이브러리만 사용하는 재생성 스크립트. 네트워크 접근이나 다운로드를 하지 않습니다.
- `inventory.json`: 게임별 선택 판본, source_refs, official URL 레코드, 구성물·판 구역 JSON 위치, 이미지 매핑 키, 기존 원문 경로.
- `claims.csv`: 원문 필드 값과 JSONPath를 한 행씩 제공. `value_json`은 입력 JSON 값을 그대로 JSON 인코딩합니다.

## 재생성 및 확인

```sh
python3 docs/game-fidelity-audit/inventory/build_inventory.py
```

입력 명세 **120개**, 루미큐브 제외 후 **119개 unique game_id**, 누락 **0개**. JSONPath claim **61020개**를 실제 JSON 값과 대조했고 경로 오류는 없습니다.

## 분류별 색인 행

| 분류 | 행 | 게임 수 |
|---|---:|---:|
| `board_area` | 7490 | 119 |
| `component` | 5445 | 119 |
| `edition` | 594 | 119 |
| `local_source` | 83 | 48 |
| `mapping_area` | 7643 | 119 |
| `mapping_color_role` | 1903 | 119 |
| `mapping_component` | 9301 | 119 |
| `mapping_image` | 2742 | 119 |
| `official_source` | 1086 | 119 |
| `rule_topic` | 4322 | 119 |
| `source_ref` | 1509 | 119 |
| `state_field_topic` | 18902 | 119 |

## 원문 주제 태그(중복 가능)

| 태그 | 행 | 게임 수 |
|---|---:|---:|
| `board_area` | 21171 | 119 |
| `color` | 1197 | 119 |
| `number_range` | 603 | 119 |
| `quantity` | 7082 | 119 |

## 출처 연결 범위

- Edition source_refs: 119/119가 게임 명세의 `sources` ID와 연결됩니다; 118/119가 공식 URL 레코드와 연결됩니다.
- Official URL이 색인된 게임: 119/119 (100.0%).
- 기존 파일 경로가 있고 실제 파일이 존재하는 게임: 48/119 (40.3%).
- source-recovery receipt 메타데이터 비교: 3건. URL/path/bytes/SHA 비교 개수는 inventory.json에서 확인할 수 있습니다; 이는 규칙서 내용 검수가 아닙니다.

## 한계

원문 파일이 인덱스에서 game_id 또는 정확한 공식 URL로 연결되지 않으면 임의 추정하지 않고 해당 게임의 기존 원문 목록을 비워 둡니다. 존재하지 않는 경로는 `exists: false`로 표시합니다. 해시·confidence·기존 상태값은 새 검수 통과를 뜻하지 않습니다.
