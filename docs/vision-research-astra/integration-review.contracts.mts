import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const root='/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-photo-integration-f3wlxy9s/app';
const at=(p:string)=>import(pathToFileURL(root+'/'+p).href);
const {captureProfile,captureFields,captureAreas}=await at('shared/photoCapture.ts');
const {effectiveRecognitionPack,recognitionFields,recognitionCapability}=await at('shared/recognition.ts');
const {observableFields}=await at('server/ai/fields.ts');
const {readoutDefinition}=await at('shared/readouts/registry.ts');
const packs=JSON.parse(await readFile(root+'/gamepacks/generated/game-essentials.json','utf8'));
const rows:any[]=[];
for(const raw of packs){
 const p=effectiveRecognitionPack(raw),profile=captureProfile(p),mode=recognitionCapability(p).mode;
 const areas=[];
 for(const a of profile.areas){
  const owner=a.partition==='owner_private'?'synthetic-owner':undefined;
  assert(captureAreas(p,owner).some((v:any)=>v.id===a.id));
  const available=mode==='assisted'?recognitionFields(p,owner):observableFields(p).filter((f:any)=>f.scope===(owner?'player':'public')||!owner&&f.scope==='player'&&f.visibility==='public');
  const e={id:'synthetic',kind:'photo',ownerId:owner,scope:owner?'player':'public',captureTarget:{version:1,gameId:profile.gameId,sourceSHA:profile.sourceSHA,areaId:a.id}};
  const selected=captureFields(p,[e],available);
  assert(selected.every((f:any)=>available.includes(f)&&a.fields.includes(f.key)));
  assert(selected.length>0,profile.gameId+':'+a.id+' has no authorized destination');
  areas.push({id:a.id,partition:a.partition,selectedFields:selected.map((f:any)=>f.key),componentCount:a.components.length});
 }
 const d=readoutDefinition(p);let visible=0;
 for(const c of d?.components??[])for(const f of c.fields)if(profile.visible[c.id]?.includes(f.id)&&f.acquisition==='visible')visible++;
 rows.push({gameId:profile.gameId,mode,areas,typedVisibleFields:visible});
}
assert.equal(new Set(rows.map(r=>r.gameId)).size,120);
const out={games:120,areas:rows.reduce((n,r)=>n+r.areas.length,0),noPermissionExpansion:true,unreachableAreas:0,rows,realModelCalls:0,exit:0};
await writeFile('/Users/jeonggyuju/Project_folder/KeepBoard/docs/vision-research-astra/integration-review.scope.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,rows:undefined}));
