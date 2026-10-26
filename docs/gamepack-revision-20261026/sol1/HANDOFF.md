# Sol1 동결 인계 — 2026-10-26

사용자의 Cloud Claude 인계 지시에 따라 새 조사를 중단했다. **전체 규칙·판본 검증 완료 게임은 0/56**이다. 56개 모두 현재 스펙/프로필과 기존 부분 근거를 점검했으나, 원문 규칙 전체 대조가 남아 `PARTIAL`로 표시했다. 미착수 ID는 0개(기존 스펙의 개별 점검 기준)이며, 규칙 우선 개정의 잔여 작업은 56개 모두다. 부분 근거로 실제 원본 수정이 끝난 ID는 다음 7개다.

`a-feast-for-odin`, `arkham-lcg`, `concordia`, `dixit`, `grand-austria-hotel`, `pandemic-legacy-1`, `splendor`.

각 수정의 정확한 근거·제안/사실 구분은 [README.md](README.md), 전체 56행의 source URL·판본·현재 영역/필드·미확인 항목은 [review.json](review.json), 14개 수정 원본의 수정 전후 SHA는 [freeze-manifest.json](freeze-manifest.json)에 있다. 나머지 49개는 이번 턴에서 source 파일을 수정하지 않았으며 **정확성이 승인된 것은 아니다**. 제품/서버/공유 타입/생성 팩/사진 정의/사용자 저장본은 수정하지 않았다.

검사 근거:

- 56개 고유 지정 ID, 각 source/profile의 area·component·field·source·correction 참조 오류 0 (`finalize_review.py`).
- 지정 프로필 56개의 구성물 ID, typed key 중복/누락 오류 0.
- 전체 source validator 종료 0, 120/120 구조 유효, `factualVerification=false`. 이것은 규칙 검증의 대체가 아니다.

생성·저장 주의: 일곱 게임의 `pinned_source.runtime_match=false`는 **새 source가 아직 생성 게임팩/런타임에 반영되지 않았음**을 뜻한다. 새 버전을 생성할 때 기존 pinned 팩과 저장값을 그대로 읽을 수 있어야 한다. 특히 Pandemic Legacy의 기존 비공개 `players.scene`에 혼합된 인물 기록 및 Arkham LCG의 기존 숨김 `hidden.scene`에 섞인 버림더미를 자동 공개·이동하지 말고 사용자 확인을 거쳐야 한다. Grand Austria Hotel은 2015 공식 규칙과 지정 소매 판본의 차이가 남아 있다. 검색 색인으로 확인한 Arkham LCG 최신 대용량 PDF 두 개도 전체 열람은 하지 못했다. 49개 미수정 게임 역시 검색 발췌/제품 소개 중심의 근거와 남은 `gaps`를 Cloud Claude가 판본별 공식 본문으로 확인해야 한다.

동결: 추가 변경, 재생성, 커밋/푸시를 하지 않았다. 통합 담당이 manifest의 해시와 실제 수정 범위를 대조한 뒤 다음 소유권을 배정할 수 있다.
