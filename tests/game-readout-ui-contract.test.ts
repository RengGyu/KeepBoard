import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('new structured display and controlled fields are wired into existing candidate/accepted editors',()=>{
 const essentials=readFileSync('src/GameEssentials.tsx','utf8'),board=readFileSync('src/GameBoardRecord.tsx','utf8');
 assert.match(essentials,/GameDetailFields/);assert.match(essentials,/GameDetailReadout/);assert.match(board,/GameDetailReadout/);
 assert.match(essentials,/saves\.current\.has\(`\$\{ownerId\?\?'public'\}:\$\{a\.field\}`\)/);
 assert.match(essentials,/if\(!saves\.current\.size\)setBoardKey\(a\.field\)/);
 assert.match(essentials,/onReadyToSave\?\.\(dirty\?save:null\)/);
});
