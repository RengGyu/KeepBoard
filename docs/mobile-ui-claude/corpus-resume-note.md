# 사진 corpus 재개 위치 (현재 위치만 기록)

2026-10-23, 모바일 UI 카드로 전환되면서 사진 corpus 수집을 중단했다. corpus 파일(`docs/game-photo-corpus/**`)은 중단 시점 그대로 두었다.

- **manifest 반영 완료:** 앞쪽 게임(catan … crew-deep-sea)까지 분류를 manifest에 기록했다. 재개할 때는 manifest의 `status`가 `found`인 게임을 확인한다.
- **화면은 봤지만 manifest에 기록하지 못한 것:** davinci-code, descent-legends-dark, dixit
  - descent의 최근 Play 사진 2장은 상자 트레이 안 미니어처 사진이라 제외해야 한다.
  - davinci-code와 dixit은 각각 테이블 사진 1~2장이 쓸 만했다.
- **다운로드만 하고 보지 못한 것:** dobble, dominant-species, dominion(각 2장, 원본은 비공개 폴더에 있음)
- **남은 게임:** dominion 이후 목록. 120개 게임의 BGG ID는 manifest `games[*].bggId`에 모두 기록되어 있다.
- **재개 방법:** `node docs/game-photo-corpus/tools/corpus.mjs autopick <gameId> <bggId> 2` → 사진을 직접 본다 → `set` → `game` → `export`
- **판단 기준:** 판이 충분히 보이면 사람이 함께 찍힌 사진도 유지한다. 사람이 중심이라 판독할 판이 부족한 사진만 제외한다(감독 정정).
