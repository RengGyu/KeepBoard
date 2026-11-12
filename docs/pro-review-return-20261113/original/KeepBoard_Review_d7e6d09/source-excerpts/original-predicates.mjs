/** Isolated predicates from the pinned commit, wrapped for synthetic reproduction.
 * The side helper models its nondegenerate branch only; it is not the complete estimator.
 * This is NOT a replacement build of KeepBoard. Inputs below are synthetic.
 * Sources: shared/estimatedBoardStructure.ts nearAnchor/manual-reference branch;
 * src/EstimatedBoardView.tsx roots/renderWithAttachments.
 */
const centre=b=>({x:b.x+b.width/2,y:b.y+b.height/2});
const inside=(b,p)=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
const sort=(a,b)=>a<b?-1:a>b?1:0;
export function nearAnchor(n,anchors){
 const p=centre(n.box),insideAnchors=anchors.filter(a=>inside(a.box,p));if(insideAnchors.length>1)return;
 const distance=(a)=>{const c=centre(a.box);return Math.hypot((p.x-c.x)*n.aspect,p.y-c.y);},rank=anchors.map(a=>({a,d:distance(a)})).sort((a,b)=>a.d-b.d||sort(a.a.item.pieceId,b.a.item.pieceId));
 if(!rank.length||rank[0].d>Math.hypot(rank[0].a.box.width*n.aspect,rank[0].a.box.height)*1.5)return;
 if(rank[1]&&rank[1].d-rank[0].d<=Math.hypot(n.box.width*n.aspect,n.box.height)/2)return;
 return rank[0].a;
}
export function originalManualReference(items,a,p,id){return items.some(i=>i.pieceId===id&&i.assertionId===a.id&&i.value.evidenceId===p.evidenceId);}
export function originalVisibleAttachmentIds(placements){
 const ids=new Set(placements.map(p=>p.pieceId));
 const roots=placements.filter(p=>!p.attachedToPieceId||!ids.has(p.attachedToPieceId));
 // Original renderWithAttachments calls render(child), NOT renderWithAttachments(child).
 return roots.flatMap(p=>[p.pieceId,...placements.filter(c=>c.attachedToPieceId===p.pieceId&&c.pieceId!==p.pieceId).map(c=>c.pieceId)]);
}
export function originalDiscardGroup(sourceKey,color){return JSON.stringify([sourceKey,'discard',JSON.stringify(['discard',color])]);}
// Signed-side calculation isolated from the LC branch; verified against source.
export function imageCentreSide(lineOrigin,lineAxis,point,aspect=1){
 const normal={x:-lineAxis.y,y:lineAxis.x};
 const signed=(point.x-lineOrigin.x)*normal.x+(point.y-lineOrigin.y)*normal.y;
 const toward=(.5*aspect-lineOrigin.x)*normal.x+(.5-lineOrigin.y)*normal.y;
 return signed*toward>=0?'near':'far';
}
