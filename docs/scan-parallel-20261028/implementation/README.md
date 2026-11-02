> 2026-10-29 후속 구현 완료. 아래는 중단 당시 준비 기록이며 현재 상태는 [최종 보고서](../README.md)를 따른다. 기존 임시 입력은 사라졌으므로 과거 prepare 명령은 현재 실행할 수 없다.

# 스캔 병렬 처리 준비

상태: 설계 인계 대기. 제품 변경·실제 모델 요청 0회.

- `baseline.json`: 현재 dirty 소스 12파일의 해시와 비공개 시작 사본 위치. 기존 변경을 포함한 시작점이다.
- `prepare-timing.mjs`: 기존 실제 사진 4crop 요청의 원본·프롬프트·이미지·설정·요청 바이트를 검증한다. 키를 읽거나 네트워크에 연결하지 않는다.
- `timing-preflight.json`: 동일 요청을 순차/병렬 조건에서 재사용하기 위한 준비 목록. 병렬 수는 승인 설계 수신 후 확정한다.

준비 명령:

```sh
node docs/scan-parallel-20261028/implementation/prepare-timing.mjs
```

## 확인한 시작 상태

`analyzeScan`은 worker 1개이며 결과를 unit index로 저장한다. 클라우드 `workflows/analyze.ts`도 순차 처리한다. 기존 `CloudJobs.slot`은 unit이 아닌 job ID로 전역 2슬롯을 관리한다. 단순 unit Promise.all 추가는 이 제한을 실제 모델 호출 수의 제한으로 보장하지 않는다. workflow 인접 수정은 감독이 승인했다.

무과금 시작 회귀: 아래 5개 테스트 통과(exit 0). 실제 지연 비교 또는 병렬 처리 검증 결과가 아니다.

```sh
node --import tsx --test --test-name-pattern='crop coordinates|different-view|single Catan|uploaded crop|generic Splendor' tests/scan-recognition-integration.test.ts
```

## 설계 수신 후 검증할 경계

1. 완료 순서를 뒤집어도 결과/receipt/원본 연결은 unit index 순서이고 순차 projection과 같다.
2. 서로 다른 작업이 동시에 실행돼도 승인된 전역 호출 상한을 넘지 않는다. 실패 후에도 슬롯을 반환한다.
3. 같은 unit 동시 전달/완료 후 재전달은 유료 요청을 추가하지 않는다. started claim은 자동 재시도하지 않는다.
4. 일부 unit 실패 시 나머지 raw/receipt/source/transform을 보존한다. 상태 충돌은 원문을 유지하고 그림에 덮어쓰지 않는다.
5. owner/epoch/revision/manual 정정, 단일 Catan 그림, generic typed 경로의 기존 회귀를 유지한다.

실제 API timing 실행은 별도 감독 승인 후에만 가능하다. 이전 요청/영수증을 변경하거나 재사용 claim을 삭제하지 않는다. 순차/병렬 모두 같은 저장 요청 바이트 4개를 사용하며 총 8회 이하/retry 0이다. 모형 지연은 실제 모델 속도 또는 30초 목표 달성 근거로 보고하지 않는다.
