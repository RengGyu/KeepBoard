import test from 'node:test';import assert from 'node:assert/strict';
import * as profiles from '../server/ai/localTaskProfile';
import {LocalReader} from '../server/ai/localReader';
import {QWEN_NUMBER_PROMPT,QWEN_NUMBER_SCHEMA} from '../server/ai/qwenNumberGrounding';
import type {LocalReaderTaskCapability} from '../shared/lightweightRecognition';
import {mkdtemp,rm} from 'node:fs/promises';import http from 'node:http';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
const identity={kind:'local-observation-v1',model:'Qwen/Qwen3-VL-4B-Instruct-GGUF',modelRevision:'1cd86afb9a95c410a6038ab3b40d8b578c892266',weightSHA:'66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a',projectorSHA:'256f3a43bd4205ffef48d6b92715e1e70b5b0e9aef06522584967513a9985331',runtimeRevision:'620d2225cc436ab0b001e3200e590e3b286ef9ab',contextTokens:8192,maxOutputTokens:2048} as const;
test('numeric capability requires exact D2 pins plus live launch command; health/alias is insufficient',()=>{
 assert.equal(typeof profiles.verifiedNumeralProfile,'function');
 const config={identity,modelAlias:'fixture'},receipt={pid:123,args:['llama-server','--ctx-size','8192','--predict','2048','--parallel','1','--image-min-tokens','1024','--alias','fixture'],imageMinimumTokensOverride:1024};
 const p=profiles.verifiedNumeralProfile(config,receipt,receipt.args.join(' '));assert.equal(p.maxOutputTokens,1024);assert.equal(p.imageMinTokens,1024);assert.equal(p.promptSHA256,'18af5a6912a0af1b592686a0fd4087097da412070dcb4187c356e19204384861');
 for(const r of [{...receipt,args:receipt.args.filter(x=>x!=='--image-min-tokens')},{...receipt,pid:0},{...receipt,args:[...receipt.args,'--parallel','2']}])assert.throws(()=>profiles.verifiedNumeralProfile(config,r,r.args.join(' ')));
 assert.throws(()=>profiles.verifiedNumeralProfile(config,receipt,'another process'));
 assert.throws(()=>profiles.verifiedNumeralProfile({...config,identity:{...identity,weightSHA:'a'.repeat(64)}},receipt,receipt.args.join(' ')));
});
test('numeric transport uses compact D2 bytes/cap and pins effective identity; truncation has no retry',async()=>{
 const receipt={pid:123,args:['llama-server','--ctx-size','8192','--parallel','1','--image-min-tokens','1024','--alias','fixture'],imageMinimumTokensOverride:1024},profile=profiles.verifiedNumeralProfile({identity,modelAlias:'fixture'},receipt,receipt.args.join(' '));
 class FixtureReader extends LocalReader {async numeralCapability():Promise<LocalReaderTaskCapability>{return {task:'catan-numerals-v1',available:true,profile};}}
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-compact-transport-'));let calls=0,finish='stop';
 const server=http.createServer(async(req,res)=>{const chunks=[];for await(const b of req)chunks.push(b);const body=JSON.parse(Buffer.concat(chunks).toString());assert.equal(body.response_format.json_schema.name,'qwen_number_grounding');assert.equal(body.max_tokens,1024);assert.equal(body.cache_prompt,false);assert.equal(body.temperature,0);assert.equal(body.stream,false);assert.equal(body.messages[0].content[0].text,QWEN_NUMBER_PROMPT);assert.deepEqual(body.response_format.json_schema.schema,QWEN_NUMBER_SCHEMA);assert.equal(body.messages[0].content.length,2);calls++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:finish,message:{content:'{"items":[]}'}}]}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{const reader=new FixtureReader({version:1,endpoint:'http://127.0.0.1:'+(server.address() as any).port,modelAlias:'fixture',identity,receiptDirectory:root,timeoutMs:1000}),bytes=Buffer.from([1,2,3]),request={taskId:'compact-one',images:[{sha256:createHash('sha256').update(bytes).digest('hex')}]};
 const out=await (reader.read as any)(request,{},bytes,'image/png',[],profile);assert.deepEqual(out.raw,{items:[]});assert.equal(calls,1);
 await assert.rejects(()=>(reader.read as any)({...request,taskId:'wrong-profile'},{},bytes,'image/png',[],{...profile,maxOutputTokens:2048}));assert.equal(calls,1);
 finish='length';await assert.rejects(()=>(reader.read as any)({...request,taskId:'truncated'},{},bytes,'image/png',[],profile),/truncated/);assert.equal(calls,2);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
});
