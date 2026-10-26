// Six newly authorized requests only. Private originals/results, no user session writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const here=path.dirname(new URL(import.meta.url).pathname),sha=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
const pb=await fs.readFile(path.join(here,'preflight.json')),pre=JSON.parse(pb.toString());
if(pre.maxAttemptsIncludingFailures!==6||pre.automaticRetries!==0||pre.hardCapUSD!==.30||pre.maximumCostUSD!==.294912||pre.maxInputTokens!==32768||pre.maxOutputTokensIncludingReasoning!==32768)throw Error('Budget contract mismatch');
if(sha(await fs.readFile(pre.astraCardPath))!==pre.astraCardSHA)throw Error('Card drift');
const manifest=JSON.parse(await fs.readFile(pre.sourceManifestPath,'utf8')),app=manifest.source;
if(manifest.sourceDigest!==pre.sourceDigest)throw Error('Source digest drift');
for(const [f,h] of Object.entries(manifest.files))if(sha(await fs.readFile(path.join(app,f)))!==h)throw Error('Frozen source drift');
for(const i of pre.inputs){
 if(sha(await fs.readFile(i.imagePath))!==i.imageSHA||sha(await fs.readFile(i.GTPath))!==i.GTSHA)throw Error('Image/GT drift');
 for(const arm of ['A','B'])if(sha(await fs.readFile(i.prompts[arm].path))!==i.prompts[arm].sha256||i.prompts[arm].inputTokenConservativeBound>32768)throw Error('Prompt/bound drift');
}
if(pre.order.length!==6||new Set(pre.order.map((x:any)=>x.gameId+':'+x.arm)).size!==6)throw Error('Order mismatch');
const {createGateway,validateConfig}=await import(pathToFileURL(path.join(app,'gateway/server.mjs')).href);
const originalConfigPath=path.resolve('gateway/.local/config.json'),configBefore=await fs.readFile(originalConfigPath),original=JSON.parse(configBefore.toString()),alias=original.aliases['board-vision'],provider={...original.providers[alias.provider]};
if(provider.kind!=='deepseek'||alias.model!=='deepseek-flash'||alias.effort!=='high'||!alias.vision)throw Error('Target drift');
if(provider.apiKeyFile)provider.apiKeyFile=path.resolve(path.dirname(originalConfigPath),provider.apiKeyFile);
if(provider.apiKeyFile&&!(await fs.stat(provider.apiKeyFile)).isFile())throw Error('Credential reference missing');
const config=validateConfig({version:1,port:4412,providers:{deepseek:provider},aliases:{'board-vision':{provider:'deepseek',model:'deepseek-flash',effort:'high',vision:true,timeoutMs:240000,maxOutputTokens:32768}}});
const freeze={preflightSHA:sha(pb),runnerSHA:sha(await fs.readFile(new URL(import.meta.url))),astraCardSHA:pre.astraCardSHA,sourceDigest:pre.sourceDigest,configBeforeSHA:sha(configBefore),tempConfigSHA:sha(JSON.stringify(config)),realCalls:0,gt:pre.inputs.map((i:any)=>({gameId:i.gameId,sha:i.GTSHA})),maximumCostUSD:.294912};
if(process.argv.includes('--prepare-only')){await fs.writeFile(path.join(here,'execution-preflight.json'),JSON.stringify(freeze,null,2)+'\n');console.log(JSON.stringify(freeze));process.exit(0);}
const checked=JSON.parse(await fs.readFile(path.join(here,'execution-preflight.json'),'utf8'));
if(JSON.stringify(checked)!==JSON.stringify(freeze))throw Error('Execution preflight changed');
const auth=JSON.parse(await fs.readFile(path.join(here,'permission.json'),'utf8'));
if(auth.runnerSHA!==freeze.runnerSHA||auth.preflightSHA!==freeze.preflightSHA||auth.status!=='APPROVED_EXACT_RUN')throw Error('Exact permission required');
const dir=pre.privateDirectory,claim=await fs.open(path.join(dir,'execution.claim'),'wx',0o600);await claim.writeFile(JSON.stringify({at:new Date().toISOString(),authorization:auth.messageId,runnerSHA:freeze.runnerSHA}));await claim.close();
const configFile=path.join(dir,'gateway-test.json');await fs.writeFile(configFile,JSON.stringify(config),{mode:0o600});
const report:any={status:'RUNNING',...freeze,authorization:auth.messageId,privateDirectory:dir,realCalls:0,actualUpstreamAttempts:0,automaticRetries:0,reservedPerAttemptUSD:.049152,hardCapUSD:.30,productionWrites:0,startedAt:new Date().toISOString(),requests:[]};
const persist=()=>fs.writeFile(path.join(here,'requests.json'),JSON.stringify(report,null,2)+'\n');await persist();
const nativeFetch=globalThis.fetch;let current:any;
globalThis.fetch=async(input:any,init:any)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(url!=='https://api.deepseek.com/responses')return nativeFetch(input,init);
 const body=JSON.parse(init.body),parts=body.input?.[0]?.content,images=parts?.filter((x:any)=>x.type==='input_image')??[],text=parts?.find((x:any)=>x.type==='input_text')?.text;
 const fixture=pre.inputs.find((i:any)=>i.gameId===current?.gameId);
 if(!current||current.upstreamAttempt||report.actualUpstreamAttempts>=6||body.model!=='deepseek-flash'||body.reasoning?.effort!=='high'||body.max_output_tokens!==32768||images.length!==1||images[0].detail!=='high'||sha(Buffer.from(images[0].image_url.split(',')[1],'base64'))!==fixture.imageSHA||sha(text)!==fixture.prompts[current.arm].sha256)throw Error('Upstream contract/cap drift');
 current.upstreamAttempt=++report.actualUpstreamAttempts;current.providerRequestSHA=sha(init.body);await persist();
 const response=await nativeFetch(input,init),bytes=Buffer.from(await response.clone().arrayBuffer());
 await fs.writeFile(path.join(dir,`${current.sequence}-${current.gameId}-${current.arm}.provider.json`),bytes,{mode:0o600});current.providerResponseSHA=sha(bytes);return response;
};
const server=createGateway({configFile});
try{
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;
 for(const step of pre.order){
  if(report.requests.length>=6||(report.requests.length+1)*.049152>.30)throw Error('Reservation cap');
  const i=pre.inputs.find((x:any)=>x.gameId===step.gameId),t0=performance.now(),image=await fs.readFile(i.imagePath),prompt=await fs.readFile(i.prompts[step.arm].path,'utf8');
  const body=JSON.stringify({alias:'board-vision',prompt,images:[{mimeType:i.mimeType,data:image.toString('base64')}]}),prepareMs=performance.now()-t0;
  current={...step,state:'ATTEMPT_RECORDED',startedAt:new Date().toISOString(),imageSHA:i.imageSHA,promptSHA:i.prompts[step.arm].sha256,prepareMs,requestBodySHA:sha(body)};report.requests.push(current);report.realCalls=report.requests.length;await persist();console.log(JSON.stringify({event:'start',sequence:current.sequence,gameId:current.gameId,arm:current.arm}));
  const started=performance.now();
  try{
   const response=await fetch('http://127.0.0.1:'+port+'/v1/json',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(285000),redirect:'error'}),bytes=Buffer.from(await response.arrayBuffer());current.latencyMs=performance.now()-started;current.status=response.status;
   await fs.writeFile(path.join(dir,`${current.sequence}-${current.gameId}-${current.arm}.envelope.json`),bytes,{mode:0o600});const envelope=JSON.parse(bytes.toString());current.usage=envelope.diagnostics??{};current.errorCode=envelope.error?.code??null;
   if(!response.ok){current.state='FAILED';report.stop='provider-failure-no-retry';}
   else{const parseStart=performance.now(),raw=JSON.stringify(envelope.data);current.jsonSerializeMs=performance.now()-parseStart;await fs.writeFile(path.join(dir,`${current.sequence}-${current.gameId}-${current.arm}.raw.json`),raw,{mode:0o600});current.rawSHA=sha(raw);current.rawBytes=Buffer.byteLength(raw);current.state='COMPLETED';}
   const u=current.usage;
   if(Number.isFinite(u.inputTokens)&&Number.isFinite(u.outputTokens)){current.peakCostUSD=(u.inputTokens*.3+u.outputTokens*1.2)/1e6;if(u.inputTokens>32768||u.outputTokens>32768)report.stop='token-bound-exceeded';}else{current.cost='UNKNOWN_RESERVED_MAX';report.stop='usage-missing-stop';}
  }catch(e){current.state='FAILED';current.errorClass=e instanceof Error?e.name:'Unknown';report.stop='failure-no-retry';}
  current.finishedAt=new Date().toISOString();await persist();console.log(JSON.stringify({event:'finish',sequence:current.sequence,gameId:current.gameId,arm:current.arm,state:current.state,status:current.status,latencyMs:current.latencyMs,costUSD:current.peakCostUSD}));if(report.stop)break;
 }
}catch(e){report.stop='local-failure-no-retry';report.errorClass=e instanceof Error?e.name:'Unknown';}
finally{
 globalThis.fetch=nativeFetch;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));report.ownGatewayClosed=!server.listening;report.operatingConfigUnchanged=sha(await fs.readFile(originalConfigPath))===freeze.configBeforeSHA;report.finishedAt=new Date().toISOString();report.status=report.stop?'STOPPED':'COMPLETED';report.actualPeakCostUSD=report.requests.every((r:any)=>Number.isFinite(r.peakCostUSD))?report.requests.reduce((n:number,r:any)=>n+r.peakCostUSD,0):null;await persist();console.log(JSON.stringify({event:'done',status:report.status,attempts:report.realCalls,upstreamAttempts:report.actualUpstreamAttempts,costUSD:report.actualPeakCostUSD,ownGatewayClosed:report.ownGatewayClosed,operatingConfigUnchanged:report.operatingConfigUnchanged}));
}
