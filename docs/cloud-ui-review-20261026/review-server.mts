// Usage: npx tsx docs/cloud-ui-review-20261026/review-server.mts [--no-gemini] > review-server.log  (port 4400, PORT to change)
// Synthetic review server. Never opens an existing Store, never calls a real AI: the Gemini reader is a local fixture.
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const R=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
const root=await mkdtemp(path.join(os.tmpdir(),'kb-review-'));
process.env.KEEPBOARD_DATA_DIR=root;
if(process.argv.includes('--prod'))process.env.NODE_ENV='production';
for(const k of ['GEMINI_API_KEY','KEEPBOARD_GEMINI_GAME_API_KEY_FILE','KEEPBOARD_AI_GATEWAY_URL','OPENAI_API_KEY'])delete process.env[k];
const {createApp}=await import(R+'/server/index.ts');
const {Store}=await import(R+'/server/store.ts');
const {GeminiGameReader}=await import(R+'/server/ai/geminiGameReader.ts');
const {createRummikubTile,emptyRummikub,rummikubAnswers}=await import(R+'/shared/rummikub.ts');
const geminiOn=!process.argv.includes('--no-gemini');
class FixtureGemini extends GeminiGameReader{
 async status(){return geminiOn?{kind:'gemini-game-observation-v1' as const,available:true,cloudSupported:true as const,identity:this.identity}:{kind:'gemini-game-observation-v1' as const,available:false,cloudSupported:true as const,identity:null,reason:'합성 검수 서버: Gemini 키 미연결'};}
 async read(request:any,definition:any){
  await new Promise(r=>setTimeout(r,600));
  const comp=request.allowedComponents[0],props=request.allowedPropertyIds[comp]??[];
  const properties:any={};props.forEach((id:string,i:number)=>{properties[id]=i===0?{state:'unknown',value:null,reason:'occluded'}:{state:'unknown',value:null,reason:'unreadable'};});
  if(definition.gameId==='catan')return {raw:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'t1',imageIndex:0,panelRef:null,componentId:'terrain',bbox:{x:.1,y:.1,width:.3,height:.3},face:'front',quantity:1,rotationDegrees:null,properties:{variant:{state:'observed',value:'forest'}},referenceCandidates:[]},{ref:'t2',imageIndex:0,panelRef:null,componentId:'terrain',bbox:{x:.5,y:.4,width:.2,height:.2},face:'front',quantity:1,rotationDegrees:null,properties:{variant:{state:'unknown',value:null,reason:'occluded'}},referenceCandidates:[]}]},timings:{readerMs:1}} as any;
  return {raw:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'g1',imageIndex:0,panelRef:null,componentId:comp,bbox:{x:.2,y:.2,width:.2,height:.2},face:'front',quantity:2,rotationDegrees:null,properties,referenceCandidates:[]},{ref:'g2',imageIndex:0,panelRef:null,componentId:comp,bbox:{x:.5,y:.5,width:.2,height:.2},face:'front',quantity:null,rotationDegrees:null,properties:{},referenceCandidates:[]}]},timings:{readerMs:1}} as any;
 }
}
const port=Number(process.env.PORT??4400);
const app=await createApp({store:new Store(root),ui:true,geminiReader:new FixtureGemini()} as any);
const server=app.listen(port,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const base=`http://127.0.0.1:${port}`;let revision:string|undefined;
async function call(route:string,method:string,body?:unknown){const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(revision?{'X-KeepBoard-Revision':revision}:{})},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();if(!r.ok)throw new Error(route+' '+t);const v=JSON.parse(t);if(v.session?.storageRevision)revision=v.session.storageRevision;return v;}
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=';
const out:any={root,base};
// Catan: explicit example board, saved.
{revision=undefined;const v=await call('/api/sessions','POST',{name:'카탄 · 합성 검수',example:true});const p='/api/sessions/'+v.session.id;
 await call(p+'/analyze','POST',{purpose:'capture'}).catch(e=>console.error('analyze',e.message));
 const players=v.session.players;
 await call(p,'PATCH',{answers:[{field:'currentPlayer',value:players[1].id}],notes:{public:'합성 예시. 도둑은 사막.',[players[0].id]:'합성 개인 메모'}});
 await call(p+'/commit','POST',{allowIncomplete:true});out.catan=v.session.id;out.catanPlayer=players[0].id;}
// Rummikub: as the existing preview fixture.
{revision=undefined;const v=await call('/api/sessions','POST',{gamePackId:'rummikub',name:'루미큐브 · 합성 검수'});const p='/api/sessions/'+v.session.id;
 const table=emptyRummikub(),rack=emptyRummikub('red');table.coverage='partial';
 table.groups=[{id:'run',label:'파랑 런',tiles:[5,6,7,8].map(n=>({...createRummikubTile(`blue-${n}`),kind:'number',color:'blue',number:n}))},{id:'set',label:'7 세트',tiles:['red','black','orange'].map(c=>({...createRummikubTile(`${c}-7`),kind:'number',color:c,number:7}))}];
 table.loose=[{...createRummikubTile('joker'),kind:'joker'}];
 rack.groups=[{id:'rack-row',label:'받침대 첫 줄',tiles:[{...createRummikubTile('rack-black-13'),kind:'number',color:'black',number:13},createRummikubTile('rack-unknown')]}];
 const pl=v.session.players;
 await call(p,'PATCH',{answers:[...rummikubAnswers(table),...rummikubAnswers(rack,pl[0].id),{field:'currentPlayer',value:pl[1].id}],notes:{public:'합성 예시입니다.'}});
 await call(p+'/commit','POST',{allowIncomplete:true});out.rummikub=v.session.id;out.rummikubPlayer=pl[0].id;}
// Azul: generic game with a shared offer and public personal boards.
{revision=undefined;const v=await call('/api/sessions','POST',{gamePackId:'azul',name:'아줄 · 합성 검수'});const p='/api/sessions/'+v.session.id;const pl=v.session.players;
 const piece=(id:string,componentId:string,quantity:number|null,label='',variant:string|null=null)=>({id,componentId,variant,quantity,label,anchor:'',evidenceId:null,region:null});
 await call(p,'PATCH',{answers:[
  {field:'offer.scene',value:{version:'game-component-record-v1',pieces:[piece('f1','tiles',4,'공장 1'),piece('f2','tiles',3,'공장 2'),piece('c','tiles',null,'중앙'),piece('first','first',1,'선 표식')]}},
  {field:'pattern.scene',ownerId:pl[0].id,value:{version:'game-component-record-v1',pieces:[piece('r1','tiles',1,'1줄'),piece('r3','tiles',2,'3줄')]}},
  {field:'turn',value:pl[0].name}]});
 await call(p+'/evidence','POST',{scope:'public',dataUrl:png,label:'합성 공용 사진'});
 await call(p+'/commit','POST',{allowIncomplete:true});out.azul=v.session.id;out.azulPlayer=pl[0].id;}
console.log(JSON.stringify(out));
for(const s of ['SIGTERM','SIGINT'])process.on(s,()=>{server.close();server.closeAllConnections();process.exit(0);});
