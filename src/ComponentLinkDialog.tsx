import {useEffect,useMemo,useState} from 'react';
import {Check,LockKeyhole} from 'lucide-react';
import type {Assertion,SessionView} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {runtimeBinding} from '../shared/gameEssentials';
import {componentRecord,componentTargetKey,latestComponentAssertion,unlinkedComponentPieces,type ComponentLinkOptions,type ComponentLinkTarget} from '../shared/componentLinking';
import {api} from './api';
import {fire,type Mutate} from './Fields';
import {GenericPieceArt} from './GenericPieceArt';
import {SplendorReadout} from './SplendorReadout';
import {SplendorFields,isSplendor,splendorView} from './SplendorEditor';
import {Modal} from './ui';
import {GameDetailFields} from './readouts/GameDetailFields';
import {observationGaps} from '../shared/observationGaps';
import {GapNote,gapReasons,unreadGaps} from './GapNote';
import {readoutDefinition} from '../shared/readouts/registry';

/** Pick pieces from a candidate (add) or an applied record (move), choose where they belong, optionally correct read values, then apply explicitly. */
export function ComponentLinkDialog({view,source,initialIds=[],initialTarget,busy,dirtyTarget,mutate,onClose}:{view:SessionView;source:Assertion;initialIds?:string[];initialTarget?:{field:string;ownerId?:string};busy:boolean;dirtyTarget:(field:string,ownerId?:string)=>boolean;mutate:Mutate;onClose:()=>void}){
 const {session,pack}=view,move=source.status==='accepted',splendor=isSplendor(pack);
 const pieces=useMemo(()=>move?componentRecord(source)?.pieces??[]:unlinkedComponentPieces(session,source),[source,session.assertions]);
 const [ids,setIds]=useState<string[]>(initialIds.filter(id=>pieces.some(p=>p.id===id)));
 const [options,setOptions]=useState<ComponentLinkOptions|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 // Reasons come from the candidate's receipt; correction stays optional until selected.
 const gaps=useMemo(()=>move?new Map<string,import('../shared/observationGaps').ObservationGap[]>():observationGaps(source),[source]);
 const [targetKey,setTargetKey]=useState(initialTarget?componentTargetKey(initialTarget.field,initialTarget.ownerId):''),[clear,setClear]=useState(false),[corrections,setCorrections]=useState<Record<string,GenericPiece>>({}),[editing,setEditing]=useState<string|null>(null);
 const selected=pieces.filter(p=>ids.includes(p.id));
 // Leaving the selection drops its open correction form; a target or selection change asks for placement consent again.
 useEffect(()=>{if(editing&&!ids.includes(editing))setEditing(null);setClear(false);},[ids.join(',')]);
 useEffect(()=>setClear(false),[targetKey]);
 useEffect(()=>{if(!ids.length){setOptions(null);return;}let alive=true;setLoading(true);setError('');
  api.componentLinkOptions(session.id,source.id,ids).then(o=>{if(!alive)return;setOptions(o);if(!o.targets.some(t=>componentTargetKey(t.field,t.ownerId)===targetKey))setTargetKey('');},e=>{if(alive){setOptions(null);setError(e instanceof Error?e.message:'연결할 곳을 불러오지 못했어요.');}}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};},[ids.join(','),source.id]);
 const target=options?.targets.find(t=>componentTargetKey(t.field,t.ownerId)===targetKey);
 const targetRecord=target&&componentRecord(latestComponentAssertion(session,target.field,target.ownerId));
 const targets=(options?.targets??[]).filter(t=>!(move&&t.field===source.field&&t.ownerId===source.ownerId));
 const hasUnread=(p:GenericPiece)=>unreadGaps(corrections[p.id]??p,gaps.get(p.id)??[]).length>0;
 const misplaced=!!target&&selected.some(p=>p.placement&&!runtimeBinding(pack,target.field)?.areaIds.includes(p.placement.areaId));
 const name=(p:GenericPiece)=>p.label||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||'미확인';
 const toggle=(id:string)=>setIds(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);
 async function apply(){
  if(!target||!options)return;
  if(dirtyTarget(target.field,target.ownerId)||move&&dirtyTarget(source.field,source.ownerId)){setError('연결할 곳에 저장하지 않은 수정이 있어요. 먼저 기록하거나 되돌린 뒤 연결해 주세요.');return;}
  const corrected=Object.keys(corrections).length?selected.map(p=>corrections[p.id]??p):undefined;
  try{await mutate(()=>api.linkComponents(session.id,{sourceAssertionId:source.id,pieceIds:ids,target:{field:target.field,...(target.ownerId?{ownerId:target.ownerId}:{})},expectedTargetAssertionId:options.targetVersions[componentTargetKey(target.field,target.ownerId)]??null,...(corrected?{corrections:corrected}:{}),...(misplaced&&clear?{clearPlacement:true}:{})}),move?'선택한 실물을 옮겼어요':'선택한 실물을 연결했어요');onClose();}
  catch(e){setError(e instanceof Error?e.message:'연결하지 못했어요. 기존 기록은 그대로예요.');}
 }
 const groups=[...new Set(targets.map(t=>t.ownerName??'공용'))];
 return <Modal title={move?'다른 곳으로 옮기기':'실물 연결'} onClose={onClose}><div className="modal-body cl-dialog">
  <section><div className="cl-head"><h3>{move?'옮길 실물':'연결할 실물'} <span className="muted">{ids.length}/{pieces.length}</span></h3><button type="button" className="button text small-button" disabled={busy||!pieces.length} onClick={()=>setIds(ids.length===pieces.length?[]:pieces.map(p=>p.id))}>{ids.length===pieces.length?'선택 해제':'모두 선택'}</button></div>
   {pieces.length?<div className="cl-pieces">{pieces.map(p=><button type="button" key={p.id} className={ids.includes(p.id)?'selected':''} aria-pressed={ids.includes(p.id)} disabled={busy} onClick={()=>toggle(p.id)}>{splendor?<SplendorReadout {...splendorView(corrections[p.id]??p)}/>:<span className="cl-piece"><GenericPieceArt pack={pack} piece={p} size={44}/><span>{name(p)}</span><small>{p.quantity===null?'수량 ?':`${p.quantity}개`}</small></span>}{ids.includes(p.id)&&<Check size={16} className="cl-check" aria-hidden="true"/>}</button>)}</div>:<p className="small muted">남은 실물이 없어요.</p>}
  </section>
  {ids.length>0&&<section><h3>어디에 {move?'옮길까요':'둘까요'}</h3>
   {loading?<p className="small muted" role="status">연결할 곳을 찾는 중…</p>:targets.length?groups.map(g=><div key={g} className="cl-group"><span className="cl-group-name">{g}</span><div className="cl-targets">{targets.filter(t=>(t.ownerName??'공용')===g).map(t=>{const key=componentTargetKey(t.field,t.ownerId);return <button type="button" key={key} aria-pressed={targetKey===key} disabled={busy} onClick={()=>{setTargetKey(key);setError('');}}>{t.visibility==='owner'&&<LockKeyhole size={14} aria-label="개인"/>}{t.label}</button>;})}</div></div>):!error&&<p className="small muted">선택한 실물을 둘 수 있는 곳이 없어요. 선택을 바꿔 보세요.</p>}
  </section>}
  {selected.length>0&&<details className="cl-correct" open={!!editing}><summary>읽은 값 고치기 (선택){selected.some(hasUnread)?` · 읽지 못한 값 ? ${selected.filter(hasUnread).length}개`:''}</summary>
   <div className="cl-correct-list">{selected.map(p=><button type="button" key={p.id} aria-pressed={editing===p.id} onClick={()=>setEditing(editing===p.id?null:p.id)}>{name(corrections[p.id]??p)}{hasUnread(p)?' (?)':corrections[p.id]?' (고침)':''}</button>)}</div>
   {editing&&selected.some(x=>x.id===editing)&&(()=>{const p=corrections[editing]??selected.find(x=>x.id===editing)!;const patch=(c:Partial<GenericPiece>)=>setCorrections(m=>({...m,[editing]:{...p,...c}}));const pieceGaps=gaps.get(editing)??[];return <div className="cl-correct-form">{pieceGaps.length>0&&<GapNote pack={pack} piece={p} gaps={pieceGaps}/>}{splendor&&<SplendorFields piece={p} disabled={busy} onPatch={patch}/>}{!splendor&&readoutDefinition(pack)&&<GameDetailFields pack={pack} piece={p} record={{version:'game-component-record-v1',pieces:[...(targetRecord?.pieces??[]),...selected.map(x=>corrections[x.id]??x)]}} players={session.players} disabled={busy} onPatch={patch} gaps={gapReasons(pieceGaps)}/>}<label>수량<input type="number" min="0" step="1" placeholder="모름" value={p.quantity??''} disabled={busy} onChange={e=>patch({quantity:e.target.value===''?null:Number(e.target.value)})}/></label></div>;})()}
  </details>}
  {misplaced&&<label className="cl-consent"><input type="checkbox" checked={clear} disabled={busy} onChange={e=>setClear(e.target.checked)}/>판 위치가 이 영역과 맞지 않아요. 미배치로 옮기기(원래 위치는 연결 기록에 남아요)</label>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <div className="cl-actions"><button type="button" className="button secondary" onClick={onClose}>닫기</button><button type="button" className="button primary" disabled={busy||!target||loading||misplaced&&!clear} onClick={()=>fire(apply())}>{move?'옮기기':'연결'}{target?` · ${target.ownerName?target.ownerName+' ':''}${target.label}`:''}</button></div>
 </div></Modal>;
}
