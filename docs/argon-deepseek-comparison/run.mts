// Six exact, reviewed requests. No SDK retries, fallback, session writes, or key logs.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const here=path.dirname(new URL(import.meta.url).pathname),sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const pb=await fs.readFile(path.join(here,'preflight.json')),pre=JSON.parse(pb.toString());
if(pre.maxAttemptsIncludingFailures!==6||pre.automaticRetries!==0||pre.maxInputTokens!==32768||pre.maxOutputTokensIncludingThinking!==32768||pre.maximumTheoreticalUSD!==1.327104||pre.hardCapUSD!==1.40)throw Error('Budget contract drift');
for(const [f,h] of [[pre.astraCardPath,pre.astraCardSHA],[pre.evaluationSpecPath,pre.evaluationSpecSHA]])if(sha(await fs.readFile(f))!==h)throw Error('Scoring/card drift');
const manifest=JSON.parse(await fs.readFile(pre.sourceManifestPath,'utf8'));if(manifest.sourceDigest!==pre.sourceDigest)throw Error('Source digest drift');
for(const [f,h] of Object.entries(manifest.files))if(sha(await fs.readFile(path.join(manifest.source,f)))!==h)throw Error('Frozen source drift');
const adapter=await import(pathToFileURL(pre.privateAdapterPath).href),metadata=await adapter.credentialMetadata(),configBefore=await adapter.configHashes();
if(metadata.argon.provider!=='gemini'||metadata.argon.model!=='gemini-4-argon'||!metadata.argon.configured||metadata.argon.customBase||metadata.deepseek.provider!=='deepseek'||metadata.deepseek.model!=='deepseek-flash'||metadata.deepseek.effort!=='high'||!metadata.deepseek.configured)throw Error('Existing provider configuration missing/mismatch');
const prepared=[];
for(const step of pre.order){
 const i=pre.cases.find((i:any)=>i.gameId===step.gameId),image=await fs.readFile(i.imagePath),prompt=await fs.readFile(i.promptPath,'utf8');
 if(sha(image)!==i.imageSHA||sha(prompt)!==i.promptSHA||sha(await fs.readFile(i.GTPath))!==i.GTSHA||i.inputTokenConservativeBound>32768)throw Error('Input/GT drift');
 const body=JSON.stringify(adapter.requestBody(step.model,prompt,image));prepared.push({...step,body,bodySHA:sha(body),imageSHA:i.imageSHA,promptSHA:i.promptSHA});
}
if(prepared.length!==6||new Set(prepared.map(s=>s.gameId+':'+s.model)).size!==6)throw Error('Request sequence drift');
const freeze={runnerSHA:sha(await fs.readFile(new URL(import.meta.url))),adapterSHA:sha(await fs.readFile(pre.privateAdapterPath)),preflightSHA:sha(pb),configBefore,credentials:{argonConfigured:metadata.argon.configured,deepseekConfigured:metadata.deepseek.configured},requestBodyHashes:prepared.map(({sequence,gameId,model,bodySHA}:any)=>({sequence,gameId,model,sha256:bodySHA})),maximumTheoreticalUSD:1.327104,realCalls:0};
if(process.argv.includes('--prepare-only')){await fs.writeFile(path.join(here,'execution-preflight.json'),JSON.stringify(freeze,null,2)+'\n');console.log(JSON.stringify(freeze));process.exit(0);}
const checked=JSON.parse(await fs.readFile(path.join(here,'execution-preflight.json'),'utf8')),permission=JSON.parse(await fs.readFile(path.join(here,'permission.json'),'utf8'));
if(JSON.stringify(checked)!==JSON.stringify(freeze)||permission.status!=='APPROVED_EXACT_RUN'||permission.runnerSHA!==freeze.runnerSHA||permission.adapterSHA!==freeze.adapterSHA||permission.preflightSHA!==freeze.preflightSHA)throw Error('Exact script permission required');
const dir=pre.privateDirectory,claim=await fs.open(path.join(dir,'execution.claim'),'wx',0o600);await claim.writeFile(JSON.stringify({at:new Date().toISOString(),authorization:permission.messageId,...freeze}));await claim.close();
const report:any={status:'RUNNING',authorization:permission.messageId,...freeze,privateDirectory:dir,realCalls:0,upstreamAttempts:0,retry:0,hardCapUSD:1.40,startedAt:new Date().toISOString(),ownTemporaryServerStarted:false,productWrites:0,userWrites:0,requests:[]};
const persist=()=>fs.writeFile(path.join(here,'requests.json'),JSON.stringify(report,null,2)+'\n');await persist();
const nativeFetch=globalThis.fetch;let current:any;
globalThis.fetch=async(input:any,init:any)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const expected=current?.model==='argon'?'https://generativelanguage.googleapis.com/v1beta/interactions':'https://api.deepseek.com/responses';
 if(!current||url!==expected||init.method!=='POST'||init.redirect!=='error'||current.upstreamAttempt||report.upstreamAttempts>=6||sha(init.body)!==current.bodySHA)throw Error('Upstream request mismatch/cap');
 current.upstreamAttempt=++report.upstreamAttempts;await persist();return nativeFetch(input,init);
};
try{
 for(const step of prepared){
  const reserve=pre.reservationPerRequestUSD[step.model],reserved=report.requests.reduce((s:number,r:any)=>s+r.reservedUSD,0);
  if(report.requests.length>=6||reserved+reserve>1.40)throw Error('Peak reservation cap');
  current={sequence:step.sequence,gameId:step.gameId,model:step.model,state:'ATTEMPT_RECORDED',startedAt:new Date().toISOString(),bodySHA:step.bodySHA,imageSHA:step.imageSHA,promptSHA:step.promptSHA,reservedUSD:reserve};report.requests.push(current);report.realCalls=report.requests.length;await persist();console.log(JSON.stringify({event:'start',sequence:current.sequence,gameId:current.gameId,model:current.model}));
  const started=performance.now();
  try{
   const response=await adapter.send(step.model,step.body),bytes=Buffer.from(await response.arrayBuffer());current.latencyMs=performance.now()-started;current.httpStatus=response.status;current.providerBodySHA=sha(bytes);await fs.writeFile(path.join(dir,`${step.sequence}-${step.gameId}-${step.model}.provider.json`),bytes,{mode:0o600});
   if(!response.ok){current.state='FAILED';report.stop='provider-http-failure-no-retry';}
   else{
    const payload=JSON.parse(bytes.toString()),parsed=adapter.parse(step.model,payload);current.providerStatus=parsed.status;current.reportedModel=parsed.model;current.modelVersion=parsed.modelVersion;current.responseId=parsed.responseId;current.usage=parsed.usage;
    const u=parsed.usage,rates=pre.ratesPerMillion[step.model];
    if(!Number.isFinite(u.inputTokens)||!Number.isFinite(u.outputTokensIncludingThinking)||u.inputTokens>32768||u.outputTokensIncludingThinking>32768){current.state='FAILED';report.stop='usage-missing-inconsistent-or-bound-exceeded';}
    else{
     current.peakCacheMissUSD=(u.inputTokens*rates.input+u.outputTokensIncludingThinking*rates.output)/1e6;
     current.cacheAdjustedPeakUSD=((u.inputTokens-u.cachedTokens)*rates.input+u.cachedTokens*rates.cachedInput+u.outputTokensIncludingThinking*rates.output)/1e6;
     if(parsed.status!=='completed'||!parsed.raw||!Array.isArray(parsed.raw.objects)){current.state='FAILED';report.stop='incomplete-or-wrong-raw-shape';}
     else{const raw=JSON.stringify(parsed.raw);await fs.writeFile(path.join(dir,`${step.sequence}-${step.gameId}-${step.model}.raw.json`),raw,{mode:0o600});current.rawSHA=sha(raw);current.objects=parsed.raw.objects.length;current.state='COMPLETED';}
    }
   }
  }catch(e){current.state='FAILED';current.errorClass=e instanceof Error?e.name:'Unknown';report.stop='request-or-parse-failure-no-retry';}
  current.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify({event:'finish',sequence:current.sequence,gameId:current.gameId,model:current.model,state:current.state,status:current.httpStatus,latencyMs:current.latencyMs,objects:current.objects,peakUSD:current.peakCacheMissUSD}));if(report.stop)break;
 }
}finally{
 globalThis.fetch=nativeFetch;const after=await adapter.configHashes();report.operatingConfigsUnchanged=JSON.stringify(after)===JSON.stringify(configBefore);report.ownTemporaryServersRemaining=0;report.status=report.stop?'STOPPED':'COMPLETED';report.finishedAt=new Date().toISOString();report.totalCacheMissPeakUSD=report.requests.every((x:any)=>Number.isFinite(x.peakCacheMissUSD))?report.requests.reduce((s:number,x:any)=>s+x.peakCacheMissUSD,0):null;report.totalCacheAdjustedPeakUSD=report.requests.every((x:any)=>Number.isFinite(x.cacheAdjustedPeakUSD))?report.requests.reduce((s:number,x:any)=>s+x.cacheAdjustedPeakUSD,0):null;await persist();console.log(JSON.stringify({event:'done',status:report.status,realCalls:report.realCalls,upstreamAttempts:report.upstreamAttempts,peakUSD:report.totalCacheMissPeakUSD,configsUnchanged:report.operatingConfigsUnchanged}));
}
