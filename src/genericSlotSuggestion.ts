import type {GenericPiece,GenericPlacement} from '../shared/genericRecord';
import {fitPerspective} from '../shared/catanSlotSuggestion';
import {realAreasFor,realSlotAccepts,realSlotLayoutVariant,type RealBoard} from './realBoards';

export interface SlotQualification {gameId:string;field:string;geometry:string;independentTargets:number;correct:number}
// No generic board has an independently verified slot correspondence yet. A
// photograph rectangle or agreement between model runs is not that evidence.
export const GENERIC_SLOT_QUALIFICATIONS:readonly SlotQualification[]=[];
export function slotGeometry(board:RealBoard,field:string,players?:number){return JSON.stringify({viewBox:board.viewBox,frame:board.placementFrame??'base',areas:realAreasFor(board,field,players).map(a=>({id:a.id,accepts:a.accepts,slots:a.slots}))});}
const point=(p:GenericPiece)=>({x:p.region!.x+p.region!.width/2,y:p.region!.y+p.region!.height/2});
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
function project(h:number[],p:{x:number;y:number}){const w=h[6]*p.x+h[7]*p.y+1;return{x:(h[0]*p.x+h[1]*p.y+h[2])/w,y:(h[3]*p.x+h[4]*p.y+h[5])/w};}
/** Existing deliberate, frame-tagged slot placements register one photograph.
 * Never fit from colour, quantity, group order, another owner/field or a bare
 * board bounding box. Leave-one-out residual is a consistency gate, not GT. */
export function genericSlotCandidates(board:RealBoard,field:string,pieces:readonly GenericPiece[],areaId:string,players?:number){
 const [vx,vy,vw,vh]=board.viewBox,frame=realSlotLayoutVariant(board.placementFrame??'base');
 const slots=realAreasFor(board,field,players).flatMap(a=>a.slots.map(s=>({...s,accepts:a.accepts,x:(s.x+s.w/2-vx)/vw,y:(s.y+s.h/2-vy)/vh})));
 if(slots.length<2)return [];
 const pitch=Math.min(...slots.flatMap((s,i)=>slots.slice(i+1).map(t=>distance(s,t))).filter(d=>d>1e-6));
 if(!Number.isFinite(pitch))return [];
 const fitTolerance=pitch*.15,placeTolerance=pitch*.3;
 const eligible=(p:GenericPiece)=>!!p.evidenceId&&!!p.region&&p.quantity===1&&p.componentId!==null;
 const sourceIds=[...new Set(pieces.filter(eligible).map(p=>p.evidenceId!))].sort();
 const output:{id:string;placement:GenericPlacement}[]=[];
 for(const source of sourceIds){
  const occupied=new Set<string>(),pairs:{from:{x:number;y:number};to:{x:number;y:number}}[]=[];
  const sameSlot=new Set<string>();
  for(const p of pieces){if(p.quantity===0||!p.placement)continue;
   const q=p.placement,s=slots.find(s=>distance(q,s)<1e-6&&realSlotAccepts(s.accepts,p.componentId));
   if(s){if(occupied.has(s.id))sameSlot.add(s.id);occupied.add(s.id);}
  }
  for(const p of pieces){if(!eligible(p)||p.evidenceId!==source||p.placement?.layoutVariant!==frame||p.placement.areaId!==areaId)continue;
   const s=slots.find(s=>distance(p.placement!,s)<1e-6&&realSlotAccepts(s.accepts,p.componentId));
   if(s&&!sameSlot.has(s.id))pairs.push({from:point(p),to:s});
  }
  if(pairs.length<8)continue;
  const fit=fitPerspective(pairs);if(!fit)continue;
  if(pairs.some((p,i)=>{const h=fitPerspective(pairs.filter((_,j)=>j!==i));return !h||!Number.isFinite(project(h,p.from).x)||distance(project(h,p.from),p.to)>fitTolerance;}))continue;
  const claims=new Map<string,{id:string;placement:GenericPlacement}[]>();
  for(const p of pieces){if(!eligible(p)||p.evidenceId!==source||p.placement)continue;
   const at=project(fit,point(p)),options=slots.filter(s=>realSlotAccepts(s.accepts,p.componentId)).map(s=>({s,d:distance(s,at)})).sort((a,b)=>a.d-b.d);
   const best=options[0];if(!best||!Number.isFinite(best.d)||best.d>placeTolerance||occupied.has(best.s.id)||options[1]&&options[1].d-best.d<placeTolerance)continue;
   const row={id:p.id,placement:{areaId,x:best.s.x,y:best.s.y,rotation:0 as const,layoutVariant:frame}};
   claims.set(best.s.id,[...(claims.get(best.s.id)??[]),row]);
  }
  // Competing objects do not get displaced into the next free slot.
  for(const rows of claims.values())if(rows.length===1)output.push(rows[0]);
 }
 const counts=new Map<string,number>();for(const row of output){const key=JSON.stringify(row.placement);counts.set(key,(counts.get(key)??0)+1);}
 return output.filter(r=>counts.get(JSON.stringify(r.placement))===1).sort((a,b)=>a.id.localeCompare(b.id));
}
export function qualifiedGenericSlots(gameId:string,board:RealBoard,field:string,pieces:readonly GenericPiece[],areaId:string,players?:number,qualifications=GENERIC_SLOT_QUALIFICATIONS){
 const q=qualifications.find(q=>q.gameId===gameId&&q.field===field&&q.geometry===slotGeometry(board,field,players));
 if(!q||q.independentTargets<=0||q.correct/q.independentTargets<.95)return [];
 return genericSlotCandidates(board,field,pieces,areaId,players);
}
