import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {SupabaseObjects} from '../../server/supabaseObjects.ts';
import {BlobStore} from '../../server/blobStore.ts';
import type {Session} from '../../shared/types.ts';

// Recover known PUBLIC copies only. No inferred private values or model calls.
const sourcePhoto='/var/folders/z1/tvwxg8zj4q74myx__52b1_440000gn/T/paseo-attachments-BMUIjY/28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc.jpg';
const photo=await readFile(sourcePhoto),hash=createHash('sha256').update(photo).digest('hex');
assert.equal(hash,'28ce72a474b4cd06f0995427a53a1c8ab815e0c3e3fa656143f91836c8254dbc');
const cached=JSON.parse(await readFile('/private/tmp/kb-debug-session-metadata.json','utf8')) as Session[];
const final=JSON.parse(await readFile('/private/tmp/kb-gemini-production-final-20261027/ui-applied.json','utf8')).session as Session;
const original=cached.find(s=>s.id==='469bea87-2d64-4162-85ad-0bcd4bcc8bf7');assert.ok(original);
assert.equal(final.id,'a2d30e33-7678-486d-8c0d-4252ab5f50d6');
assert.ok(JSON.stringify(final).includes('"sourceImageSHA":"'+hash+'"'));
const prefix='supabase-release-20261028';
const objects=new SupabaseObjects({url:'https://lfwogdbjcczleflkprsm.supabase.co',serviceRoleKey:(await readFile('/private/tmp/kb-supabase-migration-secrets/server-key','utf8')).trim(),bucket:'keepboard-private',prefix});
const store=new BlobStore(objects),rows=[];
for(const [source,title] of [[original,'카탄 · 사용자 사진 복구본'],[final,'카탄 · 판독 시험 복구본']] as const){
 const session=structuredClone(source);assert.equal(session.gamePackId,'catan-base');assert.ok(!session.room);
 const states=[session,...session.snapshots];
 for(const state of states){assert.ok(!('savedScope' in state));assert.ok(state.evidence.every(e=>e.scope==='public'&&!e.ownerId));assert.ok(state.assertions.every(a=>!a.ownerId));}
 const evidence=states.flatMap(s=>s.evidence);assert.equal(new Set(evidence.map(e=>e.id)).size,1);
 assert.ok(evidence.every(e=>e.url===session.evidence[0].url));
 assert.equal(await store.getSession(session.id),undefined,'Recovery does not overwrite existing boards');
 const url=await store.saveEvidence('data:image/jpeg;base64,'+photo.toString('base64'));
 for(const item of evidence)item.url=url;
 session.name=title;
 session.activity.push({id:randomUUID(),at:new Date().toISOString(),type:'recovery',message:'Vercel 다운로드 제한 중 로컬에 남은 공개 확인본과 원사진으로 복구했습니다. 이전 확인 이후 수정 내용은 포함되지 않을 수 있습니다.'});
 await store.saveSession(session);
 const restored=await store.getSession(session.id);assert.ok(restored);assert.deepEqual(restored.assertions,source.assertions);assert.equal(restored.snapshots.length,source.snapshots.length);
 assert.deepEqual((await store.readEvidence(restored.evidence[0])).data,photo);
 rows.push({id:session.id,assertions:restored.assertions.length,snapshots:restored.snapshots.length,evidence:restored.evidence.length,photoSHA256:hash});
}
assert.equal((await store.listSessions()).length,2);
const report={recoveredAt:new Date().toISOString(),namespace:prefix,fullMigration:false,sourceBlobUnchanged:true,recoveredBoards:rows,limitations:['Public cached copies only; latest blocked Blob bytes were not recovered.','Private records and other historical test records are not reconstructed.']};
await writeFile(new URL('./recovery.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
