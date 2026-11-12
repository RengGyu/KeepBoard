# KeepBoard

게임 사진과 현재 상태를 저장하고, 읽힌 구성물을 그림에서 고쳐 다시 펼쳐 보는 앱입니다. 현재 120종 게임팩을 사용하며, 게임별 상태·질문·실물 보존 방법을 공통 실행기와 UI에 연결합니다.

설계·구현·남은 작업은 먼저 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)를 읽습니다. 기존 보드·아트·정정·저장 기능과 미완료 작업, 참고자료를 모은 작업 기준입니다.

```sh
npm install
```

```sh
npm run dev
```

브라우저에서 **http://localhost:4317** 을 엽니다. 휴대폰에서는 같은 네트워크의 컴퓨터 IP와 포트를 사용합니다. 모바일 브라우저의 실시간 카메라는 HTTPS가 필요한 경우가 있으므로, HTTP에서는 **사진 올리기**의 휴대폰 카메라/갤러리 선택을 사용할 수 있습니다.

## 실행 흐름

1. 게임을 골라 보드를 만들거나 기존 기록을 엽니다.
2. 사진 추가나 카메라 스캔으로 원본을 남깁니다.
3. **저장**하면 사진·편집값을 보존하고, 사용할 판독기가 연결된 경우 필요한 사진의 판독을 시작합니다.
4. 판독 중에도 차례·메모를 입력할 수 있습니다. 완료 결과는 같은 저장 의도에 연결되어 다시 열거나 재개할 수 있습니다.
5. 기존 게임별 보드와 아트에서 읽힌 값을 확인하고, 구성물을 눌러 다른 값만 고칩니다. 원사진도 함께 볼 수 있습니다.
6. 수정값을 저장하고, 이후 저장된 그림·사진·차례·메모를 참고해 게임을 이어갑니다. 개인 영역은 해당 소유 범위를 유지합니다.

**예시는 그림과 미리 작성된 가상 상태입니다. 실제 사진을 인식한 결과가 아닙니다.**

## 실제 AI 연결

앱의 읽기 설정에서 사용 가능한 판독기를 선택합니다. 현재 기본 제품 경로는 Terra high 게임 관측 판독기입니다. 서버 환경의 API 설정이 필요하며, 소스 기본값과 실제 실행 설정은 구분합니다.

기존 제공자 설정 경로는 앱의 AI 설정 또는 `.env.example`을 참고합니다. Gemini·OpenAI·사용자 지정 게이트웨이 등 별도 설정 경로를 현재 기본 판독기와 혼동하지 않습니다.

모델 호출은 서버에서 수행합니다. 키가 없으면 사진을 읽은 것처럼 임의 상태를 만들지 않습니다. AI가 없어도 그림 정정과 저장은 사용할 수 있습니다.

공식 API 참고: [Gemini 이미지 이해](https://ai.google.dev/gemini-api/docs/image-understanding), [Gemini generateContent](https://ai.google.dev/api/generate-content), [OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision).

## 구성

- `shared/types.ts`: 게임팩·근거·상태 주장·저장본 계약
- `gamepacks/catalog.ts`, `gamepacks/generated/`: 현재·구판 게임팩과 판본 연결
- `shared/restoration.ts`, `shared/drawingProjection.ts`: 판독 범위·게임/사진 위치와 그림 연결
- `src/SceneWorkspace.tsx`, `src/RummikubWorkspace.tsx`, `src/GameBoardRecord.tsx`: 기존 native·공통 보드와 정정 화면
- `public/game-art/`: 기존 게임별 보드·칸·노선·구성물 그림
- `server/engine.ts`: 선언형 요구사항·도출·질문·재개 정보 계산
- `server/store.ts`, `server/blobStore.ts`: 로컬·클라우드 세션/원본 저장
- `server/saveIntent.ts`, `server/analysisTask.ts`, `server/runtimeResume.ts`: 저장·판독 완료·재개 연결
- `server/index.ts`: API와 앱 서버
- `server/ai/`: 실제 이미지 분석·기존 원본 재분석·자료 기반 게임팩 생성
- `src/`: 촬영부터 복원까지의 UI

로컬 실행의 세션과 사진은 실행 컴퓨터의 `.keepboard/`에 남습니다. 클라우드 경로는 설정된 private Blob/Supabase 저장소를 사용합니다. 기존 JSON 이전 API와 상세 보관 데이터는 호환을 위해 내부에 유지하며 일반 화면에는 표시하지 않습니다. 로컬 디스크 저장이나 클라우드 어댑터의 존재만으로 계정 동기화·백업 완료를 뜻하지는 않습니다.

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

기능 우선의 모바일 대응 웹 실행판입니다. 현재 120종의 기술적 판독·그림 경로와 구판 기록을 지원하지만, 전 게임의 실사진 정확도나 실기기 품질을 인증한 상태는 아닙니다. 카탄·루미큐브 native 보드, 일반 게임의 기존 칸·노선·자유 배치와 아트를 재사용합니다. 사진 배치의 가독성과 미배치 관측 연결은 현재 보완 중이며 최신 상태는 작업 기준 파일을 따릅니다.

네이티브 VisionCamera 앱, 실시간 음성, SAM/RoMa/3D/AR 모델, 모든 게임의 완전한 규칙 엔진은 포함하지 않습니다. 개발용 임시 기능과 제거 조건은 [TEST_ONLY_FEATURES.md](TEST_ONLY_FEATURES.md)에 기록합니다.

## GitHub / Vercel

GitHub 저장소는 비공개입니다. API 키와 실행 데이터(`.keepboard/`), 수집한 연구 원본은 Git에 포함하지 않습니다.

현재 `vercel.json`은 `npm run build:vercel`로 Vite와 Nitro의 `.vercel/output`을 만듭니다. `server/cloudEntry.ts`가 API를 제공하고, Workflow가 백그라운드 판독을 실행하며, 설정된 private 저장소에 원본과 기록을 보존합니다. Mac 서버·Cloudflare 프록시를 전제로 한 이전 구성과 다릅니다. 실제 운영에는 해당 클라우드 저장소·판독기·Workflow 환경 설정이 필요하며, 현재 소스와 배포본의 일치 여부는 배포 시 확인합니다.
