import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as registry from '../shared/readouts/registry.ts';
import {effectiveRecognitionPack} from '../shared/recognition.ts';
const packs=JSON.parse(readFileSync('gamepacks/generated/game-essentials.json','utf8'));
const pack=effectiveRecognitionPack(packs.find((p:any)=>p.runtime?.source.gameId==='carcassonne'));
test('evidence relinking cannot silently reattribute existing observation facts to another photo',()=>{
 const can=(registry as any).canRelinkReadoutEvidence;
 assert.equal(typeof can,'function');
 let r=registry.emptyGameReadout(pack,'tiles');
 r.values.face='front';r.sources.face='observation';
 const p={componentId:'tiles',evidenceId:'photo-a',readout:r};
 assert.equal(can(pack,p),false);
 r=registry.setReadoutValue(pack,r,'face','front');
 assert.equal(can(pack,{...p,readout:r}),true);
 assert.equal(can(pack,{componentId:'tiles',evidenceId:'photo-a'}),true);
 assert.equal(can(pack,{...p,readout:{...r,schema:'future-v999'}}),false);
});
test('invalid structured data is read-only, not silently replaced when a single field is edited',()=>{
 const ui=readFileSync('src/readouts/GameDetailFields.tsx','utf8');
 assert.match(ui,/if\(view\.status==='invalid'\)return/);
 assert.match(ui,/기존 상세값은 유지/);
});
test('source selector uses the evidence guard without loosening the original photo scope',()=>{
 const ui=readFileSync('src/GameEssentials.tsx','utf8');
 assert.match(ui,/disabled=\{busy\|\|!canRelinkReadoutEvidence\(view\.pack,piece\)\}/);
 assert.match(ui,/field\.visibility==='public'\?e\.scope==='public'&&!e\.ownerId/);
});
