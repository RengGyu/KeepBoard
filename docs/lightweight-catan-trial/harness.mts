// Isolated research only. --offline never loads credentials; --live has a persistent two-attempt cap.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { catanPack } from '../../gamepacks/catan.ts';
import { observationPrompt } from '../../server/ai/prompt.ts';
import { normalizeObservations } from '../../server/ai/index.ts';
import { Store } from '../../server/store.ts';
import type { Session, Evidence, GamePack } from '../../shared/types.ts';
import { responseDiagnostics, AIResponseError } from '../../server/ai/response.ts';
import { observeResponse } from './response-observer.mts';
// @ts-expect-error Research JS compiler has no declaration file.
import { compileProfile } from '../research/lightweight-game-onboarding/compile-profile.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const hash = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
const save = (name: string, v: unknown) => writeFile(path.join(here, name), json(v));
const truthBytes = await readFile(path.join(here, 'ground-truth.json'));
assert.equal(hash(truthBytes), (await readFile(path.join(here, 'ground-truth.sha256'), 'utf8')).trim(), 'Frozen truth changed');
const truth = JSON.parse(truthBytes.toString());
const bytes = await readFile(path.join(root, truth.source));
assert.equal(hash(bytes), truth.sha256, 'Photo changed');
const profile = JSON.parse(await readFile(path.join(here, 'profile.json'), 'utf8'));
let at = performance.now();
const lightPack = compileProfile(profile);
const compileMs = performance.now() - at;
const stamp = '2026-10-21T00:00:00.000Z';
const evidence: Evidence = { id: 'research-photo-1', kind: 'photo', scope: 'public', label: '공개 연구사진', capturedAt: stamp, captureEpoch: 'research-capture-1', width: 850, height: 637, url: `data:image/jpeg;base64,${bytes.toString('base64')}` };
const seed = (pack: GamePack): Session => ({ id: `trial-${pack.id}`, name: '공개 연구사진 비교', createdAt: stamp, updatedAt: stamp, gamePackId: pack.id, gamePackVersion: pack.version, gamePack: pack, captureEpoch: evidence.captureEpoch, turnInstanceId: 'research-turn-1', stage: 'capture', players: [{id:'red',name:'빨강',color:'#cf6656'}, {id:'blue',name:'파랑',color:'#5c83a8'}, {id:'yellow',name:'노랑',color:'#d6b14a'}, {id:'white',name:'흰색',color:'#d1c7b7'}], evidence: [evidence], assertions: [], preservations: [], snapshots: [], notes: {}, activity: [], example: false });

// Generic photo branch: no canonical graph, game-specific terrain dictionary, counts, harbor contacts or legal-play rules.
export function photoPrompt(pack: any): string {
  return `You are a generic board-game photograph recorder. Return only JSON, Korean descriptions.
Game title: ${pack.title}. This is a photo-first record, not a reconstructed illustration board.
Palette buttons: ${JSON.stringify(pack.capture.palette)}
Evidence: research-photo-1, public photograph, 850x637. Players: red(빨강), blue(파랑), yellow(노랑), white(흰색).
Record visible placed tiles, tokens, pieces, cards and printed harbor symbols using these buttons. A button is a category, not proof the thing exists. Do not enumerate an expected game set, infer unseen things, invent topology slots, impose rules, infer hidden cards or current player. Exclude loose supply, outer card racks, dice and hands from placed-board components; mention exclusions in warnings. Preserve actual visible state, even if unusual.
Identify each visible physical object separately with one crop; quantity 1 for one visible object, null for an unreadable pile. Do not count the same object twice. A clearly readable number resting on a tile may be its number property OR a separate number item, never both. Describe visible subtype/material/resource in label, including printed harbor resource/ratio only when legible. Distinguish physical color from inferred owner: ownerId must be null unless confidently connected to a listed color; unknown stays null. Do not infer player hidden values from public evidence. The source crop must refer to this original, coordinates normalized 0..1, containing the actual object. Never invent a crop for an unseen object.
Return {"summary":"short","components":[{"id":"unique","paletteId":"part-N","label":"visible subtype/name","color":"observed color or null","ownerId":null,"quantity":1,"number":null,"evidenceId":"research-photo-1","region":{"x":0,"y":0,"width":0.1,"height":0.1},"notes":"visible relations/uncertainty"}],"warnings":[]}.
Unknown is null, not zero. Do not infer actions, history, full coverage or unseen state. No other output schema or Catan-specific geometry is required.`;
}

export function normalizePhoto(raw: any, pack: any) {
  assert.ok(raw && Array.isArray(raw.components), 'Missing generic components');
  const ids = new Set<string>();
  const palette = new Map(pack.capture.palette.map((p: any) => [p.id, p]));
  return { version: 2, coverage: 'partial', components: raw.components.map((c: any) => {
    assert.ok(typeof c.id === 'string' && !ids.has(c.id), 'Duplicate/invalid ID'); ids.add(c.id);
    const button: any = palette.get(c.paletteId); assert.ok(button, 'Unknown palette');
    assert.equal(c.evidenceId, evidence.id, 'Unprovided evidence');
    const r = c.region;
    assert.ok(r && ['x','y','width','height'].every(k => Number.isFinite(r[k]) && r[k] >= 0 && r[k] <= 1) && r.width > 0 && r.height > 0 && r.x + r.width <= 1.001 && r.y + r.height <= 1.001, 'Invalid crop');
    assert.ok(c.quantity === null || Number.isInteger(c.quantity) && c.quantity > 0, 'Unknown quantity is null; no invented zero');
    assert.ok(c.number === null || Number.isFinite(c.number), 'Invalid number');
    assert.ok(c.ownerId === null || ['red','blue','yellow','white'].includes(c.ownerId), 'Unprovided owner');
    return { id:c.id, kind:button.kind, variant:button.id, label:c.label, observedColor:c.color, ownerId:c.ownerId, quantity:c.quantity, number:c.number, evidenceId:c.evidenceId, region:r, location:{type:'unplaced',id:null}, notes:c.notes };
  }) };
}

async function roundtrip(pack: GamePack, scene: any) {
  const store = new Store(await mkdtemp(path.join(tmpdir(), 'keepboard-trial-store-')), path.join(root, 'public'));
  const s = seed(pack);
  s.assertions = [{id:'synthetic',field:'components.observed',basis:'user',status:'accepted',value:scene,evidenceIds:[evidence.id],updatedAt:stamp}];
  s.notes = {red:'합성 개인메모'};
  s.snapshots = [{id:'snapshot-1',createdAt:stamp,captureEpoch:s.captureEpoch,turnInstanceId:s.turnInstanceId,gamePackVersion:s.gamePackVersion,assertions:structuredClone(s.assertions),evidence:s.evidence,preservations:[],notes:s.notes}];
  const started = performance.now(); await store.saveSession(s); const saveMs = performance.now()-started;
  const reload = await store.getSession(s.id);
  assert.deepEqual(reload, JSON.parse(JSON.stringify(s)));
  return {saveMs, bytes:Buffer.byteLength(json(s)), exactRoundtrip:true};
}

const fixture = { components:[{id:'one',paletteId:'part-1',label:'합성 타일',color:null,ownerId:null,quantity:1,number:null,evidenceId:evidence.id,region:{x:.1,y:.1,width:.2,height:.2},notes:''}] };
const fixtureScene = normalizePhoto(fixture, lightPack);
assert.equal(fixtureScene.components[0].location.type, 'unplaced');
assert.equal(fixtureScene.components[0].number, null);
assert.throws(() => normalizePhoto({...fixture,components:[...fixture.components,...fixture.components]}, lightPack), /Duplicate/);
assert.throws(() => normalizePhoto({components:[{...fixture.components[0],evidenceId:'private-unprovided'}]}, lightPack), /Unprovided evidence/);
assert.equal(normalizePhoto({components:[{...fixture.components[0],quantity:null}]},lightPack).components[0].quantity,null);
assert.throws(() => normalizePhoto({components:[{...fixture.components[0],region:{x:.9,y:0,width:.2,height:1}}]},lightPack), /Invalid crop/);
const metadata = {
  source:truth.source,photoSha256:truth.sha256,photoBytes:bytes.length,dimensions:truth.dimensions,groundTruthSha256:hash(truthBytes),
  sourceHashes:Object.fromEntries(await Promise.all(['server/ai/index.ts','server/ai/prompt.ts','server/ai/scenePrompt.ts','gamepacks/catan.ts','shared/scene.ts'].map(async f=>[f,hash(await readFile(path.join(root,f)))]))),
  profile:{compactBytes:Buffer.byteLength(JSON.stringify(profile)),buttons:profile.components.length,counters:profile.counters.length,manualRows:profile.components.length+profile.counters.length,authoringDurationMs:null,compileMs},
  packs:Object.fromEntries([['catan',catanPack],['lightweight',lightPack]].map(([name,p]:any)=>[name,{compactBytes:Buffer.byteLength(JSON.stringify(p)),fields:p.fields.length,requirements:p.requirements.length,derivedRules:p.derivedRules.length,preservations:p.preservationTemplates.length}])),
  syntheticStorage:{catan:await roundtrip(catanPack,fixtureScene),lightweight:await roundtrip(lightPack,fixtureScene)},
  assertionsPassed:6,scope:'offline schema/Store assertions, not UI or complete feature parity',
};
await save('offline.json',metadata); await save('compiled-profile.json',lightPack);
const focus='Read placed board tiles, numbers, roads, buildings, robber and printed harbors. Exclude loose supply, outer card racks, dice and hands from placed-board components; mention exclusions in warnings. Do not infer hidden state.';
const prompts = {catan:observationPrompt(seed(catanPack),catanPack,[evidence],focus),lightweight:photoPrompt(lightPack)};
for(const [name,prompt] of Object.entries(prompts)) await writeFile(path.join(here,`${name}.prompt.txt`),prompt);
if (!process.argv.includes('--live')) { console.log('OFFLINE PASS: 6 assertions; photo/truth hashes fixed; no AI settings or network used.'); process.exit(0); }

// Exact application transport/settings source, with only private function export visibility changed in a temp module.
// No configuration is copied, printed or persisted. The runtime code alone uses the existing secret to send the request.
const aiPath = path.join(root,'server/ai/index.ts');
let source = await readFile(aiPath,'utf8');
source = source.replace('async function settings()', 'export async function settings()').replace('async function requestJSON(', 'export async function requestJSON(')
  .replace(/(from\s+['"])(\.[^'"]+)(['"])/g,(_m,a,rel,b)=>a+pathToFileURL(path.resolve(path.dirname(aiPath),rel)).href+b);
const dir = await mkdtemp(path.join(tmpdir(),'keepboard-trial-adapter-'));
await writeFile(path.join(dir,'adapter.mts'),source);
process.env.KEEPBOARD_DATA_DIR = path.join(root,'.keepboard');
const adapter = await import(pathToFileURL(path.join(dir,'adapter.mts')).href);
const config = await adapter.settings(); // Internal secret-bearing object: never serialize or log.
if(!config.apiKey) {await save('live-status.json',{status:'not-configured',attempts:0}); console.log('NO LIVE CALL: existing AI config absent.'); process.exitCode=2;}
else {
  const budgetFile = path.join(here,'call-ledger.json');
  try {await access(budgetFile); throw new Error('Ledger exists: no reruns/retries permitted. Use recorded results.');}
  catch(e:any) {if(e.code!=='ENOENT') throw e;}
  const ledger:any = {limit:2,attempts:[],createdAt:new Date().toISOString(),photoSha256:truth.sha256};
  await writeFile(budgetFile,json(ledger),{flag:'wx'});
  const nativeFetch = globalThis.fetch;
  const transportSignatures:any[]=[];
  let active:any;
  globalThis.fetch = async (url, init) => {
    assert.ok(active && !active.sent,'Unexpected extra HTTP request blocked'); active.sent=true;
    const body=JSON.parse(String(init?.body));
    const gemini=Boolean(body.contents);
    const promptText=gemini?body.contents[0].parts[0].text:body.input[0].content[0].text;
    assert.equal(promptText,prompts[active.arm as keyof typeof prompts]);
    active.requestBytes=Buffer.byteLength(String(init?.body)); active.promptBytes=Buffer.byteLength(promptText);
    const withoutPrompt=structuredClone(body);
    if(gemini) withoutPrompt.contents[0].parts[0].text='[PROMPT]'; else withoutPrompt.input[0].content[0].text='[PROMPT]';
    const signature=hash(JSON.stringify(withoutPrompt)); transportSignatures.push(signature);
    if(transportSignatures.length===2) assert.equal(signature,transportSignatures[0],'Model/images/options differ; second request blocked');
    active.transportSignature=signature;
    const start=performance.now();
    const response=await nativeFetch(url,init); active.httpHeadersMs=performance.now()-start; active.httpStatus=response.status;
    return observeResponse(response,(payload:any)=>{active.httpThroughJSONMs=performance.now()-start;
        active.usage=payload.usageMetadata??payload.usage??null;
        active.responseJSONBytes=Buffer.byteLength(JSON.stringify(payload));
        active.responseDiagnostics=responseDiagnostics(payload,active.provider);
    });
  };
  try {
    for(const arm of ['catan','lightweight'] as const) {
      ledger.attempts.push({arm,startedAt:new Date().toISOString()}); await save('call-ledger.json',ledger);
      active={arm,provider:config.provider,model:config.model,photoSha256:truth.sha256,sent:false};
      const timings:any=active;
      console.log(`START ${arm} (one attempt; no retry)`);
      try {
        let started=performance.now();
        const prompt=arm==='catan'?observationPrompt(seed(catanPack),catanPack,[evidence],focus):photoPrompt(lightPack);
        const images=[{mimeType:'image/jpeg',data:bytes.toString('base64')}];
        timings.preprocessMs=performance.now()-started;
        started=performance.now(); const raw=await adapter.requestJSON(prompt,images,config); timings.requestAndParseMs=performance.now()-started;
        await save(`${arm}.raw.json`,raw);
        started=performance.now();
        const normalized=arm==='catan'?normalizeObservations(raw,catanPack,[evidence],seed(catanPack).turnInstanceId,seed(catanPack).players.map(p=>p.id)):normalizePhoto(raw,lightPack);
        timings.normalizeMs=performance.now()-started;
        timings.storage=await roundtrip(arm==='catan'?catanPack:lightPack,normalized);
        timings.rawOutputBytes=Buffer.byteLength(JSON.stringify(raw)); timings.status='success';
        await save(`${arm}.normalized.json`,normalized);
      } catch(error:any) {
        // Never persist provider messages, request headers or a URL that might include a credential.
        timings.status='failed'; timings.failure=active.httpStatus?`HTTP ${active.httpStatus} or response validation failure`:'Transport/configuration failure';
        timings.failureClass=error?.name==='AssertionError'?'schema-validation':error?.name==='TimeoutError'?'timeout':'request-or-parse';
        timings.errorClass=['AIResponseError','SyntaxError','TypeError','Error','AssertionError'].includes(error?.name)?error.name:'other';
        if(error instanceof AIResponseError) { timings.decodeCode=error.code; timings.decodeDiagnostics=error.diagnostics; }
        process.exitCode=2;
      }
      await save(`${arm}.timing.json`,timings);
      ledger.attempts[ledger.attempts.length-1].status=timings.status;await save('call-ledger.json',ledger);
      console.log(`FINISH ${arm}: ${timings.status}; HTTP ${timings.httpStatus??'not-received'}`);
    }
    await save('live-status.json',{status:ledger.attempts.every((a:any)=>a.status==='success')?'complete':'incomplete',attempts:ledger.attempts.length,identicalTransportExceptPrompt:transportSignatures.length===2&&transportSignatures[0]===transportSignatures[1],provider:config.provider,model:config.model,trialOrder:['catan','lightweight'],temperature:'unspecified in existing transport for both',retries:0});
  } finally { globalThis.fetch=nativeFetch; }
}
