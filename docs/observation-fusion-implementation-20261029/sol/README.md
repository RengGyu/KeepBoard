# 관측 결합 구현 인계

**VERIFIED — 소스 7개 동결, 외부 모델 호출 0.** 기존 generic typed projection에만 결합을 연결했다. Catan/Rummikub/Splendor native는 기존 경로를 유지한다. `handoff.json`에 정확한 시작/종료 SHA와 검사 명령, `product.patch`에 작업 시작 dirty 소스 대비 자기 delta가 있다.

| 저장된 사례 | 부분 AI 참조의 개별 대응 전→후 | 편집 항목 전→후 | 별도 속성 |
|---|---:|---:|---|
| Cascadia | 18→39 / 39 | 30→50 | 집계1은 비가산 부분 상세화; 잔량 미추정 |
| Sagrada | 21→21 / 21 | 23→23 | 눈 일치 1→15 / 19; 나머지4 자동교정 없음 |
| Splendor Duel | 0→25 / 25 | 0→25 | 기존 관측의 색 용어 그대로 유지 |

새 정답 개수나 전체사진 정확도를 뜻하지 않는다. 설계에 사용된 같은 3사례와 부분 AI 참조를 재생한 개발 결과다. 총 원관측136개가 편집 대상·미연결·상세화 중 하나로 모두 보존됐고, 부분 참조로 평가 가능한 교차 대응37개에서 오연결0/중복후보0이었다. 나머지 미주석 영역의 precision은 미확인이다.

- `replay-before.json`: 수정 전 별도 소스 사본으로 실행, 당시 저장 제품값과 일치.
- `replay-after.json`: 현재 제품 projector·decoder, 6 원응답 SHA, 역순/재전달/JSON 왕복/원문불변/typed record/관측 회계 검사.
- `focused.log`: 단위/UI 19/19. 같은-unit 이웃, 겹침 사슬, 집계 경쟁·다음 job 상세화, 수동 null/0/false/배치/삭제, 이전 job의 원관측 근거 표시 포함.
- `native-http.log`: 기존 native/receipt/클라우드 재전달과 새 loopback HTTP 16/16.
- `http-final.log`: 마지막 fake-wire 타입 교정 후 해당 HTTP 1/1 재확인. 합성 임시 Store에서 자동반영→null·수량0·수동위치 정정→PATCH/저장/GET→다음 job 보존, 진행 중 수동변경 뒤 늦은 job stale 거절. 모델 정확도 검사가 아니다.
- `typecheck.log`: `npm run typecheck` exit0.

선택된 임시값·다른 읽기·부분 상세화는 접힌 한국어 근거로 표시하며 필수 확인/입력을 추가하지 않았다. 원응답·provider·prompt·팩은 변경하지 않았다. 다른 원본/미등록 시점은 보류하고, quantity1/kind/bbox 자체가 틀리면 결합도 틀릴 수 있다. 기존 저장본에 digest가 없으면 보수적으로 유지한다.

**REPORTED — 감독 통합검사:** 전체827 중825 PASS/2 FAIL. 실패는 `tests/splendor-record-ui.test.ts:54,67`의 점수 input 기대와 현재 qp-stepper output 불일치이며 본 소유권 밖이라 수정하지 않았다. `build:vercel` exit0, 저장된3사례 독립 재생 PASS. 실제 Chrome 사그라다 수정 없이 저장/재열기는 감독 검수 중으로, 완료를 아직 확인하지 않았다. 독립 검수 중 추가 제품 변경이 필요하면 동결 해제 후 별도 SHA를 남긴다.
