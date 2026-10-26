# Hosted vision comparison

Status: partial execution completed with 4 of 6 allowed attempts used. The initial Gemini failure was caused by our credential parser truncating the supplied token; the parser is fixed and focused checks passed 20/20. The corrected Gemini request was blocked by the provider-reported project monthly spending cap (HTTP 429). Florence completed both tasks: OCR matched 1 of 18 annotated numerals, while object labels were unscored because component ground truth is unavailable. No Gemini output exists, so cross-provider quality and context effects remain unmeasured. See [measured results](results/pilot-20261026/README.md). No further calls or billing changes were made.

## What will be compared

- Gemini `gemini-3.8-flash`: image reading with structured observations; a separate condition supplies selected game context.
- Roboflow `florence-2-base`: native region OCR and supported object tasks. It is not a substitute for a general rule interpreter.
- Compare matched tasks on identical source bytes. OCR results do not establish complete board-state recognition.
- Start with the earlier Catan photos as development cases only. New independently annotated photos are needed before making generalization claims.

The runner will preserve raw responses, normalized observations, input/context hashes, client latency, and provider usage. Estimated cost and actual invoiced cost must remain distinguishable. The first execution is limited to six attempted calls, without automatic retries; this does not guarantee a fixed monetary charge.

## Connecting existing game information

`game/edition -> selected definitions + sourced rule excerpts + eligible real reference assets -> provider adapter -> observations -> existing game-pack validation/review`

Definitions describe valid component names and fields. Rules describe their meaning and relationships. Real reference photographs identify physical appearance. These are separate assets, and one does not replace the others. The current Catan export supplies component categories and an implementation summary; it does not demonstrate full rulebook understanding. No validated physical reference set is attached yet.

The comparison keeps image-only and context-assisted conditions separate. Gemini can receive supported text/image context. Florence uses native task prompts; unsupported rule/reference reasoning is recorded as not applicable. Future external matching may use its detected regions, but no matching model or training is claimed here.

Evaluation answers, previous corrections, fixed inventory counts, and hidden game state are excluded from model payloads. Retrieved facts must remain distinguishable from directly observed pixels. Existing save, review, resume, and default AI behavior are unchanged.

## Accounts required before actual calls

1. Gemini: the previously supplied `KeepBoader_Gemini_API` upload has been located. Reuse that file; a new key or signup is not required for preparation. The corrected request was blocked by the project monthly spending cap; check [AI Studio spending settings](https://ai.studio/spend). A replacement key is not indicated by this error.
2. Roboflow: the user supplied `KeepBoard_Roboflow_API` as a private upload. The runner reads it directly into memory; values are not shown or copied into source. Future accounts can use [API settings](https://app.roboflow.com/settings/api). A private workspace and data-use opt-out are different settings.

Do not paste keys into chat or repository files. Add only the Roboflow key through the local hidden-input helper:

```sh
python3 tools/hosted-vision-benchmark/credentials.py
```

Both supplied uploads can be used directly, so the helper is optional for this run. See [exact setup and execution instructions](runner/README.md). The previously user-provided Catan photo is selected under the current comparison request. Other local research photos retain their prior restrictions and are not substituted silently.

## Official contracts checked on 2026-10-26

- [Gemini 3.8 Flash capabilities](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [Gemini image input](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing): standard paid input $0.75 and output including thinking $3.75 per million tokens through 2026-12-31; free quota availability is project-dependent. No KeepBoard per-photo price is measured yet.
- [Florence-2 aliases, task prompts and API](https://docs.roboflow.com/models/supported-models/florence-2): `/infer/lmm`, including `<OCR_WITH_REGION>` and `<OD>`.
- [Roboflow billing](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api/pricing): VLM execution is billed at 500 execution seconds per credit. RF-DETR's per-image price must not be substituted for Florence billing.
- [Roboflow plans and data use](https://roboflow.com/pricing): current free plan includes 10 monthly credits; data-use opt-out is available separately. Actual remaining credits have not been inspected.

## Work artifacts

- [Implementation plan](../superpowers/plans/2026-10-26-hosted-vision-comparison-plan.md)
- [Data/context manifests and available assets](data/README.md).
- [Frozen six-run input manifest](data/benchmark-manifest.json).
- [Runner/account instructions](runner/README.md).
- [Offline verification and credential readiness](runner/verification.json).

Only preparation and offline verification can complete before credentials and upload-eligible input are available. No winner or real accuracy comparison is reported at that stage.
