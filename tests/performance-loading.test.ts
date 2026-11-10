import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoDefinitionLoader} from '../src/photoDefinitions';
import {catalogPacks,retiredPacks} from '../gamepacks/catalog';
import current from '../game-photo-definitions/index.json';
import retired from '../docs/gamepack-revision-20261026/history/before-runtime-revision/game-photo-definitions/index.json';
import {runtimeGameArtFiles} from '../tools/runtime-public-assets';
import path from 'node:path';

test('current selection fetches no historical definitions; exact retired selection loads once and preserves SHA lookup',async()=>{
 let now=0,old=0;const loader=createPhotoDefinitionLoader(async()=>{now++;return {default:current};},async()=>{old++;return {default:retired};});
 await Promise.all(catalogPacks.map(p=>loader.load(p)));assert.equal(now,1);assert.equal(old,0);
 for(const p of catalogPacks)assert.equal(loader.find(p)?.sourceSHA,p.runtime?.source.sha256);
 await Promise.all(retiredPacks.map(p=>loader.load(p)));assert.equal(old,1);
 for(const p of retiredPacks)assert.equal(loader.find(p)?.sourceSHA,p.runtime?.source.sha256);
 assert.equal(loader.find({...retiredPacks[0],version:'unknown'}),undefined);
});
test('deployment art closure excludes previews/archives while retaining all runtime board variants, mappings and symbol assets',async()=>{
 const files=await runtimeGameArtFiles(path.resolve('public'));
 for(const file of ['assets.json','boards/mapping.json','games/sagrada/mapping.json','games/rummikub/numbers.number-tile.svg','common/rack.svg','real-boards/sagrada/board.json','real-boards/sagrada/board.svg','real-boards/sagrada/pieces.svg','real-boards/aeons-end/variants/board-carapace-queen.svg'])assert(files.has(file),file);
 for(const file of files)assert(!/\.zip$|\.html$|^checkpoints\//.test(file),file);
 assert(!files.has('games.json'));assert(!files.has('coverage.json'));
});
