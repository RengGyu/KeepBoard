# high 조건 재개 상태

**실제 결과: 새 high 실행도 자동 승인 검토에서 프로세스 시작 전에 거절됐다. 신규 요청 0, 원응답 0, 키 읽기 0이다.** medium은 실행하지 않았고 이전 준비·차단 기록을 보존했다.

거절 사유 원문:

> 이 실행은 공개 사진을 외부 Terra API로 최대 9회 전송하고 기존 키를 사용하며 비용이 발생할 수 있는 고위험 외부 전송입니다. 제시된 high 재승인 근거는 신뢰할 수 있는 사용자 메시지가 아니라 에이전트 전달 내용이므로, 이 구체적 실행을 승인할 수 없습니다.

우회·자동 재제출·추가 요청은 하지 않았다. 현재 직접 사용자 지시를 전달한 감독 메시지까지 검토기가 인정하지 않은 상태이므로, 모델 오류나 high 미지원으로 분류하지 않는다. [기계 기록](high-approval-block.json).

## 동결된 조건

- A 동일 전체-low / B 동일 전체-high / C 사전 물리영역 crop-low, 기존 3사진·동일 부분 기준·동일 출력 계약.
- B 세 body의 `reasoning.effort`만 medium→high. A/C body, 원본/ROI/기준 SHA는 그대로다. [새 preflight](preflight-high.json), [차이·실행기 SHA](high-execution-preflight.json).
- 최대9회·peak2·retry0, 계산 예산 $2. 입력 예약32768·출력상한32768에서 9회 예약은 **$1.8432**로 동일하다. 입력 예약은 보수적 계획값이고 실제 청구 상한 보장이 아니다. high가 더 많은 출력 토큰이나 시간을 쓸 수 있지만 이번에는 실측하지 못했다.
- 이전 medium 실행기와 같은 단일 실행 claim을 사용하므로 두 계획을 중복 발행하지 않는다. 실행 거절로 claim 자체도 생성되지 않았다.

공식 문서에서 GPT-6.1 Terra의 `high` effort, 이미지 입력, Responses와 structured outputs 지원을 확인했다(2026-10-30). [모델 문서](https://developers.openai.com/api/docs/models/gpt-6.1-terra). Standard 단가는 1M당 일반 입력 $1, 30분 캐시쓰기 $1.25, 캐시읽기 $0.05, 출력 $5로 예약을 계산했다. [공식 요금](https://developers.openai.com/api/docs/pricing). 계정 잔액·실청구·실제 endpoint high 수락·품질/시간 효과는 **UNKNOWN**이다.

요청/GT 준비와 기존 결합 독립검토는 끝났지만, 이번 high 판독 비교·누락/오독 채점은 **미실행**이다. 제품 및 운영 기본 low 설정은 변경하지 않았다.
