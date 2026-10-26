# KeepBoard 작업 세션

모든 세션은 KeepBoard의 기존 로컬 워크스페이스 `wks_81a16b8722c27606`에 있다.

| 역할 | Paseo agent ID | 모델 | 추론 | 담당 파일 |
|---|---|---|---|---|
| 구현솔 | da51c3c1-e75a-488e-9ef7-ea690b88866e | gpt-6.1-sol | high | src/** |
| 구현솔2 | 93f1d851-6097-415a-97f6-929ed2d454b3 | gpt-6.1-sol | high | server/** (ai/ 제외), tests/engine.test.ts |
| 잡무루나 | 073cca94-7183-4ba8-b3d9-9f4d3f71018a | gpt-6-luna | xhigh | gamepacks/**, public/demo-board.svg, public/favicon.svg |
| 연구아스트라 | 1824fd86-8403-4e89-bdef-be88e4fba247 | gpt-6-astra | max | 대기. 사용자 명시 허락·의뢰 시에만 사용 |
| 클로드 | 63e3a1a0-8fee-4cd4-bb28-4cb4805cdf8a | claude-opus-5-5 | high | 대기. 이번 구현 미사용 |

감독관은 shared/types.ts, 프로젝트 설정, server/ai/**, 문서와 통합 실행을 담당한다. 같은 파일을 동시에 수정하지 않는다. 결과 파일을 직접 확인하고 통합한다.
