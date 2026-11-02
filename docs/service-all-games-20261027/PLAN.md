# Remaining games: real-photo service performance test

Goal: For every non-Catan pack in the current 120-game catalog, compare a real photograph's independently recorded visible facts with one actual current-service Gemini result. This is a first-pass photo test, not a full-game reconstruction guarantee.

- Freeze one existing original image per game, source hash and current pack/photo definition.
- Independently inspect each selected image before reading its service output. Record a few clearly visible object/attribute anchors with boxes (usually 3–8; a single readable card can be a narrower case); ambiguous text, hidden quantities and unassigned ownership stay unknown. Do not fabricate a full-image denominator.
- Select a photographed public or explicit synthetic-owner area supported by the actual pack. Distinguish scope/edition mismatch from recognition failure.
- Run actual isolated product create/upload/analysis-jobs/candidate flow, one attempt per game, no retries. Never include independent facts in the provider prompt. Capture request hashes and native response privately. Budget determined from actual preflight before sending.
- Audit native → receipt → candidate and, where supported, unchanged explicit review → save/reopen. Model accuracy and product-pipeline preservation are separate checks.
- Record failures and absent/unsuitable inputs explicitly. Inspect unknowns without inventing correct values. Do not change product code or tune prompts to the test.
- Deliver a game-by-game Korean report with readable success/needs-review/integration-failure/not-tested states, bounded known-value agreement, latency and usage.

Files: inventory.json (Luna); runner.mts and runner.md (Sol2); private independent-reference files plus reference index (Sol1/root); cases.json, scored results and report (root). Photos, native raw, isolated Stores and keys stay outside source control.

Verification: selected originals' SHA/dimensions; source/definition/body pin; synthetic runner checks including public job.id polling; one exclusive attempt claim per case; geometry-first anchor correspondence; exact field/region/source preservation; report completeness across all 119 IDs.

Scoring clarification: fixed numeric/enum/color/face/literal printed text uses exact normalized comparison. Open prose about structure/placement is semantic-review/unscored; it is not a unique photographed spelling. A declared visible field excluded by the unchanged hosted reader is recorded as unsupported/manual-input needs, never silently treated as a recognition error or included in the prompt.

Color-expression policy: retain exact raw strings and exact-match counts. For observedColor only, explicit shade modifiers of the same base hue and Korean/English color aliases are equivalent for content comparison (e.g. blue/light blue/파란색). Different base hues remain different; ambiguous compound/material terms stay for review. This is a general semantic comparison rule, not a reference rewrite.
