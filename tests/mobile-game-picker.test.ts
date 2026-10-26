import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../server/index.ts';
import {Store} from '../server/store.ts';
import type {GameCatalogEntry} from '../shared/gameEssentials.ts';
import {createRequest,filterCatalog,supportLabel} from '../src/gamePickerModel.ts';

async function catalog():Promise<GameCatalogEntry[]>{
 const root=await mkdtemp(path.join(os.tmpdir(),'keepboard-picker-')),app=await createApp({store:new Store(root)});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
 try{const address=server.address();assert(address&&typeof address!=='string');const response=await fetch(`http://127.0.0.1:${address.port}/api/game-catalog`);assert.equal(response.status,200);return await response.json();}
 finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(root,{recursive:true,force:true});}
}

test('picker search finds real catalog games by Korean title, spacing-insensitive text and initial consonants',async()=>{
 const packs=await catalog();
 assert(packs.length>=2,'catalog loaded');
 const catan=packs.find(p=>p.id==='catan-base');assert(catan,'native Catan entry in the UI catalog (title is the printed "CATAN")');
 const generic=packs.find(p=>p.id==='azul');assert(generic,'generic entry');assert(filterCatalog(packs,'아줄').some(p=>p.id==='azul'),'generic entries use their Korean title');
 assert(filterCatalog(packs,'카탄').some(p=>p.id===catan.id));
 assert(filterCatalog(packs,'ㅋㅌ').some(p=>p.id===catan.id),'초성 search');
 const spaced=packs.find(p=>/\s/.test(p.title));
 if(spaced)assert(filterCatalog(packs,spaced.title.replace(/\s/g,'')).some(p=>p.id===spaced.id),'spaces ignored');
 assert.deepEqual(filterCatalog(packs,'존재하지않는게임xyz'),[],'no results stays empty, never falls back to another game');
 assert.equal(filterCatalog(packs,'   ').length,packs.length,'blank query lists everything');
 assert.equal(supportLabel(catan),'전용 그림 편집·판독');
});

test('searching never selects or replaces the chosen game; creation sends the chosen id and pinned version only',async()=>{
 const packs=await catalog();
 const chosen=packs.find(p=>p.support?.recording!=='native')??packs[1];
 const before=JSON.stringify(packs);
 const filtered=filterCatalog(packs,'카탄');
 assert(!filtered.some(p=>p.id===chosen.id)||chosen.title.includes('카탄'),'the filter may hide the chosen game');
 assert.equal(JSON.stringify(packs),before,'filtering does not mutate the catalog');
 const players=[{id:'p1',name:'합성1',color:'#c2232f'}];
 // The draft (name, players) and the selection are independent of what was typed in the search box.
 const request=createRequest({name:'  토요일 판  ',packId:chosen.id,packs,players});
 assert.deepEqual(request,{name:'토요일 판',gamePackId:chosen.id,gamePackVersion:chosen.version,players});
 assert.notEqual(request.gamePackId,'카탄','search text is never sent as a game id');
 assert.equal(createRequest({name:'   ',packId:chosen.id,packs,players}).name,undefined);
 assert.throws(()=>createRequest({name:'',packId:'카탄',packs,players}),/선택/,'unknown ids (e.g. a typed search string) are rejected');
});
