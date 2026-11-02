# Terra failure causes: final existing-photo analysis

VERIFIED 2026-11-02. Final analysis used saved results only: no new model calls, photography, product changes, or deployment. Original images/references remain unchanged. References are AI visual annotations, not human-certified truth.

## Baseline and denominator

Use the ten existing-photo `default-replay` reports in `docs/terra-detail-20261102/scores-audited.json`, excluding the two held-out photos. There are 352 unique scored facts: 312 correct (88.64%), 12 wrong (3.41%), 25 unknown (7.10%), 3 missing (0.85%). Unknown plus missing =28 (7.95%). A fact is a scored property, not an object or a successful game restoration.

## Unknown/missing: where the 28 facts went

|Cause/evidence|Facts|Of28|Outcome|
|---|---:|---:|---|
|Carcassonne covered tile surfaces; reference expects false/0|12|42.9%|Original provider explicitly abstained as occluded. No crop retest; cannot certify these as photograph-readable failures. Keep unknown.|
|Patchwork physical outline under a front-only contract|5|17.9%|All five square outlines match in both diagnostic trials. Outline should not depend on front/back; framing and instructions changed together, so the individual contribution is not isolated.|
|Patchwork front/back identity|5|17.9%|All five remain unknown in both trials. Plain surface does not establish face identity; original AI reference front labels are not certified.|
|Codenames small blurred print|2|7.1%|Both words remain unknown in both trials. Enlargement did not establish recoverability; missing optical detail vs model limits is not isolated.|
|Missed Carcassonne/Ticket-to-Ride pieces|3|10.7%|Their colors match when the correct objects are supplied as crops. The original failure is localisation/omission; this does not prove an automatic crop finder can recover them.|
|Rummikub ink colour|1|3.6%|Both trials say red vs AI reference orange. Unresolved reference/colour disagreement, not credited as recovery.|

Two identical frozen diagnostic requests tested16facts in11crops. Both produced8matches/7unknown/1disagreement; fact outputs agree across repeats. This is 8/28 (28.6%) baseline unknown/missing facts shown to be readable under assisted localisation and revised instructions, NOT a 28.6% production recovery rate. Of these8, five concern a known definition/applicability issue and three require locating originally omitted objects. No overall post-fix accuracy can be computed by splicing these assisted results into the baseline.

Crops use reference boxes (oracle localisation), unlike the dice experiment which used provider boxes. The request supplies no expected answers, but asks a narrower direct-visibility task and separates outline from face. Consequently this is not an enlargement-only controlled experiment and not an automatic detection test. Repeat two is cached; the repeats are not independent unseen-photo samples.

## Wrong values: different from unknown

Of12baseline wrong facts: Sagrada die values6 (50.0%); Blokus cell/shape descriptions4 (33.3%); Carcassonne posture1 (8.3%); Kingdomino colour wording1 (8.3%). The last is `blue and tan` vs reference `blue`, so it includes a semantic/scoring-granularity issue rather than proving wrong visual colour detection.

The earlier twelve-call cause suite traced repeated dice/shape errors to provider values before application decoding. Fewer properties/high reasoning did not improve correct facts; high increased latency. Native-pixel multi-object crops also did not establish useful improvement. See `../terra-cause-20261102/README.md`.

The separate dice experiment instead framed each detected die and asked only for its upper-face value. Two existing photos' direct-value controls matched19/19 each; conservative denominator37/37 after excluding one disputed second-photo reference. Historical known-value reads were13/19 on each. This supports individual framing plus a narrow top-face task as a candidate; it does not isolate enlargement, establish stable unseen-photo accuracy, recover missed dice, or validate hidden-face behaviour. See `../dice-research-20261102/README.md`.

## Time/tokens and decision

The saved diagnostic calls took10.050s/7.485s, each additional after locating objects. Tokens:1918input+539output=2457;1918input+447output=2365 (1915input cached on repeat). Total2calls,4822tokens,17.535s provider time summed. Not end-to-end app time. Final scoring adds zero calls.

Conclusion: do not apply enlargement as a universal unknown/omission fix. Distinguish (1) visible detail/value reading, (2) object localisation, (3) definition applicability, (4) unobservable state, and (5) reference/scoring ambiguity. A targeted detected-die top-face reader is the strongest demonstrated candidate; retain unknown for hidden detail, with the separately implemented Catan single-residual rule as user-authorized derived state. Definition corrections were implemented in the separate recognition-conditions package; no fresh post-correction accuracy run is claimed here. Blur, shape-cell counting and omitted-object automatic recovery remain unresolved.

Evidence/reproduction: `python3 docs/unknown-crop-check-20261102/score.py` validates both saved trial counts and writes `analysis.json`. `preflight.json` freezes targets/protocol; `request-freeze.json` freezes request hash; `results.json` contains saved values/usage. Private contact sheet was visually reviewed in the final pass. Final numeric verification passed; there is no product-code test to run for this report-only change.
