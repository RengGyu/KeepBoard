"""Read-only metadata inspection for this design; writes only beside this file.

No product execution, image/provider calls, operating data, or truth-ledger edits.
"""
from collections import Counter
from hashlib import sha256
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent


def read(path):
    return json.loads((ROOT / path).read_text())


def counted(values):
    return dict(sorted(Counter(str(v) for v in values).items()))


cases = []
protected = []
for path in sorted((ROOT / "docs/pro-review-20261113/data/cases").glob("*.json")):
    case = json.loads(path.read_text())
    receipts = case["receipts"]
    observations = [o for r in receipts for o in r["result"]["observations"]]
    structure_path = f"docs/astra-placement-recovery-20261113/final-v2/structures/{path.stem}.json"
    structure = read(structure_path)
    cases.append({
        "caseId": case["caseId"], "gameId": case["gameId"],
        "observations": len(observations),
        "nonnullBoxes": sum(o.get("bbox") is not None for o in observations),
        "nonnullLiteralRotations": sum(o.get("rotationDegrees") is not None for o in observations),
        "kinds": counted(o.get("componentId") for o in observations),
        "sourceAreas": counted(o.get("sourceAreaId") for o in observations),
        "fields": [{"field": a["field"], "pieces": len(a.get("value", {}).get("pieces", []))} for a in case["assertions"]],
        "readModes": [r["request"].get("readMode") for r in receipts],
        "spatialRequested": [bool(r["request"].get("spatial")) for r in receipts],
        "structure": {"groups": len(structure["groups"]), "boardContexts": len(structure["boardContexts"]),
                      "unassigned": len(structure["unassigned"]), "metrics": structure["metrics"]},
    })
    protected += [str(path.relative_to(ROOT)), structure_path]

spatial = read("game-photo-definitions/spatial/index.json")["definitions"]
packs = read("gamepacks/generated/game-essentials.json")
assets = []
for gid in ["sagrada", "lost-cities", "seven-wonders"]:
    board_path = f"public/game-art/real-boards/{gid}/board.json"
    spec_path = f"docs/research/game-specs-120/games/{gid}.json"
    board, spec = read(board_path), read(spec_path)
    pack = next(p for p in packs if p["runtime"]["source"]["gameId"] == gid)
    sd = next((d for d in spatial if d["gameId"] == gid), None)
    assets.append({"gameId": gid, "edition": spec["edition"],
                   "specLayoutRelations": len(spec["layout"]["relations"]),
                   "runtimeRequirements": pack["requirements"],
                   "runtimeRuleKinds": counted(r["kind"] for r in pack["runtime"]["rules"]),
                   "boardAreas": len(board["areas"]),
                   "tableModelKeys": list(board.get("tableModel", {})),
                   "tableZoneCount": len(board.get("tableZones", [])),
                   "spatial": None if sd is None else {"status": sd["status"], "gameInstruction": sd["prompt"]["gameInstruction"]}})
    protected += [board_path, spec_path, f"docs/pro-review-20261113/photos/{gid}.jpg"]

protected += [
    "shared/gameEssentials.ts", "shared/types.ts", "gamepacks/catalog.ts",
    "shared/lightweightRecognition.ts", "shared/spatialDefinition.ts", "shared/drawingProjection.ts",
    "shared/structureRelations.ts", "shared/estimatedBoardStructure.ts", "shared/estimatedGeometry.ts",
    "shared/genericRecord.ts", "shared/estimatedStructureOverride.ts", "shared/spatialObservation.ts",
    "src/GameEssentials.tsx", "src/GameBoardRecord.tsx", "src/EstimatedBoardView.tsx",
    "src/PhotoLayoutBoard.tsx", "src/realBoards.ts", "src/SessionWorkspace.tsx",
    "server/hostedObservation.ts", "server/spatialReading.ts", "server/scanObservation.ts",
    "server/observationFusion.ts", "server/analysisTask.ts", "server/engine.ts",
    "server/index.ts", "server/saveIntent.ts", "server/runtimeResume.ts", "server/sessionCodec.ts",
    "server/estimatedReferenceRebase.ts", "server/componentLinking.ts",
    "server/ai/geminiGameReader.ts", "server/ai/terraGameReader.ts", "server/ai/terraCompact.ts",
    "server/ai/spatialWire.ts", "server/ai/observationAssembly.ts", "server/ai/spatialAssembly.ts",
    "gamepacks/generated/game-essentials.json", "game-photo-definitions/index.json",
    "game-photo-definitions/spatial/index.json",
    "docs/astra-placement-recovery-20261113/photo-evaluation/source-basis.json",
    "docs/astra-placement-recovery-20261113/photo-evaluation/source-matches-v1.json",
    "docs/astra-placement-recovery-20261113/photo-evaluation/source-evidence-addendum.json",
    "docs/astra-placement-recovery-20261113/photo-evaluation/FINAL_V2_REPORT.md",
    "docs/astra-placement-recovery-20261113/final-v2/freeze.json",
]
summary = {
    "purpose": "Design evidence only; counts are not recognition accuracy or new test results.",
    "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "cases": cases, "assets": assets,
    "catalogMetadata": {"currentPacks": len(packs), "spatialDefinitions": len(spatial),
                        "spatialStatuses": counted(d["status"] for d in spatial)},
    "sourceMatchRows": len(read("docs/astra-placement-recovery-20261113/photo-evaluation/source-matches-v1.json")["rows"]),
}
manifest = {p: sha256((ROOT / p).read_bytes()).hexdigest() for p in sorted(set(protected))}
(OUT / "evidence-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
(OUT / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"cases": len(cases), "protectedFiles": len(manifest), "head": summary["head"]}))
