/** Actual createApp + Vite + isolated Store. Model and external fetches fail closed. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadEight,repository,sha,jsonSHA,originalPieces,recordProof} from './fixtures-eight.mts';
const out=import.meta.dirname,serve=process.argv.includes('--serve'),dataRoot=await fs.mkdtemp(path.join(os.tmpdir(),'kb-linear-eight-'));
await fs.chmod(dataRoot,0o700);
for(const key of Object.keys(process.env))if(/API_KEY|KEY_FILE|AI_GATEWAY|AI_ALIAS|SUPABASE|BLOB_READ_WRITE|LOCAL_READER_CONFIG/.test(key))delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=dataRoot;process.chdir(dataRoot);
let providerAttempts=0,externalFetchAttempts=0;
const originalFetch=globalThis.fetch;globalThis.fetch=(async(input:any,options:any)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(!['localhost','127.0.0.1'].includes(url.hostname)){externalFetchAttempts++;throw Error('External fetch disabled');}return originalFetch(input,options);}) as typeof fetch;
const [{createApp},{Store},express,{TERRA_HIGH_IDENTITY},{restorationScenesForView}]=await Promise.all([import('../../../server/index.ts'),import('../../../server/store.ts'),import('express'),import('../../../server/ai/terraGameReader.ts'),import('../../../shared/sceneProjection.ts')]);
const fixtures=await loadEight(),store=new Store(dataRoot,path.join(repository,'public'));
const noProvider=async()=>{providerAttempts++;throw Error('Saved response review only');};
const reader={identity:TERRA_HIGH_IDENTITY,status:async()=>({kind:TERRA_HIGH_IDENTITY.kind,available:false,cloudSupported:true as const,identity:null,reason:'기존 응답 검수 · 새 판독 차단'}),read:noProvider,readCatanScene:noProvider};
const app=express.default();app.all('/api/settings',(_req,res)=>res.json({configured:false,provider:'gemini',model:'saved-response-review'}));
app.use(await createApp({store,ui:false,uiHmr:false,runtimePacks:fixtures.map(f=>f.pack),analyzer:noProvider,geminiReader:reader as any,terraReader:reader,terraHighReader:reader}));
const vite=serve?await(await import('vite')).createServer({root:repository,envDir:dataRoot,configFile:path.join(repository,'vite.config.ts'),server:{middlewareMode:true,hmr:false,ws:false},appType:'spa'}):undefined;if(vite)app.use(vite.middlewares);
const server=app.listen(Number(process.env.KB_REVIEW_PORT??58116),'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
const call=async(route:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),v:any=await r.json();assert(r.ok,JSON.stringify({route,status:r.status,error:v.error}));return v;};
const reports:any[]=[];
try{for(const f of fixtures){
 const created=await call('/sessions',{gamePackId:f.pack.id,recordingMode:'simple'}),s=created.session;
 Object.assign(s,structuredClone(f.session));s.name='배치 소비 검수 · '+f.gameId;s.notes={public:'격리된 기존 응답 검수',private:{}};
 const imageURL=await store.saveEvidence('data:image/jpeg;base64,'+f.bytes.toString('base64'));s.evidence=s.evidence.map((e:any)=>({...e,url:imageURL,thumbnailUrl:imageURL}));
 await store.saveSession(s);const route='/sessions/'+s.id,v=await call(route),proof=jsonSHA(recordProof(s));assert.equal(jsonSHA(recordProof(v.session)),proof);
 const sourceBindings=originalPieces(s).map((p:any)=>JSON.stringify([p.assertionId,p.pieceId])).sort(),scenes=restorationScenesForView(v.session,v.pack),bindings=scenes.flatMap(p=>p.entities.flatMap(e=>e.bindings)).map(b=>JSON.stringify([b.assertionId,b.pieceId])).sort();
 assert.deepEqual(bindings,sourceBindings,'408 bindings once in actual API projection');assert.equal(sha(Buffer.from(await(await fetch(base+imageURL)).arrayBuffer())),sha(f.bytes));
 // The browser originals are pristine; storage checks use an independent copy.
 const trial=structuredClone(s);trial.id=crypto.randomUUID();await store.saveSession(trial);const tr='/sessions/'+trial.id;
 await call(tr+'/commit',{allowIncomplete:true});let reopened=await call(tr);assert.equal(jsonSHA(recordProof(reopened.session)),proof);reopened=await call(tr+'/resume',{scope:'public'});assert.equal(jsonSHA(recordProof(reopened.session)),proof);
 await store.setSessionsHidden([trial.id],true);
 reports.push({gameId:f.gameId,url:base+'/?session='+s.id,sessionId:s.id,photo:f.photo,photoSHA:sha(f.bytes),photoURL:base+imageURL,pack:{id:v.pack.id,version:v.pack.version,sourceSHA:v.pack.runtime.source.sha256},sourcePins:f.pins,originalObjects:sourceBindings.length,recordSHA:proof,projection:{regions:scenes.reduce((n,p)=>n+p.regions.length,0),groups:scenes.reduce((n,p)=>n+p.groups.length,0),retained:scenes.flatMap(p=>p.entities).filter(e=>e.presentation?.status==='retained').length},checks:{valuesIDsReceipts:true,completeUniqueBindings:true,photoBytes:true,commitReopenResume:true}});
 }
 const uiProof=serve?await(async()=>{const r=await fetch(base+'/'),html=await r.text();assert.equal(r.status,200);assert(html.includes('/src/main.tsx'));const module=await fetch(base+'/src/main.tsx');assert.equal(module.status,200);await module.text();return {html:200,module:200};})():null;
 assert.equal(providerAttempts,0);assert.equal(externalFetchAttempts,0);
 const report={scope:'actual product; old eight saved inputs; no new photo accuracy claim',base,dataRoot,providerAttempts,externalFetchAttempts,uiProof,totalBindings:reports.reduce((n,r)=>n+r.originalObjects,0),cases:reports};
 await fs.writeFile(path.join(out,serve?'serve-manifest.json':'api-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({base,dataRoot,totalBindings:report.totalBindings,providerAttempts,externalFetchAttempts,cases:reports.map(r=>({game:r.gameId,url:r.url,objects:r.originalObjects}))},null,2));
}finally{if(!serve){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await vite?.close();}}
if(serve)for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
