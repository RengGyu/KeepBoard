import type {GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import type {PropertySpec} from '../shared/readouts/types';
import {componentDefinition,emptyGameReadout,gameReadoutView,readoutForGameComponent,setReadoutValue} from '../shared/readouts/registry';

export type QuickValue=string|number|boolean;
export interface QuickOption {value:QuickValue;label:string}
/** fieldId null means choosing what the piece is; otherwise one of its small-choice values. */
export interface QuickChoice {fieldId:string|null;label:string;options:QuickOption[];current:QuickValue|null}
export interface BulkChoice extends QuickChoice {componentId:string|null;ids:string[]}
const MAX_OPTIONS=8,MAX_BULK_OPTIONS=4,MIN_BULK=2;

function fieldOptions(f:PropertySpec):QuickOption[]|null{
 if(f.acquisition!=='visible')return null;
 if(f.type==='boolean')return [{value:true,label:'있음'},{value:false,label:'없음'}];
 if(f.type==='enum'&&f.options&&f.options.length<=MAX_OPTIONS)return f.options.map(o=>({value:o.value,label:o.label}));
 if(f.type==='integer'&&f.min!==undefined&&f.max!==undefined&&f.max-f.min<MAX_OPTIONS)return Array.from({length:f.max-f.min+1},(_,i)=>({value:f.min!+i,label:String(f.min!+i)}));
 return null;
}
function readoutOf(pack:GamePack,p:GenericPiece){
 if(!componentDefinition(pack,p.componentId))return null;
 const view=gameReadoutView(pack,p);return view.status==='structured'?view.readout:view.status==='legacy'?emptyGameReadout(pack,p.componentId):null;
}
function kindOptions(pack:GamePack,ids:readonly string[]):QuickOption[]{
 return (pack.runtime?.components??[]).filter(c=>ids.includes(c.id)).map(c=>({value:c.id,label:c.name}));
}
/** Everything here comes from the game pack: no game has its own branch. */
export function quickChoice(pack:GamePack,piece:GenericPiece,componentIds:readonly string[]):QuickChoice|null{
 if(piece.componentId===null){const options=kindOptions(pack,componentIds);return options.length&&options.length<=MAX_OPTIONS?{fieldId:null,label:'종류',options,current:null}:null;}
 const readout=readoutOf(pack,piece);if(!readout)return null;
 const fields=componentDefinition(pack,piece.componentId)!.fields.filter(f=>fieldOptions(f)&&!(f.faceOnly&&readout.values.face!=='front'&&readout.values.face!==undefined));
 const unread=(f:PropertySpec)=>readout.values[f.id]===null||readout.values[f.id]===undefined;
 const field=fields.find(f=>f.id!=='face'&&unread(f))??fields.find(f=>f.id!=='face')??fields.find(f=>f.id==='face');if(!field)return null;
 const current=readout.values[field.id];
 return {fieldId:field.id,label:field.label,options:fieldOptions(field)!,current:typeof current==='string'||typeof current==='number'||typeof current==='boolean'?current:null};
}
export function quickValue(pack:GamePack,piece:GenericPiece,fieldId:string|null):QuickValue|null{
 if(fieldId===null)return piece.componentId;
 const value=readoutOf(pack,piece)?.values[fieldId];return typeof value==='string'||typeof value==='number'||typeof value==='boolean'?value:null;
}
export function applyQuickChoice(pack:GamePack,piece:GenericPiece,fieldId:string|null,value:QuickValue):Partial<GenericPiece>{
 if(fieldId===null)return {...readoutForGameComponent(pack,piece,String(value)),componentId:String(value),label:piece.label==='미확인 실물'?'':piece.label};
 const readout=readoutOf(pack,piece);if(!readout)return {};
 return {readout:setReadoutValue(pack,readout,fieldId,value)};
}
/** The largest set of same-kind pieces missing one few-choice value, offered as a single "set all" action. */
export function bulkChoice(pack:GamePack,pieces:readonly GenericPiece[],componentIds:readonly string[]):BulkChoice|null{
 const groups=new Map<string,BulkChoice>();
 for(const p of pieces){
  const c=quickChoice(pack,p,componentIds);if(!c||c.current!==null||c.options.length>MAX_BULK_OPTIONS)continue;
  const key=JSON.stringify([p.componentId,c.fieldId]),g=groups.get(key)??{...c,componentId:p.componentId,ids:[]};g.ids.push(p.id);groups.set(key,g);
 }
 return [...groups.values()].filter(g=>g.ids.length>=MIN_BULK).sort((a,b)=>b.ids.length-a.ids.length)[0]??null;
}
export function nextOption(options:readonly QuickOption[],current:QuickValue|null):QuickValue{
 const at=options.findIndex(o=>o.value===current);return options[(at+1)%options.length].value;
}
