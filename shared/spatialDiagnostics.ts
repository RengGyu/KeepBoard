import type {ObservationReceipt} from './lightweightRecognition';
export interface SpatialDiagnostics {total:number;placed:number;unplaced:number;missingPlacement:number;rejected:number;normalized:number;observations:{key:string;taskId:string;observationRef:string;placed:boolean;rejectedReasons:string[];normalizedReasons:string[]}[]}
/** Counts claims retained by the validator, not visual correctness or owner assignment. */
export function spatialDiagnostics(receipts:readonly ObservationReceipt[]):SpatialDiagnostics{
 const rows=new Map<string,SpatialDiagnostics['observations'][number]&{missing:boolean}>();
 for(const r of receipts){
  // Historical compact views may retain only a receipt marker. No request means no diagnosis.
  const contract=r?.request?.spatial;
  if(!contract||typeof r.request.taskId!=='string'||!Array.isArray(r.request.images)||typeof r.request.images[0]?.sha256!=='string'||!Array.isArray(r.result?.observations)||!Array.isArray(contract.frames)||!Array.isArray(contract.structuralNamespaces))continue;
  if(contract.frames.some(f=>!Array.isArray(f?.areas)||f.areas.some(a=>!a||!Array.isArray(a.acceptedComponents)||!Array.isArray(a.sourceAreaIds)||!a.addressing||!Array.isArray(a.addresses)))||contract.structuralNamespaces.some(n=>!n||!Array.isArray(n.entries)||!Array.isArray(n.sourceAreaIds)))continue;
  const spatial=r.result.spatial,raw=r.hostedWire?.spatial as any;
  if(spatial&&(!Array.isArray(spatial.placements)||!Array.isArray(spatial.boardInstances)||!Array.isArray(spatial.deferred)))continue;
  for(const o of r.result.observations){
   let areas=contract.frames.flatMap(f=>f.areas).filter(a=>!o.componentId||a.acceptedComponents.includes(o.componentId));
   if(o.sourceAreaId){const scoped=areas.filter(a=>a.sourceAreaIds.includes(o.sourceAreaId!));if(scoped.length)areas=scoped;}
   const canonical=areas.some(a=>a.addressing.kind!=='none'&&a.addresses.length>0||contract.structuralNamespaces.some(n=>n.entries.length&&n.fieldKey===a.fieldKey&&n.sourceAreaIds.some(id=>a.sourceAreaIds.includes(id))));
   if(!canonical)continue; // Explicit named/free-only fields never asked for a canonical cell.
   const key=JSON.stringify([r.request.taskId,r.request.images[0]?.sha256,o.ref]);if(rows.has(key))continue;
   const p=spatial?.placements.find(p=>p.observationRef===o.ref),rawPlacement=Array.isArray(raw?.placements)?raw.placements.find((p:any)=>p?.observationRef===o.ref):undefined,boardRef=rawPlacement?.boardInstanceRef??p?.boardInstanceRef,b=spatial?.boardInstances.find(b=>b.ref===p?.boardInstanceRef),rejected=new Set<string>(),normalized=new Set<string>();
   for(const d of spatial?.deferred??[]){const source=d.section==='placements'?(raw?.placements??spatial?.placements)?.[d.index]:d.section==='boardInstances'?(raw?.boardInstances??spatial?.boardInstances)?.[d.index]:undefined;
    if(d.section==='response'||d.section==='placements'&&source?.observationRef===o.ref||d.section==='boardInstances'&&!!boardRef&&boardRef===source?.ref)(d.reason.startsWith('normalized-')?normalized:rejected).add(d.reason);
   }
   rows.set(key,{key,taskId:r.request.taskId,observationRef:o.ref,placed:!!b?.templateFrameId&&p?.namespace!=='photo-local'&&!!(p?.anchorAddress||p?.coveredAddresses?.length),missing:!p,rejectedReasons:[...rejected].sort(),normalizedReasons:[...normalized].sort()});
  }
 }
 const observations=[...rows.values()],placed=observations.filter(o=>o.placed).length;
 return {total:observations.length,placed,unplaced:observations.length-placed,missingPlacement:observations.filter(o=>o.missing).length,rejected:observations.filter(o=>o.rejectedReasons.length).length,normalized:observations.filter(o=>o.normalizedReasons.length).length,observations:observations.map(({missing:_,...o})=>o)};
}
