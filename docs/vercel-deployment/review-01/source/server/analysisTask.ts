import {createHash,randomUUID} from 'node:crypto';
import type {Session,GamePack,Evidence,Assertion,Value,AnalysisResult} from '../shared/types.ts';
import {effectiveRecognitionPack,recognitionCapability} from '../shared/recognition.ts';
import {privateField} from '../shared/privacy.ts';
import {fieldScope} from '../shared/rooms.ts';
import {validateCaptureObservation} from '../shared/photoCapture.ts';
import {assembleSceneAssertions} from './ai/sceneAssembly.ts';
import {isSceneField} from '../shared/sceneFields.ts';
import {genericCandidateValue,appendGenericObservation} from './ai/generic.ts';
import {validateComponentRecord,validateValue} from './engine.ts';
import {Store} from './store.ts';import {PrivatePins} from './privatePin.ts';import * as rooms from './rooms.ts';
import {AnalysisJobError} from './analysisJobs.ts';import type {AnalysisJob} from '../shared/analysisJobs.ts';
export const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function scopeVersion(s:Session,p:GamePack,owner?:string){return digest({pack:[p.id,p.version,p.runtime?.source.sha256],turn:s.turnInstanceId,players:s.players,notes:s.notes[owner??'public'],assertions:s.assertions.filter(a=>a.basis!=='rule'&&(owner?a.ownerId===owner:!privateField(p,a.field)))});}
export interface AnalysisTask{prepared:{session:Session;pack:GamePack;evidence:Evidence[];purpose:string;instruction?:string;sameStaticState:boolean};epoch:string;version:string;source:string;pin:string;owner?:string;actorHash?:string;roomRevisions?:Record<string,number>}
export function analysisBatches(task:AnalysisTask){const groups=new Map<string,Evidence[]>();for(const e of task.prepared.evidence){const key=JSON.stringify([e.ownerId??null,e.captureEpoch,e.captureTarget?.areaId??null]);groups.set(key,[...(groups.get(key)??[]),e]);}return [...groups.values()].flatMap(es=>Array.from({length:Math.ceil(es.length/6)},(_,i)=>es.slice(i*6,i*6+6)));}
export async function taskTarget(store:Store,pins:PrivatePins,t:AnalysisTask){
 const current=await store.getSession(t.prepared.session.id);if(!current)throw new AnalysisJobError('기록을 찾을 수 없어요.',409);const pack=effectiveRecognitionPack(current.gamePack??t.prepared.pack);
 if(current.captureEpoch!==t.epoch||scopeVersion(current,pack,t.owner)!==t.version||await pins.configurationStamp(current.id,t.owner)!==t.pin||digest(current.evidence.filter(e=>t.prepared.evidence.some(x=>x.id===e.id)))!==t.source)throw new AnalysisJobError('기록이 바뀌었어요.',409);
 if(current.room){const actor=rooms.record(current)?.members.find(m=>m.hash===t.actorHash);if(!actor||(t.owner?actor.playerId!==t.owner:actor.role!=='host'))throw new AnalysisJobError('사진 읽기 권한이 바뀌었어요.',409);const scope=t.owner??'public';if(current.room.revisions[scope]!==t.roomRevisions?.[scope])throw new AnalysisJobError('기록이 바뀌었어요.',409);}
 if(t.owner&&!current.players.some(p=>p.id===t.owner))throw new AnalysisJobError('플레이어가 바뀌었어요.',409);return {current,pack};
}
export async function commitAnalysisTask(store:Store,pins:PrivatePins,t:AnalysisTask,job:AnalysisJob,results:AnalysisResult[]){
 const existing=await store.getSession(job.sessionId),receipt=existing?.assertions.filter(a=>a.analysisJobId===job.id);if(receipt?.length)return {state:'completed' as const,candidateCount:receipt.length,mode:'live' as const};
 const {current,pack}=await taskTarget(store,pins,t),evidence=t.prepared.evidence,ids=new Set(evidence.map(e=>e.id)),next:Assertion[]=[];
 const assertions=assembleSceneAssertions(results.flatMap(r=>r.assertions),evidence,new Set(pack.fields.filter(isSceneField).map(f=>f.key)));
 for(const a of assertions){const f=pack.fields.find(f=>f.key===a.field);if(!f||a.value===null)continue;
  const allowed=current.room?fieldScope(pack,a.field,a.ownerId)===(t.owner??'public'):t.owner?f.scope==='player'&&a.ownerId===t.owner:f.scope==='public'&&!a.ownerId||f.scope==='player'&&f.visibility==='public'&&current.players.some(p=>p.id===a.ownerId);
  if(!allowed||!a.evidenceIds.length||a.evidenceIds.some(id=>!ids.has(id)))throw new AnalysisJobError('결과 범위를 확인하세요.');
  validateCaptureObservation(pack,a.field,a.value,evidence.filter(e=>a.evidenceIds.includes(e.id)));validateValue(f,a.value);let value:Value=a.value;
  if(recognitionCapability(pack).mode==='assisted')value=genericCandidateValue(value,pack,a.field,evidence.filter(e=>a.evidenceIds.includes(e.id)),a.ownerId);
  if(pack.runtime?.fieldBindings.some(b=>b.key===a.field&&b.editor==='component-catalog'))value=validateComponentRecord(current,pack,a.field,value,a.ownerId,a.evidenceIds) as unknown as Value;
  rooms.refsAllowed(value,ids);next.push({...a,value,analysisJobId:job.id,id:randomUUID(),basis:'observation',status:'candidate',turnInstanceId:current.turnInstanceId,updatedAt:new Date().toISOString()});
 }
 for(const a of next)appendGenericObservation(current,pack,a);if(t.prepared.purpose==='restore')current.stage='restore';
 current.analysisSummary=results.map(r=>r.summary).join('\n');current.analysisSummaryOwnerId=t.owner??null;
 current.activity.push({id:randomUUID(),type:'analyze',message:'서버 사진 읽기 완료',at:new Date().toISOString()});await store.saveSession(current);
 return {state:'completed' as const,candidateCount:next.length,mode:results[0]?.mode??'live' as const};
}
