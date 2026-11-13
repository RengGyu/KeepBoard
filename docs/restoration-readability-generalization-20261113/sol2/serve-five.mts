/** Reuses actual createApp/Store and frozen accepted records; all providers fail closed. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadFixtures,repository,recordProof,originalPieces,jsonSHA,sha} from './fixtures.mts';
const serve=process.argv.includes('--serve'),out=path.join(repository,'docs/restoration-readability-generalization-20261113/sol2');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'kb-readability-five-'));await fs.chmod(root,0o700);
// The real workspace .env/settings/store must never be opened by module initialization.
for(const key of Object.keys(process.env))if(/API_KEY|KEY_FILE|AI_GATEWAY|AI_ALIAS|SUPABASE|BLOB_READ_WRITE|LOCAL_READER_CONFIG/.test(key))delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=root;process.chdir(root);
let providerAttempts=0,externalFetchAttempts=0;
const originalFetch=globalThis.fetch;globalThis.fetch=(async(input:any,options:any)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);if(!['127.0.0.1','localhost'].includes(url.hostname)){externalFetchAttempts++;throw Error('External network disabled for saved-response review');}return originalFetch(input,options);}) as typeof fetch;
const [{createApp},{Store},express,{TERRA_HIGH_IDENTITY},{restorationScenesForView}]=await Promise.all([import('../../../server/index.ts'),import('../../../server/store.ts'),import('express'),import('../../../server/ai/terraGameReader.ts'),import('../../../shared/sceneProjection.ts')]);
const store=new Store(root,path.join(repository,'public')),fixtures=await loadFixtures();
const noProvider=async()=>{providerAttempts++;throw Error('Saved-response replay: provider disabled');};
const reader={identity:TERRA_HIGH_IDENTITY,status:async()=>({kind:TERRA_HIGH_IDENTITY.kind,available:false,cloudSupported:true as const,identity:null,reason:'기존 저장 응답 재생 · 새 판독 차단'}),read:noProvider,readCatanScene:noProvider};
const app=express.default();app.all('/api/settings',(_req,res)=>res.json({configured:false,provider:'gemini',model:'saved-response-review'}));app.post('/api/packs/generate',(_req,res)=>res.status(409).json({error:'Saved-response review only'}));
app.use(await createApp({store,ui:false,uiHmr:false,runtimePacks:fixtures.map(f=>f.view.pack),analyzer:noProvider,geminiReader:reader as any,terraReader:reader,terraHighReader:reader}));
// createApp's implicit Vite root follows cwd. Keep module/settings isolation and attach the same actual app with an explicit source root and isolated envDir.
const vite=serve?await (await import('vite')).createServer({root:repository,envDir:root,configFile:path.join(repository,'vite.config.ts'),server:{middlewareMode:true,hmr:false,ws:false},appType:'spa'}):undefined;
if(vite)app.use(vite.middlewares);
const server=app.listen(Number(process.env.KB_REVIEW_PORT??0),'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
const call=async(route:string,body?:unknown,method=body===undefined?'GET':'POST')=>{const r=await fetch(base+'/api'+route,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),v:any=await r.json();assert(r.ok,JSON.stringify({route,status:r.status,error:v.error}));return v;};
const uiProof=serve?await(async()=>{const html=await fetch(base+'/'),text=await html.text();assert.equal(html.status,200);assert(text.includes('/src/main.tsx'));const module=await fetch(base+'/src/main.tsx');assert.equal(module.status,200);await module.text();return {htmlStatus:html.status,entryModuleStatus:module.status,root:repository,envDir:root};})():null;
const reports:any[]=[];
try{for(const f of fixtures){
 const s=structuredClone(f.view.session);s.gamePack=structuredClone(f.view.pack);const url=await store.saveEvidence('data:image/jpeg;base64,'+f.bytes.toString('base64'));s.evidence=s.evidence.map((e:any)=>({...e,url,thumbnailUrl:url}));s.name='기존 실사진 검수 · '+f.gameId;
 await store.saveSession(s);const route='/sessions/'+s.id,initial=await call(route),before=jsonSHA(recordProof(s));assert.equal(jsonSHA(recordProof(initial.session)),before,'initial API values/IDs/receipts');assert.equal(initial.pack.version,f.manifest.packVersion);assert.equal(initial.pack.runtime.source.sha256,f.manifest.packSourceSHA);
 assert.equal(sha(Buffer.from(await (await fetch(base+url)).arrayBuffer())),f.manifest.photoSHA,'served original bytes');
 const scenes=restorationScenesForView(initial.session,initial.pack),bindings=scenes.flatMap(p=>p.entities.flatMap(e=>e.bindings)),expected=originalPieces(s).map((p:any)=>JSON.stringify([p.assertionId,p.pieceId])).sort();assert.deepEqual([...new Set(bindings.map(b=>JSON.stringify([b.assertionId,b.pieceId])))].sort(),expected,'all original live objects collected once');assert.equal(bindings.length,expected.length);
 for(const p of scenes){const grouped=p.groups.flatMap(g=>g.entityIds);assert.equal(new Set(grouped).size,grouped.length,'no repeated entity in display groups');assert(p.entities.every(e=>p.groups.some(g=>g.entityIds.includes(e.id))),'no dropped display entity');}
 // Keep the browser fixture pristine. Save/resume and unchanged-value edit are tested on a separate isolated copy.
 const trial=structuredClone(s);trial.id=randomUUID();trial.name='보존 회귀 · '+f.gameId;await store.saveSession(trial);const tr='/sessions/'+trial.id;
 await call(tr+'/commit',{allowIncomplete:true});let reopened=await call(tr);assert.equal(jsonSHA(recordProof(reopened.session)),before);assert.equal(jsonSHA(reopened.session.snapshots.at(-1).assertions.filter((a:any)=>a.status==='accepted'&&a.basis!=='rule').map((a:any)=>({id:a.id,field:a.field,ownerId:a.ownerId??null,value:a.value,receipts:a.observationReceipts??[],evidenceIds:a.evidenceIds}))),before);
 reopened=await call(tr+'/resume',{scope:'public'});assert.equal(jsonSHA(recordProof(reopened.session)),before,'resume original record proof');
 const selected=originalPieces(reopened.session)[0],a=reopened.session.assertions.find((a:any)=>a.id===selected.assertionId);const edited=await call(tr,{answers:[{field:a.field,...(a.ownerId?{ownerId:a.ownerId}:{}),value:a.value}]},'PATCH');const live=originalPieces(edited.session);assert.deepEqual(live.map((p:any)=>p.pieceId).sort(),originalPieces(s).map((p:any)=>p.pieceId).sort(),'editor keeps original piece IDs');assert.deepEqual(live.map((p:any)=>p.value),originalPieces(s).map((p:any)=>p.value),'unchanged value edit preserves whole object geometry/readout');
 const receiptSHAs=(v:any)=>v.assertions.filter((a:any)=>a.status==='accepted'&&a.basis!=='rule').flatMap((a:any)=>(a.observationReceipts??[]).map(jsonSHA));assert.deepEqual(receiptSHAs(edited.session),receiptSHAs(s),'unchanged-value editor retains receipt/raw');
 await call(tr+'/commit',{allowIncomplete:true});const after=await call(tr);assert.deepEqual(originalPieces(after.session).map((p:any)=>p.value),originalPieces(s).map((p:any)=>p.value));
 await store.setSessionsHidden([trial.id],true);
 reports.push({...f.manifest,sessionId:s.id,url:base+'/?session='+s.id,servedPhotoURL:base+url,scope:'public',actualUIPath:f.manifest.recording==='native'?'existing native Rummikub board/editor':'existing generic whole-scene + component editor',scene:{objects:bindings.length,regions:scenes.flatMap(p=>p.regions.map(r=>({label:r.label,kind:r.kind,boardEntityId:r.boardEntityId,objects:new Set(p.groups.filter(g=>r.groupIds.includes(g.id)).flatMap(g=>g.entityIds)).size}))),groups:scenes.reduce((n,p)=>n+p.groups.length,0),retained:scenes.flatMap(p=>p.entities).filter(e=>e.presentation?.status==='retained').length,canonicalCells:scenes.flatMap(p=>p.entities).filter(e=>e.presentation?.cell).length},checks:{originalPhoto:true,valuesIdsReceipts:true,completeUniqueLiveCollection:true,commitReopenResume:true,unchangedEditorSave:true},trialSessionId:trial.id});
 }
 assert.equal(providerAttempts,0);assert.equal(externalFetchAttempts,0);const report={mode:'actual createApp/Store; saved accepted responses; no new recognition',providerAttempts,externalFetchAttempts,base,dataRoot:root,serve,uiProof,cases:reports};await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,serve?'serve-manifest.json':'verification.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(root,'review-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({base,dataRoot:root,providerAttempts,externalFetchAttempts,cases:reports.map(r=>({game:r.gameId,url:r.url,objects:r.scene.objects,path:r.actualUIPath}))},null,2));
}catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(error),providerAttempts,externalFetchAttempts,dataRoot:root},null,2)+'\n');throw error;}finally{if(!serve){server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await vite?.close();}}
if(serve){for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{server.closeAllConnections();server.close(()=>process.exit(0));});}
