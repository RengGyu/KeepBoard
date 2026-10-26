# 상태 그림 · 사진에서 저장과 재개까지

승인된 방향을 구현했다. 시각 기준은 현재 파랑 액센트와 기존 목재 말·크림 카드의 재료감이다. 내용은 빈 테이블/상자 → 휴대폰 촬영 안내 → 저장 후 포장 → 다시 열 때 펼침 순서다. 움직임은 작은 주사위 로더 1그룹과 성공 후 800ms 이벤트(부품·뚜껑·전체 사라짐)로 제한한다. 보드 편집 배경은 움직이지 않는다.

## 실제 연결

| 파일 | 연결 |
|---|---|
| `src/BoardFeedback.tsx` | 재사용 `LoaderMark`, `EmptyBoardArt`, `CaptureHelp`, `CurrentTurnMark`, `BoardEvent` |
| `src/board-feedback.css` | 독립 스타일. 기존 테마 변수 사용, 타이포/전역 레이아웃 변경 없음. `prefers-reduced-motion`은 정지 그림으로 표시. |
| `src/ui.tsx` | Busy의 generic spinner를 20px 주사위로 교체. Empty는 테이블/상자, 검색, 삭제 목록, 조용한 기본 그림을 구분. 명시적 `scene`도 가능. 기존 PlayerPiece 유지. |
| `src/Capture.tsx` | 휴대폰/손/판 그림을 영상 **밖**의 설명 영역에 표시. 영상의 중앙 아이콘을 제거하고 투명 테두리만 유지. 촬영·전송·완료 로직 변경 없음. |
| `src/SessionWorkspace.tsx` | 기존 `flush()` → `await mutate(api.commit)`가 **모두 성공한 뒤** save 이벤트 번호 증가. 오류/대기/일반 필드 수정/owner 전환은 효과를 시작하지 않음. accepted `currentPlayer`와 정확히 일치하는 플레이어 탭만 현재 차례 주사위 표시. |
| `src/CatanOverview.tsx` | 기존 마을 말 옆, 실제 accepted currentPlayer의 공개 플레이어 항목에만 차례 표시. |

`BoardEvent`는 mount 뒤 800ms에 제거한다. 포인터를 받지 않고, modal보다 아래이며, 개인정보를 담지 않는 장식이다. 저장 성공 안내는 기존 toast의 `role=status`가 담당하므로 그림은 `aria-hidden`이다. Busy도 기존 부모 status 또는 버튼 텍스트가 안내하므로 기본 live region을 중복하지 않는다. 단독 상태로 쓸 때만 `announce`를 켠다.

## 감독의 App 연결 지점

App.tsx는 수정하지 않았다. `SessionWorkspace`가 owner/PIN 변경에도 remount되므로 mount 자체를 재개로 취급하지 않는다. 감독이 아래 훅을 App 수명에 두어 실제 열기 성공에만 연결한다.

```tsx
import { BoardEvent, LoaderMark } from './BoardFeedback';
const [reopenFeedback, setReopenFeedback] = useState(0);
// open(id)의 api.session 성공 뒤 receive(next)와 함께:
if (next.session.snapshots.length) setReopenFeedback(n => n + 1);
// App 최상위, owner/PIN으로 key가 바뀌는 SessionWorkspace 밖:
{reopenFeedback > 0 && <BoardEvent key={reopenFeedback} kind="reopen"/>}
// 기존 첫 loading-screen의 LoaderCircle만 교체:
<LoaderMark size={32}/>
```

URL로 저장한 판을 직접 여는 초기화 경로에도 같은 **성공 후** 이벤트를 적용할 수 있다. 생성 성공·owner 전환·PIN 잠금/해제에는 재개 번호를 올리지 않는다. 초기 loading 안내는 기존 설명을 유지하고 부모 하나만 `role=status`로 둔다. App에 기존 보드 열기 안내가 있다면 그림에는 추가 안내를 넣지 않는다.

## 확인한 것과 확인하지 못한 것

[verification.json](verification.json)은 실제 컴포넌트의 합성 SSR 검사와 코드 검사 범위를 구분한다. 합성 세션만 사용하고 네트워크는 실패하도록 막았다. 미확인/사진 후보/존재하지 않는 플레이어에는 주사위가 없고, accepted 기존 플레이어 탭에만 하나가 표시되는 것을 실제 마크업으로 확인했다. 기존 카탄 마을/카르카손 미플, Busy 접근성, 맥락별 Empty도 확인했다. 저장 성공 연결 순서·포인터 비차단·reduced-motion 선언은 소스 검사이며 실제 클릭/재생 검증은 아니다.

[contact-sheet.svg](contact-sheet.svg)는 **실제 컴포넌트 SVG를 재사용한 그림만의 정적 시트**다. 실제 앱 화면 캡처가 아니고 애니메이션 프레임 재생도 아니다. 추가 SVG 렌더러/의존성을 설치하지 않아 PNG는 만들지 않았다.

CUA가 apps/browsers unavailable로 실행되지 않아 390/1440 실제 화면, 오버플로·44px 터치영역, 실제 저장 성공/실패 이벤트와 reduced-motion 재생은 미확인이다. 감독도 동일 장애를 확인했고 새 브라우저나 headless로 우회하지 않았다. 4392 합성 프리뷰 서버는 감독 소유이며 시작·재시작·중단하지 않았다. 실제 사용자 store·사진·AI 호출도 사용하지 않았다.

```sh
npm run typecheck
node --import tsx --import ./docs/board-story/feedback/register-css.mjs docs/board-story/feedback/verify.mts
node --import tsx --test tests/quick-save.test.ts tests/private-workspace.test.ts tests/scan-batch.test.ts
```

CSS 무시 loader와 최소 lifecycle listener stub은 Node SSR 확인용 파일에만 있다. 제품 빌드·API·PIN 로직에는 적용되지 않는다. 공유 `npm run build`는 실행하지 않는다.
