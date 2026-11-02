// Research-only offline A+D projection; frozen scorer helper copied without changes.
// No API, key access, product writes, GT mutation or private raw output.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectScanResults,observationObjects} from '../../server/scanObservation';
import {mapObservationRegion} from '../../shared/photoGeometry';
const root='docs/terra-quality-iteration-20261030',out='docs/terra-latency-architecture-20261031';
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const protocol=await read(root+'/evaluation-preflight.json'),old=await read(root+'/preflight-high.json'),crop=await read(root+'/crop-high/preflight.json');
const oldExec=await read(root+'/execution-high.json'),cropExec=await read(root+'/crop-high/execution.json');
const inventory=await read(out+'/input-inventory.json');
for(const f of inventory.files)assert.equal(sha(await fs.readFile(f.path)),f.sha256,f.path);
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

const canonical=(x:any):string=>JSON.stringify(x,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const stable=(p:any)=>canonical({values:p.assertions.map((a:any)=>a.value),bundle:p.scanBundle,receipts:p.observationReceipts});
const reports:any[]=[];
for(const row of protocol.rows){
 assert.equal(sha(await fs.readFile(row.referencePath)),row.referenceSHA);
 const ref=await read(row.referencePath),a=old.calls.find((c:any)=>c.gameId===row.gameId&&c.condition==='A'),d=crop.calls.find((c:any)=>c.gameId===row.gameId),task=await read(a.taskPath);
 const calls=[a,d],results=[],resultHashes:any[]=[];const rawMaps=new Map<string,string>();
 const w=task.scan.units[0].hosted.request.images[0].width,h=task.scan.units[0].hosted.request.images[0].height;
 const types=Object.fromEntries(task.scan.units[0].hosted.definition.components.map((c:any)=>[c.id,Object.fromEntries(c.properties.map((p:any)=>[p.id,p.type]))]));
 for(const call of calls){
  const exec=call.condition==='A'?oldExec:cropExec,receipt=exec.rows.find((r:any)=>r.id===call.id),bytes=await fs.readFile(call.resultPath??old.privateDir+'/'+row.gameId+'-'+call.condition+'.result.json');
  assert.equal(sha(bytes),receipt.resultSHA);resultHashes.push({id:call.id,sha256:sha(bytes)});const result=JSON.parse(bytes.toString());results.push(result);
  const rawRows=result.observationReceipts.flatMap((r:any)=>r.result.observations.map((o:any)=>{const unit=r.hostedWire?.physicalUnits?.[o.ref]??'unknown';return {id:o.ref,unitId:r.scanUnitId,kind:o.componentId,box:pixels(mapObservationRegion(o,r.request,r.transforms),w,h),single:unit!=='group'&&(o.quantity===1||o.quantity===null&&unit==='single'),group:unit==='group'||o.quantity>1,values:Object.fromEntries(Object.entries(o.properties).map(([id,p]:[string,any])=>[id,p.state==='observed'?p.value:null]))};}));
  for(const m of score(ref.objects,rawRows,types).details)if(m.predictedId)rawMaps.set(JSON.stringify([m.unitId,m.predictedId]),m.referenceId);
 }
 const input=canonical(results),rawCount=results.reduce((n,r)=>n+r.observationReceipts.reduce((s:number,v:any)=>s+v.result.observations.length,0),0);
 const start=performance.now(),p=projectScanResults(task.session,task.pack,task.scan,results),cpuMs=performance.now()-start;
 assert.equal(canonical(results),input);
 assert.equal(stable(p),stable(projectScanResults(task.session,task.pack,task.scan,[...results].reverse())));
 assert.equal(stable(p),stable(projectScanResults(task.session,task.pack,task.scan,[...results,...results])));
 assert.equal(stable(p),stable(JSON.parse(JSON.stringify(p))));
 const receipts=p.observationReceipts??[],pieces=p.assertions.flatMap((a:any)=>observationObjects(a.value));
 assert.equal(rawCount,receipts.reduce((n:number,r:any)=>n+r.result.observations.length,0));
 const rows=pieces.map((piece:any)=>{const claims=receipts.flatMap((r:any)=>r.result.observations.filter((o:any)=>r.componentRefs[o.ref]===piece.id).map((o:any)=>({o,unit:r.hostedWire?.physicalUnits?.[o.ref]??'unknown'})));return {id:piece.id,kind:piece.componentId,box:pixels(piece.region,w,h),single:claims.some((c:any)=>c.unit!=='group'&&(c.o.quantity===1||c.o.quantity===null&&c.unit==='single')),group:claims.some((c:any)=>c.unit==='group'||c.o.quantity>1),values:piece.readout?.values??{}};});
 const metrics=score(ref.objects.filter((o:any)=>o.editableExpected),rows,types).metrics;
 let assessedWrong=0,unassessed=0;for(const link of p.scanBundle?.links??[]){if(link.members.length<2)continue;const ids=link.members.map((m:any)=>rawMaps.get(JSON.stringify([m.unitId,m.observationRef])));if(ids.every(Boolean)){if(new Set(ids).size>1)assessedWrong++;}else unassessed++;}
 reports.push({gameId:row.gameId,conditions:['A','D'],evidenceLevel:'VERIFIED_OFFLINE',individual:metrics,allEditableObjects:pieces.length,rawCount,rawPreserved:true,inputUnchanged:true,reverseRedeliveryAndJsonRoundTripEqual:true,confirmedWrongLinksWithinMatchedSubset:assessedWrong,unassessedLinks:unassessed,unresolvedGroups:p.scanBundle?.unresolvedGroups?.length??0,fieldConflicts:p.scanBundle?.fusion?.decisions.filter((d:any)=>d.conflict).length??0,cpuMs,projectionSHA:sha(stable(p)),resultHashes});
}
for(const f of inventory.files)assert.equal(sha(await fs.readFile(f.path)),f.sha256,f.path);
const report={createdAt:new Date().toISOString(),providerCalls:0,productWrites:0,referenceWrites:0,task:'Recombine existing A+D responses only; no new parallel timing experiment',sourceInventory:'input-inventory.json',frozenScoringSource:root+'/crop-high/score.mts',cases:reports,limitations:['Partial AI reference, not human certified or whole-photo accuracy.','Same development photos and prior requests; not held-out.','Mixed-effort production adapter/job pinning has not been implemented or tested by this projection.','CPU timings are local uncharged replay timings, not API or cloud write latency.']};
await fs.writeFile(out+'/offline-ad-replay.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({gameId:r.gameId,detected:r.individual.detected,denominator:r.individual.referenceObjects,numeric:r.individual.numeric,raw:r.rawCount,conflicts:r.fieldConflicts,unassessed:r.unassessedLinks,cpuMs:r.cpuMs})),null,2));
