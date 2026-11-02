P0 구현을 동결했습니다. `handoff.json`은 dirty 작업 시작점 대비 정확한 6파일 pre/post SHA와 `implementation.patch`를 기록합니다. 기존 작업/원응답/모델·프롬프트·게임팩은 바꾸지 않았습니다.

- 겹침·다른 시점·상자 없는 관측은 optional `unresolvedGroups`로 보존합니다. 묶음은 실물 정체성이나 수량 확정이 아닙니다.
- 실제 저장 응답 재생: 항구 8관측 = 편집후보 6개 + 미해결 2관측/1묶음. 120순열 동일, 단위 재전달 멱등, 원문 불변입니다. 전체 구성물 수를 정답 수량으로 주장하지 않습니다.
- 그림 바로 아래 한줄 종류·핵심값·관측수 요약을 표시하며 개별 속성/원사진은 기본 접힌 상세에서 봅니다. 필수 확인이나 입력은 없습니다.
- 직접 집중 27/27, `npm run typecheck` exit0. `focused-approved.log`와 `replay-final.log` 참고. 최초 sandbox 실행은 loopback EPERM 2건으로 실패했고 승인 후 같은 회귀가 통과했습니다.
- 실제 API/모델 호출 0. 작업자 UI 검사는 SSR이며 브라우저·전체 suite/build·live 재시험은 감독 소유입니다. P1/P2 보드정합/위치 정확도는 미검증입니다.

`freeze.py`는 기존 baseline과 private preimage snapshot으로 자기 delta만 생성합니다. git/index를 변경하지 않습니다. 재생 명령은 `handoff.json`에 있습니다.
