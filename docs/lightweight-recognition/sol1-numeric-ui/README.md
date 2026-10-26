# 카탄 숫자 전용 UI 인계

**VERIFIED:** 격리 stage의 6파일 변경. 기본 AI를 유지하고, 카탄 기본판의 현재 공용 판 사진에서만 `catan-numerals-v1`을 명시 선택한다. task capability가 없으면 숫자 읽기를 차단한다. 원본이 기본이며, ‘맞춘 판’은 별도 선택과 현재 사진의 확인된 기준점이 필요하다. 프로필은 클라이언트에서 보내지 않는다.

집중 검사 **23/23, exit 0**, `tsc --noEmit` **exit 0**. 작업 상태·숫자 후보·보류 수는 저장된 job/receipt 기준이다. 후보 없음/모두 보류·실패·stale·interrupted도 구분한다. U1 복수 도둑 저장 guard 회귀는 계속 통과한다.

**실제 CUA:** 새 합성 세션 `022ed696-6ab1-4f42-841a-03251ddac5df`에서 선택 → 원본 모의 job 1회 → 숫자 2→3 정정 → 명시 반영 → 저장 → reload 성공. 기존 수동 도로 1개 유지. 390×844와 360×800 페이지 가로 넘침 0, viewport 원복. [정정 화면](correct-390.png), [재열기](reopened-390.png), [360 선택](controls-360.png).

**보조 API GET:** accepted와 snapshot 값·영수증 동일. 숫자 18개 미배치 유지, 정정값 3은 3개/2는 0개. 원 관측값 2는 receipt에 보존. 사용한 projection 소비, 별도 기존 pending 1개 보존. [실행 결과](saved-api.json).

**한계:** 1px 합성 사진에 과거 D2 응답을 오프라인 재생했다. 실제 모델 호출 0, 사진 정확도·속도·geometry 성공 근거가 아니다. frame이 있는 원본/atlas 전송은 집중 mock 회귀, CUA는 frame 없는 원본 경로다. Vite HMR websocket 오류는 기존 preview 환경 한계로 기록했다. 전체 suite/build·배포는 수행하지 않았다. GT/confirmed frame 동결본은 SHA 불변이다.

정확 pre/post SHA·immutable snapshot·patch는 [최종 인계 JSON](../sol1-numeric-ui-implementation.json)에 있다. 이전 U1/R1R2 증거와 별도 delta이며 공유 main에는 적용하지 않았다.
