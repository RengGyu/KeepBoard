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
export function boardFit(scene:ComponentScene){
 const pairs=scene.components.flatMap(c=>{if((c.kind!=='terrain'&&c.kind!=='number-token')||c.location.type!=='hex'||!c.location.id||!c.region)return [];const to=slotPoint(c.location);return to?[{from:center(c),to}]:[];});
 if(pairs.length<MIN_ANCHORS)return null;
 const fit=fitPerspective(pairs);if(!fit)return null;
 const rms=Math.sqrt(pairs.reduce((n,p)=>n+dist(project(fit,p.from),p.to)**2,0)/pairs.length);
 return rms<=MAX_RMS?{matrix:fit,rms,anchors:pairs.length}:null;
}
const SLOT:Partial<Record<SceneComponent['kind'],'edge'|'vertex'>>={road:'edge',settlement:'vertex',city:'vertex',unknown:'vertex'};
export const needsPlace=(c:SceneComponent)=>!!SLOT[c.kind]&&!!c.region&&c.quantity!==0&&(!c.location.id||c.location.type==='unplaced'||!slotPoint(c.location));
/** Nearest free matching slot for each unplaced piece; the closest claims win and a slot is never offered twice. */
export function suggestSlots(scene:ComponentScene,maxDistance=.45):SlotSuggestion[]{
 const fit=boardFit(scene);if(!fit)return [];
 const taken=new Set(scene.components.filter(c=>c.location.id&&c.quantity!==0).map(c=>c.location.type+':'+c.location.id));
 const options=scene.components.filter(needsPlace).flatMap(c=>{const type=SLOT[c.kind]!,p=project(fit.matrix,center(c)),slots=type==='edge'?CATAN_TOPOLOGY.edges:CATAN_TOPOLOGY.vertices;return slots.map(s=>({id:c.id,type,slot:s.id,distance:dist(p,s)})).filter(o=>o.distance<=maxDistance);}).sort((a,b)=>a.distance-b.distance);
 const out:SlotSuggestion[]=[],used=new Set<string>();
 for(const o of options){const key=o.type+':'+o.slot;if(used.has(o.id)||taken.has(key))continue;used.add(o.id);taken.add(key);out.push({id:o.id,location:{type:o.type,id:o.slot},distance:o.distance});}
 return out;
}
