// Offline replay of frozen model responses. No fetch, credentials or production writes.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {projectScanResults} from '../../server/scanObservation.ts';
import {photoDefinition} from '../../server/photoDefinitions.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
const dir=new URL('./',import.meta.url),root=process.env.HOME+'/Library/Application Support/KeepBoard/research/max-parallel-20261029';
const hash=(v:any)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
function stable(v:any):any{if(Array.isArray(v))return v.map(stable);if(!v||typeof v!=='object')return v;return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)]));}
function semantic(result:any){return stable({assertions:result.assertions.map((a:any)=>({field:a.field,ownerId:a.ownerId??null,value:a.value,evidenceIds:a.evidenceIds,receipts:(a.observationReceipts??[]).map((r:any)=>({scanUnitId:r.scanUnitId,result:r.result,componentRefs:r.componentRefs,sourceImageSHA:r.sourceImageSHA,transforms:r.transforms}))})),bundle:result.scanBundle});}
function permutations(a:number[]):number[][]{if(a.length<2)return [a];return a.flatMap((n,i)=>permutations(a.filter((_,j)=>j!==i)).map(p=>[n,...p]));}
const report:any={status:'STARTED',providerCalls:0,conditions:[]};
for(const cap of [2,5]){
 const responses=JSON.parse(await fs.readFile(root+'/cap-'+cap+'-results.json','utf8')),saved=JSON.parse(await fs.readFile(root+'/cap-'+cap+'-saved.json','utf8'));
 const session=structuredClone(saved);session.assertions=session.assertions.filter((a:any)=>a.basis==='rule');
 const pack=effectiveRecognitionPack(session.gamePack),definition=photoDefinition(pack),plan=responses[0].scanBundle.plan;
 const scan:any={plan,units:plan.units.map((u:any)=>{const receipt=responses.flatMap((r:any)=>r.observationReceipts??[]).find((r:any)=>r.scanUnitId===u.id);assert(receipt);return {id:u.id,evidenceId:u.evidenceId,hosted:{request:receipt.request,definition,reader:receipt.reader,frame:receipt.frame??undefined,transforms:receipt.transforms,sourceImageSHA:receipt.sourceImageSHA,inputSHA:u.inputSHA}};})};
 const sourceHash=hash(responses),snapshotHash=hash(session),out=projectScanResults(structuredClone(session),pack,structuredClone(scan),structuredClone(responses));
 const signature=hash(semantic(out)),scenes=out.assertions.flatMap((a:any)=>(a.value as any)?.components??[]),anchorReceipt=out.observationReceipts!.find((r:any)=>r.scanUnitId===plan.units[0].id)!;
 const originalAnchor=responses[0].observationReceipts[0],ids=new Set(scenes.map((o:any)=>o.id));
 const preserved=originalAnchor.result.observations.map((o:any)=>({ref:o.ref,kind:o.componentId,target:anchorReceipt.componentRefs[o.ref]??null}));
 const missing=preserved.filter((o:any)=>!o.target||!ids.has(o.target));
 let checked=0;for(const order of permutations([0,1,2,3,4])){const result=projectScanResults(structuredClone(session),pack,structuredClone(scan),order.map(i=>structuredClone(responses[i])));assert.equal(hash(semantic(result)),signature,'Semantic result changed by response order '+order);checked++;}
 assert.equal(hash(responses),sourceHash);assert.equal(hash(session),snapshotHash);assert.equal(missing.length,0,'Normal anchor observations disappeared');
 const inline=responses[0].assertions.flatMap((a:any)=>a.value?.components??[]).filter((o:any)=>o.kind==='terrain'&&o.number!==null&&o.number!==undefined);
 for(const original of inline){const raw=originalAnchor.result.observations.find((o:any)=>originalAnchor.componentRefs[o.ref]===original.id);assert(raw);const projected=scenes.find((o:any)=>o.id===anchorReceipt.componentRefs[raw.ref]);assert(projected);assert(projected.number===original.number||scenes.some((o:any)=>o.kind==='number-token'&&o.attachedToId===projected.id&&o.number===original.number),'Inline number value lost');}
 const row={capFixture:cap,originalRawSHA:sourceHash,originalAnchorObservations:preserved.length,preservedAnchorObservations:preserved.length-missing.length,missing,projectionRows:scenes.length,projectionKinds:Object.fromEntries([...new Set(scenes.map((o:any)=>o.kind))].map(k=>[k,scenes.filter((o:any)=>o.kind===k).length])),inlineNumbersPreserved:inline.length,permutationsChecked:checked,sourceObjectsUnchanged:true,semanticSHA:signature};report.conditions.push(row);console.log(JSON.stringify(row));
}
report.status='PASS';await fs.writeFile(new URL('replay-result.json',dir),JSON.stringify(report,null,2)+'\n');
