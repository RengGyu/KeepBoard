# KeepBoard UI handoff

This branch is the latest local application snapshot, prepared for Claude Code Cloud. Work on the real app in `src/`, not the old standalone study.

## User request
KeepBoard saves a paused physical board game from photos, lets users correct its drawn representation, and reopens the saved state later. Finish the UI using the four approved generic board-game cartoon illustrations. Preserve the typography sizes and page structure the user already liked. Refine image placement/cropping, color consistency and visual hierarchy without adding features. Use the bundled `.claude/skills/frontend-skill/SKILL.md` and `.claude/skills/redesign-existing-projects/SKILL.md` where relevant; this specific user brief overrides generic skill defaults. No new images are requested.

## Approved assets and existing implementation
- Hero: `public/brand/cartoon-v2/home/home-hero-v2.png`.
- Empty boards: `public/brand/cartoon-v2/home/empty-table-v2.png`.
- Capture help: `public/brand/cartoon-v2/states/capture-guide-v3.png` (v3 is approved; do not use the old v2 with the wrong phone orientation).
- Save/reopen: `public/brand/cartoon-v2/states/save-box-v2.png`.
- Optimized JPEGs: `public/brand/cartoon-v2/web/`, referenced by `src/brandImages.ts`. Keep them consistent with the approved originals.
- Latest bindings already exist in `src/App.tsx`, `src/ui.tsx`, `src/Capture.tsx`, `src/SessionWorkspace.tsx`, `src/BoardFeedback.tsx`, `src/styles.css`, and `src/board-feedback.css`. Inspect and finish them instead of reimplementing. The old `HomeBoardStory` component is not mounted on the current home.
- Save/reopen illustration currently lasts 2200ms. Save feedback follows a successful save; reopen feedback follows successfully opening a saved board, not player/PIN switching. Preserve these contracts.

## Acceptance
Verify the real app at 390x844 and 1440x1000: home, empty boards, capture help, saved board and save/reopen feedback. Check image loading, crop, text contrast, horizontal overflow, visible tap labels and reduced motion. Keep editor surfaces calm. Preserve actual user photos, public/private separation, 4-digit PIN, multi-select, move/swap/undo, adding components, save/reopen and turn handling. Run `npm run typecheck`, `npm test`, `npm run build`. Report exact changes and actual checks; explicitly mark anything unverified. Local browser access failed before this handoff, so no current-revision app screenshots were verified. Do not claim old screenshots validate this revision.

## Running in the cloud
Install dependencies with `npm ci`; start the real app with `npm run dev` (4317). Use synthetic examples and a fresh temporary `KEEPBOARD_DATA_DIR`; do not call paid AI providers. No API keys or real runtime records are supplied. The gateway source is included, but `gateway/.local`, `.keepboard`, `.env*` and machine credentials are deliberately excluded. The current `vercel.json` retains the previous deployment configuration; cloud UI verification should use the local dev server, not that deployment or its Mac-hosted API tunnel.

The art library covers 120 game IDs/437 component classes, not 120 playable rule engines. Keep unresolved components unknown; 26 source-uncertain classes plus one deliberate Catan unknown remain. Source specs, generated assets and generators are included. Large official PDF research copies are excluded; `docs/art-confirmation/verify.py` cannot recheck their local hashes in this snapshot. UI tests/build do not need those PDFs.

This cloud handoff authorizes finishing this UI in a cloud branch. Do not deploy, merge to main, alter private data, purchase services or broaden backend/game rules. Local source workspace and current working branch were preserved by the uploader.

## Snapshot verification
Fresh isolated install (`npm ci`), all 176 tests and the typecheck + Vite production build passed before upload. See `CLOUD_VERIFICATION.json`. Actual current-revision browser UI verification remains pending.
