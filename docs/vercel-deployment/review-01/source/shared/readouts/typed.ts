import type {GamePack} from '../types.ts';
import type {ReadoutByGameId,ReadoutGameId} from './generated-types.ts';
import type {ReadoutContext} from './types.ts';
import {validateGameReadout,readoutDefinition} from './registry.ts';
/** Typed public parser. The requested game must also match the source-pinned runtime pack. */
export function parseGameReadout<G extends ReadoutGameId>(gameId:G,value:unknown,pack:GamePack,componentId:string|null,evidenceId:string|null,context:ReadoutContext={}):ReadoutByGameId[G]{
 if(readoutDefinition(pack)?.gameId!==gameId)throw new Error('요청한 게임과 고정 게임팩이 다릅니다.');
 return validateGameReadout(value,pack,componentId,evidenceId,context) as unknown as ReadoutByGameId[G];
}
