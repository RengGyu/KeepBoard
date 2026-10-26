# Hosted vision comparison runner

Goal: prepare a standalone, credential-free offline plan and bounded hosted execution harness. No product integration or live inference in this card.

Files: `tools/hosted-vision-benchmark/runner.py` (manifest, request builders, native response normalization, private ledgers); `credentials.py` (optional hidden-input setup); `tests/hosted-vision-benchmark.test.py` (offline contract and execution boundaries); this directory (sources, instructions, verification).

1. Write failing offline tests for Gemini/Florence OCR and object response contracts, geometry, truncation, context N/A, permission blockers, hashes, bounded execution and credential handling.
2. Implement the minimum stdlib-only runner. `--prepare`/default `--check` have no credential reads/network; `--execute` requires a pinned prepared plan, explicit execution and up to six selected runs, no retries. Keep raw responses and normalized results in a private directory.
3. Verify the fixture owner's `data/benchmark-manifest.json` when available. Offline-only GT is not a request input. Do not silently truncate an oversized run list.
4. Publish commands, official contracts/pricing, existing-key reuse instructions and limitations. Stop before any upload or inference.

Manifest: `version: hosted-vision-benchmark-v1`; `images[]` with id/gameId/path/sha256/width/height/mimeType/approvedForHosted; optional `contexts[]` with id/gameId, definitions/rules path+sha256 and references[] with image metadata+approval; `runs[]` with id/imageId/provider/condition/optional contextId/task; optional `maxCalls` defaults6, maximum6.

Tasks: `ocr-with-region` (default) and `component-location`. Florence task tokens are respectively `<OCR_WITH_REGION>` and `<OD>`. Gemini uses typed literal OCR or visible labels/regions. Same-task results alone are comparable. Whole-board state, ownership, hidden information and general rules reasoning are unsupported benchmark claims. Client timeout120s, retry0; timeout does not guarantee server-side cancellation or zero billing.

Conditions: photos-only or game-context. Florence game-context is N/A and sends nothing. Selected photos and visual references with `approvedForHosted:false` are allowed in offline preparation but block execution. Unselected catalog photos do not become upload blockers. The existing supplied Gemini key file was located and its format privately parsed; explicit read-only use supports normal0644 uploaded-file mode. Generated credential stores remain0600. No new Gemini key is requested.

No new dependencies, installs, package/lock edits, product changes, process changes, signup, deployment or live requests.
