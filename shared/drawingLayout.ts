import type {DrawingPosition} from './drawingProjection';
export interface DrawingLayoutInput {assertionId:string;pieceId:string;position:DrawingPosition;contextKey?:string}
export interface DrawingRect {x:number;y:number;width:number;height:number}
export interface DrawingLayoutOptions {tileWidth?:number;tileHeight?:number;gap?:number;groupGap?:number;padding?:number;/** Kept for old callers; no longer folds photo rows. */bandCount?:number;relation?:'neighbors'|'source-order';sourceAspectRatio?:number;/** Same-source display reference only, never a stored group/position. */reference?:DrawingLayout}
export interface DrawingLayoutTile {assertionId:string;pieceId:string;rect:DrawingRect;groupId:string;source:Extract<DrawingPosition,{space:'photo'}>}
export interface DrawingLayoutGroup {id:string;basis:'photo-neighbor-hypothesis'|'source-order';axis:'x'|'y'|null;members:{assertionId:string;pieceId:string}[];rect:DrawingRect;sourceKey:string}
export interface DrawingLayoutRow {id:string;sourceKey:string;members:{assertionId:string;pieceId:string}[];groupIds:string[];rect:DrawingRect;sourceCenter:number;crossSize:number;orientationDegrees:number;orientationBasis:'neighbor-directions'|'source-direction';aspectRatio:number;alongPitch:number}
export interface DrawingLayout {width:number;height:number;tiles:DrawingLayoutTile[];groups:DrawingLayoutGroup[];rows:DrawingLayoutRow[];retained:DrawingLayoutInput[];unlocated:{item:DrawingLayoutInput;reason:'unlocated'|'missing-source'|'invalid-box'|'duplicate-id'}[]}
type PhotoInput=DrawingLayoutInput&{position:Extract<DrawingPosition,{space:'photo'}>};
type Node={item:PhotoInput;key:string;x:number;y:number;w:number;h:number;u:number;v:number;along:number;cross:number};
type Row={nodes:Node[];center:number;cross:number;reference?:DrawingLayoutRow};
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const identity=(i:Pick<DrawingLayoutInput,'assertionId'|'pieceId'>)=>JSON.stringify([i.assertionId,i.pieceId]);
const sourceKey=(i:PhotoInput)=>JSON.stringify([i.position.evidenceId,i.position.sourceSHA,i.contextKey??JSON.stringify(['assertion',i.assertionId])]);
const median=(ns:number[])=>{const s=[...ns].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const itemOrder=(a:DrawingLayoutInput,b:DrawingLayoutInput)=>compare(identity(a),identity(b))||compare(JSON.stringify(a.position),JSON.stringify(b.position));
const validBox=(p:PhotoInput['position'])=>!!p.box&&[p.box.x,p.box.y,p.box.width,p.box.height].every(Number.isFinite)&&p.box.x>=0&&p.box.y>=0&&p.box.width>0&&p.box.height>0&&p.box.x+p.box.width<=1.00000001&&p.box.y+p.box.height<=1.00000001;
const angleDistance=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(2*(a-b)),Math.cos(2*(a-b)))/2);
const foldAngle=(a:number)=>a>=Math.PI/2?a-Math.PI:a< -Math.PI/2?a+Math.PI:a;
/** Undirected local centre lines. A competing axis or too little evidence retains photo direction. */
function orientation(nodes:Node[]):{angle:number;basis:DrawingLayoutRow['orientationBasis']}{
 const angles:number[]=[],scale=median(nodes.map(n=>Math.hypot(n.w,n.h)));
 for(const a of nodes){const near=nodes.filter(b=>a!==b).map(b=>({b,d:Math.hypot(b.x-a.x,b.y-a.y)})).filter(n=>n.d>scale*.15&&n.d<scale*2.5).sort((a,b)=>a.d-b.d||compare(a.b.key,b.b.key));
  if(near[0])angles.push(foldAngle(Math.atan2(near[0].b.y-a.y,near[0].b.x-a.x)));
 }
 if(angles.length<3)return {angle:0,basis:'source-direction'};
 const tolerance=Math.PI/12,support=(angle:number)=>angles.filter(a=>angleDistance(a,angle)<=tolerance),ranked=angles.map(a=>({a,ns:support(a)})).sort((a,b)=>b.ns.length-a.ns.length||Math.abs(a.a)-Math.abs(b.a)||a.a-b.a),best=ranked[0];
 const competing=ranked.find(a=>angleDistance(a.a,best.a)>Math.PI/6);
 if(best.ns.length<angles.length*.45||competing&&competing.ns.length>=best.ns.length*.8)return {angle:0,basis:'source-direction'};
 const mean=foldAngle(Math.atan2(best.ns.reduce((n,a)=>n+Math.sin(2*a),0),best.ns.reduce((n,a)=>n+Math.cos(2*a),0))/2);
 const rounded=Math.round(mean/(Math.PI/36))*(Math.PI/36);
 return {angle:Math.abs(Math.abs(rounded)-Math.PI/2)<1e-10?Math.PI/2:rounded,basis:'neighbor-directions'};
}
/** Two separated gap populations distinguish line thickness from space between lines. */
function rowTolerance(nodes:Node[]){
 const sorted=nodes.map(n=>n.v).sort((a,b)=>a-b),gaps=sorted.slice(1).map((v,i)=>v-sorted[i]),cross=median(nodes.map(n=>n.cross));
 if(gaps.length<3)return cross*.6;
 let lo=0,hi=Math.max(...gaps);
 for(let iteration=0;iteration<12;iteration++){const a=gaps.filter(g=>g<(lo+hi)/2),b=gaps.filter(g=>g>=(lo+hi)/2);if(!a.length||!b.length)break;lo=a.reduce((n,g)=>n+g,0)/a.length;hi=b.reduce((n,g)=>n+g,0)/b.length;}
 return hi>Math.max(lo*3,cross*.12)?(lo+hi)/2:cross*.6;
}
function photoRows(nodes:Node[],references:DrawingLayoutRow[],tolerance:number):Row[]{
 const rows:Row[]=references.map(reference=>({nodes:[],center:reference.sourceCenter,cross:reference.crossSize,reference}));
 for(const n of [...nodes].sort((a,b)=>a.v-b.v||a.u-b.u||compare(a.key,b.key))){
  const same=rows.find(r=>r.reference?.members.some(m=>identity(m)===n.key)&&Math.abs(n.v-r.center)<=Math.max(n.cross,r.cross)*.9);
  const choices=rows.map(r=>({r,d:Math.abs(n.v-r.center),limit:tolerance})).filter(x=>x.d<=x.limit).sort((a,b)=>a.d-b.d);
  // Do not bridge two close rows through an ambiguous neighbour.
  const chosen=same??(choices[0]&&(!choices[1]||choices[1].d-choices[0].d>choices[0].limit*.15)?choices[0].r:undefined);
  if(chosen){chosen.nodes.push(n);if(!chosen.reference){chosen.center=median(chosen.nodes.map(n=>n.v));chosen.cross=median(chosen.nodes.map(n=>n.cross));}}
  else rows.push({nodes:[n],center:n.v,cross:n.cross});
 }
 return rows.sort((a,b)=>a.center-b.center||compare(a.reference?.id??a.nodes[0]?.key??'',b.reference?.id??b.nodes[0]?.key??''));
}
/** Readable photo rows, never saved coordinates, owners, inventory, or legal game groups. */
export function layoutDrawingItems(items:readonly DrawingLayoutInput[],options:DrawingLayoutOptions={}):DrawingLayout{
 const {tileWidth=56,tileHeight=76,gap=8,groupGap=20,padding=12,bandCount=3,relation='neighbors',sourceAspectRatio=1,reference}=options;
 if(![tileWidth,tileHeight,sourceAspectRatio].every(n=>Number.isFinite(n)&&n>0)||![gap,groupGap,padding].every(n=>Number.isFinite(n)&&n>=0)||!Number.isSafeInteger(bandCount)||bandCount<1||!['neighbors','source-order'].includes(relation))throw new RangeError('표시 크기·간격·사진 비율을 확인하세요.');
 const out:DrawingLayout={width:0,height:0,tiles:[],groups:[],rows:[],retained:[],unlocated:[]},counts=new Map<string,number>(),partitions=new Map<string,Node[]>();
 for(const i of items)counts.set(identity(i),(counts.get(identity(i))??0)+1);
 for(const item of [...items].sort(itemOrder)){
  if(counts.get(identity(item))!>1){out.unlocated.push({item,reason:'duplicate-id'});continue;}
  const p=item.position;if(p.space==='manual'||p.space==='board'||p.space==='group'){out.retained.push(item);continue;}
  if(p.space==='unlocated'){out.unlocated.push({item,reason:'unlocated'});continue;}
  if(!p.evidenceId||!p.sourceSHA){out.unlocated.push({item,reason:'missing-source'});continue;}
  if(!validBox(p)){out.unlocated.push({item,reason:'invalid-box'});continue;}
  const photo=item as PhotoInput,key=sourceKey(photo),node:Node={item:photo,key:identity(item),x:(p.box.x+p.box.width/2)*sourceAspectRatio,y:p.box.y+p.box.height/2,w:p.box.width*sourceAspectRatio,h:p.box.height,u:0,v:0,along:0,cross:0};partitions.set(key,[...(partitions.get(key)??[]),node]);
 }
 let y=0;
 // Keep an emptied row/context only while another context from that exact display reference remains.
 const hasReference=reference?.rows?.some(r=>partitions.has(r.sourceKey));
 if(hasReference)for(const row of reference!.rows)if(!partitions.has(row.sourceKey)&&[...partitions.keys()].some(key=>{const a=JSON.parse(key),b=JSON.parse(row.sourceKey);return a[0]===b[0]&&a[1]===b[1];}))partitions.set(row.sourceKey,[]);
 for(const [key,nodes]of [...partitions].sort(([a],[b])=>compare(a,b))){
  const refs=reference?.rows?.filter(r=>r.sourceKey===key&&r.aspectRatio===sourceAspectRatio)??[],estimated=orientation(nodes),angle=refs.length?refs[0].orientationDegrees*Math.PI/180:estimated.angle,basis=refs[0]?.orientationBasis??estimated.basis,c=Math.cos(angle),s=Math.sin(angle);
  for(const n of nodes){n.u=n.x*c+n.y*s;n.v=-n.x*s+n.y*c;n.along=Math.abs(n.w*c)+Math.abs(n.h*s);n.cross=Math.abs(n.w*s)+Math.abs(n.h*c);}
  const rows=photoRows(nodes,refs,rowTolerance(nodes)),partitionY=y;
  const steps=rows.flatMap(r=>{const ns=[...r.nodes].sort((a,b)=>a.u-b.u);return ns.slice(1).map((n,i)=>n.u-ns[i].u).filter(d=>d>0);}).sort((a,b)=>a-b),pitch=steps.length?median(steps.slice(0,Math.ceil(steps.length*.6))):median(nodes.map(n=>n.along));
  for(let index=0;index<rows.length;index++){
   const row=rows[index],priorOrder=new Map(row.reference?.members.map((m,i)=>[identity(m),i])??[]),ordered=row.nodes.sort((a,b)=>{
    if(priorOrder.has(a.key)&&priorOrder.has(b.key)&&Math.abs(a.u-b.u)<Math.min(a.along,b.along)*.5)return priorOrder.get(a.key)!-priorOrder.get(b.key)!;
    return a.u-b.u||a.v-b.v||compare(a.key,b.key);
   }),members=ordered.map(n=>({assertionId:n.item.assertionId,pieceId:n.item.pieceId}));
   // Empty reference rows keep their height when their last tile is deleted in the current view.
   const rowY=partitionY+index*(tileHeight+groupGap+padding*2),rowId=row.reference?.id??'row-'+JSON.stringify([key,index]),groupIds:string[]=[],clusters:Node[][]=[];
   const priorGroups=new Map(reference?.groups.filter(g=>row.reference?.groupIds.includes(g.id)).flatMap(g=>g.members.map(m=>[identity(m),g.id] as const))??[]),alongPitch=row.reference?.alongPitch??pitch;
   for(const n of ordered){const previous=clusters.at(-1)?.at(-1),space=previous?n.u-previous.u:0;
    let separate=space>2.1*alongPitch;
    if(previous&&priorGroups.has(previous.key)&&priorGroups.has(n.key)&&Math.abs(space-2.1*alongPitch)<alongPitch*.4)separate=priorGroups.get(previous.key)!==priorGroups.get(n.key);
    if(!previous||relation==='neighbors'&&separate)clusters.push([n]);else clusters.at(-1)!.push(n);
   }
   let x=padding;
   for(const cluster of clusters){const groupMembers=cluster.map(n=>({assertionId:n.item.assertionId,pieceId:n.item.pieceId})),id='display-'+JSON.stringify([rowId,groupMembers]),width=cluster.length*tileWidth+Math.max(0,cluster.length-1)*gap;
    groupIds.push(id);out.groups.push({id,basis:basis==='neighbor-directions'?'photo-neighbor-hypothesis':'source-order',axis:Math.abs(s)>Math.abs(c)?'y':'x',members:groupMembers,rect:{x,y:rowY+padding,width,height:tileHeight},sourceKey:key});
    cluster.forEach((n,i)=>out.tiles.push({assertionId:n.item.assertionId,pieceId:n.item.pieceId,rect:{x:x+i*(tileWidth+gap),y:rowY+padding,width:tileWidth,height:tileHeight},groupId:id,source:n.item.position}));x+=width+groupGap;
   }
   const width=Math.max(padding*2+tileWidth,x-groupGap+padding);out.rows.push({id:rowId,sourceKey:key,members,groupIds,rect:{x:0,y:rowY,width,height:tileHeight+padding*2},sourceCenter:row.center,crossSize:row.cross,orientationDegrees:angle*180/Math.PI,orientationBasis:basis,aspectRatio:sourceAspectRatio,alongPitch:row.reference?.alongPitch??pitch});out.width=Math.max(out.width,width);
  }
  y+=rows.length*(tileHeight+groupGap+padding*2);
 }
 out.height=Math.max(0,y-groupGap);return out;
}
