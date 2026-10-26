# 경량 사진 판독 v1 — 구현 계약

2026-10-24. **공통 소형 비전 관측기 → 게임/판본별 허용 관측값 → 코드로 기존 후보 조립 → 사용자가 정정·반영·저장**을 구현한다. 별도 해석 LLM은 없다. 앞선 Argon 중심 제안은 현재 선택안이 아니다. 첫 완주 사례는 **Catan 기본판의 지형·숫자·도둑 후보와 판 배치**이며, 같은 reader가 Splendor 시장의 인쇄값을 읽는 두 번째 사례로 재사용됨을 확인한다. 도로/건물/항구도 원본·미확인 후보를 보존하되 첫 지형/숫자 결과로 그 정확도까지 주장하지 않는다.

이미 승인된 구현은 아래 계약으로 바로 진행한다. 추가 일반 설계 승인을 요구하지 않는다. 이 연구에서는 제품/설정/모델 실행·다운로드를 하지 않았다. 새 유료 GPU/서비스와 배포는 이번 권한 밖이다. 고정 비용·시간·정확도 합격선은 두지 않는다.

**실제 실행 경로와 A/B**

| 후보 | 수행 내용 | 실제로 필요한 것/한계 |
|---|---|---|
| A — 정밀 관측에 한정한 경량 reader | 선택 영역 한 사진에서 개체 종류, 실제 인쇄값/색/앞뒤, 사진 bbox만 읽음. 앱 ID·게임 규칙·턴 추론 없이 짧은 JSON | 우선 후보 `Qwen3-VL-4B-Instruct` Q4_K_M + llama.cpp의 이미지 지원 Chat Completions. Instruct이며 별도 긴 thinking 모델을 사용하지 않음. 이름의 ‘경량’은 정확도/속도 보증이 아님 |
| B — 같은 reader + 최소 기하/실물 참조 | Catan의 확인된 판 평면으로 tile ROI를 정렬해 읽고, 코드가 hex 슬롯 후보를 연결. 허용되고 판본이 맞는 실물 참조가 있다면 종류 후보만 추가 | 별도 LLM/전게임 detector 없음. B0=기하만으로 동작 가능. B1=유효한 실물 참조가 실제 존재할 때만 비교; 없는 자료를 UI 아트로 대체하지 않음 |

공식 Qwen GGUF는 Apache-2.0, llama.cpp는 MIT다. 공식 파일 목록상 Q4_K_M 약2.5GB와 F16 projector 약836MB가 있고, llama.cpp는 Metal 및 이미지 입력/JSON 출력 경로를 제공한다. 파일 크기는 실행 RAM이 아니며 KV cache·영상 encoder buffer·동시 앱 메모리는 별도다. [Sol1 preflight](sol-preflight.json)는 **M1·16GB·Metal, 약33.8GB 가용 디스크, 학습 비전 runtime/weight 없음**을 보고했다. 이 규모의 단일 Q4 reader를 준비해 측정하는 것이 현실적인 첫 후보이며 RAM/속도가 검증됐다는 뜻은 아니다. Sol2가 격리 runtime revision·weight/projector SHA를 고정한다. 소형 모델이나 A100 논문 수치에서 현재 Mac 지연을 추정하지 않는다. [공식 가중치](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF), [이미지 실행](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md), [서버 계약](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [Metal](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md), [런타임 라이선스](https://github.com/ggml-org/llama.cpp/blob/master/LICENSE).

실행은 개발 Mac의 기존 Express 분석 job → **로컬 resident reader** 한 개로 한다. GPU가 확인되면 해당 backend, 아니면 CPU 실제 실행으로 가능 여부를 측정한다. Vercel 함수 안에 수GB 모델을 넣거나 원격 GPU를 새로 마련하지 않는다. cloud 배포에서 이 로컬 reader를 어떻게 상시 제공할지는 미확정이며 로컬 완주 성공과 구분한다. runtime/weight가 없으면 인터페이스만 완료로 보고하지 말고 필요한 정확한 artifact/실행 조건을 감독에게 반환한다. 작은 가역적 로컬 runtime/dependency 준비는 구현 범위로 승인됐다. Sol2가 단독 준비하고 새 paid GPU/서비스 없이 실행한다. 이 문서는 실제 준비됐다고 주장하지 않는다.

첫 실행의 자원 제한은 동시1, 자동 retry0, 한 선택영역/사진당 추론1회다. 출력/컨텍스트는 해당 runtime의 실제 image token 수와 컴파일한 schema에 맞게 제한하고 설정값·중단을 기록한다. 제한으로 잘린 응답은 성공으로 재분류하지 않는다. 이는 자원 관리이며 속도 합격선이 아니다. 기존 유료 provider로 자동 fallback하지 않는다. 로컬 호출의 provider 요금0과 전력·기기 점유·운영비 UNKNOWN을 구분한다.

Tesseract5.5는 이미 실행 가능하지만 숫자 OCR 비교용이다. 숲/산·말 종류·주사위 눈을 포함한 Catan 전체 판독으로 세지 않는다. preflight의 Florence-2-base는 OCR/영역 검출 후보이나 별도 task/label→게임 literal 연결이 필요하다. 첫 구현에 두 학습 runtime을 설치하지 않고, 현재영역의 literal schema를 직접 반환할 수 있는4B 하나를 먼저 측정한다. 4B 선택은 기존 provider보다 낫다는 결론이 아니며 실측 실패 시 대안을 다시 고른다.

**안정화한 데이터 계약**

[contract.json](contract.json)은 wire JSON Schema, 조립 규칙, **120개 정확한 game ID의 source/edition/area/visible/manual/physical-preserve 연결**을 포함한다. 새 120게임 지식 사전이 아니라 현재 capture/readout/runtime 데이터의 해시 고정 투영이다. `visible`은 사진에서 요청할 수 있는 필드라는 뜻이며 실제 사진에서 읽혔다는 뜻이 아니다. 117 typed의 1,295 visible/505 manual은 기존 선언 그대로; 나머지 Catan/Rummikub/Splendor는 명시 native bridge를 쓴다. 출처가 attachment-only인 항목을 공식 확인으로 승격하지 않는다.

- Request: gameId/packId/editionId/sourceSHA/definitionSHA, areaId, photo SHA·크기·owner/epoch, 변환 이력, 허용 component/visible property 목록. 모델에는 **현재 영역의 최소 목록과 이미지**만 전달하고 서버 식별자·개인 상태는 주입하지 않는다.
- Observation: 입력 imageIndex, 개체별 임시 ref, componentId 또는 null, bbox(xywh, 좌상단0..1) 또는 null, 실제 quantity/face/rotation, 속성별 literal value와 unknown 이유. 사진 박스와 게임판 placement는 다르다. 모델 confidence는 정답/자동 반영 기준으로 사용하지 않는다.
- Assembly: 실제 요청 원본에만 근거를 연결, UUID 생성, typed manual 값은 null, 현재 readout validator 통과, 후보만 생성. null≠0, 장수≠인쇄 비용, 같은 색≠소유자. 슬롯·손패 순서·턴 이력·조커 대체값·스코어 합을 추측하지 않는다.
- Scope: 공개 공용/공개 개인 보유/소유자 비공개를 요청 맥락과 현재 권한으로 교차 검사한다. 공개 개인 보유의 owner는 사용자가 지정할 때까지 미귀속. own-hidden/role-limited·뒤집힌 덱은 허용 UI/권한 경로가 없으면 원래 physical-preserve로 유지하고 사진으로 공개하지 않는다.
- Ref: 실제 referenceId·판본·assetSHA·허용 범위가 모두 맞아도 **정체 후보**일 뿐이다. 참조 카드의 보이지 않는 비용·효과를 관측값으로 복사하지 않는다. 동일 그림 카드 두 장을 하나로 합치지 않는다.

**Catan에서 바로 저장까지**

1. 기존 공용 board 촬영 흐름을 사용한다. 자동으로 판 frame을 찾을 수 있으면 후보 overlay를 보여주고, 못 찾으면 사용자가 **사진과 기준 도식의 대응점 4개 이상·방향**을 확인한다. 네 점은 비공선·퇴화하지 않아야 한다. 정합이 안 되면 원본+미배치 후보를 그대로 수정·저장할 수 있다.
2. A는 원본 선택영역을 읽는다. B0는 확인한 frame을 이용해 지형 칸 ROI를 코드로 만들고, **실제 crop만 담은 한 atlas**의 panel index로 읽는다. index는 사진/기하 대응 번호일 뿐 지형·숫자 정답을 포함하지 않는다. 픽셀 확대를 새 정보처럼 취급하지 않는다. atlas와 각 panel의 원본 변환을 저장한다.
3. Catan 첫 B 과제는 각 panel의 지형 literal·실제로 보이는 숫자 토큰·도둑 여부를 반환한다. frame에 19칸이 있다고 19개 관측을 강제하지 않는다. 가림/안 보임과 실제 없음은 다르다. 숫자 없는 desert도 ‘게임 규칙상 없음’으로 채우지 않는다.
4. `CATAN_TOPOLOGY/slotPoint/snapToSlot`을 재사용해 기하 후보를 제시한다. ROI로 얻은 관측의 source는 원본 polygon/bbox로 역연결하고, 슬롯은 별도 확인된 frame의 코드 계산임을 유지한다. 도로/도시 같은 입체물은 중심만으로 확정하지 않는다. Catan custom map/판본불일치에는 고정19 hex를 강제하지 않는다.
5. `normalizeSceneDetailed/assembleSceneAssertions`의 기존 후보 경로와 SceneWorkspace의 수정/교환/undo/명시 저장을 사용한다. 지형/숫자 부분 판독은 저장된 도로·건물·항구를 지우지 않는다. 기존 장면과 새 후보의 충돌은 사용자 확인이며 기준 재고로 자동 정답화하지 않는다.

기하 후보와 판 사진 변환은 sidecar로 두어 기존 scene v2/저장 형식을 깨지 않는다. 자동 판독값은 observation, 사용자가 고친 값은 user, 코드의 배치 제안은 독립 `geometryCandidate`에 남긴다. 사용자 확인 후 기존 placement/location에 반영한다. Sagrada cell처럼 현재 manual인 필드도 이 분리 없이 observation으로 바꾸지 않는다.

**필수 자료와 optional 참조의 경계**

필수는 현재 판본/해시, 촬영 영역·범위, 구성물/관측 타입·값 도메인, literal→기존 저장값 mapper, Catan의 기존 topology와 확인 frame, 각 실제 입력의 좌표 변환이다. 카드별 대형 아트/전체 규칙은 필요하지 않다. UI용 SVG·생성 아트·도식은 ‘실물 matching template’이 아니다. 현재 공개 사진 corpus의 local-research-only는 제품 배포 허락이 아니다. B1은 사용자/제작자가 재사용을 허락한 실물 crop 또는 명시적 배포 조건이 있는 판본 자료로만 구성한다. reference manifest에는 URL/author/license·사용범위·판본·내용 SHA·crop 위치·확인된 속성을 넣는다. 자료 부족이면 B0와 A를 계속한다.

[기존 비교](../argon-deepseek-comparison/README.md)는 강한 모델도 느리고 quota 실패가 있음을 보여줬다. [ROI 비교](../game-state-linking/evaluation/README.md)는 일부 빨라지며 속성이 나빠졌고, [짧은 관측 비교](../photo-observation-ab/README.md)도 일관된 해결이 아니었다. 따라서 로컬4B/atlas/참조가 더 정확하거나 빠르다고 선결론을 내리지 않는다. 실제 이미지가 들어가 후보→수정→저장→재열기까지 완료돼야 첫 구현 완료다. 정확도·박스·배치·사용자 정정·cold/warm 시간·비용은 별도로 비교한다.

남은 UNKNOWN: 호환 runtime의 실제 설치/smoke 결과, 실제4B 품질·시간·메모리, Catan frame 제안 품질, 생산에 쓸 실물 참조 권리, cloud 상시 제공 경로. 이 중 runtime이 없어 실제 추론 불가능하면 그 사실을 즉시 반환하며 계약/정정/조립 구현은 계속한다. 후속 실측 checkpoint에서 이 문서를 갱신한다. [작업 순서와 비교 카드](plan.md).
