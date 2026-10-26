# 사진 기반 탐색·입력·복원

사진 위 윤곽과 크롭 목록은 `ownerId + field`로 만든 같은 대상 키를 연다. 상세에서는 주변을 포함한 원본 확대와 해당 필드의 입력만 보여준다. 사진이 없거나 영역이 미지정이면 그 사실을 표시하고 전체 원본 또는 직접 입력을 제공한다.

- `src/presentation.ts`: 상태·질문·근거를 공통 대상과 사진 위치로 변환한다. 영역은 `evidenceIds[0]`의 정규화 좌표다. 다른 사진에 같은 좌표를 적용하지 않는다.
- `src/PhotoTargets.tsx`: 원본 위 영역 선택, 크롭 목록, 같은 대상의 상세와 보관 연결을 표시한다.
- `server/engine.ts`의 `answerField`: 사용자가 값을 고쳐도 기존 사진 연결은 유지한다. 수정값은 관측값이 아니라 사용자 기록으로 남는다.

`PreservationTemplate.visualFields`는 복원 화면에서 표시할 필드를 연결한다. `FieldDefinition.preservationId`와 달리 요구사항을 충족시키지 않는다. 카탄 공개판처럼 부품을 분해해 보관할 때도 원래 배치 기록은 필요하기 때문이다.

흐름: 원본 영역 또는 목록 선택 → 같은 대상 상세 → 필요한 값 기록 → 팩 조건 재계산 → 연결된 묶음에서 꺼내 원본 위치 확인.

읽을 변경 세 곳:

1. `derivePhotoTargets`: 화면마다 따로 대상을 만들던 방식에서 공통 키와 원본 위치 연결로 바뀐다.
2. `TargetDetail`: 사진만 확대하던 방식에서 사진을 유지하며 선택한 상태만 입력한다.
3. `answerField`: 값 교체 시 원본 영역을 잃던 문제를 고친다.

영어: target(대상), crop(확대 영역), source(원본), bundle(묶음).

“Open the same target.” “Keep the source photo.”

“The photo and the list open the same target. We change the value and keep the photo link.”

확인 결과: `npm run build` 통과, `npm test` 28/28 통과. 실제 브라우저에서 도둑 영역 선택 → 값 수정 → 크롭 목록에서 동일 값 재열기 → 보관 위치에서 같은 대상 열기 → 전체 원본 위치 전환을 확인했다. 390×844 화면에서 상세 입력을 확인했고, 외부 상태 변경이 도착해도 작성 중인 입력이 유지됨을 확인했다.

실제 모델을 통한 새 사진의 영역 검출은 API 키가 없어 미실행이다. 예시 도식의 영역과 일반 상태/영역 매핑으로 화면 기능을 확인했다. 자동 분할·참조 자산 대체·AR은 이번 첫 범위에 포함하지 않는다.
