// Keyless semantic probes against immutable review-01 modules. No HTTP/SaaS/Store files.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {MemoryObjects,ConflictError} from '../review-01/source/server/objects.ts';
import {BlobStore} from '../review-01/source/server/blobStore.ts';
import {CloudJobs} from '../review-01/source/server/cloudJobs.ts';
import {PrivatePins} from '../review-01/source/server/privatePin.ts';
import {scopeVersion,digest,commitAnalysisTask} from '../review-01/source/server/analysisTask.ts';
import * as rooms from '../review-01/source/server/rooms.ts';
const results:any[]=[];
const session=(id:string):any=>({id,name:'synthetic',createdAt:'',updatedAt:'',snapshots:[],assertions:[],evidence:[],players:[],notes:{},activity:[],captureEpoch:'epoch',turnInstanceId:'turn'});
{
 const objects=new MemoryObjects(),a=new BlobStore(objects),b=new BlobStore(objects);await a.saveSession(session('cas'));
 const left=(await a.getSession('cas'))!,right=(await b.getSession('cas'))!;left.notes.public='left';right.notes.public='right';await a.saveSession(left);await assert.rejects(b.saveSession(right),ConflictError);assert.equal((await b.getSession('cas'))!.notes.public,'left');
 results.push({check:'independent instance stale session CAS',state:'PASS'});
 const pinsA=new PrivatePins(a.root,objects),pinsB=new PrivatePins(b.root,objects);await pinsA.configure('cas','owner',{enabled:true,pin:'0007'},'synthetic');const token=await pinsA.unlock('cas','owner','0007','synthetic');await pinsB.require('cas','owner',token);await pinsB.lock(token);await assert.rejects(pinsA.require('cas','owner',token));results.push({check:'PIN token/lock shared across independent instances',state:'PASS'});
}
{
 const objects=new MemoryObjects();let dispatches=0,syntheticProviderCalls=0;
 const a=new CloudJobs(objects,async()=>{dispatches++;}),b=new CloudJobs(objects,async()=>{dispatches++;});
 const input:any={sessionId:'jobs',requestId:'one-intent',signature:'same-signature',revision:'r1',evidenceIds:['synthetic-photo'],captureEpoch:'epoch'};
 const first=await a.start(input,undefined,{} as any);const duplicate=await b.start(input,undefined,{} as any);assert.equal(first.id,duplicate.id);assert.equal(dispatches,1);
 for(const client of [a,b]){const claim=await client.claimBatch(first.id,0);if(claim)syntheticProviderCalls++;}
 assert.equal(syntheticProviderCalls,1);results.push({check:'same intent dispatch reuse + batch redelivery claim',state:'PASS',dispatches,syntheticProviderCalls,realAIcalls:0});
}
{
 const objects=new MemoryObjects(),a=new BlobStore(objects),b=new BlobStore(objects),pins=new PrivatePins(a.root,objects);
 const pack:any={id:'synthetic-review',version:'1',fields:[{key:'counter',type:'number',scope:'public',visibility:'public',lifetime:'session'},{key:'memo',type:'text',scope:'player',visibility:'owner',lifetime:'session'}]};
 const s=session('candidates');s.gamePack=pack;s.players=[{id:'other',name:'synthetic',color:'#123456'}];s.evidence=[{id:'photo',kind:'photo',scope:'public',url:'/uploads/synthetic.png',captureEpoch:'epoch'}];s.assertions=[{id:'manual-public',field:'counter',value:0,status:'accepted',basis:'user',evidenceIds:[],turnInstanceId:'turn'},{id:'manual-private',field:'memo',ownerId:'other',value:'before',status:'accepted',basis:'user',evidenceIds:[],turnInstanceId:'turn'}];await a.saveSession(s);
 const task:any={prepared:{session:structuredClone(s),pack,evidence:s.evidence,purpose:'capture',sameStaticState:false},epoch:s.captureEpoch,version:scopeVersion(s,pack),source:digest(s.evidence),pin:await pins.configurationStamp(s.id)};
 const other=(await b.getSession(s.id))!;other.assertions[1].value='after';await b.saveSession(other);
 const result:any={assertions:[{id:'model-accepted-attempt',field:'counter',value:2,status:'accepted',basis:'user',evidenceIds:['photo']}],summary:'synthetic',mode:'live'};
 const receipt=await commitAnalysisTask(a,pins,task,{id:'job-id',sessionId:s.id} as any,[result]);const saved=(await b.getSession(s.id))!;
 assert.equal(receipt.candidateCount,1);assert.equal(saved.assertions.find(x=>x.id==='manual-public')!.value,0);assert.equal(saved.assertions.find(x=>x.id==='manual-private')!.value,'after');assert.equal(saved.assertions.find(x=>x.analysisJobId==='job-id')!.status,'candidate');
 const replay=await commitAnalysisTask(a,pins,task,{id:'job-id',sessionId:s.id} as any,[result]);assert.equal(replay.candidateCount,1);assert.equal((await b.getSession(s.id))!.assertions.filter(x=>x.analysisJobId==='job-id').length,1);
 results.push({check:'unrelated owner preserved + explicit candidate status + replay receipt',state:'PASS'});
}
{
 const objects=new MemoryObjects(),a=new BlobStore(objects),b=new BlobStore(objects),req:any={get:(key:string)=>key==='cookie'?'kb_device='+'a'.repeat(64):undefined};
 let arrived=0,release:()=>void=()=>{};const bothRead=new Promise<void>(r=>release=r),requestId='same-create-request';
 // Exact check/list -> create shape of index.ts:264, independently queued per function.
 // A barrier represents both function instances reading before either writes.
 async function creation(store:BlobStore,id:string){const hash=rooms.deviceHash(req);const previous=(await store.listSessions(true)).find(s=>rooms.record(s)?.members.some(m=>m.hash===hash&&m.role==='host')&&rooms.record(s)?.createRequestId===requestId);if(previous)return previous.id;
  if(++arrived===2)release();await bothRead;const s=session(id);s.players=[{id:id+'-host',name:'synthetic',color:'#123456'}];s.room=rooms.newRoom(req,2,s.players[0].id,requestId);await store.saveSession(s);return s.id;
 }
 const ids=await Promise.all([creation(a,'room-left'),creation(b,'room-right')]);const stored=await a.listSessions(true);
 results.push({check:'same room creation request across independent instances',state:stored.length===1?'PASS':'FAIL',expectedRooms:1,actualRooms:stored.length,distinctReturnedIds:new Set(ids).size,source:'server/index.ts:264 check-then-create; pure semantic reproduction, NOT HTTP integration'});
}
await writeFile(new URL('./results.json',import.meta.url),JSON.stringify({realAIcalls:0,networkCalls:0,results},null,2)+'\n');
console.log(JSON.stringify({results},null,2));if(results.some(x=>x.state==='FAIL'))process.exitCode=1;
