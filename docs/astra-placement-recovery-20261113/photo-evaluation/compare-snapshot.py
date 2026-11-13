#!/usr/bin/env python3
"""Compare automatic structure JSON with the frozen, bounded photo mapping.

This aggregates human-readable source judgments; it does not verify vision.
No product imports, provider calls, geometry repair, or source writes.
"""
import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def read(path):
    return json.loads(Path(path).read_text())


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def refkey(ref):
    return json.dumps(ref, sort_keys=True, separators=(",", ":"))


def identity(row):
    return row["assertion_id"], row["piece_id"]


def pidentity(row):
    return row["assertionId"], row["pieceId"]


def verdict(expected, actual, source_ok=True):
    if expected is None or not source_ok:
        return "deferred"
    if actual is None:
        return "unlinked"
    return "correct" if expected == actual else "wrong"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--structures", type=Path, default=ROOT / "docs/pro-implementation-20261113/supervisor/current-structures")
    parser.add_argument("--output", default="baseline-v1")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", args.output):
        raise SystemExit("--output must be a filename stem within photo-evaluation")
    mapping = read(HERE / "source-matches-v1.json")
    freeze = read(HERE / "source-freeze.json")
    addendum = read(HERE / "source-evidence-addendum.json")
    assert digest(HERE / "source-basis.json") == freeze["source_basis_sha256"] == mapping["source_basis_sha256"]
    assert digest(HERE / "source-matches-v1.json") == addendum["source_matches_sha256"]
    input_hashes = read(HERE / "baseline-inputs.json")
    for name, expected in input_hashes.items():
        assert digest(ROOT / name) == expected, f"Frozen baseline input changed: {name}"
    for photo in read(HERE / "source-basis.json")["photos"]:
        assert digest(ROOT / photo["path"]) == photo["sha256"]

    cases = defaultdict(list)
    for row in mapping["rows"]:
        cases[row["case_id"]].append(row)
    results, pair_results, order_results, summaries = [], [], [], {}
    snapshot_hashes = {}
    for cid, source_rows in cases.items():
        path = args.structures / (cid + ".json")
        structure = read(path)
        snapshot_hashes[str(path)] = digest(path)
        assert all(p.get("basis") != "manual" for p in structure["placements"]), f"Manual placement in {cid}"
        assert all(not c.get("hasManualFrame") for c in structure.get("boardContexts", [])), f"Manual frame in {cid}"
        placements = {pidentity(p): p for p in structure["placements"]}
        retained = {pidentity(p): p for p in structure.get("retained", [])}
        groups = {g["id"]: g for g in structure["groups"]}
        board_aliases = {refkey(a["anchorRef"]): a["physical_board_id"] for a in mapping["board_aliases"][cid]}
        piece_aliases = {a["anchorRef"]["pieceId"]: a["physical_board_id"] for a in mapping["board_aliases"][cid] if a["anchorRef"].get("pieceId")}
        side_votes = Counter()
        for row in source_rows:
            p = placements.get(identity(row), {})
            g = groups.get(p.get("groupId"), {})
            if row["photo_side"] and p.get("areaId") == "expeditions" and g.get("boardSide"):
                side_votes[g["boardSide"], row["photo_side"]] += 1
        # A/B have no fixed photographed polarity. Resolve one bijection per case.
        direct = side_votes["A", "near"] + side_votes["B", "far"]
        flipped = side_votes["A", "far"] + side_votes["B", "near"]
        side_map = {"A": "near", "B": "far"} if direct >= flipped else {"A": "far", "B": "near"}
        case_results = []
        for row in source_rows:
            p = placements.get(identity(row), {})
            g = groups.get(p.get("groupId"), {})
            native = retained.get(identity(row))
            ok = row["source_match"] in ("matched_single", "matched_group_only")
            cell, board, role, side, kind = None, None, None, None, "inferred"
            display_cell = [p["cell"]["row"], p["cell"]["column"]] if p.get("cell") else None
            if p.get("displayHypothesis") == "unanchored-grid":
                kind = "unanchored-display-only"
            ref = p.get("anchorRef") or g.get("anchorRef")
            if ref:
                board = board_aliases.get(refkey(ref))
            anchor_piece = p.get("anchorPieceId") or g.get("anchorPieceId")
            if board is None and anchor_piece:
                board = piece_aliases.get(anchor_piece)
            if p.get("areaId") in ("board", "wonder"):
                board = piece_aliases.get(row["piece_id"], board)
            if native:
                kind = "native-retained"
                slot = native["position"].get("anchorSlotId", "")
                match = re.search(r"-r(\d+)-c(\d+)$", slot)
                if match:
                    cell = [int(match[1]), int(match[2])]
                    display_cell = cell
                if native["position"].get("areaId", "").startswith("window"):
                    board = "sg-front"
            elif row["game"] == "sagrada" and p.get("areaId") == "window":
                if p.get("cell"):
                    cell = [p["cell"]["row"], p["cell"]["column"]]
                elif isinstance(p.get("slot"), int):
                    cell = [(p["slot"] - 1) // 5 + 1, (p["slot"] - 1) % 5 + 1]
            if p.get("areaId") in ("board", "expeditions", "discard"):
                role = "expedition" if p["areaId"] == "expeditions" else p["areaId"]
            if p.get("areaId") == "expeditions":
                side = g.get("side") or side_map.get(g.get("boardSide"))
            result = {
                **row,
                "output_kind": kind,
                "actual_area": p.get("areaId") or (native or {}).get("position", {}).get("areaId"),
                "actual_anchor_ref": ref,
                "actual_board": board,
                "actual_cell": cell,
                "actual_display_cell": display_cell,
                "actual_display_hypothesis": p.get("displayHypothesis") or g.get("displayHypothesis"),
                "actual_role": role,
                "actual_side_label": g.get("boardSide") or g.get("side"),
                "actual_side_normalized": side,
                "actual_group_id": p.get("groupId"),
                "actual_order": p.get("order"),
                "actual_order_level": p.get("orderLevel"),
                "actual_order_status": p.get("orderStatus"),
                "actual_slot_basis": "canonical" if native else p.get("slotBasis") or g.get("slotBasis"),
                "board_status": verdict(row["photo_board_id"], board, ok),
                "cell_status": verdict(row["photo_cell"], cell, ok),
                "display_cell_status": verdict(row["photo_cell"], display_cell, ok),
                "role_status": verdict(row["photo_role"], role, ok),
                "side_status": verdict(row["photo_side"], side, ok),
            }
            if row["game"] == "sagrada":
                result["placement_status"] = result["cell_status"]
            elif row["game"] == "seven-wonders":
                result["placement_status"] = result["board_status"]
            else:
                applicable = [result[k + "_status"] for k, target in [("board", row["photo_board_id"]), ("role", row["photo_role"]), ("side", row["photo_side"])] if target is not None]
                result["placement_status"] = "deferred" if not ok or not applicable else next((s for s in ["wrong", "unlinked", "deferred"] if s in applicable), "correct")
            case_results.append(result)
        results.extend(case_results)

        expeditions = [r for r in case_results if r["photo_role"] == "expedition"]
        adjacency = defaultdict(set)
        for p in structure["placements"]:
            for target in p.get("beforeRefs", []):
                adjacency[pidentity(p)].add(pidentity(target))

        def reachable(a, b):
            seen, todo = set(), [a]
            while todo:
                n = todo.pop()
                if n in seen:
                    continue
                seen.add(n)
                for target in adjacency[n]:
                    if target == b:
                        return True
                    todo.append(target)
            return False

        case_pairs, case_orders = [], []
        for a, b in combinations(expeditions, 2):
            same_source = a["photo_line_id"] == b["photo_line_id"]
            connected = all(r["actual_area"] == "expeditions" and r["board_status"] == "correct" for r in [a, b])
            same_output = a["actual_group_id"] == b["actual_group_id"]
            if same_source or (connected and same_output):
                status = "unlinked" if not connected else "correct" if same_source == same_output else "wrong"
                case_pairs.append({"case_id": cid, "a": a["piece_id"], "b": b["piece_id"], "source_line_a": a["photo_line_id"], "source_line_b": b["photo_line_id"], "same_source_run": same_source, "same_output_group": same_output, "status": status})
            if same_source and all(r["source_match"] == "matched_single" and r["photo_order_from_board"] is not None for r in [a, b]):
                if a["photo_order_from_board"] > b["photo_order_from_board"]:
                    a, b = b, a
                forward, reverse = reachable(identity(a), identity(b)), reachable(identity(b), identity(a))
                status = "cycle" if forward and reverse else "forward_source_convention" if forward else "reverse_source_convention" if reverse else "unresolved"
                case_orders.append({"case_id": cid, "inner": a["piece_id"], "outer": b["piece_id"], "physical_run": a["photo_line_id"], "status": status})
        pair_results.extend(case_pairs)
        order_results.extend(case_orders)
        summaries[cid] = {
            "scoped_observation_rows": len(case_results),
            "source_match_counts": dict(Counter(r["source_match"] for r in case_results)),
            "placement_counts": dict(Counter(r["placement_status"] for r in case_results)),
            "dimensions": {d: dict(Counter(r[d + "_status"] for r in case_results if r["photo_" + expected] is not None)) for d, expected in [("board", "board_id"), ("cell", "cell"), ("role", "role"), ("side", "side")]},
            "native_vs_inferred": dict(Counter(r["output_kind"] for r in case_results)),
            "display_cell_counts": dict(Counter(r["display_cell_status"] for r in case_results if r["photo_cell"] is not None)),
            "side_bijection": side_map if expeditions else None,
            "side_bijection_votes": {str(k): v for k, v in side_votes.items()},
            "same_run_pairs_and_conflicting_merges": dict(Counter(p["status"] for p in case_pairs)),
            "source_order_relation_coverage": dict(Counter(p["status"] for p in case_orders)),
            "product_connection_count_unscored": structure["metrics"],
            "manual_placements": 0,
            "manual_frames": 0,
        }
    report = {
        "version": "bounded-photo-comparison-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_basis_sha256": digest(HERE / "source-basis.json"),
        "source_matches_sha256": digest(HERE / "source-matches-v1.json"),
        "source_addendum_sha256": digest(HERE / "source-evidence-addendum.json"),
        "script_sha256": digest(__file__),
        "snapshot_sha256": snapshot_hashes,
        "limitations": ["Observation-row counts are not distinct physical-object counts or whole-photo accuracy.", "LC compound placement counts board, role and side; line pairs and source order are separate.", "Unknown/invalid source geometry is deferred, never silently rescaled.", "Order direction is reported under the source board-outward convention; absent relations/display-only order is unresolved. A reversed display alone is not promoted to a physical-order defect.", "No manual result is credited as automatic. No new product execution or provider call."],
        "cases": summaries,
    }
    (HERE / (args.output + ".json")).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    (HERE / (args.output + "-rows.json")).write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    (HERE / (args.output + "-relations.json")).write_text(json.dumps({"same_run_pairs": pair_results, "source_order_relations": order_results}, ensure_ascii=False, indent=2) + "\n")
    fields = ["case_id", "photo_sha256", "observation_index", "assertion_id", "piece_id", "source_match", "photo_unit_id", "photo_board_id", "photo_cell", "photo_role", "photo_side", "photo_line_id", "output_kind", "actual_area", "actual_board", "actual_cell", "actual_display_cell", "actual_display_hypothesis", "actual_role", "actual_side_label", "actual_side_normalized", "board_status", "cell_status", "display_cell_status", "role_status", "side_status", "placement_status", "evidence", "note"]
    with (HERE / (args.output + ".csv")).open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(json.dumps({cid: {"placement": v["placement_counts"], "source": v["source_match_counts"], "line_pairs": v["same_run_pairs_and_conflicting_merges"], "order": v["source_order_relation_coverage"]} for cid, v in summaries.items()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
