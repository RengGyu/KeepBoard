import {createHash} from 'node:crypto';
import type {Session} from '../shared/types';
type Link={path:(string|number)[];id:string};
interface Block{value:any;links:Link[]}
interface StoredSession{format:'keepboard/session-storage-v1';root:Block;objects:Record<string,Block>}
const internKeys=new Set(['observationReceipts','hostedWire','nativeWire','providerResponse','scanBundle','profile','restorationProfile']);
/** Storage-only reference table. Paths live outside user JSON: literal $ref/format values never become references. */
export function encodeSession(session:Session):StoredSession{
 const objects:Record<string,Block>={};
 function block(value:any):Block{
  const links:Link[]=[];
  function visit(v:any,path:(string|number)[]):any{
   if(v===null||typeof v!=='object')return v;
   if(Array.isArray(v))return v.map((x,i)=>visit(x,[...path,i]));
   return Object.fromEntries(Object.entries(v).map(([key,child])=>{
    if(internKeys.has(key)&&child!==null&&child!==undefined){
     const id=createHash('sha256').update(JSON.stringify(child)).digest('hex');
     if(!objects[id])objects[id]=block(child);
     links.push({path:[...path,key],id});return [key,null];
    }
    return [key,visit(child,[...path,key])];
   }));
  }
  return {value:visit(value,[]),links};
 }
 const root=block(session);return {format:'keepboard/session-storage-v1',root,objects};
}
export function decodeSession(value:unknown):Session{
 if(!value||typeof value!=='object'||((value as StoredSession).format!=='keepboard/session-storage-v1'||Object.keys(value).sort().join(',')!=='format,objects,root'))return value as Session;
 const stored=value as StoredSession,active=new Set<string>();
 function expand(b:Block):any{
  if(!b||!Array.isArray(b.links))throw Error('Invalid session storage block');
  const out=structuredClone(b.value);
  for(const link of b.links){
   if(!link.path.length||!Object.hasOwn(stored.objects,link.id)||active.has(link.id))throw Error('Invalid session storage reference');
   let parent=out;for(const key of link.path.slice(0,-1)){if(!parent||!Object.hasOwn(parent,key))throw Error('Invalid session storage path');parent=parent[key];}
   const key=link.path.at(-1)!;if(!parent||!Object.hasOwn(parent,key)||parent[key]!==null)throw Error('Invalid session storage target');
   active.add(link.id);const next=expand(stored.objects[link.id]);active.delete(link.id);
   Object.defineProperty(parent,key,{value:next,writable:true,enumerable:true,configurable:true});
  }
  return out;
 }
 return expand(stored.root);
}
