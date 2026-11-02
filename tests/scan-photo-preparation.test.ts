import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {prepareScanObservation,analyzeScanUnit,scanSourceEvidence} from '../server/scanObservation';
import {analyzeHostedObservation} from '../server/hostedObservation';
import {GeminiGameReader} from '../server/ai/geminiGameReader';
import type {Evidence,Session} from '../shared/types';

// Execute the archived pre-change preparation against the same dependencies and controlled inputs.
const archived=readFileSync(new URL('../docs/photo-method-only-20261029/sol2/scanObservation.before.ts.snapshot',import.meta.url),'utf8'),baselineModule={exports:{} as Record<string,unknown>};
new Function('require','exports','module',ts.transpileModule(archived,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(createRequire(new URL('../server/scanObservation.ts',import.meta.url)),baselineModule.exports,baselineModule);
const beforePrepare=baselineModule.exports.prepareScanObservation as typeof prepareScanObservation;
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const evidence=(id:string,extra:Partial<Evidence>={})=>({id,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/uploads/'+id+'.png',...extra}) as Evidence;
const state=(photos:Evidence[])=>({captureEpoch:'epoch',assertions:[],evidence:photos,players:[],turnInstanceId:'turn'}) as unknown as Session;
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const image=(e:Evidence)=>({data:Buffer.concat([png,Buffer.from(JSON.stringify([e.id,e.url,e.scope,e.ownerId,e.captureEpoch,e.sourceEvidenceId,e.sourceRegion]))]),mimeType:'image/png'});
class FixtureReader extends GeminiGameReader{
 calls=0;
 async status(){return {kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity};}
 async readCatanScene(..._args:Parameters<GeminiGameReader['readCatanScene']>):Promise<never>{this.calls++;throw Error('No provider call allowed');}
 async read(..._args:Parameters<GeminiGameReader['read']>):Promise<never>{this.calls++;throw Error('No provider call allowed');}
}
const base=(photos:Evidence[],selected=photos,reader=new FixtureReader())=>({session:state(photos),pack,evidence:selected,selection:{kind:'gemini-game-observation-v1' as const,definitionSHA:definition.definitionSHA,areaId:'board'},taskId:'same-pinned-task',reader,cloud:true});
const original=evidence('original'),cropA=evidence('crop-a',{sourceEvidenceId:original.id,sourceRegion:{x:.1,y:.2,width:.5,height:.5}}),cropB=evidence('crop-b',{sourceEvidenceId:original.id,sourceRegion:{x:.3,y:.1,width:.4,height:.6}});

test('preparation downloads ordinary/crop sources once with byte-exact old requests, plans and transforms',async()=>{
 for(const [name,all,selected,oldCount,newCount] of [
  ['one-original',[original],[original],2,1],
  ['three-originals',[original,evidence('a'),evidence('b')],[original,evidence('a'),evidence('b')],6,3],
  ['two-existing-crops',[original,cropA,cropB],[cropA,cropB],6,3],
  ['original-plus-two-existing-crops',[original,cropA,cropB],[original,cropA,cropB],8,3]
 ] as const){
  const input=base([...all],[...selected]),oldReads:string[]=[],newReads:string[]=[];
  const before=await beforePrepare({...input,readImage:async e=>{oldReads.push(e.id);return image(e);}}),after=await prepareScanObservation({...input,readImage:async e=>{newReads.push(e.id);return image(e);}});
  assert.equal(oldReads.length,oldCount,name);assert.equal(newReads.length,newCount,name);assert.deepEqual(after,before,name);assert.equal(JSON.stringify(after),JSON.stringify(before),name);assert.equal(input.reader.calls,0);
  for(const unit of after.units){const e=selected.find(e=>e.id===unit.evidenceId)!,p=unit.hosted!;assert.equal(p.request.images[0].sha256,sha(image(e).data));assert.deepEqual({width:p.request.images[0].width,height:p.request.images[0].height},{width:1,height:1});}
 }
});

test('same source with a selection-only capture target still shares its photo bytes',async()=>{
 const selectedOriginal={...original,captureTarget:{version:1 as const,gameId:definition.gameId,sourceSHA:pack.runtime!.source.sha256,areaId:'board'}},reads:string[]=[];
 const scan=await prepareScanObservation({...base([original,cropA,cropB],[selectedOriginal,cropA,cropB]),readImage:async e=>{reads.push(e.id);return image(e);}});
 assert.deepEqual(reads,['original','crop-a','crop-b']);assert.equal(scan.units.length,3);assert.equal(scan.units[0].hosted!.request.images[0].sha256,scan.plan.units[1].sourceSHA);
});

test('same-id records with different URL, scope, owner or epoch cannot share preparation bytes',async()=>{
 for(const change of [{url:'/uploads/replaced.png'},{scope:'player' as const,ownerId:'p'},{captureEpoch:'other-epoch'}]){
  const changed=evidence(original.id,change),reads:Evidence[]=[],input=base([changed,cropA],[original,cropA]);
  const after=await prepareScanObservation({...input,readImage:async e=>{reads.push(e);return image(e);}});
  const before=await beforePrepare({...input,readImage:async e=>image(e)});
  assert.equal(reads.filter(e=>e.id===original.id).length,2);assert.notEqual(after.plan.units[0].sourceSHA,after.plan.units[1].sourceSHA);assert.deepEqual(after,before);
  if(change.scope||change.captureEpoch)assert.throws(()=>scanSourceEvidence([cropA],input.session),/범위·촬영/);
 }
});

test('concurrent independent preparations and a failed preparation never reuse another call cache',async()=>{
 let reads=0,release!:()=>void;const gate=new Promise<void>(r=>{release=r;}),input=base([original]),readImage=async(e:Evidence)=>{reads++;await gate;return image(e);};
 const a=prepareScanObservation({...input,readImage}),b=prepareScanObservation({...input,readImage});await new Promise(r=>setImmediate(r));assert.equal(reads,2);release();assert.deepEqual(await a,await b);assert.equal(reads,2);
 let failedReads=0;await assert.rejects(()=>prepareScanObservation({...input,readImage:async()=>{failedReads++;throw Error('temporary storage failure');}}),/temporary storage/);assert.equal(failedReads,1);
 let freshReads=0;await prepareScanObservation({...input,readImage:async e=>{freshReads++;return image(e);}});assert.equal(freshReads,1);
});

test('analysis rereads fresh bytes and rejects changed pinned input before any model call',async()=>{
 const reader=new FixtureReader(),input=base([original],undefined,reader);let reads=0;
 const scan=await prepareScanObservation({...input,readImage:async e=>{reads++;return image(e);}});assert.equal(reads,1);
 const changed=async()=>{reads++;return {data:Buffer.concat([png,Buffer.from('changed-after-prepare')]),mimeType:'image/png'};};
 await assert.rejects(()=>analyzeHostedObservation({plan:scan.units[0].hosted!,pack,session:input.session,evidence:[original],turnInstanceId:'turn',reader,readImage:changed}),/원본 사진이 바뀌/);
 assert.equal(reads,2);assert.equal(reader.calls,0);
 const result=await analyzeScanUnit({scan,index:0,pack,session:input.session,evidence:[original],reader,readImage:changed});assert.equal(reads,3);assert.equal(reader.calls,0);assert.equal(result.scanBundle!.units[0].state,'failed');assert.deepEqual(result.assertions,[]);
});
