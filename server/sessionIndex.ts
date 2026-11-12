import {randomUUID} from 'node:crypto';
import type {Session} from '../shared/types';
import {sessionSummary,type SessionSummary} from '../shared/sessionSummary';
export type SessionAccess=Pick<Session,'id'|'captureEpoch'> & {players:{id:string}[];room?:Session['room']};
interface Row{summary:SessionSummary;access:SessionAccess;memberHashes?:string[]}
interface Pending{version:string;writers:string[]}
interface Index{version:1;ready:boolean;rows:Record<string,Row>;pending:Record<string,string|Pending>}
const pending=(index:Index,id:string):Pending|undefined=>{const p=index.pending[id];return typeof p==='string'?{version:p,writers:[p]}:p;};
interface IO{read():Promise<Index|undefined>;mutate(f:(index:Index)=>void):Promise<void>;sessions():Promise<Session[]>;session(id:string):Promise<Session|undefined>}
function row(s:Session):Row{
 const r=s.room as Session['room']&{members?:{hash:string;playerId:string;role:'host'|'member'}[]};
 return {summary:sessionSummary(s),access:{id:s.id,captureEpoch:s.captureEpoch,players:(s.players??[]).map(p=>({id:p.id})),...(r?{room:{version:r.version,capacity:r.capacity,hostPlayerId:r.hostPlayerId,revisions:r.revisions,members:r.members} as Session['room']}:{})},...(r?{memberHashes:(r.members??[]).map(m=>m.hash)}:{})};
}
export const emptySessionIndex=():Index=>({version:1,ready:false,rows:{},pending:{}});
/** Write-ahead pending IDs prevent stale summaries/access from hiding a committed source write. */
export class SessionIndex{
 constructor(private io:IO){}
 async prepare(){const existing=await this.io.read();if(existing?.ready)return existing;const sessions=await this.io.sessions();await this.io.mutate(index=>{for(const s of sessions)index.rows[s.id]??=row(s);index.ready=true;});return (await this.io.read())!;}
 async begin(id:string,token:string){await this.prepare();await this.io.mutate(index=>{index.pending[id]={version:randomUUID(),writers:[...(pending(index,id)?.writers??[]),token]};});}
 async finish(id:string,token:string,_capturedSession:Session|undefined){
  let remaining=true;
  await this.io.mutate(index=>{const p=pending(index,id);if(!p?.writers.includes(token))return;const writers=p.writers.filter(t=>t!==token);index.pending[id]={version:randomUUID(),writers};remaining=writers.length>0;});
  // A captured pre-failure session is never authority for finalization. The last writer reads the current source after dropping its own in-flight token.
  if(!remaining){const index=await this.io.read();if(index)await this.current(id,index);}
 }
 private async current(id:string,index:Index){
  const p=pending(index,id);if(!p)return index.rows[id];
  const s=await this.io.session(id),committed=s?.storageRevision&&p.writers.includes(s.storageRevision)?s.storageRevision:undefined,writers=committed?p.writers.filter(t=>t!==committed):p.writers;
  // A committed source proves its own writer cannot write again. Other active writers remain dirty. Version CAS also catches a writer that started AND finished during this source read.
  if(!writers.length||committed)await this.io.mutate(latest=>{const current=pending(latest,id);if(current?.version!==p.version)return;if(writers.length)latest.pending[id]={version:randomUUID(),writers};else{if(s)latest.rows[id]=row(s);else delete latest.rows[id];delete latest.pending[id];}}).catch(()=>undefined);
  return s?row(s):undefined;
 }
 async access(id:string){const index=await this.prepare();return (await this.current(id,index))?.access;}
 async list(includeDeleted:boolean,hidden:Record<string,{deletedAt:string}>,memberHash?:string){
  const index=await this.prepare(),ids=new Set([...Object.keys(index.rows),...Object.keys(index.pending)]),rows=await Promise.all([...ids].map(id=>this.current(id,index)));
  return rows.filter((r):r is Row=>!!r&&(!r.summary.room||!!memberHash&&!!r.memberHashes?.includes(memberHash))&&(includeDeleted||!hidden[r.summary.id])).map(r=>{const {deletedAt:_old,...summary}=r.summary;return {...summary,...(hidden[r.summary.id]?{deletedAt:hidden[r.summary.id].deletedAt}:{})};}).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }
 async hidden(ids:string[],metadata:Record<string,{deletedAt:string}>){await this.io.mutate(index=>{for(const id of ids)if(index.rows[id]){if(metadata[id])index.rows[id].summary.deletedAt=metadata[id].deletedAt;else delete index.rows[id].summary.deletedAt;}});}
}
