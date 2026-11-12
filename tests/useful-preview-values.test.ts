import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {usefulPreviewValues} from '../shared/previewValues';
import {LunaGameReader,TERRA_HIGH_IDENTITY} from '../server/ai/terraGameReader';
import {compactTerraKinds} from '../server/ai/terraCompact';
import {fixture} from './fixtures/spatial/builders';

test('useful preview requires requested applicable values; preserves zero/false and excludes face-only metadata',()=>{
 const definition:any={definitionSHA:'d',components:[{id:'cards',properties:[{id:'face'},{id:'number',faceOnly:true},{id:'flag'},{id:'unasked'}]}]};
 const request:any={definitionSHA:'d',allowedPropertyIds:{cards:['face','number','flag']},propertyApplicability:{frontOnlyPropertyIds:{cards:['number']}}};
 const observation:any={componentId:'cards',face:'front',properties:{face:{state:'observed',value:'front'},number:{state:'observed',value:0},flag:{state:'observed',value:false},unasked:{state:'observed',value:'x'},missing:{state:'unknown',value:null}}};
 const before=structuredClone(observation);
 assert.deepEqual(usefulPreviewValues(observation,definition,request).map(([id])=>id),['number','flag']);
 observation.face='back';assert.deepEqual(usefulPreviewValues(observation,definition,request).map(([id])=>id),['flag']);
 observation.properties={face:{state:'observed',value:'back'}};assert.equal(usefulPreviewValues(observation,definition,request).length,0);
 assert.equal(before.properties.number.value,0);
});

test('staged reader keeps metadata preview time separate from first useful value without changing final observations',async()=>{
 const f=fixture('lost-cities','expeditions'),bytes=Buffer.from('synthetic-test-image');f.request.images[0].sha256=createHash('sha256').update(bytes).digest('hex');
 const k=compactTerraKinds(f.request,f.definition,'literal-compact-visible-instance-v7').find(k=>k.id==='cards')!,number=k.properties.find(p=>p.id==='number')!;
 const back={k:k.k,b:[100,100,200,200],f:'b',q:1,u:'s',a:[],x:k.properties.map(p=>p.p)};
 const value={k:k.k,b:[300,100,400,200],f:'f',q:1,u:'s',a:[{p:number.p,v:'5'}],x:k.properties.filter(p=>p!==number).map(p=>p.p)};
 const payload={v:3,items:[back,value]},text=JSON.stringify(payload);let release=()=>{},sawMetadata=()=>{};
 const gate=new Promise<void>(r=>release=r),metadata=new Promise<void>(r=>sawMetadata=r),updates:any[]=[];
 const encode=(v:any)=>new TextEncoder().encode('data: '+JSON.stringify(v)+'\n\n');
 const reader=new LunaGameReader({identity:{...TERRA_HIGH_IDENTITY,automaticRetries:0},key:async()=>'mock',fetch:async()=>new Response(new ReadableStream({async start(c){
  c.enqueue(encode({type:'response.output_text.delta',delta:'{"v":3,"items":['+JSON.stringify(back)+','}));await gate;
  c.enqueue(encode({type:'response.output_text.delta',delta:JSON.stringify(value)+']}'}));
  c.enqueue(encode({type:'response.completed',response:{model:TERRA_HIGH_IDENTITY.model,status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text}]}]}}));c.close();
 }}),{headers:{'Content-Type':'text/event-stream'}})});
 const reading=reader.read(f.request,f.definition,bytes,'image/png',[],(_count,u)=>{if(u?.preview){updates.push(u);if(u.preview.length===1)sawMetadata();}});
 const timer=setTimeout(()=>sawMetadata(),2000);
 try{
  await metadata;assert(updates.length>0,'first validated metadata preview missing');assert(updates[0].timings.firstReadableItemAt);assert.equal(updates[0].timings.firstUsefulValueAt,undefined);
 }finally{clearTimeout(timer);release();}
 const result=await reading,last=updates.at(-1);assert(last.timings.firstUsefulValueAt>=updates[0].timings.firstReadableItemAt);
 assert.equal(result.timings.firstUsefulValueAt,last.timings.firstUsefulValueAt);assert.equal(result.raw.observations.length,2);
 assert.equal(result.raw.observations[0].properties.face.value,'back');assert.equal(result.raw.observations[1].properties.number.value,5);
});
