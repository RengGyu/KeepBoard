import type {Assertion,Evidence,Value} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {photoDrawingReference} from '../shared/drawingProjection';
/** A new answer revision is not a new physical piece. Rebase only source-proven live identities.
 * Candidate/deleted/foreign references keep their original (now unresolved) identity.
 */
export function rebaseEstimatedReferences(assertions:Assertion[],previous:Assertion|undefined,newId:string,newValue:Value,evidence:readonly Evidence[]):Assertion[]{
 if(!previous||previous.status!=='accepted'||previous.basis==='rule')return assertions;
 const old=(previous.value as any)?.version==='game-component-record-v1'?(previous.value as any).pieces as GenericPiece[]:[],next=(newValue as any)?.version==='game-component-record-v1'?(newValue as any).pieces as GenericPiece[]:[];
 const source=(a:Assertion,p:GenericPiece):string|null=>{const rs=(a.observationReceipts??[]).filter(r=>r?.request?.scope&&Array.isArray(r.result?.observations)&&Array.isArray(r.request.images)&&Array.isArray(r.transforms)&&r.componentRefs),refs=photoDrawingReference({...a,observationReceipts:rs},evidence,{componentIds:p.componentId?[p.componentId]:[]}),ref=refs.find(r=>r.pieceId===p.id),e=evidence.find(e=>e.id===ref?.position.evidenceId),defs=new Set(rs.filter(r=>Object.values(r.componentRefs).includes(p.id)).map(r=>r.request.definitionSHA));if(!ref||!e||defs.size!==1||JSON.stringify(ref.position.box)!==JSON.stringify(p.region))return null;return JSON.stringify([a.ownerId??null,ref.position.evidenceId,ref.position.sourceSHA,e.captureEpoch,[...defs][0]]);};
 const identities=new Map<string,string>();for(const p of old){const n=next.find(n=>n.id===p.id);if(!n||n.componentId!==p.componentId||n.evidenceId!==p.evidenceId||JSON.stringify(n.region)!==JSON.stringify(p.region)||JSON.stringify(n.spatial?.source)!==JSON.stringify(p.spatial?.source))continue;const pin=source(previous,p);if(pin)identities.set(p.id,pin);}
 if(!identities.size)return assertions;
 return assertions.map(a=>{if(a.status!=='accepted')return a;const value=a.value as any;if(value?.version!=='game-component-record-v1'||!Array.isArray(value.pieces))return a;let changed=false;
  const pieces=value.pieces.map((p:GenericPiece)=>{const q=p.structureOverride;if(q?.version!=='estimated-structure-override-v2'||!source(a,p)||source(a,p)!==q.sourceKey)return p;
   const rewrite=<T extends {assertionId:string;pieceId:string}>(ref:T):T=>{if(ref.assertionId!==previous.id||identities.get(ref.pieceId)!==q.sourceKey)return ref;changed=true;return {...ref,assertionId:newId};};
   const anchor=q.anchorRef?.kind==='live-piece'?rewrite(q.anchorRef):q.anchorRef,attached=q.attachedToRef?rewrite(q.attachedToRef):q.attachedToRef,before=q.beforeRefs?.map(rewrite);return changed?{...p,structureOverride:{...q,...(anchor===undefined?{}:{anchorRef:anchor}),...(attached===undefined?{}:{attachedToRef:attached}),...(before===undefined?{}:{beforeRefs:before})}}:p;});
  return changed?{...a,value:{...value,pieces}}:a;
 });
}
