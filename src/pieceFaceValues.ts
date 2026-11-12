import type {Assertion,GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {componentDefinition,gameReadoutView} from '../shared/readouts/registry';
import {detailText} from '../shared/readouts/presentation';
import {readoutColor} from './pieceReadoutArt';
import {observationPropertyApplicable} from '../shared/observationGaps';
export function requestedFaceProperties(assertion:Assertion|undefined,pieceId:string){
 return [...new Set((assertion?.observationReceipts??[]).flatMap(r=>Object.entries(r.componentRefs).filter(([,id])=>id===pieceId).flatMap(([ref])=>{
  const o=r.result.observations.find(o=>o.ref===ref);return o?.componentId?(r.request.allowedPropertyIds[o.componentId]??[]).filter(id=>observationPropertyApplicable(r.request,o,id)):[];
 })))];
}

/** Face content, not position/ownership or raw extraction metadata. All original values stay in the readout. */
export function pieceFaceValues(pack:GamePack,piece:GenericPiece,requested?:readonly string[]){
 const definition=componentDefinition(pack,piece.componentId),view=gameReadoutView(pack,piece);
 if(!definition||!view.readout)return [];
 const values=view.readout.values;
 const specificColor=definition.fields.find(f=>['dieColor','cardColor','suit'].includes(f.id)&&values[f.id]!==null&&values[f.id]!==undefined);
 const fields=definition.fields.filter(f=>f.acquisition==='visible'&&!['face','quantity','selectedSide','cell','row','column','orientation','rotationDegrees'].includes(f.id)&&!/(?:Area|Zone)$/.test(f.id)&&!['features','reference','player'].includes(f.type)&&!(specificColor&&f.id==='observedColor'));
 return fields.filter(f=>values[f.id]!==null&&values[f.id]!==undefined||requested?.includes(f.id)).map(f=>{
  const value=values[f.id],unknown=value===null||value===undefined;
  return {id:f.id,label:f.label,text:unknown?'?':detailText(value,f),unknown,color:unknown?undefined:readoutColor(value,f.options?.find(o=>o.value===value)?.label)?.color};
 });
}
