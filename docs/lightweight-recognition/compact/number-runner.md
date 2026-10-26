# N1/N2 제품 경로 실행기

[준비/명령 manifest](number-runner.json), [동결 실행기](runner/run-number-comparison.mts), [송신 전 준비 근거](number-execution-preflight.json).

runner SHA: `4b62559a6ca3436b11238462c75fe93c3bbab599578fdc18c6baa4a8535ca411`.

`--prepare`는 별도 private Store의 독립 두 Catan 세션을 만들고 같은 **서버 정규화 후 accepted 값**을 pin한다. 분석 job·모델 전송은0이다. 원frame 파일을 바꾸지 않고 sourceEvidenceId만 새 증거에 기계적으로 재결합했다. 준비 중 발견한 UI watcher 종료와 baseline pin 오류는 도구에만 교정했고 이전 메타데이터를 private backup으로 남겼다.

`--execute`는 실제 job API → LocalReader → compact adapter → 후보를 사용한다. 배치 `wx`와 N1/N2 각각의 전송 직전 `wx` ledger가 재실행을 거절한다. 실제 bodySHA·source/inputSHA·live runtime profile을 확인한 뒤 현재 소유 모델에만 전송한다. N1 실패/잘림/형식 오류/stale/timeout이면 N2를 쓰지 않는다. 유효한 빈 결과나 숫자 오독은 N2 비교를 막지 않는다. 실패 포함 최대2, 재시도0, 동시1, timeout600초, output1024, paid0이다.

실제 전송 명령은 **승인 후에만** 아래와 같으며 준비 인자에서 mode와 새 결과 경로만 바꾼다. cwd는 stage다.

```sh
node --import tsx tools/lightweight-recognition/run-number-comparison.mts --execute /Users/jeonggyuju/Project_folder/KeepBoard/docs/lightweight-recognition/compact/number-comparison-prepared.json /Users/jeonggyuju/Project_folder/KeepBoard/docs/lightweight-recognition/sol1-independent-number-gt.json /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-local-reader-vyzn4xm9-55c8peu1/reader-config.json /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-local-reader-vyzn4xm9-55c8peu1/number-comparison-product-v1 /Users/jeonggyuju/Project_folder/KeepBoard/docs/lightweight-recognition/compact/number-comparison-result.json
```

실행 카드 이후의 상태는 [별도 실제 결과](number-comparison-result.json)에 기록한다. 사전 준비 보고서는 덮어쓰지 않는다. 원문·GT·점수별 대응행·source 사진은 private 경로에만 남긴다. 두 조건이 종료되거나 중단된 후에만 GT 값으로 strict reciprocal-center18분모 평가를 하며 숫자로 재매칭하지 않는다. unmatched extra는 별도 눈검토 전에는 확정 false-positive로 부르지 않는다.

작업/reader와 provider의 prompt/decode·usage를 기록한다. assembly만의 시간은 현재 제품에서 분리 계측되지 않아 UNKNOWN, 독립 UI 정정·저장 시간은 PENDING이다. 실제 image token·전체 Metal·기기 전력 비용도 UNKNOWN이다. 원본18과 atlas 포함18을 함께 보고하며 한 쌍의 결과를 전체 게임 정확도·안정 속도로 확대하지 않는다.
