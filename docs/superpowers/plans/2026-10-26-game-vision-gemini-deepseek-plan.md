# Game vision Gemini / DeepSeek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Existing project worker sessions and the scoped ownership below override fresh-worker/worktree/commit defaults.

**Goal:** Implement the accepted research experiment for Gemini 3.8 Flash and the latest image-capable DeepSeek, then measure matching tasks without changing the default product provider.
**Architecture:** Extend the standalone benchmark with a literal Catan observation task and a shared four-coordinate object contract. Separate private physical-object GT from model-safe game context; keep existing candidate/review/save code unchanged until the experiment identifies a usable request contract.
**Tech Stack:** Existing Python standard-library benchmark; existing local image/annotation tooling; Gemini GenerateContent and native DeepSeek image API.
**Spec:** docs/vision-direction-research-20261026/README.md sections 4, 6, 7. User substitutes latest image-capable DeepSeek for Argon in D3.

## Global Constraints

- Existing uncommitted product work, processes, sessions, credentials, photos, and previous results remain intact. No git stage/commit/reset/clean, deployment, install, or account/billing change.
- Existing research is approved for implementation; no repeat plan/design permission ceremony. Reuse existing worker sessions and private scratch copies rather than creating a Git worktree from an incomplete HEAD.
- Sol2 alone owns benchmark tools/tests and new game-task experiment results. Sol1 alone owns new physical-object GT/context data. Astra only owns its separate API research document.
- No secret content, prefix, hash, or full config enters model output/source. Reuse uploaded key files through in-memory authentication only.
- Fresh experiment: at most six attempted inference calls (including errors/timeouts), concurrency one, automatic retries zero, proposed monetary envelope USD1.70 at current list rates. Earlier six calls remain consumed historical evidence, never reset/reused.
- Pin real input bytes, model aliases/documented revision, task/prompt/schema/context, provider options, source hashes, and immutable attempt claims before sending. First HTTP/shape/truncation failure stops that batch for review.
- Use the selected user photo already authorized for hosted comparison. Do not upload unapproved references or missing corpus images. No new independent-photo claims without actual new source and pre-output labels.
- D1 Gemini image-only game literals; D2 same with selected context; D3 latest DeepSeek with D2 task/context/schema. D4 panel-based game literals only if a separately confirmed source-bound frame and useful D2/D3 result exist. At most two remaining calls for genuine new independent photos if available; otherwise report missing data without blocking completed development comparison.
- Four coordinates describe the physical target: terrain hex, printed number disc, or robber. Preserve raw and normalize native conventions explicitly; never fix values using inventory, allowed counts, or rules.
- No whole-board success claim from terrain/numbers/robber alone. Buildings/roads/harbors and private/manual state remain outside this pilot score.

## Review Focus

- Physical number-disc bounds must not be replaced by tile centers or text glyph bounds; preserve old GT and scores separately.
- Gemini and DeepSeek protocol differences must not change semantic task/context/source bytes or hide completion failures.
- Low reasoning and sufficient output budget must be explicit; no truncated output salvage or confidence-based automatic acceptance.
- Budget/attempt enforcement must span the fresh experiment, including stopped/recovery batches, and estimates must remain distinct from actual billing.
- Provided panels/frame are code input, not learned detections; no localization score credited to a supplied region.

## Task 1 — Physical-object GT and context (Sol1)

Files: new docs/game-vision-comparison-20261026/data/**; private annotation JSON/overlays outside repo.
- [x] Inspect source photo and prior GT metadata without opening new predictions.
- [x] Preserve prior labels; add actual visible number-disc, terrain-hex and robber physical boxes/regions, uncertain/readable flags and direct-image provenance. Keep GT private, with repo locators/hashes and explicit scope.
- [x] Export model-safe Catan field vocabulary/context from existing data; exclude GT, object counts, topology answers and previous errors.
- [x] Validate source identity, dimensions, geometry, unique IDs and separation from model payload; freeze before first new call.

## Task 2 — Game-task runner and native DeepSeek adapter (Sol2)

Files: tools/hosted-vision-benchmark/**, tests/hosted-vision-benchmark.test.py, new docs/game-vision-comparison-20261026/{runner,results}/**.
- [x] Read current callers/contracts; archive current runner/test hashes before modifying.
- [x] RED: shared game-object schema, native Gemini/DeepSeek request completion handling, coordinate normalization, no GT leakage, provider key-file loading, and fresh aggregate budget/attempt enforcement.
- [x] GREEN: minimal task/provider additions, common semantic payload, explicit LOW/supported-equivalent setting, output ceiling32768 and timeout180s. Preserve existing OCR/Florence compatibility.
- [x] Offline evaluate physical target matching, value correctness, missing/unknown/ambiguous, IoU/center error and scope. Never match by predicted value.
- [x] Prepare actual D1-D3 plans with frozen GT and model-safe context. Prepare optional D4 only through existing frame/raster capability; skip cleanly if no independently confirmed frame.
- [x] Run focused benchmark checks once after final changes; no product full suite/build.

## Task 3 — Supervisor review and bounded measurement

- [x] Review data, changed code, focused results, exact native model support/versions, request pins and monetary bounds; resolve ordinary in-scope issues without user interruption.
- [x] Execute authorized fresh calls through worker; secrets stay memory-only. Stop batch on HTTP/shape/truncation failure and preserve evidence.
- [x] Compare identical task conditions; separately report values, physical localization, missing/unknown/duplicates, latency and estimated/actual cost status. Record unexecuted context/panel/holdout conditions.
- [x] Verify offline literal-field projection preserves values, regions and source. Actual hosted ReaderIdentity/API-job/assembly integration remains unimplemented; no default provider switch or paid automatic fallback.
- [x] Update concise result/limitations and return exact changed-file/test evidence. Model choice and production rollout remain evidence-based next decisions.

## Parallel API research — Astra

Write docs/image-api-research-20261026/README.md only. Investigate concrete managed image-specialist APIs/models/tasks, pricing units, data/reference/training requirements and a realistic short list. No API calls or implementation changes.

## Progress

Scoped benchmark implementation, measurement, and separate image-API research are complete. Sol1 froze physical-object GT/context before new responses; Sol2 delivered native provider adapters, focused checks and measured results; Astra delivered research only. Supervisor reviewed source changes, native metadata, saved evaluations, physical-region overlay, and final artifact hashes.

D4 and independent-photo evaluation are explicitly NOT_RUN because required data is absent. Product hosted identity/adapter integration and production model selection are not implemented by this benchmark package.

### Measurement checkpoint

- Final physical GT frozen: contract `9cad28fe007851911e4e838a30e8df180b1f6428d5b3f07c3d71846b9638e1ab`; private GT `9ea4c49f2c752cc688259611a7b57e304bdb2bb9edaa07ea64de5b6b7176ff84`. Root visually reviewed overlay; no model answers in context.
- Source `game_runner.py` during initial D1-D3: `a4c01fa1847978005aaa1d4b5b5a77a03658b616f39aafea3928ac19502475d4`; base OCR runner unchanged. Focused 29/29 and actual check/prepare passed.
- Private fresh experiment `/private/tmp/keepboard-game-vision-20261026-v1`, batch `batch-d1-d3`, plan `952a280521dfea728230a91c262749954de8b1c1c6cfb2da43dd801eda1c9379`.
- Pre-send owned experiment-directory mode error corrected before any key loading/claim/inference; source/plan unchanged for measurement. Permanent prepare-order repair is authorized after batch completion, with regression check.
- Actual aggregate attempts=3. D1 Gemini STOP/38 objects/13.594s/estimated USD0.007014; all38 physical targets match and literals correct under preregistered geometry-only reciprocal-max IoU>=0.25. D2 Gemini STOP/38 objects/18.977s/USD0.01161825; 36correct,2wrong attributes; every target matched. Root inspected saved evaluations and native metadata.
- D3 returned HTTP400 before inference: provider rejected nullable-array type union in strict JSON schema. No automatic retry. Raw/claim/attempt preserved.
- Authorized scoped recovery: DeepSeek-only native nullable-box representation fix (same semantic contract, task/prompt/source/context/options) plus one new D3 attempt in same six-attempt experiment; requires final native-schema diff/pin review and exact Bash permission. Expected aggregate after recovery<=4. Remaining budget does not authorize arbitrary further trials.
- Astra API research completed: first test candidate YOLO-World v2-l serverless, OCR companion Cloud Vision. Research only; no new API calls. Corrected accidental attribution of Gemini monthly spending cap to Roboflow.

### Final checkpoint — 2026-10-26

- Total actual attempts **4/6**: D1, D2, original D3 schema rejection, and one expressly approved D3 compatibility recovery. Two attempts remain unused; no further inference is authorized by this completion.
- Recovery changes only DeepSeek native nullable-array representation to `anyOf`; semantic task/schema, source image, D2/D3 context and inference options remain fixed. Original HTTP400 evidence is preserved separately. Prepare-directory ordering was also fixed with regression coverage.
- Current/recovery source SHA `46f9230db1d53d94b32f01c87b3eb78d983830b6ebe63392c4b803298271c400`; initial measured source remains archived. Final focused **30/30**, exit0, log SHA `3222cb65e0cbed86b308a066ee2c33365a7fb8074d51e69e1952a931eff34e9b`; original OCR/Florence runner unchanged.
- D1 **38/38,13.594s**; D2 **36/38,18.977s**; D3 **23/38,89.275s**. D3 has ten attribute errors and five unmatched target positions. Source-region/value preservation holds across each raw38-to-projection38 result.
- Successful-request list-cost estimates: USD0.007014 /0.01161825 /0.0211419, sum0.03977415. Actual billing is UNKNOWN; failed-request billing is not asserted zero. DeepSeek response exposes an alias, not a resolved weight revision.
- Final results `docs/game-vision-comparison-20261026/results/results.json`, SHA `07b7831bd5c155c25c19193e1c0b4e282928501102eefea849465acc3eb7f176`; final verification `runner/final-verification.json`, SHA `1d1b1074495ff5b394c8e3384c2494a7b488498906960d7ae112b9b52b6ea573`.
- All conclusions concern one previously evaluated development photo and terrain19/number-discs18/robber1 only. Roads/buildings/full saved-state correctness and generalization remain unverified. No product default, store, process, dependency, or deployment changes.
- Image-specialist API research is complete at `docs/image-api-research-20261026/README.md`: first detection candidate YOLO-World v2-l, optional OCR candidate Cloud Vision. Neither was called in this new experiment; no KeepBoard accuracy claim for them.
