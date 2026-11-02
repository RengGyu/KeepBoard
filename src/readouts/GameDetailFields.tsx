import React from 'react';
import type {GamePack,Player} from '../../shared/types';
import type {GenericPiece,GenericRecord} from '../../shared/genericRecord';
import {componentDefinition,emptyGameReadout,gameReadoutView,setReadoutValue} from '../../shared/readouts/registry';
import {inputNumber} from '../../shared/readouts/presentation';
import type {DetailValue,GameReadout,LocalFeature,PieceReference,PropertySpec,SymbolValue} from '../../shared/readouts/types';
import './game-detail-readout.css';
import {ChipPick,Stepper} from '../QuickPick';
interface Props {pack:GamePack;piece:GenericPiece;record:GenericRecord;players:readonly Player[];disabled:boolean;onPatch:(change:Partial<GenericPiece>)=>void;gaps?:Readonly<Record<string,string>>}
export function GameDetailFields({pack,piece,record,players,disabled,onPatch,gaps={}}:Props){
 const definition=componentDefinition(pack,piece.componentId);if(!definition)return null;
 const view=gameReadoutView(pack,piece);
 if(view.status==='invalid')return <section className="gdr-fields" aria-label={definition.name+' 상세 수정'}><p role="alert">지원하지 않는 상세 양식이에요. 기존 상세값은 유지하며 덮어쓰지 않아요. 원본을 확인하거나 이 양식을 지원하는 버전으로 열어 주세요.</p></section>;
 const r:GameReadout=view.readout??emptyGameReadout(pack,piece.componentId);
 const set=(f:PropertySpec,v:DetailValue)=>onPatch({readout:setReadoutValue(pack,r,f.id,v,{playerIds:players.map(p=>p.id)})});
 return <section className="gdr-fields" aria-label={definition.name+' 상세 수정'}>
  <h4>{definition.name} 상세</h4>
  {definition.fields.map(f=>{const value=r.values[f.id],locked=disabled||!!f.faceOnly&&r.values.face!=='front';
   if(f.type==='marks')return <MarksField key={f.id} field={f} value={value as SymbolValue[]|null} disabled={locked} onChange={v=>set(f,v)}/>;
   if(f.type==='features')return <FeaturesField key={f.id} field={f} value={value as LocalFeature[]|null} disabled={locked} onChange={v=>set(f,v)}/>;
   if(f.type==='reference')return <ReferenceField key={f.id} field={f} value={value as PieceReference|null} piece={piece} record={record} disabled={locked} onChange={v=>set(f,v)}/>;
   const gap=gaps[f.id]&&value===null?<small className="gdr-gap">{gaps[f.id]}</small>:null;
   if(f.type==='enum'&&f.options&&f.options.length<=10)return <div key={f.id} className={'gdr-pick'+(gap?' is-gap':'')}><ChipPick label={f.label} disabled={locked} value={value as string|number|null} options={f.options.map(o=>({value:o.value as string|number,label:o.label}))} onChange={v=>set(f,v as DetailValue)}/>{gap}</div>;
   if(f.type==='boolean')return <div key={f.id} className={'gdr-pick'+(gap?' is-gap':'')}><ChipPick label={f.label} disabled={locked} value={value as boolean|null} options={[{value:true,label:'있음'},{value:false,label:'없음'}]} onChange={v=>set(f,v)}/>{gap}</div>;
   if(f.type==='player')return <div key={f.id} className={'gdr-pick'+(gap?' is-gap':'')}><ChipPick label={f.label} disabled={locked} value={value as string|null} options={players.map(p=>({value:p.id,label:p.name}))} onChange={v=>set(f,v)}/>{gap}</div>;
   if(f.type==='integer')return <div key={f.id} className={'gdr-pick'+(gap?' is-gap':'')}><Stepper label={f.label} disabled={locked} value={value as number|null} min={f.min??0} max={f.max} onChange={v=>set(f,v)}/>{gap}</div>;
   return <label key={f.id} className={'gdr-field'+(gaps[f.id]&&value===null?' is-gap':'')}><span>{f.label}{gaps[f.id]&&value===null?<small className="gdr-gap">{gaps[f.id]}</small>:f.acquisition==='manual'&&<small>직접 확인</small>}</span>
    {f.type==='enum'?<select aria-label={f.label} disabled={locked} value={value===null?'':String(value)} onChange={e=>set(f,e.target.value===''?null:f.options!.find(o=>String(o.value)===e.target.value)!.value)}><option value="">모름</option>{f.options!.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:
    <input aria-label={f.label} type="text" maxLength={160} disabled={locked} placeholder="모름" value={value===null?'':String(value)} onChange={e=>set(f,e.target.value.trim()?e.target.value:null)}/>} </label>;
  })}
 </section>;
}
function MarksField({field,value,disabled,onChange}:{field:PropertySpec;value:SymbolValue[]|null;disabled:boolean;onChange:(v:SymbolValue[]|null)=>void}){
 // Add a row only after an explicit named symbol is submitted; no invented default resource/type.
 return <fieldset className="gdr-table"><legend>{field.label}</legend>{value===null&&<p className="gdr-unknown">모름 · 없는 종류를 0으로 채우지 않아요.</p>}
  {(value??[]).map((row,i)=><div key={i} className="gdr-row"><span>{row.symbol}</span><input aria-label={field.label+' '+row.symbol} type="number" inputMode="numeric" min="0" step="1" placeholder="모름" value={row.value??''} disabled={disabled} onChange={e=>{try{const n=inputNumber(e.target.value);if(n!==null&&n<0)throw new Error('0 이상 정수입니다.');onChange(value!.map((r,j)=>i===j?{...r,value:n}:r));e.target.setCustomValidity('');}catch(err){e.target.setCustomValidity((err as Error).message);}}}/><button type="button" disabled={disabled} aria-label={row.symbol+' 항목 제거'} onClick={()=>onChange(value!.filter((_,j)=>i!==j))}>제거</button></div>)}
  <div className="gdr-row"><input aria-label={field.label+' 추가할 기호 이름'} placeholder="읽힌 기호 이름" maxLength={64} disabled={disabled}/><button type="button" disabled={disabled} onClick={e=>{const input=e.currentTarget.previousElementSibling as HTMLInputElement,name=input.value.trim();if(!name||value?.some(row=>row.symbol===name)){input.setCustomValidity('새로 확인한 기호 이름을 입력하세요.');input.reportValidity();return;}onChange([...(value??[]),{symbol:name,value:null}]);input.value='';input.setCustomValidity('');}}>기호 추가</button></div>
  <div className="gdr-row"><button type="button" disabled={disabled} onClick={()=>onChange(null)}>모름으로</button>{value===null&&<button type="button" disabled={disabled} onClick={()=>onChange([])}>표시 없음 확인</button>}</div>
 </fieldset>;
}
function FeaturesField({field,value,disabled,onChange}:{field:PropertySpec;value:LocalFeature[]|null;disabled:boolean;onChange:(v:LocalFeature[]|null)=>void}){
 const update=(i:number,patch:Partial<LocalFeature>)=>onChange(value!.map((r,j)=>i===j?{...r,...patch}:r));
 const kinds=[['city','도시'],['road','도로'],['field','들판'],['monastery','수도원'],['other','기타']];
 return <fieldset className="gdr-table"><legend>{field.label}</legend><p className="gdr-help">한 타일의 서로 다른 들판은 따로 추가해요. 연결성이나 점수는 자동 판정하지 않아요.</p>
  {(value??[]).map((r,i)=><div className="gdr-feature" key={r.id}><span>지형 {i+1}</span><select aria-label={'지형 '+(i+1)+' 종류'} disabled={disabled} value={r.kind??''} onChange={e=>update(i,{kind:(e.target.value||null) as LocalFeature['kind']})}><option value="">모름</option>{kinds.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><input aria-label={'지형 '+(i+1)+' 위치 설명'} placeholder="예: 도로 위쪽 들판" maxLength={120} disabled={disabled} value={r.label} onChange={e=>update(i,{label:e.target.value})}/><button type="button" disabled={disabled} onClick={()=>onChange(value!.filter((_,j)=>i!==j))}>지형 제거</button></div>)}
  <button type="button" disabled={disabled} onClick={()=>onChange([...(value??[]),{id:crypto.randomUUID(),kind:null,label:'',x:null,y:null}])}>내부 지형 추가</button><button type="button" disabled={disabled} onClick={()=>onChange(null)}>모름으로</button>
 </fieldset>;
}
function ReferenceField({field,value,piece,record,disabled,onChange}:{field:PropertySpec;value:PieceReference|null;piece:GenericPiece;record:GenericRecord;disabled:boolean;onChange:(v:PieceReference|null)=>void}){
 const targets=record.pieces.filter(p=>p.id!==piece.id&&field.targetComponents?.includes(p.componentId??''));
 const target=targets.find(p=>p.id===value?.pieceId),r=target?.readout as GameReadout|undefined;
 const features=(Array.isArray(r?.values?.features)?r!.values.features:[]) as LocalFeature[];
 return <fieldset className="gdr-table"><legend>{field.label}</legend><select aria-label={field.label+' 대상'} disabled={disabled} value={value?.pieceId??''} onChange={e=>onChange(e.target.value?{pieceId:e.target.value,featureId:null}:null)}><option value="">모름</option>{targets.map((p,i)=><option key={p.id} value={p.id}>{p.label||'실물 '+(i+1)} · {p.anchor||'위치 미기록'}</option>)}</select>
  {target&&<select aria-label={field.label+' 내부 지형'} disabled={disabled} value={value?.featureId??''} onChange={e=>onChange({pieceId:target.id,featureId:e.target.value||null})}><option value="">내부 지형 미확인</option>{features.map((f,i)=><option value={f.id} key={f.id}>{f.label||'지형 '+(i+1)}</option>)}</select>}
 </fieldset>;
}
