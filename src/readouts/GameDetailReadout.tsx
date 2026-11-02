import React from 'react';
import type {GamePack,Player} from '../../shared/types';
import type {GenericPiece} from '../../shared/genericRecord';
import {readoutRows} from '../../shared/readouts/presentation';
import {componentDefinition} from '../../shared/readouts/registry';
import './game-detail-readout.css';
/** No parsing, inference, or automatic writes during rendering. Art is deliberately not a state oracle. */
export function GameDetailReadout({pack,piece,players=[],compact=false}:{pack:GamePack;piece:GenericPiece;players?:readonly Player[];compact?:boolean}){
 const model=readoutRows(pack,piece,players),component=componentDefinition(pack,piece.componentId);
 if(!component)return null;
 if(model.status!=='structured')return <span className="gdr-legacy">{model.status==='invalid'?'상세 형식 확인 필요':'원본·기존 기록'}</span>;
 const populated=model.rows.filter(r=>!r.unknown),rows=compact?[...populated,...model.rows.filter(r=>r.unknown)].slice(0,3):model.rows;
 return <div className={'gdr-readout'+(compact?' is-compact':'')} aria-label={component.name+' 상세 기록'}>
  {!rows.length&&<span className="gdr-unknown">세부 ?</span>}
  {rows.map(r=><div className={'gdr-value'+(r.unknown?' is-unknown':'')} key={r.key}><span>{r.label}</span><strong>{r.unknown?'?':r.value}</strong>{!compact&&!r.unknown&&<small>{r.basis==='user'?'직접 확인':'사진 관측'}</small>}</div>)}
  {compact&&populated.length>3&&<span className="gdr-more">상세 {populated.length-3}개 더</span>}
 </div>;
}
