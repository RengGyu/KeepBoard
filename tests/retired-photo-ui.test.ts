import test from 'node:test';
import assert from 'node:assert/strict';
import {retiredPacks,catalogPacks} from '../gamepacks/catalog.ts';
import {loadPhotoDefinitions,photoDefinitionFor} from '../src/photoDefinitions.ts';

test('reader selection loads exact definitions for existing retired boards and current boards',async()=>{
 await loadPhotoDefinitions();
 for(const pack of [...retiredPacks,...catalogPacks]){
  const definition=photoDefinitionFor(pack);
  assert(definition,`${pack.id}@${pack.version}`);
  assert.equal(definition.sourceSHA,pack.runtime!.source.sha256);
  assert.equal(definition.packVersion,pack.version);
 }
 const pack=retiredPacks[0];
 assert.equal(photoDefinitionFor({...pack,version:'unknown'}),undefined);
});
