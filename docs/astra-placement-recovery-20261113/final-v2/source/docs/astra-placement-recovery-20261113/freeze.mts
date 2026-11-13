/** Freeze only this worker's final snapshot and explicitly enumerated sources/inputs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..'),stage=path.join(here,'final-v2');
const relative=(p:string)=>path.relative(repo,p),sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
async function files(dir:string):Promise<string[]>{
 const entries=await fs.readdir(dir,{withFileTypes:true});
 return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat().sort();
}
const manifestPath=path.join(stage,'freeze.json');
await assert.rejects(fs.access(manifestPath),{code:'ENOENT'},'Never overwrite a frozen manifest');
const before=JSON.parse(await fs.readFile(path.join(here,'before/replay-result.json'),'utf8'));
const after=JSON.parse(await fs.readFile(path.join(stage,'replay-result.json'),'utf8'));
assert.equal(after.providerCalls,0);assert.equal(after.sourceMutation,false);assert.equal(after.rows.length,9);
const comparison=after.rows.map((r:any)=>{
 const prior=before.rows.find((p:any)=>p.caseId===r.caseId);assert(prior);
 assert.equal(prior.sourceSHA256,r.sourceSHA256);
 for(const key of ['total','readKnown','readTotal','readUnknown','errorKnown','errorUnknown'])assert.equal(prior.after[key],r.after[key],r.caseId+' preserves '+key);
 return {caseId:r.caseId,sourceSHA256:r.sourceSHA256,before:prior.after,after:r.after,displayOnly:r.displayOnly,sourceBoards:r.boardCount,
  areas:r.areas.map((a:any)=>({areaId:a.id,before:prior.areas.find((p:any)=>p.id===a.id),after:a})),
  renderer:r.fields,unassigned:r.unassigned};
});
await fs.writeFile(path.join(stage,'automatic-comparison.json'),JSON.stringify({meaning:'Automatic connection/display counts, not independent photo correctness. All original source objects, IDs and read metrics are preserved.',cases:comparison},null,2)+'\n');

const sourcePaths=[
 'shared/estimatedBoardStructure.ts','shared/estimatedGeometry.ts','shared/structureRelations.ts','src/EstimatedBoardView.tsx',
 'tests/placement-recovery.test.ts','tests/estimated-board-structure.test.ts','tests/structure-relations-http.test.ts',
 relative(path.join(here,'replay.mts')),relative(path.join(here,'freeze.mts')),
];
const source=[];
for(const file of sourcePaths){
 const bytes=await fs.readFile(path.join(repo,file)),snapshot=path.join(stage,'source',file);
 await fs.mkdir(path.dirname(snapshot),{recursive:true});await fs.writeFile(snapshot,bytes);
 source.push({path:file,sha256:sha(bytes),snapshot:relative(snapshot)});
}
const logs=['focused-v2.log','typecheck-v2.log','http-preservation-v2.log','replay-final-v2.log','diff-check-v2.log'];
for(const log of logs){const output=path.join(stage,'checks',log);await fs.mkdir(path.dirname(output),{recursive:true});await fs.copyFile(path.join(here,log),output);}
const inputRoot=path.join(repo,'docs/pro-review-20261113');
const inputPaths=[...(await files(path.join(inputRoot,'data/cases'))).filter(p=>p.endsWith('.json')),
 ...(await files(path.join(inputRoot,'data/packs'))).filter(p=>p.endsWith('.json')),
 ...(await files(path.join(inputRoot,'photos'))).filter(p=>/\.(jpg|jpeg|png)$/i.test(p)),
 ...['sagrada','lost-cities','seven-wonders'].flatMap(game=>['board.json','pieces.svg'].map(file=>path.join(repo,'public/game-art/real-boards',game,file)))];
const inputs=[];for(const file of inputPaths)inputs.push({path:relative(file),sha256:sha(await fs.readFile(file))});
// The unchanged HEAD supplies the rest of the source; explicitly record reused renderer/contracts too.
const reusedPaths=['shared/drawingProjection.ts','shared/estimatedStructureSafety.ts','shared/estimatedBoardMetrics.ts','shared/estimatedStructureOverride.ts','src/GenericPieceArt.tsx','src/GameBoardRecord.tsx','src/realBoards.ts','src/pieceFaceValues.ts','src/pieceReadoutArt.ts','src/GameComponentArt.tsx','src/estimated-board.css'];
const reusedSources=[];for(const file of reusedPaths)reusedSources.push({path:file,sha256:sha(await fs.readFile(path.join(repo,file)))});
const outputs=[];for(const file of await files(stage))outputs.push({path:relative(file),sha256:sha(await fs.readFile(file))});
const manifest={version:'placement-recovery-freeze-v2',gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),providerCalls:0,sourceMutation:false,source,reusedSources,inputs,outputs,
 checks:{focused:'53/53 passed',httpPreservation:'3/3 passed',typecheck:'passed',nineCaseReplay:'passed; actual EstimatedBoardView + GenericPieceArt; field/all placement equivalence',diffCheck:'passed',wholeSuiteBuildBrowser:'Supervisor-owned, not run by this worker'},
 limits:['Automatic counts are not photo accuracy; independent fixed-ledger re-evaluation owns that result.','Retained native pieces and missing-source fallback tray are outside EstimatedBoardView SSR; their route counts are recorded.','No board ref or placed-count credit for unanchored Sagrada display lattice.']};
const bytes=JSON.stringify(manifest,null,2)+'\n';await fs.writeFile(manifestPath,bytes);
console.log(JSON.stringify({manifest:relative(manifestPath),sha256:sha(bytes),sources:source.length,inputs:inputs.length,outputs:outputs.length},null,2));
