import {mkdtemp,writeFile} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
const project=process.cwd(),root=await mkdtemp(path.join(os.tmpdir(),'keepboard-rummi-board-'));
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','DEEPSEEK_API_KEY','AI_PROVIDER','AI_MODEL','AI_BASE_URL','AI_GATEWAY_URL','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS'])delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';process.chdir(root);
const {createApp}=await import('../../../server/index.ts');const {Store}=await import('../../../server/store.ts');process.chdir(project);
const app=await createApp({store:new Store(root,path.join(project,'public')),ui:true});
const server=app.listen(4401,'127.0.0.1');await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail)});
const base='http://127.0.0.1:4401';async function call(route:string,body:unknown){const r=await fetch(base+route,{method:route.includes('/sessions/')?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`fixture ${r.status}`);return r.json();}
const v=await call('/api/sessions',{name:'[합성 검수] 루미큐브 제품',gamePackId:'rummikub',players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'민수',color:'blue'}]});
const tile=(id:string,color:string,number:number,kind='number')=>({id,kind,color,number,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:''});
const scene=(ownerId:string|null,groups:unknown[])=>({version:'rummikub-classic-v1',ownerId,coverage:'partial',groups,loose:[]});
const table=scene(null,[{id:'run13',label:'긴 묶음',tiles:Array.from({length:13},(_,i)=>tile(`t${i}`,'blue',i+1))},{id:'set7',label:'네 색',tiles:['red','blue','black','orange'].map((c,i)=>tile(`c${i}`,c,7))},{id:'joker',label:'조커 묶음',tiles:[tile('a','black',5),tile('b','black',6),tile('j','black',7,'joker')]}]);
const mine=scene('p1',[{id:'row1',label:'첫째 줄',tiles:Array.from({length:7},(_,i)=>tile(`m${i}`,['red','blue','black','orange'][i%4],i+1))},{id:'row2',label:'둘째 줄',tiles:Array.from({length:7},(_,i)=>tile(`n${i}`,['orange','black','blue','red'][i%4],i+7))}]);
const other=scene('p2',[{id:'secret-row',label:'다른 사람 고유 줄',tiles:[tile('other','orange',13)]}]);
await call('/api/sessions/'+v.session.id,{answers:[{field:'table.scene',value:table},{field:'rack.scene',ownerId:'p1',value:mine},{field:'rack.scene',ownerId:'p2',value:other}]});
const info={url:base+'/?session='+v.session.id,sessionId:v.session.id,synthetic:true,dataDir:root,pinFixture:'0007',ai:false};await writeFile(path.join(project,'docs/rummikub-board-redesign/verification/preview.json'),JSON.stringify(info,null,2)+'\n');console.log(JSON.stringify(info));
