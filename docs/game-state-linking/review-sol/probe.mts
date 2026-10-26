// Independent synthetic use of the frozen production functions. No Store/network/AI.
import {readFileSync,writeFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';import {join} from 'node:path';import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('docs/game-state-linking/backend/manifest.json','utf8')),root=manifest.source;
const mod=(p:string)=>import(pathToFileURL(join(root,p)).href);
const {effectiveRecognitionPack}=await mod('shared/recognition.ts');
const {answerField}=await mod('server/engine.ts');
const {linkComponents}=await mod('server/componentLinking.ts');
const {resumeSnapshot}=await mod('server/runtimeResume.ts');
const {linkedComponents}=await mod('shared/componentLinking.ts');
const {emptySplendorObservation}=await mod('shared/splendor.ts');
const packs=JSON.parse(readFileSync(join(root,'gamepacks/generated/game-essentials.json'),'utf8'));
const pack=effectiveRecognitionPack(packs.find((p:any)=>p.id==='splendor'));
const piece={id:'physical-card-one',componentId:'development',variant:null,quantity:1,label:'합성 카드',anchor:'합성',evidenceId:'public-photo',region:{x:.1,y:.1,width:.2,height:.3},readout:{...emptySplendorObservation('development'),points:0,bonus:'blue'}};
const rec={version:'game-component-record-v1',pieces:[piece]};
function fixture(room=false){const s:any={id:'synthetic-review',name:'합성',createdAt:'now',updatedAt:'now',gamePackId:pack.id,gamePackVersion:pack.version,gamePack:pack,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:[{id:'p1',name:'합성1',color:'#3978bd'},{id:'p2',name:'합성2',color:'#e56b5d'}],evidence:[{id:'public-photo',kind:'photo',scope:'public',url:'/synthetic.png',label:'합성',captureEpoch:'epoch',capturedAt:'now'}],assertions:[],preservations:[],snapshots:[],notes:{},activity:[]};if(room)s.room={version:'room-v1',capacity:2,hostPlayerId:'p1',revisions:{public:0,p1:0,p2:0,roster:0}};return s;}
const accepted=(s:any,field:string,ownerId?:string)=>s.assertions.findLast((a:any)=>a.field===field&&a.ownerId===ownerId&&a.status==='accepted');
// Mirrors data selected by the commit route, without claiming an HTTP commit or Blob CAS execution.
function publicSnapshot(s:any){s.snapshots.push(JSON.parse(JSON.stringify({id:'saved-public',createdAt:'now',captureEpoch:s.captureEpoch,turnInstanceId:s.turnInstanceId,gamePackVersion:s.gamePackVersion,...(s.room?{savedScope:{scope:'public'}}:{}),assertions:s.assertions.filter((a:any)=>!s.room||!a.ownerId),evidence:s.evidence,preservations:[],notes:{}})));}
const results:any[]=[];
// Ordinary explicit candidate application and retry remain bounded/idempotent.
{
 const s=fixture();s.assertions.push({id:'candidate',field:'__photo.public',status:'candidate',basis:'observation',value:rec,evidenceIds:['public-photo'],updatedAt:'now'});
 const request={sourceAssertionId:'candidate',pieceIds:[piece.id],target:{field:'player.scene',ownerId:'p1'},expectedTargetAssertionId:null};
 assert.equal(linkComponents(s,pack,request).moved,1);assert.equal(linkComponents(s,pack,request).idempotent,true);assert.equal(accepted(s,'player.scene','p1').value.pieces.length,1);assert(s.assertions.some((a:any)=>a.id==='candidate'&&a.status==='candidate'));
 results.push({case:'candidate explicit link + same request retry',status:'PASS',retainedCandidate:true,targetPieces:1});
}
// A pre-existing accepted physical object (no linkOrigin yet) may be saved before its first move.
for(const room of [false,true]){
 const s=fixture(room);answerField(s,pack,'market.scene',rec);const original=accepted(s,'market.scene');publicSnapshot(s);
 linkComponents(s,pack,{sourceAssertionId:original.id,pieceIds:[piece.id],target:{field:'reserve.scene',ownerId:'p1'},expectedTargetAssertionId:null});
 assert.equal(accepted(s,'market.scene').value.pieces.length,0);assert.equal(accepted(s,'reserve.scene','p1').value.pieces.length,1);
 let blocked=false,error='';try{resumeSnapshot(s,pack,'public');}catch(e){blocked=true;error=(e as Error).message;}
 const locations=s.assertions.filter((a:any)=>a.status==='accepted').flatMap((a:any)=>a.value?.pieces?.filter((p:any)=>p.id===piece.id&&p.evidenceId===piece.evidenceId).map((p:any)=>({field:a.field,ownerId:a.ownerId??null,linked:!!p.linkOrigin,originAssertionId:p.linkOrigin?.assertionId??null}))??[]);
 results.push({case:room?'room public restore after accepted public→self-private move':'single-device public restore after accepted public→private move',status:!blocked&&locations.length>1?'FAIL_IDENTITY_DUPLICATED':'PASS',restoreBlocked:blocked,error,locations,originMatchesOriginal:linkedComponents(s).some((x:any)=>x.origin.assertionId===original.id&&x.origin.pieceId===piece.id)});
}
const failed=results.filter(x=>x.status.startsWith('FAIL'));
writeFileSync('docs/game-state-linking/review-sol/probe-results.json',JSON.stringify({sourceDigest:manifest.sourceDigest,results,failed:failed.length,method:'actual frozen pure functions + synthetic snapshot selected like commit; no HTTP/Blob/API/browser',networkCalls:0,AIcalls:0,operatingReads:0,productWrites:0},null,2)+'\n');
console.log(JSON.stringify({checks:results.length,failures:failed.length,results,networkCalls:0,AIcalls:0}));if(failed.length)process.exitCode=1;
