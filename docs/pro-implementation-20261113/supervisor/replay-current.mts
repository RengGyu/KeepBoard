/** Existing saved answers only. Derive current structure and render each actual field. No provider or Store. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {projectGenericDrawing} from '../../../shared/drawingProjection';
import {estimateBoardStructure} from '../../../shared/estimatedBoardStructure';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../..'),input=path.join(repo,'docs/pro-review-20261113'),output=path.join(here,'current-structures');
register(pathToFileURL(path.join(repo,'docs/board-story/feedback/skip-css.mjs')));
const {EstimatedBoardView}=await import('../../../src/EstimatedBoardView');
await fs.mkdir(output,{recursive:true});
const hash=(b:any)=>createHash('sha256').update(typeof b==='string'||Buffer.isBuffer(b)?b:JSON.stringify(b)).digest('hex');
const rows:any[]=[];
for(const file of (await fs.readdir(path.join(input,'data/cases'))).filter(f=>f.endsWith('.json')).sort()){
 const bytes=await fs.readFile(path.join(input,'data/cases',file)),data=JSON.parse(bytes.toString()),pack=JSON.parse(await fs.readFile(path.join(input,'data/packs',data.gameId+'.json'),'utf8'));
 const assertions=data.assertions.map((a:any)=>{const {observationReceiptRefs,...rest}=a;return {...rest,observationReceipts:observationReceiptRefs.map((n:number)=>data.receipts[n])};});
 const boardBytes=await fs.readFile(path.join(repo,'public/game-art/real-boards',data.gameId,'board.json')),board={...JSON.parse(boardBytes.toString()),assetSHA:hash(boardBytes)};
 const before=hash({assertions,evidence:data.photos});
 const allItems=assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,data.photos,board));
 const structure=estimateBoardStructure({gameId:data.gameId,items:allItems,assertions,evidence:data.photos});
 const seen=new Set([...structure.placements,...structure.retained,...structure.unassigned].map(i=>JSON.stringify([i.assertionId,i.pieceId])));
 assert(allItems.every((i:any)=>seen.has(JSON.stringify([i.assertionId,i.pieceId]))),'Every current source piece must have a visible or retained/unassigned route');
 const fields=[];
 for(const assertion of assertions){
  const items=allItems.filter((i:any)=>i.assertionId===assertion.id),fieldStructure=estimateBoardStructure({gameId:data.gameId,items,assertions:[assertion],allAssertions:assertions,evidence:data.photos});
  const html=renderToStaticMarkup(React.createElement(EstimatedBoardView,{pack,structure:fieldStructure,record:assertion.value,assertionId:assertion.id,contextPieces:assertions.filter((a:any)=>a.id!==assertion.id).flatMap((a:any)=>a.value.pieces),renderPiece:(p:any)=>React.createElement('span',null,p.id),onSelect:()=>{},busy:false}));
  const ids=[...html.matchAll(/data-drawing-piece="([^"]+)"/g)].map(m=>m[1]);
  const expected=fieldStructure.placements.filter(p=>p.assertionId===assertion.id).map(p=>p.pieceId);
  assert.equal(ids.length,new Set(ids).size,'A field must not render a piece twice');
  assert.deepEqual([...ids].sort(),[...new Set(expected)].sort(),'Every derived field placement must stay selectable');
  fields.push({assertionId:assertion.id,field:assertion.field,expected:expected.length,rendered:ids.length});
 }
 assert.equal(hash({assertions,evidence:data.photos}),before,'No source mutation');
 assert.equal(hash(await fs.readFile(path.join(input,'data/cases',file))),hash(bytes),'Input bytes unchanged');
 const old=JSON.parse(await fs.readFile(path.join(input,'data/structures',file),'utf8'));
 const record={caseId:data.caseId,gameId:data.gameId,kind:'Same stored observation; connection count is not photo correctness',sourceSHA256:hash(bytes),before:old.metrics,after:structure.metrics,fields,unassigned:structure.unassigned};
 await fs.writeFile(path.join(output,file),JSON.stringify(structure,null,2)+'\n');rows.push(record);
}
await fs.writeFile(path.join(here,'replay-result.json'),JSON.stringify({providerCalls:0,sourceMutation:false,rows},null,2)+'\n');
console.log(JSON.stringify({providerCalls:0,cases:rows.map(r=>({case:r.caseId,before:r.before.placed+'/'+r.before.total,after:r.after.placed+'/'+r.after.total,selectable:r.fields.map((f:any)=>f.rendered).reduce((a:number,b:number)=>a+b,0)}))},null,2));
