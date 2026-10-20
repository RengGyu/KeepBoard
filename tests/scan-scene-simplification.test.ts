import test from 'node:test';
import assert from 'node:assert/strict';
import { catanPack } from '../gamepacks/catan.ts';
import { normalizeObservations } from '../server/ai/index.ts';
import { assembleSceneAssertions } from '../server/ai/sceneAssembly.ts';
import { CATAN_TOPOLOGY, createComponent, normalizeScene, type ComponentScene } from '../shared/scene.ts';
import { groupSceneComponents, deleteSceneGroupSelection } from '../src/sceneGroups.ts';
import type { Assertion, Evidence } from '../shared/types.ts';

const photo: Evidence = { id:'photo', url:'/synthetic.jpg', label:'합성', kind:'photo', scope:'public', capturedAt:'2026-10-21', captureEpoch:'epoch' };
const blank = (): ComponentScene => ({version:2,coverage:'partial',components:[]});
const road = (index:number) => createComponent(blank(),'road',{id:`road-${index}`,quantity:1,ownerId:'red',location:{type:'edge',id:CATAN_TOPOLOGY.edges[index].id},evidenceId:'photo',region:{x:.1,y:.1,width:.2,height:.2}});
const observation = (value:ComponentScene, extra:Partial<Assertion>={}): Assertion => ({id:'candidate',field:'components.observed',value:value as unknown as Assertion['value'],evidenceIds:['photo'],basis:'observation',status:'candidate',turnInstanceId:'turn',updatedAt:'2026-10-21',...extra});

test('13 per-piece scene assertions from one photo become one editable scene with 13 preserved pieces',()=>{
 const raw={assertions:Array.from({length:13},(_,i)=>({field:'board.layout',value:{...blank(),components:[road(i)]},evidenceIds:['photo']}))};
 const output=normalizeObservations(raw,catanPack,[photo],'turn');
 assert.equal(output.assertions.length,1);
 assert.equal(output.assertions[0].field,'components.observed');
 const scene=normalizeScene(output.assertions[0].value);
 assert.equal(scene.components.length,13); // Old path kept only the final road.
 assert.deepEqual(scene.components.map(c=>c.location.id),CATAN_TOPOLOGY.edges.slice(0,13).map(e=>e.id));
 assert.ok(scene.components.every(c=>c.evidenceId==='photo' && c.region?.width===.2));
});

test('one fully observed board and its repeated partials share one public candidate without counting a road twice',()=>{
 const terrain=CATAN_TOPOLOGY.hexes.map(h=>createComponent(blank(),'terrain',{id:h.id,variant:'forest',quantity:1,location:{type:'hex',id:h.id}}));
 const full={...blank(),coverage:'full' as const,components:[...terrain,road(0)]};
 const raw={assertions:[{field:'board.layout',value:full,evidenceIds:['photo']},{field:'components.observed',value:{...blank(),components:[road(0),road(1)]},evidenceIds:['photo']}]};
 const out=normalizeObservations(raw,catanPack,[photo],'turn');
 assert.equal(out.assertions.length,1); assert.equal(out.assertions[0].field,'board.layout');
 assert.equal(normalizeScene(out.assertions[0].value).components.length,21);
});

test('different owner areas and capture epochs are not combined; source facts remain untouched',()=>{
 const sources=[photo,{...photo,id:'next',captureEpoch:'next-epoch'},{...photo,id:'private',scope:'player' as const,ownerId:'red'}];
 const first=observation({...blank(),components:[road(0)]});
 const second=observation({...blank(),components:[road(1)]},{evidenceIds:['next']});
 const third=observation({...blank(),components:[road(2)]},{ownerId:'red',field:'player.components.observed',evidenceIds:['private']});
 const original=structuredClone([first,second,third]);
 assert.equal(assembleSceneAssertions([first,second,third],sources).length,3);
 assert.deepEqual([first,second,third],original);
});

test('loose identical-looking cards are not merged and colliding ids/attachments remain unique',()=>{
 const card=createComponent(blank(),'resource-card',{id:'same',variant:'lumber',quantity:1});
 const token=createComponent(blank(),'token',{id:'marker',quantity:1,attachedToId:'same'});
 const out=assembleSceneAssertions([observation({...blank(),components:[card,token]}),observation({...blank(),components:[card,token]})],[photo]);
 const pieces=normalizeScene(out[0].value).components;
 assert.equal(pieces.length,4); assert.equal(new Set(pieces.map(c=>c.id)).size,4);
 assert.equal(pieces[1].attachedToId,pieces[0].id); assert.equal(pieces[3].attachedToId,pieces[2].id);
});

test('conflicting anchored observations survive as separate editable pieces; partial union never claims full coverage',()=>{
 const out=assembleSceneAssertions([observation({...blank(),components:[road(0)]}),observation({...blank(),components:[{...road(0),ownerId:'blue'}]})],[photo]);
 const scene=normalizeScene(out[0].value);
 assert.equal(scene.coverage,'partial'); assert.equal(scene.components.length,2);
 assert.deepEqual(scene.components.map(c=>c.ownerId),['red','blue']);
});

test('list groups by kind, variant and owner, keeps source objects and does not treat unknown quantity as zero',()=>{
 const scene={...blank(),components:[road(0),road(1),{...road(2),ownerId:'blue'},createComponent(blank(),'resource-card',{variant:'wool',quantity:null}),createComponent(blank(),'resource-card',{id:'other',variant:'wool',quantity:2})]};
 const before=structuredClone(scene); const groups=groupSceneComponents(scene);
 assert.equal(groups.length,3); assert.equal(groups[0].quantity,2); assert.deepEqual(groups[0].ids,['road-0','road-1']);
 assert.equal(groups[1].quantity,1); assert.equal(groups[2].quantity,null);
 assert.deepEqual(scene,before);
});

test('inline and independent numbers at the same hex show one semantic number while both source ids remain editable',()=>{
 const terrain=createComponent(blank(),'terrain',{id:'tile',variant:'forest',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const token=createComponent(blank(),'number-token',{id:'six',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const scene={...blank(),components:[terrain,token]}; const before=structuredClone(scene);
 const groups=groupSceneComponents(scene);
 assert.equal(groups.length,2); assert.equal(groups[0].component.number,undefined);
 assert.equal(groups[1].quantity,1); assert.deepEqual(groups[1].ids,['tile','six']);
 assert.deepEqual(scene,before);
});

test('different or unplaced numbers are not hidden as duplicates',()=>{
 const a=createComponent(blank(),'number-token',{id:'a',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const b={...a,id:'b',number:8};
 const c={...a,id:'c',location:{type:'unplaced' as const,id:null}};
 const d={...c,id:'d'};
 const groups=groupSceneComponents({...blank(),components:[a,b,c,d]});
 assert.equal(groups.length,2); assert.equal(groups[0].quantity,3); assert.equal(groups[1].quantity,1);
 assert.deepEqual(groups[0].ids,['a','c','d']);
});

test('two independently recorded overlapping number pieces remain two; only inline/token dual representation is paired',()=>{
 const number=createComponent(blank(),'number-token',{id:'a',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const tile=createComponent(blank(),'terrain',{id:'tile',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const groups=groupSceneComponents({...blank(),components:[number,{...number,id:'b'},tile]});
 const six=groups.find(g=>g.component.kind==='number-token')!;
 assert.equal(six.quantity,2); assert.deepEqual(six.ids,['a','tile','b']);
});


test('deleting semantic inline-number selections preserves terrain, sources and an atomic undo input',()=>{
 const tile=createComponent(blank(),'terrain',{id:'tile',variant:'forest',quantity:1,number:6,location:{type:'hex',id:'r1c1'},evidenceId:'photo',region:{x:.1,y:.1,width:.2,height:.2}});
 const token=createComponent(blank(),'number-token',{id:'token',quantity:1,number:6,location:{type:'hex',id:'r1c1'}});
 const scene={...blank(),components:[tile,token,road(0)]}; const before=structuredClone(scene);
 const next=deleteSceneGroupSelection(scene,['tile','token'],['tile']);
 assert.deepEqual(next.components.map(c=>c.id),['tile','road-0']); assert.equal(next.components[0].number,null);
 assert.equal(next.components[0].variant,'forest'); assert.equal(next.components[0].evidenceId,'photo'); assert.deepEqual(next.components[0].region,tile.region);
 assert.deepEqual(scene,before);
});
