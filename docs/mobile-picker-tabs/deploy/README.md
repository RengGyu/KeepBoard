# 모바일 UI production 배포

VERIFIED: https://keepboard-kappa.vercel.app 에 게임 선택 검색/하단목록과 공용·플레이어 가로 탭 UI 배포 완료. 2026-10-22 07:56 KST 공개 검증.

- deployment `dpl_5mA4Ucte9xQe1W1MLBfVABdvcGpH` · READY/production · CLI65.0.0 deploy exit0
- 고정 URL https://keepboard-ax7qsejpj-renggyus-projects.vercel.app
- clean stage `/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-picker-production-lw7l0g3q`
- 기존 project 연결과 인증, API/uploads tunnel route 재사용. `vercel deploy --prebuilt --prod --yes --cwd <stage>` 실행. dist/static 541파일/25,799,543bytes, art 배포용 zip 제외. 소스/docs/설정/키/Store 미포함. [파일·해시 manifest](static-manifest.json)
- 초기 sandbox CLI59 실행은 fetch failed. 승인된 네트워크 CLI65 실행 성공. 소스나 설정을 바꿔 우회하지 않았다.

## 직접 확인

[비민감 HTTP 검증](verification.json) · [공개390 검색 화면](production-picker-390.jpg)

홈/최종 JS `index-EIkrWPjj.js`/CSS `index-Culbj5Hp.css`/manifest/art index 모두200·정확한 MIME·dist SHA256 동일. `/api/health`200, `/api/game-catalog`200/120. 공개 `/api/settings`는 whitelist configured/provider/model만 읽었고 `true / gemini / gemini-4-argon` 유지.

Chrome CUA390×844 공개 새판 dialog→검색 `루미`→결과 루미큐브/Classic 표시→클릭→선택 반영 확인. page overflow0. 공개에서는 기록 생성·저장·AI 호출 없음. 사용자 목록·기존 기록을 캡처/출력하지 않고 모달 영역만 캡처했다. 뷰포트 reset 완료. 6인 탭·초안·키보드·합성 생성판본 및 5폭 검수는 [4398 직접 검수](../verification/README.md)에 분리 기록.

backend4319/proxy4320/tunnel/gateway4330 재시작·모델/라우팅 변경0, 사용자 기록 수정0, 실제AI 호출0, git commit/push0. 제품 소스와 dist 재빌드/전체테스트 반복 없음(이전227/type/build pass 보고와 현재 산출물 사용). 실제 손가락/가상키보드는 미확인. Mac backend·proxy·tunnel이 켜져 있어야 하는 기존 호스팅 유지조건은 그대로다. 파일 소유권 반환.
