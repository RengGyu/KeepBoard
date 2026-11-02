"""Read-only audit of frozen responses; no model calls, image processing or GT edits.

Run from the repository root with python3 <this file>. Only this research folder
receives output. Private response locators are read from existing preflights and
are deliberately omitted from the published result.
"""
from pathlib import Path
import ast
import collections
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
# This file is under docs/<research>/; parents[2] is the project root.
OUT = Path(__file__).resolve().parent
STUDY = ROOT / "docs/terra-quality-iteration-20261030"

def read(path):
    return json.loads(path.read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

pre = read(STUDY / "preflight-high.json")
pre_d = read(STUDY / "crop-high/preflight.json")
evals = read(STUDY / "evaluation-high.json")
eval_d = read(STUDY / "crop-high/evaluation.json")
timings = read(ROOT / "docs/terra-latency-architecture-20261031/timing-analysis.json")

rows = []
for case in evals["cases"]:
    game = case["gameId"]
    variants = {v["condition"]: v for v in case["variants"]}
    dcase = next(c for c in eval_d["cases"] if c["gameId"] == game)
    variants.update({v["condition"]: v for v in dcase["variants"] if v["condition"] == "D"})
    for condition, value in sorted(variants.items()):
        # Original A/B/C response bytes only; D's raw tally is already frozen.
        private = Path(pre["privateDir"])
        path = private / f"{game}-{condition}.result.json"
        raw = None
        if condition != "D":
            assert path.exists()
            assert sha(path) == value["resultSHA"]
            obs = read(path)["observationReceipts"][0]["result"]["observations"]
            states = collections.Counter(p["state"] for o in obs for p in o["properties"].values())
            prop = collections.Counter(f"{k}:{v['state']}" for o in obs for k, v in o["properties"].items())
            raw = {
                "responseSHA256": sha(path),
                "observations": len(obs),
                "components": dict(collections.Counter(o["componentId"] for o in obs)),
                "propertyRows": dict(states),
                "propertyStateCounts": dict(sorted(prop.items())),
                "notScoredAsWholeSceneGroundTruth": True,
            }
        usage = value["usage"]
        output = usage["output_tokens"]
        reason = usage.get("output_tokens_details", {}).get("reasoning_tokens", 0)
        rows.append({
            "gameId": game, "condition": condition,
            "rawAudit": raw,
            "selectedReference": {
                "objects": value["individual"]["referenceObjects"],
                "detected": value["individual"]["detected"],
                "missing": value["individual"]["missing"],
                "numeric": value["individual"]["numeric"],
                "numericHighReferenceConfidence": value["individual"]["numericHigh"],
            },
            "observedButWrongNumeric": value["individual"]["numeric"].get("wrong", 0),
            "unknownOnlyRoutingCannotDirectlyTargetTheseKnownErrors": True,
            "providerSeconds": value["providerMs"] / 1000,
            "inputTokens": usage["input_tokens"],
            "outputTokensIncludingReasoning": output,
            "reasoningTokensSubset": reason,
            "nonReasoningOutputTokens": output - reason,
            "historicalCalculatedUSDNotInvoice": value["calculatedUSD"],
        })

arithmetic = []
for game in timings["games"]:
    calls = {v["condition"]: v for v in game["measuredCalls"]}
    a, d = calls["A"], calls["D"]
    arithmetic.append({
        "gameId": game["gameId"],
        "classification": "COUNTERFACTUAL_ARITHMETIC_NOT_NEW_TIMING_MEASUREMENT",
        "wholeLowThenCropHighSeconds": a["providerSeconds"] + d["providerSeconds"],
        "simultaneousWholeLowCropHighSeconds": max(a["providerSeconds"], d["providerSeconds"]),
        "excluded": ["local detector/OCR", "upload", "crop planning", "UI", "provider concurrency effects", "human correction"],
        "notAnEstimateForNewCompactRefinementTask": True,
    })

# Static parsing of one public source file is not executing the implementation.
index = read(OUT / "code-source-index.json")
row = next(x for x in index["files"] if x["repo"] == "AILab-CVC/YOLO-World" and x["path"].endswith("detectors/yolo_world.py"))
q = Path(row["localPath"])
try:
    ast.parse(q.read_text())
    parse = {"validPythonAST": True}
except SyntaxError as error:
    parse = {"validPythonAST": False, "line": error.lineno, "message": error.msg}
parse.update({"sourceURL": row["url"], "sha256": sha(q), "executed": False,
              "limit": "Only this pinned main file; not a finding about released weights or every downstream implementation."})

out = {
    "version": "fast-first-frozen-response-audit-v1",
    "newModelCalls": 0, "productWrites": 0, "groundTruthWrites": 0,
    "method": "SHA-check original A/B/C stored results; count literal property states; reuse unchanged frozen partial-reference scoring. D scoring and timings are imported, not independently visually rescored.",
    "sources": [{"path": str(p.relative_to(ROOT)), "sha256": sha(p)} for p in [
        STUDY / "preflight-high.json", STUDY / "evaluation-high.json",
        STUDY / "crop-high/evaluation.json",
        ROOT / "docs/terra-latency-architecture-20261031/timing-analysis.json"]],
    "rows": rows, "criticalPathArithmetic": arithmetic, "publicCodeStaticParse": parse,
    "limits": [
        "Three previously exposed development photos and partial AI references; no whole-scene precision/recall or independent generalization claim.",
        "Unknown rows outside the selected reference do exist. This does not claim an unknown-triggered request would never incidentally fix a known wrong value.",
        "Missing objects have no obligatory output row; counting model unknown fields is not an inventory completeness test.",
        "No detector/OCR implementation was installed or run; no routing benefit or new task speed is measured.",
        "A smaller ROI and correct coordinate transform do not establish a more accurate value.",
    ],
}
assert len(rows) == 12
assert next(r for r in rows if r["gameId"] == "sagrada" and r["condition"] == "A")["observedButWrongNumeric"] == 1
(OUT / "offline-audit.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"rows": len(rows), "originalResponsesHashChecked": 9,
                  "publicCodeStaticParse": parse, "modelCalls": 0}, ensure_ascii=False))
