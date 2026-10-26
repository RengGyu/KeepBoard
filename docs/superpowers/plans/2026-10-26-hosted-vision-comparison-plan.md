# Hosted vision comparison implementation plan

> **For agentic workers:** Use the existing assigned Paseo sessions. No new agents, commits, or production changes.

**Goal:** Prepare and then measure Gemini Flash against a named Roboflow image reader, with reusable connections to KeepBoard game information.

**Architecture:** An isolated benchmark sends the same source images to provider adapters and preserves native responses before normalization. Game definitions, rule excerpts, and real visual references form a versioned context bundle; supported context conditions are measured separately from image-only recognition. Existing review, save, resume, and default providers stay in place.

**Tech stack:** Existing Node/TypeScript or standard-library tooling, REST APIs, JSON manifests, current offline scoring utilities.

**Spec:** User request on 2026-10-26: prepare the Roboflow/Gemini comparison, notify when account/API credentials are required, and support connecting existing board-game image/rule information.

## Global constraints

- Preserve existing product code, dirty work, processes, runtime stores, and prior experiment evidence.
- Do not access `.keepboard/`, expose credentials, copy private images/raw/GT into the repository, or run automatic signup, training, purchase, or deployment.
- Existing source photos are development cases, not independent held-out evidence. External upload permission is separate from local file availability.
- Do not place evaluation answers, state inventory constraints, or previous prediction corrections into model context.
- No live inference during preparation. Execution requires actual credentials and an explicitly selected upload-eligible manifest.
- Initial runner limit: at most six attempted inference calls, no automatic retries. This is a request limit, not a guaranteed monetary cap.
- Document unsupported tasks as unsupported; do not score a native OCR model as a general rule-reasoning model.

## Review focus

- Correct endpoint and response contract for the specific current model, not the platform name.
- Context provenance and capability support, with observed pixels distinguished from retrieved facts.
- Missing, malformed, truncated, or unlocalized output remains visible in evaluation.
- Credentials and image bytes stay out of public logs; preparation makes no network requests.
- Measured provider usage, estimated cost, and unknown actual billing remain distinct.

## Task 1 — reusable data and benchmark inputs (Sol1)

**Files:** `docs/hosted-vision-comparison/data/**` only; existing sources read-only.

- [x] Inventory actual game definitions, rule sources, and real visual reference assets.
- [x] Define a small context/input manifest with source hashes, edition/provenance, permission status, and private locators.
- [x] Prepare the two previous source photos as development cases where available, with offline-only GT references. Select the available user-provided photo for all six runs; retain the other as an unused catalogue entry with its verified cache locator.
- [x] Define image-only and context conditions and mark unsupported Florence rule/reference reasoning explicitly.
- [x] Verify manifest hashes and provenance without model calls or uploads.

## Task 2 — provider adapters and isolated runner (Sol2)

**Files:** `tools/hosted-vision-benchmark/**`, `tests/hosted-vision-benchmark*.test.*`, `docs/hosted-vision-comparison/runner/**`.

- [x] Verify official API contracts for `gemini-3.8-flash` and `florence-2-base`, including region OCR support.
- [x] Implement credential-free preparation and explicit bounded execution, consuming Task 1's agreed manifest.
- [x] Implement private native-response and request/model/input/context hash, usage, client timing, and normalized-observation records. Live output remains untested.
- [x] Test transport construction, native parsing, context support, failure handling, and request limits with fixtures only: 18/18 pass.
- [x] Provide account links, hidden credential entry, and exact preparation/execution commands without changing dependencies. Existing Gemini key file found; Roboflow credential absent.

## Task 3 — supervisor review and actual comparison

- [x] Review the concrete diff, offline verification, data eligibility, and official provider documentation.
- [x] Give the user the exact signup/key setup required; never request secrets in chat. Reuse the existing Gemini upload; only the Roboflow credential is missing.
- [ ] Once credentials and upload-eligible images exist, run the bounded comparison through the assigned worker.
- [ ] Report literal recognition accuracy, location/missing/extra errors, timing, usage/cost, context effect, and unsupported capabilities separately.
- [x] Keep an unexecuted state explicit if credentials or eligible data are still missing. No live calls were made and no performance winner is claimed.

**Verification:** Focused offline tests and manifest/hash checks only during preparation. No full-suite/build repetition is needed for isolated tools. Any real run must retain its attempted-call ledger and native evidence.
