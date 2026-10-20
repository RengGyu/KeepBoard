import test from 'node:test';
import assert from 'node:assert/strict';
import { catanPack } from '../gamepacks/catan.ts';
import { normalizeObservations } from '../server/ai/index.ts';
import { toComponentScene } from '../shared/sceneBridge.ts';
import { compareStateValues } from '../server/compare.ts';
import { sceneObservationInstructions } from '../server/ai/scenePrompt.ts';
import type { Evidence } from '../shared/types.ts';

const evidence: Evidence[] = [{id:'photo',url:'/uploads/test.jpg',label:'판',captureEpoch:'epoch',capturedAt:'2026-10-20',scope:'public',kind:'photo'}];
const component = (id:string, kind='road') => ({ id,kind,variant:null,ownerId:null,quantity:1,number:null,location:{type:'unplaced',id:null},region:{x:.1,y:.2,width:.1,height:.2},evidenceId:'photo',direction:null });

test('partial closeup becomes editable discrete components rather than a fabricated full layout', () => {
  const output=normalizeObservations({assertions:[{field:'board.layout',value:{version:1,coverage:'partial',components:[component('road-1')]},evidenceIds:['photo']}]},catanPack,evidence,'turn');
  assert.equal(output.assertions[0].field,'components.observed');
  const scene=toComponentScene(output.assertions[0].value);
  assert.equal(scene.components[0].kind,'road');
  assert.equal(scene.components[0].ownerId,null);
  assert.equal(scene.components[0].location.type,'unplaced');
  assert.equal(scene.components[0].region?.x,.1);
});

test('card catalog retains readable individual types without assigning a hand owner', () => {
  const output=normalizeObservations({assertions:[{field:'components.observed',value:{version:1,coverage:'catalog',components:[{...component('card','resource-card'),variant:'lumber',quantity:3}]},evidenceIds:['photo']}]},catanPack,evidence,'turn');
  const scene=toComponentScene(output.assertions[0].value);
  assert.equal(scene.coverage,'catalog');
  assert.equal(scene.components[0].variant,'lumber');
  assert.equal(scene.components[0].quantity,3);
  assert.equal(scene.components[0].ownerId,null);
});

test('legacy layout preserves components and evidence without inventing photo crop or ambiguous edge', () => {
  const scene=toComponentScene({tiles:[{id:'r1c1',resource:'forest',number:8}],pieces:[{type:'road',ownerId:'red',location:'r1c1 edge unclear'}]},'photo');
  assert.equal(scene.components.length,2);
  assert.equal(scene.components[0].location.id,'r1c1');
  assert.equal(scene.components[1].location.type,'unplaced');
  assert.equal(scene.components[1].evidenceId,'photo');
  assert.equal(scene.components[1].region,null);
});

test('model contract describes canonical scene, partial fields and placement slots', () => {
  const prompt=sceneObservationInstructions(catanPack);
  assert.match(prompt,/components.observed/);
  assert.match(prompt,/quantity/);
  assert.match(prompt,/unplaced/);
  assert.match(prompt,/resource-card/);
  assert.match(prompt,/NOT illustration-board coordinates/);
  assert.match(prompt,/MULTI-VIEW/);
  assert.match(prompt,/canonical hex\/edge\/vertex/);
  assert.match(prompt,/Do not merge unplaced identical-looking cards/);
  assert.match(prompt,/one representative best-legible original/);
});

test('exact legacy road and vertex anchors map to shared board slots', () => {
  const scene=toComponentScene({pieces:[{type:'road',location:'r3c2:N-NE',owner:'red'},{type:'settlement',location:'r3c2:N',owner:'red'}]});
  assert.equal(scene.components[0].location.type,'edge');
  assert.ok(scene.components[0].location.id);
  assert.equal(scene.components[1].location.type,'vertex');
  assert.ok(scene.components[1].location.id);
});

test('new scene photos do not create a restoration difference when logical state is unchanged', () => {
  const first={version:1,coverage:'partial',components:[component('road-1')]};
  const next=structuredClone(first);next.components[0].evidenceId='new-photo';next.components[0].region.x=.7;
  const field=catanPack.fields.find(f=>f.key==='components.observed')!;
  assert.equal(compareStateValues(field,first,next),true);
  next.components[0].quantity=2;
  assert.equal(compareStateValues(field,first,next),false);
});
