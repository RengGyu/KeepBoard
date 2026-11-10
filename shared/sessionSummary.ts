import type {Session} from './types';

/** List cards never carry board state, snapshots, private photos or room credentials. */
export interface SessionSummary {
 id:string;name:string;gamePackId:string;gamePackVersion:string;updatedAt:string;
 saved:boolean;room:boolean;example?:boolean;deletedAt?:string;thumbnail?:string;
}
export function sessionSummary(session:Session):SessionSummary {
 const evidence=[...session.evidence,...session.snapshots.flatMap(s=>s.evidence)];
 const ownerURLs=new Set(evidence.filter(e=>e.ownerId).map(e=>e.url));
 const thumbnail=session.evidence.find(e=>e.scope==='public'&&!e.ownerId&&!ownerURLs.has(e.url))?.url;
 return {id:session.id,name:session.name,gamePackId:session.gamePackId,gamePackVersion:session.gamePackVersion,
  updatedAt:session.updatedAt,saved:session.snapshots.length>0,room:!!session.room,
  ...(session.example?{example:true}:{}),...(session.deletedAt?{deletedAt:session.deletedAt}:{}),...(thumbnail?{thumbnail}:{})};
}
