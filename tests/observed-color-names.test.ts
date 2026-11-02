import test from 'node:test';import assert from 'node:assert/strict';
import {observedColorCSS} from '../shared/playerColors';
test('standard dark and light color names display without guessing ownership or discarding the observed wording',()=>{
 assert.equal(observedColorCSS('dark blue'),'#00008b');assert.equal(observedColorCSS(' light-blue '),'#add8e6');assert.equal(observedColorCSS('navy'),'#000080');
 assert.equal(observedColorCSS('unreadable'),undefined);assert.equal(observedColorCSS('red or blue'),undefined);assert.equal(observedColorCSS('blue'),'#3b78a4');
});
