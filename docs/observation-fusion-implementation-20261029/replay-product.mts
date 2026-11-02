// Supervisor acceptance replay. Calls current production projector; never a research fusion substitute.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {catalogPacks} from '../../gamepacks/catalog.ts';import {effectiveRecognitionPack} from '../../shared/recognition.ts';import {photoDefinition} from '../../server/photoDefinitions.ts';import {prepareScanObservation,projectScanResults} from '../../server/scanObservation.ts';
const dir=path.dirname(new URL(import.meta.url).pathname),variant=process.argv[2];assert(['before','after'].includes(variant));
const privateDir=path.join(os.homedir(),'Library/Application Support/KeepBoard/research/observation-fusion-implementation-20261029');await fs.mkdir(privateDir,{recursive:true,mode:0o700});
const source=path.join(os.homedir(),'Library/Application Support/KeepBoard/research/multiview-followup-20261029'),plan=JSON.parse(await fs.readFile(new URL('../multiview-followup-20261029/plan.json',import.meta.url),'utf8'));
const sha=(v:any)=>createHash('sha256').update(v).digest('hex');globalThis.fetch=async()=>{throw Error('Acceptance replay prohibits external API');};
const report:any={variant,modelCalls:0,cases:[],sourceSHA:sha(await fs.readFile(new URL('../../server/scanObservation.ts',import.meta.url)))};
for(const c of plan.cases){
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.packId)!);const definition=photoDefinition(pack),epoch='followup';
 const evidence:any[]=[{id:c.gameId+'-whole',url:'/'+c.gameId+'/whole',kind:'photo',scope:'public',captureEpoch:epoch,label:'whole'},{id:c.gameId+'-crop',url:'/'+c.gameId+'/crop',kind:'photo',scope:'public',captureEpoch:epoch,label:'crop',sourceEvidenceId:c.gameId+'-whole',sourceRegion:c.sourceRegion}];
 const session:any={id:c.gameId,name:'acceptance-replay',gamePack:pack,gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:epoch,turnInstanceId:'turn',stage:'capture',players:[],evidence,assertions:[],notes:{},activity:[],preservations:[],snapshots:[]};
 const bytes=[await fs.readFile(c.path),await fs.readFile(c.cropPath)];assert.equal(sha(bytes[0]),c.sourceSHA);assert.equal(sha(bytes[1]),c.cropSHA);const readImage=async(e:any)=>({data:bytes[e.id.endsWith('-crop')?1:0],mimeType:e.id.endsWith('-crop')?'image/png':'image/jpeg'});
 const reader:any={identity:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},status:async()=>({available:true}),read:async()=>{throw Error('No provider');}};
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'gemini-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:c.gameId==='splendor-duel'?'board':c.areaId},taskId:'followup-'+c.gameId,reader,cloud:false,readImage});
 const units=JSON.parse(await fs.readFile(path.join(source,c.gameId+'.units.json'),'utf8'));const rawBefore=JSON.stringify(units),t=performance.now();
 const result=projectScanResults(session,pack,scan,units);const elapsed=performance.now()-t;const reversed=projectScanResults(session,pack,scan,[...units].reverse());const repeated=projectScanResults(session,pack,scan,[...units,units[1]]);
 const stable=(r:any)=>JSON.stringify({values:r.assertions.map((a:any)=>a.value),bundle:r.scanBundle,receipts:r.observationReceipts});assert.equal(stable(result),stable(reversed));assert.equal(stable(result),stable(repeated));assert.equal(rawBefore,JSON.stringify(units));assert.equal(stable(result),stable(JSON.parse(JSON.stringify(result))));
 const pieces=result.assertions.flatMap(a=>(a.value as any).pieces??(a.value as any).components??[]);await fs.writeFile(path.join(privateDir,c.gameId+'.'+variant+'.json'),JSON.stringify(result),{mode:0o600});
 report.cases.push({gameId:c.gameId,editablePieces:pieces.length,elapsedMs:elapsed,inputUnitSHA:sha(rawBefore),rawObservations:result.observationReceipts?.reduce((n,r)=>n+r.result.observations.length,0),orderRedeliveryJSONAndRawImmutability:true});
}
await fs.writeFile(path.join(dir,variant+'-product-replay.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
