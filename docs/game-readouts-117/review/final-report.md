# 117게임 readout 독립 검토 · 최종

**VERIFIED · bounded semantic 검토에서 남은 P0/P1/P2 finding 없음. 원 ZIP에서 확인한 P2 1건은 아래 격리 수정판에서 해결을 직접 확인했다. 최종 출시 승인·117게임 규칙/실사진 정답 보증은 아니다.**

## 원 ZIP 검토

원 ZIP SHA256 `5448d0646a76b5cda41dc88f13fb8e81b0389614a98a57ff4c8c85f9275a8fed`. 구현솔 사본·결론을 받기 전에 안전 추출 후 현재 저장소 계약과 독립 대조했다. [최초 근거·재현](independent-review.md).

- 읽기 전용 preimage 검사: **280파일 일치**, 충돌0. **117개** sourceSHA/edition/packVersion 일치. 수집 binding 대조 **408연결/10제외**이며 새 hidden/role-limited 수집 확대는 확인하지 못했다.
- pure 검사: legacy408, unknown408, populated typed408, fresh-AI normalize→validate408에서 오류0. 생성 fixture의 정합성 증거이며 실제 게임 정답의 독립 검증이 아니다.
- 본인 fresh temp Store의 Odin 공개/개인 합성 자료 save/load·Store export/import에서 typed/snapshot/pinned-pack JSON 보존. 현재 redaction helper에서 잠긴 owner의 assertion/사진 비노출 확인. HTTP PIN/room/restore 실행 성공으로 확대 해석하지 않는다.

## P2 R117-01 · 해결 확인

**원 문제:** UI는 observation의 원본 재선택을 막지만 저장 validator는 같은 readout을 photo-a→photo-b로 옮겨도 통과했다. 권한 밖 사진 노출이나 일반 UI 자동 변경을 발견한 것은 아니다.

**검토 수정판:** `/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-readouts117-c1m86t7o/app`를 허가 후 read-only로 확인했다. `shared/readouts/registry.ts:89–96`의 `validateReadoutEvidenceChanges`가 동일 piece ID의 남은 원래 observation값과 원본 변경을 비교한다. `server/engine.ts:88–96`은 같은 field/owner의 accepted/candidate만 모아 이 검사를 호출한다. manual answer 및 `/accept` 연결을 읽었다. import는 기존 레코드를 재귀속하는 전이가 아니므로 같은 이전값 대조를 강요하지 않는다.

**독립 in-memory `answerField` 재현 6/6 확인:**

| 조건 | 직접 결과 |
|---|---|
| 기존 observation 그대로 원본 변경 | 거절, 기존 accepted 불변 |
| 동일 사진 정정 | 허용 |
| 모든 남은 값을 명시적 user로 재확인 후 재연결 | 허용 |
| readout 없는 legacy 원본 재연결 | 허용 |
| 새 실물 ID의 새 후보 | 허용 |
| 동일 ID가 prior candidate인 경우 | 원본 재귀속 거절 |

수정판 SHA256: registry `39af8efea308c2e6f0fe74be3e5886489d8e554927a719a1f35e1b6c951a25e2`, engine `a3710331ff0163057cd908e3137bd9f2b27f2b769a6dfda7d71d2803cb753d62`.

`tests/game-readout-integration-api.test.ts:13`의 API 반례/수동 재확인 검사도 읽었다. 해당 API 테스트와 전체 suite/build는 재실행하지 않았다. **REPORTED:** 통합worker의 559/559·build0은 감독이 전달한 결과이며 본 검토의 semantic 결론을 대체하지 않는다.

## 범위·반환

제품·통합 사본·테스트·설정 수정0, 전체 suite/build/실AI/운영 API/Store·키·사용자 사진 접근0. 독립 temp에서 작은 probe와 보고서만 작성했다. 새 게임 규칙/유형 전수 연구나 스타일 검토로 확대하지 않았다. **미확인:** 최종 앱 전체 브라우저 흐름, 실제 PIN/rooms 재접속, 실사진 정확도. 추가 필수 차단 확인은 없다. 보고서 동결·소유권 반환.
