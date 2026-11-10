import {PhotoReference} from './PhotoReference';
import {SCENE_KIND_LABELS,SCENE_VARIANTS,type SceneKind} from '../shared/scene';
import {mapObservationRegion} from '../shared/photoGeometry';
import type {Assertion,Evidence,SessionView} from '../shared/types';
import {usePhotoDefinition} from './photoDefinitions';
import {PhotoObservationOverlay} from './PhotoObservationOverlay';
import {scanReviewValue} from './scanReviewValue';
/** Source observations stay separate from the linked physical inventory; nothing here requires confirmation. */
export function ScanObservationResults({view,ownerId,onEvidence}:{view:SessionView;ownerId?:string;onEvidence?:(photo:Evidence,region?:Assertion['region'])=>void}){
 const assertions=view.session.assertions.filter(a=>a.ownerId===ownerId),latest=assertions.flatMap(a=>a.observationReceipts??[]).filter(r=>r.scanBundle).at(-1),bundle=latest?.scanBundle;
 const {definition}=usePhotoDefinition(view.pack,!!bundle);
 if(!bundle)return null;
 const receipts=[...new Map(assertions.flatMap(a=>a.observationReceipts??[]).filter(r=>r.scanBundle?.plan.id===bundle.plan.id).map(r=>[r.scanUnitId,r])).values()];
 const photos=view.session.evidence.filter(p=>p.ownerId===ownerId&&p.scope===(ownerId?'player':'public'));
 return <>{(view.pack.runtime?.support.recording==='generic'||view.pack.id==='rummikub')&&<ScanUnresolvedGroups view={view} ownerId={ownerId} onEvidence={onEvidence}/>}<details className="lightweight-reader"><summary>읽은 값 · 사진 참고 · {bundle.units.filter(u=>u.state==='completed').length}/{bundle.plan.units.length}장 읽음</summary>
  <p className="small">읽은 값은 기록에, 나머지는 원사진에 남겨요. 수정 없이 저장할 수 있어요.</p>
  {bundle.plan.units.map((u,i)=>{
   const state=bundle.units.find(s=>s.unitId===u.id),r=receipts.find(r=>r.scanUnitId===u.id),photo=photos.find(p=>p.id===u.sourceEvidenceId);
   return <section key={u.id}>
    <p>{i+1}번째 사진 · {state?.state==='completed'?`관측 ${state.observationCount}건`:state?.state==='failed'?'읽기 실패 · 원본 보관':'중단 · 원본 보관'}{u.target?' · 선택 실물 보충':''}</p>

    {r&&definition?<PhotoObservationOverlay photos={photos} request={r.request} result={r.result} geometry={r.geometryCandidates} definition={definition} transforms={r.transforms} compact open={false}/>:photo?
     <details className="lightweight-reader is-result"><summary>사진 원본 보기</summary><div className="lw-photo-review"><img src={photo.url} alt={`${i+1}번째 사진 원본`} loading="lazy"/></div></details>:
     <p className="small muted">원본 사진을 찾을 수 없어요.</p>}
   </section>;
  })}
 </details></>;
}

/** In-flight receipts are source overlays only, never an accepted board or save payload. */
export function ScanProgressPreview({view,progress}:{view:SessionView;progress:import('../shared/analysisJobs').ScanProgress|null}){
 const {definition}=usePhotoDefinition(view.pack,!!progress);
 if(!progress||progress.captureEpoch!==view.session.captureEpoch)return null;
 const ready=progress.units.filter(u=>u.receipts?.length),first=ready[0]?.receipts?.[0],done=progress.units.filter(u=>['completed','failed','interrupted'].includes(u.state)).length;
 return <section className="scan-readout" aria-label="스캔 진행 관측" role="status"><p>사진 {done}/{progress.total}장 처리 · 판독 중인 부분 관측입니다. 최종 그림은 모두 처리한 뒤 반영돼요.{progress.job?.liveRows?` 지금까지 실물 ${progress.job.liveRows}개를 읽었어요.`:''}</p>
 {first&&definition?<PhotoObservationOverlay key={first.scanUnitId} photos={view.session.evidence.filter(e=>e.scope===(progress.ownerId?'player':'public')&&e.ownerId===progress.ownerId)} request={first.request} result={first.result} geometry={first.geometryCandidates} definition={definition} transforms={first.transforms} compact open/>:null}
 {progress.units.map(u=><p key={u.index}>{u.index+1}번째 사진 · {u.state==='pending'?'대기':u.state==='running'?'읽는 중':u.state==='completed'?'읽음':u.state==='failed'?'실패 · 원본 보관':'중단 · 원본 보관'}</p>)}
 </section>;
}

/** These are source relationships, not extra pieces; optional legacy metadata is never required for save. */
export function ScanUnresolvedGroups({view,ownerId,assertion,onEvidence}:{view:SessionView;ownerId?:string;assertion?:Assertion;onEvidence?:(photo:Evidence,region?:Assertion['region'])=>void}){
 const assertions=(assertion?[assertion]:view.session.assertions).filter(a=>a.ownerId===ownerId),all=assertions.flatMap(a=>a.observationReceipts??[]),latest=all.filter(r=>r.scanBundle).at(-1),bundle=latest?.scanBundle;
 const {definition}=usePhotoDefinition(view.pack,!!bundle);
 if(!bundle||bundle.plan.scope.ownerId!==(ownerId??null)||(!ownerId&&bundle.plan.scope.partition==='owner_private'))return null;
 const receipts=[...new Map(all.filter(r=>r.scanBundle?.plan.id===bundle.plan.id&&r.request.scope.ownerId===(ownerId??null)&&r.request.scope.captureEpoch===bundle.plan.scope.captureEpoch&&r.request.scope.partition===bundle.plan.scope.partition&&bundle.plan.units.some(u=>u.id===r.scanUnitId&&u.areaId===r.request.areaId)).map(r=>[r.scanUnitId,r])).values()];
 const groups=bundle.unresolvedGroups??bundle.links.filter(l=>!l.targetPieceId||l.status==='conflict').map((l,i)=>({id:bundle.plan.id+'-legacy-'+i,reason:l.members.length>1?'possible-same-object' as const:'unregistered-view' as const,members:l.members,relatedPieceIds:l.targetPieceId?[l.targetPieceId]:[]}));
 const photos=view.session.evidence.filter(p=>p.ownerId===ownerId&&p.scope===(ownerId?'player':'public'));
 const visibleGroups=groups.filter(g=>g.members.some(m=>receipts.some(r=>r.scanUnitId===m.unitId&&r.result.observations.some(o=>o.ref===m.observationRef))));
 if(!visibleGroups.length)return null;
 return <details className="lightweight-reader is-result" aria-label="사진 참고"><summary>사진 참고 · {visibleGroups.length}곳</summary>
 {visibleGroups.map(g=><div key={g.id}>{g.members.map(m=>{const receipt=receipts.find(r=>r.scanUnitId===m.unitId),o=receipt?.result.observations.find(o=>o.ref===m.observationRef);if(!receipt||!o)return null;
  const photo=photos.find(p=>p.id===receipt.request.images[o.imageIndex]?.evidenceId);let region:Assertion['region'];try{region=mapObservationRegion(o,receipt.request,receipt.transforms)??undefined;}catch{region=undefined;}
  const component=definition?.components.find(c=>c.id===o.componentId),values=Object.entries(o.properties).filter(([id,p])=>p.state==='observed').map(([id,p])=>{const field=component?.properties.find(f=>f.id===id);return `${field?.label??id}: ${scanReviewValue(p.value,field)}`;});
  return <div key={m.unitId+':'+m.observationRef}><strong>{SCENE_KIND_LABELS[o.componentId as SceneKind]??view.pack.runtime?.components.find(c=>c.id===o.componentId)?.name??'사진 참고'}</strong><PhotoReference photo={photo} region={region} onOpen={photo&&onEvidence?()=>onEvidence(photo,region):undefined}/>{values.length>0&&<p className="small">{values.join(' · ')}</p>}{o.quantity!==null&&<span className="small">관측 수량 {o.quantity}</span>}</div>;
 })}</div>)}
 </details>;
}

/** Optional provenance, including earlier jobs. Values remain in immutable receipts or the editable record. */
export function ScanFusionNotes({view,ownerId}:{view:SessionView;ownerId?:string}){
 const assertions=view.session.assertions.filter(a=>a.ownerId===ownerId),all=assertions.flatMap(a=>a.observationReceipts??[]),latest=all.filter(r=>r.scanBundle).at(-1),bundle=latest?.scanBundle;
 const {definition}=usePhotoDefinition(view.pack,!!bundle?.fusion);
 if(!bundle?.fusion||bundle.plan.scope.ownerId!==(ownerId??null)||bundle.plan.scope.partition!==latest!.request.scope.partition)return null;
 const receipts=all.filter(r=>r.request.scope.ownerId===(ownerId??null)&&r.request.scope.captureEpoch===bundle.plan.scope.captureEpoch&&r.request.scope.partition===bundle.plan.scope.partition&&r.request.definitionSHA===bundle.plan.definitionSHA&&bundle.plan.units.some(u=>u.areaId===r.request.areaId));
 const decisions=bundle.fusion.decisions.filter(d=>d.conflict||d.basis==='focused-provisional'),refinements=bundle.fusion.refinements,groupSurfaces=bundle.links.filter(l=>l.relation==='same-visible-group-surface');
 if(!decisions.length&&!refinements.length&&!groupSurfaces.length)return null;
 const resolve=(m:import('../shared/scanObservation').ScanMember)=>{const receipt=receipts.find(r=>r.scanUnitId===m.unitId),o=receipt?.result.observations.find(o=>o.ref===m.observationRef);return {receipt,o};};
 const show=(v:unknown):string=>scanReviewValue(v);
 const kind=(id:string|null|undefined)=>id?(view.pack.runtime?.components.find(c=>c.id===id)?.name??SCENE_KIND_LABELS[id as SceneKind]??'구성물'):'구성물';
 return <details className="lightweight-reader is-result" aria-label="사진별 값 선택 근거"><summary>사진별 다른 읽기 {decisions.length}건 · 부분 상세화 {refinements.length}건{groupSurfaces.length?` · 가시 묶음 표면 ${groupSurfaces.length}건`:''}</summary><p className="small">부분사진의 임시 선택과 다른 관측을 함께 보관합니다. 집합 관측은 상세 항목 수에 다시 더하지 않으며 남은 개수는 미확정입니다. 수정 없이 저장할 수 있어요.</p>
 {groupSurfaces.length>0&&<p className="small">같은 원사진의 가시 묶음 표면을 연결했어요. 숨은 구성과 총수량은 확인하지 않았어요.</p>}
 {decisions.map((d,i)=>{const members=[...(d.chosenMember?[d.chosenMember]:[]),...d.alternativeMembers],o=members.map(resolve).find(v=>v.o)?.o,property=d.fieldPath.startsWith('readout.values.')?d.fieldPath.slice(15):null,spec=definition?.components.find(c=>c.id===o?.componentId)?.properties.find(p=>p.id===property),label=spec?.label??({quantity:'수량',placement:'배치','$exists':'항목 유지',label:'이름'}as Record<string,string>)[d.fieldPath]??'기록값',piece=assertions.filter(a=>a.status==='accepted').flatMap(a=>(a.value as any)?.pieces??[]).find(p=>p.id===d.pieceId),value=property?piece?.readout?.values[property]:piece?.[d.fieldPath],display=(v:unknown)=>scanReviewValue(v,spec,known=>spec?.options?.find(o=>o.value===known)?.label??show(known));
 return <details key={d.pieceId+':'+d.fieldPath+':'+i}><summary>{kind(o?.componentId)} · {label}: {display(value)} · {d.basis==='user-protected'?'사용자 정정 유지':d.basis==='focused-provisional'?'부분사진 값 임시 선택':'다르게 읽음'}</summary><ul>{members.map(m=>{const {receipt,o}=resolve(m),claim=property?o?.properties[property]:null;return <li key={m.unitId+':'+m.observationRef}>{receipt?.scanBundle?.plan.id===bundle.plan.id?'이번':'이전'} 사진 관측 · {o?property?display(claim?.state==='observed'?claim.value:null):d.fieldPath==='quantity'?show(o.quantity):'원관측 보관':'원관측을 찾을 수 없어요.'}{d.chosenMember?.unitId===m.unitId&&d.chosenMember.observationRef===m.observationRef?' · 선택한 근거':''}</li>;})}</ul></details>;})}
 {refinements.map((r,i)=>{const o=resolve(r.aggregateMember).o;return <p className="small" key={i}>{kind(o?.componentId)} 집합 관측 수량 {show(o?.quantity)} · 개별 관측 {r.childMembers.length}건으로 일부 상세화 · 잔량 ? · 전체 판독 아님</p>;})}
 </details>;
}
