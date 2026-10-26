// Synthetic response bodies only. No settings import, fetch, image or actual API use.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {decodeProviderJSON,AIResponseError,responseDiagnostics} from '../../server/ai/response.ts';
import {observeResponse} from './response-observer.mts';
const here=path.dirname(fileURLToPath(import.meta.url));
const oldDecode=(p:any,provider:string)=>{
 const text=provider==='gemini'?(p.candidates?.[0]?.content?.parts||[]).map((part:any)=>part.text||'').join(''):p.output_text||(p.output||[]).flatMap((item:any)=>item.content||[]).filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
 if(!text) throw new Error('no-text');
 try{return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
 catch{throw new Error('model-json');}
};
const gemini=(parts:unknown,finishReason='STOP')=>({candidates:[{content:{parts},finishReason}]});
const cases=[
 {id:'gemini-valid',provider:'gemini',payload:gemini([{text:'{"count":2}'}])},
 {id:'gemini-thought-plus-json',provider:'gemini',payload:gemini([{thought:true,text:'synthetic thought placeholder'},{text:'{"count":2}'}])},
 {id:'gemini-max-tokens-partial',provider:'gemini',payload:gemini([{text:'{"count":'}],'MAX_TOKENS')},
 {id:'gemini-trailing-comma',provider:'gemini',payload:gemini([{text:'{"count":2,}'}])},
 {id:'gemini-prose-prefix',provider:'gemini',payload:gemini([{text:'synthetic prefix {"count":2}'}])},
 {id:'gemini-fenced-json',provider:'gemini',payload:gemini([{text:'```json\n{"count":2}\n```'}])},
 {id:'gemini-blocked',provider:'gemini',payload:{candidates:[],promptFeedback:{blockReason:'SAFETY'}}},
 {id:'gemini-empty-text',provider:'gemini',payload:gemini([{text:''}])},
 {id:'gemini-parts-object',provider:'gemini',payload:gemini({text:'{"count":2}'})},
 {id:'openai-wire',provider:'openai',payload:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"count":2}'}]}]}},
 {id:'openai-incomplete',provider:'openai',payload:{status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[{type:'message',content:[{type:'output_text',text:'{"count":'}]}]}},
 {id:'openai-refusal',provider:'openai',payload:{status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'synthetic placeholder'}]}]}},
];
const results=[];
for(const c of cases){
 let reads=0;const native=new Response(JSON.stringify(c.payload),{status:200});
 const observed=observeResponse(native,()=>reads++);const payload=await observed.json();assert.equal(reads,1);
 let old:any;try{old={status:'success',value:oldDecode(payload,c.provider)};}catch(e:any){old={status:'failed',errorClass:e.name,localStage:e.message==='model-json'?'model-json':e.message==='no-text'?'response-text':'response-shape',originalHarnessFailureClass:'request-or-parse'};}
 let current:any;try{current={status:'success',value:decodeProviderJSON(payload,c.provider as any,200)};}catch(e:any){assert.ok(e instanceof AIResponseError);current={status:'failed',code:e.code,diagnostics:e.diagnostics};}
 let bare:any;try{bare={status:'success',value:oldDecode(c.payload,c.provider)};}catch(e:any){bare={status:'failed',errorClass:e.name,localStage:e.message==='model-json'?'model-json':e.message==='no-text'?'response-text':'response-shape',originalHarnessFailureClass:'request-or-parse'};}
 assert.deepEqual(old,bare,'observer changed decoder result');
 results.push({case:c.id,httpStatus:observed.status,responseJSONReadCount:reads,bodyUsed:native.bodyUsed,original:old,current,metadata:responseDiagnostics(payload,c.provider as any)});
}
assert.equal(results.find(r=>r.case==='gemini-thought-plus-json')?.original.status,'failed');
assert.equal(results.find(r=>r.case==='gemini-thought-plus-json')?.current.status,'success');
assert.equal(results.filter(r=>r.original.status==='failed').length,9);
await writeFile(path.join(here,'parser-reproduction.json'),JSON.stringify({status:'passed',realAPICalls:0,scope:'synthetic possibilities; none establishes the actual missing response contents',cases:results},null,2)+'\n');
console.log(`PASS ${results.length} synthetic cases: observer parity; 9 distinct failures collapse in old catch; thought concatenation fixed.`);
