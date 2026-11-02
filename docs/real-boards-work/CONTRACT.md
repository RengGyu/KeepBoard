# Real-board production contract

`public/game-art/real-boards/{gameId}/` is a deployment surface. Keep only `board.json`, `board.svg`, `pieces.svg`, plus an existing `variants/` directory required by `src/realBoards.ts`. Work scripts, reference material, provenance, reports, renders and intermediate output belong under this directory or `/tmp`, never under `public/`.

For the seven boards rebuilt in this work and any later board revision:

- board.svg: viewBox0 0 1000 1000; flat original diagram in sky#8fd3ff/yellow#ffc935/navy#16305c/white; minimal text; no copied commercial artwork/logo/lettering or embedded raster; ≤300KB; coordinate decimals≤1.
- Each confirmed slot is one rect/circle `id="slot-{slotId}"` inside its area group `id="area-{areaId}"`. JSON xywh must match it exactly; minimum60×60; remain inside1000×1000.
- board.json compact≤500KB: gameId, edition, status, svg, viewBox, areas, playerCount, notes. Each area has id,label,field,scope,accepts,ordered,slots; each slot has id,x,y,w,h,capacity. Only real field/component IDs from the game's `gamepacks/generated/game-essentials.json` row are valid.
- Personal surfaces use scope=player once, not duplicated once per participant. Use playerCount.hideAreas where needed.
- complete means the slot structure was verified from the relevant rulebook. Do not invent unknown positions. Scenario/free maps stay partial and every area's slots is empty; notes explain uncertainty. Such a board is a free-placement background in the app.
- pieces.svg≤200KB: only pieces without dedicated art, symbol IDs `piece-{componentId}-{shape}`, symbol viewBox0 0 120 120; player-colour pieces use currentColor.

Checks:

```sh
python3 tools/real-boards/check.py
```

```sh
python3 tools/game-board-visuals/generate.py --check
```

```sh
python3 docs/real-boards-work/integration/validate-rebuilt.py
```

```sh
npm test
```

The strict validator currently names the seven rebuilt games; extend its game list for future revisions rather than silently retrofitting constraints onto untouched historical assets. Compare existing failures with the recorded baseline; do not weaken tests to pass cleanup. Retain exactly one final result per verification series in the archive and remove intermediate snapshots.
