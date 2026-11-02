# 1차 구현 독립 검토

**판정: 읽힌 물체 1개 회수는 재현됐지만, 두 일반 경계를 보완해야 한다.** 판독 자체의 미검출·숫자 오독은 이번 결합 변경으로 해결되지 않았다.

- **VERIFIED — 실제 저장응답 재생:** 동결 preimage와 5파일 패치를 private 사본에 복원하고 모든 post SHA를 대조했다. 같은 20응답·동결 AI 부분 기준에서 개별 회수 **103→104/147**, 카르카손 **20→21/31**, 다른 9게임 회수 수 불변. raw **341개** 보존, 완료순서 역전·동일 단위 재전달 결과 동일. [독립 집계](independent-review.json), [수정 전](independent-before-scores.json), [동결 1차 후보](independent-frozen-first-scores.json), [원본 해시/재생 사본](offline-first-slice-manifest.json).
- **VERIFIED — 합성 경계:** 같은 표면으로 연결된 두 묶음을 `aggregateKey`가 두 부모로 세어 제3 crop의 개별 물체를 막는다. 또 퇴역된 묶음의 관계가 다음 job에 이어지지 않아 동일 원본의 whole-only 판독 때 부모+자식이 다시 함께 편집물로 나온다. 사진 품질 실측이 아닌 코드 경계 재현이다. [재현](independent-boundaries.mts), [결과](independent-boundaries.json).
- **RECOMMENDATION — 최소 후속:** 이미 증명된 묶음 cluster의 결정적 대표키로 부모를 세고 전체 cluster를 한 번 퇴역시킨다. 기존 refinement와 원출처를 이후 같은 scope/source job까지 보존한다. 단순 포함, 종류만 같은 겹침, 사진별 오차 허용값으로 병합하지 않는다. 수동 수정·삭제한 자식/부모의 의도를 우선한다.
- **RECOMMENDATION — 수량 차이:** 같은 가시 묶음의 서로 다른 관측 수량은 합산/교체하지 않고 기존값을 유지한다. 두 관측이 모두 알려진 값이고 서로 다르면 기존 선택적 provenance에 `quantity` 충돌을 남긴다. `null`은 0이나 모순으로 간주하지 않는다. 추가 확인 화면·저장 차단은 필요 없다.
- **UNKNOWN/잔여:** Quacks의 물방울 종류 간 중복은 기존 기하 조건으로 미해결이다. 임계값을 사례에 맞춰 내리지 않는다. SCOUT 중복 후보와 기준 의심은 확정 오류로 합산하지 않는다. group↔group의 실제 회수 이득은 기존 20응답에서 확인되지 않았다. 그룹 표면 정보와 개별 배치 완성을 구분한다.

솔의 focused/type/build/HTTP 통과 주장은 별도 REPORTED이며 여기서는 동일 실제 응답의 오프라인 재생과 위 합성 경계만 직접 확인했다. 다음 delta는 구현솔이 소유하며 이 검토자는 제품을 수정하지 않았다.

새 3사진×3조건은 입력·부분 기준·요청이 동결됐지만 **자동 승인 검토가 외부 사진 전송·유료 사용·키 읽기의 직접 승인을 확인하지 못해 실행 전에 거절**했다. 신규 호출 0, 사용자 직접 승인 대기. 승인 전에는 전송하지 않는다. [차단 기록](approval-block.json).
