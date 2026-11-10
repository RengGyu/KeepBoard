/** Offline evidence only: no Store, server, fetch or provider import. */
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {genericSlotCandidates,qualifiedGenericSlots} from '../../../src/genericSlotSuggestion';
const D='docs/reading-fixes-20261108/followup-20261109';
const boards=readdirSync('public/game-art/real-boards').map(id=>JSON.parse(readFileSync(`public/game-art/real-boards/${id}/board.json`,'utf8'))).filter(b=>b.areas.some((a:any)=>a.slots.length));
const source=JSON.parse(readFileSync('docs/reading-fixes-20261108/part3-e2e/result.json','utf8'));
const rows=[];
for(const row of source.rows.filter((r:any)=>r.gameId!=='catan')){
 const file=join(source.root,`${row.gameId}-${row.tag}.view.json`);
 if(!existsSync(file)){rows.push({gameId:row.gameId,sourceMissing:true});continue;}
 const {session}=JSON.parse(readFileSync(file,'utf8')),board=boards.find(b=>b.gameId===row.gameId);
 const assertions=session.assertions.filter((a:any)=>a.status==='accepted'&&a.value?.version==='game-component-record-v1');
 for(const a of assertions){const pieces=a.value.pieces;rows.push({gameId:row.gameId,field:a.field,sourcePath:file,objects:pieces.length,registeredAnchors:pieces.filter((p:any)=>p.placement?.layoutVariant?.startsWith('slot-board-v1:')&&p.region&&p.evidenceId).length,proposed:board?genericSlotCandidates(board,a.field,pieces,'__unregistered__').length:0,productionSuggestions:board?qualifiedGenericSlots(row.gameId,board,a.field,pieces,'__unregistered__').length:0,independentSlotTargets:0,independentSlotAccuracy:null,modelSlotAgreement:null,reason:'Saved generic output has photo boxes but no independent canonical-slot correspondence. No photograph-to-whole-table fit can be certified from its own response.'});}
}
writeFileSync(D+'/generic-slot-evidence.json',JSON.stringify({slotGames:boards.length,enabledGames:0,accuracy:null,rows,games:boards.map(b=>({gameId:b.gameId,enabled:false,reason:'No independently annotated slot targets / validated per-field registration; do not infer from same-model agreement.'}))},null,2)+'\n');
console.log(JSON.stringify({slotGames:boards.length,rows:rows.length,enabledGames:0}));
