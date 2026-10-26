# 실물 연결 backend 독립 의미 검토 / R1 재검토

**판정: R1 CLOSED.** 최초 동결본에 실제 실물 중복 복원 결함1건을 발견·보고했다. 교정 delta는 같은 단일기기/방 반례를 상태 변경 없이 거절하며, 정상 같은 범위 복원과 같은 후보 재전송은 유지한다. 아래 집중 범위에 한정하며 전체 출시 승인이나 모바일/AI 정확도 검증은 아니다.

## 고정 근거

- 최초 `470f6b5cfdc1f7cfbe1eb0010a72f320e77939d7565da5c35383722f2400a2f1`, parent5598415f. manifest1344파일 SHA drift0,14변경/patch `93f4d00ba2040c4e688faf651c2a9f600b13366993150165d30731868918a093` 일치.
- R1 delta는 runtimeResume와 HTTP test2파일. 결합 manifest1344파일 drift0, 직접 계산 digest **bfb1572283c5e559be971602b7a0d6788dacb0117e0356cf7af528faabb90c3d** 일치. runtimeResume SHA `e12f40cd7439ff30504e8cfb28156b2ee3cbb455ba59e83db155fee964f44121`, delta patch `92d93a9ebc746ecd1a00ca5c710615fef8f97a36ebd3d0142d9fa8e9af8f90d2` 일치.
- 제품 수정0, 운영 데이터·사진 읽기0, AI/네트워크 호출0. 최초 결과와 delta는 따로 보존했다. 실행 root는 구현자 delta 적용으로 바뀌었으므로 기존 probe를 지금 실행하면 최초 상태 재현이 되지 않는다. 각 결과의 sourceDigest를 따른다.

## 발견한 실제 R1

기존 확정 market 카드에 아직 linkOrigin이 없는 상태에서 공용 저장 → 같은 카드를 개인 reserve로 명시 이동 → 예전 public snapshot 복원. 최초 `server/runtimeResume.ts:19`는 linkedComponents만 중복 검사하여, **복원된 unlinked 원본**과 유지된 private linked 카드를 같은 실물로 보지 못했다. 같은 ID/evidence 카드가 시장과 예약에 동시에 존재했다. 후보가 아닌 기존 accepted 기록도 지원하는 정상 입력이다.

`node --import tsx docs/game-state-linking/review-sol/probe.mts`: 최초 소스에서 exit1. 후보 연결/동일 재전송1 PASS, 단일기기와 room 복원2 FAIL. [probe-results.json](probe-results.json). 실제 linkComponents/answerField/resumeSnapshot을 사용했고 snapshot 데이터 멤버만 commit과 같게 합성했다. **HTTP/Blob 실행을 주장하지 않는다.**

## 교정 의미

delta `server/runtimeResume.ts:19–25`는 accepted 실물을 `(origin assertion ID 또는 최초 assertion ID, origin piece ID 또는 현재 piece ID, evidenceId)`로 비교한다. 충돌 중 하나가 명시 연결된 경우 session.assertions를 대입하기 전에 거절한다. 과거 unlinked source도 알려진 동일 실물로 잡히며 관련 없는 legacy 중복을 자동 이행하지 않는다. source/destination 권한이나 PIN을 완화하지 않는다.

`node --import tsx docs/game-state-linking/review-sol/r1-recheck.mts`: **exit0,3case 통과**. 같은 범위 정상 복원 후 명시 이동 → 문제의 public 복원은 단일기기/방 모두 거절, 전체 session JSON 전후 동일, private 카드1개 유지. 후보 원문 보존/동일 요청 재전송도1개만 유지. [r1-recheck-results.json](r1-recheck-results.json).

구현자 HTTP RED2→GREEN7/typecheck는 delta manifest의 **REPORTED** 근거이며 독립 HTTP 재실행은 하지 않았다. 연결된 코드의 권한·CAS·표시 경계를 읽었지만 전체 회귀/브라우저/Blob 분산 실행은 새로 검증하지 않았다. 좁은 R1 교정에서 남은 필수 반례는 발견하지 못했다. 소스 변경 없이 소유권을 반환한다.
