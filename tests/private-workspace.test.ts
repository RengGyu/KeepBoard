import test from 'node:test';
import assert from 'node:assert/strict';
import { catanPack, createExampleAssertions } from '../gamepacks/catan.ts';
import { answerField, recompute } from '../server/engine.ts';
import { createComponent, type ComponentScene } from '../shared/scene.ts';
import { sceneAnswers } from '../shared/sceneFields.ts';
import { sceneWorkspaceData } from '../src/sceneWorkspaceModel.ts';
import type { Assertion, Evidence, Session, Value } from '../shared/types.ts';

const empty:ComponentScene={version:2,coverage:'catalog',components:[]};
function example(count:number):Session {
 const players=[{id:'red',name:'빨강',color:'red'},{id:'blue',name:'파랑',color:'blue'},{id:'white',name:'아이보리',color:'ivory'},{id:'gold',name:'황토',color:'gold'}].slice(0,count);
 return {id:'synthetic',name:'합성',createdAt:'now',updatedAt:'now',gamePackId:catanPack.id,gamePackVersion:catanPack.version,gamePack:structuredClone(catanPack),captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players,evidence:[{id:'public-photo',url:'/demo-board.svg',kind:'example',scope:'public',capturedAt:'now',captureEpoch:'epoch',label:'합성 공용 원본'}],assertions:createExampleAssertions(players,'turn','public-photo'),preservations:[],snapshots:[],notes:{},activity:[],example:true};
}
const privatePhoto=(owner:string):Evidence=>({id:`${owner}-photo`,url:'/synthetic',kind:'photo',scope:'player',ownerId:owner,capturedAt:'now',captureEpoch:'epoch',label:'합성 개인 원본'});

for(const count of [3,4])test(`${count} players share one board presentation; all private records are catalog-only without public-photo fallback`,()=>{
 const session=example(count);const view=recompute(session,session.gamePack!);const before=structuredClone(session);
 const presentations=[sceneWorkspaceData(view),...session.players.map(p=>sceneWorkspaceData(view,p.id))];
 assert.equal(presentations.filter(p=>!p.catalogOnly).length,1);
 assert(presentations.slice(1).every(p=>p.catalogOnly));
 for(const p of presentations.slice(1)) { assert(!p.evidence.some(e=>e.id==='public-photo'));assert(p.fields.every(f=>f.scope==='player'));assert(!p.assertions.some(a=>a.field==='board.layout')); }
 assert.deepEqual(session,before);
});

test('legacy private positioned components, private originals and candidates remain accessible but never become public board input',()=>{
 const session=example(4);session.evidence.push(privatePhoto('red'),privatePhoto('blue'));
 const scene={...empty,components:[createComponent(empty,'resource-card',{id:'lumber',variant:'lumber',quantity:3,ownerId:'red',evidenceId:'red-photo',region:{x:.1,y:.1,width:.2,height:.3}}),createComponent(empty,'road',{id:'legacy-road',ownerId:'red',quantity:1,location:{type:'edge',id:'r1c1.NE'},evidenceId:'red-photo'})]};
 const candidate:Assertion={id:'private-candidate',field:'player.components.observed',ownerId:'red',value:scene as unknown as Value,basis:'observation',status:'candidate',evidenceIds:['red-photo'],updatedAt:'z',turnInstanceId:'turn'};
 session.assertions.push(candidate);const before=structuredClone(session);const view=recompute(session,session.gamePack!);
 const red=sceneWorkspaceData(view,'red'),blue=sceneWorkspaceData(view,'blue'),shared=sceneWorkspaceData(view);
 assert(red.catalogOnly && red.visible);assert.deepEqual(red.evidence.map(e=>e.id),['red-photo']);assert(red.assertions.some(a=>a.id===candidate.id));
 assert(!blue.assertions.some(a=>a.id===candidate.id));assert(!blue.evidence.some(e=>e.id==='red-photo'));
 assert(!shared.assertions.some(a=>a.id===candidate.id));assert(!shared.evidence.some(e=>e.id==='red-photo'));
 assert.deepEqual(red.assertions.find(a=>a.id===candidate.id)?.value,candidate.value);
 assert.deepEqual(session.assertions.filter(a=>a.basis!=='rule'),before.assertions.filter(a=>a.basis!=='rule'));
});

test('correcting a private photo catalog and resource counts leaves shared layout and the other player unchanged',()=>{
 const session=example(3);session.evidence.push(privatePhoto('red'));
 const before=structuredClone(session.assertions.filter(a=>a.field==='board.layout'||a.ownerId==='blue'));
 const scene={...empty,components:[createComponent(empty,'development-card',{id:'hidden-vp',variant:'victory-point',quantity:2,ownerId:'red',evidenceId:'red-photo'})]};
 for(const answer of sceneAnswers('player.components.observed',scene,'red',session.gamePack!.fields))answerField(session,session.gamePack!,answer.field,answer.value,answer.ownerId);
 answerField(session,session.gamePack!,'player.resources.counts',{lumber:3,wool:null,grain:0,brick:1,ore:2},'red');
 assert.deepEqual(session.assertions.filter(a=>a.field==='board.layout'||a.ownerId==='blue'),before);
 const view=recompute(session,session.gamePack!);assert(sceneWorkspaceData(view,'red').catalogOnly);
 assert(!sceneWorkspaceData(view).assertions.some(a=>a.ownerId==='red'));
 assert.equal(session.assertions.find(a=>a.field==='player.resources.counts'&&a.ownerId==='red')?.value && (session.assertions.find(a=>a.field==='player.resources.counts'&&a.ownerId==='red')!.value as Record<string,Value>).grain,0);
});
