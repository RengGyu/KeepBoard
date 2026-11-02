// Frozen partial-reference scoring only; no provider/network/key access.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {projectScanResults,observationObjects} from '../../server/scanObservation';
import {mapObservationRegion} from '../../shared/photoGeometry';
const out='docs/terra-quality-iteration-20261030';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const pre=JSON.parse(await fs.readFile(out+'/preflight.json','utf8'));
const protocol=JSON.parse(await fs.readFile(out+'/evaluation-preflight.json','utf8'));
const execution=JSON.parse(await fs.readFile(out+'/execution.json','utf8'));
assert.equal(sha(await fs.readFile(out+'/evaluation-preflight.json')),pre.referencePreflightSHA);
assert.equal(sha(await fs.readFile(out+'/selection.json')),pre.selectionSHA);
const beforeManifest=JSON.parse(await fs.readFile(out+'/offline-preimage-manifest.json','utf8'));
for(const f of beforeManifest.files)assert.equal(sha(await fs.readFile(f.offlineCopy)),f.offlineSHA);
const {projectScanResults:beforeProject}=await import(pathToFileURL(beforeManifest.files.find((f:any)=>f.path==='server/scanObservation.ts').offlineCopy).href);
const sourcePaths=['server/observationFusion.ts','server/scanObservation.ts','shared/scanObservation.ts'];
const sourceHashes=await Promise.all(sourcePaths.map(async path=>({path,sha256:sha(await fs.readFile(path))})));
const privateOut=pre.privateDir+'/scores';await fs.mkdir(privateOut,{recursive:true,mode:0o700});
type Box=[number,number,number,number];
const iou=(a:Box,b:Box)=>{const area=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return area/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-area)||0;};
const pixels=(b:any,w:number,h:number):Box|null=>b?[b.x*w,b.y*h,(b.x+b.width)*w,(b.y+b.height)*h]:null;
const match=(refs:any[],rows:any[])=>{
 const matrix=refs.map(r=>rows.map(p=>p.box?iou(r.boxPx,p.box):0)),matches=new Map<number,number>();
 for(const [i,values]of matrix.entries()){
  const max=Math.max(0,...values),js=values.flatMap((v,j)=>Math.abs(v-max)<1e-9?[j]:[]);if(max<.25||js.length!==1)continue;
  const j=js[0],column=matrix.map(v=>v[j]),cm=Math.max(...column);
  if(Math.abs(max-cm)<1e-9&&column.filter(v=>Math.abs(v-cm)<1e-9).length===1)matches.set(i,j);
 }return {matches,matrix};
};
const states=['correct','wrong','unknown','missing-object','observed-unjudged'];
const count=(xs:any[])=>({denominator:xs.length,...Object.fromEntries(states.map(s=>[s,xs.filter(a=>a.status===s).length]))});
const color=(v:any)=>{if(typeof v!=='string')return v;const normalized=v.trim().toLowerCase();return Object.entries(protocol.matching.colorAliases).find(([,aliases])=>(aliases as string[]).includes(normalized))?.[0]??normalized;};
function score(refs:any[],allRows:any[],types:any,group=false){
 const rows=allRows.filter(p=>(group?p.group:p.single)&&p.box),{matches,matrix}=match(refs,rows);
 const details=refs.map((r,i)=>{
  const j=matches.get(i),p=j===undefined?undefined:rows[j];
  return {referenceId:r.id,referenceConfidence:r.confidence??'high',predictedId:p?.id??null,unitId:p?.unitId??null,detected:!!p,
   kindCorrect:r.scorableKind===false?null:!!p&&p.kind===r.componentId,matchIoU:p?iou(r.boxPx,p.box):null,
   attributes:Object.entries(r.attributes??{}).map(([id,expected])=>{
    const actual=p?.values[id]??null,type=types[r.componentId]?.[id],isColor=/color/i.test(id),equal=JSON.stringify(isColor?color(expected):expected)===JSON.stringify(isColor?color(actual):actual);
    const status=!p?'missing-object':actual===null?'unknown':equal?'correct':type==='text'&&!isColor?'observed-unjudged':'wrong';
    return {id,expected,actual,type,status,numeric:typeof expected==='number',confidence:r.confidence??'high',duplicateSemanticField:id==='observedColor'&&r.attributes.trainColor!==undefined};
   }),
   unmatchedDiagnostic:p?null:allRows.some(p=>p.group&&p.kind===r.componentId&&p.box&&iou(r.boxPx,p.box)>0)?'group-overlap-not-individual':Math.max(0,...matrix[i])>0?'individual-overlap-unresolved':'no-geometric-correspondence'};
 });
 const attributes=details.flatMap(d=>d.attributes),semantic=attributes.filter(a=>!a.duplicateSemanticField);
 const duplicates=refs.flatMap((r,i)=>{const candidates=rows.filter(p=>{const scores=refs.map(ref=>iou(ref.boxPx,p.box)),max=Math.max(0,...scores);return max>=.25&&Math.abs(scores[i]-max)<1e-9&&scores.filter(v=>Math.abs(v-max)<1e-9).length===1;});return candidates.length>1?[{referenceId:r.id,predictedIds:candidates.map(p=>p.id)}]:[];});
 const metrics={referenceObjects:refs.length,detected:matches.size,missing:refs.length-matches.size,correctKind:details.filter(d=>d.kindCorrect===true).length,
  confidence:Object.fromEntries(['high','medium'].map(level=>[level,{referenceObjects:refs.filter(r=>(r.confidence??'high')===level).length,detected:details.filter(d=>d.referenceConfidence===level&&d.detected).length}])),
  requestedAttributes:count(attributes),semanticAttributes:count(semantic),numeric:count(attributes.filter(a=>a.numeric)),numericHigh:count(attributes.filter(a=>a.numeric&&a.confidence==='high')),numericMedium:count(attributes.filter(a=>a.numeric&&a.confidence==='medium')),
  spatialDuplicateCandidates:duplicates.length,diagnostics:Object.fromEntries(['group-overlap-not-individual','individual-overlap-unresolved','no-geometric-correspondence'].map(k=>[k,details.filter(d=>d.unmatchedDiagnostic===k).length]))};
 return {metrics,details,duplicates};
}
const stable=(p:any)=>JSON.stringify({values:p.assertions.map((a:any)=>a.value),bundle:p.scanBundle,receipts:p.observationReceipts});
const reports:any[]=[];
for(const row of protocol.rows){
 assert.equal(sha(await fs.readFile(row.referencePath)),row.referenceSHA);
 const ref=JSON.parse(await fs.readFile(row.referencePath,'utf8')),calls=pre.calls.filter((c:any)=>c.gameId===row.gameId),task=JSON.parse(await fs.readFile(calls[0].taskPath,'utf8'));
 const w=task.scan.units[0].hosted.request.images[0].width,h=task.scan.units[0].hosted.request.images[0].height;
 const types=Object.fromEntries(task.scan.units[0].hosted.definition.components.map((c:any)=>[c.id,Object.fromEntries(c.properties.map((p:any)=>[p.id,p.type]))]));
 const available=new Map<string,any>(),variants:any[]=[],rawMaps=new Map<string,Map<string,string>>();
 for(const call of calls){
  const outcome=execution.rows.find((v:any)=>v.id===call.id);
  if(outcome?.state!=='completed'){variants.push({condition:call.condition,state:outcome?.state??'not-sent'});continue;}
  const bytes=await fs.readFile(pre.privateDir+'/'+call.id+'.result.json');assert.equal(sha(bytes),outcome.resultSHA);const result=JSON.parse(bytes.toString());available.set(call.condition,result);
  const rawRows=result.observationReceipts.flatMap((r:any)=>r.result.observations.map((o:any)=>{const unit=r.hostedWire?.physicalUnits?.[o.ref]??'unknown';return {id:o.ref,unitId:r.scanUnitId,kind:o.componentId,box:pixels(mapObservationRegion(o,r.request,r.transforms),w,h),single:unit!=='group'&&(o.quantity===1||o.quantity===null&&unit==='single'),group:unit==='group'||o.quantity>1,physicalUnit:unit,quantity:o.quantity,values:Object.fromEntries(Object.entries(o.properties).map(([id,p]:[string,any])=>[id,p.state==='observed'?p.value:null]))};}));
  const scored=score(ref.objects,rawRows,types),groups=score(ref.groupSurfaceReferences,rawRows,types,true);
  rawMaps.set(call.condition,new Map(scored.details.filter(d=>d.predictedId).map(d=>[JSON.stringify([d.unitId,d.predictedId]),d.referenceId])));
  await fs.writeFile(privateOut+'/'+call.id+'.score.json',JSON.stringify({individual:scored,groupSurface:groups,rawRows},null,2)+'\n',{mode:0o600});
  variants.push({condition:call.condition,state:outcome.state,effort:call.effort,bodySHA:call.bodySHA,resultSHA:outcome.resultSHA,sourceSHA:call.sourceSHA,inputSHA:call.inputSHA,
   rawObservations:rawRows.length,physicalUnits:{single:rawRows.filter((r:any)=>r.physicalUnit==='single').length,group:rawRows.filter((r:any)=>r.physicalUnit==='group').length,unknown:rawRows.filter((r:any)=>r.physicalUnit==='unknown').length},
   individual:scored.metrics,groupSurface:groups.metrics,providerMs:outcome.providerMs,usage:outcome.usage,calculatedUSD:outcome.calculatedUSD});
 }
 const fusion:any[]=[];
 for(const conditions of [['A','C'],['B','C']]){
  if(!conditions.every(c=>available.has(c))){fusion.push({conditions,state:'incomplete-inputs'});continue;}
  const results=conditions.map(c=>available.get(c)),rawBefore=JSON.stringify(results),rawCount=results.reduce((n,r)=>n+r.observationReceipts.reduce((s:number,v:any)=>s+v.result.observations.length,0),0),rawMap=new Map(conditions.flatMap(c=>[...rawMaps.get(c)!.entries()]));
  for(const [version,project]of [['preimage',beforeProject],['candidate',projectScanResults]]as const){
   const start=performance.now(),r=project(task.session,task.pack,task.scan,results),cpuMs=performance.now()-start;
   assert.equal(stable(r),stable(project(task.session,task.pack,task.scan,[...results].reverse())));assert.equal(stable(r),stable(project(task.session,task.pack,task.scan,[...results,results[0]])));assert.equal(JSON.stringify(results),rawBefore);
   const receipts=r.observationReceipts??[],pieces=r.assertions.flatMap((a:any)=>observationObjects(a.value));
   const rows=pieces.map((p:any)=>{const claims=receipts.flatMap((rr:any)=>rr.result.observations.filter((o:any)=>rr.componentRefs[o.ref]===p.id).map((o:any)=>({o,unit:rr.hostedWire?.physicalUnits?.[o.ref]??'unknown'})));return {id:p.id,kind:p.componentId,box:pixels(p.region,w,h),single:claims.some((c:any)=>c.unit!=='group'&&(c.o.quantity===1||c.o.quantity===null&&c.unit==='single')),group:claims.some((c:any)=>c.unit==='group'||c.o.quantity>1),quantity:p.quantity,values:p.readout?.values??{}};});
   const scored=score(ref.objects.filter((o:any)=>o.editableExpected),rows,types),groups=score(ref.groupSurfaceReferences,rows,types,true),wrongLinks:any[]=[],unassessedLinks:any[]=[];
   for(const link of r.scanBundle?.links??[]){if(link.members.length<2)continue;const ids=link.members.map((m:any)=>rawMap.get(JSON.stringify([m.unitId,m.observationRef])));if(ids.every(Boolean)){if(new Set(ids).size>1)wrongLinks.push({members:link.members,referenceIds:ids});}else unassessedLinks.push({members:link.members,reason:'outside uniquely matched individual partial reference'});}
   const rawPreserved=receipts.reduce((n:number,v:any)=>n+v.result.observations.length,0)===rawCount;assert(rawPreserved);
   const name=row.gameId+'-'+conditions.join('')+'-'+version;
   await fs.writeFile(privateOut+'/'+name+'.projection.json',JSON.stringify(r,null,2)+'\n',{mode:0o600});
   await fs.writeFile(privateOut+'/'+name+'.score.json',JSON.stringify({individual:scored,groupSurface:groups,wrongLinks,unassessedLinks,rows},null,2)+'\n',{mode:0o600});
   fusion.push({conditions,version,state:'replayed',allEditableObjects:pieces.length,individual:scored.metrics,groupSurface:groups.metrics,rawObservations:rawCount,rawPreserved,inputResultsUnchanged:true,orderReversalAndRedeliveryEqual:true,confirmedWrongLinks:wrongLinks.length,unassessedLinks:unassessedLinks.length,refinements:r.scanBundle?.fusion?.refinements.length??0,unresolvedGroups:r.scanBundle?.unresolvedGroups?.length??0,cpuMs});
  }
 }
 reports.push({gameId:row.gameId,referenceSHA:row.referenceSHA,variants,fusion});
}
const sourceDrift=[];for(const f of sourceHashes)if(sha(await fs.readFile(f.path))!==f.sha256)sourceDrift.push(f.path);assert.equal(sourceDrift.length,0,'Fusion source changed during scoring; rerun offline on frozen source');
const report={evaluatedAt:new Date().toISOString(),newProviderCalls:0,executionSHA:sha(await fs.readFile(out+'/execution.json')),protocolSHA:pre.referencePreflightSHA,sourceHashes,beforeManifestSHA:sha(await fs.readFile(out+'/offline-preimage-manifest.json')),sourceDrift,
 humanCertified:false,wholePhotoAccuracy:null,allOutputPrecision:null,manualCorrectionTime:null,conditions:'A/B exact whole image; effort only. A/C image+registered crop only; no independent-sample claim.',cases:reports};
await fs.writeFile(out+'/evaluation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({game:r.gameId,variants:r.variants.map((v:any)=>({condition:v.condition,detected:v.individual?.detected,denominator:v.individual?.referenceObjects,numeric:v.individual?.numeric,groups:v.groupSurface?.detected,ms:v.providerMs,cost:v.calculatedUSD})),fusion:r.fusion.map((f:any)=>({conditions:f.conditions,version:f.version,detected:f.individual?.detected,numeric:f.individual?.numeric,duplicates:f.individual?.spatialDuplicateCandidates}))})),null,2));
