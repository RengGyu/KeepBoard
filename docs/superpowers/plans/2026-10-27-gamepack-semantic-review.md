# Game-pack semantic review and bounded retest

**Goal:** Review all 120 game packs with the existing research Astra session, make only evidence-backed minimal corrections, and retest errored or changed games.

**Architecture:** Canonical game specs remain the source of truth for generated runtime/capture/readout artifacts. Independent review precedes edits. Preserve historical saves and frozen photo references. Keep found-but-unreadable values unknown and valid readings unchanged; no forced user correction.

**Spec:** User's 2026-10-27 request to use research Astra, avoid overfitting and excessive changes, and test only previously errored or changed games.

**Boundaries:** No new UI, card database, inferred inventory, photo-specific answers/coordinates/counts, broad rulebook re-research, automatic retries, commit/push/deployment, operational Store or key output. Clear game-definition corrections are allowed; statistical model misses are not automatically spec defects. Existing dirty work remains.

- [x] Research Astra: 120 unique rows, 119 no-change + 1 native bridge defect at discovery; final further changes0. Explicitly not full-rule/photo certification.
- [x] Root: private source/artifact digest snapshot, specs120/120 and connected runtime/capture/photo/readout120/120 pass; independent report source digests120 verified.
- [x] Minimal correction: Rummikub rack observation remains in receipt and does not fabricate an unknown tile. Native tile values/owner unchanged. Synthetic RED→GREEN plus independent A0 review; no pack/source/version/prompt changes.
- [x] Test IDs: 48 historical concrete errors + corrected Rummikub rack new area =49; reference-error/uncertain/manual-only9 excluded. Frozen 48 old cases use latest-v5 baseline18 / original119 baseline30, Rummikub new area has no baseline.
- [x] Actual49 requests complete: HTTP200/job completed49, candidate save/reopen47, empty2. Private /private/tmp/kb-gamepack-semantic-retest-bd7dsgdb. Plan reservation6.4254 USD, cap10, actual billing unknown. No retries. Full tests720/720, types/build and scoped diff checks pass.
- [x] Two existing Sol workers independently adjudicated all49 photos against frozen references/native hashes. Same48 cases148 sparse targets, new Rummikub area7 targets kept separate. Objects/kind/value/uncertainty split; source/ref/native unchanged.
- [x] Published docs/gamepack-semantic-review-20261027/retest/results.md and results.json; root verification.json reconciles hashes/counts. Paired objects71→84/148, after missing54+uncertain10. Same-body18 subset31→30 (no stable model improvement claim); original119-baseline30 subset40→54. New Rummikub7 observed objects→6 correct tile candidates, rack retained in receipt.

Execution is already authorized. Do not require another design approval or expand this into a whole-product redesign.
