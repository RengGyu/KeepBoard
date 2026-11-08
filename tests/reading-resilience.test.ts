import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {catalogPacks} from '../gamepacks/catalog';import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {buildTerraGameBody,completeItemsPrefix,decodeTerraGameObservation,LunaGameReader,LUNA_IDENTITY} from '../server/ai/terraGameReader';
import {hostedReaderFor} from '../server/ai/hostedReader';
const pack=catalogPacks.find(p=>p.id==='sagrada')!,definition=photoDefinition(pack),area=definition.areas.find(a=>a.id==='window')!,bytes=Buffer.from('original');
const request=compileObservationTask({pack,definition,areaId:area.id,taskId:'resilience',scope:{partition:area.partition,ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:createHash('sha256').update(bytes).digest('hex'),width:1024,height:768,transformId:null}]});
const box={ymin:100,xmin:100,ymax:300,xmax:300},good=(y=100)=>({kind:'dice',box_1000:{...box,ymin:y},face:'front',quantity:1,physicalUnit:'single',attributes:[]});
const envelope=(text:string,extra:object={status:'completed'})=>({model:LUNA_IDENTITY.model,...extra,output:[{type:'message',content:[{type:'output_text',text}]}]});
const done=(items:unknown[])=>envelope(JSON.stringify({items}));
test('one row that breaks the contract costs only that row, keeps numbering and is recorded',()=>{
 const read=decodeTerraGameObservation(done([good(),{...good(),kind:'not-a-kind'},{...good(),quantity:-1},good(120)]),request,definition);
 assert.deepEqual(read.raw.observations.map(o=>o.ref),['item-1','item-4']);
 assert.deepEqual(read.hostedWire.deferred.filter(d=>d.property==='row').map(d=>d.ref),['item-2','item-3']);
 assert.deepEqual(Object.keys(read.hostedWire.physicalUnits!),['item-1','item-4']);
});
test('a response with no usable row is still rejected, and an empty list stays valid',()=>{
 assert.throws(()=>decodeTerraGameObservation(done([{...good(),kind:'not-a-kind'}]),request,definition));
 assert.deepEqual(decodeTerraGameObservation(done([]),request,definition).raw.observations,[]);
});
test('a positional box is never trusted: the row keeps its values without a placement',()=>{
 const read=decodeTerraGameObservation(done([{...good(),box_1000:[100,100,300,300]}]),request,definition);
 assert.equal(read.raw.observations[0].bbox,null);assert(read.hostedWire.deferred.some(d=>d.property==='box_1000'));
});
test('output cut at the token limit keeps complete rows and discards the unfinished one',()=>{
 const whole=JSON.stringify({items:[good(),good(120),good(140)]}),cut=whole.slice(0,whole.lastIndexOf('{"kind"')+25);
 const read=decodeTerraGameObservation(envelope(cut,{status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),request,definition);
 assert.equal(read.raw.observations.length,2);assert(read.hostedWire.deferred.some(d=>d.reason==='provider-output-truncated'));
});
test('braces inside strings do not confuse the row scanner',()=>{
 const row=(t:string)=>({a:t});assert.deepEqual(completeItemsPrefix('{"items":['+JSON.stringify(row('x}]"{'))+','+JSON.stringify(row('y')).slice(0,4)),{items:[row('x}]"{')]});
 assert.equal(completeItemsPrefix('{"items":[{"a":'),null);assert.equal(completeItemsPrefix('{"other":1'),null);
});
test('other incomplete outcomes still fail',()=>{
 const whole=JSON.stringify({items:[good()]});
 for(const extra of [{status:'incomplete',incomplete_details:{reason:'content_filter'}},{status:'incomplete'},{status:'failed'}])assert.throws(()=>decodeTerraGameObservation(envelope(whole,extra),request,definition));
 assert.throws(()=>decodeTerraGameObservation(envelope('{"items":[{"kind"',{status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}),request,definition));
});
const reader=(replies:(()=>Response)[],o:object={})=>{let calls=0;return {reader:new LunaGameReader({key:async()=>'synthetic',retryDelayMs:0,fetch:(async()=>replies[calls++]()) as any,...o}),calls:()=>calls};};
const ok=()=>new Response(JSON.stringify(done([good()])),{status:200});
test('a provider 5xx reply is retried once and the result is used',async()=>{
 const r=reader([()=>new Response(null,{status:503}),ok]);const read=await r.reader.read(request,definition,bytes,'image/png');assert.equal(read.raw.observations.length,1);assert.equal(r.calls(),2);
});
test('retry stops after one attempt, and rate limits or lost connections are never replayed',async()=>{
 const twice=reader([()=>new Response(null,{status:503}),()=>new Response(null,{status:503}),ok]);await assert.rejects(twice.reader.read(request,definition,bytes,'image/png'),/503/);assert.equal(twice.calls(),2);
 const limited=reader([()=>new Response(null,{status:429}),ok]);await assert.rejects(limited.reader.read(request,definition,bytes,'image/png'),/429/);assert.equal(limited.calls(),1);
 const lost=reader([()=>{throw new TypeError('socket');},ok]);await assert.rejects(lost.reader.read(request,definition,bytes,'image/png'),/socket/);assert.equal(lost.calls(),1);
});
test('a job pinned to no retries keeps that behavior',async()=>{
 const r=reader([()=>new Response(null,{status:503}),ok],{automaticRetries:0});await assert.rejects(r.reader.read(request,definition,bytes,'image/png'),/503/);assert.equal(r.calls(),1);
 assert.equal((hostedReaderFor({...LUNA_IDENTITY,automaticRetries:0}).identity as any).automaticRetries,0);assert.equal((hostedReaderFor(LUNA_IDENTITY).identity as any).automaticRetries,1);
});
test('the request follows the reader identity; the default body is unchanged',()=>{
 const base=buildTerraGameBody(request,definition,bytes,'image/png');assert.equal(base.model,'gpt-6-luna');assert.equal(base.reasoning.effort,'high');
 const other=buildTerraGameBody(request,definition,bytes,'image/png',LUNA_IDENTITY.adapterVersion,{},{...LUNA_IDENTITY,reasoningEffort:'low' as any,maxOutputTokens:100 as any,imageDetail:'low' as any});
 assert.equal(other.reasoning.effort,'low');assert.equal(other.max_output_tokens,100);assert.equal((other.input[0].content[1] as any).detail,'low');
 assert.deepEqual({...other,reasoning:base.reasoning,max_output_tokens:base.max_output_tokens,input:base.input},base);
});
test('the default service reader is Terra high with the lean format and stays inside the function limit',async()=>{
 const {TERRA_HIGH_IDENTITY}=await import('../server/ai/terraGameReader'),{LEAN_TERRA_PROFILE}=await import('../server/ai/terraCompact');
 const id=TERRA_HIGH_IDENTITY;assert.equal(id.model,'gpt-6.1-terra');assert.equal(id.reasoningEffort,'high');assert.equal(id.adapterVersion,LEAN_TERRA_PROFILE);assert(id.timeoutMs<300000);
 const pinned=hostedReaderFor(id);assert.deepEqual(pinned.identity,id);
 let sent:any;const r=new LunaGameReader({identity:id,key:async()=>'synthetic',fetch:(async(_u:any,init:any)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({model:id.model,status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"v":3,"items":[]}'}]}]}),{status:200});}) as any});
 const read=await r.read(request,definition,bytes,'image/png');assert.equal(read.raw.observations.length,0);assert.equal(sent.model,'gpt-6.1-terra');assert.equal(sent.reasoning.effort,'high');assert.match(sent.input[0].content[0].text,/visible physical instance boundaries/);
 const wrong=new LunaGameReader({identity:id,key:async()=>'synthetic',fetch:(async()=>new Response(JSON.stringify({model:'gpt-6-luna',status:'completed',output:[]}),{status:200})) as any});await assert.rejects(wrong.read(request,definition,bytes,'image/png'),/다릅니다/);
});
const sse=(events:object[])=>{const text=events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('');return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text.slice(0,text.length/2)));c.enqueue(new TextEncoder().encode(text.slice(text.length/2)));c.close();}}),{status:200,headers:{'content-type':'text/event-stream'}});};
test('a Terra-high stream reads like a plain reply, reports rows and asks for streaming',async()=>{
 const {TERRA_HIGH_IDENTITY:id,readResponseStream}=await import('../server/ai/terraGameReader');const text=JSON.stringify({v:3,items:[]}),native={model:id.model,status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]};let sent:any;
 const r=new LunaGameReader({identity:id,key:async()=>'x',fetch:(async(_u:any,init:any)=>{sent=JSON.parse(init.body);return sse([{type:'response.output_text.delta',delta:text},{type:'response.completed',response:native}]);}) as any});
 assert.equal((await r.read(request,definition,bytes,'image/png')).raw.observations.length,0);assert.equal(sent.stream,true);
 const seen:number[]=[],row=JSON.stringify(good());const whole=await readResponseStream(sse([{type:'response.output_text.delta',delta:'{"items":['+row+','},{type:'response.completed',response:native}]).body as any,id.model,n=>seen.push(n));assert.deepEqual(whole,native);assert.deepEqual(seen,[1]);
});
test('a stream that breaks after rows arrived keeps those rows and is not replayed; before any text it fails',async()=>{
 const {readResponseStream}=await import('../server/ai/terraGameReader');const whole=JSON.stringify({items:[good(),good(120)]}),cut=whole.slice(0,whole.lastIndexOf('{"kind"')+20);
 const broken=async function*(events:object[]){for(const e of events)yield new TextEncoder().encode('data: '+JSON.stringify(e)+'\n\n');throw new Error('socket lost');};
 const native=await readResponseStream(broken([{type:'response.output_text.delta',delta:cut}]),LUNA_IDENTITY.model);
 const read=decodeTerraGameObservation(native,request,definition);assert.equal(read.raw.observations.length,1);assert(read.hostedWire.deferred.some(d=>d.reason==='provider-output-truncated'));
 await assert.rejects(readResponseStream(broken([]),LUNA_IDENTITY.model),/socket lost/);
 const failed=await readResponseStream(sse([{type:'response.failed',response:{status:'failed',error:{code:'x'}}}]).body as any,LUNA_IDENTITY.model);assert.throws(()=>decodeTerraGameObservation(failed,request,definition));
});
test('a Luna reader still sends a plain request',async()=>{let sent:any;const r=new LunaGameReader({key:async()=>'x',fetch:(async(_u:any,init:any)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify(done([good()])),{status:200});}) as any});await r.read(request,definition,bytes,'image/png');assert.equal(sent.stream,undefined);});
