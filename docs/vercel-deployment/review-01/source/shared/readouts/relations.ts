import type {GamePack} from '../types.ts';
import {componentDefinition} from './registry.ts';
import type {GameReadout,LocalFeature,PieceReference,ReadoutContext} from './types.ts';
interface P {id:string;componentId:string|null;readout?:unknown}
/** Manual references are record-local. No target lookup outside the authorized record. */
export function validateReadoutRelations(pieces:readonly P[],pack:GamePack,context:ReadoutContext={}) {
 const byId=new Map(pieces.map(p=>[p.id,p]));
 for(const p of pieces){const r=p.readout as GameReadout|undefined;if(!r?.values)continue;
  for(const f of componentDefinition(pack,p.componentId)?.fields??[]){const v=r.values[f.id];if(v===null)continue;
   if(f.type==='reference'){
    if(context.mode==='ai')throw new Error('사진 판독이 기존 실물 ID를 연결할 수 없습니다.');
    const link=v as PieceReference,target=byId.get(link.pieceId);
    if(!target||target.id===p.id||!f.targetComponents?.includes(target.componentId??''))throw new Error('부착 대상은 같은 기록의 허용된 다른 실물이어야 합니다.');
    if(link.featureId!==null){const tr=target.readout as GameReadout|undefined,features=tr?.values?.features;
     if(!Array.isArray(features)||!(features as LocalFeature[]).some(a=>a.id===link.featureId))throw new Error('연결한 타일 내부 지형이 없습니다.');}
   }
  }
 }
}
/** Report references before deletion; UI must not silently remove or redirect attachments. */
export function readoutReferrers(pieces:readonly P[],targetId:string):string[]{return pieces.filter(p=>{const r=p.readout as GameReadout|undefined;return r?.values&&Object.values(r.values).some(v=>v&&typeof v==='object'&&!Array.isArray(v)&&'pieceId'in v&&v.pieceId===targetId);}).map(p=>p.id);}
