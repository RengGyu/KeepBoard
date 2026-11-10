import {useEffect,useRef} from 'react';
import type {Assertion,Evidence,Session,SessionView} from '../shared/types';
import {api} from './api';
import type {Mutate} from './Fields';
import {PreservationItem} from './Packing';
import './photo-first.css';

export function recordPhotos(session:Session,ownerId?:string){
 const visible=(p:Evidence)=>p.kind==='photo'&&p.ownerId===ownerId&&p.scope===(ownerId?'player':'public');
 const current=session.evidence.filter(visible),archived=session.snapshots.flatMap(s=>s.evidence).filter(visible);
 return [...new Map([...archived,...current].map(p=>[p.id,p])).values()];
}
export function PhotoRecordPanel({view,ownerId,onEvidence}:{view:SessionView;ownerId?:string;onEvidence:(photo:Evidence,region?:Assertion['region'])=>void}){
 const photos=recordPhotos(view.session,ownerId);
 return <section className="photo-record-panel" aria-label="사진 기록"><h3>사진 참고</h3>{photos.length?<><p role="status">사진 저장됨 · 판독을 기다리지 않고 다시 열 수 있어요.</p><div className="photo-record-list">{photos.map((photo,i)=><button key={photo.id} type="button" onClick={()=>onEvidence(photo)} aria-label={`${i+1}번째 원사진 보기`}><img src={photo.url} alt={`${i+1}번째 원사진`} loading="lazy"/></button>)}</div></>:<p>사진을 찍거나 추가하면 바로 보관해요.</p>}</section>;
}
export function PhotoPreservation({view,ownerId,busy,mutate,onReadyToSave}:{view:SessionView;ownerId?:string;busy:boolean;mutate:Mutate;onReadyToSave:(save:(()=>Promise<void>)|null)=>void}){
 const saves=useRef(new Map<string,()=>Promise<void>>()),items=view.session.preservations.filter(p=>p.ownerId===ownerId);
 useEffect(()=>{onReadyToSave(async()=>{for(const save of saves.current.values())await save();});return()=>onReadyToSave(null);});
 return <section className="photo-preservation" aria-label="실물 보존 안내"><p>사진에 안 보이는 내용은 실물 그대로 보관해 주세요.</p>{items.length>0&&<><p className="small">{items.slice(0,3).map(p=>p.label).join(' · ')}</p><details><summary>보관 위치 기록</summary>{items.map(item=><PreservationItem key={item.id} item={item} owner={ownerId?'내 기록':'공용'} busy={busy} onChange={body=>mutate(()=>api.preservation(view.session.id,item.id,body))} onReadyToSave={save=>{if(save)saves.current.set(item.id,save);else saves.current.delete(item.id);}}/>)}</details></>}</section>;
}
