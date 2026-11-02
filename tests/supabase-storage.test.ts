import test from 'node:test';import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {SupabaseObjects} from '../server/supabaseObjects.ts';
import {CloudUploads} from '../server/cloudUploads.ts';
import {BlobStore} from '../server/blobStore.ts';
import {ConflictError} from '../server/objects.ts';

function fakeSupabase(){
 const rows=new Map<string,any>(),files=new Map<string,{bytes:Buffer;type:string}>();let isPublic=false;
 const query=(operation:'select'|'insert'|'update'|'delete',payload?:any)=>{
  const filters:((row:any)=>boolean)[]= [];let offset=0,limit=Number.MAX_SAFE_INTEGER;
  const execute=()=>{
   const matching=[...rows.values()].filter(row=>filters.every(f=>f(row)));
   if(operation==='select')return {data:matching.slice(offset,offset+limit).map(row=>({...row})),error:null};
   if(operation==='insert'){if(rows.has(payload.key))return {data:null,error:{code:'23505'}};rows.set(payload.key,{...payload});return {data:{...payload},error:null};}
   if(operation==='update'){for(const row of matching)rows.set(row.key,{...payload});return {data:matching.map(()=>({etag:payload.etag})),error:null};}
   for(const row of matching)rows.delete(row.key);return {data:matching.map(row=>({etag:row.etag})),error:null};
  };
  const q:any={select(){return q;},eq(k:string,v:unknown){filters.push(r=>r[k]===v);return q;},gte(k:string,v:string){filters.push(r=>r[k]>=v);return q;},lt(k:string,v:string){filters.push(r=>r[k]<v);return q;},order(){return q;},range(start:number,end:number){offset=start;limit=end-start+1;return Promise.resolve(execute());},maybeSingle:async()=>{const result=execute();return {...result,data:Array.isArray(result.data)?result.data[0]??null:result.data};},then(resolve:any,reject:any){return Promise.resolve(execute()).then(resolve,reject);}};
  return q;
 };
 const client={
  from:(table:string)=>{assert.equal(table,'keepboard_objects');return {select:()=>query('select'),insert:(v:any)=>query('insert',v),update:(v:any)=>query('update',v),delete:()=>query('delete')};},
  storage:{getBucket:async()=>({data:{public:isPublic},error:null}),from:(bucket:string)=>{assert.equal(bucket,'private');return {
   upload:async(path:string,bytes:Buffer,options:{contentType:string;upsert:boolean})=>{assert.equal(options.upsert,false);if(files.has(path))return {error:{message:'exists'}};files.set(path,{bytes:Buffer.from(bytes),type:options.contentType});return {error:null};},
   download:async(path:string)=>{const file=files.get(path);return file?{data:new Blob([new Uint8Array(file.bytes)]),error:null}:{data:null,error:{message:'missing'}};},
   info:async(path:string)=>{const file=files.get(path);return file?{data:{size:file.bytes.length,contentType:file.type},error:null}:{data:null,error:{message:'missing'}};},
   createSignedUploadUrl:async(path:string)=>({data:{signedUrl:`https://example.supabase.co/storage/v1/object/upload/sign/private/${path}?token=synthetic`,path,token:'synthetic'},error:null})
  };}}
 };
 return {client:client as unknown as SupabaseClient,files,rows,setPublic:(value:boolean)=>{isPublic=value;}};
}
const config={url:'https://example.supabase.co',serviceRoleKey:'synthetic',bucket:'private',prefix:'keepboard'};

test('independent Supabase Objects preserve opaque bytes and 0/null with strong create/update/delete CAS',async()=>{
 const fake=fakeSupabase(),a=new SupabaseObjects(config,fake.client),b=new SupabaseObjects(config,fake.client);
 const initial=await a.write('sessions/s',Buffer.from(JSON.stringify({zero:0,unknown:null})),null,'application/json');
 await assert.rejects(b.write('sessions/s',Buffer.from('duplicate'),null),ConflictError);
 assert.deepEqual(JSON.parse((await b.read('sessions/s'))!.data.toString()),{zero:0,unknown:null});
 const changed=await a.write('sessions/s',Buffer.from('new'),initial,'application/json');
 await assert.rejects(b.write('sessions/s',Buffer.from('stale'),initial),ConflictError);
 await assert.rejects(b.remove('sessions/s',initial),ConflictError);
 assert.equal((await b.read('sessions/s'))!.data.toString(),'new');
 await a.write('sessions/t',Buffer.from('t'),null);assert.deepEqual(await b.list('sessions/'),['sessions/s','sessions/t']);
 await b.remove('sessions/s',changed);assert.equal(await a.read('sessions/s'),undefined);
 const storeA=new BlobStore(a),storeB=new BlobStore(b),session:any={id:'board',updatedAt:'',createdAt:'',snapshots:[],assertions:[],evidence:[],players:[],notes:{}};
 await storeA.saveSession(session);const old=await storeA.getSession('board'),fresh=await storeB.getSession('board');(old as any).notes.public='old';(fresh as any).notes.public='fresh';await storeA.saveSession(old!);await assert.rejects(storeB.saveSession(fresh!),ConflictError);
});

test('signed private photo finalizes only with matching ticket scope and immutable storage bytes',async()=>{
 const fake=fakeSupabase(),objects=new SupabaseObjects(config,fake.client),uploads=new CloudUploads(objects),meta={contentType:'image/png',scope:'player',ownerId:'p',sourceEvidenceId:null,captureTarget:null,label:'photo',width:1,height:1};
 const minted=await uploads.mint('evidence',meta,'session','epoch');assert(minted.signedUrl?.includes('/object/upload/sign/'));assert(!minted.signedUrl?.includes('/object/public/'));
 const ticket=await uploads.ticket(minted.ticket);await assert.rejects(uploads.evidence(minted.ticket,'session','other',meta));await assert.rejects(uploads.evidence(minted.ticket,'session','epoch',{...meta,ownerId:'q'}));
 fake.files.set(ticket.storagePath!,{bytes:Buffer.from('photo bytes'),type:'image/png'});
 const url=await uploads.evidence(minted.ticket,'session','epoch',meta);assert.match(url,/^\/uploads\//);assert.equal((await objects.read(ticket.key))!.data.toString(),'photo bytes');
 assert.equal(await uploads.evidence(minted.ticket,'session','epoch',meta),url);
 const another=new CloudUploads(objects),expired=await another.mint('evidence',meta,'session','epoch');const record=await objects.read('upload-tickets/'+expired.ticket+'.json');const value=JSON.parse(record!.data.toString());value.expires=Date.now()-1;await objects.write('upload-tickets/'+expired.ticket+'.json',Buffer.from(JSON.stringify(value)),record!.etag,'application/json');await assert.rejects(another.evidence(expired.ticket,'session','epoch',meta),/만료/);
 const publicFake=fakeSupabase();publicFake.setPublic(true);await assert.rejects(new SupabaseObjects(config,publicFake.client).createSignedUpload('uploads/x'),/private Storage bucket/);
});
