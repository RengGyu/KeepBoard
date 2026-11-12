import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {generateDefinitions,canonicalJSON,APPROVED_READOUT_LOADER_REVISION} from '../tools/lightweight-recognition/generate-photo-definitions.mts';
const hash=(v:unknown)=>createHash('sha256').update(canonicalJSON(v)).digest('hex');
const contract=JSON.parse(readFileSync('game-photo-definitions/contract.json','utf8'));
test('explicit-null runtime revision records exact scene provenance without rebinding saved definition domains',()=>{
 const generated=generateDefinitions(process.cwd()),input=generated.manifest.inputs.find((i:any)=>i.file==='shared/scene.ts')!;
 assert.equal(input.sha256,createHash('sha256').update(readFileSync('shared/scene.ts')).digest('hex'));
 assert.equal(input.approvedContractSHA256,contract.inputs.find((i:any)=>i.file==='shared/scene.ts').sha256);
 assert.match(input.revisionReason,/null quantity/);
 assert.equal(generated.manifest.indexSHA,createHash('sha256').update(readFileSync('game-photo-definitions/index.json')).digest('hex'));
 const root=mkdtempSync(join(tmpdir(),'kb-definition-unapproved-scene-'));
 try{
  const copy='game-photo-definitions/contract.json';mkdirSync(dirname(join(root,copy)),{recursive:true});writeFileSync(join(root,copy),readFileSync(copy));
  for(const item of contract.inputs.filter((i:any)=>i.file.startsWith('shared/')||i.file==='gamepacks/generated/game-essentials.json')){
   const target=join(root,item.file);mkdirSync(dirname(target),{recursive:true});
   if(item.file==='shared/scene.ts')writeFileSync(target,readFileSync(item.file,'utf8')+'\n// unapproved revision\n');else symlinkSync(resolve(item.file),target);
  }
  assert.throws(()=>generateDefinitions(root),/Pinned input changed: shared\/scene.ts/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('exact pinned 120 definitions regenerate byte-for-byte, keeping source/edition and safe area scopes',()=>{
 const generated=generateDefinitions(process.cwd());
 assert.equal(generated.definitions.length,120);assert.equal(new Set(generated.definitions.map(d=>d.gameId)).size,120);
 assert.deepEqual(generated.definitions.map(d=>d.gameId).sort(),contract.games.map((g:any)=>g.game_id).sort());
 for(const d of generated.definitions){const original=contract.games.find((g:any)=>g.game_id===d.gameId);assert.equal(d.sourceSHA,original.source_sha256);assert.equal(d.editionId,original.edition_id);assert.equal(d.packVersion,original.pack_version);
  const {definitionSHA,...body}=d;assert.equal(definitionSHA,hash(body));
  for(const c of d.components){assert(c.properties.every(p=>p.acquisition==='visible'));assert(c.properties.every(p=>!c.manualPropertyIds.includes(p.id)));}
  assert.deepEqual(d.areas.map(a=>({id:a.id,partition:a.partition,fields:a.fields,componentIds:a.componentIds})),original.areas.map((a:any)=>({id:a.id,partition:a.partition,fields:a.allowed_fields,componentIds:a.components})));
  const sidecar=generated.manifest.games.find((g:any)=>g.gameId===d.gameId)!;assert.deepEqual(sidecar.referenceSets,[]);assert.deepEqual(sidecar.physicalPreserve,original.physical_preserve);
 }
 assert.deepEqual(JSON.parse(readFileSync('game-photo-definitions/index.json','utf8')),generated.index);
 assert.equal(JSON.stringify(generated.index,null,2)+'\n',readFileSync('game-photo-definitions/index.json','utf8'));
});
test('reviewed registry extraction pins original provenance and every new helper, rejecting arbitrary variants',()=>{
 const revision=APPROVED_READOUT_LOADER_REVISION,generated=generateDefinitions(process.cwd());
 const registry=generated.manifest.inputs.find((i:any)=>i.file===revision.registry.file)!;
 assert.equal(registry.approvedContractSHA256,contract.inputs.find((i:any)=>i.file===revision.registry.file).sha256);
 assert.equal(registry.sha256,revision.registry.sha256);assert.match(registry.revisionReason,/loader extraction/);
 for(const dependency of revision.dependencies){
  const input=generated.manifest.inputs.find((i:any)=>i.file===dependency.file)!;
  assert.equal(input.sha256,createHash('sha256').update(readFileSync(dependency.file)).digest('hex'));
  assert.equal(input.introducedByContractFile,revision.registry.file);
  assert.equal(input.approvedContractSHA256,revision.registry.contractSHA);
 }
 const files=[...contract.inputs.filter((i:any)=>i.file.startsWith('shared/')||i.file==='gamepacks/generated/game-essentials.json'),...revision.dependencies];
 // A valid isolated input set regenerates exactly; any changed registry/helper is rejected.
 for(const changed of [null,revision.registry.file,...revision.dependencies.map(d=>d.file)]){
  const root=mkdtempSync(join(tmpdir(),'kb-definition-loader-'));
  try{
   const copy='game-photo-definitions/contract.json';mkdirSync(dirname(join(root,copy)),{recursive:true});writeFileSync(join(root,copy),readFileSync(copy));
   for(const item of files){const target=join(root,item.file);mkdirSync(dirname(target),{recursive:true});if(item.file===changed)writeFileSync(target,readFileSync(item.file,'utf8')+'\n// unapproved revision\n');else symlinkSync(resolve(item.file),target);}
   if(changed)assert.throws(()=>generateDefinitions(root),{message:`Pinned input changed: ${changed}`});
   else assert.equal(JSON.stringify(generateDefinitions(root).index,null,2)+'\n',readFileSync('game-photo-definitions/index.json','utf8'));
  }finally{rmSync(root,{recursive:true,force:true});}
 }
});
test('native bridges keep literal colors and numbers separate from manual owner/placement and unsupported interiors',()=>{
 const {definitions,manifest}=generateDefinitions(process.cwd());const c=definitions.find(d=>d.gameId==='catan')!,r=definitions.find(d=>d.gameId==='rummikub')!,s=definitions.find(d=>d.gameId==='splendor')!;
 assert.equal(c.nativeBridge,'catan');assert.equal(c.components.find(c=>c.id==='number-token')!.properties.find(p=>p.id==='number')!.options!.some(o=>o.value===7),false);
 assert(c.components.every(c=>c.manualPropertyIds.includes('ownerId')));assert(c.components.every(c=>!c.properties.some(p=>p.id==='location')));
 assert(!r.components.find(c=>c.id==='numbers')!.properties.find(p=>p.id==='color')!.options!.some(o=>o.value==='yellow'||o.value==='green'));
 assert(manifest.games.find((g:any)=>g.gameId==='splendor')!.physicalPreserve.some((p:any)=>p.scope==='shared-secret')); assert.equal(s.components.find(c=>c.id==='development')!.properties.find(p=>p.id==='cost')!.type,'marks');
 assert.equal(definitions.filter(d=>d.nativeBridge===null).length,117);
});
test('generated domains reject fresh back-face digits without changing native/manual saved values',async()=>{
 const {compileObservationTask,validateObservationResult}=await import('../shared/lightweightRecognition.ts');const {catalogPacks}=await import('../gamepacks/catalog.ts');
 const definition=generateDefinitions(process.cwd()).definitions.find(d=>d.gameId==='catan')!,pack=catalogPacks.find(p=>p.id==='catan-base')!;
 const request=compileObservationTask({pack,definition,areaId:'board',taskId:'ui-synthetic',scope:{partition:'common_public',ownerId:null,captureEpoch:'synthetic'},images:[{evidenceId:'photo',sha256:'a'.repeat(64),width:850,height:637,inputId:'photo',transformId:null}]});
 const result={version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'digit',componentId:'number-token',imageIndex:0,panelRef:null,bbox:{x:.1,y:.1,width:.1,height:.1},face:'back',quantity:1,rotationDegrees:null,properties:{number:{state:'observed',value:6}},referenceCandidates:[]}]};
 assert.throws(()=>validateObservationResult(result,request,definition),/앞면/);result.observations[0].face='front';assert.equal(validateObservationResult(result,request,definition).observations.length,1);
});

test('approved R3 uses actual input provenance while keeping exact original pin and rejecting any unapproved revision',()=>{
 const generated=generateDefinitions(process.cwd()),input=generated.manifest.inputs.find((i:any)=>i.file==='shared/splendor.ts')!;
 assert.equal(input.sha256,'13e0602322e51b0eee1bd032bb8eb5145c1ef4d6d3c96d76ecc02cf0f820d5c1');assert.equal(input.approvedContractSHA256,'d12575cb8b481309455bc6c3ee13192bbc8155f1c9c9db371c7ae71977aad0e8');assert.match(input.revisionReason,/R3/);
 // The historical index stays recorded in the revision history; the current index is the reviewed revision's exact output.
 assert.equal(createHash('sha256').update(readFileSync('docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json')).digest('hex'),'c8efa2bb79a06101beba90ae9c0fb384f0b38a3b824233bbdf8ea4836fbb2f60');
 assert.equal(generated.manifest.indexSHA,createHash('sha256').update(readFileSync('game-photo-definitions/index.json')).digest('hex'));
 const root=mkdtempSync(join(tmpdir(),'kb-definition-unapproved-'));try{const copy='game-photo-definitions/contract.json';mkdirSync(dirname(join(root,copy)),{recursive:true});writeFileSync(join(root,copy),readFileSync(copy));for(const item of contract.inputs.filter((i:any)=>i.file.startsWith('shared/')||i.file==='gamepacks/generated/game-essentials.json')){const target=join(root,item.file);mkdirSync(dirname(target),{recursive:true});if(item.file==='shared/splendor.ts')writeFileSync(target,readFileSync(item.file,'utf8')+'\n// unapproved revision\n');else symlinkSync(resolve(item.file),target);}assert.throws(()=>generateDefinitions(root),/Pinned input changed: shared\/splendor.ts/);}finally{rmSync(root,{recursive:true,force:true});}
});
