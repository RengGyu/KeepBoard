# Fixed-commit review work plan

Basis: RengGyu/KeepBoard@d7e6d098116659b727dae50a8ae204b1ab566aae.
Scope: source-code audit, offline reproducible matching/structural algorithms, minimal repair proposal. No remote writes, paid model calls, or deployment.

1. Read handoff requirements, Opus review, evidence, and actual projection/estimation/render paths.
2. Separate directly verified code defects from photo-dependent assertions. Original binary images could not be transferred through the available private GitHub text connector; do not invent a visual audit or numerical accuracy.
3. Implement and test a value-blind, one-to-one geometric matcher; do not hard-gate colour/type/source-area and do not turn unmatched into misread.
4. Reproduce source predicates on synthetic counterexamples and the transcribed Sagrada-high observations. Label these executions as predicate/excerpt probes, not full app tests.
5. Supply a pure reference-resolution helper and attachment-forest helper, repository integration changes, and focused tests. Preserve raw values/IDs/geometry.
6. Produce scope-aware CSV/JSON/Markdown outputs with blocked photo work explicit, concrete implementation cards, and no invented ground truth.
