import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildTerraGameBody,decodeTerraGameObservation,TerraGameReader,LUNA_IDENTITY} from '../server/ai/terraGameReader';
import {compactTerraKinds,COMPACT_TERRA_PROFILE} from '../server/ai/terraCompact';
import {hostedReaderFor} from '../server/ai/hostedReader';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask,type ObservationRequest,type PhotoDefinition} from '../shared/lightweightRecognition';
import {cropPhotoTransform,mapObservationRegion} from '../shared/photoGeometry';
import type {PropertySpec} from '../shared/readouts/types';
import type {Session,Evidence} from '../shared/types';

const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const bytes=Buffer.from('synthetic original');
const field=(id:string,type:PropertySpec['type'],extra:Partial<PropertySpec>={}):PropertySpec=>({id,label:id,type,acquisition:'visible',sourceText:'synthetic test field',...extra});
const definition:PhotoDefinition={version:'game-photo-definition-v1',gameId:'synthetic',packId:'synthetic',packVersion:'1',editionId:'base',sourceSHA:'b'.repeat(64),definitionSHA:'c'.repeat(64),nativeBridge:null,readoutSchema:null,areas:[{id:'table',partition:'common_public',fields:[],componentIds:['tokens','other']}],components:[
 {id:'tokens',manualPropertyIds:['manual'],properties:[field('zText','text'),field('number','integer',{min:0,max:10}),field('flag','boolean'),field('marks','marks'),field('features','features'),field('reference','reference'),field('front','text',{faceOnly:true}),field('manual','text',{acquisition:'manual'}),field('owner','text')]},
 {id:'other',manualPropertyIds:[],properties:[field('otherOnly','text')]}
]};
const request:ObservationRequest={version:'lightweight-observation-v1',taskId:'compact-test',gameId:'synthetic',packId:'synthetic',editionId:'base',sourceSHA:definition.sourceSHA,definitionSHA:definition.definitionSHA,areaId:'table',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:[{evidenceId:'photo',inputId:'photo',sha256:sha(bytes),width:1000,height:800,transformId:null}],allowedComponents:['tokens','other'],allowedPropertyIds:Object.fromEntries(definition.components.map(c=>[c.id,c.properties.map(p=>p.id)])),componentLabels:{tokens:{name:'토큰',physicalType:'token'},other:{name:'다른 실물',physicalType:'card'}},referenceSetId:null,geometryFrameId:null};
const envelope=(payload:unknown)=>({model:'gpt-6-luna',status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(payload)}]}]});
const kinds=()=>compactTerraKinds(request,definition);
const k=()=>kinds().find(x=>x.id==='tokens')!.k;
const p=(id:string)=>kinds().find(x=>x.id==='tokens')!.properties.find(x=>x.id===id)!.p;
const attr=(id:string,value:unknown)=>({p:p(id),v:JSON.stringify(value),r:null});
const item=(a:unknown[]=[])=>({k:k(),b:[100,200,300,400],f:'f',q:null,u:'s',a});
const decode=(items:unknown[],profile=COMPACT_TERRA_PROFILE)=>decodeTerraGameObservation(envelope({v:3,items}),request,definition,[],profile);

test('compact mappings depend on allowed request/definition only and strict schema has fixed sparse rows',()=>{
 const before=JSON.stringify({request,definition}),mapping=kinds();
 assert.deepEqual(mapping,compactTerraKinds({...request,allowedComponents:[...request.allowedComponents].reverse(),allowedPropertyIds:Object.fromEntries(Object.entries(request.allowedPropertyIds).map(([id,v])=>[id,[...v].reverse()]))},{...definition,components:[...definition.components].reverse()}));
 assert(!mapping.flatMap(x=>x.properties).some(x=>['owner','manual'].includes(x.id)));
 const b=buildTerraGameBody(request,definition,bytes,'image/png',COMPACT_TERRA_PROFILE),schema=b.text.format.schema as any;
 assert.equal(b.model,LUNA_IDENTITY.model);assert.equal(b.reasoning.effort,'high');assert.equal(b.max_output_tokens,32768);assert.equal(b.input[0].content[1].detail,'high');
 assert.equal(b.input[0].content[1].image_url,'data:image/png;base64,'+bytes.toString('base64'));
 assert.equal(schema.properties.v.enum[0],3);assert.deepEqual(schema.properties.items.items.required,['k','b','f','q','u','a']);
 const walk=(s:any)=>{if(s.properties){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));Object.values(s.properties).forEach(walk);}if(s.items)walk(s.items);if(s.anyOf)s.anyOf.forEach(walk);};walk(schema);
 const prompt=b.input[0].content[0].text!;assert.match(prompt,/EACH allowed kind/);assert.match(prompt,/No attribute may use another kind's property/);assert.match(prompt,/Do not invent missing kinds or expected inventory/);assert.match(prompt,/visible inseparable group/);assert(!prompt.includes('include exactly one attribute row'));
 assert.equal(JSON.stringify({request,definition}),before);
});

test('compact preserves typed zero/false/structured values, explicit unknown vs omission and immutable provider provenance',()=>{
 const values={number:0,flag:false,zText:'~o',marks:[{symbol:'star',value:null}],features:[{id:'f1',kind:null,label:'feature',x:null,y:null}],reference:{pieceId:'piece',featureId:null}};
 const row=item([...Object.entries(values).map(([id,v])=>attr(id,v)),{p:p('front'),v:null,r:'o'}]);row.q=0 as any;row.u='g';
 const native=envelope({v:3,items:[row]}),before=structuredClone(native),result=decodeTerraGameObservation(native,request,definition,[],COMPACT_TERRA_PROFILE),o=result.raw.observations[0];
 for(const [id,value]of Object.entries(values))assert.deepEqual(o.properties[id],{state:'observed',value});
 assert.equal(o.quantity,0);assert.equal(result.hostedWire.physicalUnits?.['item-1'],'group');assert.deepEqual(o.properties.front,{state:'unknown',value:null,reason:'occluded'});
 assert.equal(result.hostedWire.id,'terra-game-wire-v3');assert.deepEqual(result.hostedWire.providerResponse,before);assert.deepEqual(native,before);
 const omitted=decode([item()]);assert.deepEqual(omitted.raw.observations[0].properties.number,{state:'unknown',value:null,reason:'not-present-unconfirmed'});
 assert.deepEqual((omitted.hostedWire.items[0]as any).attributes,[]);assert.equal((result.hostedWire.items[0]as any).attributes.at(-1).unknownReason,'occluded');
 assert.deepEqual((result.hostedWire.items[0]as any).box_1000,{ymin:100,xmin:200,ymax:300,xmax:400});
 const group=decode([{...item(),q:null,u:'g'}, {...item(),q:4,u:'s'}]);assert.deepEqual(group.raw.observations.map(x=>x.quantity),[null,4]);assert.deepEqual(group.hostedWire.physicalUnits,{'item-1':'group','item-2':'unknown'});assert(group.hostedWire.deferred.some(x=>x.reason==='single-quantity-conflict'));
});

test('compact reason codes are unambiguous and invalid visible values keep existing normalization semantics',()=>{
 for(const [code,reason]of Object.entries({u:'unreadable',o:'occluded',f:'out-of-frame',n:'not-present-unconfirmed',w:'wrong-face',a:'ambiguous',s:'unsupported'}))assert.deepEqual(decode([item([{p:p('number'),v:null,r:code}])]).raw.observations[0].properties.number,{state:'unknown',value:null,reason});
 const invalid=decode([item([attr('number',100)])]);assert.equal(invalid.raw.observations[0].properties.number.state,'unknown');assert(invalid.hostedWire.deferred.some(x=>x.reason==='invalid-visible-value'));assert.equal((invalid.hostedWire.items[0]as any).attributes[0].valueJson,'100');
 const back=decode([{...item([attr('front','seen')]),f:'b'}]);assert.equal(Object.hasOwn(back.raw.observations[0].properties,'front'),false);assert(back.hostedWire.deferred.some(d=>d.property==='front'&&d.reason==='inapplicable-back-face'));
});

test('compact rejects malformed shape, codes, arity and cross-kind fields before literal normalization',()=>{
 const base=item([attr('number',0)]);
 const bad:any[]=[{...base,k:999},{...base,k:'tokens'},{...base,b:[1,2,3]},{...base,b:[300,200,100,400]},{...base,b:[0,0,Infinity,2]},{...base,f:'front'},{...base,u:'single'},{...base,q:-1},{...base,q:false},{...base,extra:1},{...base,a:undefined},
 {...base,a:[{p:999,v:'0',r:null}]},{...base,a:[{p:'number',v:'0',r:null}]},{...base,a:[{p:p('number'),v:null,r:null}]},{...base,a:[{p:p('number'),v:null,r:'unknown'}]},{...base,a:[{p:p('number'),v:'0',r:'o'}]},{...base,a:[{p:p('number'),v:0,r:null}]},{...base,a:[{p:p('number'),v:'null',r:null}]},{...base,a:[{p:p('number'),v:'{',r:null}]},{...base,a:[...base.a,...base.a]}];
 for(const row of bad)assert.throws(()=>decode([row]),'should reject '+JSON.stringify(row));
 const other=kinds().find(x=>x.id==='other')!;assert.throws(()=>decode([{...base,k:other.k,a:[attr('zText','wrong kind')]}]));
 assert.throws(()=>decodeTerraGameObservation(envelope({v:3,items:[],extra:1}),request,definition,[],COMPACT_TERRA_PROFILE));
 assert.throws(()=>decodeTerraGameObservation(envelope({v:2,items:[]}),request,definition,[],COMPACT_TERRA_PROFILE));
});

test('compact profile dispatch does not reinterpret legacy payloads and default remains a named, non-compact profile',async()=>{
 assert.equal(LUNA_IDENTITY.adapterVersion,'literal-named-fill-unit-marks-v5');
 assert.deepEqual(hostedReaderFor({...LUNA_IDENTITY,adapterVersion:COMPACT_TERRA_PROFILE}).identity,{...LUNA_IDENTITY,adapterVersion:COMPACT_TERRA_PROFILE});
 assert.throws(()=>new TerraGameReader({profile:'unknown-profile' as any}));
 const legacy={kind:'tokens',box_1000:null,face:'unknown',quantity:null,attributes:[]};
 assert.throws(()=>decodeTerraGameObservation(envelope({items:[legacy]}),request,definition,[],COMPACT_TERRA_PROFILE));
 assert.throws(()=>decodeTerraGameObservation(envelope({v:3,items:[]}),request,definition));
 assert.equal(decodeTerraGameObservation(envelope({items:[legacy]}),request,definition).hostedWire.id,'terra-game-wire-v1');
 let calls=0;const reader=new TerraGameReader({profile:COMPACT_TERRA_PROFILE,key:async()=> 'synthetic',fetch:async(_url,init)=>{calls++;const sent=JSON.parse(String(init!.body));assert.equal(sent.text.format.schema.properties.v.enum[0],3);return Response.json(envelope({v:3,items:[item([attr('flag',false)])]}));}});
 assert.equal((await reader.read(request,definition,bytes,'image/png')).raw.observations[0].properties.flag.value,false);assert.equal(calls,1);
 const empty=decode([]);assert.equal(empty.hostedWire.id,'terra-game-wire-v3');assert.deepEqual(empty.raw.observations,[]);
});

test('compact and reconstructed legacy observations have the same normalized meaning',()=>{
 const compact=decode([item([attr('number',2),attr('flag',false),{p:p('front'),v:null,r:'o'}])]);
 const legacy=decodeTerraGameObservation(envelope({items:compact.hostedWire.items}),request,definition);
 assert.deepEqual(compact.raw,legacy.raw);assert.deepEqual(compact.hostedWire.physicalUnits,legacy.hostedWire.physicalUnits);
 assert.equal(compact.raw.observations[0].properties.number.value,2); // Preserve a read value, never substitute an expected answer.
 assert.throws(()=>decode(Array.from({length:513},()=>item())));
});

test('Terra profiles leave native Catan request bytes and canonical decoding unchanged',async()=>{
 const pack=catalogPacks.find(p=>p.id==='catan-base')!,d=photoDefinition(pack),r=compileObservationTask({pack,definition:d,areaId:'board',taskId:'native-profile',scope:{partition:'common_public',ownerId:null,captureEpoch:'epoch'},images:request.images});
 const evidence=[{id:'photo',kind:'photo',scope:'public',captureEpoch:'epoch',label:'synthetic',url:'/synthetic'}]as Evidence[];
 const session={id:'synthetic',gamePack:pack,players:[],assertions:[],evidence,captureEpoch:'epoch',turnInstanceId:'turn',notes:{},activity:[],snapshots:[]}as unknown as Session;
 const bodies:string[]=[],outputs=[];
 for(const profile of ['literal-named-fill-original-v1','literal-named-fill-unit-original-v2',COMPACT_TERRA_PROFILE,'literal-named-detail-unit-original-v4','literal-named-fill-unit-marks-v5']as const){
  const reader=new TerraGameReader({profile,key:async()=> 'synthetic',fetch:async(_url,init)=>{bodies.push(String(init!.body));return Response.json(envelope({summary:'synthetic native',assertions:[{field:'components.observed',evidenceIds:['photo'],value:{version:2,coverage:'partial',components:[{id:'number',kind:'number-token',number:0,face:'front',quantity:1,location:{type:'hex',id:'r1c1'},evidenceId:'photo',region:{x:.1,y:.1,width:.1,height:.1}}]}}],warnings:[]}));}});
  const result=await reader.readCatanScene(r,d,session,pack,evidence,bytes,'image/png');
  assert.equal(result.result.observationReceipts![0].hostedWire!.id,'terra-catan-scene-wire-v1');
  outputs.push(result.result.assertions.map(a=>({field:a.field,value:a.value})));
 }
 assert.equal(bodies[0],bodies[1]);assert.equal(bodies[1],bodies[2]);assert.deepEqual(outputs[0],outputs[1]);assert.deepEqual(outputs[1],outputs[2]);assert.match(bodies[2],/COMPONENT SCENE OUTPUT/);
});

test('compact uses the original photo transform without rounding or canonical coordinates',()=>{
 const transform=cropPhotoTransform({transformId:'crop',sourceSHA:'f'.repeat(64),inputSHA:request.images[0].sha256,sourceDimensions:{width:2000,height:1600},inputDimensions:{width:1000,height:800},region:{x:.25,y:.25,width:.5,height:.5}}),cropped={...request,images:[{...request.images[0],transformId:'crop'}]};
 const result=decodeTerraGameObservation(envelope({v:3,items:[{...item(),b:[100.5,200.5,300.5,400.5]}]}),cropped,definition,[transform],COMPACT_TERRA_PROFILE);
 const source=mapObservationRegion(result.raw.observations[0],cropped,[transform])!;assert(Math.abs(source.x-.35025)<1e-9);assert(Math.abs(source.y-.30025)<1e-9);assert(Math.abs(source.width-.1)<1e-9);assert(Math.abs(source.height-.1)<1e-9);
});

test('compact builds every allowed catalog area and never exposes manual or ownership fields',()=>{
 let areas=0;
 for(const pack of catalogPacks){const d=photoDefinition(pack);for(const area of d.areas){if(!area.componentIds.length)continue;const r=compileObservationTask({pack,definition:d,areaId:area.id,taskId:'compact-catalog',scope:{partition:area.partition,ownerId:area.partition==='owner_private'?'synthetic-owner':null,captureEpoch:'epoch'},images:request.images});const mapping=compactTerraKinds(r,d),body=buildTerraGameBody(r,d,bytes,'image/png',COMPACT_TERRA_PROFILE);assert.deepEqual(mapping.map(x=>x.id).sort(),[...r.allowedComponents].sort());assert(mapping.every(x=>x.properties.every(p=>!/(owner|player|role|turn|hidden|secret)/i.test(p.id))));assert.equal((body.text.format.schema as any).properties.items.maxItems,512);areas++;}}
 assert.equal(catalogPacks.length,120);assert(areas>=120);
});
