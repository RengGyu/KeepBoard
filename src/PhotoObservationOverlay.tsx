import {observationPropertyApplicable} from '../shared/observationGaps';
import {useState} from 'react';
import type {Evidence} from '../shared/types';
import type {ObservationRequest,ObservationResult,GeometryCandidate,PhotoDefinition,LiteralObservation} from '../shared/lightweightRecognition';
import {mapObservationRegion,type PhotoTransform} from '../shared/photoGeometry';
import {SCENE_KIND_LABELS,type SceneKind} from '../shared/scene';
import './lightweight-reader.css';
import {scanReviewValue,SCAN_REVIEW_NEEDED} from './scanReviewValue';
const literalLabels:Record<string,string>={front:'앞면',back:'뒷면',unknown:'모름',red:'빨강',blue:'파랑',green:'초록',white:'흰색',black:'검정',orange:'주황',yellow:'노랑',gold:'금색',development:'개발 카드',noble:'귀족',token:'토큰',deck:'더미'};
function displayLiteral(value:unknown,translate:boolean):string {
 if(value===null||value===undefined)return SCAN_REVIEW_NEEDED;
 if(typeof value==='boolean')return value?'예':'아니오';
 if(Array.isArray(value))return value.map(v=>v&&typeof v==='object'&&'symbol' in v?`${literalLabels[String(v.symbol)]??String(v.symbol)} ${displayLiteral(v.value,false)}`:displayLiteral(v,translate)).join(' · ');
 return typeof value==='object'?'인쇄값 있음':translate?literalLabels[String(value)]??String(value):String(value);
}
/** Read-only original model observations, separate from editable scene values and placement candidates. */
/** Source photographs carry outlines only. Selected read values stay outside their pixels. */
export function PhotoObservationOverlay({photos,request,result,geometry,definition,transforms=[],open,compact=false}:{photos:Evidence[];request:ObservationRequest;result:ObservationResult;geometry:GeometryCandidate[];definition:PhotoDefinition;transforms?:PhotoTransform[];open?:boolean;compact?:boolean}){
 const [index,setIndex]=useState(0),[selected,setSelected]=useState<string|null>(null),[zoomed,setZoomed]=useState(false);
 const image=request.images[index],photo=photos.find(p=>p.id===image?.evidenceId);
 const observations=result.observations.filter(o=>o.imageIndex===index);
 const region=(o:LiteralObservation)=>{try{return mapObservationRegion(o,request,transforms);}catch{return null;}};
 const label=(o:LiteralObservation)=>{const fields=definition.components.find(c=>c.id===o.componentId)?.properties;return Object.entries(o.properties).filter(([id,p])=>p.state==='observed').map(([id,p])=>{const field=fields?.find(f=>f.id===id),name=field?.label??id,value=p.state==='observed'?p.value:null,option=field?.options?.find(opt=>opt.value===value);return `${name}: ${scanReviewValue(value,field,v=>option&&option.label!==String(v)?option.label:displayLiteral(v,field?.type==='enum'||['face','observedColor','color','bonus','kind','variant','cost','requirements'].includes(id)))}`;}).join(' · ')||SCAN_REVIEW_NEEDED;};
 const needsPhoto=(o:LiteralObservation)=>Object.entries(o.properties).some(([id,p])=>p.state==='unknown'&&observationPropertyApplicable(request,o,id,definition));
 const selectedObservation=observations.find(o=>o.ref===selected);
 const list=<div className="lw-observation-list">{observations.map((o,n)=><button key={o.ref} className="button secondary" aria-pressed={selected===o.ref} onClick={()=>setSelected(o.ref)}><b>{n+1}. {SCENE_KIND_LABELS[o.componentId as SceneKind]??o.componentId??'종류 모름'}</b> · {label(o)}<br/><small>{needsPhoto(o)?'사진 참고':'읽은 값'}</small></button>)}</div>;
 return <details className={`lightweight-reader${compact?' is-result':''}`} open={open||undefined}><summary>사진 원본과 읽은 값 {result.observations.length}개</summary>{request.images.length>1&&<label className="field">원본 사진<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{request.images.map((i,n)=><option key={i.inputId} value={n}>{n+1}번째 사진</option>)}</select></label>}
 {photo&&<>{compact&&<div className="lw-photo-zoom"><button type="button" className="button secondary small-button" aria-pressed={zoomed} onClick={()=>setZoomed(!zoomed)}>{zoomed?'전체 보기':'사진 확대'}</button>{zoomed&&<span>옆으로 밀어 볼 수 있어요</span>}</div>}<div className="lw-photo-and-values"><div className="lw-photo-pan"><div className={`lw-photo-review${compact?' is-compact':''}${zoomed?' is-zoomed':''}`}><img src={photo.url} alt="판독 원본"/>{observations.map((o,n)=>{const b=region(o);return b?<button key={o.ref} className="lw-source-box" aria-label={`원본 관측 ${n+1}`} aria-pressed={selected===o.ref} style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`}} onClick={()=>setSelected(o.ref)}></button>:null;})}</div></div>{selectedObservation&&<p className="small lw-selected" role="status"><b>{SCENE_KIND_LABELS[selectedObservation.componentId as SceneKind]??'종류 모름'}</b> {label(selectedObservation)}{needsPhoto(selectedObservation)&&label(selectedObservation)!==SCAN_REVIEW_NEEDED&&<> · 사진 참고</>}</p>}</div></>}
 {compact?<details className="lw-list-fold"><summary>목록으로 보기 {observations.length}개</summary>{list}</details>:list}<p className="small muted">{compact?'읽은 원문은 그대로 보관돼요. 틀린 값이 있으면 아래 ‘직접 고치기’에서 고칠 수 있어요.':'읽은 원문은 그대로 보관돼요. 틀린 값은 따로 고쳐서 반영할 수 있어요.'}</p>
 </details>;
}
