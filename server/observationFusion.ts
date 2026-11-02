import {createHash,randomUUID} from 'node:crypto';
import type {AnalysisResult,Assertion,GamePack,Session,Value} from '../shared/types';
import type {ObservationBox,ObservationReceipt,PhotoDefinition,PhysicalUnitClaim} from '../shared/lightweightRecognition';
import type {ScanBundleReceipt,ScanFusion,ScanMember} from '../shared/scanObservation';
import {observationOverlap} from '../shared/scanObservation';
import {mapObservationRegion,validCropTransform} from '../shared/photoGeometry';
import {PHOTO_OWNER,PHOTO_PUBLIC} from '../shared/recognition';
import type {PinnedScanObservation} from './scanObservation';
const canonical=(v:any):string=>v===undefined?'undefined':JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const digest=(v:any)=>createHash('sha256').update(canonical(v)).digest('hex');
const known=(v:any)=>v!==null&&v!==undefined;
const key=(m:ScanMember)=>JSON.stringify([m.unitId,m.observationRef]);
const area=(b:ObservationBox)=>b.width*b.height;
const inside=(x:number,y:number,b:ObservationBox)=>x>=b.x-1e-9&&x<=b.x+b.width+1e-9&&y>=b.y-1e-9&&y<=b.y+b.height+1e-9;
const overlaps=(a:ObservationBox,b:ObservationBox)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+1e-9&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+1e-9;
const contains=(a:ObservationBox,b:ObservationBox)=>inside(b.x,b.y,a)&&inside(b.x+b.width,b.y+b.height,a);
type Entry={member:ScanMember;index:number;source:string|null;field:string;kind:string|null;box:ObservationBox|null;roi:ObservationBox;density:number;role:string;identityQuantity:number|null;unit:PhysicalUnitClaim;values:Record<string,unknown>;piece:any;types:Record<string,string>};
const compatible=(a:Entry,b:Entry)=>!!a.source&&a.source===b.source&&a.field===b.field&&a.kind===b.kind;
const individual=(e:Entry)=>e.unit!=='group'&&(e.identityQuantity===1||e.unit==='single'&&e.identityQuantity===null);
const aggregate=(e:Entry)=>e.unit==='group'||e.identityQuantity!==null&&e.identityQuantity>1;
// A crop-edge box may be only a fragment: never use it to establish whole-object identity/refinement.
const completeBox=(e:Entry)=>!!e.box&&contains(e.roi,e.box)&&(e.role!=='crop'||e.box.x>e.roi.x+1e-7&&e.box.y>e.roi.y+1e-7&&e.box.x+e.box.width<e.roi.x+e.roi.width-1e-7&&e.box.y+e.box.height<e.roi.y+e.roi.height-1e-7);
const identity=(a:Entry,b:Entry)=>a.member.unitId!==b.member.unitId&&compatible(a,b)&&individual(a)&&individual(b)&&!!a.box&&!!b.box&&inside(a.box.x+a.box.width/2,a.box.y+a.box.height/2,b.box)&&inside(b.box.x+b.box.width/2,b.box.y+b.box.height/2,a.box);
// Reuse the existing conservative scan overlap criterion, without treating a visible pile as one individual.
const groupSurface=(a:Entry,b:Entry)=>a.member.unitId!==b.member.unitId&&compatible(a,b)&&aggregate(a)&&aggregate(b)&&completeBox(a)&&completeBox(b)&&observationOverlap(a.box!,b.box!)>=.75;
const singleFootprint=(a:Entry,b:Entry)=>a.member.unitId!==b.member.unitId&&!!a.source&&a.source===b.source&&a.field===b.field&&individual(a)&&individual(b)&&completeBox(a)&&completeBox(b)?observationOverlap(a.box!,b.box!):0;
const focused=(a:Entry,b:Entry)=>!!a.box&&!!b.box&&a.source===b.source&&contains(a.roi,a.box)&&contains(b.roi,b.box)&&a.density>=b.density-1e-8&&area(a.roi)<area(b.roi)-1e-9;
const valuePaths=(p:any)=>Object.fromEntries([...Object.entries(p).filter(([k])=>!['id','readout'].includes(k)),...Object.entries(p.readout?.values??{}).map(([k,v])=>['readout.values.'+k,v]),['$exists',true]]);
/** Only typed generic records use this slice. Native scene assembly/placement retains its existing path. */
export function supportsGenericFusion(scan:PinnedScanObservation,results:AnalysisResult[]){return scan.units.every(u=>(u.hosted??u.local)?.definition.nativeBridge===null)&&results.every(r=>r.assertions.every(a=>(a.value as any)?.version==='game-component-record-v1'&&(a.value as any).pieces.every((p:any)=>p.readout?.values)));}
export function projectGenericFusion(current:Session,pack:GamePack,scan:PinnedScanObservation,results:AnalysisResult[],bundle:ScanBundleReceipt):AnalysisResult{
 const owner=scan.plan.scope.ownerId??undefined,receipts=results.flatMap(r=>r.observationReceipts??[]),incoming=results.flatMap(r=>r.assertions),entries:Entry[]=[],members=new Map<string,Entry>();
 const sourceKey=(u:any)=>canonical([u.sourceEvidenceId,u.sourceSHA,u.areaId,scan.plan.scope,scan.plan.definitionSHA]);
 function entry(receipt:ObservationReceipt,o:ObservationReceipt['result']['observations'][number],u:any,index:number,field:string,piece:any,definition?:PhotoDefinition):Entry{
  const image=receipt.request.images[o.imageIndex],tr=receipt.transforms.find(t=>t.transformId===image?.transformId);
  if(receipt.sourceImageSHA&&receipt.sourceImageSHA!==u.sourceSHA)throw Error('관측 원본 SHA가 다릅니다.');
  const crop=tr?.kind==='crop'&&validCropTransform(tr)&&tr.sourceSHA===u.sourceSHA&&tr.inputSHA===u.inputSHA;
  const registered=!!image&&image.evidenceId===u.sourceEvidenceId&&receipt.sourceImageSHA===u.sourceSHA&&(!tr||crop);
  const roi=crop?{x:tr.inverseMatrix[2],y:tr.inverseMatrix[5],width:tr.inverseMatrix[0],height:tr.inverseMatrix[4]}:{x:0,y:0,width:1,height:1},dimensions=tr?.sourceDimensions??image;
  const density=image&&dimensions?Math.min(image.width/(dimensions.width*roi.width),image.height/(dimensions.height*roi.height)):0;
  return {member:{unitId:receipt.scanUnitId!,observationRef:o.ref},index,source:registered?sourceKey(u):null,field,kind:o.componentId,box:mapObservationRegion(o,receipt.request,receipt.transforms),roi,density,role:u.role,identityQuantity:o.quantity,unit:receipt.hostedWire?.physicalUnits?.[o.ref]??'unknown',values:Object.fromEntries(Object.entries(o.properties).map(([id,p])=>[id,p.state==='observed'?p.value:null])),piece:structuredClone(piece),types:Object.fromEntries((definition?.components.find(c=>c.id===o.componentId)?.properties??[]).map(p=>[p.id,p.type]))};
 }
 for(const receipt of receipts){const index=scan.plan.units.findIndex(u=>u.id===receipt.scanUnitId),u=scan.plan.units[index],definition=(scan.units[index].hosted??scan.units[index].local)!.definition;
  for(const o of receipt.result.observations){const a=incoming.find(a=>(a.value as any).pieces.some((p:any)=>p.id===receipt.componentRefs[o.ref])),piece=(a?.value as any)?.pieces.find((p:any)=>p.id===receipt.componentRefs[o.ref]);if(!a||!piece)continue;const e=entry(receipt,o,u,index,a.field,piece,definition);entries.push(e);members.set(key(e.member),e);}
 }
 entries.sort((a,b)=>a.index-b.index||a.member.observationRef.localeCompare(b.member.observationRef));
 const adjacency=entries.map(()=>new Set<number>());for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(identity(entries[i],entries[j])||groupSurface(entries[i],entries[j])){adjacency[i].add(j);adjacency[j].add(i);}
 const seen=new Set<number>(),clusters:Entry[][]=[],ambiguous=new Set<string>();
 for(let i=0;i<entries.length;i++)if(!seen.has(i)){const group:number[]=[],stack=[i];while(stack.length){const j=stack.pop()!;if(seen.has(j))continue;seen.add(j);group.push(j);stack.push(...adjacency[j]);}const values=group.map(j=>entries[j]).sort((a,b)=>a.index-b.index||key(a.member).localeCompare(key(b.member))),bad=values.some(e=>e.role==='crop'&&!completeBox(e))||new Set(values.map(e=>e.member.unitId)).size!==values.length||group.some(j=>group.some(k=>j!==k&&!adjacency[j].has(k)));if(bad)for(const e of values){ambiguous.add(key(e.member));clusters.push([e]);}else clusters.push(values);}
 const fusion:ScanFusion={version:'scan-fusion-v1',decisions:[],refinements:[],projectionDigests:[]};bundle.fusion=fusion;bundle.links=[];bundle.unresolvedGroups=[];
 const resultFields=new Set(incoming.map(a=>a.field));if(!resultFields.size)resultFields.add(owner?PHOTO_OWNER:PHOTO_PUBLIC);
 const output:Assertion[]=[];
 for(const field of resultFields){
  const baseline=current.assertions.filter(a=>a.field===field&&a.ownerId===owner&&a.status==='accepted').at(-1),base:any[]=structuredClone((baseline?.value as any)?.pieces??[]),baseById=new Map(base.map(p=>[p.id,p])),oldReceipts=baseline?.observationReceipts??[];
  const matchingBundle=(r:ObservationReceipt)=>r.scanBundle?.plan.definitionSHA===scan.plan.definitionSHA&&canonical(r.request.scope)===canonical(scan.plan.scope)&&scan.plan.units.some(u=>u.areaId===r.request.areaId);
  const priorFusion=oldReceipts.filter(matchingBundle).map(r=>r.scanBundle?.fusion).filter((f):f is ScanFusion=>!!f).at(-1),previousDigests=new Map((priorFusion?.projectionDigests??[]).map(d=>[d.pieceId+'|'+d.fieldPath,d.digest]));
  const history=oldReceipts.filter(matchingBundle),retirements=[...new Map(history.flatMap(r=>r.scanBundle?.fusion?.refinements??[]).map(r=>[key(r.aggregateMember),r])).values()],retiredParents:Entry[]=[];
  for(const retirement of retirements){
   if(!fusion.refinements.some(r=>key(r.aggregateMember)===key(retirement.aggregateMember)))fusion.refinements.push(structuredClone(retirement));
   const r=history.find(r=>r.scanUnitId===retirement.aggregateMember.unitId),o=r?.result.observations.find(o=>o.ref===retirement.aggregateMember.observationRef),u=r?.scanBundle?.plan.units.find(u=>u.id===r.scanUnitId);
   if(r&&o&&u){const p={id:r.componentRefs[o.ref]??'retired-'+digest(retirement.aggregateMember),componentId:o.componentId,quantity:o.quantity,readout:{values:{},sources:{}}};retiredParents.push(entry(r,o,u,-1,field,p));}
  }
  const protectedPaths=new Set((priorFusion?.decisions??[]).filter(d=>d.basis==='user-protected').map(d=>d.pieceId+'|'+d.fieldPath));
  const locked=(p:any,path:string)=>protectedPaths.has(p.id+'|'+path)||!previousDigests.has(p.id+'|'+path)||previousDigests.get(p.id+'|'+path)!==digest(valuePaths(p)[path])||path.startsWith('readout.values.')&&p.readout?.sources?.[path.slice(15)]==='user'||baseline?.basis==='user'&&valuePaths(p)[path]===null;
  const oldEntries:Entry[]=[];
  for(const r of oldReceipts.filter(matchingBundle)){const plan=r.scanBundle?.plan,u=plan?.units.find(u=>u.id===r.scanUnitId);if(!u)continue;for(const o of r.result.observations){const id=r.componentRefs[o.ref];if(!id)continue;const p=baseById.get(id)??{id,componentId:o.componentId,quantity:o.quantity,readout:{values:{},sources:{}}};const e=entry(r,o,u,-1,field,p);oldEntries.push(e);}}
  // Old metadata is conservative; keep deletion witnesses even when an item no longer exists.
  const deleted=new Set((priorFusion?.projectionDigests??[]).filter(d=>d.fieldPath==='$exists'&&!baseById.has(d.pieceId)).map(d=>d.pieceId));
  const available=clusters.filter(es=>es[0].field===field),matching=new Map<Entry[],string>(),contenders=new Map<string,Entry[][]>();
  for(const es of available){const target=es.map(e=>scan.plan.units.find(u=>u.id===e.member.unitId)?.target).find(Boolean);let ids:string[]=[];
   if(target&&baseById.has(target.pieceId)&&entries.filter(e=>e.member.unitId===es[0].member.unitId).length===1)ids=[target.pieceId];
   else ids=[...new Set(oldEntries.filter(old=>es.some(e=>completeBox(e)&&completeBox(old)&&identity(e,old)||groupSurface(e,old))).map(e=>e.piece.id))];
   if(ids.length===1){matching.set(es,ids[0]);contenders.set(ids[0],[...(contenders.get(ids[0])??[]),es]);}
  }
  for(const [es,id]of matching)if(contenders.get(id)!.length!==1)matching.delete(es);
  const manualAggregates=oldEntries.filter(e=>aggregate(e)&&(deleted.has(e.piece.id)||baseById.has(e.piece.id)&&Object.keys(valuePaths(e.piece)).some(path=>locked(e.piece,path))));
  const refined=new Set<string>();
  const aggregateCandidates=[...entries.filter(e=>e.field===field&&aggregate(e)),...oldEntries.filter(e=>aggregate(e)&&baseById.has(e.piece.id)&&!available.some(es=>matching.get(es)===e.piece.id))];
  const refinedBaseIds=new Set<string>(),ambiguousChildren=new Set<string>();
  const aggregateKey=(e:Entry)=>{const cluster=available.find(es=>es.includes(e));return cluster?(matching.get(cluster)??key(cluster[0].member)):e.piece.id;};
  const containsChild=(a:Entry,e:Entry)=>a.member.unitId!==e.member.unitId&&compatible(a,e)&&!!a.box&&!!e.box&&completeBox(e)&&contains(a.box,e.box);
  for(const child of entries.filter(e=>e.role==='crop'&&individual(e)&&completeBox(e)))if(new Set(aggregateCandidates.filter(a=>a.member.unitId!==child.member.unitId&&compatible(a,child)&&a.box&&child.box&&overlaps(a.box,child.box)).map(aggregateKey)).size>1)ambiguousChildren.add(key(child.member));
  const processedParents=new Set<string>();
  for(const aggregate of aggregateCandidates.filter(e=>e.box&&e.source&&e.source===sourceKey(scan.plan.units[0]))){
   const parentKey=aggregateKey(aggregate);if(processedParents.has(parentKey))continue;processedParents.add(parentKey);
   const aggCluster=available.find(es=>es.includes(aggregate)),baseId=aggCluster?matching.get(aggCluster):aggregate.piece.id,bp=baseId?baseById.get(baseId):null;if(baseId&&refinedBaseIds.has(baseId))continue;if(baseId&&deleted.has(baseId)||bp&&Object.keys(valuePaths(bp)).some(path=>locked(bp,path)))continue;
   const byUnit=new Map<string,Entry[]>();for(const child of entries)if(child.field===field&&child.role==='crop'&&child.member.unitId!==aggregate.member.unitId&&compatible(child,aggregate)&&individual(child)&&completeBox(child)&&child.box&&contains(aggregate.box!,child.box)&&!ambiguous.has(key(child.member))&&!ambiguousChildren.has(key(child.member)))byUnit.set(child.member.unitId,[...(byUnit.get(child.member.unitId)??[]),child]);
   const choice=[...byUnit.values()].sort((a,b)=>area(a[0].roi)-area(b[0].roi)||a[0].index-b[0].index)[0];if(choice){if(baseId){baseById.delete(baseId);refinedBaseIds.add(baseId);}for(const parent of aggCluster??[aggregate]){refined.add(key(parent.member));fusion.refinements.push({aggregateMember:parent.member,childMembers:choice.map(e=>e.member),relation:'refines-partially-not-identity',exhaustive:false,residualQuantity:null,cropCoversAggregateBox:contains(choice[0].roi,parent.box!)});}}
  }
  // Refinement keeps the parent in immutable receipts, not in the editable identity competition.
  const editableAggregates=aggregateCandidates.filter(a=>!refined.has(key(a.member))&&!refinedBaseIds.has(aggregateKey(a)));
  const accepted=[...baseById.values()],used=new Set<string>();
  const defer=(es:Entry[],related:string[]=[])=>{const missing=es.some(e=>!e.box),id='scan-group-'+digest([scan.plan.id,es.map(e=>e.member)]).slice(0,28);bundle.unresolvedGroups!.push({id,reason:missing?'missing-source-box':es.some(e=>!e.source||e.source!==sourceKey(scan.plan.units[0]))?'unregistered-view':'possible-same-object',members:es.map(e=>e.member),relatedPieceIds:related.sort()});bundle.links.push({members:es.map(e=>e.member),status:'unlinked',basis:'unlinked',conflicts:[],targetPieceId:null});};
  for(const es of available){const representative=es.find(e=>e.role==='anchor')??es[0];if(refined.has(key(representative.member)))continue;const id=matching.get(es),existing=id?baseById.get(id):null;
   if(es.some(e=>ambiguousChildren.has(key(e.member))||e.role==='crop'&&!completeBox(e))){defer(es);continue;}
   if(id&&deleted.has(id)){defer(es,[id]);fusion.decisions.push({pieceId:id,fieldPath:'$exists',chosenMember:null,basis:'user-protected',alternativeMembers:es.map(e=>e.member),conflict:true});continue;}
   // Retired source groups may be observed again; they remain evidence rather than an additive inventory item.
   const retiredMatches=es.every(aggregate)?new Set(retiredParents.filter(parent=>es.some(e=>groupSurface(e,parent))).map(parent=>key(parent.member))):new Set<string>();
   if(!existing&&retiredMatches.size){
    const related=retirements.filter(r=>retiredMatches.has(key(r.aggregateMember))).flatMap(r=>r.childMembers.flatMap(m=>{const receipt=history.find(r=>r.scanUnitId===m.unitId),id=receipt?.componentRefs[m.observationRef];return id&&baseById.has(id)?[id]:[];}));defer(es,[...new Set(related)]);continue;
   }
   const protectedAggregate=manualAggregates.find(a=>es.some(e=>compatible(a,e)&&!!a.box&&!!e.box&&inside(e.box.x+e.box.width/2,e.box.y+e.box.height/2,a.box)));if(protectedAggregate&&!existing){defer(es,[protectedAggregate.piece.id]);continue;}
   const isRoot=representative.source===sourceKey(scan.plan.units[0]),isAnchor=representative.role==='anchor';
   const competition=ambiguous.has(key(representative.member))&&!isAnchor||!existing&&[...baseById.values()].some(p=>p.componentId===representative.kind&&!oldEntries.some(e=>e.piece.id===p.id&&e.source===representative.source&&e.box&&representative.box&&!identity(e,representative)&&!contains(e.box,representative.box)));
   if(!existing&&(!isRoot&&!isAnchor||!representative.box&&!isAnchor||competition)){defer(es);continue;}
   // Different kinds never establish identity. A complete, nearly identical footprint only raises a local conflict.
   // Large boards beneath pieces and neighbors do not meet this source-space overlap criterion.
   if(!existing&&!isAnchor){
    const pool=[...entries,...oldEntries],candidates=pool.filter(e=>e.kind!==representative.kind&&singleFootprint(representative,e)>=.75);
    if(candidates.length){
     const peers=(e:Entry)=>pool.filter(p=>singleFootprint(e,p)>=.75),unique=candidates.length===1&&peers(representative).length===1&&peers(candidates[0]).length===1;
     defer(es,[...new Set(candidates.map(e=>e.piece.id))]);
     if(unique){const link=bundle.links.at(-1)!;link.status='conflict';link.conflicts.push('kind');}
     continue;
    }
   }
   const partialParent=editableAggregates.find(a=>a.member.unitId!==representative.member.unitId&&compatible(a,representative)&&a.box&&representative.box&&overlaps(a.box,representative.box)&&!containsChild(a,representative));
   if(!existing&&!isAnchor&&partialParent){defer(es,[partialParent.piece.id]);continue;}
   // An unknown-count, unknown-unit parent is not a group claim and cannot be split or counted alongside overlapping detail.
   const unknownParent=[...entries,...oldEntries].find(e=>e.member.unitId!==representative.member.unitId&&e.identityQuantity===null&&e.unit==='unknown'&&compatible(e,representative)&&(!e.box||!representative.box||inside(representative.box.x+representative.box.width/2,representative.box.y+representative.box.height/2,e.box)));
   if(!existing&&!isAnchor&&unknownParent){defer(es,[unknownParent.piece.id]);continue;}
   // Boxless same-kind anchors cannot establish that a crop is a separate physical object.
   if(!existing&&!isAnchor&&entries.some(e=>e.role==='anchor'&&compatible(e,representative)&&!e.box&&e.piece.quantity===1)){defer(es,accepted.filter(p=>p.componentId===representative.kind).map(p=>p.id));continue;}
   const p=existing??structuredClone(representative.piece);if(used.has(p.id)){defer(es,[p.id]);continue;}used.add(p.id);
   const priorClaims=existing?oldEntries.filter(e=>e.piece.id===p.id):[],claims=[...new Map([...priorClaims,...es].map(e=>[key(e.member),e])).values()];
   if(es.every(aggregate)&&(!existing||!locked(p,'quantity'))){const observed=claims.filter(e=>e.identityQuantity!==null);if(new Set(observed.map(e=>e.identityQuantity)).size>1){const chosen=observed.find(e=>e.identityQuantity===p.quantity);fusion.decisions.push({pieceId:p.id,fieldPath:'quantity',chosenMember:chosen?.member??null,basis:'unresolved',alternativeMembers:observed.filter(e=>e!==chosen).map(e=>e.member),conflict:true});}}
   for(const property of [...new Set(claims.flatMap(e=>Object.keys(e.values)))].sort()){
    const path='readout.values.'+property,currentValue=p.readout.values[property],observed=claims.filter(e=>known(e.values[property])),conflict=new Set([...observed.map(e=>canonical(e.values[property])),...(known(currentValue)?[canonical(currentValue)]:[])]).size>1;
    if(existing&&locked(p,path)){fusion.decisions.push({pieceId:p.id,fieldPath:path,chosenMember:null,basis:'user-protected',alternativeMembers:es.map(e=>e.member),conflict});continue;}
    if(!observed.length)continue;const previous=priorFusion?.decisions.find(d=>d.pieceId===p.id&&d.fieldPath===path)?.chosenMember,old=priorClaims.find(e=>previous&&key(e.member)===key(previous))??priorClaims.find(e=>canonical(e.values[property])===canonical(currentValue));const dominant=observed.filter(e=>observed.every(other=>e===other||focused(e,other))),typed=['integer','boolean','enum'].includes(representative.types[property]),chosen=typed&&dominant.length===1?dominant[0]:existing?observed.find(e=>e===old)??observed[0]:observed.find(e=>e===representative)??observed[0];
    if(known(chosen.values[property])){p.readout.values[property]=structuredClone(chosen.values[property]);p.readout.sources[property]='observation';}
    fusion.decisions.push({pieceId:p.id,fieldPath:path,chosenMember:chosen.member,basis:conflict?typed&&dominant.length===1&&chosen===dominant[0]?'focused-provisional':'unresolved':'observed',alternativeMembers:observed.filter(e=>e!==chosen).map(e=>e.member),conflict});
   }
   if(existing)for(const path of Object.keys(valuePaths(p)))if(!path.startsWith('readout.values.')&&locked(p,path))fusion.decisions.push({pieceId:p.id,fieldPath:path,chosenMember:null,basis:'user-protected',alternativeMembers:es.map(e=>e.member),conflict:es.some(e=>path==='quantity'?known(e.identityQuantity)&&known(p.quantity)&&e.identityQuantity!==p.quantity:canonical(valuePaths(e.piece)[path])!==canonical(valuePaths(p)[path]))});
   if(!existing)accepted.push(p);for(const e of es){const r=receipts.find(r=>r.scanUnitId===e.member.unitId)!;r.componentRefs[e.member.observationRef]=p.id;}
   bundle.links.push({members:es.map(e=>e.member),status:'linked',basis:es.length>1?'same-source-overlap':'model-proposal',conflicts:fusion.decisions.filter(d=>d.pieceId===p.id&&d.conflict).map(d=>d.fieldPath),targetPieceId:p.id,...(es.length>1&&es.every(aggregate)?{relation:'same-visible-group-surface' as const}:{})});
  }
  for(const p of accepted)for(const [fieldPath,value]of Object.entries(valuePaths(p)))fusion.projectionDigests.push({pieceId:p.id,fieldPath,digest:digest(value)});
  for(const d of priorFusion?.projectionDigests??[])if(deleted.has(d.pieceId))fusion.projectionDigests.push(d);
  for(const d of priorFusion?.decisions??[])if(deleted.has(d.pieceId)&&d.basis==='user-protected'&&!fusion.decisions.some(x=>x.pieceId===d.pieceId&&x.fieldPath===d.fieldPath))fusion.decisions.push(d);
  output.push({id:randomUUID(),field,ownerId:owner,basis:'observation',status:'accepted',value:{version:'game-component-record-v1',pieces:accepted}as unknown as Value,evidenceIds:[...new Set([...(baseline?.evidenceIds??[]),...scan.plan.units.flatMap(u=>[u.evidenceId,u.sourceEvidenceId])])],updatedAt:new Date().toISOString(),observationReceipts:[...oldReceipts,...receipts]});
 }
  const linked=new Set(bundle.links.filter(l=>l.targetPieceId).flatMap(l=>l.members.map(key)));for(const r of receipts)for(const ref of Object.keys(r.componentRefs))if(!linked.has(key({unitId:r.scanUnitId!,observationRef:ref})))delete r.componentRefs[ref];
 fusion.decisions.sort((a,b)=>a.pieceId.localeCompare(b.pieceId)||a.fieldPath.localeCompare(b.fieldPath));fusion.projectionDigests.sort((a,b)=>a.pieceId.localeCompare(b.pieceId)||a.fieldPath.localeCompare(b.fieldPath));
 for(const r of receipts)r.scanBundle=bundle;
 return {assertions:output,mode:'live',summary:`사진 ${bundle.units.filter(u=>u.state==='completed').length}/${scan.plan.units.length}장 읽음 · 부분사진의 임시 선택·다른 관측·미확정은 원사진과 함께 보관합니다.`,warnings:results.flatMap(r=>r.warnings),observationReceipts:receipts,scanBundle:bundle};
}
