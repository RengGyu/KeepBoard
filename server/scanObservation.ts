import {requestAreas} from '../shared/restoration';
import {remapSpatialRelations} from './spatialProjection';
import {isHostedReader} from '../shared/lightweightRecognition';
import {createHash,randomUUID} from 'node:crypto';
import type {AnalysisResult,Assertion,Evidence,GamePack,Session,Value} from '../shared/types';
import type {PhotoReaderSelection,ObservationReceipt} from '../shared/lightweightRecognition';
import {cropPhotoTransform,mapObservationRegion} from '../shared/photoGeometry';
import {linkScanObservations,possibleScanRelations,sameScanLayer,mergeObservedFacts,observationOverlap,type ScanPlan,type ScanTarget,type ScanUnitStatus,type ScanBundleReceipt} from '../shared/scanObservation';
import {normalizeScene,resolveSlotId} from '../shared/scene';
import {prepareHostedObservation,analyzeHostedObservation,type PinnedHostedObservation} from './hostedObservation';
import {prepareLocalObservation,analyzeLocalObservation,imageDimensions,type PinnedLocalObservation} from './localObservation';
import type {HostedObservationReader} from './ai/hostedReader';import type {LocalReader} from './ai/localReader';
import {AnalysisJobError} from './analysisJobs';
import {projectGenericFusion,supportsGenericFusion} from './observationFusion';
export interface PinnedScanObservation {plan:ScanPlan;units:{id:string;evidenceId:string;hosted?:PinnedHostedObservation;local?:PinnedLocalObservation}[]}
const sha=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
export const observationObjects=(v:any):any[]=>v&&typeof v==='object'?(v.components??v.pieces??[...(v.groups??[]).flatMap((g:any)=>g.tiles??[]),...(v.loose??[])]):[];
export function scanSourceEvidence(selected:Evidence[],session:Session){const all=[...selected];for(const e of selected)if(e.sourceRegion&&e.sourceEvidenceId){const source=session.evidence.find(x=>x.id===e.sourceEvidenceId);if(!source||source.sourceRegion||source.scope!==e.scope||source.ownerId!==e.ownerId||source.captureEpoch!==e.captureEpoch)throw new AnalysisJobError('확대 원본의 범위·촬영 단계를 확인하세요.');if(!all.some(x=>x.id===source.id))all.push(source);}return all;}
export async function prepareScanObservation(input:{session:Session;pack:GamePack;evidence:Evidence[];selection:PhotoReaderSelection;taskId:string;reader:HostedObservationReader;localReader?:LocalReader;cloud:boolean;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>}):Promise<PinnedScanObservation>{
 // A caller may share this cache across preparation and execution.
 const images=new Map<string,ReturnType<typeof input.readImage>>();
 const readImage=(e:Evidence)=>{
  const key=JSON.stringify([e.id,e.url,e.kind,e.scope,e.ownerId??null,e.captureEpoch,e.sourceEvidenceId??null,e.sourceRegion??null]);
  let pending=images.get(key);
  if(!pending){pending=Promise.resolve().then(()=>input.readImage(e));images.set(key,pending);}
  return pending;
 };
 const target='target'in input.selection?input.selection.target:undefined;
 const owner=input.evidence[0]?.ownerId,units:PinnedScanObservation['units']=[],planUnits:ScanPlan['units']=[];
 if(target){if(!target||Object.keys(target).sort().join(',')!=='assertionId,pieceId'||typeof target.assertionId!=='string'||typeof target.pieceId!=='string')throw new AnalysisJobError('보충할 실물을 확인하세요.');const a=input.session.assertions.find(a=>a.id===target.assertionId&&a.status==='accepted'&&a.ownerId===owner);if(!a||!observationObjects(a.value).some(p=>p.id===target.pieceId))throw new AnalysisJobError('보충할 기록이 바뀌었습니다.',409);}
 // Validate a supplied frame on its selected source before omitting it from other photos.
 // Reuse that pinned unit below so frame/atlas validation is performed exactly once.
 let framed:PinnedHostedObservation|PinnedLocalObservation|undefined;
 if(input.selection.frame!==undefined){
  const frame=input.selection.frame,index=input.evidence.findIndex(e=>e.id===frame?.sourceEvidenceId);
  if(!frame||typeof frame!=='object'||Array.isArray(frame)||index<0)throw new AnalysisJobError('사진 기준점의 선택된 원본을 확인하세요.',409);
  const {target:_target,...selection}=input.selection as PhotoReaderSelection&{target?:ScanTarget};
  const common={pack:input.pack,playerCount:input.session.players?.length,evidence:[input.evidence[index]],captureEpoch:input.session.captureEpoch,selection,taskId:input.taskId+'-unit-'+index,readImage};
  framed=isHostedReader(selection)?await prepareHostedObservation({...common,reader:input.reader}):await prepareLocalObservation({...common,reader:input.localReader,cloud:input.cloud});
 }
 const preparedUnits=await Promise.all(input.evidence.map(async(e,index)=>{
  const {target:_target,...selection}=input.selection as PhotoReaderSelection&{target?:ScanTarget};
  if(selection.frame&&selection.frame.sourceEvidenceId!==e.id)delete selection.frame;
  const id=input.taskId+'-unit-'+index,common={pack:input.pack,playerCount:input.session.players?.length,evidence:[e],captureEpoch:input.session.captureEpoch,selection,taskId:id,readImage};
  const pinned=framed&&input.selection.frame!.sourceEvidenceId===e.id?framed:isHostedReader(selection)?await prepareHostedObservation({...common,reader:input.reader}):await prepareLocalObservation({...common,reader:input.localReader,cloud:input.cloud});
  const bytes=await readImage(e);let source=e,sourceSHA=sha(bytes.data);
  if(e.sourceRegion&&e.sourceEvidenceId){
   if(!isHostedReader(selection))throw new AnalysisJobError('로컬 crop 판독은 지원하지 않습니다. 원본은 유지됩니다.');
   source=input.session.evidence.find(x=>x.id===e.sourceEvidenceId)!;const original=await readImage(source);sourceSHA=sha(original.data);
   const transform=cropPhotoTransform({transformId:id+'-crop',sourceSHA,inputSHA:sha(bytes.data),sourceDimensions:imageDimensions(original.data),inputDimensions:imageDimensions(bytes.data),region:e.sourceRegion});
   pinned.transforms=[transform];(pinned as PinnedHostedObservation).inputSHA=sha(bytes.data);pinned.sourceImageSHA=sourceSHA;pinned.request.images[0]={...pinned.request.images[0],evidenceId:source.id,transformId:transform.transformId};
  }
  const areas=requestAreas(pinned.request,pinned.definition);
  if(target){const a=input.session.assertions.find(a=>a.id===target.assertionId)!;const object=observationObjects(a.value).find(p=>p.id===target.pieceId),kind=object.kind??object.componentId;
   if(!areas.some(area=>area.fields.includes(a.field))||!pinned.request.allowedComponents.includes(kind))throw new AnalysisJobError('보충할 실물과 촬영 영역이 다릅니다.');
   pinned.request.allowedComponents=[kind];pinned.request.allowedPropertyIds={[kind]:pinned.request.allowedPropertyIds[kind]};
  }
  const unit={id,evidenceId:e.id,...(isHostedReader(selection)?{hosted:pinned as PinnedHostedObservation}:{local:pinned as PinnedLocalObservation})};
  const planUnit:ScanPlan['units'][number]={id,evidenceId:e.id,sourceEvidenceId:source.id,sourceSHA,inputSHA:sha(bytes.data),areaId:pinned.request.areaId,...(pinned.request.readingTarget?{readingTarget:pinned.request.readingTarget}:{}),role:target?'detail':e.sourceRegion?'crop':index===0?'anchor':'detail',target:target??null};return {unit,planUnit};
 }));
 for(const p of preparedUnits){units.push(p.unit);planUnits.push(p.planUnit);}
 const first=units[0].hosted??units[0].local!;
 return {plan:{version:'scan-observation-plan-v1',id:input.taskId,gameId:first.request.gameId,definitionSHA:first.request.definitionSHA,scope:first.request.scope,anchorEvidenceId:planUnits[0].sourceEvidenceId,units:planUnits},units};
}
export async function analyzeScanUnit(input:{scan:PinnedScanObservation;index:number;pack:GamePack;session:Session;evidence:Evidence[];reader:HostedObservationReader;localReader?:LocalReader;timings?:Record<string,number>;readImage:(e:Evidence)=>Promise<{data:Buffer;mimeType:string}>;onRows?:import('../shared/lightweightRecognition').ObservationProgressCallback}):Promise<AnalysisResult>{
 const u=input.scan.units[input.index],unit=input.scan.plan.units[input.index],start=performance.now();if(!u)throw Error('없는 읽기 단위입니다.');
 try{
  const evidence=input.evidence.filter(e=>e.id===u.evidenceId),plan=u.hosted??u.local!;
  const result=u.hosted?await analyzeHostedObservation({plan:u.hosted,pack:input.pack,session:input.session,turnInstanceId:input.session.turnInstanceId,evidence,reader:input.reader,readImage:input.readImage,timings:input.timings,literal:unit.role!=='anchor',onRows:input.onRows}):await analyzeLocalObservation({plan:u.local!,pack:input.pack,turnInstanceId:input.session.turnInstanceId,evidence,reader:input.localReader!,readImage:input.readImage});
  const receipts=result.observationReceipts??[];for(const r of receipts)r.scanUnitId=u.id;
  return {...result,scanBundle:{plan:input.scan.plan,units:[{unitId:u.id,state:receipts.some(r=>r.result.completion!=='complete')?'interrupted':'completed',observationCount:receipts.reduce((n,r)=>n+r.result.observations.length,0),elapsedMs:performance.now()-start}],links:[]}};
 }catch{return {assertions:[],summary:'일부 사진을 읽지 못했어요. 원본과 다른 사진의 결과는 남아 있어요.',mode:'live',warnings:['읽기 단위 실패 · 자동 재시도 없음'],scanBundle:{plan:input.scan.plan,units:[{unitId:u.id,state:'failed',error:'analysis-failed',observationCount:0,elapsedMs:performance.now()-start}],links:[]}};}
}
/** Hosted selected units fan out immediately; local model retains two units; indexed results retain the pinned photo order, regardless of completion order. */
export async function analyzeScan(input:Omit<Parameters<typeof analyzeScanUnit>[0],'index'>){const results:AnalysisResult[]=new Array(input.scan.units.length);let next=0;await Promise.all(Array.from({length:Math.min(input.scan.units.every(u=>u.hosted)?6:2,results.length)},async()=>{while(next<results.length){const index=next++;results[index]=await analyzeScanUnit({...input,index});}}));return results;}
function withObjects(template:any,objects:any[]){if(template.components)return {...template,coverage:'partial',components:objects};if(template.pieces)return {...template,pieces:objects};const grouped=new Set((template.groups??[]).flatMap((g:any)=>g.tiles.map((t:any)=>t.id)));return {...template,coverage:'partial',groups:template.groups??[],loose:objects.filter(o=>!grouped.has(o.id))};}
/** Preserve independent raw receipts; only proven identities supplement the editable projection. */
export function projectScanResults(current:Session,pack:GamePack,scan:PinnedScanObservation,results:AnalysisResult[]):AnalysisResult{
 const order=new Map(scan.plan.units.map((u,i)=>[u.id,i]));
 // A durable unit can be redelivered, but a different result for the same claimed unit is not a second observation call.
 const deliveries=new Map<string,{signature:string;result:AnalysisResult}>();
 for(const result of results){const unitId=result.scanBundle?.units[0]?.unitId??result.observationReceipts?.[0]?.scanUnitId??'',signature=JSON.stringify(result);if(!order.has(unitId))throw Error('스캔 단위의 범위를 확인하세요.');const prior=deliveries.get(unitId);if(prior&&prior.signature!==signature)throw Error('같은 스캔 단위의 결과가 다릅니다.');if(!prior)deliveries.set(unitId,{signature,result});}
 results=[...deliveries.values()].map(x=>x.result);
 for(const r of results)for(const receipt of r.observationReceipts??[]){const u=scan.plan.units.find(u=>u.id===receipt.scanUnitId),scope=receipt.request.scope;if(!u||scope.partition!==scan.plan.scope.partition||scope.ownerId!==scan.plan.scope.ownerId||scope.captureEpoch!==scan.plan.scope.captureEpoch||receipt.request.definitionSHA!==scan.plan.definitionSHA||receipt.request.areaId!==u.areaId||JSON.stringify(receipt.request.readingTarget)!==JSON.stringify(u.readingTarget))throw Error('관측의 영역·소유자·촬영 범위가 다릅니다.');}

 results=structuredClone(results).sort((a,b)=>(order.get(a.scanBundle?.units[0]?.unitId??a.observationReceipts?.[0]?.scanUnitId??'')??999)-(order.get(b.scanBundle?.units[0]?.unitId??b.observationReceipts?.[0]?.scanUnitId??'')??999));
 const allReceipts=results.flatMap(r=>r.observationReceipts??[]),allUnits=results.flatMap(r=>r.scanBundle?.units??[]);
 results=results.filter(r=>r.scanBundle?.units.every(u=>u.state==='completed')!==false);
 if(!results.length)return {assertions:[],summary:'완료된 판독 없음 · 원문 보관',warnings:[],mode:'live',observationReceipts:allReceipts,scanBundle:{plan:scan.plan,units:allUnits,links:[]}};
 for(const r of results){
  const unitId=r.scanBundle?.units[0]?.unitId??r.observationReceipts?.[0]?.scanUnitId??'',refs=r.observationReceipts?.[0]?.componentRefs??{},ids=new Map<string,string>();
  for(const a of r.assertions)for(const [i,o]of observationObjects(a.value).entries()){
   const ref=Object.keys(refs).sort().find(ref=>refs[ref]===o.id)??a.field+':'+i;
   ids.set(o.id,'scan-'+createHash('sha256').update(JSON.stringify([scan.plan.id,unitId,ref])).digest('hex').slice(0,28));
  }
  for(const a of r.assertions)for(const o of observationObjects(a.value)){o.id=ids.get(o.id)!;if(o.attachedToId&&ids.has(o.attachedToId))o.attachedToId=ids.get(o.attachedToId);}
  for(const receipt of r.observationReceipts??[])for(const ref of Object.keys(receipt.componentRefs))receipt.componentRefs[ref]=ids.get(receipt.componentRefs[ref])??receipt.componentRefs[ref];
 }
 const receipts=results.flatMap(r=>r.observationReceipts??[]),entries=receipts.flatMap(r=>r.result.observations.map(o=>{const unit=scan.plan.units.find(u=>u.id===r.scanUnitId)!;return {unitId:unit.id,observationRef:o.ref,sourceSHA:unit.sourceEvidenceId+':'+unit.sourceSHA+':'+unit.areaId,componentId:o.componentId,bbox:mapObservationRegion(o,r.request,r.transforms),properties:o.properties,quantity:o.quantity,face:o.face,role:unit.role};})),links=linkScanObservations(entries),units=allUnits;
 const bundle:ScanBundleReceipt={plan:scan.plan,units,links};
 if(supportsGenericFusion(scan,results)){const projected=remapSpatialRelations(projectGenericFusion(current,pack,scan,results,bundle));projected.observationReceipts=allReceipts;return projected;}
 const incoming=results.flatMap(r=>r.assertions),objects=new Map<string,any>();for(const a of incoming)for(const o of observationObjects(a.value))objects.set(o.id,o);
 const refId=(unitId:string,ref:string)=>receipts.find(r=>r.scanUnitId===unitId)?.componentRefs[ref];
 const confirmed=new Set<string>();for(const r of receipts)for(const g of r.geometryCandidates){const id=r.componentRefs[g.observationRef],o=objects.get(id);if(o&&o.quantity===1&&o.location?.type==='unplaced'){o.location=structuredClone(g.locationCandidate);confirmed.add(id);}}
 const handled=new Set<string>(),assertions:Assertion[]=[];
 const fields=new Set([...incoming.map(a=>a.field),...receipts.flatMap(r=>{const d=(scan.units.find(u=>u.id===r.scanUnitId)?.hosted??scan.units.find(u=>u.id===r.scanUnitId)?.local)?.definition;return (d?requestAreas(r.request,d).flatMap(a=>a.fields):[]).filter(f=>pack.fields.some(x=>x.key===f&&(x.presentation==='scene'||x.type==='json'))).slice(0,1)??[];})]);
 for(let field of fields){if(pack.id==='catan-base'&&field==='components.observed')field='board.layout';if(assertions.some(a=>a.field===field))continue;
  const owner=scan.plan.scope.ownerId??undefined,baseline=current.assertions.filter(a=>a.field===field&&a.ownerId===owner&&a.status==='accepted').at(-1);
  const candidates=incoming.filter(a=>a.field===field||field==='board.layout'&&a.field==='components.observed');
  const template=baseline?.value??candidates[0]?.value??(pack.id==='catan-base'?{version:2,coverage:'partial',components:[]}:{version:'game-component-record-v1',pieces:[]});
  const base=structuredClone(observationObjects(baseline?.value)),accepted:any[]=[...base];
  for(const link of links){
   const ids=link.members.map(m=>refId(m.unitId,m.observationRef)).filter((x):x is string=>!!x),members=ids.map(id=>objects.get(id)).filter(Boolean);if(!members.length||members.every(o=>handled.has(o.id)))continue;
   if(!candidates.some(a=>observationObjects(a.value).some(o=>ids.includes(o.id))))continue;
   const targetUnit=link.members.map(m=>scan.plan.units.find(u=>u.id===m.unitId)!).find(u=>!!u.target),anchorMember=link.members.find(m=>scan.plan.units.find(u=>u.id===m.unitId)?.role==='anchor');
   let target=targetUnit?base.find(o=>o.id===targetUnit.target!.pieceId):undefined;
   if(targetUnit){const targetCount=entries.filter(e=>e.unitId===targetUnit.id).length;if(targetCount!==1){link.conflicts.push('multiple-target-observations');link.status='conflict';continue;}link.basis='user-target';}
   if(!target&&!targetUnit){const matches=base.filter(b=>members.some(o=>o.evidenceId&&o.evidenceId===b.evidenceId&&o.region&&b.region&&(o.kind??o.componentId)===(b.kind??b.componentId)&&observationOverlap(o.region,b.region)>=.75));if(matches.length===1){target=matches[0];link.basis='same-source-overlap';}}
   if(!target&&!targetUnit&&ids.some(id=>confirmed.has(id))){const a=members[0],claims=[...objects.values()].filter(o=>o.kind===a.kind&&o.location?.type===a.location?.type&&o.location?.id===a.location?.id),matches=base.filter(o=>o.kind===a.kind&&o.location?.type===a.location?.type&&o.location?.id===a.location?.id);if(claims.length===1&&matches.length===1){target=matches[0];link.basis='confirmed-frame';}}
   const ambiguous=link.conflicts.includes('ambiguous-source-correspondence');
   if(ambiguous&&!anchorMember)continue;
   if(target){const merged=mergeScanFacts(target,members);Object.assign(target,merged.value);link.conflicts.push(...merged.conflicts);link.targetPieceId=target.id;link.status=link.conflicts.length?'conflict':'linked';}
   else if(!baseline&&anchorMember){link.basis=ids.some(id=>confirmed.has(id))?'confirmed-frame':'model-proposal';const anchorId=refId(anchorMember.unitId,anchorMember.observationRef)!,o=structuredClone(objects.get(anchorId));const merged=mergeScanFacts(o,members);Object.assign(o,merged.value);link.conflicts.push(...merged.conflicts);accepted.push(o);link.targetPieceId=o.id;link.status=link.conflicts.length?'conflict':'linked';}
   else if(!targetUnit&&!ambiguous&&link.members.every(m=>scan.plan.units.find(u=>u.id===m.unitId)?.role==='crop')){
    const entry=entries.find(e=>e.unitId===link.members[0].unitId&&e.observationRef===link.members[0].observationRef)!,unit=scan.plan.units.find(u=>u.id===entry.unitId)!;
    const overlaps=entries.some(e=>!link.members.some(m=>m.unitId===e.unitId&&m.observationRef===e.observationRef)&&e.sourceSHA===entry.sourceSHA&&sameScanLayer(e.componentId,entry.componentId)&&(!e.bbox||!entry.bbox||observationOverlap(e.bbox,entry.bbox)>0));
    const sourceMatches=unit.sourceEvidenceId===scan.plan.anchorEvidenceId;
    const kind=members[0].kind??members[0].componentId;
    const ambiguousBaseline=base.some(b=>sameScanLayer(b.kind??b.componentId,kind)&&(!b.evidenceId||b.evidenceId!==unit.sourceEvidenceId||!b.region||!entry.bbox||observationOverlap(b.region,entry.bbox)>0));
    const sameSource=sourceMatches&&!ambiguousBaseline;
    if(entry.bbox&&!overlaps&&sameSource){const o=structuredClone(members[0]),merged=mergeScanFacts(o,members);Object.assign(o,merged.value);link.conflicts.push(...merged.conflicts);accepted.push(o);link.targetPieceId=o.id;link.status=link.conflicts.length?'conflict':'linked';link.basis='same-source-overlap';}
   }
   for(const id of ids)handled.add(id);
  }
  // Reconcile only new observed inline numerals with a unique physical disc; manual baseline remains untouched.
  for(const terrain of accepted.filter(o=>o.kind==='terrain'&&!base.some(b=>b.id===o.id)&&o.number!=null)){
   const discs=accepted.filter(o=>o.kind==='number-token'&&o.evidenceId===terrain.evidenceId&&o.region&&terrain.region&&o.region.x+o.region.width/2>=terrain.region.x&&o.region.x+o.region.width/2<=terrain.region.x+terrain.region.width&&o.region.y+o.region.height/2>=terrain.region.y&&o.region.y+o.region.height/2<=terrain.region.y+terrain.region.height);
   if(discs.length===1&&discs[0].number===terrain.number&&accepted.filter(t=>t.kind==='terrain'&&t.evidenceId===terrain.evidenceId&&t.region&&discs[0].region.x+discs[0].region.width/2>=t.region.x&&discs[0].region.x+discs[0].region.width/2<=t.region.x+t.region.width&&discs[0].region.y+discs[0].region.height/2>=t.region.y&&discs[0].region.y+discs[0].region.height/2<=t.region.y+t.region.height).length===1){discs[0].attachedToId=terrain.id;terrain.number=null;}
  }
  for(const link of links)link.conflicts=[...new Set(link.conflicts)].sort();
  // Exclusive-slot collisions are retained unplaced, independently of component order.
  const slots=new Map<string,any[]>();for(const o of accepted){if(base.some(b=>b.id===o.id))continue;if(!['hex','edge','vertex'].includes(o.location?.type)||!o.location.id)continue;const layer=['settlement','city'].includes(o.kind)?'building':o.kind,key=layer+':'+resolveSlotId(o.location.type,o.location.id);slots.set(key,[...(slots.get(key)??[]),o]);}
  for(const [key,items]of slots)if(items.length>1||base.some(b=>{const layer=['settlement','city'].includes(b.kind)?'building':b.kind;return key===layer+':'+resolveSlotId(b.location?.type,b.location?.id);}))for(const o of items)o.location={type:'unplaced',id:null};
  const value=withObjects(template,accepted);assertions.push({id:randomUUID(),field,ownerId:owner,status:'accepted',basis:'observation',value:value as Value,evidenceIds:[...new Set([...(baseline?.evidenceIds??[]),...scan.plan.units.flatMap(u=>[u.evidenceId,u.sourceEvidenceId])])],updatedAt:new Date().toISOString(),observationReceipts:[...(baseline?.observationReceipts??[]),...receipts]});
 }
 // Preserve every unresolved source claim close to the board, without inventing a physical representative.
 const key=(m:{unitId:string;observationRef:string})=>JSON.stringify([m.unitId,m.observationRef]);
 const byMember=new Map(entries.map(e=>[key(e),e])),linkByMember=new Map(links.flatMap(l=>l.members.map(m=>[key(m),l] as const)));
 const editable=assertions.flatMap(a=>observationObjects(a.value));
 bundle.unresolvedGroups=possibleScanRelations(entries).flatMap(relation=>{
  const members=relation.filter(m=>{const l=linkByMember.get(key(m));return !l?.targetPieceId||l.status==='conflict';}).sort((a,b)=>(order.get(a.unitId)!-order.get(b.unitId)!)||a.observationRef.localeCompare(b.observationRef));
  if(!members.length)return [];
  const missing=relation.some(m=>!byMember.get(key(m))?.bbox);
  const reason=missing?'missing-source-box' as const:relation.length>1?'possible-same-object' as const:'unregistered-view' as const;
  const related=new Set(relation.flatMap(m=>{const id=linkByMember.get(key(m))?.targetPieceId;return id?[id]:[];}));
  for(const m of members){const e=byMember.get(key(m))!,u=scan.plan.units.find(u=>u.id===m.unitId)!;for(const o of editable)if(sameScanLayer(o.kind??o.componentId,e.componentId)&&(!o.evidenceId||o.evidenceId!==u.sourceEvidenceId||!e.bbox||!o.region||observationOverlap(e.bbox,o.region)>0))related.add(o.id);}
  const relatedPieceIds=[...related].sort(),id='scan-group-'+createHash('sha256').update(JSON.stringify([scan.plan.id,reason,members])).digest('hex').slice(0,28);
  return [{id,reason,members,relatedPieceIds}];
 });
 for(const r of receipts){r.scanBundle=bundle;for(const ref of Object.keys(r.componentRefs)){const link=links.find(l=>l.members.some(m=>m.unitId===r.scanUnitId&&m.observationRef===ref));if(link?.targetPieceId)r.componentRefs[ref]=link.targetPieceId;else delete r.componentRefs[ref];}}
 return {assertions,summary:`사진 ${units.filter(u=>u.state==='completed').length}/${units.length}장 읽음 · 미연결·충돌은 원사진과 함께 보관합니다.`,mode:'live',warnings:results.flatMap(r=>r.warnings),observationReceipts:allReceipts,scanBundle:bundle};
}

function mergeScanFacts(base:any,members:any[]){
 const claims=new Map<string,unknown[]>(),skip=new Set(['id','evidenceId','evidenceIds','region','location','ownerId','attachedToId','anchor','sources','schema','version','componentId','kind']);
 const visit=(o:any,prefix='')=>{for(const [k,v]of Object.entries(o)){if((skip.has(k)&&!(k==='kind'&&prefix))||v==null||v===''||v==='unknown')continue;const key=prefix+k;if(typeof v==='object'&&!Array.isArray(v))visit(v,key+'.');else claims.set(key,[...(claims.get(key)??[]),v]);}};members.forEach(o=>visit(o));
 const conflicts=[...claims].filter(([,vs])=>new Set(vs.map(v=>JSON.stringify(v))).size>1).map(([key])=>key),safe=structuredClone(members);
 for(const m of safe)for(const key of conflicts){let parent=m;const parts=key.split('.');for(const part of parts.slice(0,-1))parent=parent?.[part];if(parent)parent[parts.at(-1)!]=null;}
 let value=structuredClone(base);for(const m of safe){const r=mergeObservedFacts(value,m);value=r.value;conflicts.push(...r.conflicts);}return {value,conflicts:[...new Set(conflicts)].sort()};
}
