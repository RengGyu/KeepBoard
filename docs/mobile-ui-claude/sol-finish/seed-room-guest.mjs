import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const [base,invite]=process.argv.slice(2);let cookie='';
async function req(path,method='GET',body){const r=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});for(const c of r.headers.getSetCookie()){const v=c.split(';')[0];cookie=[...cookie.split('; ').filter(x=>x&&!x.startsWith(v.split('=')[0]+'=')),v].join('; ');}const data=await r.json();assert(r.ok,`${method} ${path}: ${r.status}`);return data;}
await req('/api/rooms/device','POST',{});
let view=await req('/api/rooms/join','POST',{invite,name:'합성 손님',color:'#3978bd',clientRequestId:randomUUID()});
const id=view.session.id,ownerId=view.roomAccess.playerId;
const card=(bonus,points)=>({id:randomUUID(),componentId:'development',variant:null,quantity:1,label:'합성 카드',anchor:'',evidenceId:null,region:null,readout:{schema:'splendor-v1',kind:'development',points,bonus,cost:null,requirements:null,color:null,level:1}});
for(const [field,pieces] of [['player.scene',[card('red',2),card('blue',1)]],['reserve.scene',[card('black',9)]]])view=await req(`/api/sessions/${id}`,'PATCH',{answers:[{field,ownerId,value:{version:'game-component-record-v1',pieces}}],expectedRevisions:view.roomAccess.revisions});
const outsider=await fetch(base+`/api/sessions/${id}`);assert.equal(outsider.status,403);
console.log(JSON.stringify({sessionId:id,guestPlayerId:ownerId,guestPublicCount:2,guestPrivateCount:1,outsiderStatus:403,syntheticOnly:true,modelCalls:0},null,2));
