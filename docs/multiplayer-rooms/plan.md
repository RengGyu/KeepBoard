# 실행 계획

승인: design.md와 감독 구현 카드. 단독 구현, 제품 권한 범위만 사용. Sol2 아트·팩·freeze 읽기 전용. 아래 순서로 같은 세션에서 실행하며 추가 승인 단계를 만들지 않는다.

1. **서버 경계 RED→GREEN**: 기기 cookie·invite·membership·원자 join/profile·role/PIN 권한과 room projection. 독립 H/A/B/X cookie jar로 검증한다.
2. **저장 계약 RED→GREEN**: 범위 revision CAS, scoped snapshot 선택/복원, source·turn 보존, 분석 입력/결과 scope 및 지연 mock 적용 검증. legacy 회귀 유지.
3. **실제 UI 연결**: 방 생성/코드·링크 참가/초대, host 공용+self·member readonly공용+self, 내 이름/색, 선택PIN·cookie 재입장, 충돌 draft 보존. 기존 native/generic 편집 재사용.
4. **집중 검증+합성 화면**: room 전용 API/UI tests와 typecheck, keyless fresh loopback preview에서390/320 실제 브라우저. 독립 저장소 불가 시 cookie API와 단일 브라우저 클릭을 구별한다. 실AI/운영 데이터 접근 없음.
5. **동결·인계**: 정확 파일/로그/캡처·미지원 경계 보고. Sol2 동결/감독 통합 카드 전 전체suite/build 금지. 운영 반영 없음.

자체 검토: invite은 identity가 아니며 PIN은 membership을 대체하지 않는다. 타인 무PIN도 비공개. 권한은 UI와 무관하게 모든 기존 API·사진 경로에서 확인한다. scope 저장과 revision은 함께 적용하며 충돌 시 자동 재시도하지 않는다. 레거시 세션/원명세/아트 이행은 없다.

실행 현황: 1–3 제품 연결 완료, 4 집중 API/UI·타입·390/320 합성 검증 완료(실제 독립 브라우저 저장소 2개는 제공되지 않음), 5 소스 동결·인계. 전체 suite/build/운영 전환은 감독의 별도 통합 카드 대기. 직접 근거와 한계는 handoff.md/verification.json에 기록했다.
