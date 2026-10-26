# Production 이전·원복 준비 (미실행)

현재 승인 범위는 preview 합성 검증뿐이다. 아래 대상과 범위를 감독이 확인한 뒤 실행한다. AWS와 Mac 터널은 이번 클라우드 원점 구성에 사용하지 않는다.

1. 같은 private Blob store에 preview와 다른 `production-<release>` namespace를 정한다. 원본은 `/tmp/keepboard-preview/data`의 `sessions/*.json`, `packs/*.json`, `uploads/*`, `private-pins.json`, `session-list.json`만 allowlist로 읽는다. 본문·사진·PIN hash를 출력하지 않고 파일 수/크기/SHA만 기록한다. AI 설정 파일·기존 환경파일·연구자료는 Blob/배포에 올리지 않는다.
2. 기존 DeepSeek 서버 키는 승인된 참조에서 비출력으로 읽어 같은 프로젝트의 production 서버 전용 암호화 환경변수 `DEEPSEEK_API_KEY`로 전달한다. 값은 명령줄·로그·파일 manifest·클라이언트에 포함하지 않는다. `KEEPBOARD_BLOB_PREFIX`와 Blob 연결은 production 전용, `KEEPBOARD_MOCK_ANALYSIS`는 production에 등록하지 않는다. cloud transport는 기존 deepseek-flash/high를 고정한다. 등록 후 실제 모델을 호출하지 않고 설정의 비민감 상태만 확인한다.
3. 전환 직전 진행 중인 기존 분석 작업을 확인한다. 완료를 기다리거나 명확한 중단으로 남긴다. 같은 유료 호출을 cloud에서 자동 재실행하지 않는다. 기존 Mac 프로세스·gateways는 원복 경로로 유지한다.
4. 최신 파일 수/해시와 Blob 공간 한도를 확인한다. 운영 쓰기가 계속되는 동안 읽은 일관성 없는 전체 snapshot을 최종 데이터로 간주하지 않는다. 감독이 승인한 짧은 쓰기 중지 구간을 두고 원본 각 파일의 전후 SHA가 같은 집합을 create-only로 전송하고, 다시 내려받은 bytes의 SHA와 대조한다. 변경이 감지되면 적용을 중단하며 옛 Store를 복원하지 않는다.
5. 같은 프로젝트의 새로운 backend/API·uploads origin은 Vercel 함수 자체다. 기존 tunnel rewrite가 없는 최종 cloud 배포를 production alias에 연결한다. 이전 front 주소/세션ID/게임팩/근거ID/스냅샷/사진 경로는 그대로 보존한다. 방 기기 쿠키는 같은 앱 호스트이므로 유지된다. 기존 PIN 설정은 보존되며 Mac 메모리에만 있었던 15분 unlock token은 옮기지 않으므로 다시 잠금을 풀어야 한다.
6. 전환 직후 health/비민감 설정 high/새 합성 기록 1개의 저장·사진·내보내기·재열기와 원본 파일 해시 보존을 확인한다. 기존 사용자 내용은 출력하거나 자동 수정하지 않는다. Mac URL 없이 cloud origin이 처리하는지 배포 routing으로 확인한다.

원복: cloud에 새 사용자 쓰기가 없으면 직전 Vercel deployment alias와 기존 Mac 원점 routing을 되돌릴 수 있다. cloud 사용자 쓰기가 생긴 뒤에는 옛 전체 Store로 덮어쓰면 안 된다. 먼저 양쪽 쓰기를 멈추고 cloud에서 바뀐 해당 파일만 SHA/기준 버전과 대조해 별도 반입을 준비한다. 동시 변경은 자동 덮어쓰기하지 않고 감독에게 보고한다. production 연결 전 preview 실패는 production에 영향이 없으므로 별도 원복이 필요 없다.

미검증: 현재 운영 파일 집합/전체 크기/동시 사용자 쓰기 상태, production 키 등록·자료 전송·alias 전환, cloud 실제 모델 호출 및 실제 사진 정확도. 아직 실행하지 않았다.
