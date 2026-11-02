import test from 'node:test';import assert from 'node:assert/strict';
import {MemoryObjects} from '../server/objects';import {BlobObjects} from '../server/blobObjects';import {BlobStore} from '../server/blobStore';
import {createApp} from '../server/index';import {cloudRunHostedScan,finishCloudJob} from '../server/cloudRuntime';
import defs from '../game-photo-definitions/index.json';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
test('cloud factory uses pinned Terra, durable unit claims prevent redelivery requests, raw/value/timing survive commit',async t=>{
 const o=new MemoryObjects();for(const method of ['read','write','remove','list'] as const)t.mock.method(BlobObjects.prototype,method,o[method].bind(o));
 const names=['KEEPBOARD_BLOB_PREFIX','KEEPBOARD_CLOUD_AI','OPENAI_API_KEY','KEEPBOARD_OPENAI_API_KEY_FILE','KEEPBOARD_MOCK_ANALYSIS'] as const,old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 process.env.KEEPBOARD_BLOB_PREFIX='terra-synthetic';process.env.OPENAI_API_KEY='sk-synthetic_1234567890123456789';delete process.env.KEEPBOARD_OPENAI_API_KEY_FILE;delete process.env.KEEPBOARD_MOCK_ANALYSIS;
 t.after(()=>{for(const name of names)if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];});
 let calls=0,jobId='';
 t.mock.method(globalThis,'fetch',async(url:any,init:any)=>{
  calls++;assert.equal(String(url),'https://api.openai.com/v1/responses');const b=JSON.parse(String(init.body));assert.equal(b.model,'gpt-6.1-terra');
  return Response.json({model:'gpt-6.1-terra',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:[{kind:'chips',box_1000:null,quantity:1,face:'front',attributes:[{id:'color',valueJson:'"red"',unknownReason:null}]}]})}]}],usage:{input_tokens:1,output_tokens:2,total_tokens:3}});
 });
 const {request}=await import('node:http'),app=await createApp({store:new BlobStore(o),cloud:{objects:o,dispatch:async id=>{jobId=id;}}}),server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));t.after(()=>{server.closeAllConnections();server.close();});
 const call=(route:string,body?:unknown):Promise<any>=>new Promise((resolve,reject)=>{const data=body===undefined?undefined:JSON.stringify(body),req=request({hostname:'127.0.0.1',port:(server.address()as any).port,path:'/api'+route,method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>{try{assert(res.statusCode!<300,text);resolve(JSON.parse(text));}catch(e){reject(e);}});});req.on('error',reject);req.end(data);});
 const d=defs.games.find(d=>d.gameId==='splendor')!,v=await call('/sessions',{gamePackId:d.packId,name:'synthetic Terra cloud'}),p='/sessions/'+v.session.id,e=await call(p+'/evidence',{scope:'public',dataUrl:image});
 await call(p+'/analysis-jobs',{requestId:'terra-cloud-once',evidenceIds:[e.createdEvidenceId],expectedCaptureEpoch:e.session.captureEpoch,reader:{kind:'terra-game-observation-v1',definitionSHA:d.definitionSHA,areaId:'chip-supply'}});
 await cloudRunHostedScan(jobId);await cloudRunHostedScan(jobId);await finishCloudJob(jobId);await cloudRunHostedScan(jobId);
 assert.equal(calls,1);const job=(await call(p+'/analysis-jobs')).jobs[0];assert.equal(job.state,'completed',JSON.stringify(job));assert.equal(job.reader.kind,'terra-game-observation-v1');assert(job.timings.providerMs>=0);
 const a=(await call(p)).session.assertions.find((a:any)=>a.status==='accepted'&&a.observationReceipts?.length);assert.equal(a.value.pieces[0].readout.color,'red');assert.equal(a.observationReceipts[0].hostedWire.providerResponse.model,'gpt-6.1-terra');assert.equal(a.observationReceipts[0].reader.kind,'terra-game-observation-v1');
});
