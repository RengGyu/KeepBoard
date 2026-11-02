# Next release inventory (2026-10-29)

Timestamped source observation for handoff; it is not a release freeze. [inventory.json](inventory.json) has the SHA-256 of each whole current source file in the union of the 20-file earlier scan bundle and the 6-file parallel completion bundle (23 unique paths).

## Completion evidence

The latest recorded completion is `IMPLEMENTED_TESTED_NOT_DEPLOYED`: 21 focused checks passed, `build:vercel` exited 0, and the timing record reports 8 model calls with 0 retries. This is historical evidence from `docs/scan-parallel-20261028/implementation/completion.json`; tests/build were not rerun for this inventory.

## Hash comparison

- **VERIFIED:** 23/23 paths exist. All six files in the later parallel completion match its recorded hashes.
- **VERIFIED:** Three earlier handoff hashes (`server/cloudRuntime.ts`, `server/scanObservation.ts`, `tests/scan-recognition-integration.test.ts`) differ from the earlier 20-file handoff, and match the newer parallel completion hashes.
- **VERIFIED:** `src/ScanObservationResults.tsx` differs from its only recorded handoff `postSHA`; no later recorded hash is available for that path. This is a whole-file mismatch, not a defect finding.
- No current source file is missing. Exact expected/current hashes and per-reference comparisons are in `inventory.json`.

## Deployed boundary and staging

- **REPORTED in deployment records:** Supabase migration deployment `dpl_3DMsm18oZrbZd3Y5CjnGPP28Xq8P` and native Catan deployment `dpl_8iE2xExHSSzYUS8ExjZK7xVKpmzf` both name `https://keepboard-kappa.vercel.app`. The records contain partial source hashes (7 updated files for the storage release and 8 source files for the native release); the native record says its listed source files matched its stage at production verification. See the exact maps in `inventory.json`.
- **UNCLEAR:** The local records do not establish a complete deployed source manifest or independently establish the combined/latest source boundary across those deployments. The referenced temporary stage directories are absent. The working source directories (`src`, `shared`, `server`, `workflows`) still exist, but the full deployed source cannot be reconstructed locally from these records.
- The project has `vercel.json`, `.vercel/project.json`, and the cached Vercel CLI entrypoint noted in `inventory.json`. `package.json` exposes `build:vercel` (build only). Both recorded temporary release-stage paths are missing; no deploy command was run and no current deploy-ready stage was verified.
