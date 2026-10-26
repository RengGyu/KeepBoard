#!/usr/bin/env python3
"""Build a private, standalone review of the frozen Catan nine-photo run."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "docs/game-vision-nine-20261026/data/index.json"
RESULTS = ROOT / "docs/game-vision-nine-20261026/results/results.json"
PRIVATE_BATCH = Path("/private/tmp/keepboard-game-vision-nine-20261026-v1")
DEFAULT_OUTPUT = Path.home() / ".local/share/keepboard-reviews/catan-nine-20261026/index.html"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict | list:
    return json.loads(path.read_text())


def value(kind: str, attributes: dict) -> str | int | None:
    if kind == "terrain":
        return attributes.get("terrain", attributes.get("terrainType"))
    if kind == "number-token":
        return attributes.get("number")
    return "robber" if kind == "robber" else None


def load_data() -> dict:
    index, summary = read_json(INDEX), read_json(RESULTS)
    assert sha(INDEX) == summary["indexSHA256"]
    assert len(index["images"]) == len(summary["perPhoto"]) == 9
    photos = []
    all_gt = all_output = errors = occluded = 0
    for source, score in zip(index["images"], summary["perPhoto"], strict=True):
        photo_id = source["id"]
        assert source["order"] == score["order"] == int(photo_id)
        image_path = Path(source["image"]["path"])
        gt_path = Path(source["groundTruth"]["path"])
        assert sha(image_path) == source["image"]["sha256"] == score["sourceSHA256"]
        assert sha(gt_path) == source["groundTruth"]["sha256"] == score["GTSHA256"]
        gt = read_json(gt_path)
        evaluation = read_json(PRIVATE_BATCH / f"photo-{photo_id}.evaluation.json")
        observations = read_json(PRIVATE_BATCH / f"photo-{photo_id}.observations.json")
        assert len(evaluation["matches"]) == len(gt["objects"]) == 38
        assert len(observations) == score["observations"]
        by_ref = {item["ref"]: item for item in observations}
        by_target = {item["targetId"]: item for item in evaluation["matches"]}
        assert len(by_ref) == len(observations) and len(by_target) == len(gt["objects"])
        items = []
        for target in gt["objects"]:
            match = by_target[target["id"]]
            observation = by_ref.get(match.get("observationRef"))
            status = (
                "occluded" if target["componentId"] == "number-token"
                and target["attributes"]["number"] is None
                else "error" if match["status"] == "wrong"
                else "unmatched" if observation is None and target["componentId"] != "robber"
                else "correct"
            )
            if status == "error":
                errors += 1
            if status == "occluded":
                occluded += 1
            items.append({
                "id": target["id"],
                "kind": target["componentId"],
                "targetBox": target["bboxPx"],
                "targetValue": value(target["componentId"], target["attributes"]),
                "valueScorable": target["valueScorable"],
                "readability": target["readability"],
                "modelRef": observation["ref"] if observation else None,
                "modelKind": observation["kind"] if observation else None,
                "modelBox": observation["bbox"] if observation else None,
                "modelValue": value(observation["kind"], observation["attributes"]) if observation else None,
                "status": status,
                "iou": round(match["iou"], 3) if match.get("iou") is not None else None,
                "centerErrorPx": round(match["centerErrorPx"], 1) if match.get("centerErrorPx") is not None else None,
            })
        all_gt += len(items)
        all_output += len(observations)
        photos.append({
            "id": photo_id,
            "sha": source["image"]["sha256"],
            "width": source["image"]["width"],
            "height": source["image"]["height"],
            "image": "data:image/jpeg;base64," + base64.b64encode(image_path.read_bytes()).decode("ascii"),
            "items": items,
            "modelBoxes": [{"ref": o["ref"], "kind": o["kind"], "box": o["bbox"]} for o in observations],
            "scores": score["perKind"],
            "wallSeconds": round(score["wallMs"] / 1000, 1),
        })
    assert (all_gt, all_output, errors, occluded) == (342, 340, 6, 2)
    return {
        "reportId": "catan-nine-20261026",
        "indexSHA": summary["indexSHA256"],
        "resultsSHA": sha(RESULTS),
        "photos": photos,
        "summary": {"targets": all_gt, "outputs": all_output, "errors": errors, "occluded": occluded,
                    "locationMatched": summary["locationMatched"],
                    "terrainValueCorrect": summary["aggregate"]["terrain"]["valueCorrect"],
                    "terrainValueTotal": summary["aggregate"]["terrain"]["valueDenominator"],
                    "numberValueCorrect": summary["aggregate"]["number-token"]["valueCorrect"],
                    "numberValueTotal": summary["aggregate"]["number-token"]["valueDenominator"],
                    "robberLocated": summary["aggregate"]["robber"]["locationMatched"],
                    "robberTotal": summary["aggregate"]["robber"]["locationDenominator"]},
    }


def build(output: Path) -> dict:
    data = load_data()
    template = (Path(__file__).with_name("review_template.html")).read_text()
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    html = template.replace("__PAYLOAD__", payload)
    assert "__PAYLOAD__" not in html and html.count("data:image/jpeg;base64,") == 9
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if output.parent == DEFAULT_OUTPUT.parent:
        os.chmod(output.parent, 0o700)
    fd = os.open(output, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(html)
    os.chmod(output, 0o600)
    return {"path": str(output), "bytes": output.stat().st_size, "sha256": sha(output),
            "photos": 9, "targets": 342, "modelOutputs": 340, "errors": 6, "occluded": 2}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    print(json.dumps(build(parser.parse_args().output), ensure_ascii=False))
