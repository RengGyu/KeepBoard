import {randomUUID} from 'node:crypto';
import type {GamePack,Session} from '../shared/types.ts';
import {privateField} from '../shared/privacy.ts';
import {latestSnapshot,inRoomScope} from '../shared/rooms.ts';
import {isTurnField} from './engine.ts';

/** Explicit restore changes one visibility partition; opening a session never calls this. */
export function resumeSnapshot(session:Session,pack:GamePack,scope:'public'|'owner'='public',ownerId?:string){
 const saved=latestSnapshot(session,scope==='public'?'public':ownerId);if(!saved)throw new Error('먼저 저장본을 만드세요.');
 if(scope==='owner'&&!session.players.some(p=>p.id===ownerId))throw new Error('복원할 플레이어를 지정하세요.');
 const assertion=(a:Session['assertions'][number])=>session.room?inRoomScope(pack,a,scope==='public'?'public':ownerId!):scope==='owner'?a.ownerId===ownerId&&privateField(pack,a.field):!privateField(pack,a.field);
 const photo=(e:Session['evidence'][number])=>scope==='owner'?e.ownerId===ownerId:!e.ownerId&&e.scope==='public';
 const preserve=(p:Session['preservations'][number])=>scope==='owner'?p.ownerId===ownerId:!p.ownerId;
 const currentPhotos=session.evidence.filter(e=>!photo(e)),restoredPhotos=saved.evidence.filter(photo);
 const restoredAssertions=structuredClone(saved.assertions.filter(assertion));
 // Only state effective when saved joins the current logical turn; purchase/history and candidates keep their original tags.
 for(const item of restoredAssertions)if(item.status==='accepted'&&item.basis!=='rule'&&item.turnInstanceId===saved.turnInstanceId&&isTurnField(pack.fields.find(field=>field.key===item.field)))item.turnInstanceId=session.turnInstanceId;
 session.assertions=[...session.assertions.filter(a=>!assertion(a)),...restoredAssertions];
 // Retained private assertions may cite a public original that is absent from the old public snapshot.
 const retainedRefs=new Set(session.assertions.filter(a=>!assertion(a)).flatMap(a=>a.evidenceIds));
 const retainedOriginals=session.evidence.filter(e=>retainedRefs.has(e.id));
 const restoredRefs=new Set(saved.assertions.filter(assertion).flatMap(a=>a.evidenceIds));
 const sharedOriginals=saved.evidence.filter(e=>e.scope==='public'&&!e.ownerId&&restoredRefs.has(e.id));
 session.evidence=[...new Map([...currentPhotos,...structuredClone(restoredPhotos),...retainedOriginals,...structuredClone(sharedOriginals)].map(e=>[e.id,e])).values()];
 session.preservations=[...session.preservations.filter(p=>!preserve(p)),...structuredClone(saved.preservations.filter(preserve)).map(p=>({...p,restored:false}))];
 if(scope==='owner'){
  if(saved.notes[ownerId!]===undefined)delete session.notes[ownerId!];else session.notes[ownerId!]=saved.notes[ownerId!];
 }else{
  if(saved.notes.public===undefined)delete session.notes.public;else session.notes.public=saved.notes.public;
  session.stage='restore';session.captureEpoch=randomUUID();
  // The explicit public restore retains the current logical turn; it is not a game action or a rewind.
 }
 if(scope==='public'&&!session.analysisSummaryOwnerId||scope==='owner'&&session.analysisSummaryOwnerId===ownerId){session.analysisSummary=undefined;session.analysisSummaryOwnerId=undefined;}
}
