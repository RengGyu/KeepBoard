// Synthetic, isolated probe for docs/game-state-review. Fresh temp Store, ephemeral port, no AI, no real data.
// Run: env -u OPENAI_API_KEY -u GEMINI_API_KEY -u GOOGLE_API_KEY npx tsx docs/game-state-review/synthetic/rummikub-privacy-probe.ts
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../../../server/index.ts';
import {Store} from '../../../server/store.ts';

const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-review-rummikub-'));
const store=new Store(root),app=await createApp({store});
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const address=server.address();if(!address||typeof address==='string')throw new Error('no port');
const base=`http://127.0.0.1:${address.port}`;
const call=async(route:string,method='GET',body?:unknown,token?:string)=>{const r=await fetch(base+route,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{'X-KeepBoard-Private-Token':token}:{})},body:body===undefined?undefined:JSON.stringify(body)});let json:any=null;try{json=await r.json();}catch{}return {status:r.status,body:json};};
const results:Record<string,unknown>={};
const tile=(id:string,color:string,number:number)=>({id,kind:'number',color,number,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:''});
const rack=(owner:string,marker:number)=>({version:'rummikub-classic-v1',ownerId:owner,coverage:'full',groups:[{id:'row-1',label:'',tiles:[tile(`t-${owner}-a`,'red',marker),tile(`t-${owner}-b`,'blue',13)]}],loose:[]});
try{
 const players=[{id:'p1',name:'합성1',color:'#c2232f'},{id:'p2',name:'합성2',color:'#2867b2'},{id:'p3',name:'합성3',color:'#e39a14'}];
 const created=await call('/api/sessions','POST',{gamePackId:'rummikub',name:'합성 루미큐브 검토',players,recordingMode:'simple'});
 if(created.status>=300)throw new Error('create failed '+created.status+JSON.stringify(created.body));
 const id=created.body.session.id,prefix=`/api/sessions/${id}`;
 // p1 records a private rack with a distinctive tile value (11) — no PIN yet.
 const w1=await call(prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:rack('p1',11)},{field:'opened',ownerId:'p1',value:true}]});
 results.p1RackWrite=w1.status;
 const noPinView=await call(prefix);
 const text=JSON.stringify(noPinView.body);
 results['S1 default (no PIN): anonymous GET session exposes p1 rack tile']=text.includes('t-p1-a');
 results['S1 default (no PIN): /api/sessions list exposes p1 rack tile']=JSON.stringify((await call('/api/sessions')).body).includes('t-p1-a');
 // Another viewer (no token) overwrites p1's private rack while no PIN is set.
 const overwrite=await call(prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p1',value:rack('p1',2)}]});
 results['S2 default (no PIN): anonymous PATCH can overwrite p1 rack (status)']=overwrite.status;
 // Public count of tiles on each rack: does any public field exist?
 const pack=noPinView.body.pack;
 results['S3 public rack tile-count field declared in runtime pack']=pack.fields.filter((f:any)=>/count|개수|수량/.test(f.key+f.label)).map((f:any)=>f.key);
 results['S3 runtime pack field keys']=pack.fields.map((f:any)=>`${f.key}:${f.scope}/${f.visibility}`);
 // PINs for p1 and p2; p1 locked view.
 for(const [owner,pin] of [['p1','1357'],['p2','2468']] as const){results[`pin ${owner}`]=(await call(prefix+`/privacy/${owner}`,'PUT',{enabled:true,pin})).status;}
 await call(prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p2',value:rack('p2',9)}]},undefined).then(r=>results['S4 locked p2 rack write without token (status)']=r.status);
 const t1=(await call(prefix+'/privacy/p1/unlock','POST',{pin:'1357'})).body.token;
 const t2=(await call(prefix+'/privacy/p2/unlock','POST',{pin:'2468'})).body.token;
 const p2write=await call(prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p2',value:rack('p2',9)}]},t2);results.p2RackWriteWithToken=p2write.status;
 const locked=JSON.stringify((await call(prefix)).body);
 results['S5 PIN locked: anonymous GET hides p1/p2 rack']=!locked.includes('t-p1-a')&&!locked.includes('t-p2-a');
 results['S5 PIN locked: p1 opened (declared public) still visible']=locked.includes('"field":"opened"');
 const asP1=JSON.stringify((await call(prefix,'GET',undefined,t1)).body);
 results['S6 p1 token sees own rack and not p2 rack']=asP1.includes('t-p1-a')&&!asP1.includes('t-p2-a');
 // Activity log content after edits.
 const acts=(await call(prefix)).body.session.activity.map((a:any)=>a.message);
 results['S7 activity messages visible while locked']=acts;
 // Save then resume with each single token (two protected owners).
 results.commit=(await call(prefix+'/commit','POST',{allowIncomplete:true},t1)).status;
 results['S8 resume with p1 token only (2 protected owners)']=(await call(prefix+'/resume','POST',{},t1)).status;
 results['S8 resume with p2 token only (2 protected owners)']=(await call(prefix+'/resume','POST',{},t2)).status;
 results['S8 resume with no token']=(await call(prefix+'/resume','POST',{})).status;
 // Next turn while locked keeps private racks (expected).
 results['S9 next-turn status (public, locked)']=(await call(prefix+'/next-turn','POST',{playerId:'p2'})).status;
 const afterTurn=JSON.stringify((await call(prefix,'GET',undefined,t1)).body);
 results['S9 p1 rack kept after next-turn']=afterTurn.includes('t-p1-a');
 // Share-link style: a viewer adds ?player=p3 (no PIN) — p3 rack is readable by anyone.
 await call(prefix,'PATCH',{answers:[{field:'rack.scene',ownerId:'p3',value:rack('p3',5)}]});
 results['S10 p3 (no PIN) rack readable by anonymous while p1/p2 locked']=JSON.stringify((await call(prefix)).body).includes('t-p3-a');
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify(results,null,1));
