# Supabase storage transition — 2026-10-28

The user authorized recreating nonessential/reproducible data rather than waiting for the suspended Vercel Blob store.

**Active production:** https://keepboard-kappa.vercel.app now uses Supabase. Deployment `dpl_3DMsm18oZrbZd3Y5CjnGPP28Xq8P` was promoted after remote upload/save/reopen checks. The public production URL returned 200 for the home page, storage mode, recovered board list and 120-game catalog. See [production verification](production-check.json) and [visible recovery result](production-recovered.png).

## Data boundary

- Dedicated project: `lfwogdbjcczleflkprsm`, Seoul. Private bucket: `keepboard-private`.
- Runtime namespace: `supabase-release-20261028`.
- Two public Catan recovery copies were recreated from previously cached API views and the exact original attachment. They are explicitly named recovery copies; later edits missing from those cached views are not inferred.
- The first copy has four assertions and no saved snapshot. The second has four assertions and two snapshots. Original observation values are unchanged.
- Built-in gamepacks remain code assets and require no reconstruction from Blob.
- The original Vercel production namespace contains 117 objects / 51,461,397 bytes. It remains untouched and download-blocked. This transition **does not claim that all 117 original objects were migrated**. Private records, PIN state, historical jobs and other test boards were not guessed from public/redacted views.

## Storage change

`server/supabaseObjects.ts` keeps opaque JSON bytes in a server-only database table and images in immutable private Storage paths. Conditional updates/deletes use the database etag predicate. The browser receives only a path-specific signed upload URL; session/owner/epoch checks still run before attaching a photo.

`KEEPBOARD_STORAGE_PROVIDER=supabase` selects the backend. Required server-only configuration: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `KEEPBOARD_SUPABASE_BUCKET`, `KEEPBOARD_BLOB_PREFIX`. Keys are not source files or browser variables. A selected-backend error never silently falls back to Blob.

The bucket has a 50,000,000-byte file cap. Larger photo/import files fail explicitly. Old images replaced or rejected after a CAS race may remain as unreferenced immutable objects; automatic garbage collection was deliberately not added to this migration.

## Evidence

- [Recovery provenance](recovery.json): source photo SHA, retained assertion/snapshot counts and limitations.
- [Live Supabase check](live-check.json): independent clients, atomic CAS, byte equality, 0/null, private signed upload, owner/epoch rejection, overwrite rejection and anonymous denial.
- [Deployment check](deployment-smoke.json): remote upload → save without correction → reopen photo/notes, with zero model calls.
- [Release source hashes](stage.json): seven reviewed production source/package changes applied to the prior frozen production stage.
- Focused storage/cloud/polling tests: 16 passed. Typecheck and client build passed. Remote deployment build was Ready before promotion. Browser upload CORS preflight also passed. No new model calls were made.

## Full original export, when Vercel permits downloads

`migrate.mts` provides `export`, `check`, and `import` commands for a private archive directory. It validates all archived bytes before destination writes, checks source stability during export, never overwrites conflicting destination bytes, and does not activate a deployment. Use a separate namespace for a future full import; do not merge blindly into the recovery namespace.

`recover-public.mts` is a one-off recovery operation and refuses to overwrite existing recovery boards. It is not a general backup restore utility.
