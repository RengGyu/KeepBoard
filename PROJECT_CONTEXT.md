# KeepBoard 작업 기준

갱신: **2026-11-14**. 목표·현재 구현·남은 차이를 함께 읽는 진입점이다. 새 기능이나 승인 절차를 만드는 문서가 아니다.
코드 기준: `handoff/claude-gamepacks-ui-20261026`, 제품 진행 스냅샷 `e4f9490`, Pro P0/P1 제품 커밋 `a73acc2`, Astra 자동위치 제품 커밋 `818c7f1` 및 후속 검토 자료 커밋. 11월12일까지의 미커밋·미추적 제품 구현을 스냅샷에 포함했다.
초기 감사는 소스/데이터 읽기였고 당시 판독·배포는 없었다. 후속 제품 구현·실호출·Chrome 검수·모바일 결과 공유는 아래 날짜별 통합 근거에 구분한다. [상세 근거와 범위](docs/code-context-audit-20261111/evidence.md).

## 작업을 시작할 때

1. 이 파일 → 아래의 해당 작업 참고 자료 → 현재 코드와 해당 diff 순서로 읽는다.
2. 이미 있는 함수·자산·데이터 연결을 먼저 찾고, **재사용할 것과 남은 차이만** 작업한다.
3. 소유권은 [AGENTS.md](AGENTS.md), [작업 세션의 최신 해당 항목](docs/work-sessions.md), 최신 작업 카드에 따른다. 타인의 dirty 변경을 되돌리지 않는다.
4. 종료 시 바뀐 상태·결정·근거만 이 파일에 갱신한다. 매번 전체 감사·새 체크리스트·재승인을 반복하지 않는다.

## 사용자 목표와 바꾸지 않을 방향

2026-11-14 모바일 공유 후속: 사용자가 컴퓨터·같은 와이파이 없이 결과를 보도록 요청했다. 기존 ea94157의 원사진/실제 작업면 8종 비교 자료만 [휴대폰 인터넷용 Sites](https://keepboard-placement-compare-nov14.wjdrb3434.chatgpt.site/#hanabi)에 게시했고 terminal succeeded를 확인했다. 소유자 전용 접근을 유지했으며 로그인 시 같은 ChatGPT 계정을 사용한다. Sites project_id `appgprj_6af84c2e1ba08191b63f0e2e5d3da264`, source checkout은 `/Users/jeonggyuju/Downloads/KeepBoard-mobile-comparison-20261114`, source commit `eda9b10c1360be357478f9f598f58c0fa17be7ff`. 실제 앱 백엔드/운영 데이터·모델 호출·기본값은 변경하지 않았다. [게시 근거](docs/linear-layout-implementation-20261114/supervisor/mobile-publication.json).

2026-11-14 일자 배치 소비 경로를 사용자 승인 범위 C1–C6로 구현하고 실제 8종 화면을 확인했다. [결과·소유권·한계](docs/linear-layout-implementation-20261114/README.md), [원사진↔최종 화면](docs/linear-layout-implementation-20261114/comparison/README.md). 기존 Sol 두 세션 `gpt-6.1-sol/high/Normal`은 소스를 동결·반환했다. 유효 저장 위치·정식 칸·typed map·관계/추정을 먼저 쓰고 남은 bbox 관측에 기존 사진 배열기를 연결했다. 요청 영역과 관측 역할을 분리하고, 검증된 scope 관계·부분순서·구조/버전 캐시 갱신과 정확 팩 프로필 선택을 연결했다. Astra `max/Normal` 최종 검토에서 수동 역할의 과잉 전파·낡은 순서·가시 더미 미소비 3건을 발견해 후속 수정했다. 원결정/대상 ID·회원은 보존하고 경쟁은 유보하며, 관측 순서는 최신 근거로 재생성한다. 초기22파일 전체1498/1498, 최종후속25파일 관련50/50·global타입 포함 build·diff 검사 통과. 실제 Chrome844×390/390×844에서408관측 단일 표시·원값/ID/receipt/사진39입력 SHA·저장/재개와 사그라다 정식18칸을 확인했다. 하나비5/아줄10/카르카손7/도미니언9 사진 줄은 가독 배열이며 실제 칸·지도·더미 소속 정답 수가 아니다. 새 renderer/판독·기본값 변경·운영 접근/배포0, 새 사진 일반화·실폰 Safari·기존 큰 기록 성능은 미확인/미해결이다. Astra는 세 수정 경계를 독립 5묶음·실패0으로 재검토해 수락했고, 감독이 해당 소스/기존 근거23파일 SHA를 재확인했다.

2026-11-14 조사 당시 기록 — 사용자 의뢰의 Astra max/Normal 일자 배치 조사·설계를 완료했다. [핵심 결론](docs/linear-layout-diagnosis-20261114/README.md), [기술 설계/작업 카드](docs/linear-layout-diagnosis-20261114/implementation-cards.md), [감독 수락](docs/linear-layout-diagnosis-20261114/supervisor/README.md). 직접 원인은 전체 scene이 일반 group의 bbox/family·기존 사진 배치기를 소비하지 않고 grid/slots 힌트가 없으면 모두 일자 행으로 보내는 것이다. 유효 manual/canonical·typed map의 전달 단절, 역할과 요청 범위 혼용, cross-field/precedes 관계 미소비, 구조 입력/버전의 digest 누락도 구분했다. 8종 재생과 반례7개(실제2/합성5), 지정488입력·제품 불변이며 감독이7반례와 주요 소비 코드·해시를 직접 확인했다. 원5종 요청의 역할/구조 누락도 있어 표시 연결만으로 실제 더미/지도 복원 완료를 약속하지 않는다. 앞서 비교용 아줄 PNG의 픽셀 불완전 및 LC 상단 잘림을 발견해 DOM 개수와 완전 화면 주장을 분리했다. 제품·팩·기본값 변경/새 provider0이며 설계만 완료, 구현은 아직 안 했다. 권장은 기존 위치/표시 연결→역할·관계/캐시→팩 의미별 표시→필요 입력만 후속 확인 순서다.

2026-11-13 사용자 요청의 [원사진↔서비스 배치 8종 비교](docs/photo-service-comparison-20261113/README.md)를 추가했다. 제품 `65f5526`의 실제 앱 작업면을 원 ID/기존 패널 좌표 그대로 전체 캡처하고 같은 원사진과 나란히 뒀다. GitHub 비교표와 확대/이동 가능한 독립 HTML을 제공하며 8쌍 이미지 로딩·100%/전체 맞춤·390px 좌우 표시를 확인했다. 원사진 복사 SHA 동일, 제품 코드 변경·새 판독·정답 보정 없음. 캡처 비교 자료이며 위치 정확도 평가를 새로 수행한 것은 아니다.

2026-11-13 최신 가독성·3종 밖 무료 확인 완료: 사용자 승인대로 기존 구현솔 high/Fast 두 세션을 재사용했다. [최종 결과·5종 캡처·한계](docs/restoration-readability-generalization-20261113/README.md). 기존 아트의 알려진 색을 한글로 표시하고 숫자를 강조했으며, 보조 ‘없음’·같은 숫자 반복은 compact에서만 숨겼다. 원요청 미상 `?`·상세 원값·원 ID 선택을 유지한다. 기술 근거 접기·패널 자연 높이·끝 구역 jump 및 집중 재진입을 보완했다. 기존 루미큐브58/하나비35/아줄22/카르카손43/도미니언49 관측을 실제 격리 App에서 전량 표시·보존하고 Chrome과 저장/재열기·public resume를 확인했다. **207개는 정답/올바른 배치 수가 아니다.** 루미큐브 기존 native 외 4종은 긴 구성물 목록에 머물며 칸·지도 연결·역할/공급 더미 구조가 부족하다. 새 사진 일반화 성공으로 보고하지 않는다. 관련40/40·전체 타입 포함 build·diff 검사 통과, 전체 suite 재실행0. 원기하/3종 profile 보호7파일 SHA 불변, shared/backend 수정0. 새 사진/유료 호출/기본 강도·구조 기본값 전환/저장 성능/Sites·운영 배포0, 실제 iPhone Safari는 미확인. 작업자 동결·소유권 반환 및 감독 실제 Chrome 검수 완료.

2026-11-13 종합 복원 설계 제품 연결·통합 완료: 사용자 승인한 기존 두 구현솔 `gpt-6.1-sol/high/Fast`로 T1–T9를 구현하고 감독이 최종 통합했다. 제품 커밋 `58bd187`. [구현·화면·한계](docs/restoration-system-implementation-20261113/README.md). 같은 scope 전체 작업면, 기존 값 편집, 원자적 묶음 정정/undo, snapshot 저장·재개, 정확120 profile, 선택형 구조 판독, 기존 ROI/진행 질문/보관 연결, 명시 다른 사진 등록을 연결했다. 실제 판·owner·원관측을 표시 가설과 구분한다. 새 renderer/별도 저장 앱은 만들지 않았다. 전체 **1,468/1,468**, 타입/Vercel 빌드·diff 검사 통과. 실제 App의 SG 값 정정과 LC 묶음 역할 변경→저장→reload→공개 재개, Chrome844×390/390×844 및7W 초기 실제패널/이동 유지 확인. 원입력21파일 SHA 불변. CAS false409·LC 표시영역 합침·빈 초기 작업면을 통합 교정했다. 다만 큰251-snapshot 저장 검사는 과거64.0초→수정전349.5초→최적화계측253.9초로 회귀가 남고 최종 전체 원본은267.7초였다. **T10의 새 사진/새 schema 실호출·실제 두 시점 정합·실폰 Safari는 미검증**이며 사진 정확도/모든 문제 해결로 보고하지 않는다. 새 provider 호출·운영 데이터 접근·운영 배포0, 기존 Site는 갱신하지 않았다. worker 동결/소유권 반환 완료.

2026-11-13 설계 작성 시점 — 종합 기술 설계 완료(아래는 구현 전 연구 기록): 사용자 의뢰에 따라 새 `gpt-6-astra/max`/Normal 세션이 기준 `fedc735`의 코드·팩·아트·원사진/고정 대조를 검토하고 [설계 8문서](docs/restoration-system-design-20261113/README.md)와 [구현 카드 T1–T10](docs/restoration-system-design-20261113/implementation-plan.md)을 작성했다. 핵심 제안은 분산된 게임 의미를 복원 profile로 연결하고, 원관측→전체 장면 관계/가설→가독 표시를 분리하는 것이다. 기존 renderer·값 편집·저장을 재사용하며, 판 미검출 무리도 실제 판 identity/owner/정식 주소를 만들지 않는 표시 구역으로 남긴다. 추천 첫 묶음 T1–T4는 기존9응답의 전체 가로 평면→필드 간 묶음 정정→저장·재열기·재개까지이며, T5–T8의 의미/판독/진행·보존 연결과 T9의 다른 시점 정합은 후속이다. 감독은 자산의 tableModel/tableZones 및 현재 필드별 렌더 경계와 설계 근거를 대조했다. 문서 링크110개·계약 예시6개·보호71파일 검사는 설계 일관성 확인이며 제품효과 검증이 아니다. 이 문서 작성 당시에는 연구 제안이며 제품 변경이 없었다. 이후 사용자의 채택과 제품 구현·검사는 바로 위 최신 통합 항목을 따른다. [근거·범위](docs/restoration-system-design-20261113/evidence.md), [문서 검증](docs/restoration-system-design-20261113/design-validation.json).

2026-11-13 최신 Astra/max 의뢰 완료: 새 두 세션(gpt-6-astra/max, 실제/effective/runtime 확인, Normal/default)이 자동 위치 원인·설계·제품4파일/직접테스트3파일과 원사진 독립 재대조를 수행했다. [현재 결과·화면](docs/astra-placement-recovery-20261113/RESULTS.md), [설계](docs/astra-placement-recovery-20261113/design.md), [독립 최종 대조](docs/astra-placement-recovery-20261113/photo-evaluation/FINAL_V2_REPORT.md). 같은 새 사진 기준에서 LC baseline 판·편·역할16→41맞음(유보1), 같은줄63/63·오합침0; 7W33→74맞음/0오소속/23미연결/20유보다. Sagrada 기존18칸 유지, low표시격자18일치/실제판0을 분리한다. 판 alias·관측띠·색모름 줄 표시를 기존 renderer에 연결했고 원값/ID/원bbox/수동/native/저장을 보존했다. 전체1430/1430·타입/Vercel빌드·Chrome390×844/844×390/1440×900 확인, 새사진판독API0. 실제Safari·누락판/일부원bbox·읽기부족은 남는다. 기존 Sol 사진판정의 LC 노랑노출띠/빨간더미 및7W동전 유보 차이는 덮지 않고 addendum에 보존했다. Sites 최신게시 시도는 클라이언트Git미지원409로 막혀 기존공유판은 이전버전이며, 최신캡처는 현재결과에 둔다. [통합근거](docs/astra-placement-recovery-20261113/supervisor/verification.json).

2026-11-13 사용자는 진행 코드를 GitHub에 올리고, 오푸스 검토·현재 사진/결과·문제를 ChatGPT Pro에 전달해 직접 고성능 분석/연구와 구현 설계를 받도록 요청했다. [검토 진입점](docs/pro-review-20261113/README.md), [전달 요청문](docs/pro-review-20261113/PRO_PROMPT.md). 원본3사진·기존9사례·공통 함수의 구조 계산·스크린샷·기존 검증 근거를 키 없는 자료로 묶었다. 오푸스가 medium의 미대응70/80을 채점기 결함 가능성으로 지적한 것을 포함하며, 과거 high 유지 결정을 현재 정확도 우승으로 인용하지 않는다. 이 최초 전달 작업의 제품 수정/새 판독/Astra 호출은0회였으며, 이후 Pro 반환 검토·승인 구현은 아래에 구분한다.

2026-11-13 후속: 사용자 요청으로 GitHub 저장소를 공개 전환하고 익명 접근을 확인했다. 이후 사용자가 Pro 반환 ZIP의 검토를 요청했다. [수령·감독 확인](docs/pro-review-return-20261113/README.md). 수령 검토 당시 기준d7e6d09와 원본3파일 동일, 패치 dry-run/적용 검사 PASS(실제 적용0), helper·반례21/21, 실제 제품 React SSR의 순환2→표시0/중첩3→표시2 누락을 재현했다. 사그라다54후보 전사는 원본 JSON과 일치한다. Pro의 P0는 수동 cross-field 기준판 참조와 부착 표시 소실이며, LC/7W 위치 알고리즘 P1은 별도 설계다. Pro는 원사진을 보지 못했다. 이후 사용자가 전체 구현과 Sol 직접 사진 대조를 승인했으며, Pro에 사진 판정을 다시 맡기지 않았다.

2026-11-13 승인 구현·사진 대조: [현재 인계](docs/pro-implementation-20261113/README.md), [공유 계약](docs/pro-implementation-20261113/contract.md), [사진 직접 판정](docs/pro-implementation-20261113/photo-audit/README.md). 기존 renderer·아트·저장 경로를 유지하며 qualified 참조·부착 표시·판 내부 기준·부분 순서·네 모서리 정정·native 우선순위를 보완한다. 같은 저장 기록의 assertion ID 교체와 관계 참조 재식별도 기존 answerField에 연결한다. 새 판독·Astra·모델 기본값 변경은0회다. 원사진을 먼저 읽고 메모를 고정한 Sol 작업자는 사그라다 전경36속성에서 high32일치/2오독/2모름, medium35/0/1, low34/2/0을 판정했다. LC9→6 오독은 확인했으나 추가8과 medium 좌표 배율은 유보한다. 7W 수정 전117관측은74소속 일치/15다른판/12미분류/16유보이며 실제5무리에 응답판4개다. 이는 부분 사진 판정이지 사람 인증·전체 정확도 달성이 아니다. 최신 제품 통합 수치와 실제 화면 확인은 현재 인계의 감독 근거를 따른다.

같은 승인 구현의 최종 통합은1420/1420·타입·Vercel 빌드와 Chrome390×844/844×390에서 확인했다. 부착 순환/다단계 표시, 검증된 cross-field 참조, 저장 ID 재식별, 수동frame18→18칸 보존, 명시 판 선택의 역할 영역·집계 및 저장 오류 재선택을 구현했다. 자동 위치는 부분 달성이다: 같은7W 사진 판정이74맞음/15오소속→33맞음/0오소속/68미연결/16유보로 바뀌었고 LC baseline연결도41→16/42로 줄었다. 최근접 강제를 없앤 대신 올바른 자동 연결도 잃었으므로 성공률 개선으로 단정하지 않는다. 기존117개는39그룹에서 전부 선택되며 Chrome 수동1개 정정은33→34로 반영됐다. [현재 private 공유판](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/boards/)·[사진 대조표](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/estimated/) 게시 succeeded. 운영 backend·실제 iPhone Safari·누락판 자동복원·전체 정확도 인증은 미완료다.

- 목표는 **현 120종의 그림 복원과 향후 확장**이다. 4종 한정 출시나 전 게임 사진 보관만으로 완료하지 않는다.
- 실제 흐름은 **스캔 → 게임팩 기반 상황 파악 → 필요한 질문 → 저장·실물 정리 → 재개·복원**이다.
- 게임별 상태·조건·보존 방법은 게임팩에 두고 공통 실행기/UI를 재사용한다. 자동 규칙 심판이나 모든 숨은 정보 추론이 목표가 아니다.
- 사진을 남기고 나중에 판과 기록을 바로 보게 한다. 매 물체 소유자 연결·AI 적용 승인·두 번째 저장을 일반 흐름의 필수 단계로 늘리지 않는다.
- **읽기 좋은 평면**이 필요하다. 원사진의 원근·작은 크기·기울기를 그대로 복사한 그림은 사용자 요구를 충족하지 못한다.
- 루미큐브는 **가로 묶음과 가로 중심 작업면**이 필요하다. 세로 장판, 전체를 작게 축소하거나 폰 회전만 권하는 해법은 채택하지 않았다.
- 사용자가 게임마다 하나씩 배치 방법을 설명하게 하지 않는다. 현재 팩·보드·자산을 먼저 사용한다.
- 사진 위 큰 번호·문구로 실물을 가리지 않는다. 선택하면 핵심 값을 보고 바로 고치는 모바일 흐름을 유지한다.
- 오답 허용 제안 **5~10%는 사용자 방향이며 아직 달성 실측이 아니다**. 누락·잘못된 위치·그림 가독성을 오답률에 숨기지 않는다.
- 2026-11-13 사용자 결정: **30초 달성을 당장 최우선으로 두지 않는다.** 위치가 제대로 잡히지 않는 문제를 별도로 다루며, 배치된 개수와 원사진의 칸·편·묶음이 맞는지는 구분한다.
- 2026-11-12 사용자 결정: 사그라다·로스트 시티·세븐 원더스는 **bbox와 읽힌 값으로 코드가 추정 배치하고, 추정 표시와 편집을 제공**한다. 모델의 frame 선언만을 배치 진입 조건으로 삼지 않는다. 추정 위치/묶음은 원관측·정식 칸 위치·사람 소유 확정과 구별하며 원값/geometry를 덮지 않는다. 기존 답 재생으로 먼저 구현하고, 이후 사그라다·로스트 시티의 추론 강도 high/medium/low 총6회·retry0 비교를 승인했다. 부분 재판독 추가 실험·자동 분할·120종 확장은 이번 범위가 아니다. [작업 카드](docs/estimated-board-20261112/sol2-task.md).
- ‘새 사진 3장/정정 5개 이하’, 옛 4종 게이트, 과거 캠페인 잔여 한도를 새 보편 요구·현재 호출 권한으로 가져오지 않는다.
- 사용자 요구 밖 기능·지표·새 평가/보안 인프라를 선행 과제로 만들지 않는다. 필요한 변경 검증과 실제 사용 확인은 하되 중복 전체검사를 반복하지 않는다.
- Astra 연구는 사용자 명시 의뢰 때만. 구현은 기존 구현솔·구현솔2, `gpt-6.1-sol/high/Normal`; 명시 요청 전 Fast 사용 금지.
- 2026-11-13 후속 사용자 결정: Pro 설계 구현과 원사진 대조를 모두 진행한다. 사진 대조를 Pro에 다시 의뢰하지 않고 Sol/high 하위 작업자가 직접 수행한다. 기존 세션 재사용을 우선하되 같은 세션만 고집할 필요는 없으며, 별도 Sol/high 작업자도 허용한다. 현재 두 구현 Paseo는 actual/effective/runtime Sol/high 확인 후 재사용, 독립 사진 대조는 새 Sol/high 작업자로 분리했다. 새 유료 판독은 이 무료 기존 자료 작업과 구별한다.
- `.keepboard/`·키·개인 원본을 소스/출력에 포함하지 않는다. 유료 호출·배포 권한은 최신 작업 범위로 판단한다.

## 지금 연결된 제품 흐름

1. `App`의 보드 목록/보관함 → `SessionWorkspace`. 기존 보드를 열면 저장된 팩 판본과 기록을 사용한다.
2. 사진·갤러리·선택적 스캔은 원사진과 촬영 범위를 등록한다. **사진 추가만으로 새 판독을 자동 발행하지 않는다.**
3. **저장**이 편집값을 flush하고 사진/메모를 snapshot에 남긴 뒤, 필요한 현재 사진의 판독을 save intent에 연결한다.
4. 기본 읽기는 `terra-high-game-observation-v1`. 공개 화면의 기본 선택은 팩 정책의 `public-scene`; 지정 영역·개인 영역은 별도 범위를 유지한다.
5. 요청은 게임/판본/정의 SHA·원사진·owner 범위·capture epoch를 고정한다. 공개 장면에는 비공개 영역을 합치지 않는다.
6. hosted 스캔은 기존 최대 6장 안에서 준비/사진 읽기를 공유하고 단위별 claim으로 병렬 실행한다. 순서와 단위 ID를 따로 보존한다.
7. 관측을 조립·결합한 현재 job 결과는 **편집 가능한 accepted 기록**에 반영한다. `accepted`는 정확도 인증이 아니다. 옛 candidate/apply 경로도 일부 남아 있다.
8. 판독 완료는 같은 intent의 완료 snapshot에 한 번 연결한다. 중간 메모/수동 차례 입력을 보존하고, 새 사진·새 저장·구성물 변경과 충돌하면 늦은 결과를 막는다.
9. 다시 열기는 현재 기록 표시이며 `/resume`은 명시적 snapshot 복원이다. 촬영 epoch와 실제 게임 턴은 다르며 재개가 다음 턴을 만들지 않는다.

근거: [SessionWorkspace](src/SessionWorkspace.tsx), [saveIntent](server/saveIntent.ts), [analysisTask](server/analysisTask.ts), [runtimeResume](server/runtimeResume.ts).

## 재사용 지도 — 새로 만들기 전에 볼 곳

| 책임 | 기존 구현/데이터 | 현재 제공하는 것과 경계 |
|---|---|---|
| 화면 진입·목록 | [App](src/App.tsx), [sessionSummary](shared/sessionSummary.ts) | 요약 카드, 보관함, 상세 화면 지연 로딩. 목록 응답 축소는 구현됨 |
| 촬영·선별·업로드 | [Capture](src/Capture.tsx), [scanQuality](src/scanQuality.ts), [scanUploads](src/scanUploads.ts), [api](src/api.ts) | 촬영 안내·밝기/흐림/중복 신호, 최대 6장, 병렬 업로드. 영역 완전성·정지 상태를 증명하는 선별기는 아님 |
| 저장/읽기 조정 | [SessionWorkspace](src/SessionWorkspace.tsx), [saveIntent](shared/saveIntent.ts) | 기존 저장 버튼·사진 등록·읽기 설정·job 표시·재저장 중복 방지 |
| 게임 의미/질문 | [gameEssentials](shared/gameEssentials.ts), [engine](server/engine.ts), [catalog](gamepacks/catalog.ts) | 관측/질문/실물 보존, 조건별 요구사항·재개 briefing. 120종 완전 규칙 엔진은 아님 |
| 요청 범위 | [restoration](shared/restoration.ts), [정책](gamepacks/policies/restoration/index.json), [hostedObservation](server/hostedObservation.ts) | 공개 장면의 영역 합집합, 필요한 속성 선택, 정확한 판본/소유 범위 |
| 판독/전송 | [terraGameReader](server/ai/terraGameReader.ts), [terraCompact](server/ai/terraCompact.ts), [geminiGameReader](server/ai/geminiGameReader.ts) | 공통 kind/속성, 단일·묶음·모름, compact wire, 행 단위 보존·보류. 전송 성공은 정답 증거가 아님 |
| 공간 판독 | [spatialReading](server/spatialReading.ts), [공간 정의](game-photo-definitions/spatial/index.json), [spatialAssembly](server/ai/spatialAssembly.ts) | 칸·방향·덮은 칸·관계·판 인스턴스. 유효 frame/address가 있어야 배치 |
| 조립·결합 | [observationAssembly](server/ai/observationAssembly.ts), [scanObservation](server/scanObservation.ts), [observationFusion](server/observationFusion.ts) | 출처/좌표 변환, 물체·group 구분, 속성 충돌·수동값 보호. 미등록 다른 시점의 자동 정합은 제공하지 않음 |
| 그림 투영 | [drawingProjection](shared/drawingProjection.ts), [PhotoLayoutBoard](src/PhotoLayoutBoard.tsx) | 수동 배치 → 검증된 보드 위치 → 출처 확인된 사진 위치 → 미배치. 사진 원관측과 분리한 고정 크기 가로 표시·원 ID 정정 구현 |
| 추정 구조 | [estimatedBoardStructure](shared/estimatedBoardStructure.ts), [structureRelations](shared/structureRelations.ts), [EstimatedBoardView](src/EstimatedBoardView.tsx) | qualified 판/실물 참조·관측 관계·판 내부 A/B·부분 순서·상대 트랙. 순환 표시와 cross-field 정정, 원사진 네 모서리 frame을 기존 저장에 보존. 최근접 판 중심은 소속 확정 근거로 쓰지 않으며 원관측/owner/정식 칸을 덮지 않음 |
| 공통 보드 | [GameBoardRecord](src/GameBoardRecord.tsx), [realBoards](src/realBoards.ts), [boardVisuals](src/boardVisuals.ts) | 기존 칸·노선·자유 영역·판 변형·회전·배치·원사진·선택 수정. 새 별도 renderer부터 만들지 않음 |
| 카탄 | [SceneWorkspace](src/SceneWorkspace.tsx), [SceneEditor](src/SceneEditor.tsx), [catanSceneReading](server/ai/catanSceneReading.ts), [sceneEditing](shared/sceneEditing.ts) | native topology/hex·edge·vertex, 도로/건물 편집, 별도 장면 판독. 일반 bbox 판독과 다른 계약 |
| 루미큐브 | [RummikubWorkspace](src/RummikubWorkspace.tsx), [RummikubBoard](src/RummikubBoard.tsx), [rummikub](shared/rummikub.ts) | 기존 타일 SVG·가로 묶음·순서·탭 숫자/색 정정·수정 저장. AI loose 사진 배열과 수동 group은 별개 |
| 기존 아트 | [GenericPieceArt](src/GenericPieceArt.tsx), [GameComponentArt](src/GameComponentArt.tsx), [artResolver](src/artResolver.ts), [pieceReadoutArt](src/pieceReadoutArt.ts) | 기존 symbol/variant, 알려진 눈·색 표현, 불명값의 중립/사진 표시. 미확인 값을 첫 그림으로 채우지 않음 |
| 공통 정정 | [GameEssentials](src/GameEssentials.tsx), [quickCorrection](src/quickCorrection.ts), [QuickPick](src/QuickPick.tsx), [readouts](shared/readouts/registry.ts) | 데이터형·선택지 기반 탭/일괄 수정·수동 출처. 기존 기능을 다시 만드는 대신 진입/노출을 단순화 |
| 모름/보완 | [observationGaps](shared/observationGaps.ts), [readingGaps](src/readingGaps.ts), [PhotoReference](src/PhotoReference.tsx) | 미요청·뒷면 비적용과 읽기 실패를 구분. 사진 참고·선택 보완. 현재 표시 휴리스틱은 정확도 기준이 아님 |
| 개인 범위/방 | [rooms](shared/rooms.ts), [privacy](shared/privacy.ts), [server rooms](server/rooms.ts), [roomAccess](src/roomAccess.ts) | 공용/개인 범위·방 멤버·선택적 PIN. 판 인스턴스 표시를 사람 소유 추정으로 바꾸지 않음 |
| 저장소/배포 | [Store](server/store.ts), [BlobStore](server/blobStore.ts), [cloudRuntime](server/cloudRuntime.ts), [workflow](workflows/analyze.ts) | 로컬 파일과 private cloud 저장소, CAS·durable job·업로드 색인·구판 기록 |

## 실제 데이터 자산과 판본 연결

| 현재 파일 집계 | 의미 |
|---|---|
| [원명세](docs/research/game-specs-120/games) 120 / [현재 팩](gamepacks/generated/game-essentials.json) 120 | 런타임 필드 바인딩 1,648개. 전체 규칙/실물 정확성 인증이 아님 |
| [촬영 프로필](shared/capture-profiles.json) 120 / [사진 정의](game-photo-definitions/index.json) 120 | 요청 영역·물체·속성 계약. 모든 사진에서 검출한다는 의미가 아님 |
| [구판 팩](gamepacks/generated/retired-packs.json) 20 / 복원 정책 140 | 현재 120 + 정확히 연결된 구판 20. 기존 저장본은 새 팩으로 강제 치환하지 않음 |
| 현재 복원 정책 표시 분류 | native 2 / fixed-slots 24 / map-network 2 / photo-layout 92. **표시 분기**이며 출시 등급/성공 게임 수가 아님 |
| 공간 정의 31 | 데이터 상태 ready 14 / partial 15 / excluded 2. 실제 후보 29; 특정 영역만 지원할 수 있음 |
| [전용 판](public/game-art/real-boards) 118 | 카탄·루미큐브는 native. 72종의 base board에 6,504칸. 데이터의 complete 111/partial 7도 판독 인증 아님 |
| [판 매핑](public/game-art/boards/mapping.json) 119 / [게임별 아트 매핑](public/game-art/games) 120 | 전자는 native 루미큐브 제외. [아트 목록](public/game-art/assets.json) 532항목, 공용 341/전용 136/기존 참조 55 |
| [typed readout](shared/readouts/catalogs) 117 | native 카탄·루미큐브, 별도 Splendor 계약과 함께 사용. SVG는 표시 자산이며 검증된 실물 이미지 학습셋이 아님 |

생성 연결은 **원명세 → runtime pack/bindings → capture/readout → photo definition → spatial/release-reading/restoration 정책 → UI**다.
관련 생성기: [game-runtime](tools/game-runtime/generate.ts), [photo definitions](tools/lightweight-recognition/generate-photo-definitions.mts), [spatial](tools/lightweight-recognition/generate-spatial-definitions.mts), [restoration](tools/lightweight-recognition/generate-restoration.mts).
게임명만 같다고 서로 연결하지 않는다. `packId/version/edition/sourceSHA/definitionSHA`와 보드 frame을 확인한다.
팩/정의 재생성 시 [구판 readout](shared/readouts/retired.json), [구판 사진 정의](docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json), 저장된 `gamePack`을 보존한다.
`docs/`에는 연구뿐 아니라 **실제 런타임 구판 import**도 있다. 폴더 전체를 불필요 자료로 삭제·배포 제외하지 않는다.

## 판독·배치·값 보존에서 기억할 것

- 코드상 기본값: **`gpt-6.1-terra / high / detail high / max_output_tokens 32768 / service_tier default`**.
- 기본 adapter는 `literal-compact-visible-instance-v7`, timeout 285초. `LunaGameReader`라는 공통 클래스 이름만 보고 기본 모델을 Luna로 판단하지 않는다.
- Terra high의 제한적 HTTP 500/502/503/504 재시도 1회와 job/workflow 재전달 방지는 다른 층이다. 끊긴 전송을 자동 재발행하지 않는다.
- 기존 AI 설정 경로 `server/ai/index.ts`의 120초 요청, Gemini, Luna, local reader는 별도 선택지다. 구 실험 설정을 현재 제품 기본값으로 말하지 않는다.
- 키·실제 운영 설정·배포 모델은 이번에 확인하지 않았다. 소스 기본값과 실행 당시 receipt identity를 구분한다.
- 공간 판독은 단순히 ‘기본 OFF’가 아니다. 정확히 연결된 `public-scene + canonicalSpatial` 정책이면 전역 opt-in 없이도 공간 요청이 붙는다.
- 일반 bbox는 사진 좌표다. 칸 ID·노선·물체 동일성·합법 묶음·소유자는 별도 근거가 필요하다. 새 범용 배치에서 숫자/재고로 위치와 숨은 값을 맞춰 채우지 않는다.
- 기존 [카탄 단일 숫자 도출](shared/catanNumberInference.ts)은 완전성·재고 등의 조건과 ‘다른 판독은 맞다’는 가정을 두고 별도 `basis:rule`로 기록한다. 직접 읽은 값/일반 게임 보정으로 확대하지 않는다.
- 공개 사진의 개인판 인스턴스는 소유 미정으로 그릴 수 있다. 사람이 누구인지 맞히거나 개인 비공개 내용을 공용으로 옮기지 않는다.
- `null`은 0/없음이 아니다. 미요청·비적용·읽기 실패·유효값·충돌을 기록에서 구별한다. `?` 감소만으로 정확도 개선을 주장하지 않는다.
- 관측 원문/receipt·source/transform·수동값과 그림 좌표는 분리한다. 표현을 정리해도 원래 piece ID·참조·수동 순서를 유지한다.
- 기존 fusion은 같은 원본 crop과 등록된 근거에서 연결한다. 여러 사진을 받는 기능과 다른 시점 자동 정합은 다르다.
- 잘못된 bbox/미확인 위치는 미배치 값과 원사진으로 남긴다. 같은 정상 물체를 지우거나 화면 좌표를 사실처럼 저장하는 해결은 피한다.

## 현재 남은 작업 — 기존 연결을 보완하는 순서

2026-11-12 사용자 승인한 **관계·칸·모바일·유효값 후속을 구현했다**. [현재 결과/한계](docs/structure-followup-20261112/README.md), [최종 근거](docs/structure-followup-20261112/supervisor/verification.json). LC는 대각선 중심선과 원래 discard 역할을 보존해 같은편 줄을 모았으며 기존 저장본41/42(경계1 미분류)다. 새 Sagrada high/medium 응답은 각각18개를 코드 추정4×5칸에 놓았고 이전 사진 대조18주소와18/18 대응; low는 판/역할 근거 부재로0/18 유지한다. 수동group/all-manual도4×5를 유지하며 원값·bbox·정식18칸·receipt·저장/재개는 보존한다. 기존 renderer의 부품별 크기·미상 축약·near-first·판기준 접기를 재사용했다. 전체1,389/1,389·전체타입 이후 최종 UI순서9/9/좁은타입·최종Vite/Nitro빌드 통과. Chrome mobile/touch844×390/390×844에서 값/선택·slot20 정정/게임전환 확인, 실제 iPhone Safari는 미검증이다.

기존6응답 재비교에서 LC 최초 preview는 face=back만인행일 수 있어 첫 필요한 숫자·색/DOM30초로 인용하지 않는다. 앞으로 firstReadableItemAt(첫미리보기)과 firstUsefulValueAt(요청·적용성 통과 non-face 값의 판독기수신)을 분리하며 DOM paint는 별도다. 기본high 유지: medium은 빠르지만 LC80기준속성 중70개 대응모호, low는 누락/모름증가로 우승판정불가. 추가provider/Astra0. [모바일 공유](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/boards/), [비교](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/estimated/)는 source42382daa6f065a926cbccb0a54ca07d4f274e115로 private 배포succeeded. 제품backend 배포·실폰종단·전체5~10%·전게임30초 달성과 구분한다.

2026-11-12 최신 [값·위치·부분 재판독 통합](docs/latency-placement-20261112/README.md): 기존 두 구현솔로 검증된 개별 값의 읽기 전용 preview·첫 값/생성 timing·칸 위치 미배치 집계·원본 픽셀 선택 영역 재판독을 기존 evidence/save-intent/job에 연결했다. 중단 preview는 완료 snapshot이 아니며, ROI 밖 수동값과 기존 실물 ID·값 충돌을 보존한다. 현재120+구판20 tuple의 주소 표기 정적 감사에서 같은 영역의 모호 alias0(호환 공간31); 실제 칸 정확도 인증은 아니다. 전체 **1,360/1,360·타입·Vercel 빌드·diff 검사 통과**.

같은 원본의 새 비교는 **전체5+ROI3, 실호출8회/retry0**, 저장·재개8/8, 사용량 추정$0.241219(실제 청구 미확인). 사그라다 값/칸/상자의 첫 값47.7/55.5/47.2초·전체60.2/97.0/61.7초, 하나비 값/상자 첫 값66.2/65.3초·전체74.0/78.7초. 첫 값은250ms 로컬 HTTP 수신이며 DOM/실폰 시각이 아니다. 전체 사진의 첫 텍스트 전45.7~65.1초로 **첫 값 기준으로도30초 미달**. 하나비 cells는 고정 칸이 없어 호출0, 가상 grid를 만들지 않았다. 사그라다 cells는 raw18칸을 냈지만 영역/판 방향 null로 정식 배치0; 누락된 반복 template/판 읽기 방향 설명을 후속 복원했으나 그 문구의 실호출 효과는 미측정이다. 기본 readMode 전환·guard 완화·null 채우기·자동분할·게임 확장·추가 번들 분할은 없다. 옛 실측/원장과 이번8회 plan/body는 보존했다.

오독표는 기존8장의 대응 가능한 핵심 값만 분모로 쓰며 독립 사람 정답이 아니다. 사그라다 r1c4는 윗면1/옆면2의 값 오독으로 판정; 새 ROI는1을 읽었다. LC 노랑3·4·5·9·10은 새 ROI에서3·4·모름·모름·10, 7W 제목 DISPENSARY는 작은 연결 문구 APOTHECARY까지 합쳐 읽어 완전 성공으로 세지 않았다. 7W117상자 중 사전 고정 무작위20대조는 단일 실물13/겹침·층 유보7, 유보를 정답으로 세지 않는다. 전120종5~10%달성·실제 폰 성능은 여전히 미확인이다.

같은 owner-private [3게임 복원판](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/boards/)과 [실측·오독·위치표](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/audit/)를 갱신했다(source1b64924e141b8df5a5cb5c42282a6167a8a10f04, 배포 succeeded). 기존 GameBoardRecord/아트/사진 줄을 재사용하며 사그라다는 옛 응답의 주소 교정 오프라인 재생이다. Chrome390×844/844×390에서 표시·선택·원사진을 확인했고 실제 iPhone Safari 터치는 미확인. 읽기 전용 결과 공유이며 제품 backend 배포는 아니다. 다음 남은 차이는 모델 첫 값 대기·cells 실제 연결·사람 정답·실폰 종단 확인이다. 새3사진/정정5개 게이트는 추가하지 않는다.

2026-11-12 남은 설계 후속 완료: [구현·현재8사진 재판독·한계](docs/remaining-validation-20261112/README.md). 기존 두 구현솔(Sol/high/Normal)로 선택 게임/current·정확 구판140조합 JSON과 native 화면을 분할했다. 최종 SessionWorkspace1,703,419→529,786B(gzip6:305,328→118,929B); 큰 공통 catalog를 다른 초기 청크로 옮기지 않았다. Node 동기 검증·데이터 준비 실패 시 기존 초안 보존을 유지한다. 사그라다의 동일 영역에 선언된 slotId→canonical address 호환으로18개 위치 손실을 고쳤고, 알려진 주사위/카드 선택 라벨도 고쳤다. **최종 전체1,337/1,337·타입·Vercel 빌드·diff 검사 통과**. 실제 Chrome에서 선택 JSON1개 및 루미큐브 정정→저장→reload를 확인했다.

같은 기존8사진과7W2×2를 현재 public-scene/공간 정책으로 **실호출12회/retry0**,9job 완료·저장·재개9/9 확인. 사용량 추정$0.591086(예약$2.4712/$3, 실제 청구액 미확인). 원본8응답366관측/748읽힘/358모름 속성, 전체12응답 native bbox 무효0. 요청 범위가 달라 과거와 정확도/시간 개선율로 직접 비교하지 않는다.7W 한 장117유효/85.8초,4분할141raw행/92.8초·40결합 미확정으로 자동분할은 켜지 않았다. 사그라다142.4초·하나비121.3초 등 공간 포함 요청은 느려졌다. 후속 주소 교정의18칸 저장·재개는 동일 native 무료 재생이며 새 실호출 시간/물리 칸 정답 인증이 아니다. 이전 frozen AI 초안 대비 루미큐브116항목·아줄19색 일치, 원사진 대조 오독5곳과 겹침 자동대응 오류1건을 별도 기록했다. 전체5~10%·30초·새 사진 일반화는 미달/미확인이다.

사용자 기기는 **iPhone Safari**다. 기존 owner-private [최신8답·그림·오독 확인](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site)을 갱신했다. source commit9f31470079f0de668df08881986cf557815919fc, 배포succeeded. 이전11/11화면/평가를 보존하고, 현재 실제 제품 UI 모듈로 가로 줄·선택값·원사진을 표시한다. Chrome390×844/844×390 검수와 읽기 전용 결과 공유이며 실제 iPhone Safari 촬영→업로드→판독→저장/재개 앱 배포·실폰 성공은 아니다. 제품 저장소 commit/push/운영 배포·Astra 추가 사용0. 옛 campaign 원장 변경0; private4경로 ENOENT는 기록했다.

2026-11-12 사용자 승인한 [배치·성능 설계](docs/placement-performance-plan-20261112/README.md)의 **사진 줄 배치·원사진 연결과 성능1~4를 구현하고 통합 확인했다**. [최종 근거](docs/placement-performance-implementation-20261112/README.md). 기존 보드/아트/정정 경로를 재사용하며 원관측 geometry가 있는 기록은 새 mount에서도 줄 기준을 복원한다. 기존58좌표 합성 저장 회귀에서 삭제 후 다른 줄 이동0·삭제 타일 재표시0·표시 흔들림 이동0. Chrome844×390에서 타일 정정→저장→reload와 삭제→저장→reload의 나머지8줄 보존을 확인했다(격리된 제품 코드+기존 답 재생, 실폰 아님). 세션 저장 codec·320px JPEG·영속 요약 색인·thin 진행 조회와1→2→5초 폴링을 연결했다. 합성6 snapshot compact701,146B→102,136B, 정상20세션 목록/seen 진행의 큰 본문 read0. 동시 writer 색인 고착을 barrier로 재현해 수정했다. **전체1,322/1,322·타입·로컬/Vercel 빌드 통과**. 빌드에 포함된 Sharp ESM의 JPEG 생성은 로컬darwin/arm64에서 확인했으며 Linux Vercel 실행은 미확인이다. 원관측이 부족/모호한 legacy 재열기, 기하 추정의 사람 정답, 실제 폰·운영 성능·새 판독 정확도는 미확인. 당시 남긴 카탈로그/판 열기 분할은 위 후속 작업에서 구현했다. 유료 재판독·2×2 분할 시험·운영 migration·commit/push/deploy는 하지 않았다.

후속 완료(2026-11-11): 기존 구현솔·구현솔2가 다른 게임 구조의 필요 판독 범위·표시/정정 연결을 보완했다. [통합 근거](docs/structure-scope-20261111/README.md). 층·촬영별 판 인스턴스에 맞춰 사진/칸/정정 대상을 분리하고, 기준 칸 없는 점유 셀과 기존 카르카손 수동 좌표·부착을 보존해 표시한다. 공개 장면의 확인된 영역만 필요한 속성을 요구하며, 미확정 영역/더미 역할·중요한 아래 카드 요구는 유지한다. 새 데이터 축소는 근거가 있는 현재 아줄만 적용했다. 120팩·455영역 연결표, 20구판 정책 불변, 8응답 402관측·817개 기존 값 보존 확인. 전체 1,304/1,304·타입·빌드 통과, Chrome 844×390의 카르카손 좌표판→기존 정정 진입 확인. 실제 폰·새 판독 정확도·전체 게임 규칙 검증은 미완료이며 유료 호출은 0회다.

2026-11-11 사용자 승인 범위의 **기존 실제 제품 배치·가독성 보완 구현과 통합 검사를 완료**했다. [최종 근거](docs/readable-product-20261111/README.md). [작업 카드/범위](docs/readable-product-20261111/sol1-task.md)·[공통 계산/연결 소유](docs/readable-product-20261111/sol2-task.md). 기존 보드·아트·정정·저장 경로를 재사용하며 별도 시제품은 제품 표준으로 승격하지 않는다. 공통 계산·기존 UI 재사용·저장 회귀는 확인했으며, 실폰·전120종 실사진 정확도는 여전히 별도다.

| 우선순위 | 남은 차이 | 가장 작은 다음 작업/재사용 |
|---|---|---|
| 1. 그림 가독성 — 구현됨 | `drawingLayout`의 사진 방향·줄 순서와 고정 크기를 기존 `PhotoLayoutBoard`가 소비. 줄마다 독립 가로 스크롤, 기존 TileFace/Meld·정정·확대100%를 재사용 | 앞선 Chrome 확인에 이어 2026-11-12 844×390에서 타일 정정→저장→새로 열기 보존 확인. 새 줄 배치의 Chrome 삭제→저장→재열기도 확인. 실폰 터치·모든 사진의 추정 배열 품질은 미확인 |
| 2. 120종 구조 연결 — 공통 UI 보완됨 | 기존 칸/지도/자유영역/native 보드와 필드별 확대·pan 유지. 층·촬영별 인스턴스 필터를 정정까지 통일, anchor 없는 점유 셀과 카르카손 기존 좌표·부착 진입 복구 | 유효 frame/slot이 없는 물체는 가독 사진 배열/미배치로 남음. 모델이 못 읽은 칸이나 숨은 값·소유자를 새로 만들어 채운 것은 아님. 새 구조 제어의 실제 폰 검수는 남음 |
| 3. 판독 품질/필요 범위 | 확인된 영역별 요구와 아줄의 불필요 이름/판 속성을 정리함. 미확정 더미 역할은 축소하지 않음 | 기존 8응답 재생은 보존/요구 축소 근거이며 새 모델 성능 측정이 아님. 현재 판본의 역할 근거와 실제 사진으로 남은 오독·누락을 확인. 위치/모름 수 개선을 인식 정확도로 발표하지 않음 |
| 4. 실제 사용 정리 | 기본 저장 연결은 있음. owner 탭·구성물/보존/상세 컨트롤 등은 아직 복잡할 수 있음 | 기존 정정·메모·개인 범위 기능을 재사용해 필요한 UI만 정리. 숨기는 UI와 보존해야 할 데이터/구판을 구분 |
| 5. 마무리 | 실폰/운영 종단·사람 오답률 미확인. README의 흐름·클라우드 설명은 2026-11-11 현재 소스에 맞춰 갱신함 | 현재 제품 경로의 직접 확인·문서 동기화. [TEST_ONLY_FEATURES](TEST_ONLY_FEATURES.md) 제거 조건 준수. 새 플랫폼/전수 재검사를 선행조건으로 만들지 않음 |

1·2는 사용자 승인 방향에 따라 기존 제품에 구현했다. [공유 계약](docs/readable-product-20261111/contract.md)은 순수 표시 가설과 정식 칸/수동 묶음을 분리한다. 기하 이웃이 실제 합법 묶음임을 인증하지 않으며, 사용자 최종 화면 평가는 별도다. 아래 별도 시제품은 제품 구현 근거가 아니다.
보드 자산 추가와 판독/그림/저장 연결은 별도 일이다. 자산이 충분한 부분은 새로 그리기보다 현재 소비 경로를 고친다.

## 무엇을 검증했다고 말할 수 있는가

2026-11-12 사용자 의뢰 아스트라 독립 검토: **부분 달성**. [검토](docs/estimated-board-20261112/astra-review/README.md), [근거](docs/estimated-board-20261112/astra-review/evidence.md). LC42/42는 구조 정답이 아니다. 현재 축 계산이 대각선 판을 화면x/y축으로 나눠 같은 편 줄을 분리하고, 저장된 discard.scene5개를 원정 줄로 표시하는 관계 오류가 확인됐다(원 저장 필드/값 변경은 없음). 사그라다 새 boxes 창문18개 칸 연결0도 유지된다. 기존 ‘첫 값’ 수치는 HTTP preview 수신이며 LC에서는 face=back만 있는 관측도 자격이 되므로 **첫 필요한 숫자·색의 표시30초 달성으로 인용하지 않는다**. 판별·색별 표시 개선은 있으나 모바일에서 카드가 아래로 밀리는 문제도 남는다. 이 독립 검토 시점에는 후속 구현 전이었다. 이후 사용자가 권고3개 진행을 승인했으며 현재 후속은 [구조·화면·유효값 보완](docs/structure-followup-20261112/README.md)에 분리 기록한다. 위 오류·칸0은 수정 전의 근거이며 현재 상태로 다시 인용하지 않는다.

| 근거 종류 | 현재 말할 수 있는 것 | 말할 수 없는 것 |
|---|---|---|
| [추정 복원판·강도 비교](docs/estimated-board-20261112/README.md) **VERIFIED** | 3종 기존 응답 구조 연결38/42·42/42·101/117, 수동정정 HTTP 저장/재개, 값 표시·중립 패턴·판별 묶음. 전체1,374/1,374와 후속 UI·타입/Vercel 빌드, 6회/retry0 강도 실험·Chrome 캡처·private Sites | 미연결20개/패턴 식별, 새 boxes 사그라다 창문18칸(연결0), 전체5~10%·실폰 Safari 종단·전게임30초 |
| [현재 게임 로딩·실호출 통합](docs/remaining-validation-20261112/README.md) **VERIFIED** | 전체1,337/1,337·타입·Vercel 빌드,140asset 원본 동등,선택JSON/Chrome 정정 저장,실호출12/retry0·9job재개보존,후속18주소 무료 재생 | 실제 iPhone Safari/운영 종단,전120종·사람 정답5~10%·30초,새 사진 정확도 |
| [현재 배치·성능 통합](docs/placement-performance-implementation-20261112/README.md) **VERIFIED** | 전체1,322/1,322·타입·로컬/Vercel 빌드, 기존58좌표 JSON 새 mount와 실제 Chrome 저장·재열기. 합성 저장 크기/목록·진행 read 계수, 로컬 artifact JPEG 확인 | 실제 폰/운영 Linux·클라우드 시간·전120종 줄/묶음 정답·새 모델 정확도/속도 |
| [현재 구조·범위 통합](docs/structure-scope-20261111/README.md) **VERIFIED** | 전체 1,304/1,304·타입·빌드 통과. 120팩·455영역 연결, 8응답 기존 값 보존. Chrome 가로 viewport의 카르카손 수동 좌표→기존 정정창 확인 | 실폰 터치/운영 배포/전120종 규칙·정확도, 새 모델 판독 개선 |
| [앞선 가독성 통합](docs/readable-product-20261111/README.md) **VERIFIED** | 당시 전체 1,294/1,294·타입·빌드 통과. Chrome 390×844/844×390의 가로 배치·확대→루미큐브 정정·저장 후 새로 열기 확인 | 새 구조 제어 전부의 실제 브라우저 검수, 실폰 품질 |
| 초기 읽기 감사 **VERIFIED** | 위 파일/함수·데이터 수·연결/미연결 경로가 존재 | 모든 코드/120종 규칙 정확성, 실제 현재 배포 성공 |
| [구현 보고](docs/restoration-implementation-20261111/contract.md) **REPORTED** | 정책·투영·저장 intent·HTTP/정정 회귀를 작성·실행했다고 보고 | 기능 검사 수를 사진 정확도로 변환, 서로 겹치는 검사 합산 |
| [새 루미큐브 시험](docs/restoration-test-20261111/README.md) **REPORTED** | 새 판독 58개 모두 photo 투영, 로컬 Chrome/HTTP 저장·재개·수동 수정 보존. 그림 겹침도 관찰 | 58개 모두 정답, 합법 group 복원 완료, 휴대폰 전체 성공 |
| 같은 시험의 시간 | job 요청→completed 관측 약58.5초, 서버57.5초, 업로드64ms 보고 | 촬영부터 재개까지 휴대폰 종단, 전게임 시간, 30초 보장 |
| 기존 8응답 402물체 | 보존/표시 회귀와 비교 양식의 입력 | 독립 사람 정답/전체 정확도. 사람 채점 칸은 미완료 |
| [성능 정리](docs/performance-cleanup-20261110/README.md) **REPORTED + 코드 확인** | 업로드 색인·목록 요약·lazy loading·배포 자산 의존성 필터 구현 | 과거 build 수치를 현재 실폰 속도로 승격, MemoryObjects를 운영 Blob/Supabase 실측으로 표현 |

실사진의 값·누락·위치, 기능 보존, 모바일 가독성, 운영 시간은 구분해 보고한다. 현재 5~10% 오답 기준 달성은 **미확인**이다.

2026-11-11 사용자 명시 의뢰의 아스트라 사진8장 정답 초안→저장 답 비교를 완료했다. [결과·비교표](docs/accuracy-review-20261111/README.md). 새 평가 세션에서 사진384실물/그룹·817속성을 앱 답을 열기 전에 고정하고,402관측과250실물 대응을 확인했다. 루미큐브58타일116값과 아줄19타일색은 비교 범위에서 일치. Astra 오독6속성 중 감독은5개 불일치·노란 주사위1개 반사 판정 유보로 구분했다. 하나비 가림 카드/카르카손 점수말2개 미표현은 가림·요청범위 사유와 함께 남겼다. 도미니언 이름24개 판정 불가,7W107/117 무효 bbox 등으로 전체 정확도5~10% 달성은 미확인이다. 노출 후 초안 철회17개는 별도 기록했다. 과거8응답과 후속 루미큐브를 분리했으며 현재 수정된 요청을 새로 실행한 개선 실측은 아니다. 사람 정답 인증·제품 수정·새 provider 호출·전체 검사·배포 없음.

## 과거 문서/예시의 지위

| 자료 | 지금 사용할 부분 / 다시 적용하지 않을 부분 |
|---|---|
| [release-plan](docs/release-plan-20261110/README.md) | 사용자 120종·5~10% 방향. 옛 본문의 4종/사진만 출시·게이트와 ‘유일한 속도 해법’ 단정은 현재 기준 아님. 상단 4종 개발 모드 상태도 후속 구현으로 낡음 |
| [remaining-work](docs/remaining-work-design-20261111/README.md) | 원관측→그림/저장 연결 원인 분석. 후속 구현으로 해결된 부분을 다시 미구현이라고 하지 않음 |
| [flat-layout](docs/flat-layout-redesign-20261111/README.md) | 사진 크기 복사 문제의 근거. 422×1,146 세로 예시는 사용자 거부; 17개 추정 묶음은 정답 아님 |
| [universal-board](docs/universal-board-design-20261111/README.md) | 기존 필드/보드 조사 참고. **별도 시제품이며 사용자 채택/제품 구현 아님**. 4예시·도식을 제품 모바일 검증으로 표현하지 않음 |
| [one-photo UX](docs/one-photo-ux-20261110/design.md) | 조작 최소화의 연구 이력. 뒤에 불확실값 수용 방향이 바뀌었으므로 최초 선택 모드를 확정 요구로 복원하지 않음 |

## 실행/배포와 이미 끝낸 성능 정리

- 로컬: `npm run dev` → Express/Vite, 기본 4317. `npm run build` → 타입 확인+`dist`; `npm start` → 로컬 production 서버.
- 클라우드: [vercel.json](vercel.json) → `build:vercel` → `cloud-dist` + Nitro `.vercel/output`; [cloudEntry](server/cloudEntry.ts) + Workflow + private Blob/Supabase 경로가 있다.
- [README](README.md)는 2026-11-11 저장→판독 흐름·120종 기술 지원·기존 보드 재사용·Nitro/Workflow/private 저장소 구성으로 동기화했다. 문서 동기화는 실제 배포·계정/백업 완료를 뜻하지 않는다.
- 사진 URL은 기존 경로를 유지하면서 참조 세션 색인을 사용한다. **정상 목록 생성은 영속 요약 색인을 읽는다.** 구형 최초 준비와 비정상 pending 항목만 원세션 확인을 한다. 원사진/파생본은 현재 모든 참조의 접근 검사를 거친 뒤 순수 공개는 private 재검증, 개인/방/공유 개인 참조는 no-store다.
- `App`/업로드 client/구판 사진 정의는 지연 로딩. [runtime-public-assets](tools/runtime-public-assets.ts)가 실사용 SVG/JSON/variant만 빌드에 복사한다. 원본 자산은 삭제하지 않는다.
- 과거 ‘2-job/단위2개 대기’는 legacy 경로다. 현재 hosted scan의 최대6 병렬을 새로 구현할 과제로 만들지 않는다. 공급자 전역 한도가 없어졌다는 뜻도 아니다.
- `clipboard-photo-paste`는 개발용 임시 기능. 출시 전/사용자 전체 제거 요청 때 제거한다. **4종 임시 photo-reading-flow는 제거 완료**, 공통 제품 복원 기능과 관련 회귀 테스트는 제거 대상이 아니다.

## 작업별 먼저 볼 자료

| 작업 | 짧은 진입 자료 |
|---|---|
| 보드/평면 배치·아트 | 위 재사용 지도 + [이번 근거](docs/code-context-audit-20261111/evidence.md) + [실제 표시 문제](docs/restoration-test-20261111/README.md) |
| 판독/공개·개인/공간 | [복원 계약](docs/restoration-implementation-20261111/contract.md), [backend 인계](docs/restoration-implementation-20261111/sol2/README.md), 해당 receipt의 실제 identity |
| 저장·정정·재개 | [UI 인계](docs/restoration-implementation-20261111/sol1/README.md), [재저장 통합](docs/restoration-implementation-20261111/sol1/integration/README.md), `saveIntent/analysisTask/runtimeResume` |
| 촬영·필요 속성 | [촬영/범위 설계](docs/capture-reading-scope-20261110/README.md), 현재 `release-reading/restoration/observationGaps`; 과거안과 구현 구분 |
| 로딩/배포·정리 | [성능 정리](docs/performance-cleanup-20261110/README.md), 실제 package/Vite/Nitro/ignore, [임시 기능](TEST_ONLY_FEATURES.md) |
| 분담/중복 방지 | [작업 세션](docs/work-sessions.md), 최신 작업 카드, 해당 파일의 현재 diff |

## 상태 갱신 규칙

- 구현이 바뀌면 해당 행만 수정하고 날짜·코드·직접 확인 또는 보고 링크를 남긴다. 지난 결과를 누적하는 실험 일지가 아니다.
- **구현됨 / 제안 / 사용자 채택 / 거부 / 미검증**을 분리한다. 사용자 새 결정이 옛 연구 문서보다 우선한다.
- 모델/기본값/지원 범위는 현재 코드와 실제 요청 identity로 갱신한다. 옛 세션 요약을 그대로 복사하지 않는다.
- 새로운 판/원문/수동값/판본 연결을 바꿀 때만 관련 보존 경로를 확인한다. 무관한 전체 검사로 작업을 지연하지 않는다.
- 완료 보고는 바뀐 사용자 행동, 재사용한 구현, 확인한 범위와 남은 문제를 짧게 쓴다. 기능 연결 완료와 정확도 목표 완료를 혼동하지 않는다.


2026-11-11 모바일 재공유: 기존 owner-private Sites의 `/current/`를 현재 제품 `RummikubBoardView`/`PhotoLayoutBoard`/`drawingLayout` 코드와 저장된58개 결과로 갱신했다. [모바일 확인](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/current/). 실제 source SHA는 해당 `current/source.json`. 가로 pan·타일 선택값·원사진 확인용이며 새 업로드·판독·서버 저장 앱 배포가 아니다. 별도 universal 시제품은 현재 제품 근거로 쓰지 않는다. 사이트 원본 commit e67d34973d337364cf1411d037f475eb34723e79, private 배포 succeeded. 제품 저장소 커밋/운영 배포/모델 호출 없음.

2026-11-12 사용자 확인: 이번 공유 화면의 오독5곳 정도는 수용한다고 응답했다. 이는 이번 표본에 대한 사용자 판단이며 전120종의5~10% 정확도 인증·위치 정답 확인을 대신하지 않는다.

2026-11-12 추론 강도 비교: 같은 원본·boxes 요청에서 high/medium/low를 각1회(사그라다+LC 총6/retry0) 실행했다. 당시 HTTP 첫 미리보기는59.5/21.1/5.6초와58.5/23.7/3.3초, 완료79.5/39.8/28.9초와75.4/44.1/30.7초였다. 당시 기본 high를 유지했으나 medium의 미대응을 오독으로 보지 않는다. 11월13일 직접 사진 대조에서 사그라다 medium이 이 표본의 high보다 좋았고 LC medium은 좌표 대응을 유보했다. 기본값은 변경하지 않았으며 일반 우열은 미확인이다. boxes는 창문 칸 ID를 묻지 않아 정식 칸 연결은0이고, 후속 high/medium18개는 추정 격자다. 정식 칸·원응답과 혼합하지 않는다. [실험·캡처](docs/estimated-board-20261112/README.md), [현재 사진 대조](docs/pro-implementation-20261113/photo-audit/README.md), [모바일 비교](https://keepboard-restoration-review-nov11.wjdrb3434.chatgpt.site/boards/). 전체 오답률·실폰 Safari는 미검증.
