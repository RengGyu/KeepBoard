/** Browser edit check on an isolated copy; never opens the operating Store. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {recordProof,jsonSHA} from './fixtures-eight.mts';
const out=import.meta.dirname,m=JSON.parse(await fs.readFile(path.join(out,'serve-manifest.json'),'utf8'));
assert(path.basename(m.dataRoot).startsWith('kb-linear-eight-'));
for(const key of Object.keys(process.env))if(/API_KEY|KEY_FILE|AI_GATEWAY|AI_ALIAS|SUPABASE|BLOB_READ_WRITE|LOCAL_READER_CONFIG/.test(key))delete process.env[key];
process.env.KEEPBOARD_DATA_DIR=m.dataRoot;process.chdir(m.dataRoot);
const {Store}=await import('../../../server/store.ts');
const store=new Store(m.dataRoot),file=path.join(out,'browser-trial.json');
if(process.argv.includes('--create')){
 const original=m.cases.find((c:any)=>c.gameId==='hanabi'),s=await store.getSession(original.sessionId);
 assert(s);const t=structuredClone(s);t.id=crypto.randomUUID();t.name='브라우저 편집·저장 검수';await store.saveSession(t);
 const proof=jsonSHA(recordProof(t)),report={sessionId:t.id,url:m.base+'/?session='+t.id,expectedRecordSHA:proof,pristineSessionId:s.id};
 await fs.writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else{
 const r=JSON.parse(await fs.readFile(file,'utf8')),s=await store.getSession(r.sessionId);assert(s);
 assert.equal(jsonSHA(recordProof(s)),r.expectedRecordSHA,'same-value browser save preserves original pieces, values, receipts and evidence');
 r.recordUnchanged=true;r.snapshots=s.snapshots.length;await fs.writeFile(file,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({recordUnchanged:true,snapshots:s.snapshots.length}));
}
