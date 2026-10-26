import test from 'node:test';
import assert from 'node:assert/strict';
import {createRummikubTile,emptyRummikub} from '../shared/rummikub.ts';
import {PHOTO_INPUT_SAVE_OPTIONS,rummikubDraftAnswers,type RummikubDraftInput} from '../src/rummikubSavePolicy.ts';

function draft(ownerId?:string):RummikubDraftInput {
 const scene=emptyRummikub(ownerId);scene.groups=[{id:'new',label:'후보',tiles:[createRummikubTile('green-7',{number:7,color:'green'})]}];
 return {scene,ownerId,dirty:false,candidate:true,opened:{value:'',saved:''},pending:{value:'',saved:''}};
}
test('photo preparation plus failed analysis leaves accepted and pristine candidate untouched',async()=>{
 const accepted={id:'saved',status:'accepted',value:'previous'},candidate={id:'unconfirmed',status:'candidate',value:draft().scene};
 const records=[accepted,candidate],before=structuredClone(records);let writes=0;
 async function prepare(){const answers=rummikubDraftAnswers(draft(),PHOTO_INPUT_SAVE_OPTIONS);if(answers.length){writes++;records.splice(0,records.length,{id:'overwrite',status:'accepted',value:answers[0].value as never});}}
 await assert.rejects(async()=>{await prepare();throw new Error('Synthetic analysis failed');},/Synthetic analysis failed/);
 assert.equal(writes,0);assert.deepEqual(records,before);
});
test('explicit save confirms an untouched green candidate and retains instance and group order',()=>{
 const input=draft();const answers=rummikubDraftAnswers(input);assert.equal(answers.length,1);assert.equal(answers[0].field,'table.scene');assert.deepEqual(answers[0].value,input.scene);assert.equal(input.scene.groups[0].tiles[0].color,'green');
});
test('photo preparation saves user edits rather than losing the dirty draft',()=>{
 const input=draft('p1');input.dirty=true;input.scene.groups[0].tiles[0].number=13;
 const answers=rummikubDraftAnswers(input,PHOTO_INPUT_SAVE_OPTIONS);assert.equal(answers.length,1);assert.equal(answers[0].field,'rack.scene');assert.equal(answers[0].ownerId,'p1');assert.deepEqual(answers[0].value,input.scene);assert.equal(input.scene.groups[0].tiles[0].color,'green');
});
test('context-only edits never accidentally accept a pristine scene during photo preparation',()=>{
 const input=draft();input.pending.value='재배열 중';assert.deepEqual(rummikubDraftAnswers(input,PHOTO_INPUT_SAVE_OPTIONS),[{field:'pending',value:'재배열 중'}]);
 const privateInput=draft('p1');privateInput.opened.value='false';assert.deepEqual(rummikubDraftAnswers(privateInput,PHOTO_INPUT_SAVE_OPTIONS),[{field:'opened',ownerId:'p1',value:false}]);
});

test('baseline-inclusive explicit review preserves ordered/manual old tiles and keeps fresh observations loose without identity inference',async()=>{
 const {prepareRummikubReview}=await import('../src/rummikubSavePolicy.ts');const base=emptyRummikub(),fresh=emptyRummikub();
 base.groups=[{id:'ordered',label:'수동 묶음',tiles:[createRummikubTile('old-2',{color:'red',number:2}),createRummikubTile('old-1',{color:'red',number:1,note:'직접 정정'})]}];base.loose=[createRummikubTile('old-loose',{color:'green',number:5})];fresh.groups=[{id:'model-group',label:'관측',tiles:[createRummikubTile('new-same-face',{color:'red',number:2})]}];fresh.loose=[createRummikubTile('new-unknown',{kind:'unknown',color:null,number:null})];
 const before=JSON.stringify([base,fresh]),review=prepareRummikubReview(base,fresh);assert.deepEqual(review.groups,base.groups);assert.deepEqual(review.loose.map(t=>t.id),['old-loose','new-same-face','new-unknown']);assert.equal(JSON.stringify([base,fresh]),before);
 const input={...draft(),scene:review,requiresReview:true,observationReview:{version:'native-observation-review-v1' as const,sourceAssertionId:'fresh',expectedBaselineAssertionId:'accepted'}};
 const answers=rummikubDraftAnswers(input);assert.deepEqual(answers[0].observationReview,input.observationReview);assert.deepEqual(answers[0].value,review);
 assert.throws(()=>rummikubDraftAnswers({...input,observationReview:undefined,dirty:true}),/기존 판과 함께/);assert.deepEqual(rummikubDraftAnswers({...input,observationReview:undefined},PHOTO_INPUT_SAVE_OPTIONS),[]);
});
