"""Record the 56 owned source/profile decisions without generating product packs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).parent
WORKLIST = ROOT / "docs/gamepack-revision-20261026/sol1-worklist.json"
PROFILE_DIR = ROOT / "docs/vision-research-astra/games"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


SCOPED = {
    "a-feast-for-odin": ("직업 손패와 사용한 직업의 개인 공개 영역을 분리", "official rulebook pp. 3, 20"),
    "arkham-lcg": ("공개 플레이 중인 자산 카드를 연결하고, 개인의 공개 버림더미를 비공개 덱과 분리", "current core rulebook Types of Actions > Play; Arkham Grimoire Discard Piles (indexed sections; full PDFs not verified)"),
    "concordia": ("미사용 성격 카드 손패와 사용 더미를 분리; 더미 맨 위만 공개", "official rules p. 1 Game flow / Tribune"),
    "dixit": ("개인 손패, 섞인 비공개 제출 묶음, 공개 그림판을 분리", "publisher How to play / Rules"),
    "grand-austria-hotel": ("손님과 직원 카드 종류, 미고용 손패와 고용 직원 공개판을 분리", "official English rules pp. 2, 10–13 (2015 edition)"),
    "pandemic-legacy-1": ("새 팩에서 개인 카드 손패와 공개된 캐릭터 카드·기록을 분리; 기존 팩 자료는 자동 이동하지 않음", "official Season 1 product Components; privacy model remains scoped proposal"),
    "splendor": ("중앙의 색별 칩 공급과 각 플레이어의 보유 칩을 분리", "official English rules Setup / Actions / Purchased Cards"),
}


def category(area: dict) -> str:
    scope, visibility = area["scope"], area["visibility"]
    if scope == "public" and visibility == "public":
        return "commonPublic"
    if scope == "player" and visibility == "public":
        return "playerPublic"
    if scope == "player" and visibility == "owner":
        return "ownerPrivate"
    if scope == "player" and visibility == "own-hidden":
        return "ownHidden"
    if visibility == "role-limited":
        return "roleLimited"
    if visibility == "hidden":
        return "physicalHidden"
    return "other"


def main() -> None:
    work = json.loads(WORKLIST.read_text())
    assert len(work) == 56 and len({w["gameId"] for w in work}) == 56
    rows = []
    errors = []
    all_categories = ("commonPublic", "playerPublic", "ownerPrivate", "ownHidden", "roleLimited", "physicalHidden")
    for w in work:
        game_id = w["gameId"]
        sp = ROOT / w["specPath"]
        pp = PROFILE_DIR / f"{game_id}.json"
        s, p = json.loads(sp.read_text()), json.loads(pp.read_text())
        assert s["game_id"] == game_id and p["game_id"] == game_id
        areas, fields = s["layout"]["areas"], s["state_fields"]
        area_ids = {a["id"] for a in areas}
        field_ids = {f["id"] for f in fields}
        component_ids = {c["id"] for c in s["components"]}
        source_ids = {x["id"] for x in s["sources"]}
        profile_areas = {a["id"]: a for a in p["areas"]}
        for a in areas:
            if a["id"] not in profile_areas:
                errors.append(f"{game_id}: profile lacks {a['id']}")
            if set(a["component_ids"]) - component_ids:
                errors.append(f"{game_id}: unknown component in area {a['id']}")
            if set(a["source_refs"]) - source_ids:
                errors.append(f"{game_id}: unknown source in area {a['id']}")
            if a["id"] in profile_areas and set(profile_areas[a["id"]]["component_ids"]) != set(a["component_ids"]):
                errors.append(f"{game_id}: profile component drift {a['id']}")
        for f in fields:
            if set(f.get("area_ids", [])) - area_ids:
                errors.append(f"{game_id}: unknown area in field {f['id']}")
            if set(f.get("component_ids", [])) - component_ids:
                errors.append(f"{game_id}: unknown component in field {f['id']}")
            if set(f.get("source_refs", [])) - source_ids:
                errors.append(f"{game_id}: unknown source in field {f['id']}")
        for t in s["recognition_correction"]["correction_targets"]:
            if set(t["field_ids"]) - field_ids or set(t["area_ids"]) - area_ids:
                errors.append(f"{game_id}: correction target drift {t['id']}")
        cats = {key: [a["id"] for a in areas if category(a) == key] for key in all_categories}
        primary = w["primarySources"][0]
        changed = game_id in SCOPED
        row = {
            "gameId": game_id,
            "fullRulesTaskStatus": "PARTIAL",
            "scopedImplementationStatus": "SOURCE_CORRECTION_DONE" if changed else "NO_SOURCE_EDIT_YET",
            "editionId": w["edition"]["id"],
            "spec": {"path": w["specPath"], "sha256": sha(sp)},
            "profile": {"path": str(pp.relative_to(ROOT)), "sha256": sha(pp)},
            "source": {"id": primary["id"], "url": primary["url"], "inheritedAccess": primary["access"],
                       "inheritedScopedFact": primary["note"]},
            "sourceReviewThisTask": (
                {"status": "scoped-primary-check", "location": SCOPED[game_id][1], "fullRulebookVerified": False}
                if changed else
                {"status": "inherited-official-excerpt-plus-current-spec-inspection",
                 "location": "No new exact page/section independently recorded; inherited note is not full rule verification",
                 "fullRulebookVerified": False}
            ),
            "areaCategories": cats,
            "notApplicableInCurrentEvidence": [key for key in all_categories if not cats[key]],
            "areaComponentRelations": [
                {"areaId": a["id"], "scope": a["scope"], "visibility": a["visibility"],
                 "componentIds": a["component_ids"],
                 "fieldIds": [f["id"] for f in fields if a["id"] in f.get("area_ids", [])]}
                for a in areas
            ],
            "decision": (SCOPED[game_id][0] if changed else
                         "현재 영역의 게임별 구성물/공개·개인·숨김 분리를 유지; 이 작업에서 근거가 충분한 추가 필드 누락은 확정되지 않음"),
            "decisionKind": "source-and-profile-changed" if changed else "retained-after-inspection",
            "unsupported": s["gaps"][:3],
            "savedRecordCaveat": (
                "새 source 버전 적용 전에 pinned older pack은 불변으로 유지; 과거 owner 자료를 자동 공개/이동하지 않는다"
                if game_id == "pandemic-legacy-1" else None),
        }
        rows.append(row)
    assert not errors, "\n".join(errors)
    out = {"version": "sol1-gamepack-rules-review-v1", "worklistSHA256": sha(WORKLIST),
           "inventoryInspectedCount": len(rows), "fullRulesCompletedIds": [],
           "partialIds": [row["gameId"] for row in rows], "notStartedIds": [],
           "scopedCorrectionDoneIds": sorted(SCOPED),
           "scopedPrimaryCorrections": len(SCOPED),
           "inheritedExcerptLimitCount": len(rows) - len(SCOPED),
           "fullOfficialRulebookVerifiedCount": 0,
           "crossReferenceErrors": errors, "games": rows}
    (OUT / "review.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"reviewed": len(rows), "changed": len(SCOPED),
                      "crossReferenceErrors": len(errors), "sha256": sha(OUT / "review.json")}))


if __name__ == "__main__":
    main()
