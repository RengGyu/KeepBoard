// Synthetic readings for persistence checks only; no model call.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {put} from '@vercel/blob/client';
import {emptyGameReadout,setReadoutValue} from '../../shared/readouts/registry.ts';
const base='https://keepboard-kappa.vercel.app',id='f2c013b3-01c0-4415-bd9b-5d2f2b264242',p='/api/sessions/'+id;
async function call(route:string,body?:unknown,method=body===undefined?'GET':'POST') {const r=await fetch(base+route,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(`${r.status} ${route} ${JSON.stringify(v)}`);return v;}
const v=await call(p);if(v.session.name!=='[검수1027·합성] 수정 없이 저장·재개')throw Error('wrong test board');
const bytes=readFileSync('/private/tmp/keepboard-service-all-games-20261027-photos/carcassonne/4dba02af3eb3ceccb8f095692b6c1c1a4cd96306bd6719f5f74b785498b2795c.jpg');
const meta={scope:'public',areaId:'map',label:'검수 원사진 · 아래 수치는 합성 입력이며 사진 판독 결과 아님'},t=await call(p+'/upload-ticket',{...meta,contentType:'image/jpeg'}),token=await call(p+'/blob-token',{type:'blob.generate-client-token',payload:{pathname:t.pathname,clientPayload:t.ticket}});
await put(t.pathname,new Blob([bytes],{type:'image/jpeg'}),{access:'private',token:token.clientToken,contentType:'image/jpeg'});
const uploaded=await call(p+'/evidence',{...meta,uploadTicket:t.ticket}),eid=uploaded.createdEvidenceId;
let readout=emptyGameReadout(v.pack,'tiles');readout=setReadoutValue(v.pack,readout,'face','front');readout=setReadoutValue(v.pack,readout,'shields',0);
const pieces=[{id:'synthetic-zero',componentId:'tiles',variant:null,quantity:1,label:'합성 표본 A · 0과 ? 보존',anchor:'검수 배치 왼쪽',evidenceId:eid,region:{x:.1,y:.2,width:.2,height:.2},placement:{areaId:'map',x:.3,y:.4,rotation:90},readout},{id:'synthetic-unknown',componentId:'tiles',variant:null,quantity:null,label:'합성 표본 B · 미확인',anchor:'검수 배치 오른쪽',evidenceId:eid,region:{x:.5,y:.2,width:.2,height:.2},placement:{areaId:'map',x:.65,y:.4,rotation:0},readout:emptyGameReadout(v.pack,'tiles')}];
await call(p,{assertions:[{field:'map.scene',value:{version:'game-component-record-v1',pieces}}]},'PATCH');
writeFileSync('docs/save-resume-deploy-20261027/seed-result.json',JSON.stringify({id,synthetic:true,modelCalls:0,photoSHA:createHash('sha256').update(bytes).digest('hex'),evidenceId:eid,pieces},null,2)+'\n');
console.log(JSON.stringify({id,evidenceId:eid,pieces:pieces.length,modelCalls:0}));
