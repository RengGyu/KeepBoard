# 공유 main 로컬 실행·제약

검사된 union59파일이 공유 main에 반영됐다. [적용 영수증](main-apply-4vzz3xw8.json)에 각 pre/postSHA와 기존18파일의 비공개 백업 위치가 있다. 자동 원복은 수행하지 않았다. 되돌릴 때도 이후 사용자 변경을 먼저 대조해야 한다.

프로젝트 실행 명령은 `npm run dev`, 표준 빌드는 `npm run build`다. main 빌드는 의존성 복원 뒤 통과했다. [최종 빌드](main-build-round2/verification.json). 서버 실행·재시작은 하지 않았다.

기존 main에는 `@vercel/blob@2.8.2`, `workflow@5.2.3`이 없어 첫 빌드가 실패했다. 현재 lock의 깨끗한 `npm ci`도 chokidar/readdirp 배치 불일치로 실패한다. lock은 변경하지 않았고, 동일 package/lock으로 검사를 통과한 stage의 의존성을 파일·링크 대조 후 main 실제 디렉터리로 복사했다. main deps는 임시 폴더 symlink가 아니며 이전 deps는 [복원 영수증](main-dependency-copy-round2/verification.json)의 비공개 위치에 보존했다. 새 환경의 npm ci 재현에는 별도의 lock 정합성 작업이 필요하다. [원래 빌드 실패](main-build/verification.json) · [npm ci 실패](main-dependency-restore-round2/npm-ci.log).

로컬 판독은 별도 준비된 llama.cpp 모델 서버와 비공개 reader 설정이 필요하다. 모델 가중치·설정·사진·GT·원응답은 소스에 포함하지 않았다. 기본 AI 경로는 그대로이며 로컬 숫자 task는 사용자가 지원 여부를 확인해 명시 선택한다. 지원되지 않는 cloud 경로가 유료 모델로 자동 전환되지 않는다.

현재 준비된 로컬 모델과 설정을 사용해 개발 서버를 새로 시작할 때는 다음과 같이 설정 경로를 명시한다. 이 문서 작성 과정에서 명령을 실행하거나 기존 서버를 재시작하지 않았다.

```sh
KEEPBOARD_LOCAL_READER_CONFIG='/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-local-reader-vyzn4xm9-55c8peu1/reader-config.json' npm run dev
```

화면에서 로컬 판독기와 ‘카탄 숫자만 읽기’를 선택한다. 이 경로는 현재 컴퓨터의 비공개 임시 캐시이며, 모델 프로세스 종료·캐시 정리·다른 컴퓨터로 이동 후 자동으로 재구성되는 설치는 아니다. 설정을 전달하지 않은 `npm run dev`는 기존 기본 AI 경로를 사용한다.

카탄 숫자 task는 숫자 부분 관측이다. 지형·건물·전체판 인식 완료를 뜻하지 않는다. 기준점 없는 원본 관측도 가능하지만 배치는 별도 검토가 필요하며, 맞춘 판 입력에는 확인된 기준점이 필요하다. 후보 정정과 명시 반영 후 저장한다.

실사진 두 조건은 strict16/18, reader 약57.5~57.7초였다. [실측](../compact/number-comparison-result.md) · [실제 결과 UI 검수](../number-comparison-ui/README.md). UI에서는 각각 값1개/2개를 정정하고 18칸 배치를 확인해 저장·재열기했으며 원문과 수동 도로를 보존했다. 도구 포함 저장 wall95.319/81.962초는 순수 조작 시간이 아니고 학습효과도 있어 속도 우열 근거로 쓰지 않는다. 전체 게임 정확도·에너지 비용은 확인되지 않았다.

기존 mock51328, 평가56275, 모델50836 서버를 이 적용에서 재시작하거나 종료하지 않았다. 공유 main 반영은 공개 Vercel 배포와 별개이며 이번 배포는0회다.
