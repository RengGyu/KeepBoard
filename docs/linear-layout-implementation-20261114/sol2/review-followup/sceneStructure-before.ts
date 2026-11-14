import type {Assertion,Evidence,GamePack} from './types';
import type {ObservationReceipt} from './lightweightRecognition';
import {validateStoredSceneReading} from './sceneReading';
import {validateSpatialResult,type SpatialResult} from './spatialObservation';
import {sceneCanonical,sceneDigest} from './restorationIdentity';
import {partialStructureOrder} from './structureRelations';
import {sceneClaim} from './restorationScene';
import type {SceneEntity,ScenePartitionState,SceneRelation} from './restorationScene';
/** Index by full proven observation identity, never by a naked pieceId or receipt-only object. */
export function collectSceneContexts(assertions:Assertion[],entities:SceneEntity[],scopeKey:string,evidence:Evidence[],pack:GamePack){
 const receipts=new Map<string,ObservationReceipt[]>();
 for(const a of assertions)for(const r of a.observationReceipts??[]){if(!r?.request?.scope||!Array.isArray(r.request.images)||!Array.isArray(r.transforms)||!Array.isArray(r.result?.observations)||!r.componentRefs||(r.request.scope.ownerId??'public')!==scopeKey||r.request.packId!==pack.id||r.request.sourceSHA!==(pack.runtime?.source.sha256??null))continue;
  const id=sceneCanonical([r.request.taskId,r.request.definitionSHA,r.request.scope,r.request.images,r.transforms]);const rows=receipts.get(id)??[];rows.push(r);receipts.set(id,rows);
 }
 return [...receipts.values()].map(rows=>{const receipt=rows[0],r=receipt,versions=new Set(rows.map(r=>sceneCanonical({scene:r.result.scene,spatial:r.result.spatial}))),get=(ref:string)=>{
  const o=r.result.observations.find(o=>o.ref===ref),image=o&&r.request.images[o.imageIndex],photo=image&&evidence.find(e=>e.id===image.evidenceId);if(!o||!image||!photo||photo.captureEpoch!==r.request.scope.captureEpoch||photo.ownerId&&photo.ownerId!==r.request.scope.ownerId)return;
  const t=image.transformId?r.transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256):undefined;if(image.transformId&&!t||r.sourceImageSHA&&t&&r.sourceImageSHA!==t.sourceSHA)return;
  const sha=r.sourceImageSHA??t?.sourceSHA??image.sha256,found=entities.filter(e=>e.observations.some(n=>n.taskId===r.request.taskId&&n.observationRef===ref&&n.evidenceId===image.evidenceId&&n.sourceSHA===sha&&n.captureEpoch===r.request.scope.captureEpoch&&n.definitionSHA===r.request.definitionSHA));const pieceIds=new Set(rows.flatMap(row=>{const id=row.componentRefs[ref];return id&&found.some(e=>e.bindings.some(b=>b.pieceId===id))?[id]:[];}));return found.length===1&&pieceIds.size===1?found[0]:undefined;
 };let scene:typeof r.result.scene;try{if(versions.size===1&&r.result.scene)scene=validateStoredSceneReading(r.result.scene,r.request,r.result,r.transforms);}catch{/* Invalid optional structure cannot remove literals. */}
 let spatial:SpatialResult|undefined;try{if(versions.size===1&&r.result.spatial){const {deferred,...wire}=r.result.spatial;spatial=validateSpatialResult(wire,r.request,r.result);}}catch{/* Optional invalid relations remain unavailable. */}return {receipt,get,scene,spatial,conflict:versions.size!==1};});
}
/** Observed source-qualified order is a partial order; unrelated nodes are not a physical total order. */
export function resolveSceneOrder(p:ScenePartitionState){
 const precedes=p.relations.filter(r=>r.kind==='precedes'),known=new Set<string>(),edges:[string,string][]=[];
 for(const r of precedes){known.add(r.from);known.add(r.to);edges.push([r.from,r.to]);}
 for(const g of p.groups)for(const r of g.physicalOrder){known.add(r.before);known.add(r.after);edges.push([r.before,r.after]);}
 const all=partialStructureOrder([...known],edges),cycle=new Set(all.unresolved);
 p.plan.unsatisfiedRelationIds=[...new Set([...p.plan.unsatisfiedRelationIds,...precedes.filter(r=>cycle.has(r.from)||cycle.has(r.to)).map(r=>r.id)])];
 for(const g of p.groups){const ids=new Set(g.entityIds),supported=edges.filter(([a,b])=>ids.has(a)&&ids.has(b)),seen=new Set(g.physicalOrder.map(e=>sceneCanonical([e.before,e.after])));for(const [a,b]of supported){const key=sceneCanonical([a,b]);if(!seen.has(key)){g.physicalOrder.push({before:a,after:b,claimId:'order:'+sceneDigest(key).slice(0,24)});seen.add(key);}}
  const involved=g.entityIds.filter(id=>known.has(id));if(!involved.length)continue;
  // Global levels preserve cross-group constraints without merging groups or assigning unknown nodes.
  const levels=all.levels.map(level=>level.filter(id=>ids.has(id))).filter(level=>level.length),unresolved=g.entityIds.filter(id=>!known.has(id)||cycle.has(id));g.presentation={slots:[],...g.presentation,orderLevels:levels,orderUnresolved:unresolved};p.plan.displayEntityOrder[g.id]=[...levels.flat(),...unresolved];
 }
}
export function spatialSceneRelations(contexts:ReturnType<typeof collectSceneContexts>):SceneRelation[]{
 const out:SceneRelation[]=[];for(const c of contexts){if(c.conflict)continue;for(const r of c.spatial?.relations??[]){const a=c.get(r.fromRef),b=c.get(r.toRef);if(!a||!b||a.id===b.id)continue;const kind=r.kind==='before'?'precedes':r.kind==='covers'?'overlaps':r.kind;if(!['precedes','overlaps','attached-to','same-visible-stack','adjacent-to'].includes(kind))continue;const id='spatial-relation:'+sceneDigest([c.receipt.request.taskId,kind,a.id,b.id]).slice(0,32);out.push({id,kind:kind as SceneRelation['kind'],from:a.id,to:b.id,claim:sceneClaim(id+':claim',true,'observation',a.observations.map(ref=>({kind:'observation' as const,ref})))} as SceneRelation);}}
 return [...new Map(out.map(r=>[r.id,r])).values()];
}
