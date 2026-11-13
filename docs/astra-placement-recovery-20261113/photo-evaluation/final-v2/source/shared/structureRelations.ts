import type {GenericPiece} from './genericRecord';
import type {DrawingItem} from './drawingProjection';
import type {ObservationBox,ObservationReceipt} from './lightweightRecognition';
import {mapObservationRegion} from './photoGeometry';
import {frameFromCorners,projectBoardPoint,footprintContact,type Point,type BoardCorners} from './estimatedGeometry';
export interface StructurePieceRef {assertionId:string;pieceId:string}
export type StructureAnchorRef=({kind:'live-piece'}&StructurePieceRef)|{kind:'observed-board';taskId:string;boardInstanceRef:string};
export type StructureBasis='manual'|'canonical'|'observed-relation'|'estimated'|'unknown';
export interface StructureNode {item:DrawingItem;piece:GenericPiece;box:ObservationBox;sourceKey:string;aspect:number;sourceAreaId:string|null;field:string;receipts:ObservationReceipt[]}
export interface StructureBoard {ref:StructureAnchorRef;sourceKey:string;box:ObservationBox;piece:StructureNode|null;aliases:string[];areaIds:string[];orientationDegrees:number|null;frame:{matrix:number[];basis:'manual-frame'}|null;frameConflict?:boolean;identityBasis?:'estimated'}
export interface VisibleStructureRelation {from:StructurePieceRef;to:StructurePieceRef|StructureAnchorRef;kind:string;partial:boolean;basis:StructureBasis}
export const structureIdentity=(r:StructurePieceRef)=>JSON.stringify([r.assertionId,r.pieceId]);
export const anchorIdentity=(r:StructureAnchorRef)=>JSON.stringify(r.kind==='live-piece'?[r.kind,r.assertionId,r.pieceId]:[r.kind,r.taskId,r.boardInstanceRef]);
export const pieceRef=(n:StructureNode):StructurePieceRef=>({assertionId:n.item.assertionId,pieceId:n.item.pieceId});
const centre=(b:ObservationBox)=>({x:b.x+b.width/2,y:b.y+b.height/2});
const sameRef=(a:StructureAnchorRef,b:StructureAnchorRef)=>anchorIdentity(a)===anchorIdentity(b);
const intersection=(a:ObservationBox,b:ObservationBox)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const sameBoardRegion=(a:ObservationBox,b:ObservationBox)=>intersection(a,b)/(a.width*a.height+b.width*b.height-intersection(a,b))>=.95;
const footprint=(box:ObservationBox,aspect:number)=>({id:'',x:(box.x+box.width/2)*aspect,y:box.y+box.height/2,width:box.width*aspect,height:box.height});
/** Explicit role only. A loose/unknown card back cannot bridge two player areas. */
export function wonderCardRole(n:StructureNode):'tableau'|'stages'|null{
 if(n.piece.componentId!=='age-cards')return null;
 if(['city','tableau'].includes(n.sourceAreaId??'')||!n.sourceAreaId&&['city.scene','tableau.scene'].includes(n.field))return 'tableau';
 if(['wonder-area','wonder','stages','construction'].includes(n.sourceAreaId??'')||!n.sourceAreaId&&['wonder.scene','stages.scene'].includes(n.field))return 'stages';
 return null;
}
function cardBandRole(n:StructureNode):string|null{
 if(n.piece.componentId==='age-cards')return wonderCardRole(n);
 return n.piece.componentId==='cards'&&n.field!=='discard.scene'&&(n.sourceAreaId==='expeditions'||!n.sourceAreaId&&n.field==='expeditions.scene')?'expedition':null;
}
/** Board-edge evidence for an explicitly classified card. AABB contact stays an
 * estimate; tokens, unknown-role cards and distant occluded bands get no fallback. */
function cardBoundaryBoards(n:StructureNode,boards:readonly StructureBoard[]):StructureBoard[]{
 if(!wonderCardRole(n)||(n.piece.quantity??1)>1)return [];
 return boards.filter(b=>b.sourceKey===n.sourceKey&&b.piece?.piece.componentId==='wonder').filter(b=>{
  const c=footprintContact(footprint(n.box,n.aspect),footprint(b.box,n.aspect));
  return c.overlap>=.2||c.edgeGap!==null&&c.edgeGap<=.5;
 });
}
export function collectStructureBoards(nodes:readonly StructureNode[]):StructureBoard[]{
 const out:StructureBoard[]=[];
 for(const n of nodes.filter(n=>['board','wonder','windows'].includes(n.piece.componentId??''))){const q=n.piece.structureOverride,manual=q?.version==='estimated-structure-override-v2'&&q.active!==false&&q.sourceKey===n.sourceKey?q.frame:null,matrix=manual&&frameFromCorners(manual.corners);const degrees=n.receipts.flatMap(r=>r.result.observations.filter(o=>r.componentRefs[o.ref]===n.piece.id).map(o=>o.rotationDegrees)).filter((v):v is number=>v!==null&&v!==undefined);out.push({ref:{kind:'live-piece',...pieceRef(n)},sourceKey:n.sourceKey,box:n.box,piece:n,aliases:n.piece.spatial?.board?[n.piece.spatial.board.ref]:[],areaIds:n.piece.spatial?.board?.templateAreaIds??[],orientationDegrees:new Set(degrees).size===1?degrees[0]:n.piece.spatial?.board?.orientationDegrees??null,frame:matrix?{matrix,basis:'manual-frame'}:null});}
 const seen=new Set<string>();for(const n of nodes)for(const r of n.receipts){const sk=n.sourceKey+'|'+r.request.taskId;if(seen.has(sk))continue;seen.add(sk);for(const b of r.result.spatial?.boardInstances??[]){if(!b.sourceRegion)continue;let box:ObservationBox|null=null;try{box=mapObservationRegion({ref:'board-geometry',imageIndex:b.imageIndex,panelRef:b.panelRef,bbox:b.sourceRegion} as any,r.request,r.transforms);}catch{}if(!box)continue;
  const source=JSON.parse(n.sourceKey),image=r.request.images[b.imageIndex],transform=image?.transformId?r.transforms.find(t=>t.transformId===image.transformId&&t.inputSHA===image.sha256):undefined;if(!image||image.evidenceId!==source[1]||(r.sourceImageSHA??transform?.sourceSHA??image.sha256)!==source[2]||r.request.definitionSHA!==source[4]||r.request.scope.captureEpoch!==source[3])continue;
  const alias=r.request.taskId+':'+b.ref,live=out.filter(a=>a.sourceKey===n.sourceKey&&a.aliases.includes(alias));if(live.length===1)continue;
  // A deleted live board observation is not resurrected via its retained receipt.
  const knownBoardObservations=r.result.observations.filter(o=>['board','wonder','windows'].includes(o.componentId??'')&&r.result.spatial?.placements.some(p=>p.observationRef===o.ref&&p.boardInstanceRef===b.ref));if(knownBoardObservations.some(o=>!nodes.some(v=>v.sourceKey===n.sourceKey&&v.piece.id===r.componentRefs[o.ref])))continue;
  // Some receipts include both a literal board and an unbound boardInstance. Only
  // a reciprocal unique match within this very receipt can supply its missing alias.
  const mapped=(o:Parameters<typeof mapObservationRegion>[0])=>{try{return mapObservationRegion(o,r.request,r.transforms);}catch{return null;}},observations=r.result.observations.filter(o=>['board','wonder','windows'].includes(o.componentId??'')&&r.request.images[o.imageIndex]?.evidenceId===source[1]&&(()=>{const region=mapped(o);return !!region&&sameBoardRegion(region,box!);})()),equivalent=out.filter(a=>a.sourceKey===n.sourceKey&&a.piece&&observations.some(o=>r.componentRefs[o.ref]===a.piece!.piece.id)&&sameBoardRegion(a.box,box!));
  if(observations.length===1&&equivalent.length===0&&!nodes.some(v=>v.sourceKey===n.sourceKey&&v.piece.id===r.componentRefs[observations[0].ref]))continue;
  if(!live.length&&observations.length===1&&equivalent.length===1){const candidate=equivalent[0],twins=(r.result.spatial?.boardInstances??[]).filter(other=>r.request.images[other.imageIndex]?.evidenceId===source[1]&&other.sourceRegion&&(()=>{const region=mapped({ref:'board-geometry',imageIndex:other.imageIndex,panelRef:other.panelRef,bbox:other.sourceRegion} as any);return !!region&&sameBoardRegion(candidate.box,region);})()),conflict=candidate.aliases.some(a=>a.startsWith(r.request.taskId+':')&&a!==alias)||r.result.spatial?.placements.some(p=>p.observationRef===observations[0].ref&&p.boardInstanceRef&&p.boardInstanceRef!==b.ref)||(candidate.orientationDegrees!=null&&b.orientationDegrees!=null&&Math.abs(candidate.orientationDegrees-b.orientationDegrees)%360>1e-6);
   if(twins.length===1&&!conflict){candidate.aliases.push(alias);candidate.identityBasis='estimated';candidate.areaIds=[...new Set([...candidate.areaIds,...b.templateAreaIds??[]])];candidate.orientationDegrees??=b.orientationDegrees;continue;}
  }
  out.push({ref:{kind:'observed-board',taskId:r.request.taskId,boardInstanceRef:b.ref},sourceKey:n.sourceKey,box,piece:null,aliases:[alias],areaIds:b.templateAreaIds,orientationDegrees:b.orientationDegrees,frame:null});
 }}
 for(const n of nodes){const q=n.piece.structureOverride;if(q?.version!=='estimated-structure-override-v2'||q.active===false||q.sourceKey!==n.sourceKey||!q.frame||!q.anchorRef)continue;const b=out.find(b=>b.sourceKey===n.sourceKey&&sameRef(b.ref,q.anchorRef!));if(!b)continue;const matrix=frameFromCorners(q.frame.corners);if(matrix){if(b.frame&&JSON.stringify(b.frame.matrix)!==JSON.stringify(matrix))b.frameConflict=true;b.frame=b.frameConflict?null:{matrix,basis:'manual-frame'};}}
 return out;
}
export function collectVisibleRelations(nodes:readonly StructureNode[],boards:readonly StructureBoard[]):VisibleStructureRelation[]{
 const out:VisibleStructureRelation[]=[],seen=new Set<string>();const target=(n:StructureNode,r:ObservationReceipt,ref:string):StructurePieceRef|StructureAnchorRef|null=>{const id=r.componentRefs[ref],live=nodes.filter(v=>v.sourceKey===n.sourceKey&&v.piece.id===id);if(live.length===1)return pieceRef(live[0]);if(live.length>1)return null;const bs=boards.filter(b=>b.sourceKey===n.sourceKey&&b.aliases.includes(r.request.taskId+':'+ref));return bs.length===1?bs[0].ref:null;};
 for(const n of nodes)for(const r of n.receipts){const key=n.sourceKey+'|'+r.request.taskId;if(seen.has(key))continue;seen.add(key);for(const relation of r.result.spatial?.relations??[]){const from=target(n,r,relation.fromRef),to=target(n,r,relation.toRef);if(from&&!('kind'in from)&&to)out.push({from,to,kind:relation.kind,partial:relation.partial,basis:'observed-relation'});}}
 for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];if(a.sourceKey!==b.sourceKey||a.piece.componentId!==b.piece.componentId||!['age-cards','cards'].includes(a.piece.componentId??'')||(a.piece.quantity??1)>1||(b.piece.quantity??1)>1)continue;const roleA=cardBandRole(a),roleB=cardBandRole(b);if(roleA!==roleB||a.piece.componentId==='cards'&&!roleA)continue;const overlap=intersection(a.box,b.box),fraction=roleA? .2:.5;if(overlap>=Math.min(a.box.width*a.box.height,b.box.width*b.box.height)*fraction)out.push({from:pieceRef(a),to:pieceRef(b),kind:'overlap-component',partial:true,basis:'estimated'});}
 return [...new Map(out.map(r=>[JSON.stringify(r),r])).values()];
}
export function resolveStructureAnchor(node:StructureNode,nodes:readonly StructureNode[],boards:readonly StructureBoard[],relations:readonly VisibleStructureRelation[]):{anchor:StructureBoard|null;basis:StructureBasis;candidates:StructureAnchorRef[];reason:string|null}{
 const candidates=boards.filter(b=>b.sourceKey===node.sourceKey),direct=new Map<string,StructureBoard>();const add=(b:StructureBoard)=>direct.set(anchorIdentity(b.ref),b);
 const stored=node.piece.spatial;if(stored&&stored.source.imageSHA===JSON.parse(node.sourceKey)[2]&&stored.source.captureEpoch===JSON.parse(node.sourceKey)[3]&&stored.source.photoDefinitionSHA===JSON.parse(node.sourceKey)[4]&&stored.placement?.boardInstanceRef)for(const b of candidates)if(b.aliases.includes(stored.placement.boardInstanceRef))add(b);
 for(const r of node.receipts)for(const p of r.result.spatial?.placements??[]){if(r.componentRefs[p.observationRef]!==node.piece.id||!p.boardInstanceRef)continue;for(const b of candidates)if(b.aliases.includes(r.request.taskId+':'+p.boardInstanceRef))add(b);}
 for(const r of relations.filter(r=>structureIdentity(r.from)===structureIdentity(pieceRef(node))&&['on','attached-to'].includes(r.kind))){for(const b of candidates)if('kind'in r.to?sameRef(r.to,b.ref):b.piece&&structureIdentity(pieceRef(b.piece))===structureIdentity(r.to))add(b);}
 if(direct.size===1)return {anchor:[...direct.values()][0],basis:stored?.resolved?'canonical':[...direct.values()][0].identityBasis??'observed-relation',candidates:[...direct.values()].map(b=>b.ref),reason:null};if(direct.size>1)return {anchor:null,basis:'unknown',candidates:[...direct.values()].map(b=>b.ref),reason:'conflicting-observed-anchors'};
 const within=candidates.filter(b=>intersection(b.box,node.box)>=node.box.width*node.box.height*.75&&(!b.piece||structureIdentity(pieceRef(b.piece))!==structureIdentity(pieceRef(node))));
 // Propagate only a physical connected component with one supported board. Distance is not membership.
 const connected=new Set([structureIdentity(pieceRef(node))]);let changed=true;while(changed){changed=false;for(const r of relations.filter(r=>['same-visible-stack','covers','attached-to','overlap-component'].includes(r.kind)&&!('kind'in r.to))){const a=structureIdentity(r.from),b=structureIdentity(r.to as StructurePieceRef);if(connected.has(a)&&!connected.has(b)){connected.add(b);changed=true;}if(connected.has(b)&&!connected.has(a)){connected.add(a);changed=true;}}}
 let inferredSeed=false;const seeds=new Map<string,StructureBoard>();if(connected.size>1)for(const peer of nodes.filter(n=>n.sourceKey===node.sourceKey&&connected.has(structureIdentity(pieceRef(n))))){const containment=candidates.filter(b=>intersection(b.box,peer.box)>=peer.box.width*peer.box.height*.75),peerSeeds=new Map<string,StructureBoard>();const id=peer.piece.spatial?.placement?.boardInstanceRef;for(const b of candidates)if(id&&b.aliases.includes(id))peerSeeds.set(anchorIdentity(b.ref),b);for(const receipt of peer.receipts)for(const placement of receipt.result.spatial?.placements??[])if(receipt.componentRefs[placement.observationRef]===peer.piece.id&&placement.boardInstanceRef)for(const b of candidates)if(b.aliases.includes(receipt.request.taskId+':'+placement.boardInstanceRef))peerSeeds.set(anchorIdentity(b.ref),b);for(const r of relations.filter(r=>structureIdentity(r.from)===structureIdentity(pieceRef(peer))&&['on','attached-to'].includes(r.kind)))for(const b of candidates)if('kind'in r.to?sameRef(r.to,b.ref):b.piece&&structureIdentity(pieceRef(b.piece))===structureIdentity(r.to))peerSeeds.set(anchorIdentity(b.ref),b);if(!peerSeeds.size){inferredSeed=true;for(const b of [...containment,...cardBoundaryBoards(peer,candidates)])peerSeeds.set(anchorIdentity(b.ref),b);}for(const [id,b]of peerSeeds)seeds.set(id,b);}
 if(seeds.size===1)return {anchor:[...seeds.values()][0],basis:inferredSeed||[...seeds.values()][0].identityBasis==='estimated'||relations.some(r=>r.basis==='estimated'&&connected.has(structureIdentity(r.from))&&'pieceId'in r.to&&connected.has(structureIdentity(r.to)))?'estimated':'observed-relation',candidates:[...seeds.values()].map(b=>b.ref),reason:null};if(seeds.size>1)return {anchor:null,basis:'unknown',candidates:[...seeds.values()].map(b=>b.ref),reason:'component-crosses-board-boundary'};
 if(within.length===1)return {anchor:within[0],basis:'estimated',candidates:[within[0].ref],reason:null};if(within.length>1)return {anchor:null,basis:'unknown',candidates:within.map(b=>b.ref),reason:'overlapping-board-regions'};
 const boundary=new Map<string,StructureBoard>();for(const peer of nodes.filter(n=>n.sourceKey===node.sourceKey&&connected.has(structureIdentity(pieceRef(n)))))for(const b of cardBoundaryBoards(peer,candidates))boundary.set(anchorIdentity(b.ref),b);
 if(boundary.size===1)return {anchor:[...boundary.values()][0],basis:'estimated',candidates:[...boundary.values()].map(b=>b.ref),reason:null};if(boundary.size>1)return {anchor:null,basis:'unknown',candidates:[...boundary.values()].map(b=>b.ref),reason:'competing-board-boundary-contacts'};
 const c=centre(node.box);return {anchor:null,basis:'unknown',candidates:[...candidates].sort((a,b)=>Math.hypot(centre(a.box).x-c.x,centre(a.box).y-c.y)-Math.hypot(centre(b.box).x-c.x,centre(b.box).y-c.y)).map(b=>b.ref),reason:'no-supported-board-relation'};
}
export function boardLocalPoint(board:StructureBoard,point:Point):{x:number;y:number;basis:'manual-frame'}|null{return board.frame?((q)=>q?{...q,basis:'manual-frame' as const}:null)(projectBoardPoint(board.frame.matrix,point)):null;}
/** Borrow a display lane, never a read value. Unlabelled bands must touch exactly
 * one labelled connected band; two disconnected bands of the same color still compete. */
export function inferDisplayLaneLabels(nodes:readonly {id:string;label:string|null}[],edges:readonly [string,string][]):Map<string,string>{
 const labels=new Map(nodes.map(n=>[n.id,n.label])),adjacent=new Map(nodes.map(n=>[n.id,new Set<string>()]));
 for(const [a,b]of edges)if(adjacent.has(a)&&adjacent.has(b)){adjacent.get(a)!.add(b);adjacent.get(b)!.add(a);}
 const component=new Map<string,string>(),members=new Map<string,string[]>();
 for(const n of nodes){if(component.has(n.id))continue;const group=[n.id];component.set(n.id,n.id);for(let i=0;i<group.length;i++)for(const other of adjacent.get(group[i])!)if(!component.has(other)&&labels.get(other)===n.label){component.set(other,n.id);group.push(other);}members.set(n.id,group);}
 const inferred=new Map<string,string>();
 for(const [id,group]of members){if(labels.get(id)!==null)continue;const targets=new Set<string>();for(const member of group)for(const other of adjacent.get(member)!)if(labels.get(other)!==null)targets.add(component.get(other)!);if(targets.size===1){const label=labels.get([...targets][0])!;for(const member of group)inferred.set(member,label);}}
 return inferred;
}
export function partialStructureOrder(ids:readonly string[],edges:readonly [string,string][]):{levels:string[][];unresolved:string[];rejected:[string,string][];totalOrderKnown:boolean}{
 const pending=new Set(ids),graph=new Map([...pending].map(id=>[id,new Set<string>()])),indegree=new Map([...pending].map(id=>[id,0])),rejected:[string,string][]=[];
 for(const [a,b]of edges){if(!pending.has(a)||!pending.has(b)||a===b){rejected.push([a,b]);continue;}if(!graph.get(a)!.has(b)){graph.get(a)!.add(b);indegree.set(b,indegree.get(b)!+1);}}
 const levels:string[][]=[];while(pending.size){const ready=[...pending].filter(id=>indegree.get(id)===0).sort();if(!ready.length)break;levels.push(ready);for(const id of ready){pending.delete(id);for(const to of graph.get(id)!)indegree.set(to,indegree.get(to)!-1);}}
 return {levels,unresolved:[...pending].sort(),rejected,totalOrderKnown:!pending.size&&!rejected.length&&levels.every(l=>l.length===1)};
}
