import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,type HostedObservationWire} from '../shared/lightweightRecognition';
import {buildTerraGameBody,decodeTerraGameObservation,terraResponsePayload,TerraGameReader,strictTerraSchema,TERRA_IDENTITY} from '../server/ai/terraGameReader';
import {decodeLiteralObservationPayload} from '../server/ai/geminiGameReader';
import {assembleObservations} from '../server/ai/observationAssembly';
import {catanSceneResponseSchema} from '../server/ai/catanSceneReading';
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const request=compileObservationTask({pack,definition,areaId:'board',taskId:'synthetic',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:1000,height:800,transformId:null}]});
const item={kind:'number-token',box_1000:{ymin:100,xmin:200,ymax:300,xmax:400},face:'front',quantity:1,attributes:[{id:'number',valueJson:'8',unknownReason:null}]};
const response=(payload:unknown)=>({model:'gpt-6.1-terra',status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}]});
test('Terra named literal body keeps original bytes and all allowed fields; fill does not supply answers',()=>{
 const body=buildTerraGameBody(request,definition,Buffer.from('original'),'image/png');
 assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'high');assert.equal(body.max_output_tokens,32768);assert.equal(body.store,false);
 assert.equal(body.input[0].content[1].image_url,'data:image/png;base64,b3JpZ2luYWw=');assert.equal(body.input[0].content[1].detail,'high');
 assert.match(body.input[0].content[0].text!,/include exactly one attribute row/);
 const result=decodeTerraGameObservation(response({items:[item]}),request,definition);
 assert.equal(result.raw.observations[0].properties.number.value,8);assert.deepEqual(result.raw.observations[0].bbox,{x:.2,y:.1,width:.2,height:.2});assert.equal(result.hostedWire.id,'terra-game-wire-v1');assert.deepEqual(result.hostedWire.items,[item]);
 const unplaced=decodeTerraGameObservation(response({items:[{...item,box_1000:{...item.box_1000,xmax:100}}]}),request,definition);
 assert.equal(unplaced.raw.observations[0].bbox,null);assert.equal(unplaced.raw.observations[0].properties.number.value,8);
 assert.deepEqual(unplaced.hostedWire.deferred,[{ref:'item-1',property:'box_1000',reason:'invalid-box-geometry'}]);
});
test('Responses empty completion is distinct from refusal, incomplete, error or truncated JSON',()=>{
 assert.deepEqual(terraResponsePayload(response({items:[]})),{items:[]});
 for(const bad of [{...response({items:[]}),status:'incomplete'},{...response({items:[]}),error:{code:'error'}},{...response({}),output:[{type:'message',content:[{type:'refusal',refusal:'no'}]}]},{...response({}),output:[{type:'message',content:[{type:'output_text',text:'{'}]}]}])assert.throws(()=>terraResponsePayload(bad));
});
test('native strict schema retains every original property and nullable optional values',()=>{
 const original=catanSceneResponseSchema([{id:'photo'} as any]),schema=strictTerraSchema(original);
 const visit=(s:any)=>{if(s.properties){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));for(const p of Object.values(s.properties))visit(p);}if(s.items)visit(s.items);if(s.anyOf)s.anyOf.forEach(visit);};visit(schema);
 const scene=schema.properties.assertions.items.properties.value;assert.deepEqual(Object.keys(scene.properties),Object.keys(original.properties.assertions.items.properties.value.properties));assert(scene.properties.components.items.properties.number.type.includes('null'));
});
test('every catalog definition area can build a Terra request without per-game adapter branches',()=>{
 let games=0,areas=0;
 for(const p of catalogPacks){const d=photoDefinition(p);games++;for(const a of d.areas){if(!a.componentIds.length)continue;const r=compileObservationTask({pack:p,definition:d,areaId:a.id,taskId:'catalog',scope:{partition:a.partition,ownerId:a.partition==='owner_private'?'synthetic-owner':null,captureEpoch:'epoch'},images:request.images});const b=buildTerraGameBody(r,d,Buffer.from('original'),'image/png');assert.equal(b.model,'gpt-6-luna');assert.deepEqual([...(b.text.format.schema as any).properties.items.items.properties.kind.enum].sort(),[...r.allowedComponents].sort());areas++;}}
 assert.equal(games,120);assert(areas>=120);
});
test('an HTTP rejection causes exactly one request and no fallback',async()=>{
 let calls=0;const reader=new TerraGameReader({key:async()=> 'synthetic',fetch:async()=>{calls++;return new Response(null,{status:429});}});
 const {createHash}=await import('node:crypto'),bytes=Buffer.from('original'),pinned={...request,images:[{...request.images[0],sha256:createHash('sha256').update(bytes).digest('hex')}]};
 await assert.rejects(()=>reader.read(pinned,definition,bytes,'image/png'),/429/);assert.equal(calls,1);
});

test('one inverted named bbox stays unplaced while39 normal rows, literal values and original provider wire survive assembly',()=>{
 const ticket=catalogPacks.find(p=>p.id==='ticket-to-ride')!,d=photoDefinition(ticket);
 const r=compileObservationTask({pack:ticket,definition:d,areaId:'map-area',taskId:'synthetic-bbox',scope:{partition:'common_public',ownerId:null,captureEpoch:'fixed'},images:request.images});
 const items=Array.from({length:40},(_,i)=>({kind:'trains',box_1000:{ymin:10+i,xmin:20+i,ymax:30+i,xmax:40+i},face:'front',quantity:i===0?0:i===1?null:1,physicalUnit:'unknown',attributes:[{id:'trainColor',valueJson:JSON.stringify('literal-'+i),unknownReason:null}]}));
 items[39].box_1000={ymin:223,xmin:769,ymax:203,xmax:790};
 const native=response({items}),before=structuredClone(native);
 const decoded=decodeTerraGameObservation(native,r,d),control=decodeTerraGameObservation(response({items:items.map((row,i)=>i===39?{...row,box_1000:null}:row)}),r,d);
 assert.deepEqual(decoded.raw,control.raw);assert.equal(decoded.raw.observations.length,40);
 assert.deepEqual(decoded.hostedWire.items,items);assert.deepEqual(decoded.hostedWire.providerResponse,before);assert.deepEqual(native,before);
 assert.deepEqual(decoded.hostedWire.deferred,[{ref:'item-40',property:'box_1000',reason:'invalid-box-geometry'}]);
 const result=assembleObservations({request:r,definition:d,pack:ticket,result:decoded.raw,hostedWire:decoded.hostedWire,reader:TERRA_IDENTITY,turnInstanceId:'synthetic-turn'});
 const receipt=result.observationReceipts![0],pieces=result.assertions.flatMap(a=>(a.value as any).pieces??[]);
 assert.equal(pieces.length,40);
 for(let i=0;i<40;i++){
  const o=decoded.raw.observations[i],piece=pieces.find(p=>p.id===receipt.componentRefs[o.ref]);assert(piece);
  assert.deepEqual(o.properties.trainColor,{state:'observed',value:'literal-'+i});assert.equal(piece.readout.values.trainColor,'literal-'+i);
  assert.equal(piece.quantity,items[i].quantity);assert.equal(piece.placement,undefined);
  if(i===39){assert.equal(o.bbox,null);assert.equal(piece.region,null);}
  else assert.deepEqual(piece.region,{x:(20+i)/1000,y:(10+i)/1000,width:.02,height:.02});
 }
});

test('valid full-image bbox and explicit null bbox retain their boundaries without deferred geometry or relaxed nongeometry validation',()=>{
 for(const box of [[0,0,1000,1000],null]){
  const trace:HostedObservationWire={id:'gemini-game-wire-v1',items:[],deferred:[]};
  const wire={items:[{kind:'number-token',box_1000:box,face:'front',quantity:1,attributes:[{id:'number',valueJson:'8',unknownReason:null}]}]};
  const before=structuredClone(wire),decoded=decodeLiteralObservationPayload(wire,request,definition,trace);
  assert.deepEqual(decoded.observations[0].bbox,box?{x:0,y:0,width:1,height:1}:null);
  assert.equal(decoded.observations[0].properties.number.value,8);assert.deepEqual(trace.deferred,[]);assert.deepEqual(trace.items,wire.items);assert.deepEqual(wire,before);
  assert.throws(()=>decodeLiteralObservationPayload({items:[{...wire.items[0],quantity:-1}]},request,definition));
 }
});
