import type {GenericPiece} from '../shared/genericRecord';
import type {StoredSpatialPiece} from '../shared/spatialObservation';
import {spatialRotation,spatialReflection} from '../shared/spatialPlacement';
import {useEffect,useState} from 'react';
import type {SpatialAddress} from '../shared/spatialDefinition';
import {loadSpatialEditAddresses} from './spatialAddressCatalog';
export function SpatialPieceDetails({piece,busy,readonly,onChange}:{piece:GenericPiece;busy:boolean;readonly:boolean;onChange:(spatial:StoredSpatialPiece)=>void}){
 const s=piece.spatial,claims=[s,...(piece.spatialAlternatives??[])].filter((s):s is StoredSpatialPiece=>!!s);
 const key=s?.resolved?[s.source.runtimeDefinitionSHA,s.source.spatialDefinitionSHA,s.source.sourceSHA,s.resolved.frameId,s.resolved.frameSHA,s.resolved.templateAreaId].join(':'):null;
 const [loaded,setLoaded]=useState<{key:string;addresses:SpatialAddress[]|undefined}>();
 useEffect(()=>{let alive=true;if(s&&key&&!readonly)void loadSpatialEditAddresses(s).then(addresses=>{if(alive)setLoaded({key,addresses});},()=>{});return()=>{alive=false;};},[key,readonly]);
 if(!claims.length)return null;
 const addresses=key===loaded?.key?loaded?.addresses:undefined,anchor=s?(Object.hasOwn(s,'manualAnchor')?s.manualAnchor:s.resolved?.anchor):null,covered=s?(Object.hasOwn(s,'manualCovered')?s.manualCovered:s.resolved?.covered):null;
 return <div className="small" aria-label="공간 관측 상세" style={{overflowWrap:'anywhere'}}>
  {claims.map((claim,i)=><p key={claim.source.taskId+claim.observationRef}>{i===0&&s?'현재 공간 기록':'별도 공간 관측'} · {claim.board?.visibleIdentifier??'판 식별 ?'} · {claim.board?.ref??'판 인스턴스 ?'} · {claim.placement?.areaId??'영역 ?'} · {claim.placement?.anchorAddress??'위치 ?'} · 관측 점유 {claim.placement?.coveredAddresses?.join(', ')??'?'} · {claim.placement?.coverageComplete===true?'점유 전체 관측':'점유 부분/미확인'}{claim.source.partition==='player_public'&&!claim.boundOwnerId?' · 공개 개인판, 사람 미배정':''}</p>)}
  {s&&<><p>현재 방향 {spatialRotation(piece)??'?'}° · 반사 {spatialReflection(piece)===null?'?':spatialReflection(piece)?'있음':'없음'}</p>
   {!readonly&&<><label>방향 직접 수정<input aria-label="공간 방향 직접 수정" type="number" min={0} max={359.999} step="any" disabled={busy} value={spatialRotation(piece)??''} placeholder="?" onChange={e=>{const n=e.target.value===''?null:Number(e.target.value);if(n===null||Number.isFinite(n)&&n>=0&&n<360)onChange({...s,manualRotationDegrees:n});}}/></label>
   <label>반사 직접 수정<select aria-label="공간 반사 직접 수정" disabled={busy} value={spatialReflection(piece)===null?'unknown':String(spatialReflection(piece))} onChange={e=>onChange({...s,manualReflected:e.target.value==='unknown'?null:e.target.value==='true'})}><option value="unknown">?</option><option value="false">없음</option><option value="true">있음</option></select></label>
   {addresses&&<><label>기준 칸 직접 수정<select aria-label="공간 기준 칸 직접 수정" value={anchor?.address??''} disabled={busy} onChange={e=>onChange({...s,manualOverride:false,manualAnchor:addresses.find(a=>a.address===e.target.value)??null})}><option value="">?</option>{addresses.map(a=><option key={a.address} value={a.address}>{a.address}</option>)}</select></label>
   <label>보이는 점유 칸 직접 수정<select multiple size={4} aria-label="공간 점유 칸 직접 수정" disabled={busy} value={covered?.map(a=>a.address)??[]} onChange={e=>{const selected=new Set(Array.from(e.target.selectedOptions).map(o=>o.value));onChange({...s,manualOverride:false,manualCovered:addresses.filter(a=>selected.has(a.address)),manualCoverageComplete:false});}}>{addresses.map(a=><option key={a.address} value={a.address}>{a.address}</option>)}</select></label><button className="button text small-button" disabled={busy} onClick={()=>onChange({...s,manualCovered:null,manualCoverageComplete:null})}>점유 모름</button>
   <label>점유 범위<select aria-label="공간 점유 범위" disabled={busy} value={Object.hasOwn(s,'manualCoverageComplete')?String(s.manualCoverageComplete):String(s.placement?.coverageComplete??null)} onChange={e=>onChange({...s,manualCoverageComplete:e.target.value==='null'?null:e.target.value==='true'})}><option value="null">?</option><option value="false">일부만 확인</option><option value="true">전체 직접 확인</option></select></label></>}
   </>}
   {s.relations.length>0&&<ul>{s.relations.map((r,i)=><li key={i}>{r.fromId} {r.kind} {r.toId}{r.partial?' · 부분 순서/관계':''}</li>)}</ul>}
  </>}
 </div>;
}
