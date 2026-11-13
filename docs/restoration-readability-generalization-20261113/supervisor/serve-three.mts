/** Actual app review against saved observations. Isolated Store; all model calls fail closed. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';

const repository = path.resolve(import.meta.dirname, '../../..');
const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-restoration-product-'));
for(const key of Object.keys(process.env))if(/API_KEY|KEY_FILE|AI_GATEWAY|AI_ALIAS|SUPABASE|BLOB_READ_WRITE|LOCAL_READER_CONFIG/.test(key))delete process.env[key];
process.chdir(dataRoot);
const mode = 'actual application + isolated Store + saved response fixtures';
const previousManifest = undefined;
if(previousManifest && (previousManifest.mode!==mode || !path.basename(dataRoot).startsWith('kb-restoration-product-')))throw new Error('Only the isolated review Store may be reopened');
process.env.KEEPBOARD_DATA_DIR = dataRoot;
const [{createApp}, {Store}, express, {TERRA_HIGH_IDENTITY}] = await Promise.all([
  import('../../../server/index.ts'), import('../../../server/store.ts'),
  import('express'), import('../../../server/ai/terraGameReader.ts'),
]);
const store = new Store(dataRoot,path.join(repository,'public'));
let providerAttempts = 0;
const noProvider = async () => { providerAttempts++; throw new Error('Local saved-response review: external reading disabled'); };
const reader = {
  identity:TERRA_HIGH_IDENTITY,
  status:async()=>({kind:TERRA_HIGH_IDENTITY.kind,available:false,cloudSupported:true as const,identity:null,reason:'저장된 응답으로 검수 중입니다.'}),
  read:noProvider, readCatanScene:noProvider,
};
const games = ['sagrada','lost-cities','seven-wonders'];
const readJSON = async (name:string) => JSON.parse(await fs.readFile(path.join(repository,name),'utf8'));
const packs = await Promise.all(games.map(game=>readJSON(`docs/pro-review-20261113/data/packs/${game}.json`)));
const app = express.default();
app.all('/api/settings', (_req,res)=>res.json({configured:false,provider:'gemini',model:'saved-response-review'}));
app.post('/api/packs/generate', (_req,res)=>res.status(409).json({error:'Local saved-response review only'}));
app.use(await createApp({store,ui:false,uiHmr:false,runtimePacks:packs,analyzer:noProvider,
  geminiReader:reader as any,terraReader:reader,terraHighReader:reader}));
const vite=await (await import('vite')).createServer({root:repository,envDir:dataRoot,configFile:path.join(repository,'vite.config.ts'),server:{middlewareMode:true,hmr:false,ws:false},appType:'spa'});
app.use(vite.middlewares);
const server = app.listen(Number(process.env.KB_REVIEW_PORT ?? 58113),'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const cases = ['sagrada-baseline','sagrada-high','sagrada-medium','sagrada-low',
  'lost-cities-baseline','lost-cities-high','lost-cities-medium','lost-cities-low','seven-wonders-baseline'];
const sessions: Array<{name:string;id:string;url:string;sourceSHA:string}> = previousManifest?.sessions ?? [];
for(const name of previousManifest ? [] : cases){
  const game = name.replace(/-(baseline|high|medium|low)$/,''), pack = packs.find(pack=>pack.runtime?.gameId===game) ?? packs[games.indexOf(game)];
  const fixture = await readJSON(`docs/pro-review-20261113/data/cases/${name}.json`);
  const created = await fetch(`${base}/api/sessions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({gamePackId:pack.id,recordingMode:'simple'})});
  const result = await created.json();
  if(!created.ok)throw new Error(`Create fixture ${name}: ${created.status} ${String(result.error ?? '')}`);
  const session = result.session;
  const image = await fs.readFile(path.join(repository,`docs/pro-review-20261113/photos/${game}.jpg`));
  const url = await store.saveEvidence('data:image/jpeg;base64,'+image.toString('base64'));
  session.name = `복원 검수 · ${name}`;
  session.evidence = structuredClone(fixture.photos).map((photo:any)=>({...photo,url,thumbnailUrl:url}));
  session.assertions = fixture.assertions.map((assertion:any)=>({...assertion,observationReceipts:assertion.observationReceipts ?? assertion.observationReceiptRefs.map((index:number)=>fixture.receipts[index])}));
  session.turnInstanceId = session.assertions[0]?.turnInstanceId ?? session.turnInstanceId;
  session.captureEpoch = session.evidence[0]?.captureEpoch ?? session.captureEpoch;
  session.notes = {public:'격리 검수 기록',private:{}};
  await store.saveSession(session);
  sessions.push({name,id:session.id,url:`${base}/?session=${session.id}`,sourceSHA:createHash('sha256').update(image).digest('hex')});
}
const manifest = {base,dataRoot,mode,providerAttempts,sessions};
await fs.writeFile(path.join(dataRoot,'review-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{
  console.log(JSON.stringify({providerAttempts,stopped:true,dataRoot}));
  server.closeAllConnections();server.close(()=>process.exit(0));
});
