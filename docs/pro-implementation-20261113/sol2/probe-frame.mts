/** A manual-frame usability probe, not a new source observation or photo truth. */
import fs from 'node:fs/promises';
import {projectGenericDrawing} from '../../../shared/drawingProjection';
import {estimateBoardStructure} from '../../../shared/estimatedBoardStructure';
const d=JSON.parse(await fs.readFile('docs/pro-review-20261113/data/cases/sagrada-high.json','utf8'));
const assertions=d.assertions.map((a:any)=>{const {observationReceiptRefs,...rest}=a;return {...rest,observationReceipts:observationReceiptRefs.map((i:number)=>d.receipts[i])};});
const calculate=()=>estimateBoardStructure({gameId:d.gameId,items:assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,d.photos)),assertions,evidence:d.photos});
const before=calculate(),g=before.groups.find(g=>g.areaId==='window'&&g.anchorRef?.kind==='live-piece'&&g.grid),ref=g?.anchorRef;
if(!g||!ref||ref.kind!=='live-piece')throw Error('No original live window anchor');
const a=assertions.find((a:any)=>a.id===ref.assertionId),p=a.value.pieces.find((p:any)=>p.id===ref.pieceId);
// Intentionally approximate four taps at the visible 4x5 grid, not at the arch/whole player board.
const corners=[{x:268/1200,y:536/900},{x:718/1200,y:516/900},{x:889/1200,y:826/900},{x:247/1200,y:856/900}] as const;
p.structureOverride={version:'estimated-structure-override-v2',sourceKey:g.sourceKey,areaId:'window',groupId:'manual-frame-probe',order:0,slot:null,anchorPieceId:p.id,attachedToPieceId:null,anchorRef:ref,frame:{corners},active:true};
const after=calculate();
const {frameFromCorners,projectBoardPoint}=await import('../../../shared/estimatedGeometry');const matrix=frameFromCorners(corners)!;const rows=before.placements.filter(p=>p.cell).map(p=>{const aa=assertions.find((a:any)=>a.id===p.assertionId),pp=aa.value.pieces.find((n:any)=>n.id===p.pieceId),b=pp.region;const local=projectBoardPoint(matrix,{x:b.x+b.width/2,y:b.y+b.height/2});return {id:p.pieceId,cell:p.cell,local};});console.log(JSON.stringify(rows,null,2));
console.log(JSON.stringify({probe:'Approximate user taps; original files untouched; not cell ground truth',beforeCells:before.placements.filter(p=>p.areaId==='window'&&p.cell).length,afterCells:after.placements.filter(p=>p.areaId==='window'&&p.cell).length,reasons:after.unassigned.map(p=>p.reason)},null,2));
