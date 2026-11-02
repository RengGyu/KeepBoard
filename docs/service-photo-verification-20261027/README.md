# 실제 사진 1회 서비스 경로 검증

이 실행기는 기존 `createApp → 사진 업로드 → Gemini analysis-jobs → 후보 → 변경 없는 명시 적용 → 저장·재열기` 경로만 사용한다. 기존 제품 스모크의 가짜 도로와 의도적인 지형 정정은 넣지 않는다. 사진은 지정된 SHA의 사용자 제공 원본 한 장으로 고정한다. `check`는 키 내용을 읽거나 API를 호출하지 않는다.

검토된 검사 명령과 결과:

```sh
node --import tsx docs/service-photo-verification-20261027/live-one.mts --mode check --data-dir /private/tmp/keepboard-service-photo-preflight-worker-02 --photo /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/paseo-attachments-BMUIjY/823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6.jpg
```

검사에서 원본 SHA `823226a0…b5b372f0838d6`, 현재 사진 정의 SHA `33f9ba8c…d87c25cdd4`, 요청 본문 SHA `203e548c…70ba6f95c`, prompt SHA `048865e4…ecb36`, 제공자 호출 0을 확인했다. 전체 값은 비공개 디렉터리의 `preflight.json`에 있다.

감독이 소스와 사전 결과를 검토한 뒤 사용할 **실행 명령**은 다음과 같다. 같은 디렉터리에서는 `single-attempt.claim`을 독점 생성하므로 재실행할 수 없다.

```sh
env KEEPBOARD_GEMINI_GAME_API_KEY_FILE=/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API node --import tsx docs/service-photo-verification-20261027/live-one.mts --mode execute --data-dir /private/tmp/keepboard-service-photo-preflight-worker-02 --photo /var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/paseo-attachments-BMUIjY/823226a0c1ff53585406e8f9681601d56a2ba2365fb1fc2f574b5b372f0838d6.jpg
```

실행 시 외부 주소를 Gemini 3.8의 고정 endpoint 하나로 제한하고, 전송 직전 본문·사진 SHA를 재확인한다. 제공자 시도는 최대 1회, 자동 재시도 0, 제품의 제공자 타임아웃 180초다. 원응답 복제, 요청 설명, 후보 원본, 재열기 상태는 소유자만 읽는 임시 디렉터리에 둔다. 공유 출력은 상태·개수·SHA·값과 위치 보존 여부만 담는다. 모델 판독 정확도는 별도 사람이 원사진과 원응답을 대조해야 판단할 수 있다.

**현재 상태:** 감독이 별도 `/private/tmp/keepboard-service-photo-20261027-run01`에서 실제 요청 1회와 후속 오프라인 저장·재열기를 완료했다. 위 명령은 준비 당시 이력이며 추가 실행이 필요하지 않다. [실측 결과·한계·실행기 교정](results/README.md)을 먼저 읽는다. 최초 실행기는 비공개 `requestId`로 작업을 조회하는 문제가 있어, 이미 완료된 결과를 `finish-existing.mts`로 외부 호출 없이 이어 검사했다. 현재 실행기는 POST에서 받은 공개 `job.id`를 사용한다. 현재 파일 SHA는 최초 실행 preflight와 다르며, 교정 뒤 추가 유료 요청은 보내지 않았다.
