# 120게임 실사진 corpus — 로컬 연구용 인계

**VERIFIED:** 120개 고유 gameId와 현재 연구 catalog ID 집합 일치. 사진 후보290건 중 원본278개(40,343,517 bytes)가 비공개 임시폴더에 존재하며 **decode·SHA256·크기·권한 검사 오류0**입니다. 예전에 제외·삭제된12건은 복구하지 않았습니다. 발견된 원본278개와 manifest 경로가 정확히 일치합니다.

게임별 **found93 / partial27 / missing0**. `found`는 직접 눈검토된 실제 play/setup 참고사진을 로컬에서 확보했다는 뜻입니다. **정확한 기준 판본·정답 데이터·모델 판독성능을 확인했다는 뜻이 아닙니다.** 개인판만 있거나 근접/가독/커스텀 등의 제한만 남은27게임은 partial이며 개별 `readLimits`를 봐 주세요. 전체 게임에 판본/확장 일치 검토가 추가로 필요합니다.

## 자료 사용

- [index.json](index.json): 120게임별 기준판본/촬영영역/추천 원본1~3개(합계247개)/가독·판본 한계/검토자를 모은 시작점. 실제 파일을 이 경로로 열어 Astra가 GT 적합성을 판단하면 됩니다.
- [manifest.json](manifest.json), [manifest.csv](manifest.csv): 모든 후보·제외 사유·source page/image URL·SHA·개별 파일 검사. `selected`만 추천 참고자료이며 전체 후보를 정답셋에 일괄 포함하면 안 됩니다.
- [coverage.json](coverage.json), [verification.json](verification.json): 상태/추천 수와 전파일 검증 결과. [bgg-id-verification.json](bgg-id-verification.json)은 공개 geekitems 제목·연도120건 HTTP200 재대조(이름 별칭/구판·개정판 메모 포함)이며 사진 판본 증명은 아닙니다.
- [reviews-sol.json](reviews-sol.json): Sol1이 contact sheet를 직접 보고 작성한198건 관찰. 기존92건의 Claude 분류는 `visualReview.reviewer`에 **이전 검토자 근거**로 보존했으며 Sol1 재검토라고 주장하지 않습니다. 기존 manifest 실제 완료는36게임이었고, stale checkpoint의6게임 표기는 갱신했습니다.

원본은 `$TMPDIR/keepboard-photo-corpus/originals`(0700/파일0600)에만 있습니다. 축소 contact sheet도 같은 private temp의 `sheets/`에만 있고 원본은 편집하지 않았습니다. **어느 이미지도 repo/public/배포에 복사하지 않았습니다.** 모든 사진의 재배포 허가는 미확인입니다. 공식 사이트 게시사진도 자동 재사용 허가가 아닙니다.

## 출처·판정 경계

공개 BGG gallery/API를 합리적인 순차 요청으로 재사용하고, 부족 게임만 추가 공개 검색/리뷰·게임모임 출처로 보완했습니다. Just One은 Repos Production 공식 게시사진1개도 따로 구분했습니다. 공식 사진120게임 전수검색은 하지 않았습니다(이전 Scout 검색1건, 이번 Just One 공식 출처 확보 외 미확인). 로그인·차단·유료벽을 우회하지 않았습니다. BGG XML API401/검색 페이지 challenge를 우회하지 않고 공개 API만 사용했습니다.

BGG `Play` tag 조회는 일부 게임에서 빈 결과여서 전체 갤러리의 후보를 눈으로 검토했습니다. 보완에서 `gallery=game` 필터를 확인해 도구에 명시 `Game` 옵션을 추가했습니다. **gallery tag/캡션 자체는 실사진 판정 근거가 아닙니다.** 도식·디지털 화면·모자이크 아트·박스/주머니만 있는 이미지, 커스텀 리테마는 부적합으로 분리했습니다. Sol 수집의 부적합 후보 일부도 로컬 provenance용으로 보존했으나 `usable:no/selected:false`입니다. 이전에 이미 지운 자료는 그대로입니다.

`visible.privateHand`는 기존 키로서 **보이는 개인영역/앞면 손패**를 뜻하며 규칙상 private 확정이 아닙니다. 공용판과 개인 앞면이 섞인 사진에는 공개 입력 주의를 기록했습니다. 사람을 식별하지 않았고, 사람이 있다는 이유만으로 판이 충분한 사진을 제외하지 않았습니다. 원근·초점·가림·확장·지역판·비표준 부품 한계는 개별 기록에 있습니다.

## 재현

```sh
node docs/game-photo-corpus/tools/corpus.mjs gallery <bggId> Game 12 hot
# pick/fetch는 후보 수집만. 실제 보기 후 review.py로 관찰 checkpoint 작성.
python3 docs/game-photo-corpus/tools/finalize.py
node docs/game-photo-corpus/tools/corpus.mjs export
```

`continue.mjs`는 미수집 게임만 순차 후보 수집, `fallback.mjs`는 이번 부족10게임 보완, `verify-ids.mjs`는 공개 이름·연도 대조입니다. 수집 스크립트를 무조건 재실행할 필요는 없습니다. 최종 로컬 검증 exit0이며 JSON/CSV290행·game ID120·unclassified0·미참조/누락 원본0입니다. **GT 검증0게임, 신규 모델API0회, 제품/운영 변경0.**
