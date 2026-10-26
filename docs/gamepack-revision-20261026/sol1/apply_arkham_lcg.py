"""Fill an evidenced card-zone gap in Arkham LCG; retain older pinned packs."""

from apply_scoped_revisions import SPEC, PROFILES, add_scene, digest, save
import json
from pathlib import Path

game_id = "arkham-lcg"
sp, pp = SPEC / f"{game_id}.json", PROFILES / f"{game_id}.json"
before = {"spec": digest(sp), "profile": digest(pp)}
s, p = json.loads(sp.read_text()), json.loads(pp.read_text())
s["sources"].extend([
    {"id": "arkham-lcg.current-rulebook", "title": "Arkham Horror: The Card Game current core rulebook",
     "url": "https://images-cdn.fantasyflightgames.com/filer_public/0e/d0/0ed09507-1705-47ed-a630-cd15885cabb0/ahc100_rulebook-web.pdf",
     "kind": "official-rules", "access": "search-index", "checked_at": "2026-10-26",
     "note": "Types of Actions > Play: an asset from hand is placed in the investigator's play area; an event goes to discard. Indexed text checked; entire 11 MB PDF not opened."},
    {"id": "arkham-lcg.current-reference", "title": "Arkham Grimoire current rules reference",
     "url": "https://images-cdn.fantasyflightgames.com/filer_public/76/b3/76b332d5-7047-458f-91b6-82c8500cc445/arkham_grimoire.pdf",
     "kind": "official-rules", "access": "search-index", "checked_at": "2026-10-26",
     "note": "Discard Piles: each investigator has an open-information face-up discard pile; its card order must not be altered except by an effect. Indexed section checked; whole reference not verified."},
])
play = next(a for a in s["layout"]["areas"] if a["id"] == "play")
play["component_ids"].append("decks")
play["source_refs"].append("arkham-lcg.current-rulebook")
field = next(f for f in s["state_fields"] if f["id"] == "play.scene")
field["component_ids"].append("decks")
field["source_refs"].append("arkham-lcg.current-rulebook")
target = next(t for t in s["recognition_correction"]["correction_targets"] if t["id"] == "play.edit")
target["component_ids"].append("decks")
pa = next(a for a in p["areas"] if a["id"] == "play")
pa["component_ids"].append("decks")
pa["allowed_component_ids"].append("decks")
add_scene(s, p, area_id="discard", area_name="각 조사자의 공개 버림더미",
          scope="player", visibility="public", component_ids=["decks"],
          anchor="각 조사자의 공개 버림더미를 개인별로, 위아래 순서와 카드 앞면을 보존한다. 비공개 뽑기덱과 혼합하지 않는다.",
          source="arkham-lcg.current-reference", partition="player_public")
p["basis"]["official_scoped_checks_this_task"] = [
    {"source": "arkham-lcg.current-rulebook", "section": "Types of Actions > Play",
     "scope": "asset in public investigator play area versus owner hand and event discard"},
    {"source": "arkham-lcg.current-reference", "section": "Discard Piles",
     "scope": "face-up open-information player discard, order retained"},
]
p["basis"]["source_revision_pending_runtime_regeneration"] = True
p["pinned_source"]["runtime_match"] = False
s["gaps"].append("새 공개 play/discard 필드는 앞으로 기록할 카드 영역이다. 이전 pinned pack의 hidden.scene에 섞인 버림 카드를 자동 공개·이동하지 않는다.")
save(sp, s)
save(pp, p)
report = {"gameId": game_id, "before": before,
          "after": {"spec": digest(sp), "profile": digest(pp)}}
(Path(__file__).parent / "arkham-lcg-change.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report))
