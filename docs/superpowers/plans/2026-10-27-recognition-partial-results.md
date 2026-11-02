# Recognition partial results implementation plan

**Goal:** Keep visible predictions as returned, display unknown values as `?`, and preserve usable objects when one visible property has a format error. Improve observation coverage without photo-specific answers.

**Architecture:** Existing game-pack photo definitions drive the common Gemini request. Keep task/image/area/manual-property validation strict. Recover only malformed visible properties inside the already allowed scope; retain original wire data and deferred reasons separately from usable observations. Existing candidate application and optional editing remain.

**Tech Stack:** TypeScript, React, node:test, existing Gemini observation API.

**Spec:** User's 2026-10-27 instruction: do not demand corrections; unknown/unrecognized values use `?`, even mistaken valid readings remain visible, implement general fixes and retest. Prior recommendations: docs/service-all-games-20261027/analysis/astra-practical-review.md.

## Constraints and review focus

- No photo/game ID conditionals, expected counts/positions, or reference answers in production prompts.
- Valid 0/false/string/number values remain unchanged; unknown is not 0.
- Unknown/manual/cross-area fields cannot become observed facts.
- Original wire, source image and deferred reasons remain distinguishable from usable facts.
- Old sessions and local-reader behavior remain compatible; preserve existing dirty work.
- No new dashboard, correction gate, automatic retries, commit, push, or deployment.

## Tasks

- [x] Root: add failing decoder tests using synthetic scoped games and independently chosen values. Exercise isolated invalid values, missing visible attributes, foreign-component properties, forbidden properties, valid mistaken values and strict envelopes.
- [x] Root: retain compatible flat output schema and improve the generic object-first prompt and labels from current pack descriptions. Add no per-game expected answers. Keep schema and parser wire compatible.
- Compatibility finding: the component-alternative schema received HTTP400 on the live endpoint. Retain the established flat wire schema and isolate foreign-component attributes at decoding instead. Intermediate v4 is preserved separately.
- General metadata finding: compilation omitted the pack's component names/physical types, leaving ambiguous internal IDs. Pass only the selected components' existing names/types to the final v5 prompt; no photo-derived descriptions or answers.
- [x] Root: implement property-level recovery plus original-wire/deferred receipt propagation. Focused tests pass; four frozen responses replay offline.
- [x] Existing 구현솔: minimal `src/**` unknown display / optional editing changes and focused UI tests; no forced correction or source-value rewrite.
- [x] Existing 구현솔2: prepare immutable 18-target + 6-control manifest and offline replay under docs/service-recognition-retest-20261027 only; no paid execution by worker.
- [x] Root: final integrated full suite 719/719, typecheck/build and scoped diff check pass.
- [x] Root: preflight and execute final v5 24 original photos once each in isolated temporary storage. Frozen references absent from model bodies. Initial v3 schema400 (1 call) and intermediate v4 (24 calls) also preserved, total49 attempts; no automatic retries.
- [x] Root: independent photo adjudication and reconciled 76-anchor counts published in docs/service-recognition-retest-20261027/results.md and results.json. Automatic geometry comparison kept separate.

Completion evidence: actual P0 failures4→0; P1 empty8→1, physical sample correspondence0→18/44; controls19/19 retained. Remaining omissions25+uncertain1 and Marvel two-card kind regression are disclosed. A0 review found null/null encoding loss; synthetic RED→GREEN, final offline replay verifies identical request body and decoded results for all24 captured outputs. No further model calls, commit, push, deployment or new UI.

Execution is authorized by the latest user request; no additional approval ceremony. Report fixes and measured limits without claiming all-game generalization.
