# 20-game photograph reading / data-pack study

Selected before calls: 20 non-Catan games, one physical-play photograph per game. This evaluates the existing generic observation contract for one frozen area per game, not full-session reconstruction, camera scanning, cross-photo joining, or automatic placement. Current code is not edited.

References: two existing Sol/high sessions directly inspect ten photographs each BEFORE new provider outputs. They enumerate individually visible target objects in a declared area, mark readable attributes, and exclude hidden/uncertain content with reasons. These are AI visual annotations, not human-certified ground truth. If exhaustive enumeration is impossible, explicitly limit the score to a declared visible subregion and report that limitation. Do not infer invisible inventory from rules. Earlier partial census/reviews are not full ground truth.

Baseline: Gemini 3.8 Flash, LOW thinking, HIGH image resolution, maximum 32768 output tokens; current buildGeminiGameBody and decodeGeminiGameObservation; one attempt per case; maximum five in flight; no retry. On quota/network failure stop starting further calls and report unfinished cases. Native response, request and decoded response are preserved privately with SHA. Timing covers provider response; not deployed end-to-end time.

Metrics must retain raw numerator and denominator:

- Individual-object detection: one-to-one localized correspondence / independently enumerable reference objects. A row covering many pieces is a grouped output, not multiple individual detections. Record missed, duplicate, wrong-kind, off-area, and ambiguous rows separately.
- Correct kind recovery: one-to-one corresponding objects with correct canonical kind / reference objects. Wrong kind counts as a miss for this measure. Semantic synonyms can match only when meaning is demonstrably identical.
- Readable-value recovery: correctly recovered pre-annotated visible attributes / reference readable attributes. Missing object, absent attribute and returned unknown count as not recovered, rather than disappearing from the denominator.
- Output precision only if all evaluated-region outputs can be adjudicated. Otherwise report count of verified errors and unresolved outputs; never invent a precise precision from sparse positives.
- Report whole assessed-area exhaustion separately from limited-region scores. Do not label area/subregion percentages as full photograph or full game accuracy. Arithmetic pooling is a micro rate; also list per-game rates and game count.

Data-pack experiment: existing Astra/Ultra chooses four games and freezes only generic transferable reference data from primary sources before outputs. No photo answers, photo-specific coordinates/counts or hidden-state completion. Four extra requests differ only by the reference-data appendix. Same photo/settings/schema/base prompt; same frozen references. One paired run per game is exploratory and confounded by run variability; no causal/production accuracy guarantee. Report input/output/thought/total token fields as actually supplied and latency per call.

No training, fine-tuning, new agents, deployment, product changes or API credential output. Private photographs are retained for local research only, not licensed for redistribution.
