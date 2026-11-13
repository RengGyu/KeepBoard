import {snapshotRestoration} from './restorationState';
import {createHash,randomUUID} from 'node:crypto';
import type {GamePack,Session,Snapshot} from '../shared/types';
import {fieldScope,roomScopeKey} from '../shared/rooms';
import type {SaveIntent} from '../shared/saveIntent';
import {canonicalJSON,photoDefinition} from './photoDefinitions';
import {readingAreas} from '../shared/restoration';
import {isHostedReader,type HostedReaderSelection} from '../shared/lightweightRecognition';
const sha=(v:unknown)=>createHash('sha256').update(canonicalJSON(v)).digest('hex');
export function intentForCommit(session:Session,pack:GamePack,raw:unknown,scopeKey='public'):SaveIntent{
 const r=raw as {reader:HostedReaderSelection;evidenceIds:string[]};
 if(!r||!isHostedReader(r.reader)||Object.keys(r).some(k=>!['reader','evidenceIds'].includes(k))||Object.keys(r.reader).some(k=>!['kind','areaId','definitionSHA','frame','readingTarget','target','readMode','scene'].includes(k))||!Array.isArray(r.evidenceIds)||!r.evidenceIds.length||r.evidenceIds.length>6||new Set(r.evidenceIds).size!==r.evidenceIds.length)throw Error('저장할 판독 대상과 사진을 확인하세요.');
 if(r.reader.readMode!==undefined&&!['values','cells','boxes'].includes(r.reader.readMode))throw Error('판독 모드를 확인하세요.');
 const d=photoDefinition(pack,r.reader.definitionSHA),areas=readingAreas(pack,d,r.reader.areaId,r.reader.readingTarget),owner=scopeKey==='public'?undefined:scopeKey;
 if(areas.some(a=>owner?a.partition!=='owner_private':a.partition==='owner_private'))throw Error('저장 의도의 공개·본인 범위를 확인하세요.');
 for(const id of r.evidenceIds){const e=session.evidence.find(e=>e.id===id);if(!e||e.kind!=='photo'||e.captureEpoch!==session.captureEpoch||e.ownerId!==owner||e.scope!==(owner?'player':'public'))throw Error('현재 범위의 원사진만 저장 판독할 수 있습니다.');}
 const evidenceIds=[...r.evidenceIds].sort(),signature=sha([session.id,scopeKey,session.captureEpoch,pack.id,pack.version,pack.runtime?.source.sha256,evidenceIds,r.reader]);
 const prior=session.saveIntents?.find(i=>i.signature===signature);if(prior)return prior;
 const id='save-'+signature.slice(0,40),intent:SaveIntent={version:'save-intent-v1',id,requestId:id,scopeKey,captureEpoch:session.captureEpoch,packVersion:pack.version,sourceSHA:d.sourceSHA,definitionSHA:d.definitionSHA,reader:structuredClone(r.reader),evidenceIds,signature,createdAt:new Date().toISOString()};
 (session.saveIntents??=[]).push(intent);return intent;
}
export function analysisSaveIntent(session:Session,pack:GamePack,body:any,owner?:string):SaveIntent|undefined{
 if(body.saveIntentId===undefined)return;
 const intent=session.saveIntents?.find(i=>i.id===body.saveIntentId);
 if(!intent||intent.scopeKey!==(owner??'public')||intent.captureEpoch!==session.captureEpoch||intent.packVersion!==pack.version||intent.sourceSHA!==pack.runtime?.source.sha256||sha(intent.reader)!==sha(body.reader)||sha(intent.evidenceIds)!==sha([...body.evidenceIds].sort())||body.instruction||body.purpose&&body.purpose!=='capture')throw Error('저장 의도와 판독 입력·범위가 다릅니다.');
 return intent;
}
export function latestScopeSnapshot(session:Session,key:string){return [...session.snapshots].reverse().find(s=>s.savedScope?roomScopeKey(s.savedScope)===key:!session.room);}
export function snapshotForIntent(session:Session,pack:GamePack,intent:SaveIntent,jobId:string):Snapshot{
 const key=intent.scopeKey,scoped=session.room||key!=='public',accept=(a:Session['assertions'][number])=>scoped?fieldScope(pack,a.field,a.ownerId)===key:!a.ownerId||pack.fields.some(f=>f.key===a.field&&f.visibility==='public'),assertions=session.assertions.filter(accept),refs=new Set(assertions.flatMap(a=>a.evidenceIds));
 return {restoration:snapshotRestoration(session,assertions,session.evidence.filter(e=>(e.ownerId??'public')===key||!e.ownerId&&e.scope==='public'&&refs.has(e.id))),id:randomUUID(),createdAt:new Date().toISOString(),captureEpoch:session.captureEpoch,turnInstanceId:session.turnInstanceId,gamePackVersion:session.gamePackVersion,saveIntentId:intent.id,analysisJobId:jobId,savedScope:key==='public'?{scope:'public'}:{scope:'owner',ownerId:key},assertions:structuredClone(assertions),evidence:structuredClone(session.evidence.filter(e=>(e.ownerId??'public')===key||!e.ownerId&&e.scope==='public'&&refs.has(e.id))),preservations:structuredClone(session.preservations.filter(p=>(p.ownerId??'public')===key)),notes:Object.fromEntries(Object.entries(session.notes).filter(([k])=>k===key))};
}
