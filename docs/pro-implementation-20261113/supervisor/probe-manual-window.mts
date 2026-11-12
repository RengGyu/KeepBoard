/** A manual-frame usability probe, not a new source observation or photo truth. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
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
const beforeCells=before.placements.filter(p=>p.areaId==='window'&&p.cell),afterCells=after.placements.filter(p=>p.areaId==='window'&&p.cell);
assert.equal(beforeCells.length,18,'Existing complete foreground dice lattice');
assert.deepEqual(afterCells.map(p=>p.pieceId).sort(),beforeCells.map(p=>p.pieceId).sort(),'One manual frame must not discard the existing 18 dice');
console.log(JSON.stringify({probe:'Approximate user taps; original files untouched; not cell ground truth',beforeCells:beforeCells.length,afterCells:afterCells.length,reasons:after.unassigned.map(p=>p.reason)},null,2));
