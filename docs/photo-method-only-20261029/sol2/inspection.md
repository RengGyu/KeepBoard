# Photo-method-only: preparation I/O inspection

VERIFIED — 2026-10-29. Read-only source inspection and in-memory synthetic counter; product/test edits, model calls and production I/O: 0. Existing cap2 is deployed behavior, not a proposed new gain. All `server/ai/**`, scene/gamepack/output contracts remain frozen.

| Path | Current image reads | Evidence |
|---|---:|---|
| Job request → prepareScanObservation, N originals | 2N | `server/index.ts:398–399`; prepareHosted `:20` or prepareLocal `:32` reads each photo; scan `:34` reads it again |
| Same prepare, C selected crop units | 2N+C | scan `:37` additionally reads original once per crop, even when original is selected or another crop already used it |
| Frame source | No extra over formula | scan `:27` prepares/validates source first, `:33` reuses pinned preparation; subsequent `:34` still rereads it |
| Cloud unit analyze, ordinary or crop | 1 input read per unit | `cloudRuntime.ts:25–28` → `analyzeScanUnit` → hosted `:27`; checks pinned SHA before provider |
| Local unit analyze | 1 original read; optional atlas recomputation | `localObservation.ts:43–46`; checks pinned source and transform |

Exact offline counter results (valid synthetic PNG, stub reader status, no provider):

- One original: `original, original` = 2 calls, 1 unique image.
- Three originals: `original, original, a, a, b, b` = 6 calls, 3 unique images.
- Two existing crops sharing an unselected original: `crop-a, crop-a, original, crop-b, crop-b, original` = 6 calls, 3 unique images.
- Original + two existing crops: `original, original, crop-a, crop-a, original, crop-b, crop-b, original` = 8 calls, 3 unique images.

These are readImage invocation counts, not measured network latency. For `/uploads/`, `BlobStore.readEvidence` calls `objects.read` each time (`blobStore.ts:14`). Supabase `read` fetches a metadata row and, when `storage_path` exists, downloads photo bytes (`supabaseObjects.ts:24–26`); first-use bucket validation is separately cached on that Objects instance. Local Store rereads the file (`store.ts:84–87`). No image memoization exists in these paths.

Preparation is serial across selected units: the loop awaits per-unit prepare, second image read, optional original read, then advances (`scanObservation.ts:29–48`). Thus duplicate storage waits are on the prepare critical path. Frame validation currently runs before any other selected unit and must retain that order.

RECOMMENDATION — smallest bounded same-byte repair, pending supervisor adoption:

1. Inside `prepareScanObservation` only, make a per-call memoized readImage wrapper. Key the complete evidence identity needed to separate id/url/scope/owner/captureEpoch/source/region, not a global photo ID. Share pending Promise as well as completed bytes so concurrent consumers do not duplicate an object fetch. Keep a rejection sticky for that preparation call; do not create retry behavior.
2. Route its existing nested prepare and scan/original reads through that wrapper. Retain all current hash/dimension/frame/crop-plan calculations and reader semantics initially. Then expected preparation storage reads are the number of unique selected/input/source identities: 2→1, 6→3, 6→3, 8→3 for the cases above.
3. Discard the memo when preparation ends. Do not return Buffer/cache in durable task/receipt and do not replace the original execution callback. Cloud analyze must perform its fresh input read/SHA check; local analyze must also see fresh bytes. A storage mutation between preparation and execution must continue to reject.
4. If adopting bounded parallel preparation separately, preserve input-index order and prevalidate the supplied frame first; join all started work on failure. The safest first patch is duplicate read elimination alone. Parallel preload before per-unit scope/epoch validation is not required and is not proposed.

Cloud metadata observations: normal `cloudAnalyzeBatch` loads the task at `:19`; `jobs.update(...running)` internally loads it again (`cloudJobs.ts:25`) before reading the job index. This is a duplicate task-object read, not duplicate photo bytes. `batchResult`, `taskTarget` session/PIN checks and create-only claim are correctness gates. Removing them is outside the minimal photo preparation patch. There is no image read duplication to remove inside a normal single cloud unit; its one fresh read is required by current pinned-input checks.

Proposed focused acceptance after design handoff:

- Counter cases above; same bytes/mimeType/SHA/dimensions and complete pinned request/plan values before/after.
- Shared crop original fetched once per prepare; input/source SHA and coordinate transform unchanged; no new crop or selection algorithm.
- Same id with changed URL/scope/owner/epoch/source identity never aliases the memo; independent prepare calls reread storage.
- Malformed/unselected/wrong-scope frame still rejects before another photo read; valid frame binds only its actual selected source.
- Scope/PIN/epoch/definition/request/receipt checks remain; changed source between prepare and execution rejects; provider is not invoked on failed pinned input.
- Unit ordering, partial-failure collection, no automatic model retry and existing cap2 remain unchanged; original raw receipt/save/reopen tests still pass.

UNCLEAR — savings in milliseconds and real end-to-end improvement need actual before/after measurement. This patch targets preparation I/O, not provider image understanding/generation. It cannot justify a promised 30-second total or a model-quality gain. No frozen-file edit is needed for the memoized preparation proposal.
