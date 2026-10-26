import {GAP_REASON} from '../shared/observationGaps';
import {useState} from 'react';
import type {Evidence} from '../shared/types';
import type {ObservationRequest,ObservationResult,GeometryCandidate,PhotoDefinition,LiteralObservation} from '../shared/lightweightRecognition';
import {mapObservationRegion,type PhotoTransform} from '../shared/photoGeometry';
import {SCENE_KIND_LABELS,type SceneKind} from '../shared/scene';
import './lightweight-reader.css';
const reasons:Record<string,string>=GAP_REASON;
const literalLabels:Record<string,string>={front:'앞면',back:'뒷면',unknown:'모름',red:'빨강',blue:'파랑',green:'초록',white:'흰색',black:'검정',orange:'주황',yellow:'노랑',gold:'금색',development:'개발 카드',noble:'귀족',token:'토큰',deck:'더미'};
function displayLiteral(value:unknown,translate:boolean):string {
 if(value===null)return '모름';
 if(typeof value==='boolean')return value?'예':'아니오';
 if(Array.isArray(value))return value.map(v=>v&&typeof v==='object'&&'symbol' in v?`${literalLabels[String(v.symbol)]??String(v.symbol)} ${displayLiteral(v.value,false)}`:displayLiteral(v,translate)).join(' · ');
 return typeof value==='object'?'인쇄값 있음':translate?literalLabels[String(value)]??String(value):String(value);
}
/** Read-only original model observations, separate from editable scene values and placement candidates. */
export function PhotoObservationOverlay({photos,request,result,geometry,definition,transforms=[]}:{photos:Evidence[];request:ObservationRequest;result:ObservationResult;geometry:GeometryCandidate[];definition:PhotoDefinition;transforms?:PhotoTransform[]}){
 const [index,setIndex]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const image=request.images[index],photo=photos.find(p=>p.id===image?.evidenceId);
 const observations=result.observations.filter(o=>o.imageIndex===index);
 const region=(o:LiteralObservation)=>{try{return mapObservationRegion(o,request,transforms);}catch{return null;}};
 const label=(o:LiteralObservation)=>{const fields=definition.components.find(c=>c.id===o.componentId)?.properties;return Object.entries(o.properties).map(([id,p])=>{const field=fields?.find(f=>f.id===id),name=field?.label??id;if(p.state==='unknown')return `${name}: 모름 (${reasons[p.reason]??'미확인'})`;const option=field?.options?.find(opt=>opt.value===p.value);return `${name}: ${option&&option.label!==String(p.value)?option.label:displayLiteral(p.value,field?.type==='enum'||['face','observedColor','color','bonus','kind','variant','cost','requirements'].includes(id))}`;}).join(' · ')||'읽은 값 없음';};
 return <details className="lightweight-reader"><summary>사진 원본과 관측값 {result.observations.length}개</summary>{request.images.length>1&&<label className="field">원본 사진<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{request.images.map((i,n)=><option key={i.inputId} value={n}>{n+1}번째 사진</option>)}</select></label>}
 {photo&&<div className="lw-photo-review"><img src={photo.url} alt="판독 원본 · 아래의 관측 번호와 대응"/>{observations.map((o,n)=>{const b=region(o);return b?<button key={o.ref} className="lw-source-box" aria-label={`원본 관측 ${n+1}`} aria-pressed={selected===o.ref} style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.width*100}%`,height:`${b.height*100}%`}} onClick={()=>setSelected(o.ref)}><span>{n+1}</span></button>:null;})}</div>}
 <div className="lw-observation-list">{observations.map((o,n)=><button key={o.ref} className="button secondary" aria-pressed={selected===o.ref} onClick={()=>setSelected(o.ref)}><b>{n+1}. {SCENE_KIND_LABELS[o.componentId as SceneKind]??o.componentId??'종류 모름'}</b> · {label(o)}<br/><small>{geometry.some(g=>g.observationRef===o.ref)?'위치 후보 있음 · 미확정':'미배치 · 값의 모름과 별개'}{!o.bbox?' · 사진 범위 미확인':image.transformId!==null?' · 변환을 원본에 대응':''}</small></button>)}</div><p className="small muted">관측 원문은 바꾸지 않아요. 읽힌 값과 위치는 아래에서 따로 고친 뒤 명시적으로 반영해 주세요.</p>
 </details>;
}
