#!/usr/bin/env python3
"""Build a mechanical, source-linked index for the 119 non-Rummikub specs."""

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SPEC_DIR = Path("docs/research/game-specs-120/games")
MAPPING_DIR = Path("public/game-art/games")
ESSENTIALS = Path("docs/game-essentials")
ART_CONFIRMATION = Path("docs/art-confirmation")
SOURCE_RECOVERY = Path("docs/source-recovery")
EXCLUDED_ID = "rummikub"

COLOR_WORDS = re.compile(
    r"color|colour|색상|색|빨강|파랑|노랑|초록|하양|흰색|검정|갈색|보라|주황|\bred\b|\bblue\b|\byellow\b|\bgreen\b|\bwhite\b|\bblack\b|\bbrown\b|\bpurple\b|\borange\b|\bgray\b|\bgrey\b",
    re.IGNORECASE,
)
QUANTITY_WORDS = re.compile(
    r"quantity|quantities|count|copies|copy|piece count|card count|수량|개수|장수|총수|몇 장",
    re.IGNORECASE,
)
NUMBER_WORDS = re.compile(
    r"number|numeric|range|숫자|번호|범위|\b\d+\s*(?:~|[-–—]|to)\s*\d+\b",
    re.IGNORECASE,
)
AREA_WORDS = re.compile(
    r"board|area|map|grid|hex|slot|cell|track|space|tile|zone|판|보드|지도|맵|구역|영역|칸|타일|공간|위치|행|열",
    re.IGNORECASE,
)
MAPPING_ROLE_WORDS = re.compile(r"owner|color|colour|type|kind|semantic", re.IGNORECASE)

DOC_CACHE = {}
CLAIMS = []
CLAIM_KEYS = set()


def rel(path):
    return Path(path).as_posix()


def load_json(path):
    path = rel(path)
    if path not in DOC_CACHE:
        DOC_CACHE[path] = json.loads((ROOT / path).read_text(encoding="utf-8"))
    return DOC_CACHE[path]


def json_path_tokens(path):
    if not path.startswith("$"):
        raise ValueError(f"JSONPath must start at $: {path}")
    tokens = []
    offset = 1
    while offset < len(path):
        if path[offset] == ".":
            end = offset + 1
            while end < len(path) and path[end] not in ".[":
                end += 1
            if end == offset + 1:
                raise ValueError(f"Empty JSONPath key: {path}")
            tokens.append(path[offset + 1 : end])
            offset = end
        elif path[offset] == "[":
            end = path.find("]", offset)
            if end < 0 or not path[offset + 1 : end].isdigit():
                raise ValueError(f"Unsupported JSONPath index: {path}")
            tokens.append(int(path[offset + 1 : end]))
            offset = end + 1
        else:
            raise ValueError(f"Unsupported JSONPath syntax: {path}")
    return tokens


def resolve_json_path(document, path):
    value = document
    for token in json_path_tokens(path):
        value = value[token]
    return value


def leaf_values(value, path):
    if isinstance(value, dict):
        if not value:
            yield path, value
        for key, child in value.items():
            yield from leaf_values(child, f"{path}.{key}")
    elif isinstance(value, list):
        if not value:
            yield path, value
        for index, child in enumerate(value):
            yield from leaf_values(child, f"{path}[{index}]")
    else:
        yield path, value


def find_source_refs(value, path="$", parent_id=None):
    found = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key == "source_refs" and isinstance(child, list):
                for index, source_id in enumerate(child):
                    found.append(
                        {
                            "source_id": source_id,
                            "json_path": f"{child_path}[{index}]",
                            "subject_id": parent_id,
                        }
                    )
            child_id = value.get("id", value.get("component_id", parent_id))
            found.extend(find_source_refs(child, child_path, child_id))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(find_source_refs(child, f"{path}[{index}]", parent_id))
    return found


def collect_key_paths(value, path, predicate):
    found = []
    for leaf_path, leaf in leaf_values(value, path):
        key = leaf_path.rsplit(".", 1)[-1]
        if predicate(key):
            found.append({"key": key, "json_path": leaf_path, "value": leaf})
    return found


def topics_for(path, value):
    text = path + " " + json.dumps(value, ensure_ascii=False, default=str)
    topics = []
    if COLOR_WORDS.search(text):
        topics.append("color")
    if QUANTITY_WORDS.search(text):
        topics.append("quantity")
    if NUMBER_WORDS.search(text):
        topics.append("number_range")
    if AREA_WORDS.search(text):
        topics.append("board_area")
    return topics


def claim_category(fallback, path):
    if re.search(r"\.source_refs\[\d+\]$", path):
        return "source_ref"
    if path.endswith(".asset_id"):
        return "mapping_image"
    if fallback.startswith("mapping_") and MAPPING_ROLE_WORDS.search(path.rsplit(".", 1)[-1]):
        return "mapping_color_role"
    return fallback


def add_claim(game_id, category, subject_id, source_file, json_path, value, source_refs=None):
    source_file = rel(source_file)
    key = (game_id, source_file, json_path)
    if key in CLAIM_KEYS:
        return
    CLAIM_KEYS.add(key)
    # Resolve each pointer before writing so the published index has no stale paths.
    actual = resolve_json_path(load_json(source_file), json_path)
    if actual != value:
        raise AssertionError(f"Extracted value differs from source at {source_file}#{json_path}")
    CLAIMS.append(
        {
            "game_id": game_id,
            "category": claim_category(category, json_path),
            "subject_id": subject_id or "",
            "json_path": json_path,
            "source_file": source_file,
            "value_json": json.dumps(value, ensure_ascii=False, separators=(",", ":")),
            "topics_json": json.dumps(topics_for(json_path, value), ensure_ascii=False, separators=(",", ":")),
            "source_refs_json": json.dumps(source_refs or [], ensure_ascii=False, separators=(",", ":")),
        }
    )


def add_tree_claims(game_id, source_file, subtree, json_path, category, subject_id=None, source_refs=None):
    for path, value in leaf_values(subtree, json_path):
        add_claim(game_id, category, subject_id, source_file, path, value, source_refs)


def extract_asset_refs(value, path="$", source_file=None):
    result = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key == "asset_id" and isinstance(child, str):
                result.append({"asset_id": child, "source_file": source_file, "json_path": child_path})
            result.extend(extract_asset_refs(child, child_path, source_file))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            result.extend(extract_asset_refs(child, f"{path}[{index}]", source_file))
    return result


def resolve_local_path(index_file, local_path):
    local_path = Path(local_path)
    if local_path.is_absolute():
        return local_path.as_posix(), local_path.exists()
    if local_path.parts and local_path.parts[0] in {"docs", "public", "gamepacks", "src", "shared", "server"}:
        repo_path = local_path
    else:
        repo_path = Path(index_file).parent / local_path
    repo_path = Path(rel(repo_path))
    return repo_path.as_posix(), (ROOT / repo_path).is_file()


def index_sources_for_game(game_id, spec, manifest_game, essentials_evidence, art_manifest, recovery_evidence, downloads):
    source_entries = spec.get("sources", [])
    source_by_id = {entry.get("id"): entry for entry in source_entries if entry.get("id")}
    official_records = []
    official_ids = set()
    for index, source in enumerate(source_entries):
        if str(source.get("kind", "")).startswith("official") and source.get("url"):
            official_ids.add(source.get("id"))
            official_records.append(
                {
                    "source_id": source.get("id"),
                    "title": source.get("title"),
                    "kind": source.get("kind"),
                    "url": source.get("url"),
                    "json_path": f"$.sources[{index}]",
                    "source_file": rel(SPEC_DIR / f"{game_id}.json"),
                    "edition_ref": source.get("id") in spec.get("edition", {}).get("source_refs", []),
                }
            )

    spec_file = rel(SPEC_DIR / f"{game_id}.json")
    official_by_url = defaultdict(list)
    for source in official_records:
        official_by_url[source["url"]].append(source["source_id"])

    manifest_links = (manifest_game or {}).get("source_links", [])
    for index, source in enumerate(manifest_links):
        if str(source.get("kind", "")).startswith("official") and source.get("url"):
            item = {
                "source_id": source.get("id"),
                "title": source.get("title"),
                "kind": source.get("kind"),
                "url": source.get("url"),
                "json_path": f"$.games[{manifest_game['_index']}].source_links[{index}]",
                "source_file": rel(ESSENTIALS / "manifest.json"),
                "edition_ref": source.get("id") in spec.get("edition", {}).get("source_refs", []),
            }
            if not any(x["source_id"] == item["source_id"] and x["url"] == item["url"] for x in official_records):
                official_records.append(item)
            official_by_url[item["url"]].append(item["source_id"])

    ref_records = find_source_refs(spec)
    source_ids = set(source_by_id)
    manifest_source_ids = {s.get("id") for s in manifest_links if s.get("id")}
    for ref in ref_records:
        ref["source_entry_found"] = ref["source_id"] in source_ids
        ref["manifest_link_found"] = ref["source_id"] in manifest_source_ids
        ref["official_url_found"] = ref["source_id"] in official_ids or any(
            x.get("source_id") == ref["source_id"] and x.get("url") for x in official_records
        )

    local_sources = {}

    def add_local(index_file, json_path, local_value, source_id=None, url=None, edition=None, receipt_path=None, receipt_data=None, discovery="indexed-path", claim_value=None):
        if not local_value:
            return
        path, exists = resolve_local_path(index_file, local_value)
        record = local_sources.setdefault(
            path,
            {
                "path": path,
                "exists": exists,
                "url": url,
                "source_ids": [],
                "editions": [],
                "discovery": discovery,
                "index_records": [],
                "receipt": None,
            },
        )
        if source_id and source_id not in record["source_ids"]:
            record["source_ids"].append(source_id)
        if edition and edition not in record["editions"]:
            record["editions"].append(edition)
        if url and not record.get("url"):
            record["url"] = url
        index_record = {"source_file": rel(index_file), "json_path": json_path, "source_id": source_id}
        if index_record not in record["index_records"]:
            record["index_records"].append(index_record)
            add_claim(game_id, "local_source", source_id, index_file, json_path, local_value if claim_value is None else claim_value)
        if receipt_path:
            receipt_file, receipt_exists = resolve_local_path(index_file, receipt_path)
            comparison = None
            if receipt_exists and receipt_data:
                metadata = receipt_data
                evidence_local = None
                if metadata.get("local_path") and local_value:
                    evidence_local = Path(str(local_value)).as_posix()
                comparison = {
                    "url_matches_requested_or_final": bool(url and url in {metadata.get("requested_url"), metadata.get("final_url")}),
                    "artifact_path_matches_receipt": bool(evidence_local and metadata.get("local_path") and evidence_local == Path(metadata["local_path"]).as_posix()),
                    "bytes_match": metadata.get("bytes") == receipt_data.get("bytes") if metadata.get("bytes") is not None and receipt_data.get("bytes") is not None else None,
                    "sha256_match": metadata.get("sha256") == receipt_data.get("sha256") if metadata.get("sha256") and receipt_data.get("sha256") else None,
                }
            record["receipt"] = {"path": receipt_file, "exists": receipt_exists, "comparison": comparison}

    for index, source in enumerate(essentials_evidence.get("sources", [])):
        if source.get("game_id") != game_id:
            continue
        for key in ("local_pdf", "local_text"):
            if source.get(key):
                add_local(
                    ESSENTIALS / "evidence.json",
                    f"$.sources[{index}].{key}",
                    source[key],
                    source.get("spec_source_id") or source.get("id"),
                    source.get("url"),
                    source.get("edition"),
                    discovery="game-essentials-evidence",
                )

    for source_index, source in enumerate(art_manifest.get("sources", [])):
        for use_index, use in enumerate(source.get("uses", [])):
            if use.get("game_id") == game_id and source.get("local_path"):
                add_local(
                    ART_CONFIRMATION / "source-manifest.json",
                    f"$.sources[{source_index}].local_path",
                    source["local_path"],
                    source.get("id"),
                    source.get("url"),
                    "; ".join(source.get("editions", [])),
                    discovery=f"art-confirmation-manifest-use:{use_index}",
                )

    game_urls = {source.get("url") for source in official_records if source.get("url")}
    for index, source in enumerate(recovery_evidence.get("sources", [])):
        if source.get("url") not in game_urls or not source.get("artifact", {}).get("path"):
            continue
        artifact = source["artifact"]
        receipt_rel = source.get("retrieval_receipt")
        receipt_data = None
        receipt_path = None
        if receipt_rel:
            receipt_path, receipt_exists = resolve_local_path(SOURCE_RECOVERY / "evidence.json", receipt_rel)
            if receipt_exists:
                receipt_data = load_json(receipt_path)
        add_local(
            SOURCE_RECOVERY / "evidence.json",
            f"$.sources[{index}].artifact.path",
            artifact["path"],
            source.get("source_id"),
            source.get("url"),
            source.get("edition_identification"),
            receipt_rel,
            receipt_data,
            "source-recovery-evidence-artifact",
        )

    # A saved download is linked only when its URL matches an indexed official URL
    # and a file's basename exactly matches that download record's id.
    for file_name, rows in downloads.items():
        for index, download in enumerate(rows):
            if not download.get("saved") or download.get("url") not in game_urls:
                continue
            for candidate in (ESSENTIALS / "sources").glob(f"{download.get('id', '')}.*"):
                if candidate.is_file() and candidate.suffix.lower() in {".pdf", ".html", ".htm", ".txt"}:
                    add_local(
                        file_name,
                        f"$[{index}].url",
                        rel(candidate),
                        download.get("id"),
                        download.get("url"),
                        None,
                        discovery="saved-download-id-exact-basename",
                        claim_value=download.get("url"),
                    )

    return official_records, ref_records, sorted(local_sources.values(), key=lambda item: item["path"])


def main():
    spec_paths = sorted(SPEC_DIR.glob("*.json"))
    spec_by_id = {}
    spec_path_by_id = {}
    for path in spec_paths:
        spec = load_json(path)
        game_id = spec.get("game_id")
        if not game_id:
            raise AssertionError(f"Missing game_id in {path}")
        spec_by_id[game_id] = spec
        spec_path_by_id[game_id] = rel(path)

    all_ids = list(spec_by_id)
    if len(spec_paths) != 120:
        raise AssertionError(f"Expected 120 source specs, found {len(spec_paths)}")
    if len(set(all_ids)) != 120:
        raise AssertionError("Source specs contain duplicate game_id values")
    if sum(game_id.lower() == EXCLUDED_ID for game_id in all_ids) != 1:
        raise AssertionError("Expected exactly one Rummikub source spec")
    game_ids = sorted(game_id for game_id in all_ids if game_id.lower() != EXCLUDED_ID)
    if len(game_ids) != 119 or len(set(game_ids)) != 119:
        raise AssertionError("Excluding Rummikub must leave 119 unique game IDs")

    mapping_by_id = {}
    for path in sorted((ROOT / MAPPING_DIR).glob("*/mapping.json")):
        mapping = load_json(path)
        mapping_by_id[mapping.get("game_id", path.parent.name)] = (mapping, rel(path))
    essentials_manifest = load_json(ESSENTIALS / "manifest.json")
    essentials_by_id = {}
    for index, game in enumerate(essentials_manifest.get("games", [])):
        if game.get("game_id"):
            copy = dict(game)
            copy["_index"] = index
            essentials_by_id[game["game_id"]] = copy
    essentials_evidence = load_json(ESSENTIALS / "evidence.json")
    art_manifest = load_json(ART_CONFIRMATION / "source-manifest.json")
    recovery_evidence = load_json(SOURCE_RECOVERY / "evidence.json")
    downloads = {}
    for filename in ("downloads.json", "downloads-extra.json"):
        path = ESSENTIALS / filename
        if path.exists():
            downloads[rel(path)] = load_json(path)

    games = []
    for game_id in game_ids:
        spec = spec_by_id[game_id]
        spec_file = spec_path_by_id[game_id]
        mapping_pair = mapping_by_id.get(game_id)
        mapping, mapping_file = mapping_pair if mapping_pair else (None, None)
        manifest_game = essentials_by_id.get(game_id)
        official_sources, refs, local_sources = index_sources_for_game(
            game_id, spec, manifest_game, essentials_evidence, art_manifest, recovery_evidence, downloads
        )

        edition = spec.get("edition", {})
        edition_refs = [ref for ref in refs if ref["json_path"].startswith("$.edition.source_refs[")]
        edition_source_ref_records = []
        for ref in edition_refs:
            edition_source_ref_records.append(
                {
                    **ref,
                    "source_entry_path": f"$.sources[{next((i for i, s in enumerate(spec.get('sources', [])) if s.get('id') == ref['source_id']), -1)}]" if ref["source_entry_found"] else None,
                }
            )

        components = []
        for index, component in enumerate(spec.get("components", [])):
            path = f"$.components[{index}]"
            component_id = component.get("id")
            add_tree_claims(game_id, spec_file, component, path, "component", component_id, component.get("source_refs", []))
            components.append(
                {
                    "id": component_id,
                    "name": component.get("name"),
                    "kind": component.get("kind"),
                    "json_path": path,
                    "field_paths": [leaf_path for leaf_path, _ in leaf_values(component, path)],
                    "source_refs": [
                        {"id": source_id, "json_path": f"{path}.source_refs[{i}]"}
                        for i, source_id in enumerate(component.get("source_refs", []))
                    ],
                }
            )

        layout = spec.get("layout", {})
        layout_areas = []
        for index, area in enumerate(layout.get("areas", [])):
            path = f"$.layout.areas[{index}]"
            area_id = area.get("id")
            add_tree_claims(game_id, spec_file, area, path, "board_area", area_id, area.get("source_refs", []))
            layout_areas.append(
                {
                    "id": area_id,
                    "name": area.get("name"),
                    "scope": area.get("scope"),
                    "topology": area.get("topology"),
                    "json_path": path,
                    "field_paths": [leaf_path for leaf_path, _ in leaf_values(area, path)],
                    "source_refs": [
                        {"id": source_id, "json_path": f"{path}.source_refs[{i}]"}
                        for i, source_id in enumerate(area.get("source_refs", []))
                    ],
                }
            )
        for root_key in ("relations", "notes"):
            if root_key in layout:
                add_tree_claims(game_id, spec_file, layout[root_key], f"$.layout.{root_key}", "board_area", root_key)

        for group_key in ("state_fields", "rules"):
            for index, item in enumerate(spec.get(group_key, [])):
                path = f"$.{group_key}[{index}]"
                if topics_for(path, item):
                    category = "state_field_topic" if group_key == "state_fields" else "rule_topic"
                    add_tree_claims(game_id, spec_file, item, path, category, item.get("id"), item.get("source_refs", []))

        add_tree_claims(game_id, spec_file, edition, "$.edition", "edition", game_id, edition.get("source_refs", []))
        for index, source in enumerate(spec.get("sources", [])):
            if str(source.get("kind", "")).startswith("official") and source.get("url"):
                source_path = f"$.sources[{index}]"
                for key in ("id", "title", "kind", "url", "access", "checked_at"):
                    if key in source:
                        add_claim(game_id, "official_source", source.get("id"), spec_file, f"{source_path}.{key}", source[key])

        # Source references elsewhere in the spec are indexed even when their parent
        # field is outside the component/layout claim selection above.
        for ref in refs:
            add_claim(game_id, "source_ref", ref.get("subject_id"), spec_file, ref["json_path"], ref["source_id"])

        art = None
        if mapping:
            art_file = mapping_file
            art_components = []
            for index, component in enumerate(mapping.get("components", [])):
                path = f"$.components[{index}]"
                component_id = component.get("component_id")
                add_tree_claims(game_id, art_file, component, path, "mapping_component", component_id, component.get("source_refs", []))
                role_keys = collect_key_paths(
                    component,
                    path,
                    lambda key: bool(MAPPING_ROLE_WORDS.search(key)),
                )
                art_components.append(
                    {
                        "component_id": component_id,
                        "name": component.get("name"),
                        "kind": component.get("kind"),
                        "json_path": path,
                        "owner_type_color_keys": role_keys,
                        "asset_refs": extract_asset_refs(component, path, art_file),
                    }
                )
            art_areas = []
            for index, area in enumerate(mapping.get("areas", [])):
                path = f"$.areas[{index}]"
                area_id = area.get("id")
                add_tree_claims(game_id, art_file, area, path, "mapping_area", area_id, area.get("source_refs", []))
                art_areas.append(
                    {
                        "id": area_id,
                        "name": area.get("name"),
                        "json_path": path,
                        "asset_refs": extract_asset_refs(area, path, art_file),
                    }
                )
            area_preview_assets = extract_asset_refs(mapping.get("area_preview"), "$.area_preview", art_file)
            for asset in area_preview_assets:
                add_claim(game_id, "mapping_image", "area_preview", art_file, asset["json_path"], asset["asset_id"])
            art = {
                "path": art_file,
                "game_id": mapping.get("game_id"),
                "edition": mapping.get("edition"),
                "source_spec": mapping.get("source_spec"),
                "source_sha256_recorded": mapping.get("source_sha256"),
                "components": art_components,
                "areas": art_areas,
                "area_preview_asset_refs": area_preview_assets,
                "mapping_match": mapping.get("game_id") == game_id,
            }

        for source in local_sources:
            for entry in source["index_records"]:
                source["source_index_link"] = entry

        games.append(
            {
                "game_id": game_id,
                "name_ko": spec.get("name_ko"),
                "name_en": spec.get("name_en"),
                "spec": {
                    "path": spec_file,
                    "json_path": "$",
                    "edition": {
                        "id": edition.get("id"),
                        "id_json_path": "$.edition.id" if "id" in edition else None,
                        "name": edition.get("name"),
                        "name_json_path": "$.edition.name" if "name" in edition else None,
                        "source_refs": edition_source_ref_records,
                    },
                    "all_source_refs": refs,
                    "official_sources": official_sources,
                    "components": components,
                    "layout_areas": layout_areas,
                    "layout_json_paths": {
                        key: f"$.layout.{key}"
                        for key in ("areas", "relations", "notes")
                        if key in layout
                    },
                },
                "art_mapping": art,
                "existing_original_sources": local_sources,
            }
        )

    category_counts = Counter(row["category"] for row in CLAIMS)
    topic_counts = Counter(topic for row in CLAIMS for topic in json.loads(row["topics_json"]))
    category_games = defaultdict(set)
    topic_games = defaultdict(set)
    for row in CLAIMS:
        category_games[row["category"]].add(row["game_id"])
        for topic in json.loads(row["topics_json"]):
            topic_games[topic].add(row["game_id"])

    all_refs = [ref for game in games for ref in game["spec"]["all_source_refs"]]
    edition_refs = [ref for game in games for ref in game["spec"]["edition"]["source_refs"]]
    official_games = sum(bool(game["spec"]["official_sources"]) for game in games)
    local_games = sum(any(item["exists"] for item in game["existing_original_sources"]) for game in games)
    mappings_present = sum(game["art_mapping"] is not None for game in games)
    mapping_matches = sum(bool(game["art_mapping"] and game["art_mapping"]["mapping_match"]) for game in games)
    receipt_records = [
        item["receipt"]["comparison"]
        for game in games
        for item in game["existing_original_sources"]
        if item.get("receipt") and item["receipt"].get("comparison")
    ]

    missing_ids = sorted(set(game_ids) - {game["game_id"] for game in games})
    unexpected_ids = sorted({game["game_id"] for game in games} - set(game_ids))
    path_errors = []
    for row in CLAIMS:
        try:
            resolve_json_path(load_json(row["source_file"]), row["json_path"])
        except (KeyError, IndexError, TypeError, ValueError) as error:
            path_errors.append(f"{row['source_file']}#{row['json_path']}: {error}")
    if missing_ids or unexpected_ids or path_errors:
        raise AssertionError(f"Self-check failed: missing={missing_ids[:3]}, unexpected={unexpected_ids[:3]}, paths={path_errors[:3]}")

    inventory = {
        "schema_version": "1.0",
        "purpose": "Mechanical locator index only; no rule-fact adjudication or source-content verification.",
        "inputs": [
            rel(SPEC_DIR),
            rel(MAPPING_DIR),
            rel(ESSENTIALS / "manifest.json"),
            rel(ESSENTIALS / "evidence.json"),
            rel(ESSENTIALS / "downloads.json"),
            rel(ESSENTIALS / "downloads-extra.json"),
            rel(ART_CONFIRMATION / "source-manifest.json"),
            rel(SOURCE_RECOVERY / "evidence.json"),
        ],
        "game_count": len(games),
        "excluded_game_ids": [game_id for game_id in all_ids if game_id.lower() == EXCLUDED_ID],
        "self_check": {
            "input_spec_files": len(spec_paths),
            "input_unique_game_ids": len(set(all_ids)),
            "indexed_unique_game_ids": len({game["game_id"] for game in games}),
            "missing_game_ids": missing_ids,
            "unexpected_game_ids": unexpected_ids,
            "jsonpath_claim_rows_checked": len(CLAIMS),
            "jsonpath_errors": 0,
            "mapping_files_found": mappings_present,
            "mapping_game_id_matches": mapping_matches,
        },
        "counts": {
            "claims_by_category": {
                category: {"rows": count, "games": len(category_games[category])}
                for category, count in sorted(category_counts.items())
            },
            "claims_by_topic": {
                topic: {"rows": count, "games": len(topic_games[topic])}
                for topic, count in sorted(topic_counts.items())
            },
            "source_linkage": {
                "all_source_ref_occurrences": len(all_refs),
                "all_refs_found_in_game_spec_sources": sum(ref["source_entry_found"] for ref in all_refs),
                "all_refs_found_in_spec_or_essentials_manifest": sum(ref["source_entry_found"] or ref["manifest_link_found"] for ref in all_refs),
                "edition_source_ref_occurrences": len(edition_refs),
                "edition_refs_found_in_game_spec_sources": sum(ref["source_entry_found"] for ref in edition_refs),
                "edition_refs_with_official_url": sum(ref["official_url_found"] for ref in edition_refs),
                "games_with_official_url": official_games,
                "games_with_official_url_rate": round(official_games / len(games), 4),
                "games_with_existing_original_file": local_games,
                "games_with_existing_original_file_rate": round(local_games / len(games), 4),
                "source_recovery_receipt_comparisons": len(receipt_records),
                "receipt_url_match_count": sum(bool(row.get("url_matches_requested_or_final")) for row in receipt_records),
                "receipt_path_match_count": sum(bool(row.get("artifact_path_matches_receipt")) for row in receipt_records),
                "receipt_bytes_match_count": sum(row.get("bytes_match") is True for row in receipt_records),
                "receipt_sha256_match_count": sum(row.get("sha256_match") is True for row in receipt_records),
            },
        },
        "path_conventions": {
            "repo_paths": "Repository-relative file paths; each source record also carries its source index JSONPath.",
            "json_paths": "Simple rooted JSONPath ($.key[index]); claims.csv values are JSON-encoded source values.",
            "regions_or_rule_verdicts": "Not generated. Existing confidence/hash/status metadata is not a new audit result.",
        },
        "games": games,
    }

    with (OUT / "claims.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(
            stream,
            fieldnames=["game_id", "category", "subject_id", "source_file", "json_path", "value_json", "topics_json", "source_refs_json"],
        )
        writer.writeheader()
        writer.writerows(CLAIMS)
    (OUT / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# 기계적 게임 명세 위치 색인",
        "",
        "119개 게임의 판본·명세 필드·아트 매핑·기존 원문 위치를 찾기 위한 인덱스입니다. 규칙 사실의 참·거짓이나 공식 출처의 완전성을 판정하지 않습니다.",
        "",
        "## 파일",
        "",
        "- `build_inventory.py`: 표준 라이브러리만 사용하는 재생성 스크립트. 네트워크 접근이나 다운로드를 하지 않습니다.",
        "- `inventory.json`: 게임별 선택 판본, source_refs, official URL 레코드, 구성물·판 구역 JSON 위치, 이미지 매핑 키, 기존 원문 경로.",
        "- `claims.csv`: 원문 필드 값과 JSONPath를 한 행씩 제공. `value_json`은 입력 JSON 값을 그대로 JSON 인코딩합니다.",
        "",
        "## 재생성 및 확인",
        "",
        "```sh",
        "python3 docs/game-fidelity-audit/inventory/build_inventory.py",
        "```",
        "",
        f"입력 명세 **{len(spec_paths)}개**, 루미큐브 제외 후 **{len(games)}개 unique game_id**, 누락 **{len(missing_ids)}개**. JSONPath claim **{len(CLAIMS)}개**를 실제 JSON 값과 대조했고 경로 오류는 없습니다.",
        "",
        "## 분류별 색인 행",
        "",
        "| 분류 | 행 | 게임 수 |",
        "|---|---:|---:|",
    ]
    for category, count in sorted(category_counts.items()):
        lines.append(f"| `{category}` | {count} | {len(category_games[category])} |")
    lines.extend(["", "## 원문 주제 태그(중복 가능)", "", "| 태그 | 행 | 게임 수 |", "|---|---:|---:|"])
    for topic, count in sorted(topic_counts.items()):
        lines.append(f"| `{topic}` | {count} | {len(topic_games[topic])} |")
    link_counts = inventory["counts"]["source_linkage"]
    lines.extend(
        [
            "",
            "## 출처 연결 범위",
            "",
            f"- Edition source_refs: {link_counts['edition_refs_found_in_game_spec_sources']}/{link_counts['edition_source_ref_occurrences']}가 게임 명세의 `sources` ID와 연결됩니다; {link_counts['edition_refs_with_official_url']}/{link_counts['edition_source_ref_occurrences']}가 공식 URL 레코드와 연결됩니다.",
            f"- Official URL이 색인된 게임: {link_counts['games_with_official_url']}/{len(games)} ({link_counts['games_with_official_url_rate']:.1%}).",
            f"- 기존 파일 경로가 있고 실제 파일이 존재하는 게임: {link_counts['games_with_existing_original_file']}/{len(games)} ({link_counts['games_with_existing_original_file_rate']:.1%}).",
            f"- source-recovery receipt 메타데이터 비교: {link_counts['source_recovery_receipt_comparisons']}건. URL/path/bytes/SHA 비교 개수는 inventory.json에서 확인할 수 있습니다; 이는 규칙서 내용 검수가 아닙니다.",
            "",
            "## 한계",
            "",
            "원문 파일이 인덱스에서 game_id 또는 정확한 공식 URL로 연결되지 않으면 임의 추정하지 않고 해당 게임의 기존 원문 목록을 비워 둡니다. 존재하지 않는 경로는 `exists: false`로 표시합니다. 해시·confidence·기존 상태값은 새 검수 통과를 뜻하지 않습니다.",
            "",
        ]
    )
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(
        json.dumps(
            {
                "input_specs": len(spec_paths),
                "indexed_games": len(games),
                "unique_game_ids": len({game["game_id"] for game in games}),
                "missing_game_ids": missing_ids,
                "claims": len(CLAIMS),
                "claims_by_category": dict(sorted(category_counts.items())),
                "claims_by_topic": dict(sorted(topic_counts.items())),
                "source_linkage": inventory["counts"]["source_linkage"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
