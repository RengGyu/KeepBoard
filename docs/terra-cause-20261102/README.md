# Existing-photo cause diagnosis, 2026-11-02

No new photography. Twelve paid calls, twelve HTTP200/decode successes, retry0; four previously evaluated diagnostic images. No product code changed. Requests frozen in preflight.json before calls. Reference/scorer inherited from the prior audited AI annotations; not human-certified and not a generalization benchmark. Each condition has one trial, so differences are directional evidence, not statistically established effects.

## Results (correct / wrong / unknown / missing unique facts)

| Image | Historical full low | Exact repeat | Fewer properties | High reasoning |
|---|---|---|---|---|
| Sagrada |33/6/0/0|32/7/0/0|32/6/1/0|30/4/5/0|
| Blokus |18/4/0/0|16/6/0/0|16/6/0/0|16/6/0/0|
| Carcassonne |58/1/12/1|57/0/14/1|—|—|
| Patchwork |3/0/10/0|3/0/10/0|—|—|

Focused subsets happen to retain all scored known facts for these two images; omitted unknown-reference fields do not enter the score. High took Sagrada51.7s vs repeat27.4s; Blokus43.0s vs20.0s. Lower wrong count on Sagrada is abstention as well as correction: fewer correct facts overall.

Fixed native-pixel crops of the same images (no new optical information): Sagrada's common 12 dice attribute rows changed historical31correct/5wrong to30correct/3wrong/2unknown (colors appear twice in attribute rows; unique facts are19correct/3wrong/2unknown). Blokus common8pieces changed9correct/3wrong to8correct/4wrong. Cropping changes context, framing, encoding JPEG→PNG and object count, so it does not isolate image resolution alone. These crops do not demonstrate a useful accuracy improvement.

Generic observable-absence instruction versus exact repeat: Carcassonne unchanged57/0/14/1. Patchwork3/0/10/0→3/5/5/0: all five leather patches became face=back, while shape stayed unknown/wrong-face. No inferred inventory totals or correct answers were supplied.

## Supported causes and boundaries

1. **VERIFIED: repeated visual-value errors occur before application decoding.** Historical Sagrada6wrong and Blokus4wrong already occur in provider valueJson. They are not introduced by the app converting values. All four original Blokus shape errors persist across historical/repeat/focused/high. Two Sagrada errors persist across all four. Most Sagrada errors undercount top pips (5→4,2→1). Interpretation: perceptual counting/shape reading is the best supported failure stage; internal model mechanisms, transparency effects, and encoder resolution are not proven. Fewer output properties and higher reasoning did not produce more correct facts.
2. **VERIFIED: much of the unknown cluster is deliberate abstention, not missing objects or parser loss.** Carcassonne's historical12 scored unknowns are explicit provider reason=occluded and expected false/0; Patchwork10 are explicit ambiguous. Carcassonne originals visibly have meeples covering tile surfaces. Expected absence under those covers is not necessarily directly observable. Thus twelve cannot all be certified as avoidable recognition failures from this photograph. No claim that all reference negatives are wrong either. Known full-tile state and photograph-visible state need separate denominators.
3. **VERIFIED configuration issue, INFERRED contributor: Patchwork special tokens share a front-only property contract.** Frozen definition puts leather patches in patches, with shape.faceOnly=true alongside printed income/time fields. This needlessly makes an outline depend on front/back identity. In the absence run the provider itself emits back plus shape wrong-face; decoder preserves it. Original unknowns are not demonstrated losses of a correct provider shape. Whether a plain leather token has a visually identifiable front as labelled in the AI reference is also unverified. Domain/face applicability is a more specific suspect than pixel size here; this experiment does not establish the benefit of a definition fix.
4. **VERIFIED variability:** identical request objects (request-checks.json) change Sagrada6→7wrong, Blokus4→6wrong and Carcassonne1→0wrong. A one-call improvement must not be presented as stable improvement. Four images were selected because of known failure concentration; there is no unbiased overall-rate estimate from this suite.

## Decision

We can now identify different failure stages: repeated pip/shape interpretation; occlusion-aware abstention; special-token/face applicability in definitions. Do not deploy a blanket longer prompt, high reasoning, or crop fallback from these results. The next bounded fix candidate is a game-independent rule separating physical outline from face-specific printing and explicit special-token applicability; it still requires a separate controlled comparison, without hardcoded image answers. Product remains frozen in this task.

Evidence: preflight.json (scope and request hashes), execution.json (12 calls and timing), scores.json (per-object facts), provider-error-trace.json (historical provider values/reasons), crop-common-subset.json and request-checks.json. Original references and images were not edited. Raw provider/request material stays in private temporary storage.

OpenAI's primary vision documentation also lists approximate counting and spatial limitations; this is supporting context, not proof of this dataset's mechanism: https://developers.openai.com/api/docs/guides/images-vision
