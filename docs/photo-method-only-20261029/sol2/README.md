# Photo preparation read deduplication

VERIFIED: only `server/scanObservation.ts` photo preparation was changed. A per-call Promise memo reuses the same evidence bytes during preparation; analysis still reads storage afresh and validates the pinned SHA. No AI instruction, output/schema, model setting, crop or selection policy changed.

| Existing photo inputs | Before reads | After reads |
|---|---:|---:|
| One original | 2 | 1 |
| Three originals | 6 | 3 |
| Two existing crops sharing a source | 6 | 3 |
| Original plus two existing crops | 8 | 3 |

The new focused tests compare complete plans/requests/transforms against the archived original module without deleting fields. Independent preparations never share the cache, metadata identities stay separate, and changed analysis bytes fail before a model call. The requested existing regressions plus new tests pass 41/41.

[Exact command, pre/post SHA and limits](verification.json); [original source snapshot](scanObservation.before.ts.snapshot); [initial inspection](inspection.md).

UNCLEAR: saved milliseconds, provider generation time and end-to-end improvement have not been measured by this worker. Callback counts do not establish a provider-speed or recognition-quality gain.
