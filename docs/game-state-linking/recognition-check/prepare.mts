// Offline preparation only. This file contains no credentials and makes no network/model request.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import os from 'node:os';import {pathToFileURL} from 'node:url';
const sha=(b:Buffer|string)=>crypto.createHash('sha256').update(b).digest('hex');
const here=path.dirname(new URL(import.meta.url).pathname),manifest=JSON.parse(fs.readFileSync(path.join(here,'../integration/source-manifest.json'),'utf8')),app=manifest.source;
for(const [f,h] of Object.entries(manifest.files))if(sha(fs.readFileSync(path.join(app,f)))!==h)throw Error('Source drift: '+f);
const {observationPrompt}=await import(pathToFileURL(path.join(app,'server/ai/prompt.ts')).href),{effectiveRecognitionPack,recognitionFields}=await import(pathToFileURL(path.join(app,'shared/recognition.ts')).href),{captureProfile,captureFields,validateCaptureTarget}=await import(pathToFileURL(path.join(app,'shared/photoCapture.ts')).href),{observableFields}=await import(pathToFileURL(path.join(app,'server/ai/fields.ts')).href),{builtinPacks}=await import(pathToFileURL(path.join(app,'gamepacks/catalog.ts')).href);
const userRoot=JSON.parse(fs.readFileSync('/private/tmp/keepboard-current-catan-diagnostic-location.json','utf8')).root,user=JSON.parse(fs.readFileSync(path.join(userRoot,'session.json'),'utf8'));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'keepboard-recognition-four-'));fs.chmodSync(root,0o700);
const rows=[
 {gameId:'catan',packId:'catan-base',image:path.join(userRoot,'public-photo.jpeg')},
 {gameId:'splendor',packId:'splendor',sha:'210fe11683641690c26cdf41070c9b0f6eed1e950a4358a5cf81b06e9d37503f'},
 {gameId:'rummikub',packId:'rummikub',sha:'26bad7b14b6e865768aeff5c77e54867db56fec9e33c8f7ba932a3e3ee430efc'},
 {gameId:'sagrada',packId:'sagrada',sha:'1d7d90e29e7fa9555598e72f2f5efe6fad030692793faa5a0414c39e3d87afb6'},
];
const inputs=[];
for(const [index,row] of rows.entries()){
 const pack=effectiveRecognitionPack(row.gameId==='catan'?user.pack:builtinPacks().find((p:any)=>p.id===row.packId));
 const selected=row.gameId==='catan'?undefined:JSON.parse(fs.readFileSync('/private/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/keepboard-recognition-gt-4games/'+row.gameId+'-photo.json','utf8'));
 if(selected&&selected.sha256!==row.sha)throw Error('Reviewer photo mismatch');
 const image=row.image??selected?.localPath;if(!image)throw Error('Image not found');const bytes=fs.readFileSync(image),hash=sha(bytes);if(row.sha&&row.sha!==hash)throw Error('Image drift');
 // Default UI 'whole / unspecified'; the user's original Catan evidence has no target.
 const target=undefined;
 const evidence={id:'four-game-'+row.gameId,scope:'public',kind:'photo',url:'/private-test-only',label:'게임 보드 사진',capturedAt:'2026-10-23T00:00:00.000Z',captureEpoch:'four-game-epoch',...(target?{captureTarget:target}:{})};
 const players=row.gameId==='catan'?user.session.players.map((p:any,i:number)=>({id:'diagnostic-player-'+(i+1),name:'플레이어 '+(i+1),color:p.color})):[];
 const session={id:'diagnostic-'+row.gameId,name:'격리 판독 진단',players,evidence:[evidence],assertions:row.gameId==='catan'?user.session.assertions.filter((a:any)=>a.status==='accepted'&&['rulesProfile','tradeBuildMode','game.status'].includes(a.field)).map((a:any)=>({field:a.field,value:a.value,status:'accepted'})):[],snapshots:[],preservations:[],notes:{},activity:[],gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,turnInstanceId:'diagnostic-turn',captureEpoch:'four-game-epoch',stage:'capture'};
 const prompt=observationPrompt(session,pack,[evidence],'','capture'),promptBytes=Buffer.byteLength(prompt),upper=promptBytes+2048;
 if(upper>32768)throw Error('Input budget exceeded: '+row.gameId);
 const input=path.join(root,row.gameId+'.input.json');fs.writeFileSync(input,JSON.stringify({session,pack,evidence,prompt,image}),{mode:0o600});
 inputs.push({gameId:row.gameId,packId:pack.id,packVersion:pack.version,packSourceSHA:pack.runtime?.source.sha256,sourcePage:selected?.pageUrl??'user-provided exact session public photo',imageSHA:hash,imageBytes:bytes.length,promptSHA:sha(prompt),promptBytes,inputTokenUpperBound:upper,allowedFields:captureFields(pack,[evidence],row.gameId==='rummikub'?pack.fields.filter((f:any)=>f.key==='table.scene'):row.gameId==='catan'?observableFields(pack).filter((f:any)=>f.scope==='public'||f.scope==='player'&&f.visibility==='public'):recognitionFields(pack)).map((f:any)=>f.key),area:'default public whole-photo / no captureTarget',customInstruction:false,privateInputFile:input});
}
const preflight={status:'PROPOSED_NOT_AUTHORIZED_NO_CALLS',realCalls:0,sourceDigest:manifest.sourceDigest,privateDirectory:root,maxCallsIncludingFailures:4,automaticRetries:0,model:'deepseek-flash',effort:'high',detail:'high',maxInputTokens:32768,maxOutputTokensIncludingReasoning:32768,peakUSDPerMillion:{input:.3,output:1.2},maximumCostUSD:4*(32768*.3+32768*1.2)/1e6,hardCapUSD:.20,inputs};
fs.writeFileSync(path.join(here,'preflight.json'),JSON.stringify(preflight,null,2)+'\n');console.log(JSON.stringify({status:preflight.status,realCalls:0,maximumCostUSD:preflight.maximumCostUSD,sourceDigest:manifest.sourceDigest,inputs:inputs.map(i=>({gameId:i.gameId,promptBytes:i.promptBytes,inputUpper:i.inputTokenUpperBound,fields:i.allowedFields,imageSHA:i.imageSHA}))}));
