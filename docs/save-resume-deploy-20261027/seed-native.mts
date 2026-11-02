import {writeFileSync} from 'node:fs';
const base='https://keepboard-kappa.vercel.app',created=[];
async function call(route:string,body?:unknown,method=body===undefined?'GET':'POST'){const r=await fetch(base+route,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(`${r.status} ${JSON.stringify(v)}`);return v;}
for(const game of ['catan','rummikub']){
 const v=await call('/api/sessions',{gamePackId:game==='catan'?'catan-base':game,name:`[검수1027·합성] ${game} 저장·재개`,recordingMode:'simple',players:[{id:'p1',name:'검수 빨강',color:'red'},{id:'p2',name:'검수 파랑',color:'blue'}]}),id=v.session.id;
 created.push({game,id});writeFileSync('docs/save-resume-deploy-20261027/native-created.json',JSON.stringify(created,null,2)+'\n');
 const answers=game==='catan'?[{field:'board.layout',value:{version:2,coverage:'partial',components:[{id:'synthetic-hex',kind:'terrain',variant:'forest',quantity:1,ownerId:null,location:{type:'hex',id:'r3c3'},evidenceId:null,region:null}]}}]:[{field:'rack.scene',ownerId:'p1',value:{version:'rummikub-classic-v1',ownerId:'p1',coverage:'partial',groups:[],loose:[{id:'synthetic-unknown',kind:'number',color:null,number:8,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:'합성 숫자8·색모름'}]}}];
 await call('/api/sessions/'+id,{answers,notes:{public:'합성 공용 메모 · 상자 A',p1:'합성 개인 메모 · 봉투 B'}},'PATCH');
 console.log(JSON.stringify({game,id,modelCalls:0}));
}
