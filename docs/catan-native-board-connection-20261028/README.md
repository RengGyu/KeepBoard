# 기존 카탄 그림 경로 연결

사진 주석을 결과 화면으로 대신 보여 주던 연결을 제거한다. 기존 `observationPrompt` → `sceneJSONSchema` → `normalizeObservations` → `SceneEditor/BoardView`를 Gemini 공용 카탄 판독 경로에 연결했다. 별도 그림 렌더러나 사진별 좌표 정답은 추가하지 않았다.

- Gemini 모델·LOW thinking·HIGH image profile은 유지한다. 카탄 공용 판만 기존 native scene 출력 계약을 사용한다. 다른 게임과 개인 사진 경로는 바꾸지 않는다.
- native scene의 hex/edge/vertex 위치와 원사진 근거를 현재 기록에 바로 적용한다. 모르는 위치·값은 그대로 남고 사용자가 기존 그림 편집기로 고친다.
- 원사진 주석은 접힌 보조 보기다. 그림을 보기 위한 후보 승인 단계가 없다.
- 이전 native 형식의 선택적 `face`가 없더라도 배치·인식값을 버리지 않는다. literal 영수증에서는 명시적 앞면이 없는 front-only 속성을 생략하고 native 원문과 장면 값은 보존한다.

검증: native 연결·호환성 7건, 관련 판독·배경 작업·UI 집중 검사, 타입 검사. 실사진 및 운영 배포 확인은 `release.json`에 기록한다.
