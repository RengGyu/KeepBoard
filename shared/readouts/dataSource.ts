// Node/server keeps the existing synchronous, complete catalog. Vite substitutes the client cache.
import {GAME_READOUTS} from './catalog.ts';
import retired from './retired.json';
import {matchesReadout} from './identity.ts';
import type {GamePack} from '../types.ts';
import type {GameReadoutDefinition} from './types.ts';
export function readoutDefinitionFor(pack:GamePack):GameReadoutDefinition|undefined{
 const id=pack.runtime?.source.gameId;if(!id)return;
 return [GAME_READOUTS[id],(retired as Record<string,GameReadoutDefinition>)[id]].find(d=>matchesReadout(d,pack));
}
