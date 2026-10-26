// Offline adapter, not an installed product path. Preserve labels/read numbers in the existing note contract.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeSceneDetailed} from '../../shared/scene.ts';
const here=path.dirname(fileURLToPath(import.meta.url));
const recorded=JSON.parse(await readFile(path.join(here,'lightweight.normalized.json'),'utf8'));
const components=recorded.components.map(({label,notes,number,...c}:any)=>({...c,number,note:[label,number===null?'':`표시 숫자 ${number}`,notes].filter(Boolean).join(' · ')}));
const value={version:2,coverage:'partial',components};
const restored=normalizeSceneDetailed(value,['research-photo-1']).scene;
assert.equal(restored.components.length,components.length);
for(const original of components){
 const c=restored.components.find(c=>c.id===original.id)!;
 for(const key of ['variant','note','number','evidenceId','region','quantity','ownerId','observedColor','location']) assert.deepEqual((c as any)[key],original[key]);
}
await writeFile(path.join(here,'lightweight.scene-v2.json'),JSON.stringify(restored,null,2)+'\n');
console.log(`V2 EXPORT PASS: ${components.length} IDs, labels/numbers in note, colors, crops and quantities preserved; no Catan slots invented.`);
