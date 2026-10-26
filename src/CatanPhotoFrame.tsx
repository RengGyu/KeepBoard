import {useState} from 'react';
import type {Evidence} from '../shared/types';
import type {ConfirmedPhotoFrame,GeometryPoint} from '../shared/photoGeometry';
import {CATAN_TOPOLOGY} from '../shared/scene';
import {Modal} from './ui';
import './lightweight-reader.css';

type Pair=ConfirmedPhotoFrame['correspondences'][number];
/** Input controls only. The shared geometry validator/mapper is authoritative. */
export function CatanPhotoFrame({photo,sourceSHA,definitionSHA,initial,onConfirm,onClose,validate}:{photo:Evidence;sourceSHA:string;definitionSHA:string;initial?:ConfirmedPhotoFrame;onConfirm:(frame:ConfirmedPhotoFrame)=>Promise<void>|void;onClose:()=>void;validate:(frame:ConfirmedPhotoFrame)=>unknown}){
 const [pairs,setPairs]=useState<Pair[]>(initial?.correspondences??[]),[slot,setSlot]=useState('r1c1'),[orientation,setOrientation]=useState(initial?String(initial.orientation):''),[point,setPoint]=useState<GeometryPoint|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const hex=CATAN_TOPOLOGY.hexes.find(h=>h.id===slot)!;
 function add(){if(!point)return;setPairs(old=>[...old.filter(p=>p.canonicalTopologyId!==slot),{photoPointNormalized:point,canonicalPoint:{x:hex.x,y:hex.y},canonicalTopologyId:slot}]);setPoint(null);setError('');}
 async function confirm(){setError('');try{const frame:ConfirmedPhotoFrame={frameId:crypto.randomUUID(),sourceEvidenceId:photo.id,sourceSHA,definitionSHA,coordinateSpace:'normalized-photo/catan-topology',correspondences:pairs,orientation:Number(orientation),confirmedByUser:true};validate(frame);setBusy(true);await onConfirm(frame);}catch(e){setError(e instanceof Error?e.message:'기준점을 확인해 주세요.');}finally{setBusy(false);}}
 return <Modal title="사진과 보드 위치 맞추기" onClose={onClose} wide><div className="lightweight-frame">
  <p>기준 그림의 칸을 고르고 사진에서 같은 타일의 중심을 눌러 주세요. 서로 떨어진 4곳 이상을 연결해요.</p>
  <label className="field">판 방향<select aria-label="판 방향" value={orientation} onChange={e=>setOrientation(e.target.value)}><option value="">방향을 확인해 주세요</option>{[0,60,120,180,240,300].map(v=><option key={v} value={v}>{v}° · 기준 그림에서 시계 방향</option>)}</select></label>
  <label className="field">기준 그림 칸<select aria-label="기준 그림 칸" value={slot} onChange={e=>setSlot(e.target.value)}>{CATAN_TOPOLOGY.hexes.map(h=><option key={h.id} value={h.id}>{h.row}행 {h.column}열</option>)}</select></label>
  <svg className="lw-topology" viewBox="-5 -4.6 10 9.2" role="group" aria-label="사진과 대응할 카탄 칸"><text x="0" y="-4.15" textAnchor="middle" fontSize=".35">↑ 기준 그림 위쪽</text>{CATAN_TOPOLOGY.hexes.map(h=><g key={h.id} role="button" tabIndex={0} aria-label={`${h.row}행 ${h.column}열 기준점 선택`} aria-pressed={slot===h.id} onClick={()=>setSlot(h.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSlot(h.id);}}}><circle cx={h.x} cy={h.y} r=".72" fill={slot===h.id?'#d7edeb':pairs.some(p=>p.canonicalTopologyId===h.id)?'#f4deae':'#f3f0e9'} stroke="#7b857b" strokeWidth=".035"/><text x={h.x} y={h.y+.1} textAnchor="middle" fontSize=".3" pointerEvents="none">{h.row}-{h.column}</text></g>)}</svg>
  <div className="lw-frame-photo" onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPoint({x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))});}}><img src={photo.url} alt="기준점을 지정할 원본 사진"/>{pairs.map((p,i)=><span className="lw-frame-point" key={p.canonicalTopologyId} style={{left:`${p.photoPointNormalized.x*100}%`,top:`${p.photoPointNormalized.y*100}%`}}>{i+1}</span>)}{point&&<span className="lw-frame-point pending" style={{left:`${point.x*100}%`,top:`${point.y*100}%`}}>+</span>}</div>
  <div className="lw-point-input"><label className="field">사진 가로 위치 (%)<input aria-label="사진 가로 위치 (%)" type="number" min="0" max="100" step=".1" value={point?Number((point.x*100).toFixed(1)):''} onChange={e=>setPoint(e.target.value===''?null:{x:Number(e.target.value)/100,y:point?.y??.5})}/></label><label className="field">사진 세로 위치 (%)<input aria-label="사진 세로 위치 (%)" type="number" min="0" max="100" step=".1" value={point?Number((point.y*100).toFixed(1)):''} onChange={e=>setPoint(e.target.value===''?null:{x:point?.x??.5,y:Number(e.target.value)/100})}/></label></div>
  <button className="button secondary" disabled={!point||busy} onClick={add}>{hex.row}행 {hex.column}열에 이 점 연결</button>
  <ol className="lw-pairs">{pairs.map((p,i)=><li key={p.canonicalTopologyId}><span>{i+1}. {p.canonicalTopologyId.replace('r','').replace('c','행 ')}열 · {Math.round(p.photoPointNormalized.x*100)}%, {Math.round(p.photoPointNormalized.y*100)}%</span><button className="button text" aria-label={`기준점 ${i+1} 지우기`} disabled={busy} onClick={()=>setPairs(old=>old.filter(x=>x!==p))}>지우기</button></li>)}</ol>
  {error&&<p role="alert">{error}</p>}<p className="small muted">숫자·지형의 정답을 알려 주는 단계가 아니에요. 위치가 안 맞으면 원본과 미배치 후보를 남겨요.</p>
  <div className="button-row"><button className="button secondary" disabled={!pairs.length||busy} onClick={()=>setPairs(old=>old.slice(0,-1))}>기준점 되돌리기</button><button className="button primary" disabled={pairs.length<4||orientation===''||busy} onClick={()=>void confirm()}>방향과 기준점 확인</button></div>
 </div></Modal>;
}
