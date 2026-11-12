import type {PhotoDefinition} from '../shared/lightweightRecognition';
import type {GamePack} from '../shared/types';
type Source={default:{games:unknown[]}};
const matches=(d:PhotoDefinition,pack:GamePack)=>d.packId===pack.id&&d.packVersion===pack.version&&d.gameId===pack.runtime?.source.gameId&&d.editionId===pack.runtime?.source.editionId&&d.sourceSHA===pack.runtime?.source.sha256;
/** Independent promises ensure a current board never downloads the historical catalog.
 * Rejected loads are retryable, and exact version/SHA lookup remains mandatory. */
export function createPhotoDefinitionLoader(current:()=>Promise<Source>,retired:()=>Promise<Source>){
 let currentRows:PhotoDefinition[]|undefined,retiredRows:PhotoDefinition[]|undefined;
 let currentPending:Promise<void>|undefined,retiredPending:Promise<void>|undefined;
 const find=(pack:GamePack)=>currentRows?.find(d=>matches(d,pack))??retiredRows?.find(d=>matches(d,pack));
 const load=async(pack?:GamePack)=>{
  await (currentPending??=current().then(m=>{currentRows=m.default.games as PhotoDefinition[];}).catch(e=>{currentPending=undefined;throw e;}));
  if(pack&&!find(pack))await (retiredPending??=retired().then(m=>{retiredRows=m.default.games as PhotoDefinition[];}).catch(e=>{retiredPending=undefined;throw e;}));
 };
 return {load,find};
}
