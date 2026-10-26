# Gemini 3.8 nine-photo test

User-authorized follow-up: send the nine newly attached Catan photos once each to Gemini 3.8 using the previous successful D1 task instructions. Preserve model options, semantic prompt, schema and source pixels. Additional game-context export is disabled.

## Scope and completion

- Task remains physical terrain hexes, printed number discs and robber. Buildings, roads, players, hand cards and whole-game reconstruction are outside this comparison.
- Photos are a sequence from the same board/session, not nine independent games or environments. Each source is inspected and annotated independently before new responses.
- Sol1 owns `docs/game-vision-nine-20261026/data/` and private GT/overlays. Sol2 owns minimal benchmark changes/tests and `docs/game-vision-nine-20261026/{runner,results}/`. Root reviews pins, overlays, native evidence and final report.
- New experiment: maximum nine attempted Gemini calls, concurrency one, no automatic retries. Each original sent once, no parameter tuning. Existing experiments and consumed attempts stay immutable. Existing conservative input/output assumptions imply a USD1.327104 planning bound for nine calls, below USD1.70; this is not a real bill guarantee.
- Use existing uploaded Gemini credential only inside execution; no secret output or original-file edits. No product/default-provider/dependency/process/deployment changes.
- Freeze physical regions and literal labels for each photo. An occluded number is unknown based on that photo; never recover it from a different image or inventory. Keep unknowns separate from observable-value accuracy and retain location counts.
- Match regions using existing geometry-only reciprocal unique maximum IoU >=0.25, then evaluate kind/value. Unmatched predictions are recorded, not automatically called physical false positives.
- Reuse existing task and normalization/projection. Minimal batch-nine orchestration/cap regression only if code changes are necessary; focused checks, no product full suite/build.
- Stop batch on HTTP, output truncation or response schema failure. Preserve error/attempt evidence; no automatic repair-and-repeat.

## Checklist

- [x] Exact nine source files verified by SHA/dimensions: all1170x1560, EXIF orientation1, nine distinct byte SHAs matching attachment names.
- [x] Per-photo source-only GT frozen before new responses. Root viewed all9 overlays and verified original/GT hashes. Index619c0ff3f6145867b71d9030aaf1efa535ead6fa42185cfa9e71cfdd0e20c331; 342 location targets, 160 readable number values and2 occluded unknowns. Robber9 is kind/location only.
- [x] Plan8b7bddeadedcd37da3a23275018a3a0e224808f239dd30e8c9d96f9671584762 reviewed; nine_runner sourcea6710f5c83da2d57d8ab9b835900c7cc14968e7d4867ffde75184a7652aab531. Existing game/base runners unchanged;32 focused checks pass (root inspected exact log/source pins). Root authorized exact command with shared9 cap and context false.
- [x] Executed9/9, all HTTP200/STOP; no retries, total9 attempt claims. Native responses and per-row timings/usage saved privately.
- [x] Root directly verified native response hashes/usage and raw→normalized→projection preservation for340 observations. Terrain169/171; readable number156/160; robber kind/location9/9; physical correspondence340/342, two occluded discs omitted. Value errors6: four6↔9 errors and two forest→pasture errors, photos6/7/9. Mean15.763s, range11.901–28.388s. Paid-list estimateUSD0.0694635 total; actual billUNKNOWN.
- [x] Final README/results JSON reviewed against actual native evidence; resultsSHA99a26b4f659a7511f24aee5c2a0bba845008f2efc139117f91e603350d602498. Same-session nine-photo limits, two unknown/missing discs, six value errors, estimated billing and unchanged product default clearly stated. Supervisor clarified request wall time includes possible transfer/server waiting, with no separate timing breakdown or user-review time.

## Delegation

Existing sessions only, C2/gpt-6.1-sol/medium: Sol1 `da51c3c1-e75a-488e-9ef7-ea690b88866e` source-only annotations; Sol2 `93f1d851-6097-415a-97f6-929ed2d454b3` benchmark execution. Astra is not used for this follow-up. Both receive worker runtime rules and compact task cards, not full conversation or teaching policy.
