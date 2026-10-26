import type {GamePack} from '../types.ts';
import type {GenericPiece,GenericRecord} from '../genericRecord.ts';
import type {LocalFeature,PieceReference} from './types.ts';
import {gameReadoutView,readoutDefinition} from './registry.ts';
export interface TileView {piece:GenericPiece;x:number;y:number;features:LocalFeature[];followers:{piece:GenericPiece;feature:LocalFeature|null}[]}
/** Presentation-only projection. No snapping, connectivity, scoring, or changes to stored placement. */
export function carcassonneLayout(pack:GamePack,record:GenericRecord):{tiles:TileView[];unmappedIds:string[];collisions:string[][]}{
 if(readoutDefinition(pack)?.gameId!=='carcassonne')return {tiles:[],unmappedIds:[],collisions:[]};
 const tiles:TileView[]=[],unmappedIds:string[]=[],cells=new Map<string,string[]>();
 for(const p of record.pieces){if(p.componentId!=='tiles')continue;const v=gameReadoutView(pack,p).readout?.values;
  if(typeof v?.gridX!=='number'||typeof v.gridY!=='number'){unmappedIds.push(p.id);continue;}
  const features=(v.features??[]) as LocalFeature[];tiles.push({piece:p,x:v.gridX,y:v.gridY,features,followers:[]});const key=`${v.gridX},${v.gridY}`;cells.set(key,[...(cells.get(key)??[]),p.id]);
 }
 for(const p of record.pieces){if(p.componentId!=='followers')continue;const v=gameReadoutView(pack,p).readout?.values.attachedTo as PieceReference|null|undefined;
  if(!v)continue;const tile=tiles.find(t=>t.piece.id===v.pieceId);if(tile)tile.followers.push({piece:p,feature:tile.features.find(f=>f.id===v.featureId)??null});
 }
 return {tiles,unmappedIds,collisions:[...cells.values()].filter(ids=>ids.length>1)};
}
