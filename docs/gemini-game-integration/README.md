# Gemini 게임 사진 판독 연결

기존 `analysis-jobs`에 `reader.kind: "gemini-game-observation-v1"`을 선택하면 현재 촬영 단계의 원본 사진 한 장을 Gemini 3.8 Flash로 읽습니다. 서버는 선택한 게임팩 판본·사진 정의·영역·공용/개인 범위·사진 바이트 SHA를 고정합니다. 응답이 `STOP`으로 완료되고 허용된 실물/속성만 담겼을 때 후보와 관측 영수증을 만듭니다. 기존 확정 상태는 후보 생성만으로 바뀌지 않습니다. 정정·명시 반영·저장·재열기는 기존 API를 사용합니다.

서버 전용 설정은 `KEEPBOARD_GEMINI_GAME_API_KEY_FILE`에 이미 제공된 키 파일의 **경로**를 지정하거나, 배포 환경의 `GEMINI_API_KEY`에 비밀값을 등록합니다. 파일은 서버만 읽고 API 응답·클라이언트 번들에 포함하지 않습니다. 이 선택은 기존 AI 설정과 게이트웨이 제공자를 바꾸지 않습니다. `GET /api/recognition/readers`의 Gemini 항목이 `available: true`인지 확인한 뒤 요청합니다. 키가 없으면 작업 시작 전에 거절합니다. 첫 실제 사용자 사진 작업은 비용·입력·게임 정의를 확인한 뒤 별도로 진행합니다.

요청 예:

```json
{
  "requestId": "scan-unique-id",
  "evidenceIds": ["current-photo-id"],
  "expectedCaptureEpoch": "current-epoch",
  "scope": "public",
  "reader": {
    "kind": "gemini-game-observation-v1",
    "definitionSHA": "current-photo-definition-sha",
    "areaId": "board"
  }
}
```

게임팩이 선언한 선택 영역의 보이는 실물 종류와 속성을 한 번에 판독합니다. 카탄 공용 판의 지형·숫자 원판·도둑뿐 아니라 현재 정의가 허용한 도로·건물도 같은 후보 경로에 들어갑니다. 판독 속성은 사용자 소유자, 차례, 역할, 숨겨진 상태를 확정하지 않습니다. `null`과 `0`은 구별하고, 결과가 잘렸거나 허용 범위를 벗어나면 후보를 만들지 않습니다. 사진 위치를 사용자가 확인한 카탄 공용 판 기준점이 있다면 동일 원본 관측에 연결할 수 있습니다. 여러 프레임의 병합이나 동영상 판독은 지원하지 않습니다.

제품 경로 합성 확인: `node --import tsx --test tests/gemini-game-observation.test.ts tests/gemini-game-api.test.ts`. 기존 작업·검토 회귀도 별도로 통과했습니다. 합성 검사는 실제 Gemini 인식 정확도의 근거가 아닙니다. 기존 9장 벤치마크 결과는 같은 보드 연속 사진의 지형/숫자/도둑에 한정되며, 이 제품 연결의 더 넓은 실물 범위는 실사진으로 아직 검증하지 않았습니다.
