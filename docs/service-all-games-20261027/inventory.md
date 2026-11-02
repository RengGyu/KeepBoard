# All-games photo corpus inventory

Status: **complete**

- Non-Catan games expected/inventoried/unique: 119/119/119.
- Selected originals restored and SHA-256/dimensions/MIME verified: 119/119.
- Fallback selections: 0; failed candidates: 0.
- Private originals: `/private/tmp/keepboard-service-all-games-20261027-photos` (per-game directories mode 0700; files mode 0600).

The inventory retains every manifest alternative, reported source/license/edition, scope and read limits. It records only metadata and file integrity; no visual review or accuracy judgment was performed. The former manifest local paths are preserved as a historical missing-path audit.

## Restored first 10 paths

- `a-feast-for-odin`: `/private/tmp/keepboard-service-all-games-20261027-photos/a-feast-for-odin/ca513e6ba33175866594e0d1c68c935aaa267a8fdfc03bfc43426cc232bc8b2c.jpg` — `ca513e6ba33175866594e0d1c68c935aaa267a8fdfc03bfc43426cc232bc8b2c`, 1024×576
- `aeons-end`: `/private/tmp/keepboard-service-all-games-20261027-photos/aeons-end/4ffbb5c409ac56a7b073f9fcbd57198d2ca818b193365aa9bea1234622a75162.jpg` — `4ffbb5c409ac56a7b073f9fcbd57198d2ca818b193365aa9bea1234622a75162`, 1024×710
- `age-of-innovation`: `/private/tmp/keepboard-service-all-games-20261027-photos/age-of-innovation/b7fd105c4c8bd6759f0a9498eb9215547e7dbd0bcb5dbeae051a0fe7c1f573f6.jpg` — `b7fd105c4c8bd6759f0a9498eb9215547e7dbd0bcb5dbeae051a0fe7c1f573f6`, 1024×768
- `agricola`: `/private/tmp/keepboard-service-all-games-20261027-photos/agricola/a92fe28c95215aad9130b09ee068ab379a09b6e47367b8f75fe7ce0256ae0620.jpg` — `a92fe28c95215aad9130b09ee068ab379a09b6e47367b8f75fe7ce0256ae0620`, 1024×1024
- `akropolis`: `/private/tmp/keepboard-service-all-games-20261027-photos/akropolis/25f179aab5b8c535886a4d03a25d4382b27a28ef8ac86be1a6f69327f8fdabed.jpg` — `25f179aab5b8c535886a4d03a25d4382b27a28ef8ac86be1a6f69327f8fdabed`, 1024×576
- `anachrony`: `/private/tmp/keepboard-service-all-games-20261027-photos/anachrony/c73b44639e5f4c1f34f6130f22d33b20dcda186ef3141952e86858fe1cbfb008.jpg` — `c73b44639e5f4c1f34f6130f22d33b20dcda186ef3141952e86858fe1cbfb008`, 1024×768
- `apiary`: `/private/tmp/keepboard-service-all-games-20261027-photos/apiary/78a1116894a2e49dfc17416197b71c7e612a85ebfcd3baf45ffce145464c067b.jpg` — `78a1116894a2e49dfc17416197b71c7e612a85ebfcd3baf45ffce145464c067b`, 1024×767
- `arcs`: `/private/tmp/keepboard-service-all-games-20261027-photos/arcs/f48625e53b533aec737585137e5052bf1bdaa2906eaf40b919a0cca11111bfa3.jpg` — `f48625e53b533aec737585137e5052bf1bdaa2906eaf40b919a0cca11111bfa3`, 1024×768
- `ark-nova`: `/private/tmp/keepboard-service-all-games-20261027-photos/ark-nova/254424739a4d8333cce705192687245e734175c6573f3bcc50b8d21280cafdf0.jpg` — `254424739a4d8333cce705192687245e734175c6573f3bcc50b8d21280cafdf0`, 786×1024
- `arkham-horror-3`: `/private/tmp/keepboard-service-all-games-20261027-photos/arkham-horror-3/20ed87cde6f84a43cb456e854ec6ccc668a5c730a31e0b3cebf784916fde6a9e.jpg` — `20ed87cde6f84a43cb456e854ec6ccc668a5c730a31e0b3cebf784916fde6a9e`, 1024×1024

## Reproduce SHA and dimension verification

`python3 -c 'import json,hashlib;from pathlib import Path;from PIL import Image;d=json.load(open("docs/service-all-games-20261027/inventory.json"));bad=[];[(bad.append(e["gameId"]) if (not Path(e["selectedPhoto"]["localPath"]).is_file() or hashlib.sha256(Path(e["selectedPhoto"]["localPath"]).read_bytes()).hexdigest()!=e["selectedPhoto"]["sha256"] or list(Image.open(e["selectedPhoto"]["localPath"]).size)!=[e["selectedPhoto"]["width"],e["selectedPhoto"]["height"]]) else None) for e in d["entries"]];print(len(d["entries"]),"entries; failures:",bad)'`
