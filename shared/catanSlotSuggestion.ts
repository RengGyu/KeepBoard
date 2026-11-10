import {CATAN_TOPOLOGY,slotPoint,type ComponentScene,type Point,type SceneComponent,type SceneLocation} from './scene';

export interface SlotSuggestion {id:string;location:SceneLocation;distance:number}
const MIN_ANCHORS=8,MAX_RMS=.35;
type Matrix=number[];

function solve(a:number[][],b:number[]):number[]|null{
 const n=b.length,m=a.map((row,i)=>[...row,b[i]]);
 for(let c=0;c<n;c++){
  let p=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;
  if(Math.abs(m[p][c])<1e-12)return null;[m[c],m[p]]=[m[p],m[c]];
  for(let r=0;r<n;r++){if(r===c)continue;const f=m[r][c]/m[c][c];for(let k=c;k<=n;k++)m[r][k]-=f*m[c][k];}
 }
 return m.map((row,i)=>row[n]/row[i]);
}
const project=(h:Matrix,p:Point):Point=>{const w=h[6]*p.x+h[7]*p.y+1;return {x:(h[0]*p.x+h[1]*p.y+h[2])/w,y:(h[3]*p.x+h[4]*p.y+h[5])/w};};
/** Least-squares perspective fit from photo points to board points. */
export function fitPerspective(pairs:readonly {from:Point;to:Point}[]):Matrix|null{
 const n=8,ata=Array.from({length:n},()=>Array(n).fill(0)),atb=Array(n).fill(0);
 const add=(row:number[],v:number)=>{for(let i=0;i<n;i++){atb[i]+=row[i]*v;for(let j=0;j<n;j++)ata[i][j]+=row[i]*row[j];}};
 for(const {from:f,to:t} of pairs){add([f.x,f.y,1,0,0,0,-f.x*t.x,-f.y*t.x],t.x);add([0,0,0,f.x,f.y,1,-f.x*t.y,-f.y*t.y],t.y);}
 return solve(ata,atb);
}
const center=(c:SceneComponent):Point=>({x:c.region!.x+c.region!.width/2,y:c.region!.y+c.region!.height/2});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
/** The board printed in the photo locates itself: hexes the reader already placed anchor the fit, with no extra input from the user. */
export function boardFit(scene:ComponentScene,evidenceId?:string|null){
 const sources=[...new Set(scene.components.flatMap(c=>c.evidenceId?[c.evidenceId]:[]))].filter(id=>evidenceId===undefined||id===evidenceId).sort();
 const fits=sources.flatMap(source=>{
  const byHex=new Map<string,SceneComponent[]>();
  for(const c of scene.components){if(c.evidenceId!==source||c.quantity===0||(c.kind!=='terrain'&&c.kind!=='number-token')||c.location.type!=='hex'||!c.location.id||!c.region)continue;byHex.set(c.location.id,[...(byHex.get(c.location.id)??[]),c]);}
  // A terrain and its printed disc are not two independent board anchors. Prefer
  // the whole hex extent; duplicate same-kind claims on one hex are ambiguous.
  const pairs=[...byHex].sort(([a],[b])=>a.localeCompare(b)).flatMap(([,rows])=>{const tiles=rows.filter(c=>c.kind==='terrain'),c=tiles.length===1?tiles[0]:tiles.length===0&&rows.length===1?rows[0]:null;if(!c)return [];const to=slotPoint(c.location);return to?[{from:center(c),to}]:[];});
  if(pairs.length<MIN_ANCHORS)return [];
  type Fit={matrix:Matrix;inliers:number[];error:number};let best:Fit|null=null;
  const consider=(matrix:Matrix|null)=>{if(!matrix)return;const inliers:number[]=[],errors:number[]=[];pairs.forEach((p,i)=>{const d=dist(project(matrix,p.from),p.to);if(Number.isFinite(d)&&d<=MAX_RMS){inliers.push(i);errors.push(d*d);}});const error=errors.reduce((n,v)=>n+v,0);if(!best||inliers.length>best.inliers.length||inliers.length===best.inliers.length&&error<best.error)best={matrix,inliers,error};};
  consider(fitPerspective(pairs));
  // Fixed bounded sampling, independent of game values and photographs. A bad
  // model hex may be rejected only when at least 75% of distinct hexes agree.
  let seed=0x61c3a7;
  for(let trial=0;trial<128;trial++){const chosen=new Set<number>();while(chosen.size<4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;chosen.add(seed%pairs.length);}consider(fitPerspective([...chosen].map(i=>pairs[i])));}
  const found=best as Fit|null;if(!found||found.inliers.length<Math.max(MIN_ANCHORS,Math.ceil(pairs.length*.75)))return [];
  const matrix=fitPerspective(found.inliers.map(i=>pairs[i]));if(!matrix)return [];
  const rms=Math.sqrt(found.inliers.reduce((n,i)=>n+dist(project(matrix,pairs[i].from),pairs[i].to)**2,0)/found.inliers.length);
  return Number.isFinite(rms)&&rms<=MAX_RMS?[{matrix,rms,anchors:found.inliers.length,evidenceId:source}]:[];
 });
 return fits.sort((a,b)=>b.anchors-a.anchors||a.rms-b.rms||a.evidenceId.localeCompare(b.evidenceId))[0]??null;
}
const SLOT:Partial<Record<SceneComponent['kind'],'edge'|'vertex'>>={road:'edge',settlement:'vertex',city:'vertex',unknown:'vertex'};
export const needsPlace=(c:SceneComponent)=>!!SLOT[c.kind]&&!!c.region&&c.quantity!==0&&(!c.location.id||c.location.type==='unplaced'||!slotPoint(c.location));
/** Nearest free matching slot for each unplaced piece; the closest claims win and a slot is never offered twice. */
export function suggestSlots(scene:ComponentScene,maxDistance=.45):SlotSuggestion[]{
 const fits=new Map<string,ReturnType<typeof boardFit>>();
 const taken=new Set(scene.components.filter(c=>c.location.id&&c.quantity!==0).map(c=>c.location.type+':'+c.location.id));
 const options=scene.components.filter(needsPlace).flatMap(c=>{
  if(!c.evidenceId)return [];
  if(!fits.has(c.evidenceId))fits.set(c.evidenceId,boardFit(scene,c.evidenceId));const fit=fits.get(c.evidenceId);if(!fit)return [];
  const type=SLOT[c.kind]!,p=project(fit.matrix,center(c)),slots=type==='edge'?CATAN_TOPOLOGY.edges:CATAN_TOPOLOGY.vertices;
  const closest=slots.map(s=>({id:c.id,type,slot:s.id,distance:dist(p,s)})).sort((a,b)=>a.distance-b.distance||a.slot.localeCompare(b.slot));
  // A taken nearest slot does not authorize moving this object into a different
  // neighbouring slot. Equidistant boundaries stay unresolved.
  return closest[0]?.distance<=maxDistance&&(!closest[1]||closest[1].distance-closest[0].distance>1e-6)?[closest[0]]:[];
 }).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
 const out:SlotSuggestion[]=[],used=new Set<string>();
 for(const o of options){const key=o.type+':'+o.slot;if(used.has(o.id)||taken.has(key))continue;used.add(o.id);taken.add(key);out.push({id:o.id,location:{type:o.type,id:o.slot},distance:o.distance});}
 return out;
}
