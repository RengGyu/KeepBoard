"""One sourced split in the new spec; pinned older packs stay untouched."""

from apply_scoped_revisions import SPEC, PROFILES, add_scene, digest, save
import json
from pathlib import Path

game_id = "pandemic-legacy-1"
sp, pp = SPEC / f"{game_id}.json", PROFILES / f"{game_id}.json"
before = {"spec": digest(sp), "profile": digest(pp)}
s, p = json.loads(sp.read_text()), json.loads(pp.read_text())
s["sources"].append({
    "id": "pandemic-legacy-1.product-current",
    "title": "Pandemic Legacy Season 1, Z-Man Games product/components",
    "url": "https://www.zmangames.com/game/pandemic-legacy-season-1/",
    "kind": "official-product",
    "access": "opened",
    "checked_at": "2026-10-26",
    "note": "Component listing distinguishes character cards from player cards and sealed campaign material. This does not verify full campaign rules or unrevealed contents.",
})
players = next(a for a in s["layout"]["areas"] if a["id"] == "players")
players["name"] = "이번 게임의 개인 손패"
players["component_ids"] = ["cards"]
players["anchor_contract"] = "이번 게임의 플레이어 카드 손패만 소유자 범위로 기록한다. 인물의 공개 앞면 기록과 섞지 않는다."
field = next(f for f in s["state_fields"] if f["id"] == "players.scene")
field.update(label=players["name"], component_ids=["cards"], description=players["anchor_contract"])
target = next(t for t in s["recognition_correction"]["correction_targets"] if t["id"] == "players.edit")
target.update(component_ids=["cards"], anchor_strategy=players["anchor_contract"])
pa = next(a for a in p["areas"] if a["id"] == "players")
pa.update(name=players["name"], component_ids=["cards"], allowed_component_ids=["cards"], anchor_contract=players["anchor_contract"])
pa["display_resume"]["source_anchor"] = players["anchor_contract"]
add_scene(s, p, area_id="character-card", area_name="공개된 인물 카드·기록",
          scope="player", visibility="public", component_ids=["record"],
          anchor="각 플레이어가 실제로 공개한 인물 카드/시트 앞면과 영구 변경만 기록한다. 봉인되거나 가려진 내용은 공개값으로 채우지 않는다.",
          source="pandemic-legacy-1.product-current", partition="player_public")
p["basis"]["official_scoped_checks_this_task"] = [{
    "source": "pandemic-legacy-1.product-current", "section": "official product Components",
    "scope": "character cards, player cards and sealed content are distinct physical categories; public front vs owner hand is a scoped recording proposal, not a verified campaign rule",
}]
p["basis"]["source_revision_pending_runtime_regeneration"] = True
p["pinned_source"]["runtime_match"] = False
s["gaps"].append("신규 character-card.scene은 공개된 앞면만 기록한다. 기존 저장본의 players.scene에 혼재된 인물 기록을 자동 이동/공개하지 않는다. 기존 팩 핀 보존과 수동 확인이 필요하다.")
save(sp, s)
save(pp, p)
report = {"gameId": game_id, "before": before,
          "after": {"spec": digest(sp), "profile": digest(pp)}}
(Path(__file__).parent / "pandemic-legacy-change.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report))
