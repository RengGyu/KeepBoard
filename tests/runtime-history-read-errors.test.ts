import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateRuntime} from '../tools/game-runtime/generate.ts';

for(const corrupt of ['runtime','retired'] as const)test(`generation rejects corrupt existing ${corrupt} before replacing runtime output`,async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'kb-runtime-history-')),input=path.join(root,'input'),out=path.join(root,'game-essentials.json'),retired=path.join(root,'retired-packs.json');
 try{
  await mkdir(input);await copyFile('docs/research/game-specs-120/games/istanbul.json',path.join(input,'istanbul.json'));
  const runtimeBytes=corrupt==='runtime'?'bad runtime JSON':'[]',retiredBytes=corrupt==='retired'?'bad retired JSON':'[]';
  await writeFile(out,runtimeBytes);await writeFile(retired,retiredBytes);
  await assert.rejects(()=>generateRuntime(input,out,false));
  assert.equal(await readFile(out,'utf8'),runtimeBytes);
  assert.equal(await readFile(retired,'utf8'),retiredBytes);
 }finally{await rm(root,{recursive:true,force:true});}
});
