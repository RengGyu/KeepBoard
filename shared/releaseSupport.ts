import type {GamePack} from './types';
import type {GameCatalogEntry} from './gameEssentials';
export type ReleaseTier='photo'|'drawing';
/** No candidate list is an approval. Historical drawings remain readable independently of this admission policy. */
export function releaseTierFor(pack:GamePack|GameCatalogEntry):ReleaseTier{return pack.releaseTier==='drawing'?'drawing':'photo';}
export function drawingEnabled(pack:GamePack|GameCatalogEntry):boolean{return releaseTierFor(pack)==='drawing';}
