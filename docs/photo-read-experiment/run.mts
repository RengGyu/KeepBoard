// Exact six-request pilot. No retry, operating config read, or operating write.
import {readFile,writeFile,rename,open,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGateway,validateConfig} from '../../gateway/server.mjs';
import {normalizeObservations} from '../../server/ai/index.ts';
const sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const here=path.dirname(new URL(import.meta.url).pathname);
const pre=JSON.parse(await readFile(path.join(here,'preflight.json'),'utf8'));
const cardBytes=await readFile(path.resolve('docs/vision-research-astra/experiment-card.json'));
if(sha(cardBytes)!==pre.cardSHA256)throw Error('Card changed');
const card=JSON.parse(cardBytes.toString()),dir=pre.privateDir;
const credentialReference=path.resolve('gateway/.local/secrets/deepseek.key');
if(!(await stat(credentialReference)).isFile())throw Error('Existing credential reference unavailable');
const ledgerFile=path.join(here,'requests.json');
// Exclusive claim prevents restarting the runner from reissuing an ambiguous paid attempt.
const claim=await open(path.join(dir,'execution.claim'),'wx',0o600);await claim.close();
const configFile=path.join(dir,'gateway-experiment.json');
const config=(effort:string)=>validateConfig({version:1,port:4411,providers:{deepseek:{kind:'deepseek',apiKeyFile:credentialReference}},aliases:{'board-vision':{provider:'deepseek',model:'deepseek-flash',effort,vision:true,timeoutMs:180000,maxOutputTokens:32768}}});
const configBytes=(effort:string)=>JSON.stringify(config(effort));
const publicState:any={cardId:card.id,startedAt:new Date().toISOString(),privateDir:dir,requests:[],automaticRetries:0,maxRequests:6,model:'deepseek-flash',alias:'board-vision',imageDetail:'high',maxOutputTokens:32768,temporaryConfigHashes:{high:sha(configBytes('high')),none:sha(configBytes('none'))},configDifference:['aliases.board-vision.effort'],operatingWrites:0};
const persist=()=>writeFile(ledgerFile,JSON.stringify(publicState,null,2)+'\n');
const privateJSON=(file:string,value:unknown)=>writeFile(path.join(dir,file),JSON.stringify(value,null,2),{mode:0o600});
async function operatingMetadata(){
 const settings=await fetch('http://127.0.0.1:4319/api/settings').then(r=>r.json());
 const aliases=await fetch('http://127.0.0.1:4330/v1/aliases').then(r=>r.json());
 return {settings:Object.fromEntries(['configured','provider','model','upstreamProvider','reasoningEffort'].filter(k=>Object.hasOwn(settings,k)).map(k=>[k,settings[k]])),aliases};
}
await writeFile(configFile,configBytes('high'),{mode:0o600});
publicState.operatingBefore=await operatingMetadata();await persist();
const server=createGateway({configFile});
try{
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(4411,'127.0.0.1',resolve);});
 publicState.temporaryServer={port:4411,pid:process.pid,startedAt:new Date().toISOString()};await persist();
 for(const step of card.execution_order){
  if(publicState.requests.length>=6)throw Error('Request cap');
  const i=card.inputs.find((x:any)=>x.game_id===step.game_id),p=pre.inputs.find((x:any)=>x.gameId===step.game_id);
  const preparationStart=performance.now(),fixture=JSON.parse(await readFile(p.inputFile,'utf8'));
  const original=await readFile(i.local_path);
  if(sha(original)!==i.sha256||sha(fixture.prompt)!==p.promptSHA256||sha(await readFile(path.resolve(i.pinned_pack.path)))!==i.pinned_pack.sha256)throw Error('Input drift');
  const effort=step.condition==='A'?'high':'none';
  await writeFile(configFile+'.next',configBytes(effort),{mode:0o600});await rename(configFile+'.next',configFile);
  const imageStart=performance.now(),image={mimeType:i.local_path.endsWith('.png')?'image/png':'image/jpeg',data:original.toString('base64')};
  const imagePrepareMs=performance.now()-imageStart,body=JSON.stringify({alias:'board-vision',prompt:fixture.prompt,images:[image]});
  const row:any={sequence:publicState.requests.length+1,gameId:i.game_id,condition:step.condition,effort,startedAt:new Date().toISOString(),state:'attempt-recorded',originalSHA256:sha(original),promptSHA256:sha(fixture.prompt),requestBodySHA256:sha(body),requestBytes:Buffer.byteLength(body),originalBytes:original.length,prepareMs:performance.now()-preparationStart,imagePrepareMs,promptPrepareMs:p.promptPrepareMs,configSHA256:sha(configBytes(effort)),imageDetail:'high'};
  publicState.requests.push(row);await persist();
  console.log(JSON.stringify({event:'request-start',sequence:row.sequence,gameId:row.gameId,effort}));
  const requestStart=performance.now();
  try{
   const response=await fetch('http://127.0.0.1:4411/v1/json',{method:'POST',headers:{'Content-Type':'application/json'},body,redirect:'error'});
   row.headersMs=performance.now()-requestStart;row.status=response.status;
   const bytes=Buffer.from(await response.arrayBuffer());row.completedMs=performance.now()-requestStart;row.responseBytes=bytes.length;
   await writeFile(path.join(dir,`${row.sequence}-${row.gameId}-${row.condition}.response.json`),bytes,{mode:0o600});
   const envelope=JSON.parse(bytes.toString());row.diagnostics=envelope.diagnostics??{};row.target=envelope.target??null;
   row.errorCode=envelope.error?.code??null;
   if(response.ok){
    const normalizedAt=performance.now();
    const normalized=normalizeObservations(envelope.data,fixture.pack,[fixture.evidence],fixture.session.turnInstanceId,fixture.session.players.map((x:any)=>x.id));
    row.normalizeMs=performance.now()-normalizedAt;
    await privateJSON(`${row.sequence}-${row.gameId}-${row.condition}.normalized.json`,normalized);
    const allowed=new Set(p.allowedFields.map((f:any)=>f.key)),expectedOwner=i.owner_id??undefined;
    const scopeProblems=(assertions:any[],raw=false)=>assertions.reduce((n,a)=>n+(!allowed.has(a.field)||(raw&&a.ownerId===undefined?false:a.ownerId!==expectedOwner)?1:0)+(Array.isArray(a.evidenceIds)&&a.evidenceIds.some((id:string)=>id!==fixture.evidence.id)?1:0)+(a.value?.pieces??[]).filter((piece:any)=>piece.evidenceId!==fixture.evidence.id).length,0);
    // Public raw often omits ownerId; null has identical access meaning.
    const rawAssertions=(envelope.data?.assertions??[]).map((a:any)=>({...a,ownerId:a.ownerId??undefined}));
    row.scopeViolations=scopeProblems(rawAssertions,true)+scopeProblems(normalized.assertions);
    row.rawAssertionCount=rawAssertions.length;row.normalizedAssertionCount=normalized.assertions.length;
    row.rawPieceCount=rawAssertions.reduce((n:number,a:any)=>n+(a.value?.pieces?.length??0),0);
    row.normalizedPieceCount=normalized.assertions.reduce((n:number,a:any)=>n+((a.value as any)?.pieces?.length??0),0);
    row.warningCount=normalized.warnings?.length??0;
    row.state='completed';
    if(row.scopeViolations){publicState.stopped='scope-violation';await persist();break;}
   }else{row.state='failed';if(effort==='none'){publicState.stopped='none-rejected-or-failed-no-substitute';await persist();break;}}
  }catch(error){row.state='failed';row.errorClass=error instanceof Error?error.name:'Unknown';publicState.stopped='request-or-local-processing-failure-no-retry';}
  row.finishedAt=new Date().toISOString();row.totalMs=performance.now()-preparationStart;await persist();
  console.log(JSON.stringify({event:'request-finished',sequence:row.sequence,status:row.status,state:row.state,completedMs:row.completedMs,scopeViolations:row.scopeViolations??null}));
  if(publicState.stopped)break;
 }
}finally{
 await new Promise<void>(resolve=>server.close(()=>resolve()));
 server.closeAllConnections();publicState.temporaryServerClosedAt=new Date().toISOString();publicState.temporaryServerListening=server.listening;
 publicState.operatingAfter=await operatingMetadata();publicState.operatingMetadataUnchanged=JSON.stringify(publicState.operatingBefore)===JSON.stringify(publicState.operatingAfter);
 publicState.finishedAt=new Date().toISOString();publicState.realRequests=publicState.requests.length;await persist();
 console.log(JSON.stringify({event:'experiment-finished',requests:publicState.realRequests,stopped:publicState.stopped??null,temporaryServerListening:server.listening,operatingMetadataUnchanged:publicState.operatingMetadataUnchanged}));
}
