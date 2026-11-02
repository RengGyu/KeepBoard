import {randomUUID} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {ConflictError,type Objects} from './objects.ts';

interface Row{key:string;etag:string;content_type:string;data_base64:string|null;storage_path:string|null;size_bytes:number}
interface Config{url:string;serviceRoleKey:string;bucket:string;prefix:string}
const MAX_FILE_BYTES=50_000_000;
const validKey=(key:string)=>!key.startsWith('/')&&key.split('/').every(segment=>!!segment&&segment!=='.'&&segment!=='..');
const conflict=(error:{code?:string;status?:number}|null)=>error?.code==='23505'||error?.status===409;

export class SupabaseObjects implements Objects{
 readonly prefix:string;
 readonly bucket:string;
 private client:SupabaseClient;
 private privateBucket?:Promise<void>;
 constructor(config:Config,client?:SupabaseClient){
  if(!/^https:\/\/[^/]+$/.test(config.url)||!config.serviceRoleKey||!/^[-a-zA-Z0-9_]{1,100}$/.test(config.prefix)||!/^[-a-zA-Z0-9_]{1,100}$/.test(config.bucket))throw Error('Supabase private storage configuration is incomplete');
  this.prefix=config.prefix+'/';this.bucket=config.bucket;
  this.client=client??createClient(config.url,config.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
 }
 static fromEnv(){return new SupabaseObjects({url:process.env.SUPABASE_URL??'',serviceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY??'',bucket:process.env.KEEPBOARD_SUPABASE_BUCKET??'',prefix:process.env.KEEPBOARD_BLOB_PREFIX??''});}
 private key(key:string){if(!validKey(key))throw Error('Invalid private object path');return this.prefix+key;}
 private async ensurePrivateBucket(){this.privateBucket??=(async()=>{const {data,error}=await this.client.storage.getBucket(this.bucket);if(error||!data||data.public)throw Error('Supabase private Storage bucket is unavailable');})();return this.privateBucket;}
 private async row(key:string){const {data,error}=await this.client.from('keepboard_objects').select('key,etag,content_type,data_base64,storage_path,size_bytes').eq('key',this.key(key)).maybeSingle();if(error)throw error;return data as Row|null;}
 private async storageBytes(path:string){await this.ensurePrivateBucket();const {data,error}=await this.client.storage.from(this.bucket).download(path);if(error||!data)throw error??Error('Private photo is missing');return Buffer.from(await data.arrayBuffer());}
 async read(key:string){const row=await this.row(key);if(!row)return;const data=row.storage_path?await this.storageBytes(row.storage_path):Buffer.from(row.data_base64??'','base64');if(data.length!==row.size_bytes)throw Error('Private object size does not match metadata');return {data,etag:row.etag,contentType:row.content_type};}
 private async putRow(row:Row,etag:string|null){
  if(etag===null){const {error}=await this.client.from('keepboard_objects').insert(row);if(error){if(conflict(error))throw new ConflictError();throw error;}return row.etag;}
  const {data,error}=await this.client.from('keepboard_objects').update(row).eq('key',row.key).eq('etag',etag).select('etag').maybeSingle();
  if(error)throw error;if(!data)throw new ConflictError();return row.etag;
 }
 async write(key:string,data:Buffer,etag:string|null,contentType='application/octet-stream'){
  const full=this.key(key),next=randomUUID(),isImage=contentType.startsWith('image/');let storagePath:string|null=null;
  if(isImage){await this.ensurePrivateBucket();if(data.length>MAX_FILE_BYTES)throw Error('Supabase Free 사진 한도 50MB를 넘었습니다.');storagePath=this.prefix+'objects/'+randomUUID();const result=await this.client.storage.from(this.bucket).upload(storagePath,data,{contentType,upsert:false});if(result.error)throw result.error;}
  return this.putRow({key:full,etag:next,content_type:contentType,data_base64:isImage?null:data.toString('base64'),storage_path:storagePath,size_bytes:data.length},etag);
 }
 async remove(key:string,etag:string){const {data,error}=await this.client.from('keepboard_objects').delete().eq('key',this.key(key)).eq('etag',etag).select('etag').maybeSingle();if(error)throw error;if(!data)throw new ConflictError();}
 async list(prefix:string){if(prefix)this.key(prefix.replace(/\/$/,''));const full=this.prefix+prefix,keys:string[]=[];for(let start=0;;start+=1000){const {data,error}=await this.client.from('keepboard_objects').select('key').gte('key',full).lt('key',full+'\uffff').order('key').range(start,start+999);if(error)throw error;const rows=data??[];keys.push(...rows.filter(row=>row.key.startsWith(full)).map(row=>row.key.slice(this.prefix.length)));if(rows.length<1000)break;}return keys;}
 async createSignedUpload(key:string){await this.ensurePrivateBucket();this.key(key);const path=this.prefix+'direct/'+randomUUID();const {data,error}=await this.client.storage.from(this.bucket).createSignedUploadUrl(path);if(error||!data)throw error??Error('Unable to sign private upload');return {path,signedUrl:data.signedUrl};}
 async inspectUpload(path:string,contentType:string,maxBytes:number){await this.ensurePrivateBucket();if(!path.startsWith(this.prefix+'direct/'))throw Error('Invalid private upload path');const {data,error}=await this.client.storage.from(this.bucket).info(path);if(error||!data)throw error??Error('Uploaded file is missing');const size=Number(data.size);if(!Number.isSafeInteger(size)||size<=0||size>maxBytes||size>MAX_FILE_BYTES||data.contentType!==contentType)throw Error('업로드 원본 형식이나 크기를 확인하세요.');return size;}
 async attachUpload(key:string,path:string,contentType:string,size:number){const full=this.key(key);if(!path.startsWith(this.prefix+'direct/'))throw Error('Invalid private upload path');const prior=await this.row(key);if(prior){if(prior.storage_path===path&&prior.content_type===contentType&&prior.size_bytes===size)return;throw new ConflictError();}await this.putRow({key:full,etag:randomUUID(),content_type:contentType,data_base64:null,storage_path:path,size_bytes:size},null);}
}
