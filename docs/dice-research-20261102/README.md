# Dice reading research and bounded experiments — 2026-11-02

## Outcome

A promising method was found without new photography: existing provider dice boxes →10% margin crops→224px contact sheet→model enumerates visible upper-face pip centres→caller counts centres. No expected die values, opposite-face rules, inventory restrictions or per-photo answers were included in the prompts. Six new Terra low calls, zero retries: two pip-centre trials and one same-image direct-value control per existing photo. No product dice reader was changed or deployed.

| Existing source | Known die values | Historical numeric read | Crop + pip-centre trial1 | Trial2 |
|---|---:|---:|---:|---:|
| 800×614 close Sagrada |19|13 correct /6 wrong|17correct /2wrong|18correct /1wrong|
| 1024×768 older Sagrada |19|13correct /6wrong|19correct /0wrong|19correct /0wrong|

The first source has20dice but one value remains excluded as uncertain in the audited reference. In the second source, a prior audit could not independently confirm one of the19 labelled values (`die-r3c2`). Excluding it gives historical13/18, new18/18 in both trials. These are AI references, not human-certified board truth. Original references were not edited.

First source remaining errors: trial1 purple5→4 and blue2→1; trial2 blue2→1. Local point overlays were inspected; this is still a visual prediction, not proof of exact counting. No confidence-based or majority-vote replacement was tested.

## What the result establishes

VERIFIED: this composite method produced more correct known die values on two previously tested photos, repeated twice without changing the method for photo2. It uses old provider boxes, not reference boxes, to crop. It does not require the user to take more photos. Empty/hidden upper faces should remain uncertain; the prompt explicitly forbids inventing hidden pips.

Not established: unseen-game/lighting generalization, full dice detection recall, whether pip enumeration alone caused the gain, or a production latency improvement. Occlusion abstention was instructed but not independently validated with a dedicated masked/hidden-face test in this research package. Cropping, enlargement, output task and surrounding context all changed together. Historical baseline comparisons were not newly interleaved. Enlarging creates no new optical information. Dice missed by the first detector are not repaired by this method.

Runtime: first image new calls14.7/15.0s; second21.3/14.8s. This is **additional** after localisation, not total app duration. Each contact sheet reads all detected dice together. Model/prompt freeze hashes are in pip-request-freeze.json and second-pip-request-freeze.json; privacy-sensitive raw requests stay in private temporary storage.

## Output-task control

Two additional frozen controls used the exact same contact sheets but requested only the top-face value (no centre coordinates). They returned **19/19 correct on each photo**, in8.6s and6.7s. This means pip-centre enumeration is not established as the source of improvement: individual die framing and the narrower top-face task are sufficient candidates. The simpler direct-value contact-sheet reader is the preferred next integration candidate; one control trial per photo is not stability evidence. No prompt or crop parameters were tuned after this control. See direct-preflight.json and direct-scores.json.

## Existing specialist model trial

The unmodified public `G-G-Games/diecamera-models/dice-value-cls.onnx` classifier ran locally on the same20 saved provider crops using its model-card recipe (RGB,224px,ImageNet normalization). On the19 known values it got **2/19** using unrestricted class argmax, **4/19** restricting argmax to legal d6 classes. Execution20crops0.278s, excluding model load. This model is not suitable as a replacement on this photo under the tested recipe. Its referenced application source URL was404, so exact parity with the author's runtime is unverified; this is not a verdict on all specialist models. No fine-tuning, label-driven preprocessing tuning or product integration occurred.

The published literature, Apple sample and commercial workflows are collected in [sources.md](sources.md). They support a detector→top-face-reader structure; their reported accuracies must not be advertised as KeepBoard accuracy. Classical blob counting also risks counting side-face dots in angled/translucent dice. A dedicated detector with training data matching Sagrada remains an alternative, but training was not needed to demonstrate the above candidate.

## User's occlusion and single-residual policy

General recognition should accept occlusion and retain unknown. A separate game-pack inventory deduction may fill an unknown if the complete relevant inventory is present and one slot/value remains after multiset subtraction. Per user instruction, other observed values are taken as correct; confidence or independent revalidation is not a gate. This is derived state with provenance, not a claim that pixels revealed a hidden value. Dice roll values have no fixed per-photo inventory and must not receive this deduction. Product condition audit/implementation is owned by 구현솔 under docs/recognition-conditions-20261102/.

## Reproduction / artifacts

- prepare.py, classify.py: original provider-box crops and unchanged local classifier.
- read-pips.mts: frozen two-call upper-face centre enumeration.
- prepare-second.py, read-second.mts: same method on an existing second photo; separate two-call preflight before outputs.
- scores.json, second-scores.json, direct-scores.json: per-ID values and numeric comparison.
- preflight.json, second-preflight.json, both request-freeze files: fixed scope and input hashes.
- local-classifier.json, pip-results.json, second-pip-results.json: results.

Private research directory: `/private/tmp/kb-dice-research-20261102/`; isolated Python venv and downloaded weights are not project dependencies.
