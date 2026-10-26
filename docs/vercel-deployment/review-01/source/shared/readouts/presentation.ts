import type {GamePack,Player} from '../types.ts';
import {componentDefinition,gameReadoutView} from './registry.ts';
import type {DetailValue,LocalFeature,PieceReference,PropertySpec,SymbolValue} from './types.ts';
export function detailText(value:DetailValue,field:PropertySpec,players:readonly Player[]=[]):string {
 if(value===null)return '모름';
 if(field.type==='boolean')return value?'있음':'없음';
 if(field.type==='enum')return field.options?.find(o=>o.value===value)?.label??'모름';
 if(field.type==='player')return players.find(p=>p.id===value)?.name??'연결한 플레이어';
 if(field.type==='marks')return (value as SymbolValue[]).length?(value as SymbolValue[]).map(row=>`${row.symbol} ${row.value===null?'?':row.value}`).join(' · '):'표시 없음';
 if(field.type==='features')return (value as LocalFeature[]).length+'개 내부 지형';
 if(field.type==='reference'){const r=value as PieceReference;return r.featureId?'타일 내부 지형에 연결됨':'실물에 연결됨';}
 return `${value}${field.unit??''}`;
}
export function readoutRows(pack:GamePack,piece:{componentId:string|null;evidenceId:string|null;readout?:unknown},players:readonly Player[]=[]){
 const view=gameReadoutView(pack,piece),fields=componentDefinition(pack,piece.componentId)?.fields??[];
 if(!view.readout)return {status:view.status,rows:[]};
 return {status:view.status,rows:fields.map(f=>({key:f.id,label:f.label,value:detailText(view.readout!.values[f.id],f,players),basis:view.readout!.sources[f.id],unknown:view.readout!.values[f.id]===null}))};
}
/** Numeric input policy: blank is null; no rounding, clamping, or fallthrough to zero. */
export function inputNumber(text:string):number|null {
 if(text==='')return null;
 const n=Number(text);if(!Number.isSafeInteger(n))throw new Error('정수 또는 모름을 입력하세요.');return n;
}
