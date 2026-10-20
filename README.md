# KeepBoard

카탄 사진·카메라 스캔을 그림으로 구성하고, 다른 부분과 누락된 부품만 쉽게 고쳐 저장하는 앱입니다. 완전한 상세 기록보다 빠른 정정과 재열기를 우선합니다.

```sh
npm install
```

```sh
npm run dev
```

브라우저에서 **http://localhost:4317** 을 엽니다. 휴대폰에서는 같은 네트워크의 컴퓨터 IP와 포트를 사용합니다. 모바일 브라우저의 실시간 카메라는 HTTPS가 필요한 경우가 있으므로, HTTP에서는 **사진 올리기**의 휴대폰 카메라/갤러리 선택을 사용할 수 있습니다.

## 실행 흐름

1. 카탄 예시를 열거나 새 판을 만듭니다.
2. 카메라 스윕/사진 추가로 원본을 남깁니다. AI가 연결되어 있으면 이번 촬영 묶음을 읽습니다.
3. 그림/원본을 오가며 다른 부품을 고칩니다. 여러 개의 소유색·삭제는 함께 정정하고 한 번에 되돌립니다.
4. 누락된 부품은 **추가 → 종류·필요한 설정 → 자리 선택**으로 놓습니다.
5. 누구 차례인지와 짧은 메모만 선택적으로 남기고 **이대로 저장**합니다. 모르는 정보는 비워둘 수 있습니다.
6. 저장한 그림과 사진을 다시 열어 참고하며 이어갑니다. 개인 카드 수는 소유자 화면에서 필요할 때 펼칩니다.

**예시는 그림과 미리 작성된 가상 상태입니다. 실제 사진을 인식한 결과가 아닙니다.**

## 실제 AI 연결

앱의 AI 설정에서 제공자, 모델, API 키를 입력합니다. 또는 `.env.example`을 `.env`로 복사하고 설정합니다.

- Gemini: `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL=gemini-3.8-flash`
- OpenAI: `OPENAI_API_KEY`, `AI_PROVIDER=openai`, 이미지 입력을 지원하는 `AI_MODEL`
- 사용자 지정 게이트웨이: `AI_BASE_URL` (제공자별 API 경로 기준 URL)

모델 호출은 서버에서 수행합니다. 키가 없으면 사진을 읽은 것처럼 임의 상태를 만들지 않습니다. AI가 없어도 그림 정정과 저장은 사용할 수 있습니다.

공식 API 참고: [Gemini 이미지 이해](https://ai.google.dev/gemini-api/docs/image-understanding), [Gemini generateContent](https://ai.google.dev/api/generate-content), [OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision).

## 구성

- `shared/types.ts`: 게임팩·근거·상태 주장·저장본 계약
- `gamepacks/catan.ts`: 카탄 상태·조건·질문·실물 보존 방법과 명시된 예시
- `server/engine.ts`: 선언형 요구사항·도출·질문·재개 정보 계산
- `server/store.ts`: 원본·세션·게임팩의 디스크 저장
- `server/index.ts`: API와 앱 서버
- `server/ai/`: 실제 이미지 분석·기존 원본 재분석·자료 기반 게임팩 생성
- `src/`: 촬영부터 복원까지의 UI

세션과 사진은 실행 컴퓨터의 `.keepboard/`에 남습니다. 기존 JSON 이전 API와 상세 보관 데이터는 호환을 위해 내부에 유지하며 일반 화면에는 표시하지 않습니다. 서버 디스크 저장은 클라우드 백업과 다릅니다.

카메라의 중단 시점 `captureEpoch`와 실제 게임 턴 `turnInstanceId`는 다릅니다. 재접속·날짜 변경·재개는 턴을 바꾸지 않습니다. 다음 턴 시작은 사용자의 명시적 행동입니다.

게임팩 생성은 상태 정의 → 조건부 요구사항 → 도출 규칙 → 보존 방법을 같은 JSON 명세로 만듭니다. 팩의 새 버전은 기존 저장본의 고정된 팩을 바꾸지 않습니다.

## 실행 명령

```sh
npm run typecheck
```

```sh
npm test
```

```sh
npm run build
```

```sh
npm start
```

## 현재 범위

기능 우선의 모바일 대응 웹 실행판입니다. 네이티브 VisionCamera 앱, 클라우드 계정·동기화·백업, 실시간 음성, SAM/RoMa/3D/AR 모델, 전체 게임 엔진은 포함하지 않습니다. 사진 인식 품질은 실제 API·실물·기기에서 별도로 확인해야 합니다. 카탄 기본판 중심이며 확장·변형 규칙은 게임팩 자료를 추가해야 합니다.

## GitHub / Vercel

GitHub 저장소는 비공개입니다. API 키와 실행 데이터(`.keepboard/`), 수집한 연구 원본은 Git에 포함하지 않습니다.

Vercel은 Vite 화면을 빌드하고 `/api`, `/uploads`를 기존 KeepBoard 서버로 프록시합니다. 서버의 파일 저장 방식을 유지하므로 Mac 서버와 Cloudflare 터널이 켜져 있어야 합니다. 확인용 로그인 없이 접근합니다. 터널 주소가 바뀌면 `vercel.json`의 두 프록시 주소를 갱신해야 합니다. Mac과 독립적으로 운영하려면 서버와 영구 저장소를 별도 호스팅으로 이전해야 합니다.
