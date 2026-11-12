/** Portable, read-only replay of delivered saved answers. No reader, server, credentials or network. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {projectGenericDrawing} from '../../shared/drawingProjection';
import {estimateBoardStructure} from '../../shared/estimatedBoardStructure';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../..');
const hash=(v:Uint8Array|string)=>createHash('sha256').update(v).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(here,'manifest.json'),'utf8'));
const write=process.argv.includes('--write');
for(const entry of manifest.files){
 const bytes=await fs.readFile(path.join(here,entry.path));
 assert.equal(hash(bytes),entry.sha256,'Delivery bytes changed: '+entry.path);
}
const rows=[];
for(const filename of (await fs.readdir(path.join(here,'data/cases'))).filter(f=>f.endsWith('.json')).sort()){
 const saved=JSON.parse(await fs.readFile(path.join(here,'data/cases',filename),'utf8'));
 const assertions=saved.assertions.map((a:any)=>{
  const {observationReceiptRefs,...rest}=a;
  return {...rest,observationReceipts:observationReceiptRefs.map((i:number)=>saved.receipts[i])};
 });
 const boardBytes=await fs.readFile(path.join(repo,'public/game-art/real-boards',saved.gameId,'board.json'));
 const board={...JSON.parse(boardBytes.toString()),assetSHA:hash(boardBytes)};
 const before=JSON.stringify({assertions,evidence:saved.photos});
 const items=assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,saved.photos,board));
 const structure=estimateBoardStructure({gameId:saved.gameId,items,assertions,evidence:saved.photos});
 assert.equal(JSON.stringify({assertions,evidence:saved.photos}),before,'Replay must not mutate input');
 const output=path.join(here,'data/structures',filename);
 if(write)await fs.writeFile(output,JSON.stringify(structure,null,2)+'\n');
 else assert.deepEqual(structure,JSON.parse(await fs.readFile(output,'utf8')),'Structure differs: '+filename);
 rows.push({case:saved.caseId,placed:structure.metrics.placed,total:structure.metrics.total,unassigned:structure.unassigned.length,known:structure.metrics.readKnown,properties:structure.metrics.readTotal});
}
console.log(JSON.stringify({kind:'Offline structure replay, not photo accuracy',cases:rows,providerCalls:0,inputMutation:false},null,2));
