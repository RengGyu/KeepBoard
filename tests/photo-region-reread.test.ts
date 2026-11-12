import test from 'node:test';import assert from 'node:assert/strict';
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {sourceCropPixels,rereadPhotoRegion}=await import('../src/photoRegionReread');
const {api}=await import('../src/api');
const source:any={id:'source',kind:'photo',scope:'public',captureEpoch:'epoch',width:1000,height:800};
const input={dataUrl:'data:image/jpeg;base64,synthetic',width:200,height:200,sourceRegion:{x:.1,y:.25,width:.2,height:.25}};
const reader:any={kind:'terra-high-game-observation-v1',areaId:'board',definitionSHA:'d'.repeat(64)};
test('a selected original pixel rectangle is extracted at 1:1 scale and whole-image/invalid fallback is rejected',()=>{
 assert.deepEqual(sourceCropPixels(input.sourceRegion,1000,800),{x:100,y:200,width:200,height:200,sourceRegion:input.sourceRegion});
 const c=sourceCropPixels({x:.1004,y:.2004,width:.1201,height:.1001},1000,800);assert.equal(c.x,100);assert.equal(c.y,160);assert.equal(c.width,121);assert.equal(c.height,81);
 assert.throws(()=>sourceCropPixels({x:0,y:0,width:1,height:1},1000,800),/부분/);assert.throws(()=>sourceCropPixels({...input.sourceRegion,width:2},1000,800));
});
test('explicit ROI uploads only the source crop then commits its exact intent before starting the existing job',async()=>{
 const old={evidence:api.evidence,commit:api.commit,start:api.startAnalysisJob};const events:any[]=[];const untouched={manual:0,flag:false,unknown:null,deleted:['old']};const before=structuredClone(untouched);
 try{
  api.evidence=async(id,body)=>{events.push(['upload',id,body]);return {session:{evidence:[{...source,id:'crop',sourceEvidenceId:source.id} ]},createdEvidenceId:'crop'} as any;};
  api.commit=async(id,incomplete,reading,owner)=>{events.push(['commit',id,incomplete,reading,owner]);return {saveIntentId:'intent'} as any;};
  api.startAnalysisJob=async(id,body)=>{events.push(['start',id,body]);return {job:{id:'job'}} as any;};
  await rereadPhotoRegion({sessionId:'session',epoch:'epoch',source,input,reader,requestId:'request',current:()=>true,flush:async()=>{events.push(['flush']);},mutate:async task=>task()});
  assert.deepEqual(events.map(e=>e[0]),['flush','upload','commit','start']);assert.deepEqual(events[1][2].sourceRegion,input.sourceRegion);assert.equal(events[1][2].sourceEvidenceId,'source');assert.equal(events[1][2].expectedCaptureEpoch,'epoch');
  assert.deepEqual(events[2][3],{reader,evidenceIds:['crop']});assert.deepEqual(events[3][2].evidenceIds,['crop']);assert.equal(events[3][2].saveIntentId,'intent');assert.equal(events[3][2].requestId,'intent');assert.deepEqual(untouched,before);
 }finally{api.evidence=old.evidence;api.commit=old.commit;api.startAnalysisJob=old.start;}
});
test('stale scope, crop-of-crop, foreign owner and failure do not fall back to a full read or retry',async()=>{
 const old={evidence:api.evidence,commit:api.commit,start:api.startAnalysisJob};let reads=0,uploads=0,current=true;
 const args={sessionId:'session',epoch:'epoch',source,input,reader,requestId:'r',current:()=>current,flush:async()=>{},mutate:async(task:any)=>task()};
 try{
  api.evidence=async()=>{uploads++;current=false;return {session:{evidence:[{...source,id:'crop'}]},createdEvidenceId:'crop'} as any;};api.commit=async()=>{assert.fail('stale commit');};api.startAnalysisJob=async()=>{reads++;return {} as any;};
  await assert.rejects(rereadPhotoRegion({...args,current:()=>false}),/지난/);await assert.rejects(rereadPhotoRegion({...args,source:{...source,sourceEvidenceId:'parent'}}),/원사진/);await assert.rejects(rereadPhotoRegion({...args,ownerId:'p1'}),/원사진/);assert.equal(uploads,0);
  await assert.rejects(rereadPhotoRegion(args),/지난/);assert.equal(uploads,1);assert.equal(reads,0);
  current=true;api.evidence=async()=>{uploads++;throw Error('transport');};await assert.rejects(rereadPhotoRegion(args),/transport/);assert.equal(uploads,2);assert.equal(reads,0);
 }finally{api.evidence=old.evidence;api.commit=old.commit;api.startAnalysisJob=old.start;}
});
