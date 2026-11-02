# Terra 전체 사진·ROI 비교와 연결 수정

**VERIFIED:** 고정된 개발 사진 2장의 전체/ROI를 각1회, 총4회 실행했다(HTTP200/completed4, peak4, retry0). 같은 응답으로 제품 연결을 수정하고 저장·재개까지 재생했다. **숫자 오독은 남아 있으며 무누락 복원을 보장하지 않는다.**

## 같은 ROI의 직접 비교

원사진을 직접 보고 앞쪽 생태계/주사위 판의 물리 경계로 ROI를 먼저 고정했다. GT 물체별 crop·확대·기대 수량/정답 입력은 하지 않았다. 양조건은 동일 Terra named+fill+physicalUnit 계약, low/high-detail/32768이다. 쌍의 요청에서 이미지 외 본문·schema가 동일함을 검사했다.

| 게임 / 고정 부분 기준 | 전체 사진 | ROI | 수정 후 전체+ROI의 실제 편집 객체 |
|---|---|---|---|
| Cascadia: 타일21+동물 토큰18 | 개별18/39, 타일은 큰 묶음 | 개별39/39, 종류39일치 | ROI39/39 유지. 큰 부모1행을 일부 상세화 근거로 옮김 |
| Sagrada: 주사위20+창틀1 | 개별21/21, 읽을 수 있는 눈19개 중9일치·10오독 | 개별21/21, 눈13일치·6오독 | ROI21/21, 눈13/19. crop 값은 임시 선택이며 정답 인증이 아님 |

이 표본의 숫자 unknown/미회수는 두 조건 모두0이다. 기존 기준에서 `die-r3c3`의 눈은 미확정이므로 숫자 분모는20이 아닌19이며 기준을 바꾸지 않았다. 색40속성은 양조건 일치한다. Cascadia의 자유서술 속성은 정확 문자열 일치31→53/78, 표현이 다른 문자열5→25는 **observed-unjudged**로 남겼다. 이를 전부 오답/정답으로 처리하지 않는다.

공통 ROI 기준 물체는 Cascadia39, Sagrada21 모두 온전하게 포함되고, 경계 잘림 기준 물체0·ROI 밖 기준 물체0이다. 이것은 사진 전체/모든 종류의 전수 GT가 아니다. 원래 제외된 다른 플레이 영역·공용 물체·작은 인쇄물까지 정확도를 주장하지 않는다. crop 경계에 걸친 새로운 관측은 연결에서 보류하며 합성 회귀로 따로 검사했다.

평가 방법은 기존 고정 AI 부분 기준과 geometry-only reciprocal unique 최대 IoU≥.25다. 값이나 종류를 이용해 잘못된 위치를 맞추지 않는다. `scores.json`은 원관측 회수, 오독/모름/누락, 최종 편집 객체를 구분한다. 전체 사진 정확도는 null이다.

## 제품에서 달라진 점

- Terra v2가 `physicalUnit:single|group|unknown`을 수량과 별개로 보존한다. single+수량null은 null 그대로다. 모순된 single+수량>1은 단위 unknown으로 보류하며 원수량/원문은 유지한다. 과거 응답에는 단위를 추측해 채우지 않는다.
- generic 융합은 명시 group+수량null의 일부 상세화를 지원한다. 같은 원본·영역·owner/epoch·확인된 crop 변환, 유일한 부모, 온전한 개별 child가 필요하다. 남은 수량null·exhaustive:false다. 다른 시점 자동 정합은 하지 않는다.
- unknown-null 큰 상자는 자동 분할하거나 child와 함께 실물로 합산하지 않는다. 겹친 부모/겹침 사슬/잘린 child/빈 bbox는 원관측과 미연결로 보존한다. 같은 단위의 이웃 물체는 합치지 않는다.
- 수동 null/0/false·수량·배치·삭제를 보존한다. 수동 수정/삭제한 묶음을 다음 crop이 교체하거나 되살리지 않는다. 수정·확인을 필수로 요구하지 않는다.
- 기존 Catan/Rummikub/Splendor native 융합 정책은 확장하지 않았다. UI는 접힌 원사진 상세에 단일/묶음/미확정 **판독 주장**만 표시하며 실물 총수라고 부르지 않는다.
- 인접 `hostedReader.ts`/`cloudRuntime.ts`는 이전 v1 작업 재전달 때 고정된 adapter profile을 선택하도록만 수정했다. 기존 v1 본문과 새로운 v2 본문을 혼동하지 않는다.

같은 새 응답의 진짜 수정 전 제품을 먼저 실행해 `before-product.json`에 SHA와 결과를 고정했다. Cascadia 전사진 편집행은 **60→59**이며 큰 부모와 개별 child의 동시 표시 후보1→0이다. 평가 ROI의 개별 회수는 수정 전에도39/39였으므로 **제품 수정이 새21개 검출을 만들었다고 주장하지 않는다**. 그 회수 이득은 ROI 모델 판독에서 왔다. 나머지20행은 다른 사진 영역의 물체/묶음이며 정답 개수로 세지 않는다. Sagrada 전사진 편집행28과 ROI21은 유지됐다.

두 결과의 원관측78/49행은 모두 보존됐다. 평가 범위에 대응되는 잘못된 연결0·개별 중복 후보0이며, 범위 밖 관측을 환각이나 오연결로 자동 판정하지 않았다. 이는 이 AI 부분 기준/사진에서의 결과이며 일반 보증이 아니다.

## 시간·토큰·비용

| 요청 | provider초 | input | cache write / hit | output | reasoning(출력에 포함) | total | 요금 환산USD |
|---|---:|---:|---:|---:|---:|---:|---:|
| Cascadia 전체 |41.333|2079|2076 / 0|3489|54|5568|0.020043|
| Cascadia ROI |46.557|1301|1298 / 0|3953|32|5254|0.0213905|
| Sagrada 전체 |34.168|1937|1934 / 0|2846|65|4783|0.0166505|
| Sagrada ROI |25.843|1184|1181 / 0|2101|52|3285|0.01198425|

총4회 병렬 wall46.585초, 가격 환산합계 **$0.07006825**(실제 청구/잔액 아님). Cascadia ROI는 개별 출력을 더 반환해 출력 토큰과 비용·provider 시간이 늘었다. Sagrada는 이 한 쌍에서 ROI가 더 짧았지만 오독6개는 남았다. ROI 추가 비용은 각각 $0.0213905/$0.01198425이다. 모델4개가 동시 실행된 단일 표본이므로 단독 요청과의 인과적 속도 우월을 주장하지 않는다.

원본 crop 생성 시간은 `preflight.json`에, 결합 시간은 before/after 제품 재생에 별도 기록했다(수정 후 약21ms/4ms, 실행마다 변동). 촬영/업로드/실제 브라우저 첫 그림/사람 정정 시간은 측정하지 않았으므로 종단 스캔 시간으로 표현하지 않는다. [공식 가격](https://developers.openai.com/api/docs/pricing), [캐시 쓰기](https://developers.openai.com/api/docs/guides/prompt-caching).

## 직접 검증과 한계

- 새·관련 집중61/61, `npm run build` exit0(타입검사 포함, 큰 청크 경고). 별도 `npx tsc --noEmit` exit0.
- 새 group-null/ single-null/unknown-null·부분 부모·잘린 child·수동 삭제, 기존 false/0, source/owner/epoch/영역, 역순/재전달, native/Gemini 경로를 검사했다. `fusion-red.log`의 신규6검사 중5실패→GREEN 근거를 보존했다.
- 이전18응답의 디코드·조립18/18, 관측속성749/749·face41 보존(`legacy18-replay.json`). 옛 연구 파일은 덮어쓰지 않았다.
- `http-replay.json`: **외부 호출0**, 저장된 응답만 반환하는 reader로 실제 두 게임 스캔→자동 accepted→commit→resume. Cascadia59행 그대로 재개. Sagrada는 의도적으로 null·0을 정정하고 한 행 삭제했으며 늦은 결과가 stale로 보류돼27행으로 재개했다. 이 삭제는 모델 누락이나 새 GT가 아니다. 원문·단위 metadata는 불변이다.
- 최초 실험 harness는 raw catalog pack으로 조립해 네 unit을 실패로 기록했다. 실제 provider 응답/디코드4건은 정상이다. **실제 서버와 같은 effectiveRecognitionPack**으로 오프라인 재조립하고 HTTP 경로로 확인했으며 네 요청 본문 SHA 불변을 검증했다. 처음 `execution.json`/실패 unit은 수정하지 않았다. 유료 재요청0이다.
- 전역 Chrome 조작 중단 지시를 유지했다. 실제 브라우저 검수는 이번에 **NOT_RUN**이며 SSR/loopback을 브라우저 검사라고 부르지 않는다. 전체 suite/build:vercel·배포는 감독 범위다.

`verification.json`에 원본/ROI/본문/원응답/기준/소스 SHA와 보존 검사를 모았다. source freeze와 자기 dirty delta는 `source-freeze.json`, `product.delta.patch`다. 사진·전체 GT·원응답·세부 채점은 private 임시 폴더에만 있다. `prepare.mts`와 `run.mts`는 동결/완료 파일이 있으면 재실행을 거절한다. 추가 시험은 자동 실행하지 않는다.
