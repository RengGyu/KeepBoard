import type {Assertion,Evidence} from './types';import type {GenericPiece} from './genericRecord';import type {DrawingItem} from './drawingProjection';
import {projectGenericDrawing,photoDrawingReference} from './drawingProjection';import {mapObservationRegion} from './photoGeometry';import type {ObservationBox,ObservationReceipt} from './lightweightRecognition';
import {sourceLine,expeditionColor,diceLattice} from './estimatedGeometry';
import {resolveEstimatedReference,type EstimatedReferenceRecord} from './estimatedStructureSafety';
import {ESTIMATED_AREAS} from './estimatedStructureOverride';import {estimatedBoardMetrics,type EstimatedBoardMetrics} from './estimatedBoardMetrics';
export type {EstimatedStructureOverride} from './estimatedStructureOverride';export {ESTIMATED_AREAS,estimatedBoardMetrics};
export type EstimatedBoardGrid={rows:4;columns:5;rowAxis:{x:number;y:number};orientation:'source-order-not-printed';basis:'observed-dice-lattice'}|{rows:4;columns:5;rowAxis:null;orientation:'unknown';basis:'manual-slot-order'};
export interface EstimatedBoardGroup {id:string;areaId:string;label:string;sourceKey:string;anchorPieceId:string|null;side:'near'|'far'|null;color:string|null;axis:{x:number;y:number}|null;slots:number[];role?:'discard'|'expedition'|'window-grid';grid?:EstimatedBoardGrid}
export interface EstimatedBoardPlacement {assertionId:string;pieceId:string;areaId:string;groupId:string;order:number;slot:number|null;anchorPieceId:string|null;attachedToPieceId:string|null;basis:'estimated'|'manual';cell?:{row:number;column:number};notes:string[]}
export interface EstimatedBoardStructure {version:'estimated-board-structure-v1';gameId:string;areas:{id:string;label:string;status:'empty'|'estimated'|'retained'|'unresolved';total:number;placed:number;unassigned:number;notes:string[]}[];groups:EstimatedBoardGroup[];placements:EstimatedBoardPlacement[];retained:DrawingItem[];unassigned:{assertionId:string;pieceId:string;reason:string}[];metrics:EstimatedBoardMetrics}
type Node={item:DrawingItem;piece:GenericPiece;box:ObservationBox;sourceKey:string;aspect:number;sourceAreaId:string|null;field:string;receipts:ObservationReceipt[]};
const identity=(i:Pick<DrawingItem,'assertionId'|'pieceId'>)=>JSON.stringify([i.assertionId,i.pieceId]);
const values=(n:Node)=>n.piece.readout&&'values'in n.piece.readout?n.piece.readout.values:{};
const literal=(n:Node,id:string)=>typeof values(n)[id]==='string'?String(values(n)[id]):null;
const centre=(b:ObservationBox)=>({x:b.x+b.width/2,y:b.y+b.height/2});
const validBox=(b:any):b is ObservationBox=>!!b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=1.00000001&&b.y+b.height<=1.00000001;
const overlap=(a:ObservationBox,b:ObservationBox)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
const inside=(b:ObservationBox,p:{x:number;y:number})=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height;
const sort=(a:string,b:string)=>a<b?-1:a>b?1:0;
const axis=(b:ObservationBox,aspect:number)=>b.width*aspect>=b.height?{x:1,y:0}:{x:0,y:1};
const along=(n:Node,a:{x:number;y:number})=>{const c=centre(n.box);return c.x*n.aspect*a.x+c.y*a.y;};
const areaForKind=(game:string,kind:string|null)=>game==='lost-cities'?(kind==='board'?'board':kind==='cards'?'expeditions':'unclassified'):game==='seven-wonders'?(kind==='wonder'?'wonder':kind==='age-cards'?'tableau':kind==='coins'?'coins':kind==='military'?'military':'unclassified'):(kind==='windows'?'window':kind==='tokens'?'favors':kind==='dice'?'round-track':kind==='cards'?'tools':'unclassified');
function scopeReceipts(a:Assertion){return (a.observationReceipts??[]).filter(r=>r?.request?.scope&&Array.isArray(r.request.images)&&Array.isArray(r.result?.observations)&&r.componentRefs&&Array.isArray(r.transforms));}
/** Physical source distance, with an ambiguity band set by the candidate's own footprint. */
function nearAnchor(n:Node,anchors:Node[]):Node|undefined{
 const p=centre(n.box),insideAnchors=anchors.filter(a=>inside(a.box,p));if(insideAnchors.length>1)return;
 const distance=(a:Node)=>{const c=centre(a.box);return Math.hypot((p.x-c.x)*n.aspect,p.y-c.y);},rank=anchors.map(a=>({a,d:distance(a)})).sort((a,b)=>a.d-b.d||sort(a.a.item.pieceId,b.a.item.pieceId));
 if(!rank.length||rank[0].d>Math.hypot(rank[0].a.box.width*n.aspect,rank[0].a.box.height)*1.5)return;
 if(rank[1]&&rank[1].d-rank[0].d<=Math.hypot(n.box.width*n.aspect,n.box.height)/2)return;
 return rank[0].a;
}
function scopedGroup(sourceKey:string,areaId:string,token:string){try{const v=JSON.parse(token);if(Array.isArray(v)&&v[0]===sourceKey&&v[1]===areaId)return token;}catch{}return JSON.stringify([sourceKey,areaId,token]);}
/** Derived view only. Does not mutate items, receipts, owner, source geometry or canonical spatial. */
export function estimateBoardStructure(input:{gameId:string;items:readonly DrawingItem[];assertions:readonly Assertion[];allAssertions?:readonly Assertion[];evidence:readonly Evidence[]}):EstimatedBoardStructure{
 const {gameId,assertions,evidence}=input,items=[...new Map(input.items.map(i=>[identity(i),i])).values()],allowedAssertions=[...new Map([...assertions,...(input.allAssertions??[])].map(a=>[a.id,a])).values()],requested=new Set(items.map(identity)),extra=allowedAssertions.filter(a=>!items.some(i=>i.assertionId===a.id)).flatMap(a=>{const v=a.value as any;return v?.version==='game-component-record-v1'&&Array.isArray(v.pieces)?projectGenericDrawing({...a,observationReceipts:scopeReceipts(a)},v.pieces,evidence).filter(i=>['board','wonder',...(gameId==='sagrada'?['windows','cards','dice']:gameId==='lost-cities'?['cards']:[])].includes((i.value as GenericPiece).componentId??'')):[];}),out:EstimatedBoardStructure={version:'estimated-board-structure-v1',gameId,areas:(ESTIMATED_AREAS[gameId]??[]).map(a=>({...a,status:'empty',total:0,placed:0,unassigned:0,notes:[]})),groups:[],placements:[],retained:[],unassigned:[],metrics:{total:0,placed:0,readKnown:0,readTotal:0,readUnknown:0,errorKnown:null,errorUnknown:0}},nodes:Node[]=[],placed=new Set<string>(),handled=new Set<string>();
 const manualChecks:{item:DrawingItem;refs:string[];areaId:string}[]=[];
 const unassigned=(i:DrawingItem,reason:string)=>{if(!requested.has(identity(i)))return;placed.delete(identity(i));if(!out.unassigned.some(u=>identity(u)===identity(i)))out.unassigned.push({assertionId:i.assertionId,pieceId:i.pieceId,reason});};
 const group=(sourceKey:string,areaId:string,token:string,extras:Partial<EstimatedBoardGroup>={})=>{const id=scopedGroup(sourceKey,areaId,token);let g=out.groups.find(g=>g.id===id);if(!g){g={id,areaId,label:out.areas.find(a=>a.id===areaId)?.label??areaId,sourceKey,anchorPieceId:null,side:null,color:null,axis:null,slots:[],...extras};out.groups.push(g);}else for(const [key,value]of Object.entries(extras)){if((g as any)[key]===null||(g as any)[key]===undefined||key==='slots'&&!g.slots.length||key==='grid'&&g.grid?.basis==='manual-slot-order'&&(value as EstimatedBoardGrid)?.basis==='observed-dice-lattice'||(key==='label'&&g.label===(out.areas.find(a=>a.id===areaId)?.label??areaId)))(g as any)[key]=value;}return g;};
 const put=(n:Node,g:EstimatedBoardGroup,extra:Partial<EstimatedBoardPlacement>={})=>{if(handled.has(identity(n.item)))return;handled.add(identity(n.item));out.placements.push({assertionId:n.item.assertionId,pieceId:n.item.pieceId,areaId:g.areaId,groupId:g.id,order:0,slot:null,anchorPieceId:g.anchorPieceId,attachedToPieceId:null,basis:'estimated',notes:['bbox와 현재 읽힌 값에 따른 표시 추정'],...extra});if(g.areaId!=='unclassified')placed.add(identity(n.item));};
 const unknown=(n:Node,reason:string)=>{if(handled.has(identity(n.item)))return;put(n,group(n.sourceKey,'unclassified','visible-unclassified'),{notes:[reason]});unassigned(n.item,reason);};
 if(!out.areas.length){for(const i of items)unassigned(i,'unsupported-estimated-game');out.metrics=estimatedBoardMetrics(items,assertions,placed);return out;}
 for(const item of [...items,...extra]){const isRequested=requested.has(identity(item));if(!isRequested)handled.add(identity(item));const a=allowedAssertions.find(a=>a.id===item.assertionId),p=item.value as GenericPiece;if(!a||!('componentId'in p)){if(isRequested)unassigned(item,'missing-current-record');continue;}
  const receipts=scopeReceipts(a),refs=photoDrawingReference({...a,observationReceipts:receipts},evidence,{componentIds:[...new Set(receipts.flatMap(r=>r.result.observations.flatMap(o=>o.componentId?[o.componentId]:[])))]}),ref=refs.find(r=>r.pieceId===item.pieceId),e=evidence.find(e=>e.id===ref?.position.evidenceId),definitions=new Set(receipts.filter(r=>Object.values(r.componentRefs).includes(p.id)).map(r=>r.request.definitionSHA));
  const sourceKey=JSON.stringify([a.ownerId??null,ref?.position.evidenceId??p.evidenceId,ref?.position.sourceSHA??null,e?.captureEpoch??null,definitions.size===1?[...definitions][0]:null]);
  if(isRequested&&p.structureOverride){const q=p.structureOverride,g=group(sourceKey,q.areaId,q.groupId,{anchorPieceId:q.anchorPieceId,...(gameId==='sagrada'&&q.areaId==='window'?{role:'window-grid' as const,grid:{rows:4 as const,columns:5 as const,rowAxis:null,orientation:'unknown' as const,basis:'manual-slot-order' as const}}:{}),slots:gameId==='sagrada'&&['window','round-track'].includes(q.areaId)?Array.from({length:q.areaId==='window'?20:10},(_,i)=>i+1):[]});out.placements.push({assertionId:item.assertionId,pieceId:item.pieceId,areaId:q.areaId,groupId:g.id,order:q.order,slot:q.slot,anchorPieceId:q.anchorPieceId,attachedToPieceId:q.attachedToPieceId,basis:'manual',...(gameId==='sagrada'&&q.areaId==='window'&&q.slot!==null?{cell:{row:Math.floor((q.slot-1)/5)+1,column:(q.slot-1)%5+1}}:{}),notes:['사용자가 정정한 추정 구조']});handled.add(identity(item));
   manualChecks.push({item,refs:[q.anchorPieceId,q.attachedToPieceId].filter((s):s is string=>!!s),areaId:q.areaId});
  }else if(isRequested&&['manual','board','group'].includes(item.position.space)){out.retained.push(item);handled.add(identity(item));placed.add(identity(item));}
  if(!ref||!e||definitions.size!==1||p.region&&!['x','y','width','height'].every(k=>Math.abs((p.region as any)[k]-(ref.position.box as any)[k])<1e-9)){if(!handled.has(identity(item)))unassigned(item,'missing-or-conflicting-source-geometry');continue;}
  const areas=new Set(receipts.flatMap(r=>r.result.observations.filter(o=>r.componentRefs[o.ref]===item.pieceId).map(o=>o.sourceAreaId??null))),aspect=e.width&&e.height?e.width/e.height:1;
  nodes.push({item,piece:p,box:ref.position.box,sourceKey,aspect,sourceAreaId:areas.size===1?[...areas][0]:null,field:a.field,receipts});
 }
 // Resolve after all live source-qualified nodes exist. No receipt resurrection.
 const nodeByIdentity=new Map(nodes.map(n=>[identity(n.item),n]));
 const liveReferences:EstimatedReferenceRecord[]=[...new Map([...items,...extra].map(i=>[identity(i),i])).values()].map(i=>({assertionId:i.assertionId,pieceId:i.pieceId,evidenceId:(i.value as GenericPiece).evidenceId,sourceKey:nodeByIdentity.get(identity(i))?.sourceKey??null}));
 for(const check of manualChecks){const source=liveReferences.find(r=>identity(r)===identity(check.item));
  const unresolved=source?check.refs.map(id=>resolveEstimatedReference(source,id,liveReferences)).find(r=>r.status!=='resolved'):{status:'unavailable' as const};
  if(unresolved)unassigned(check.item,unresolved.status==='ambiguous'?'manual-anchor-or-attachment-ambiguous':'manual-anchor-or-attachment-unavailable');
  else if(check.areaId!=='unclassified')placed.add(identity(check.item));
 }
 const partitions=new Map<string,Node[]>();for(const n of nodes)partitions.set(n.sourceKey,[...(partitions.get(n.sourceKey)??[]),n]);
 for(const [sourceKey,ns]of partitions){
  if(gameId==='lost-cities'){
   const boards=ns.filter(n=>n.piece.componentId==='board');
   const role=(n:Node)=>{const fromField=n.field==='discard.scene'?'discard':n.field==='expeditions.scene'?'expedition':null,fromArea=n.sourceAreaId==='discard'?'discard':n.sourceAreaId==='expeditions'?'expedition':null;return fromField&&fromArea&&fromField!==fromArea?'conflict':fromField??fromArea;};
   const lines=new Map(boards.map(b=>{const points=ns.filter(n=>n.piece.componentId==='cards'&&role(n)==='discard'&&nearAnchor(n,boards)===b).map(n=>{const p=centre(n.box);return {x:p.x*n.aspect,y:p.y};});return [b.item.pieceId,sourceLine(points)] as const;}));
   for(const n of boards){const line=lines.get(n.item.pieceId);put(n,group(sourceKey,'board',n.item.pieceId,{axis:line?.axis??null}));if(line)for(const side of ['near','far'] as const)for(const color of ['red','green','blue','white','yellow'])group(sourceKey,'expeditions',JSON.stringify([n.item.pieceId,side,color]),{anchorPieceId:n.item.pieceId,role:'expedition',side,color,axis:{x:-line.axis.y,y:line.axis.x},label:(side==='near'?'가까운 쪽':'먼 쪽')+' · '+color});}
   for(const n of ns.filter(n=>n.piece.componentId!=='board'&&!handled.has(identity(n.item)))){
    const known=role(n),color=expeditionColor(literal(n,'suit'));
    if(n.piece.componentId==='cards'&&known==='discard'){put(n,group(sourceKey,'discard',JSON.stringify(['discard',color]),{role:'discard',color,label:'버림 · '+(color??'색 모름')}),{notes:['기존 field/sourceArea의 버림 역할 유지']});continue;}
    const anchor=nearAnchor(n,boards),line=anchor&&lines.get(anchor.item.pieceId);
    if(n.piece.componentId!=='cards'||!anchor||!line||known==='conflict'||n.sourceAreaId&& !['expeditions','discard'].includes(n.sourceAreaId)){unknown(n,'missing-or-ambiguous-expedition-role-or-axis');continue;}
    const cross={x:-line.axis.y,y:line.axis.x},c=centre(n.box),d=(c.x*n.aspect-line.origin.x)*cross.x+(c.y-line.origin.y)*cross.y,margin=(Math.abs(cross.x)*n.box.width*n.aspect+Math.abs(cross.y)*n.box.height)/2;
    if(Math.abs(d)<=margin){unknown(n,'expedition-side-boundary-ambiguous');continue;}
    const toward=(.5*n.aspect-line.origin.x)*cross.x+(.5-line.origin.y)*cross.y;if(Math.abs(toward)<1e-9){unknown(n,'photo-centre-side-ambiguous');continue;}
    const side=d*Math.sign(toward)>0?'near':'far';put(n,group(sourceKey,'expeditions',JSON.stringify([anchor.item.pieceId,side,color]),{anchorPieceId:anchor.item.pieceId,role:'expedition',side,color,axis:cross,label:(side==='near'?'가까운 쪽':'먼 쪽')+' · '+(color??'색 모름')}),{notes:['동일 원본의 버림 위치 중심선으로 판 방향/편 추정 · 사람 소유 확정 아님']});
   }
  }else if(gameId==='seven-wonders'){
   const boards=ns.filter(n=>n.piece.componentId==='wonder');for(const n of boards)put(n,group(sourceKey,'wonder',n.item.pieceId));
   for(const n of ns.filter(n=>n.piece.componentId!=='wonder'&&!handled.has(identity(n.item)))){const anchor=nearAnchor(n,boards),area=areaForKind(gameId,n.piece.componentId);if(!anchor||area==='unclassified'){unknown(n,'missing-or-ambiguous-wonder-anchor');continue;}const color=n.piece.componentId==='age-cards'?literal(n,'cardColor'):null;put(n,group(sourceKey,area,JSON.stringify([anchor.item.pieceId,color]),{anchorPieceId:anchor.item.pieceId,color,axis:axis(anchor.box,n.aspect),label:'판 '+(boards.indexOf(anchor)+1)+' · '+(color??out.areas.find(a=>a.id===area)!.label)}));}
  }else{
   const windows=ns.filter(n=>n.piece.componentId==='windows'),cards=ns.filter(n=>n.piece.componentId==='cards'),tools=cards.filter(n=>/tool|도구/i.test(literal(n,'cardType')??'')),goals=cards.filter(n=>/objective|goal|목표/i.test(literal(n,'cardType')??''));
   for(const n of windows)put(n,group(sourceKey,'window',n.item.pieceId));
   // The deployed window asset is 4 rows x 5 columns. Fit visible dice, not its decorative full-board bbox.
   for(const anchor of windows){
    const candidates=ns.filter(n=>n.piece.componentId==='dice'&&(n.piece.quantity===null||n.piece.quantity<=1)&&(!n.sourceAreaId||n.sourceAreaId==='window')&&windows.filter(w=>inside(w.box,centre(n.box))).length===1&&inside(anchor.box,centre(n.box))&&overlap(anchor.box,n.box)>=n.box.width*n.box.height*.5);
    const fit=diceLattice(candidates.map(n=>{const c=centre(n.box);return {id:identity(n.item),x:c.x*n.aspect,y:c.y,width:n.box.width*n.aspect,height:n.box.height};}),4,5);
    for(const n of candidates){if(handled.has(identity(n.item)))continue;const cell=fit.cells.get(identity(n.item));if(!cell||!fit.axis){unknown(n,fit.reason??'window-cell-ambiguous');continue;}put(n,group(sourceKey,'window','grid-'+anchor.item.pieceId,{role:'window-grid',anchorPieceId:anchor.item.pieceId,axis:fit.axis,slots:Array.from({length:20},(_,i)=>i+1),grid:{rows:4,columns:5,rowAxis:fit.axis,orientation:'source-order-not-printed',basis:'observed-dice-lattice'}}),{cell,slot:(cell.row-1)*5+cell.column,notes:['관측 주사위 반복행/원근 열선 기반 추정 · 인쇄 방향/패턴·빈칸 확정 아님']});}
   }

   for(const n of cards){const area=tools.includes(n)?'tools':goals.includes(n)?'goals':'unclassified';if(area==='unclassified'){unknown(n,'card-purpose-unread');continue;}put(n,group(sourceKey,area,'card-row',{axis:{x:1,y:0}}));}
   const track=ns.filter(n=>n.piece.componentId==='dice'&&!handled.has(identity(n.item))&&(n.sourceAreaId==='round-track'||n.piece.spatial?.placement?.areaId==='round-track'));
   let extent:ObservationBox|undefined;const boxes:ObservationBox[]=[];
   for(const n of track)for(const r of n.receipts){for(const o of r.result.observations.filter(o=>r.componentRefs[o.ref]===n.item.pieceId)){const p=r.result.spatial?.placements.find(p=>p.observationRef===o.ref),b=r.result.spatial?.boardInstances.find(b=>b.ref===p?.boardInstanceRef);if(!b?.sourceRegion)continue;try{const mapped=mapObservationRegion({...o,bbox:b.sourceRegion,imageIndex:b.imageIndex,panelRef:b.panelRef},r.request,r.transforms);if(validBox(mapped)&&!boxes.some(v=>JSON.stringify(v)===JSON.stringify(mapped)))boxes.push(mapped);}catch{}}}
   if(boxes.length===1)extent=boxes[0];const fallback=track.length?{x:Math.min(...track.map(n=>n.box.x)),y:Math.min(...track.map(n=>n.box.y)),width:Math.max(...track.map(n=>n.box.x+n.box.width))-Math.min(...track.map(n=>n.box.x)),height:Math.max(...track.map(n=>n.box.y+n.box.height))-Math.min(...track.map(n=>n.box.y))}:null,a=extent?axis(extent,track[0]?.aspect??1):fallback?axis(fallback,track[0]?.aspect??1):{x:1,y:0};
   // Without a declared extent, order distinct visible bands only. These are editable display ranks,
   // never printed round numbers or a claim that unobserved rounds are empty.
   const relativeBands:{start:number;end:number;nodes:Node[]}[]=[];
   if(!extent)for(const n of [...track].sort((x,y)=>along(x,a)-along(y,a)||sort(x.item.pieceId,y.item.pieceId))){const start=a.x?n.box.x:n.box.y,end=start+(a.x?n.box.width:n.box.height),last=relativeBands.at(-1);if(last&&Math.min(last.end,end)>Math.max(last.start,start)){last.start=Math.max(last.start,start);last.end=Math.min(last.end,end);last.nodes.push(n);}else relativeBands.push({start,end,nodes:[n]});}
   for(const n of track){let slot:number|null=null;if(extent&&inside(extent,centre(n.box))){const c=centre(n.box),fraction=a.x?(c.x-extent.x)/extent.width:(c.y-extent.y)/extent.height;slot=Math.floor(fraction*10)+1;if(slot>10)slot=null;}else if(!extent&&relativeBands.length>=2&&relativeBands.length<=10){slot=relativeBands.findIndex(b=>b.nodes.includes(n))+1;}
    put(n,group(sourceKey,'round-track','relative-track',{axis:a,slots:Array.from({length:10},(_,i)=>i+1)}),{slot,notes:[extent?'관측된 사진 트랙 extent의 긴 축을10등분한 상대 자리 · 인쇄 번호 확정 아님':slot!==null?'트랙 extent 미상 · 관측 긴 축 순서의 표시용 상대 자리, 인쇄 라운드번호 아님':'트랙 extent/충분한 순서 근거 미상 · 상대 자리 미확정']});if(slot===null)unassigned(n.item,'track-extent-or-relative-slot-unknown');
   }
   for(const n of ns.filter(n=>n.piece.componentId==='tokens'&&!handled.has(identity(n.item)))){const matches=tools.filter(t=>overlap(t.box,n.box)>0),target=matches.length===1?matches[0]:null;put(n,group(sourceKey,'favors',target?.item.pieceId??'unattached',{anchorPieceId:target?.item.pieceId??null}),{attachedToPieceId:target?.item.pieceId??null,notes:[target?'사진에서 겹친 단일 도구 카드에 추정 연결':'겹치는 도구 카드 불명/중의적 · 미연결 유지']});if(!target)unassigned(n.item,'favor-tool-attachment-unknown');}
   for(const n of ns.filter(n=>!handled.has(identity(n.item))))unknown(n,'window-cell-or-component-area-not-established');
  }
 }
 // Source-axis order, not numeric values, captions, expected inventory, or array delivery order.
 for(const g of out.groups){const ps=out.placements.filter(p=>p.groupId===g.id),byKey=new Map(nodes.map(n=>[identity(n.item),n])),estimated=ps.filter(p=>p.basis==='estimated').sort((a,b)=>{const x=byKey.get(identity(a)),y=byKey.get(identity(b)),v=x&&y?along(x,g.axis??{x:1,y:0})-along(y,g.axis??{x:1,y:0}):0;return v||sort(a.pieceId,b.pieceId);});estimated.forEach((p,i)=>p.order=i);}
 for(const i of items)if(!handled.has(identity(i))&&!out.unassigned.some(u=>identity(u)===identity(i)))unassigned(i,'no-estimated-placement');
 const retainedArea=(i:DrawingItem)=>gameId==='lost-cities'&&(assertions.find(a=>a.id===i.assertionId)?.field==='discard.scene'||nodes.find(n=>identity(n.item)===identity(i))?.sourceAreaId==='discard')?'discard':gameId==='sagrada'&&(i.value as GenericPiece).componentId==='dice'&&(i.value as GenericPiece).spatial?.resolved?.sourceAreaId==='window'?'window':areaForKind(gameId,(i.value as GenericPiece).componentId);
 const counted=new Set<string>();for(const i of items){const assertion=assertions.find(a=>a.id===i.assertionId),physical=JSON.stringify([assertion?.ownerId??null,(i.value as GenericPiece).evidenceId,i.pieceId]);if(counted.has(physical))continue;counted.add(physical);const p=out.placements.find(p=>identity(p)===identity(i)),retained=out.retained.some(r=>identity(r)===identity(i)),id=p?.areaId??(retained?retainedArea(i):'unclassified'),area=out.areas.find(a=>a.id===id)!;area.total++;if(placed.has(identity(i)))area.placed++;else area.unassigned++;}
 for(const a of out.areas){const ps=out.placements.filter(p=>p.areaId===a.id),retained=out.retained.filter(i=>retainedArea(i)===a.id);a.status=a.id==='unclassified'&&a.total?'unresolved':ps.length?'estimated':retained.length?'retained':'empty';if(a.total===0)a.notes.push('이번 관측에서 표시할 실물0건 · 실제 부재/완전성 확인 아님');}
 out.groups.sort((a,b)=>sort(a.areaId,b.areaId)||sort(a.id,b.id));out.placements.sort((a,b)=>sort(a.groupId,b.groupId)||a.order-b.order||sort(a.pieceId,b.pieceId));out.metrics=estimatedBoardMetrics(items,assertions,placed);return out;
}
