# 방·119 기록판·아트 교정·테마 최종 통합

**VERIFIED · 로컬 소스 동결, 전체 259/259 · 타입 exit 0 · 빌드 exit 0.** 공개 배포/운영 backend 전환은 하지 않았다. 기존 운영·preview·모델·라우팅·사용자 Store는 변경하지 않았다.

## 직접 실행 결과

| 검사 | 결과 | 로그 |
|---|---|---|
| 교정 전 기대치가 남아 있던 첫 전체 실행 | 258 pass / 1 fail · exit 1 | [tests-before.log](tests-before.log) |
| 기록판 매핑+아트 교정 집중 검사 | 10/10 · exit 0 | [focused.log](focused.log) |
| 최종 `npm test` | 259/259 · exit 0 | [tests.log](tests.log) |
| `npm run typecheck` | exit 0 | [typecheck.log](typecheck.log) |
| `npm run build` | exit 0 | [build.log](build.log) |

최초 sandbox 실행은 tsx IPC `listen EPERM`으로 테스트 시작 전에 실패했다. 필요한 실행 권한을 받은 뒤 위 결과를 얻었다. 이후 실패는 `tests/game-board-visuals-mapping.test.ts`의 F001 `pending=true` 기대치 한 개였다. 승인된 20개 교정의 `resolved/items=[]`와 충돌한 오래된 기대치만 갱신했다. 현재 20개 resolved가 모두 pending=false이고, 명시적 미해결 입력은 여전히 pending=true인 것을 검사한다. 별도 교정 테스트가 Agricola의 사람형 매핑을 포함한 20개 그림 연결·색 역할·legacy unknown을 확인한다. 제품/아트 소스 수정이나 검사 삭제는 없다.

이번 통합 단계의 변경은 위 테스트, 이 증거 폴더와 build/dist뿐이다. 방 구현 파일은 [방 인계](../multiplayer-rooms/handoff.md), 기록판은 [기록판 인계](../game-board-visuals/README.md), Sol2 교정은 [교정 인계](../game-fidelity-audit/corrections/README.md)를 따른다.

## 사용자 요구와 검증 범위

| 요구 | 확인한 근거와 경계 |
|---|---|
| 방 생성·링크/코드 참가·이름/색·정원 | 독립 H/A/B/outsider cookie API와 390px 실제 앱 생성/참가. 동시 마지막 자리·중복색·재입장 회귀 통과 |
| host 공용+self / member 공용 보기+self | 서버 기존 API 우회·사진·PIN·타인 개인값 차단 회귀. 실제 member 공용 readonly/자기 편집 확인 |
| 저장/재열기·범위 복원·충돌 초안 | scoped snapshot/restore/CAS·turn/epoch·지연 mock 분석/legacy 회귀 통과. 실제 같은 기기 두 창 충돌 초안 보존 확인 |
| PIN/숨김·원본 보존 | 본인 PIN/타인 token 우회 거절·own-hidden 비수집·private 원본 차단. 실제 합성 PIN 잠금/오답/해제 확인. 두 탭은 두 사람 검증이 아님 |
| 119개 기록판 | 119게임/522영역 참조·SHA fallback·placement·owner 회귀. 앞선 6대표 실제 390px 저장/reload·320 overflow 0 근거 유지. 수동 기록 표면이며 상용 인쇄판/전게임 기하 재현은 아님 |
| F001–F020 | 전체 회귀에서 종류색/소유색·앞뒤/모름·기존 기록 유지·source 일관성 확인. 이전 F001–F006 pending 증거는 역사 자료이며 현재는 승인 교정20 resolved |
| 9a45d40 테마 | main import 유지, 최종 CSS에 Jua/테마 색/스타일 포함 확인. 최종 테마 실제 렌더 캡처는 없음 |

새 source freeze digest는 `ea56965f2f689d543d62b23fe5a2c180fdba852935cc15137b18e89ad4b78b0f`다. 승인 F001 Agricola description만 수정한 결과이며 과거 `de2ba374…b4fd`와 같다고 주장하지 않는다. read-only 독립 비교로 120 source 해시/freeze digest, 비교정 414분류, 기존 개별 SVG 357개 바이트 불변을 재확인했다([preservation.json](preservation.json)). 과거 저장팩/수량 null·0/순서/중복실물/사진 참조 보존은 전체 회귀에 포함한다.

## 산출물과 후속 배포 경계

- JS: `dist/assets/index-B_n9th97.js` · SHA256 `64351d773612a3aeacc8e2052147b9efd911e0ce99571a1d9dabd648c96fb6a8`
- CSS: `dist/assets/index-CsGPTF4d.css` · SHA256 `0bd60563bb49952ba229fb37dd5b945e9d45050dc1804283983befb31b39c177`
- HTML: SHA256 `5fc7704b88980a0a19ffff77596f2c8887f3dce257581c03468435ffb60c825b`
- 정확한 실행/산출물은 [verification.json](verification.json), 고정 제품·테스트 소스 154파일 해시는 [source-manifest.json](source-manifest.json).

**새 frontend와 새 backend를 함께 반영해야 한다.** 기존 production은 테마만 배포된 상태이며 방 API/권한/CAS를 이번 검증으로 운영에 적용한 것은 아니다. Vercel rewrite의 same-origin cookie/Set-Cookie·업로드 전달은 배포 후 별도 확인이 필요하다. 운영/사용자 자료·키는 읽거나 전환하지 않았다. 실AI/실카메라 0회.

## 실제 화면과 남은 미확인

기존 합성 source preview **http://127.0.0.1:4403/** 유지. health 200/catalog 120/RoomEntry 모듈 200은 [serving.json](../multiplayer-rooms/serving.json)으로 확인했다. 이 서버는 Vite source 앱이며 새 dist를 브라우저로 검수한 서버라고 하지 않는다.

이전 실제 제품 캡처: [host 공용](../multiplayer-rooms/captures/host-public-390.png), [member 공용](../multiplayer-rooms/captures/member-public-390.png), [member 자기 기록](../multiplayer-rooms/captures/member-own-390.png), [PIN 잠금](../multiplayer-rooms/captures/member-locked-390.png), [충돌 초안](../multiplayer-rooms/captures/conflict-draft-390.png). 본인 숫자13 타일 **1개**의 편집/저장 검수였고 13타일 판독 검증은 아니다. 일부 캡처는 후속 테마/최종 PIN lock actor 검사 전이다.

마지막 CUA 오류 `Browser is not available: 2` 후 재설정/새 서버/재시도를 하지 않았다. 마지막 성공 여정 뒤 viewport reset은 완료했다. 최종 F018/F020 소유색 건물과 Tokyo extra-green 6면은 XML·소스의 `var(--owner)`·매핑6면/색·회귀로 확인했으며 **actual DOM/computed CSS/최종 화면은 미확인**이다([static-art.json](static-art.json)). Sol2 contact PNG도 최종 owner-building 수정 전이므로 최종 그림 증거로 쓰지 않는다. 실폰 손가락/키보드·서로 다른 실제 브라우저 저장소·실제 사진 인식 품질도 미확인이다.

소스/파일 소유권 반환. 추가 검증·배포는 감독의 별도 범위로 진행한다.
