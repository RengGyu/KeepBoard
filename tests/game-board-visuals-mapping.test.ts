import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {boardAreas,compatibleBoard,visiblePlacement,pendingArt,recordSurfacePoint,recordSurfaceCenter,type BoardVisual} from '../src/boardVisuals.ts';import type {GamePack} from '../shared/types.ts';import type {GenericPiece} from '../shared/genericRecord.ts';
const data=JSON.parse(await readFile(new URL('../public/game-art/boards/mapping.json',import.meta.url),'utf8')) as {games:BoardVisual[]};
const ledger=JSON.parse(await readFile(new URL('../docs/gamepack-revision-20261026/revision.json',import.meta.url),'utf8'));
test('119 games and the frozen 522 areas plus exactly the ledger-listed revisions: exact IDs/edition/source/component/field/template references, no rummikub, hidden areas not-needed',async()=>{
 assert.equal(ledger.base.totals.boardAreas,522);assert.equal(ledger.totals.boardAreas,522+Object.values<any>(ledger.games).reduce((n,g)=>n+(g.boardAreas?g.boardAreas.added.length-g.boardAreas.removed.length:0),0));
 assert.equal(data.games.length,119);assert.equal(new Set(data.games.map(g=>g.gameId)).size,119);assert(!data.games.some(g=>g.gameId==='rummikub'));assert.equal(data.games.flatMap(g=>g.areas).length,ledger.totals.boardAreas);
 for(const g of data.games){const raw=await readFile(new URL('../docs/research/game-specs-120/games/'+g.gameId+'.json',import.meta.url));const spec=JSON.parse(raw.toString());assert.equal(g.sourceSHA,createHash('sha256').update(raw).digest('hex'));assert.equal(g.editionId,spec.edition.id);
 for(const a of g.areas){assert(spec.layout.areas.some((s:any)=>s.id===a.areaId));for(const key of a.fieldKeys)assert(spec.state_fields.some((f:any)=>f.id===key&&f.area_ids.includes(a.areaId)));for(const id of a.componentIds)assert(spec.components.some((c:any)=>c.id===id));await readFile(new URL('../public/game-art/boards/'+a.template+'.svg',import.meta.url));if(!(['public','owner'].includes(a.visibility)&&['public','player'].includes(a.scope)))assert.equal(a.status,'not-needed');}}
});
test('generation deterministic and existing asset bytes unchanged',async()=>{execFileSync('python3',['tools/game-board-visuals/generate.py','--check']);const c=JSON.parse(await readFile('docs/game-board-visuals/coverage.json','utf8'));for(const [path,sha] of Object.entries(c.originalAssetHashes))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),sha);});
test('pinned source fallback keeps unsupported placements untouched and cannot expose role-limited areas',()=>{
 const g=data.games.find(g=>g.gameId==='carcassonne')!,a=g.areas.find(a=>a.areaId==='map')!;
 const pack={runtime:{source:{gameId:g.gameId,editionId:g.editionId,sha256:g.sourceSHA},fieldBindings:[{key:'map.scene',sourceId:'map.scene',areaIds:['map'],componentIds:a.componentIds,editor:'component-catalog',scope:'public',visibility:'public'}]}} as unknown as GamePack;
 assert(compatibleBoard(pack,g));assert.equal(boardAreas(pack,'map.scene',g)[0].template,'square-mat');const p={placement:{areaId:'map',x:.9,y:.1,rotation:90}} as GenericPiece;assert(visiblePlacement(p,a,true));assert(!visiblePlacement(p,a,false));assert.deepEqual(p.placement,{areaId:'map',x:.9,y:.1,rotation:90});pack.runtime!.source.sha256='old';assert(!compatibleBoard(pack,g));assert.equal(boardAreas(pack,'map.scene',g)[0].template,'free-table');pack.runtime!.fieldBindings[0].visibility='role-limited';assert.deepEqual(boardAreas(pack,'map.scene',g),[]);
});
test('approved F001–F020 corrections leave no stale pending gates while unresolved components remain gated',async()=>{
 const status=JSON.parse(await readFile('docs/game-board-visuals/fidelity-pending.json','utf8'));
 assert.deepEqual(status.items,[]);assert.equal(status.resolved.length,20);
 assert.deepEqual(status.resolved.map((f:any)=>f.findingId).sort(),Array.from({length:20},(_,i)=>'F'+String(i+1).padStart(3,'0')));
 for(const f of status.resolved){const visual=data.games.find(g=>g.gameId===f.gameId);assert(visual);assert.equal(f.status,'corrected-representatives');assert(!pendingArt(visual,f.componentId));}
 const agri=data.games.find(g=>g.gameId==='agricola')!;
 const unresolved={...agri,fidelityPending:[{componentId:'people',findingId:'F001',status:'known-fidelity-pending'}]};
 assert(pendingArt(unresolved,'people'));assert(!pendingArt(unresolved,'fences'));
});
test('click/drag inverse matches rendered center without inward drift at multiple sizes',()=>{for(const w of [240,300,354,1080])for(const x of [0,.1,.9,1]){const center=recordSurfaceCenter(x,.7,w,w*2/3),back=recordSurfacePoint(center.x,center.y,w,w*2/3);assert(Math.abs(back.x-x)<1e-10);assert(Math.abs(back.y-.7)<1e-10);}});
