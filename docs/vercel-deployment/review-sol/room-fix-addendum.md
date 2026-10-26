# R1 교정 재검토

**VERIFIED: 검토한 cloud + BlobStore 경로에서 R1 교정 확인. 남은 필수 문제는 이 delta 범위에서 발견하지 못했다.**

- 동결 manifest 2파일 SHA 일치: index `2ed5c8d2…3861c1d`, test `75099606…88d607`. 생성 경로는 기기 hash와 createRequestId를 함께 SHA256해 안정적 room ID를 만들고, Blob create-only CAS 충돌 시 같은 의도·같은 방장 hash인 승자만 반환한다. 다른 기기는 다른 ID이며, 임의 winner의 소유권을 빌려 반환하는 fallback이 없다.
- 새 동결 `/api/rooms` handler 본문을 그대로 추출·TS 변환해 실행했다. 독립 BlobStore 2개가 동시에 미존재를 읽게 한 결과 **방1 / 반환 ID1**, 동일 requestId라도 다른 기기는 별도 방·타 방 actor 거절, 잘못된 방장 hash의 충돌 winner 반환 거절: **집중 3/3 PASS, exit0**. [fixture](room-fix-recheck.mts), [결과/SHA](room-fix-results.json).
- fixture의 createSession은 실제 CAS 저장 구간만 좁게 주입했고 origin/engine rendering/HTTP는 실행하지 않았다. 기존 동결 rooms/BlobStore/MemoryObjects를 재사용했다. 이는 HTTP 통합 통과 주장과 구별한다. 구현자의 독립 HTTP2 RED→GREEN 및 집중6/6은 **REPORTED**이며 본 검토에서 반복하지 않았다.
- createSession의 stable ID 인자는 cloud 방 생성 경로에서만 전달된다. 별도 byte reader/inline analyze 수정은 R1 밖이므로 확장 검토하지 않았다. 원본 제품/동결본 수정0, 외부/실 AI 호출0, 전체회귀 미실행. R1 범위 소유권 반환.
