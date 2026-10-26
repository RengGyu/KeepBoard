import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeProviderJSON, parseModelJSON } from '../server/ai/response.ts';
import { observeResponse } from '../docs/lightweight-catan-trial/response-observer.mts';

const gemini = (parts: unknown, finishReason = 'STOP') => ({candidates:[{content:{role:'model',parts},finishReason}],usageMetadata:{candidatesTokenCount:10}});
test('Gemini thought text cannot contaminate the final JSON answer', () => {
  assert.deepEqual(decodeProviderJSON(gemini([{thought:true,text:'synthetic thought placeholder'},{text:'{"count":2}'}]),'gemini'),{count:2});
});
test('failed JSON parsing records its stage without retaining model content', () => {
  assert.throws(()=>parseModelJSON('{"privateMarker":"synthetic-sensitive-marker",'),(error:any)=>{
    assert.equal(error.code,'invalid-json'); assert.equal(error.diagnostics.stage,'model-json');
    assert.equal(error.diagnostics.parserErrorClass,'SyntaxError');
    assert.ok(!JSON.stringify(error).includes('synthetic-sensitive-marker')); return true;
  });
});
test('truncated Gemini JSON exposes finish reason and final-text length only',()=>{
  assert.throws(()=>decodeProviderJSON(gemini([{text:'{"count":'}],'MAX_TOKENS'),'gemini'),(error:any)=>{
    assert.equal(error.code,'invalid-json');assert.equal(error.diagnostics.finishReason,'MAX_TOKENS');assert.equal(error.diagnostics.textLength,9);return true;
  });
});
test('missing Gemini candidate and malformed parts are distinguishable',()=>{
  assert.throws(()=>decodeProviderJSON({candidates:[],promptFeedback:{blockReason:'SAFETY'}},'gemini'),(e:any)=>e.code==='no-text'&&e.diagnostics.blockReason==='SAFETY');
  assert.throws(()=>decodeProviderJSON(gemini({text:'{"x":1}'}),'gemini'),(e:any)=>e.code==='response-shape');
});
test('OpenAI output_text convenience and wire output content retain the current contract',()=>{
  assert.deepEqual(decodeProviderJSON({output_text:'{"count":2}'},'openai'),{count:2});
  assert.deepEqual(decodeProviderJSON({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"count":2}'}]}]},'openai'),{count:2});
});
test('OpenAI incomplete and refusal diagnostics contain no refusal or answer content',()=>{
  assert.throws(()=>decodeProviderJSON({status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[{type:'message',content:[{type:'output_text',text:'{"count":'}]}]},'openai'),(e:any)=>e.code==='invalid-json'&&e.diagnostics.incompleteReason==='max_output_tokens');
  assert.throws(()=>decodeProviderJSON({output:[{type:'message',content:[{type:'refusal',refusal:'synthetic-sensitive-marker'}]}]},'openai'),(e:any)=>e.code==='no-text'&&!JSON.stringify(e).includes('synthetic-sensitive-marker'));
});
test('JSON grammar failures remain failures; no guessed repair or fabricated completion',()=>{
  for(const text of ['{"x":1,}','prefix {"x":1}','{"x":1}{"y":2}','{"x":']) assert.throws(()=>parseModelJSON(text));
  assert.deepEqual(parseModelJSON('```JSON\n{"x":1}\n```'),{x:1});
  assert.deepEqual(decodeProviderJSON(gemini([{text:'{"x":'},{text:'1}'}]),'gemini'),{x:1});
});
test('trial response observer consumes once and preserves both provider decoding paths',async()=>{
  for(const [provider,payload] of [['gemini',gemini([{text:'{"count":2}'}])],['openai',{output:[{type:'message',content:[{type:'output_text',text:'{"count":2}'}]}]}]] as const){
    const response=new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}});
    let observed=0;
    const wrapped=observeResponse(response,()=>{observed++;});
    assert.equal(wrapped.ok,true);assert.equal(wrapped.status,200);assert.equal(response.bodyUsed,false);
    const read=await wrapped.json();
    assert.deepEqual(decodeProviderJSON(read,provider),{count:2});
    assert.equal(observed,1);assert.equal(response.bodyUsed,true);
    await assert.rejects(()=>wrapped.json(),TypeError);
  }
});
test('unknown provider diagnostic strings cannot echo arbitrary content',()=>{
  assert.throws(()=>decodeProviderJSON({candidates:[],promptFeedback:{blockReason:'synthetic-sensitive-marker'}},'gemini'),(e:any)=>e.diagnostics.blockReason==='other'&&!JSON.stringify(e).includes('synthetic-sensitive-marker'));
});
