// Saved responses only. Fixed pre-output geometry/reference protocol; no provider/network.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {projectScanResults,observationObjects} from '/private/tmp/kb-terra-quality-independent-review/first-replay/server/scanObservation.ts';import {mapObservationRegion} from '../../shared/photoGeometry';
const evidence='docs/terra-ten-game-evaluation-20261030',out='docs/terra-quality-iteration-20261030',privateRoot="/private/tmp/kb-terra-quality-independent-review",pre=JSON.parse(await fs.readFile(evidence+'/preflight.json','utf8')),evaluation=JSON.parse(await fs.readFile(evidence+'/evaluation-preflight.json','utf8')),execution=JSON.parse(await fs.readFile(evidence+'/recovery-execution.json','utf8'));
const privateOut=privateRoot+'/'+(process.env.REPLAY_STAGE??'independent-frozen-first');await fs.mkdir(privateOut,{recursive:true,mode:0o700});
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
type Box=[number,number,number,number];
const iou=(a:Box,b:Box)=>{const area=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return area/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-area)||0;};
const px=(b:any,w:number,h:number):Box|null=>b?[b.x*w,b.y*h,(b.x+b.width)*w,(b.y+b.height)*h]:null;
const states=['correct','wrong','unknown','missing-object','observed-unjudged'];
const count=(xs:any[])=>Object.fromEntries(states.map(s=>[s,xs.filter(a=>a.status===s).length]));
function score(refs:any[],rows:any[],types:any){
 const individual=rows.filter(p=>p.single&&p.box),matrix=refs.map(r=>individual.map(p=>iou(r.boxPx,p.box))),matches=new Map<number,number>();
 for(const [i,values] of matrix.entries()){
  const max=Math.max(0,...values),js=values.flatMap((v,j)=>Math.abs(v-max)<1e-9?[j]:[]);if(max<.25||js.length!==1)continue;const j=js[0],column=matrix.map(v=>v[j]),cmax=Math.max(...column);
  if(Math.abs(max-cmax)<1e-9&&column.filter(v=>Math.abs(v-cmax)<1e-9).length===1)matches.set(i,j);
 }
 const details=refs.map((r,i)=>{const j=matches.get(i),p=j===undefined?undefined:individual[j];const center=[(r.boxPx[0]+r.boxPx[2])/2,(r.boxPx[1]+r.boxPx[3])/2];
  const coveringGroups=rows.filter(p=>!p.single&&p.kind===r.componentId&&p.box&&center[0]>=p.box[0]&&center[0]<=p.box[2]&&center[1]>=p.box[1]&&center[1]<=p.box[3]).map(p=>p.id);
  return {referenceId:r.id,predictedId:p?.id??null,individualDetected:!!p,kindCorrect:!r.scorableKind?null:!!p&&p.kind===r.componentId,matchIoU:p?iou(r.boxPx,p.box):null,
   unmatchedDiagnostic:p?null:coveringGroups.length?'aggregate-overlap-not-individual':Math.max(0,...(matrix[i]??[]))>0?'individual-overlap-unresolved':'no-geometric-correspondence',coveringGroups,
   attributes:Object.entries(r.attributes).map(([id,expected])=>{const actual=p?.values[id]??null,type=types[r.componentId]?.[id];return {id,expected,actual,type,numeric:typeof expected==='number',status:!p?'missing-object':actual===null?'unknown':JSON.stringify(expected)===JSON.stringify(actual)?'correct':type==='text'?'observed-unjudged':'wrong'};})};
 });
 const attrs=details.flatMap(d=>d.attributes),numeric=attrs.filter(a=>a.numeric),nonFace=attrs.filter(a=>a.id!=='face'),text=attrs.filter(a=>a.type==='text'),nonText=attrs.filter(a=>a.type!=='text'&&a.id!=='face');
 const duplicates=refs.flatMap((r,i)=>{const choices=individual.filter(p=>{const vs=refs.map(ref=>iou(ref.boxPx,p.box)),max=Math.max(0,...vs);return max>=.25&&Math.abs(vs[i]-max)<1e-9&&vs.filter(v=>Math.abs(v-max)<1e-9).length===1;});return choices.length>1?[{referenceId:r.id,predictedIds:choices.map(p=>p.id)}]:[];});
 return {metrics:{referenceObjects:refs.length,individualDetected:matches.size,missingIndividual:refs.length-matches.size,scorableKinds:details.filter(d=>d.kindCorrect!==null).length,correctKind:details.filter(d=>d.kindCorrect===true).length,
  attributes:{denominator:attrs.length,...count(attrs)},nonFaceAttributes:{denominator:nonFace.length,...count(nonFace)},nonTextNonFace:{denominator:nonText.length,...count(nonText)},numeric:{denominator:numeric.length,...count(numeric)},text:{denominator:text.length,...count(text)},spatialDuplicateCandidates:duplicates.length,
  unmatchedDiagnostics:Object.fromEntries(['aggregate-overlap-not-individual','individual-overlap-unresolved','no-geometric-correspondence'].map(k=>[k,details.filter(d=>d.unmatchedDiagnostic===k).length]))},details,duplicates};
}
const reports=[];
for(const r of evaluation.rows){
 assert.equal(sha(await fs.readFile(r.referencePath)),r.referenceSHA);const ref=JSON.parse(await fs.readFile(r.referencePath,'utf8')),c=pre.calls.find((c:any)=>c.gameId===r.gameId),task=JSON.parse(await fs.readFile(c.taskPath,'utf8')),w=task.scan.units[0].hosted.request.images[0].width,h=task.scan.units[0].hosted.request.images[0].height;
 const types=Object.fromEntries(task.scan.units[0].hosted.definition.components.map((c:any)=>[c.id,Object.fromEntries(c.properties.map((p:any)=>[p.id,p.type]))]));
 const results=[],rawRows:any[]=[],variants=[],rawMapping=new Map<string,string>(),full=ref.objects.filter((o:any)=>o.roiRelation==='full'),editableRefs=full.filter((o:any)=>o.editableExpected);
 for(const call of pre.calls.filter((c:any)=>c.gameId===r.gameId)){
  const receipt=execution.results.find((v:any)=>v.id===call.id);if(!receipt){variants.push({variant:call.variant,status:'not-sent'});continue;}
  const bytes=await fs.readFile(pre.privateDir+'/recovery.'+call.id+'.result.json');assert.equal(sha(bytes),receipt.resultSHA);const result=JSON.parse(bytes.toString());results.push(result);
  const rs=result.observationReceipts??[],rows=rs.flatMap((r:any)=>r.result.observations.map((o:any)=>({id:o.ref,unitId:r.scanUnitId,kind:o.componentId,box:px(mapObservationRegion(o,r.request,r.transforms),w,h),single:r.hostedWire?.physicalUnits?.[o.ref]!=='group'&&(o.quantity===1||o.quantity===null&&r.hostedWire?.physicalUnits?.[o.ref]==='single'),unit:r.hostedWire?.physicalUnits?.[o.ref]??'unknown',quantity:o.quantity,values:Object.fromEntries(Object.entries(o.properties).map(([k,v]:[string,any])=>[k,v.state==='observed'?v.value:null]))})));
  rawRows.push(...rows);const s=score(full,rows,types);for(const d of s.details)if(d.predictedId)rawMapping.set(JSON.stringify([task.scan.units[call.unitIndex].id,d.predictedId]),d.referenceId);
  const detail={...s,clipped:score(ref.objects.filter((o:any)=>o.roiRelation==='clipped'),rows,types)};await fs.writeFile(privateOut+'/'+call.id+'.new-score.json',JSON.stringify(detail,null,2)+'\n',{mode:0o600});
  variants.push({variant:call.variant,status:receipt.state,rawRows:rows.length,physicalUnits:{single:rows.filter((p:any)=>p.unit==='single').length,group:rows.filter((p:any)=>p.unit==='group').length,unknown:rows.filter((p:any)=>p.unit==='unknown').length},rawObjectAndValueMetrics:s.metrics,editableSubset:score(editableRefs,rows,types).metrics,clippedMetrics:detail.clipped.metrics,provider:execution.rows.find((v:any)=>v.id===call.id)});
 }
 const original=JSON.stringify(results),start=performance.now(),projected=projectScanResults(task.session,task.pack,task.scan,results),projectMs=performance.now()-start;
 const stable=(p:any)=>JSON.stringify({values:p.assertions.map((a:any)=>a.value),bundle:p.scanBundle,receipts:p.observationReceipts});
 assert.equal(stable(projected),stable(projectScanResults(task.session,task.pack,task.scan,[...results].reverse())));if(results.length)assert.equal(stable(projected),stable(projectScanResults(task.session,task.pack,task.scan,[...results,results[0]])));assert.equal(JSON.stringify(results),original);
 const projectedReceipts=projected.observationReceipts??[],pieces=projected.assertions.flatMap((a:any)=>observationObjects(a.value));
 const finalRows=pieces.map((p:any)=>{const claims=projectedReceipts.flatMap((r:any)=>r.result.observations.filter((o:any)=>r.componentRefs[o.ref]===p.id).map((o:any)=>({o,unit:r.hostedWire?.physicalUnits?.[o.ref]??'unknown'})));
  return {id:p.id,kind:p.componentId??(p.kind==='number'?'numbers':p.kind==='joker'?'jokers':p.kind),box:px(p.region,w,h),single:claims.some((r:any)=>r.unit!=='group'&&(r.o.quantity===1||r.o.quantity===null&&r.unit==='single')),values:p.readout?.values??{number:p.number,color:p.color,face:p.face}};
 });
 const scored=score(editableRefs,finalRows,types),wrongLinks:any[]=[],unknownLinks:any[]=[];
 for(const link of projected.scanBundle?.links??[]){if(link.members.length<2)continue;const ids=link.members.map((m:any)=>rawMapping.get(JSON.stringify([m.unitId,m.observationRef])));
  if(ids.every(Boolean)){if(new Set(ids).size>1)wrongLinks.push({members:link.members,referenceIds:ids});}else unknownLinks.push({members:link.members,reason:'not all members uniquely map to bounded reference'});
 }
 const fullGroups=pieces.filter((p:any)=>projectedReceipts.some((r:any)=>r.result.observations.some((o:any)=>r.componentRefs[o.ref]===p.id&&r.hostedWire?.physicalUnits?.[o.ref]==='group')));
 const coexistence=fullGroups.flatMap((p:any)=>{const box=px(p.region,w,h);if(!box)return[];const childIds=scored.details.filter(d=>d.individualDetected).flatMap(d=>{const ref=editableRefs.find((x:any)=>x.id===d.referenceId)!;const cx=(ref.boxPx[0]+ref.boxPx[2])/2,cy=(ref.boxPx[1]+ref.boxPx[3])/2;return ref.componentId===p.componentId&&cx>=box[0]&&cx<=box[2]&&cy>=box[1]&&cy<=box[3]?[d.referenceId]:[];});return childIds.length?[{pieceId:p.id,referenceIds:childIds}]:[];});
 const rawPreserved=projectedReceipts.reduce((n:number,r:any)=>n+r.result.observations.length,0)===rawRows.length;assert(rawPreserved);
 await fs.writeFile(privateOut+'/'+r.gameId+'.projection.json',JSON.stringify(projected,null,2)+'\n',{mode:0o600});
 await fs.writeFile(privateOut+'/'+r.gameId+'.fusion-score.json',JSON.stringify({...scored,wrongLinks,unknownLinks,coexistence},null,2)+'\n',{mode:0o600});
 reports.push({gameId:r.gameId,referenceSHA:r.referenceSHA,partitions:r.roiPartitions,priorTerraExposure:r.priorTerraExposure,priorGeminiExposure:r.priorGeminiExposure,variants,
  fusion:{allEditableObjects:pieces.length,assessedEditable:scored.metrics,confirmedWrongLinks:wrongLinks.length,unassessedOrUncertainLinks:unknownLinks.length,aggregateCoexistenceCandidates:coexistence.length,rawObservationCount:rawRows.length,rawObservationCountPreserved:rawPreserved,orderReversalAndRedeliveryEqual:true,inputResultsUnchanged:true,projectMs,unresolvedGroups:projected.scanBundle?.unresolvedGroups?.length??0,refinements:projected.scanBundle?.fusion?.refinements.length??0}});
}
await fs.writeFile(out+'/'+(process.env.REPLAY_STAGE??'independent-frozen-first')+'-scores.json',JSON.stringify({newProviderCalls:0,referencePreflightSHA:sha(await fs.readFile(evidence+'/evaluation-preflight.json')),method:evaluation.matching,wholePhotoAccuracy:null,precisionAllOutputObjects:null,cases:reports},null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({game:r.gameId,detected:r.fusion.assessedEditable.individualDetected,denominator:r.fusion.assessedEditable.referenceObjects,raw:r.fusion.rawObservationCount,wrongLinks:r.fusion.confirmedWrongLinks,duplicates:r.fusion.assessedEditable.spatialDuplicateCandidates})),null,2));
