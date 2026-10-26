// Test-only setup in the fresh synthetic preview; never point at an operational Store.
import {readFile} from 'node:fs/promises';import {PrivatePins} from '../../server/privatePin.ts';import {Store} from '../../server/store.ts';
const info=JSON.parse(await readFile(new URL('./preview.json',import.meta.url),'utf8'));if(!info.synthetic||!info.dataDir.includes('kb-rooms-preview-'))throw new Error('Synthetic Store required');
const sessionId='67f5293b-e22a-4afe-b829-fc2d882ca4db',ownerId='c9b76e7e-4de2-470b-aedd-5cea7edc1489',session=await new Store(info.dataDir).getSession(sessionId);if(session?.name!=='[합성] 참가 검수 방'||!session.players.some(p=>p.id===ownerId))throw new Error('Synthetic fixture mismatch');
await new PrivatePins(info.dataDir).configure(sessionId,ownerId,{enabled:true,pin:'0007'},'synthetic-fixture');console.log('Synthetic optional PIN fixture configured; no personal content printed.');
