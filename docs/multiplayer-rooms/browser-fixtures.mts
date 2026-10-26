import {writeFile} from 'node:fs/promises';
import {emptyRummikub,createRummikubTile} from '../../shared/rummikub.ts';
const base='http://127.0.0.1:4403';let cookie='';
async function call(route:string,method='GET',body?:unknown){const r=await fetch(base+route,{method,headers:{Origin:base,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const data=await r.json();if(!r.ok)throw new Error(`Synthetic fixture ${r.status}: ${data.error}`);return data;}
await call('/api/rooms/device','POST',{});const view=await call('/api/rooms','POST',{gamePackId:'rummikub',name:'[합성] 참가 검수 방',capacity:3,me:{name:'API 방장',color:'#c65d4b'},clientRequestId:crypto.randomUUID()});
const id=view.session.id,host=view.roomAccess.playerId,scene=emptyRummikub();scene.groups=[{id:'public-group',label:'공용 합성 묶음',tiles:[1,7,13].map(n=>({...createRummikubTile('public-'+n),kind:'number' as const,color:'blue' as const,number:n}))}];
await call('/api/sessions/'+id,'PATCH',{answers:[{field:'table.scene',value:scene}],notes:{[host]:'다른 사람 개인 메모 · 노출 금지'},expectedRevisions:{public:0,[host]:0}});
await call('/api/sessions/'+id+'/commit','POST',{scope:'public',allowIncomplete:true,expectedRevisions:{public:1}});
const invite=await call('/api/rooms/'+id+'/invite');const info={synthetic:true,sessionId:id,hostId:host,code:invite.code,link:base+'/#join='+invite.token};await writeFile(new URL('./browser-fixtures.json',import.meta.url),JSON.stringify(info,null,2)+'\n');console.log(JSON.stringify(info));
