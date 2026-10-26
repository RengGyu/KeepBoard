import {mkdtemp,readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const project=process.cwd(),root=await mkdtemp(path.join(os.tmpdir(),'kb-board-visuals-'));
for(const key of ['OPENAI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY','DEEPSEEK_API_KEY','AI_PROVIDER','AI_MODEL','AI_BASE_URL','AI_GATEWAY_URL','KEEPBOARD_AI_GATEWAY_URL','KEEPBOARD_AI_ALIAS'])delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=root;process.env.NODE_ENV='production';process.chdir(root);const {createApp}=await import('../../server/index.ts');const {Store}=await import('../../server/store.ts');process.chdir(project);
const app=await createApp({store:new Store(root,path.join(project,'public')),ui:false});const {createServer}=await import('vite');const vite=await createServer({root:project,envDir:false,server:{middlewareMode:true,hmr:false},appType:'spa'});app.use(vite.middlewares);
const server=app.listen(4402,'127.0.0.1');await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail)});
async function call(route:string,method:string,body:unknown){const r=await fetch('http://127.0.0.1:4402'+route,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('fixture '+r.status);return r.json();}
const fixtures=[];
for(const gameId of ['blokus','carcassonne','wingspan','splendor','monopoly','pandemic']){
 const view=await call('/api/sessions','POST',{name:'[합성 시각검수] '+gameId,gamePackId:gameId,players:[{id:'p1',name:'하나',color:'#c34b3d'},{id:'p2',name:'둘',color:'#2872ad'}]});
 const binding=view.pack.runtime.fieldBindings.find((b:any)=>b.editor==='component-catalog'&&b.visibility==='public'&&b.areaIds.length);
 const mapping=JSON.parse(await readFile(path.join(project,'public/game-art/games/'+gameId+'/mapping.json'),'utf8'));
 const componentId=binding.componentIds.find((id:string)=>!['board','container','deck'].includes(mapping.components.find((c:any)=>c.component_id===id)?.kind))??binding.componentIds[0];
 const variant=mapping.components.find((c:any)=>c.component_id===componentId)?.variants[0]?.name??null;
 const ownerId=binding.scope==='player'?'p1':undefined;
 const piece={id:'synthetic-piece-a',componentId,variant,quantity:null,label:'검수 조각',anchor:'원래 위치 메모',evidenceId:null,region:null};
 const record={version:'game-component-record-v1',pieces:[piece,{...piece,id:'synthetic-piece-b',label:'기록된 조각',quantity:0,placement:{areaId:binding.areaIds[0],x:.75,y:.4,rotation:0}}]};
 const answers:any[]=[{field:binding.key,ownerId,value:record}];
 if(gameId==='wingspan'){const hand=view.pack.runtime.fieldBindings.find((b:any)=>b.visibility==='owner'&&b.editor==='component-catalog');for(const id of ['p1','p2'])answers.push({field:hand.key,ownerId:id,value:{version:record.version,pieces:[{...piece,id:'private-'+id,componentId:hand.componentIds[0],variant:null,label:'비밀-'+id}]}});}
 await call('/api/sessions/'+view.session.id,'PATCH',{answers});
 fixtures.push({gameId,sessionId:view.session.id,field:binding.key,ownerId,areaId:binding.areaIds[0],componentId,url:'http://127.0.0.1:4402/?session='+view.session.id+(ownerId?'&player='+ownerId:'')});
}
const info={base:'http://127.0.0.1:4402',dataDir:root,ai:false,synthetic:true,dev:true,fixtures};await writeFile(path.join(project,'docs/game-board-visuals/preview.json'),JSON.stringify(info,null,2)+'\n');console.log(JSON.stringify(info));
