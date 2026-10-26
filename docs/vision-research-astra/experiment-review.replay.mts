// Read-only replay of authorized experiment outputs. No provider, settings or Store calls.
// The source-alias variant is an in-memory diagnostic, not a product patch or new scored run.
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
globalThis.fetch=async()=>{throw new Error('Network forbidden in independent replay');};
const {normalizeObservations}=await import('../../server/ai/index.ts');
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const pre=await read('docs/photo-read-experiment/preflight.json');
const ledger=await read('docs/photo-read-experiment/requests.json');
const originals=new Map<string,string>();
const readPinned=async(p:string)=>{const b=await readFile(p);originals.set(p,sha(b));return JSON.parse(b.toString());};
function stable(result:any){const x=JSON.parse(JSON.stringify(result));for(const a of x.assertions){delete a.id;delete a.updatedAt;for(const p of a.value?.pieces??[])delete p.id;}return x;}
const pieces=(d:any)=>d.assertions.flatMap((a:any)=>a.value?.pieces??[]);
function aliasOnly(raw:any,fixture:any){
 const x=structuredClone(raw),e=fixture.evidence;let replacements=0;
 for(const a of x.assertions){
  if(a.ownerId&&a.ownerId!==e.ownerId||!a.evidenceIds?.includes(e.id))continue;
  for(const p of a.value?.pieces??[]){
   if(p.evidenceId!==e.id||!p.readout?.sources)continue;
   for(const [k,v] of Object.entries(p.readout.sources))if(v===e.id&&p.readout.values?.[k]!=null){p.readout.sources[k]='observation';replacements++;}
  }
 }
 return {raw:x,replacements};
}
function norm(raw:any,f:any){return normalizeObservations(raw,f.pack,[f.evidence],f.session.turnInstanceId,f.session.players.map((p:any)=>p.id));}
const rows=[];let representative:any;
for(const r of ledger.requests){
 const stem=`${r.sequence}-${r.gameId}-${r.condition}`,f=await readPinned(path.join(pre.privateDir,r.gameId+'.input.json'));
 const envelope=await readPinned(path.join(pre.privateDir,stem+'.response.json')),expected=await readPinned(path.join(pre.privateDir,stem+'.normalized.json'));
 const baseline=norm(envelope.data,f);assert.deepEqual(stable(baseline),stable(expected));
 const alias=aliasOnly(envelope.data,f),after=norm(alias.raw,f);
 rows.push({sequence:r.sequence,game_id:r.gameId,condition:r.condition,exact_baseline_reproduced:true,
  raw_pieces:pieces(envelope.data).length,baseline_pieces:pieces(baseline).length,
  alias_replacements:alias.replacements,diagnostic_alias_only_pieces:pieces(after).length,
  diagnostic_scope_valid:after.assertions.every(a=>a.ownerId===f.evidence.ownerId&&a.evidenceIds.every(id=>id===f.evidence.id))});
 if(r.gameId==='sagrada'&&r.condition==='A')representative={f,raw:envelope.data};
 if(['sagrada','scout'].includes(r.gameId)&&r.condition==='B')assert(pieces(after).every((p:any)=>Object.values(p.readout.values).every(v=>v===null)));
}
const single=()=>({...structuredClone(representative.raw),warnings:[],assertions:[{...structuredClone(representative.raw.assertions[0]),value:{version:'game-component-record-v1',pieces:[structuredClone(representative.raw.assertions[0].value.pieces[0])]}}]});
const negative=[];
for(const scenario of ['user-basis','foreign-source-basis','foreign-piece-evidence','manual-value']){
 const raw=single(),p=raw.assertions[0].value.pieces[0];
 if(scenario==='user-basis')p.readout.sources.face='user';
 if(scenario==='foreign-source-basis')p.readout.sources.face='not-attached';
 if(scenario==='foreign-piece-evidence')p.evidenceId='not-attached';
 if(scenario==='manual-value'){p.readout.values.cardArea='unverified-area';p.readout.sources.cardArea=representative.f.evidence.id;}
 const out=norm(aliasOnly(raw,representative.f).raw,representative.f);assert.equal(out.assertions.length,0);
 negative.push({scenario,assertions:0,passed:true});
}
for(const [p,h]of originals)assert.equal(sha(await readFile(p)),h);
const out={method:'Original six output replays plus strictly scoped in-memory source-alias diagnostic; no response files, product or settings modified.',network_calls:0,real_model_calls:0,baseline_rows:rows,negative_checks:negative,original_file_hashes_unchanged:originals.size,quality_scores_recomputed_on_transformed_outputs:false,exit:0};
await writeFile('docs/vision-research-astra/experiment-review.replay.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
