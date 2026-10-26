// Executes only the exact frozen /api/rooms handler with synthetic dependencies.
// No SDK, HTTP, file Store, network, or unrelated routes.
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {MemoryObjects,ConflictError} from '../review-01/source/server/objects.ts';
import {BlobStore} from '../review-01/source/server/blobStore.ts';
import * as rooms from '../review-01/source/server/rooms.ts';
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const root=new URL('../review-room-fix/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
for(const [name,expected]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL(name,root))).digest('hex'),expected);
const source=await readFile(new URL('server/index.ts',root),'utf8');
const start=source.indexOf("  app.post('/api/rooms',async"),end=source.indexOf("  app.post('/api/rooms/preview'",start);
assert(start>=0&&end>start);const route=source.slice(start,end);
assert(route.includes("const stableId=cloud?'room-'+digest([hash,room.createRequestId]):undefined"));
const o=new MemoryObjects(),stores=[new BlobStore(o),new BlobStore(o)];
let arrivals=0,release!:()=>void;const barrier=new Promise<void>(r=>release=r);
for(const store of stores){const original=store.listSessions.bind(store);store.listSessions=async deleted=>{const rows=await original(deleted);if(++arrivals<=2){if(arrivals===2)release();await barrier;}return rows;};}
function request(device:string):any{return {body:{capacity:2,clientRequestId:'same-create',me:{name:'synthetic',color:'#ff0000'}},get:(key:string)=>key==='cookie'?'kb_device='+device:undefined};}
function handler(store:BlobStore){let callback:any;
 const createSession=async(body:any,id?:string)=>{const s:any={id:id??randomUUID(),createdAt:'',updatedAt:'',snapshots:[],assertions:[],evidence:[],players:body.players,notes:{},activity:[],room:body._room};await store.saveSession(s);return {session:s,pack:{}};};
 // createSession narrowed to its actual atomic save; origin/engine rendering not under test.
 new Function('app','roomOrigin','queued','rooms','store','recompute','storedPack','randomUUID','createSession','cloud','digest','ConflictError',ts.transpileModule(route,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)({post:(_path:string,fn:any)=>{callback=fn;}},()=>{},(_key:string,run:()=>unknown)=>run(),rooms,store,(s:any,p:any)=>({session:s,pack:p}),async()=>({}),randomUUID,createSession,true,digest,ConflictError);
 return async(req:any)=>{let status=0,body:any;const res={status(n:number){status=n;return this;},json(value:any){body=value;return this;}};await callback(req,res);return {status,body};};
}
const a=handler(stores[0]),b=handler(stores[1]),reqA=request('a'.repeat(64)),reqB=request('b'.repeat(64));
const same=await Promise.all([a(reqA),b(reqA)]);assert.deepEqual(same.map(x=>x.status),[201,201]);assert.equal(new Set(same.map(x=>x.body.session.id)).size,1);assert.equal((await new BlobStore(o).listSessions(true)).length,1);
const ownA=same[0].body.session,other=await b(reqB);assert.notEqual(other.body.session.id,ownA.id);assert.equal((await new BlobStore(o).listSessions(true)).length,2);assert.throws(()=>rooms.actor(reqB,ownA),rooms.RoomError);assert.equal(rooms.actor(reqA,ownA).role,'host');
// A conflicting stored document is never returned unless BOTH owner and intent match.
const badObjects=new MemoryObjects(),badStore=new BlobStore(badObjects),hash=rooms.deviceHash(reqA),stable='room-'+digest([hash,'same-create']);
const wrong:any={...other.body.session,id:stable};await badStore.saveSession(wrong);
await assert.rejects(handler(badStore)(reqA),ConflictError);
const out={verifiedSHA:manifest.files,exactHandlerExtractSHA256:createHash('sha256').update(route).digest('hex'),checks:[{name:'same intent independent instances',result:'PASS',rooms:1,distinctReturnedIds:1},{name:'different devices same intent are distinct; foreign actor rejected',result:'PASS'},{name:'CAS loser rejects mismatched winner owner',result:'PASS'}],httpExecuted:false,realAIcalls:0,networkCalls:0,scopeLimit:'Actual route callback; existing frozen CAS/rooms modules; narrowed createSession save, no origin/engine rendering/HTTP SDK test'};
await writeFile(new URL('./room-fix-results.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
