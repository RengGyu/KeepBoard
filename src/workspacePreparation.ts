import type {GamePack} from '../shared/types';
/** Prepare before replacing the current workspace: failed/late data cannot unmount an edited draft. */
export async function prepareWorkspace<T extends {pack:GamePack}>(next:T,load:(p:GamePack)=>Promise<void>=async p=>{await (await import('./gameData')).loadGameData(p);}):Promise<T>{
 if(next.pack.runtime?.source)await load(next.pack);return next;
}
