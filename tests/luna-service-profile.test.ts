import test from 'node:test';import assert from 'node:assert/strict';
import {LunaGameReader,LUNA_IDENTITY,TERRA_IDENTITY} from '../server/ai/terraGameReader';
import {hostedReaderFor} from '../server/ai/hostedReader';
import {analyzeHostedObservation} from '../server/hostedObservation';
test('active factory is Luna high; archived Terra pins are rejected without substitution',()=>{
 assert.deepEqual(hostedReaderFor(LUNA_IDENTITY).identity,LUNA_IDENTITY);
 assert.equal(new LunaGameReader().identity.model,'gpt-6-luna');
 assert.throws(()=>hostedReaderFor(TERRA_IDENTITY),/자동 대체하지 않습니다/);
});
test('stale Luna model, effort and adapter pins fail before image access or paid dispatch',async()=>{
 let calls=0,reads=0;const reader=new LunaGameReader({key:async()=> 'synthetic',fetch:async()=>{calls++;throw Error('must not dispatch');}});
 for(const patch of [{model:'gpt-6.1-terra'},{reasoningEffort:'low'},{adapterVersion:'literal-named-fill-unit-original-v2'}]){
  await assert.rejects(analyzeHostedObservation({plan:{reader:{...LUNA_IDENTITY,...patch}} as any,reader,pack:{} as any,session:{} as any,turnInstanceId:'turn',evidence:[],readImage:async()=>{reads++;throw Error('must not read');}}),/profile이 바뀌었습니다/);
 }
 assert.equal(calls,0);assert.equal(reads,0);
});
