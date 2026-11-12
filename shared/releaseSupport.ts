import type {GamePack} from './types';
import type {GameCatalogEntry} from './gameEssentials';
export type ReleaseTier='photo'|'drawing';
/** Technical restoration capability, not measured recognition quality or physical-completion approval. */
export function releaseTierFor(pack:GamePack|GameCatalogEntry):ReleaseTier{const p=pack.restorationPolicy;return pack.releaseTier==='drawing'||p?.version==='restoration-policy-v1'&&p.packId===pack.id&&p.packVersion===pack.version&&(!('runtime' in pack)||p.sourceSHA===pack.runtime?.source.sha256)?'drawing':'photo';}
export function drawingEnabled(pack:GamePack|GameCatalogEntry):boolean{return releaseTierFor(pack)==='drawing';}
