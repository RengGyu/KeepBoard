"""Apply individually evidenced Sol1 spec/profile corrections; no pack generation."""

from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = ROOT / "docs/research/game-specs-120/games"
PROFILES = ROOT / "docs/vision-research-astra/games"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def add_scene(spec: dict, profile: dict, *, area_id: str, area_name: str,
              scope: str, visibility: str, component_ids: list[str],
              anchor: str, source: str, partition: str,
              photographable: bool = True) -> None:
    field_id = area_id + ".scene"
    assert area_id not in {a["id"] for a in spec["layout"]["areas"]}
    assert field_id not in {f["id"] for f in spec["state_fields"]}
    area = {
        "id": area_id, "name": area_name, "scope": scope,
        "visibility": visibility, "topology": "zone", "dynamic": True,
        "fixed_slot_count": None, "slot_kinds": ["zone"],
        "component_ids": component_ids, "anchor_contract": anchor,
        "description": anchor + " 보이지 않는 정체·수량은 미확인으로 둔다.",
        "source_refs": [source], "confidence": "recommendation",
    }
    field = {
        "id": field_id, "label": area_name, "scope": scope,
        "visibility": visibility, "type": "component-scene",
        "lifetime": "session", "acquisition": (["photo", "manual", "physical"] if photographable else ["manual", "physical"]),
        "description": anchor + " 실물 인스턴스 ID·앞뒷면·그룹/순서·소유자·사진 근거를 별개로 보존한다. 가린 정체는 추정하지 않는다.",
        "component_ids": component_ids, "area_ids": [area_id],
        "rule_ids": [], "source_refs": [source], "confidence": "recommendation",
    }
    spec["layout"]["areas"].append(area)
    spec["state_fields"].append(field)
    spec["custom_setup"]["editable_area_ids"].append(area_id)
    if photographable:
        spec["recognition_correction"]["photographable_field_ids"].append(field_id)
    template = next(t for t in spec["recognition_correction"]["correction_targets"]
                    if t["scope"] == scope)
    target = copy.deepcopy(template)
    target.update(id=area_id + ".edit", component_ids=component_ids,
                  field_ids=[field_id], area_ids=[area_id], anchor_strategy=anchor)
    spec["recognition_correction"]["correction_targets"].append(target)
    compatible = next((p for p in spec["resume"]["preserve_procedures"]
                       if p["scope"] == scope and p["visibility"] == visibility
                       and p["id"].startswith("essentials.public-layout")), None)
    if compatible:
        compatible["field_ids"].append(field_id)
    else:
        base = copy.deepcopy(spec["resume"]["preserve_procedures"][0])
        base.update(id=area_id + ".preserve", label=area_name + " 실물 묶음 보존(선택)",
                    scope=scope, visibility=visibility, field_ids=[field_id],
                    method="sealed-bundle" if visibility != "public" else "manual-note",
                    order_sensitive=False, after=[], source_refs=[source],
                    confidence="recommendation")
        base.pop("visible_to_roles", None)
        base["steps"] = [anchor, "보이지 않는 면을 열지 않고 구역·소유자·묶음 방향을 남긴다."]
        spec["resume"]["preserve_procedures"].append(base)
    profile["partitions"][partition].append(area_id)
    profile_area = copy.deepcopy(profile["areas"][0])
    profile_area.update(area, partition=partition,
        capture_allowed_current=False,
        current_ai_destination_fields=[], current_manual_target_fields=[],
        source_field_ids=[field_id], allowed_component_ids=component_ids,
        capture_instruction=anchor + " 새 판본·팩 생성 전에는 현재 앱 대상 필드가 아니다.",
        capture_access=("owner evidence only" if partition == "owner_private" else "public evidence; explicit owner binding for player areas"),
        official_rule_status="SCOPED_SOURCE_REVIEW; pending regenerated runtime pack")
    profile_area["display_resume"] = {
        "source_anchor": anchor, "source_relations": [],
        "opening_policy": "retain-saved-turn",
        "restore": "accepted values and original photo retained; unknown remains unknown",
        "render_basis": "manual record surface until regenerated runtime pack",
    }
    profile["areas"].append(profile_area)


def apply(game_id: str, revision) -> dict:
    path, profile_path = SPEC / (game_id + ".json"), PROFILES / (game_id + ".json")
    before = {"spec": digest(path), "profile": digest(profile_path)}
    spec, profile = json.loads(path.read_text()), json.loads(profile_path.read_text())
    revision(spec, profile)
    profile["basis"]["official_scoped_checks_this_task"] = [
        {"source": x["id"], "section": x["section"], "scope": x["scope"]}
        for x in EVIDENCE[game_id]
    ]
    profile["basis"]["source_revision_pending_runtime_regeneration"] = True
    profile["pinned_source"]["runtime_match"] = False
    save(path, spec)
    save(profile_path, profile)
    return {"gameId": game_id, "before": before,
            "after": {"spec": digest(path), "profile": digest(profile_path)}}


EVIDENCE = {
    "a-feast-for-odin": [{"id": "a-feast-for-odin.primary", "section": "official rulebook pp.3, 20; components and Occupation", "scope": "hidden hand vs played occupation"}],
    "concordia": [{"id": "concordia.art-confirmation.concordia-web", "section": "official rules p.1 Game flow / Tribune", "scope": "unplayed hand vs personal played pile"}],
    "grand-austria-hotel": [{"id": "grand-austria-hotel.rules-2015", "section": "official rulebook pp.2, 10-13 Components / Staff cards", "scope": "guest/staff card kinds; staff hand vs hired face-up cards"}],
    "dixit": [{"id": "dixit.primary", "section": "publisher How to play / Rules; card choice, shuffled submission, reveal", "scope": "owner hand vs hidden submitted card vs public reveal"}],
    "splendor": [{"id": "splendor.rules-current", "section": "publisher rulebook Setup / Actions / Purchased cards", "scope": "central six-color token supply vs each player's held tokens and purchased cards"}],
}


def odin(s: dict, p: dict) -> None:
    s["sources"][0]["access"] = "opened"
    s["sources"][0]["note"] += " 2026-10-26 로컬 공식 PDF pp.3,20 확인: 손패의 비공개 직업과 사용한 직업 구별. 전체 규칙 검증 아님."
    hand = next(a for a in s["layout"]["areas"] if a["id"] == "hand")
    hand["anchor_contract"] = "아직 사용하지 않은 비공개 직업 카드만; 사용한 직업은 별도 개인 공개 영역."
    next(f for f in s["state_fields"] if f["id"] == "hand.scene")["description"] = hand["anchor_contract"]
    add_scene(s, p, area_id="played-occupations", area_name="사용한 직업 카드",
              scope="player", visibility="public", component_ids=["cards"],
              anchor="사용한 직업 카드를 개인별로 펼친 상태·인스턴스로 보존하고 손패와 혼합하지 않는다.",
              source="a-feast-for-odin.primary", partition="player_public")


def concordia(s: dict, p: dict) -> None:
    hand = next(a for a in s["layout"]["areas"] if a["id"] == "hand")
    hand["anchor_contract"] = "아직 사용하지 않은 성격 카드만; 사용 카드는 별도 개인 더미."
    next(f for f in s["state_fields"] if f["id"] == "hand.scene")["description"] = hand["anchor_contract"]
    add_scene(s, p, area_id="played-personality", area_name="사용한 성격 카드 더미",
              scope="player", visibility="public", component_ids=["cards"],
              anchor="개인 사용 더미의 맨 위 카드만 공개 정체로 기록한다. 아래 카드의 순서는 실물로 보존하며 사진에서 정체를 채우지 않는다.",
              source="concordia.art-confirmation.concordia-web", partition="player_public")


def grand_austria(s: dict, p: dict) -> None:
    s["sources"].append({"id": "grand-austria-hotel.rules-2015",
        "title": "Grand Austria Hotel official English rulebook", "url": "https://www.lookout-spiele.de/wp-content/uploads/GAH_rules_EN_web.pdf",
        "kind": "official-rules", "access": "opened", "checked_at": "2026-10-26",
        "note": "pp.2,10-13: guest and staff are distinct cards; staff cards are held then played/hired face-up and may be rotated for once-per-round use. 2015 rules; 2022 retail differences remain unverified."})
    guests = next(c for c in s["components"] if c["id"] == "guests")
    guests["name"] = "손님 카드"
    guests["description"] = "카페의 손님 주문·충족/투숙. 직원 카드와 별개 물리 카드 종류."
    staff = copy.deepcopy(guests)
    staff.update(id="staff-cards", name="직원 카드", description="손패의 미고용 직원과 고용 후 공개한 직원, 사용 방향을 별개로 보존.",
                 source_refs=["grand-austria-hotel.rules-2015"], confidence="reported")
    s["components"].append(staff)
    old = next(a for a in s["layout"]["areas"] if a["id"] == "staff")
    old["name"] = "미고용 직원 손패"
    old["component_ids"] = ["staff-cards"]
    old["anchor_contract"] = "미고용 직원 손패만 소유자 범위로 보존."
    oldfield = next(f for f in s["state_fields"] if f["id"] == "staff.scene")
    oldfield["label"] = old["name"]
    oldfield["component_ids"] = ["staff-cards"]
    oldfield["description"] = old["anchor_contract"]
    next(t for t in s["recognition_correction"]["correction_targets"] if t["id"] == "staff.edit")["component_ids"] = ["staff-cards"]
    s["custom_setup"]["editable_component_ids"].append("staff-cards")
    pstaff = next(a for a in p["areas"] if a["id"] == "staff")
    pstaff.update(name=old["name"], component_ids=["staff-cards"], allowed_component_ids=["staff-cards"], anchor_contract=old["anchor_contract"])
    pstaff["display_resume"]["source_anchor"] = old["anchor_contract"]
    pc = next(c for c in p["components"] if c["component_id"] == "guests")
    pc["name"] = "손님 카드"
    new_pc = copy.deepcopy(pc)
    new_pc.update(component_id="staff-cards", name="직원 카드", identity_description=staff["description"],
                  spec_source_refs=["grand-austria-hotel::grand-austria-hotel.rules-2015"])
    new_pc["current_typed_fields"] = [
        copy.deepcopy(next(f for f in pc["current_typed_fields"] if f["id"] == field_id))
        for field_id in ("face", "printedName")
    ]
    new_pc["current_typed_fields"][1]["sourceText"] = (
        "공식 규칙 pp. 2, 10–13의 직원 카드: 인쇄된 이름은 앞면이 보일 때만 읽는다."
    )
    new_pc["current_typed_fields"].append({
        "id": "useOrientation", "type": "text", "label": "사용 방향",
        "acquisition": "manual",
        "sourceText": "공식 규칙 pp. 10–13: 고용한 직원의 라운드 중 사용 여부는 카드 방향으로 보존한다. 사진만으로 과거 사용 내역을 추정하지 않는다.",
    })
    new_pc["must_preserve_readout_keys"] = ["face", "printedName", "useOrientation"]
    new_pc["visible_attribute_keys"] = ["face", "printedName"]
    new_pc["manual_attribute_keys"] = ["useOrientation"]
    p["components"].append(new_pc)
    add_scene(s, p, area_id="hired-staff", area_name="고용한 직원 카드",
              scope="player", visibility="public", component_ids=["staff-cards"],
              anchor="고용한 직원 카드는 개인 앞 공개 영역에 보존하고 사용/미사용 방향을 기록한다. 미고용 손패와 섞지 않는다.",
              source="grand-austria-hotel.rules-2015", partition="player_public")


def dixit(s: dict, p: dict) -> None:
    s["sources"][0]["access"] = "opened"
    s["sources"][0]["note"] += " 2026-10-26 공식 How to play: 각자 손패에서 카드 선택→함께 섞음→공개와 투표. 제출 중 정체는 공개하지 않음."
    hand = next(a for a in s["layout"]["areas"] if a["id"] == "hand")
    hand["anchor_contract"] = "아직 제출하지 않은 개인 손패만; 제출 묶음과 공개된 그림판은 각각 별도 영역."
    next(f for f in s["state_fields"] if f["id"] == "hand.scene")["description"] = hand["anchor_contract"]
    add_scene(s, p, area_id="submissions", area_name="공개 전 제출 카드 묶음",
              scope="shared-secret", visibility="hidden", component_ids=["cards"],
              anchor="섞은 제출 카드의 뒷면 묶음과 원래 제출자 연결을 강제로 만들지 않는다. 공개 전 정체는 비공개로 보존한다.",
              source="dixit.primary", partition="do_not_infer", photographable=False)


def splendor(s: dict, p: dict) -> None:
    s["sources"].append({"id": "splendor.rules-current",
        "title": "Splendor English rules, official Asmodee CDN", "url": "https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2022/01/SCSPL01EN_SPLENDOR_RULES_LIGHT.pdf",
        "kind": "official-rules", "access": "opened", "checked_at": "2026-10-26",
        "note": "Setup: six distinct central gem/gold stacks; Actions: taken/spent tokens move between central supply and player holdings, purchased development is public. Printed reprint may differ from chosen refresh art; exact token inventory not pinned."})
    add_scene(s, p, area_id="chip-supply", area_name="공용 보석·금 공급",
              scope="public", visibility="public", component_ids=["chips"],
              anchor="중앙의 색별 보석·금 토큰 공급을 플레이어 보유 토큰과 분리한다. 사진에 보이는 실물 수량만 기록하고 규칙상 총량으로 보충하지 않는다.",
              source="splendor.rules-current", partition="common_public")


if __name__ == "__main__":
    changes = [apply(g, fn) for g, fn in [
        ("a-feast-for-odin", odin), ("concordia", concordia),
        ("grand-austria-hotel", grand_austria), ("dixit", dixit),
        ("splendor", splendor),
    ]]
    (Path(__file__).parent / "scoped-changes.json").write_text(json.dumps(changes, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"games": [c["gameId"] for c in changes], "files": len(changes) * 2}))
