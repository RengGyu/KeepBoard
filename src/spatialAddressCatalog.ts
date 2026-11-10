import type {StoredSpatialPiece} from '../shared/spatialObservation';
import type {SpatialDefinition} from '../shared/spatialDefinition';

let catalog:Promise<readonly SpatialDefinition[]>|undefined;
/** Loaded only for editing an existing spatial claim, never for ordinary/OFF results. */
export async function loadSpatialEditAddresses(s:StoredSpatialPiece){
 const definitions=await (catalog??=import('../game-photo-definitions/spatial/index.json').then(m=>m.default.definitions as unknown as SpatialDefinition[]).catch(error=>{catalog=undefined;throw error;}));
 const d=definitions.find(d=>d.definitionSHA===s.source.runtimeDefinitionSHA&&d.spatialDefinitionSHA===s.source.spatialDefinitionSHA&&d.sourceSHA===s.source.sourceSHA);
 return d?.frames.find(f=>f.id===s.resolved?.frameId&&f.sourceSHA===s.resolved.frameSHA)?.areas.find(a=>a.id===s.resolved?.templateAreaId)?.addresses;
}
