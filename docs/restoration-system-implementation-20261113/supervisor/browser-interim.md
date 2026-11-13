# 중간 실제 앱 관찰 — 완료 판정 아님

- 실제 App/createApp + 임시 Store에 기존9응답과 원사진을 등록했다. 설정은 임시 data root, 판독 reader/analyzer는 외부 호출을 하지 않는 대체 함수다. 별도 정적 viewer가 아니다.
- 서버 127.0.0.1:58113, exec session 27604. Chrome page3, isolatedContext keepboard-restoration-1113. 준비 manifest는 임시 Store의 review-manifest.json에 있다.
- Sagrada baseline의 가로844×390에서 전체 복원 작업면·원실물 버튼·묶음 수정 진입이 실제 App DOM에 나타났다. 이는 WIP 연결 확인이며 정정/저장 완성 증거가 아니다.
- 최초 작업면 viewport Y≈862, 744×287, 내부 canvas3704×1364. 초기 가로 화면에서 실물이 보이지 않았고 작업면으로 이동한 뒤에도 고정 헤더/하단 저장과 반복 안내·구역칩이 공간을 차지했다. Sol1에 기존 확대/접기/집중 패턴으로 주 작업면 가독성을 보완하도록 전달했다.
- Sagrada 공용 카드·은총이 같은 제목의 여러 region panel로 분리되고 native격자와 window literal이 별도 패널로 나왔다. Sol2에 검증된 부착/판 alias/공용 region문맥의 재사용 여부를 확인하도록 전달했다. 실제판 identity를 임의로 합치라는 지시는 아니다.
- 새 sidecar frame이 구 renderer의 셀에 반영되지 않을 수 있는 계약 경계를 Sol1이 발견했다. root가 Sol2에 전달했고, projector의 transient 기존 estimator 재사용과 typed presentation hint 제공으로 해결 진행 중이다.
- 실제 Safari/새 사진 정확도는 이 관찰에 포함하지 않는다. 최종 소스 반환 뒤 동일 실제 App에서 다시 확인한다.

후속 UI 반영 후 actual Chrome reload에서 원사진/개발도구 접기와 scene 선두·‘판에 집중’ 버튼을 확인했다. 해당 버튼 실제 클릭 뒤 가로844×390의 viewport는 x4/y118.5/834×266이나, 전역 고정 header가 집중 toolbar/나가기 위치를 가리고 footer가 canvas를 덮었다. Sol1에 기존 확대 overlay stacking/focus 재사용으로 교정하도록 전달했다. favors의 반복 field-label 박스도 compact 판 표현 경계에서 확인 요청했다. 미완성 중간 관찰로 남기며 최종 통과로 취급하지 않는다.

이후 공통 Modal 교정본을 actual App에서 reload→‘판에 집중’ 클릭해 재확인했다. 전역 header/footer 덮임은 사라졌고 닫기·toolbar가 보이며 body overflow=hidden이다. 반복 속성명도 표시에서 제거됐다. 공용 region 통합·주요판 초기배치와 실제 정정/저장·재개는 후속 구현 완료 뒤 최종 확인한다.
