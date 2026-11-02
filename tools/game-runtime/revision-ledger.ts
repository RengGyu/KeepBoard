import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

type Row=Record<string,any>;
const sha=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const LEDGER='docs/gamepack-revision-20261026/revision.json';
const INVENTORY='docs/gamepack-revision-20261026/history/before-runtime-revision/frozen-inventory.json';
const EVIDENCE='docs/gamepack-revision-20261026/revision-evidence.json';
const FREEZE='docs/game-essentials/data-freeze.json';
const specFile=(id:string)=>`docs/research/game-specs-120/games/${id}.json`;
const diff=(before:string[],after:string[])=>({added:after.filter(id=>!before.includes(id)),removed:before.filter(id=>!after.includes(id))});

/**
 * The approved revision of canonical game sources, computed rather than typed:
 * each revised game names the frozen digest it replaces, the exact IDs it adds or removes, and the receipts behind it.
 * Historical freezes stay as they are; checks accept a changed source only through a matching row here.
 */
export function buildLedger(root='.'){
 const at=(file:string)=>resolve(root,file),read=(file:string)=>JSON.parse(readFileSync(at(file),'utf8'));
 const freeze=read(FREEZE),inventory=read(INVENTORY),evidence=read(EVIDENCE);
 const games:Row={};
 for(const [id,frozen] of Object.entries<Row>(inventory.games)){
  const bytes=readFileSync(at(specFile(id))),digest=sha(bytes);
  if(freeze.files[specFile(id)]!==frozen.sourceSHA256)throw Error(`Inventory and freeze disagree: ${id}`);
  if(digest===frozen.sourceSHA256)continue;
  const spec=JSON.parse(bytes.toString()),receipts=evidence.games[id];
  if(!receipts)throw Error(`Revised source without receipts: ${id}`);
  if(receipts.reviewedSHA256!==digest)throw Error(`Reviewed source digest mismatch: ${id}`);
  const areas=frozen.boardAreaIds?diff(frozen.boardAreaIds,spec.layout.areas.map((a:Row)=>a.id)):null;
  games[id]={preimageSHA256:frozen.sourceSHA256,finalSHA256:digest,editionId:spec.edition.id,
   stateFields:diff(frozen.stateFieldIds,spec.state_fields.map((f:Row)=>f.id)),
   components:diff(frozen.componentIds,spec.components.map((c:Row)=>c.id)),
   boardAreas:areas,
   reviewStatus:receipts.reviewStatus,fullRulebookVerified:receipts.fullRulebookVerified===true,receipts:receipts.receipts};
 }
 const sum=(key:string)=>Object.values<Row>(games).reduce((n,g)=>n+(g[key]?g[key].added.length-g[key].removed.length:0),0);
 return {version:'gamepack-revision-ledger-v1',id:'gamepack-revision-20261026',
  authority:'User-approved rules-first revision (Cloud handoff 2026-10-26). Separates common, public personal, owner-private and hidden areas per game; does not claim full rulebook verification.',
  base:{freezeFile:FREEZE,freezeSHA256:sha(readFileSync(at(FREEZE))),specDigest:freeze.spec_digest,inventoryFile:INVENTORY,inventorySHA256:sha(readFileSync(at(INVENTORY))),totals:inventory.totals},
  totals:{stateFields:inventory.totals.stateFields+sum('stateFields'),artComponents:inventory.totals.artComponents+sum('components'),boardAreas:inventory.totals.boardAreas+sum('boardAreas'),boardGames:inventory.totals.boardGames},
  games};
}

export function readLedger(root='.'):Row|null{const file=resolve(root,LEDGER);return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):null;}

/** A source file is acceptable when it is the frozen byte image, or the exact final image of a ledger row that replaces that frozen image. */
export function acceptedSourceDigest(ledger:Row|null,gameId:string,frozenSHA:string,actualSHA:string){
 if(actualSHA===frozenSHA)return true;
 const row=ledger?.games?.[gameId];
 return !!row&&row.preimageSHA256===frozenSHA&&row.finalSHA256===actualSHA;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const ledger=buildLedger(),text=JSON.stringify(ledger,null,1)+'\n';
 if(process.argv.includes('--check')){if(!existsSync(LEDGER)||readFileSync(LEDGER,'utf8')!==text)throw Error('revision.json is stale; run tools/game-runtime/revision-ledger.ts --write');}
 else if(process.argv.includes('--write'))writeFileSync(LEDGER,text);
 console.log(JSON.stringify({revised:Object.keys(ledger.games),totals:ledger.totals}));
}
