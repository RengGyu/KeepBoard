import type {ObservationBox,ObservationProperty,ObservationScope} from './lightweightRecognition';
export interface ScanTarget {assertionId:string;pieceId:string}
export interface ScanPlan {version:'scan-observation-plan-v1';id:string;gameId:string;definitionSHA:string;scope:ObservationScope;anchorEvidenceId:string;units:{id:string;evidenceId:string;sourceEvidenceId:string;sourceSHA:string;inputSHA:string;areaId:string;readingTarget?:import('./restoration').ReadingTarget;role:'anchor'|'crop'|'detail';target:ScanTarget|null}[]}
export interface ScanUnitStatus {unitId:string;state:'completed'|'failed'|'interrupted';error?:string;observationCount:number;elapsedMs?:number}
export interface ScanMember {unitId:string;observationRef:string}
export interface ObservationLink {members:ScanMember[];status:'linked'|'conflict'|'unlinked';basis:'same-source-overlap'|'confirmed-frame'|'model-proposal'|'user-target'|'unlinked';conflicts:string[];targetPieceId:string|null;relation?:'same-visible-group-surface'}
export interface UnresolvedScanGroup {id:string;reason:'possible-same-object'|'unregistered-view'|'missing-source-box';members:ScanMember[];relatedPieceIds:string[]}
export interface ScanFusion {
 version:'scan-fusion-v1';
 decisions:{pieceId:string;fieldPath:string;chosenMember:ScanMember|null;basis:'observed'|'focused-provisional'|'user-protected'|'unresolved';alternativeMembers:ScanMember[];conflict:boolean}[];
 refinements:{aggregateMember:ScanMember;childMembers:ScanMember[];relation:'refines-partially-not-identity';exhaustive:false;residualQuantity:null;cropCoversAggregateBox:boolean}[];
 projectionDigests:{pieceId:string;fieldPath:string;digest:string}[];
}
export interface ScanBundleReceipt {plan:ScanPlan;units:ScanUnitStatus[];links:ObservationLink[];unresolvedGroups?:UnresolvedScanGroup[];fusion?:ScanFusion}
export interface ScanObservation extends ScanMember {sourceSHA:string;componentId:string|null;bbox:ObservationBox|null;properties:Record<string,ObservationProperty>;role:ScanPlan['units'][number]['role'];quantity?:number|null;face?:string}
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function sameScanLayer(a:string|null|undefined,b:string|null|undefined){return a===b||[a,b].every(k=>['settlement','city'].includes(k??''));}
export function observationOverlap(a:ObservationBox,b:ObservationBox){const w=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)),h=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)),i=w*h;return i/(a.width*a.height+b.width*b.height-i);}
/** Conservative source-space identity only. Neither equal values nor equal proposed slots establish identity. */
export function linkScanObservations(items:ScanObservation[]):ObservationLink[]{
 const neighbors=items.map(()=>new Set<number>());
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];if(a.unitId===b.unitId||a.sourceSHA!==b.sourceSHA||!a.bbox||!b.bbox)continue;
  const layerConflict=a.componentId!==b.componentId&&[a.componentId,b.componentId].every(k=>['settlement','city'].includes(k??''));
  if(a.componentId!==b.componentId&&!layerConflict)continue;
  // High overlap is deliberately conservative; seam fragments can remain unlinked rather than joining neighbors.
  if(observationOverlap(a.bbox,b.bbox)<.75)continue;
  neighbors[i].add(j);neighbors[j].add(i);
 }
 const seen=new Set<number>(),links:ObservationLink[]=[];
 for(let i=0;i<items.length;i++)if(!seen.has(i)){
  const group:number[]=[],pending=[i];while(pending.length){const k=pending.pop()!;if(seen.has(k))continue;seen.add(k);group.push(k);pending.push(...neighbors[k]);}
  const values=group.map(k=>items[k]),conflicts:string[]=[];
  if(new Set(values.map(x=>x.unitId)).size!==values.length||group.some(k=>group.some(j=>j!==k&&!neighbors[k].has(j))))conflicts.push('ambiguous-source-correspondence');
  if(new Set(values.map(x=>x.componentId)).size>1)conflicts.push('kind');
  for(const key of new Set(values.flatMap(x=>Object.keys(x.properties)))){const observed=values.map(x=>x.properties[key]).filter((v):v is Extract<ObservationProperty,{state:'observed'}>=>v?.state==='observed');if(observed.some(x=>!equal(x.value,observed[0].value)))conflicts.push(key);}
  for(const key of ['quantity','face'] as const){const known=values.map(x=>x[key]).filter(x=>x!==undefined&&x!==null&&x!=='unknown');if(known.some(x=>!equal(x,known[0])))conflicts.push(key);}
  if(conflicts.includes('ambiguous-source-correspondence')){for(const v of values)links.push({members:[{unitId:v.unitId,observationRef:v.observationRef}],status:'conflict',basis:'unlinked',conflicts:[...conflicts].sort(),targetPieceId:null});continue;}
  links.push({members:values.map(({unitId,observationRef})=>({unitId,observationRef})),status:conflicts.length?'conflict':values.length>1?'linked':'unlinked',basis:values.length>1?'same-source-overlap':'unlinked',conflicts,targetPieceId:null});
 }
 return links;
}
/** Possible source overlap is a review relation, NEVER physical identity or an inventory count. */
export function possibleScanRelations(items:ScanObservation[]):ScanMember[][]{
 const neighbors=items.map(()=>new Set<number>());
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];
  // An absent box prevents excluding identity; this relation is not a license to merge.
  if(a.sourceSHA===b.sourceSHA&&sameScanLayer(a.componentId,b.componentId)&&(!a.bbox||!b.bbox||observationOverlap(a.bbox,b.bbox)>0)){neighbors[i].add(j);neighbors[j].add(i);}
 }
 const seen=new Set<number>(),groups:ScanMember[][]=[];
 for(let i=0;i<items.length;i++)if(!seen.has(i)){
  const group:ScanMember[]=[],queue=[i];while(queue.length){const n=queue.pop()!;if(seen.has(n))continue;seen.add(n);group.push({unitId:items[n].unitId,observationRef:items[n].observationRef});queue.push(...neighbors[n]);}
  groups.push(group);
 }
 return groups;
}
/** Supplement known identity without erasing or replacing any existing non-null fact. */
export function mergeObservedFacts<T extends Record<string,any>>(base:T,incoming:Record<string,any>):{value:T;conflicts:string[]}{
 const value=structuredClone(base),conflicts:string[]=[];
 function visit(a:Record<string,any>,b:Record<string,any>,prefix=''){
  for(const [key,v]of Object.entries(b)){
   if(['id','evidenceId','evidenceIds','region','location','ownerId','attachedToId','anchor','sources','schema','version','componentId'].includes(key)||key==='kind'&&!prefix)continue;
   if(v===null||v===undefined||v===''||v==='unknown')continue;
   const old=a[key],path=prefix+key;
   if(v&&typeof v==='object'&&!Array.isArray(v)&&old&&typeof old==='object'&&!Array.isArray(old))visit(old,v,path+'.');
   else if(old===null||old===undefined||old==='unknown'||old==='')a[key]=structuredClone(v);
   else if(!equal(old,v))conflicts.push(path);
  }
 }
 visit(value,incoming);return {value,conflicts};
}
