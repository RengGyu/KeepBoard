import {get,put,del,list,BlobPreconditionFailedError} from '@vercel/blob';
import {ConflictError,type Objects} from './objects.ts';
export class BlobObjects implements Objects{
 readonly prefix:string;
 constructor(prefix=process.env.KEEPBOARD_BLOB_PREFIX){if(!prefix||!/^[-a-zA-Z0-9_]{1,100}$/.test(prefix))throw Error('Private storage namespace is required');this.prefix=prefix+'/';}
 pathname(key:string){if(key.startsWith('/')||key.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Invalid private object path');return this.prefix+key;}
 async read(key:string){const r=await get(this.pathname(key),{access:'private',useCache:false});if(!r||!r.stream)return;return {data:Buffer.from(await new Response(r.stream).arrayBuffer()),etag:r.blob.etag,contentType:r.blob.contentType??'application/octet-stream'};}
 async write(key:string,data:Buffer,etag:string|null,contentType='application/octet-stream'){
  try{const r=await put(this.pathname(key),data,{access:'private',addRandomSuffix:false,allowOverwrite:etag!==null,...(etag?{ifMatch:etag}:{}),contentType});return r.etag;}
  catch(e){if(e instanceof BlobPreconditionFailedError||/already exists/i.test((e as Error).message))throw new ConflictError();throw e;}
 }
 async remove(key:string,etag:string){try{await del(this.pathname(key),{ifMatch:etag});}catch(e){if(e instanceof BlobPreconditionFailedError)throw new ConflictError();throw e;}}
 async list(prefix:string){const keys:string[]=[];let cursor:string|undefined;do{const r=await list({prefix:this.pathname(prefix.replace(/\/$/,''))+(prefix.endsWith('/')?'/':''),cursor,limit:1000});keys.push(...r.blobs.map(b=>b.pathname.slice(this.prefix.length)));cursor=r.hasMore?r.cursor:undefined;}while(cursor);return keys;}
}
