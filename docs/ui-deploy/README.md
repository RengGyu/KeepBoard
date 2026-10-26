# UI production deployment · 2026-10-21

https://keepboard-kappa.vercel.app

VERIFIED: new game-client UI and 120-game component library deployed via clean prebuilt output to the existing KeepBoard project. Deployment `dpl_BZXS1pXkjaVL6srPUz4PieQ6xxmt`. Local API configuration and research files were not uploaded.

Fresh full regression: 176 passed / 0 failed. Typecheck + Vite build exit 0. Public index matches the local build hash; CSS/JS/asset index/representative common and existing SVGs/API health returned 200. Public mobile home and component-library rendering were checked in Chrome at 390×844; the library was also checked at 1440×1000. No horizontal overflow or broken images in checked views.

Stopped backend/proxy/tunnel were restored using the existing data path. `vercel.json` now points API/uploads to the new tunnel and excludes game-art/carcassonne-art from the SPA fallback. `.vercelignore` also excludes gateway/.local.

The Mac backend, proxy and Cloudflare tunnel must remain running. This is not an always-on hosting migration. No real AI calls, user-data edits, commit or push were performed.

[Verification](verification.json) · [Mobile home](production-home-390.jpg) · [Mobile art](production-art-390.jpg) · [Desktop art](production-art-1440.jpg)

The 81 source-unclear component categories are being investigated separately in docs/art-confirmation/. The deliberate Catan unknown marker is retained.
