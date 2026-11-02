import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {buildLedger} from '../tools/game-runtime/revision-ledger.ts';

test('a prior rules receipt cannot approve different source bytes during regeneration',()=>{
 const root=mkdtempSync(join(tmpdir(),'keepboard-source-approval-'));
 try{
  for(const file of ['docs/game-essentials/data-freeze.json','docs/gamepack-revision-20261026/history/before-runtime-revision/frozen-inventory.json','docs/gamepack-revision-20261026/revision-evidence.json','docs/research/game-specs-120/games']){
   mkdirSync(dirname(join(root,file)),{recursive:true});cpSync(file,join(root,file),{recursive:true});
  }
  assert.doesNotThrow(()=>buildLedger(root));
  const file=join(root,'docs/research/game-specs-120/games/akropolis.json'),spec=JSON.parse(readFileSync(file,'utf8'));
  spec.components[0].description+=' Unreviewed change.';writeFileSync(file,JSON.stringify(spec,null,2)+'\n');
  assert.throws(()=>buildLedger(root),/Reviewed source digest mismatch: akropolis/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
