import type {SceneRegion,SceneRelation,SceneLayoutPlan} from './restorationScene';
/** Readable display geometry only. Never changes scene claims, raw geometry or physical order. */
export interface SceneLayoutInput {
 regions:readonly Pick<SceneRegion,'id'>[];
 relations:readonly (Pick<SceneRelation,'id'|'from'|'to'>&{kind:string;claim:Pick<SceneRelation['claim'],'status'>})[];
 plan?:{panels:readonly Pick<SceneLayoutPlan['panels'][number],'regionId'|'band'|'lane'>[]};
}
export interface ScenePanelSize {width:number;height:number}
export interface ScenePanelLayout extends ScenePanelSize {regionId:string;band:number;lane:number;x:number;y:number}
export interface RestorationSceneLayout {panels:ScenePanelLayout[];width:number;height:number;unsatisfiedRelationIds:string[]}
type Edge={id:string;from:string;to:string};
function ranks(ids:readonly string[],edges:readonly Edge[]){
 const pending=new Set(ids),incoming=new Map(ids.map(id=>[id,0])),next=new Map(ids.map(id=>[id,new Set<string>()])),levels=new Map(ids.map(id=>[id,0]));
 for(const e of edges)if(pending.has(e.from)&&pending.has(e.to)&&!next.get(e.from)!.has(e.to)){next.get(e.from)!.add(e.to);incoming.set(e.to,incoming.get(e.to)!+1);}
 while(pending.size){const ready=ids.filter(id=>pending.has(id)&&incoming.get(id)===0);if(!ready.length)break;for(const id of ready){pending.delete(id);for(const to of next.get(id)!){levels.set(to,Math.max(levels.get(to)!,levels.get(id)!+1));incoming.set(to,incoming.get(to)!-1);}}}
 return {levels,unresolved:pending};
}
export function layoutRestorationScene(scene:SceneLayoutInput,sizes:ReadonlyMap<string,ScenePanelSize>,gap=24):RestorationSceneLayout{
 const order=[...new Set([...(scene.plan?.panels??[]).map(p=>p.regionId),...scene.regions.map(r=>r.id)])].filter(id=>scene.regions.some(r=>r.id===id)),index=new Map(order.map((id,i)=>[id,i]));
 const supported=scene.relations.filter(r=>r.claim.status==='selected'&&index.has(r.from)&&index.has(r.to)),above=supported.filter(r=>r.kind==='above'),left=supported.filter(r=>r.kind==='left-of'),y=ranks(order,above),x=ranks(order,left),unresolved=new Set([...y.unresolved,...x.unresolved]);
 const safe=order.filter(id=>!unresolved.has(id)),bands=new Map(safe.map(id=>[id,y.levels.get(id)!])),lastBand=safe.length?Math.max(...bands.values())+1:0;
 for(const id of order)if(unresolved.has(id))bands.set(id,lastBand);
 // Non-overlap ties are display constraints, never added to the persisted relation graph.
 const displayEdges:Edge[]=left.filter(e=>!unresolved.has(e.from)&&!unresolved.has(e.to));
 for(const band of new Set(bands.values())){const row=order.filter(id=>bands.get(id)===band).sort((a,b)=>x.levels.get(a)!-x.levels.get(b)!||index.get(a)!-index.get(b)!);for(let i=1;i<row.length;i++)displayEdges.push({id:'display-only',from:row[i-1],to:row[i]});}
 const lanes=ranks(order,displayEdges).levels,size=(id:string)=>{const s=sizes.get(id);return {width:s&&Number.isFinite(s.width)&&s.width>0?s.width:360,height:s&&Number.isFinite(s.height)&&s.height>0?s.height:240};},widths=new Map<number,number>(),heights=new Map<number,number>();
 for(const id of order){const s=size(id),lane=lanes.get(id)!,band=bands.get(id)!;widths.set(lane,Math.max(widths.get(lane)??0,s.width));heights.set(band,Math.max(heights.get(band)??0,s.height));}
 const space=Number.isFinite(gap)&&gap>=0?gap:24,offsets=(values:Map<number,number>)=>{let n=0;const offsets=new Map<number,number>();for(const key of [...values.keys()].sort((a,b)=>a-b)){offsets.set(key,n);n+=values.get(key)!+space;}return {offsets,total:Math.max(0,n-space)};},cols=offsets(widths),rows=offsets(heights),panels=order.map(regionId=>({regionId,...size(regionId),band:bands.get(regionId)!,lane:lanes.get(regionId)!,x:cols.offsets.get(lanes.get(regionId)!)!,y:rows.offsets.get(bands.get(regionId)!)!}));
 return {panels,width:cols.total,height:rows.total,unsatisfiedRelationIds:supported.filter(r=>(r.kind==='above'||r.kind==='left-of')&&(unresolved.has(r.from)||unresolved.has(r.to))).map(r=>r.id)};
}
