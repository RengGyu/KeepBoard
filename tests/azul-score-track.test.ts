import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scoreForTrackSlot, scoreTrackValue } from '../src/azulScoreTrackModel.ts';

test('Azul score track preserves unknown and out-of-track values instead of moving them', () => {
  const range = { min: 0, max: 100 };
  assert.equal(scoreTrackValue(null, range), null);
  assert.equal(scoreTrackValue(0, range), 0);
  assert.equal(scoreTrackValue(100, range), 100);
  assert.equal(scoreTrackValue(101, range), null);
  assert.equal(scoreTrackValue(4.5, range), null);
  assert.equal(scoreForTrackSlot(37, range), 37);
  assert.equal(scoreForTrackSlot(-1, range), null);
});

test('generated Azul track binds all integer spaces to the existing player score field', async () => {
  const board = JSON.parse(await readFile(new URL('../public/game-art/real-boards/azul/board.json', import.meta.url), 'utf8'));
  assert.deepEqual(board.numericTracks.map((row: {id:string}) => row.id), ['score-p1','score-p2','score-p3','score-p4']);
  for (const track of board.numericTracks) {
  assert.ok(track);
  assert.equal(track.field, 'score');
  assert.equal(track.scope, 'player');
  assert.deepEqual(track.slots.map((slot: { value: number }) => slot.value), Array.from({ length: 101 }, (_, i) => i));
  }
});


test('current personal numeric track renders and saves a deliberate choice while unknown remains unknown',async()=>{
 const {mountWithHooks,nodes}=await import('./helpers/current-board-record.ts');
 const {AzulScoreTrack}=await import('../src/AzulScoreTrack.tsx');
 const {loadRealAssets}=await import('../src/realBoards.ts');
 const old=globalThis.fetch;let saved:number|undefined;
 globalThis.fetch=(async(input:any)=>{const file=String(input).endsWith('board.json')?'board.json':'pieces.svg';return new Response(await readFile('public/game-art/real-boards/azul/'+file));})as typeof fetch;
 const ui=mountWithHooks(AzulScoreTrack,{value:null,busy:false,onSave:async(n:number)=>{saved=n;}});
 try{
  await loadRealAssets('azul');ui.render();await new Promise(r=>setImmediate(r));const tree=ui.render();
  const buttons=nodes(tree).filter(n=>n.type==='button');assert.equal(buttons.length,101);assert.equal(saved,undefined);
  assert.equal(buttons.filter(b=>b.props['aria-pressed']).length,0);
  buttons.find(b=>b.props['aria-label']==='37점')!.props.onClick();assert.equal(saved,37);
 }finally{ui.dispose();globalThis.fetch=old;}
});
