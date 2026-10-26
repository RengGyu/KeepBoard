import {randomUUID} from 'node:crypto';
export class ConflictError extends Error{readonly status=409;constructor(){super('다른 창에서 기록이 바뀌었어요. 초안을 유지하고 최신 기록을 확인해 주세요.');}}
export interface ObjectValue{data:Buffer;etag:string;contentType:string}
export interface Objects{
 read(key:string):Promise<ObjectValue|undefined>;
 write(key:string,data:Buffer,etag:string|null,contentType?:string):Promise<string>;
 remove(key:string,etag:string):Promise<void>;
 list(prefix:string):Promise<string[]>;
}
export async function readJSON<T>(o:Objects,key:string){const r=await o.read(key);return r?{value:JSON.parse(r.data.toString()) as T,etag:r.etag}:undefined;}
export const writeJSON=(o:Objects,key:string,value:unknown,etag:string|null)=>o.write(key,Buffer.from(JSON.stringify(value)),etag,'application/json');
/** A test-only independent-client backend; production always uses private Blob. */
export class MemoryObjects implements Objects{
 private values=new Map<string,ObjectValue>();
 async read(k:string){const r=this.values.get(k);return r?{...r,data:Buffer.from(r.data)}:undefined;}
 async write(k:string,data:Buffer,etag:string|null,type='application/octet-stream'){if((this.values.get(k)?.etag??null)!==etag)throw new ConflictError();const next=randomUUID();this.values.set(k,{data:Buffer.from(data),etag:next,contentType:type});return next;}
 async remove(k:string,etag:string){if(this.values.get(k)?.etag!==etag)throw new ConflictError();this.values.delete(k);}
 async list(prefix:string){return [...this.values.keys()].filter(k=>k.startsWith(prefix));}
}
