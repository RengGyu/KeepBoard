import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer, type Server } from 'node:http';
import { createGateway, finalJSON, validateConfig } from '../gateway/server.mjs';
import { analyzeEvidence, getAIStatus, saveAISettings } from '../server/ai/index.ts';
import type { GamePack, Session } from '../shared/types.ts';
const close=async(server:Server)=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));};
const listen=async(server:Server)=>{await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();assert(a&&typeof a!=='string');return `http://127.0.0.1:${a.port}`;};
const cfg=()=>({version:1,port:4330,providers:{deepseek:{kind:'deepseek',apiKeyFile:'key.txt'},openai:{kind:'openai',apiKeyFile:'key.txt'}},aliases:{'board-vision':{provider:'deepseek',model:'deepseek-flash',effort:'high',vision:true,timeoutMs:2000}}});
const good=(value:unknown)=>({status:'completed',model:'deepseek-flash',reasoning:{effort:'high'},usage:{input_tokens:12,output_tokens:8,output_tokens_details:{reasoning_tokens:3}},output:[{type:'reasoning',content:[{type:'reasoning_text',text:'NOT FINAL JSON'}]},{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
async function fixture() {
 const dir=await mkdtemp(path.join(os.tmpdir(),'keepboard-gateway-')),configFile=path.join(dir,'config.json');await writeFile(path.join(dir,'key.txt'),'synthetic-secret-only');await writeFile(configFile,JSON.stringify(cfg()));
 const received:any[]=[],logs:any[]=[];let reply:any=good({ok:true}),status=200,delay=0;
 const upstream=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);received.push(JSON.parse(Buffer.concat(chunks).toString()));if(delay)await new Promise(r=>setTimeout(r,delay));res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(reply));});const upstreamURL=await listen(upstream);
 const server=createGateway({configFile,endpointOverride:()=>upstreamURL,onDiagnostic:entry=>logs.push(entry)}),url=await listen(server);
 const call=(input:unknown,headers:Record<string,string>={})=>fetch(url+'/v1/json',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(input)});
 return {dir,configFile,received,logs,url,call,set:(v:any,s=200,d=0)=>{reply=v;status=s;delay=d;},cleanup:async()=>{await close(server);await close(upstream);await rm(dir,{recursive:true,force:true});}};
}

test('a standalone local gateway exists without relying on the KeepBoard process',async()=>{
 assert.equal(await access(new URL('../gateway/server.mjs',import.meta.url)).then(()=>true,()=>false),true,'gateway server is required');
});

test('aliases reload without restarting; model/high and image bytes reach Responses while keys/prompts stay out of diagnostics',async()=>{
 const f=await fixture();try{
  const request={alias:'board-vision',prompt:'JSON synthetic prompt never logged',images:[{mimeType:'image/png',data:'aGVsbG8='}]};
  let response=await f.call(request);assert.equal(response.status,200);let body=await response.json();assert.deepEqual(body.data,{ok:true});assert.equal(body.target.effort,'high');assert.equal(body.diagnostics.reasoningTokens,3);
  assert.equal(f.received[0].model,'deepseek-flash');assert.deepEqual(f.received[0].reasoning,{effort:'high'});assert.equal(f.received[0].input[0].content[1].image_url,'data:image/png;base64,aGVsbG8=');
  const changed=cfg();Object.assign(changed.aliases['board-vision'],{provider:'openai',model:'synthetic-model-two',effort:'low'});await writeFile(f.configFile,JSON.stringify(changed));
  response=await f.call(request);body=await response.json();assert.equal(body.target.model,'synthetic-model-two');assert.equal(f.received[1].model,'synthetic-model-two');assert.equal(f.received[1].reasoning.effort,'low');
  const log=JSON.stringify(f.logs);assert(!log.includes(request.prompt));assert(!log.includes('aGVsbG8='));assert(!log.includes('synthetic-secret-only'));assert(!JSON.stringify(body).includes('synthetic-secret-only'));
  await writeFile(f.configFile,'invalid');assert.equal((await f.call(request)).status,503);assert.equal(f.received.length,2,'bad config never falls back to prior target');
 }finally{await f.cleanup();}
});

test('unknown aliases, arbitrary proxy destinations, remote origins, vision-disabled targets and invalid config are rejected before billing',async()=>{
 const f=await fixture();try{
  const request={alias:'board-vision',prompt:'JSON',images:[]};
  assert.equal((await f.call({...request,alias:'missing'})).status,400);
  assert.equal((await f.call({...request,url:'https://example.com'})).status,400);
  assert.equal((await f.call(request,{Origin:'https://example.com'})).status,403);
  const c=cfg();c.aliases['board-vision'].vision=false;await writeFile(f.configFile,JSON.stringify(c));
  assert.equal((await f.call({...request,images:[{mimeType:'image/png',data:'aGVsbG8='}]})).status,400);assert.equal(f.received.length,0);
  assert.throws(()=>validateConfig({...cfg(),providers:{deepseek:{kind:'deepseek',apiKey:'inline-secret'}}}));
  const pro=cfg();pro.aliases['board-vision'].model='deepseek-v4-pro';assert.throws(()=>validateConfig(pro));
 }finally{await f.cleanup();}
});

test('upstream errors and malformed/incomplete final JSON produce safe errors with no retries or thinking contamination',async()=>{
 const f=await fixture();try{
  const request={alias:'board-vision',prompt:'JSON',images:[]};
  f.set({error:{message:'synthetic-secret-only echoed request JSON header'}},401);let response=await f.call(request);assert.equal(response.status,401);let body=await response.json();assert.equal(body.error.code,'authentication');assert(!JSON.stringify(body).includes('echoed'));
  f.set(good('valid JSON string'));response=await f.call(request);assert.equal(response.status,200);
  f.set({...good({ok:true}),status:'incomplete'});body=await (await f.call(request)).json();assert.equal(body.error.code,'incomplete');
  f.set({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{broken'}]}]});body=await (await f.call(request)).json();assert.equal(body.error.code,'invalid-json');
  f.set({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'sensitive refusal'}]}]});body=await (await f.call(request)).json();assert.equal(body.error.code,'refusal');assert(!JSON.stringify(body).includes('sensitive'));
  const c=cfg();c.aliases['board-vision'].timeoutMs=100;await writeFile(f.configFile,JSON.stringify(c));f.set(good({ok:true}),200,500);response=await f.call(request);assert.equal(response.status,504);
  assert.equal(f.received.length,6,'each explicit request reaches upstream once only');
  assert.deepEqual(finalJSON({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'not JSON'},{text:'{"ok":true}'}]}}]},'gemini').data,{ok:true});
 }finally{await f.cleanup();}
});

test('KeepBoard gateway routing preserves Gemini recovery settings, private parser normalization and exact evidence IDs without fallback',async()=>{
 const f=await fixture(),previous=process.env.KEEPBOARD_DATA_DIR;process.env.KEEPBOARD_DATA_DIR=f.dir;
 try{
  await saveAISettings({provider:'gemini',model:'synthetic-gemini',apiKey:'recovery-only',baseUrl:'http://127.0.0.1:1'});
  const original=await readFile(path.join(f.dir,'ai-settings.json'));
  await writeFile(path.join(f.dir,'ai-routing.json'),JSON.stringify({mode:'gateway',url:f.url,alias:'board-vision'}));
  const status=await getAIStatus();assert.equal(status.provider,'gateway');assert.equal(status.model,'deepseek-flash');assert.equal(status.reasoningEffort,'high');assert(!JSON.stringify(status).includes('recovery-only'));
  f.set(good({summary:'synthetic',assertions:[{field:'wood',value:3,evidenceIds:['photo']}]}));
  const evidence:any={id:'photo',url:'data:image/png;base64,aGVsbG8=',label:'synthetic',kind:'photo',scope:'public',captureEpoch:'epoch',capturedAt:'synthetic'};
  const pack={title:'synthetic',edition:'test',version:'1',fields:[{key:'wood',type:'number',scope:'public',acquisition:'observe'}],derivedRules:[]} as unknown as GamePack;
  const session={assertions:[],players:[],turnInstanceId:'turn'} as unknown as Session;
  const result=await analyzeEvidence({session,pack,evidence:[evidence]});assert.equal(result.assertions[0].value,3);assert.deepEqual(result.assertions[0].evidenceIds,['photo']);assert.equal(result.assertions[0].status,'candidate');
  assert.equal(f.received[0].reasoning.effort,'high');
  f.set({error:{message:'do not echo'}},401);await assert.rejects(analyzeEvidence({session,pack,evidence:[evidence]}),/authentication/);assert.equal(f.received.length,2);
  assert.deepEqual(await readFile(path.join(f.dir,'ai-settings.json')),original);
  await writeFile(path.join(f.dir,'ai-routing.json'),JSON.stringify({mode:'direct'}));assert.equal((await getAIStatus()).provider,'gemini');
 }finally{if(previous===undefined)delete process.env.KEEPBOARD_DATA_DIR;else process.env.KEEPBOARD_DATA_DIR=previous;await f.cleanup();}
});
