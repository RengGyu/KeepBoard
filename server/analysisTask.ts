import {projectScanResults} from './scanObservation';
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
import {photoDefinition} from './photoDefinitions';
export const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function scopeVersion(s:Session,p:GamePack,owner?:string){return digest({pack:[p.id,p.version,p.runtime?.source.sha256],turn:s.turnInstanceId,players:s.players,notes:s.notes[owner??'public'],assertions:s.assertions.filter(a=>a.basis!=='rule'&&(owner?a.ownerId===owner:!privateField(p,a.field)))});}
export interface AnalysisTask{prepared:{session:Session;pack:GamePack;evidence:Evidence[];purpose:string;instruction?:string;sameStaticState:boolean;localObservation?:import('./localObservation').PinnedLocalObservation;hostedObservation?:import('./hostedObservation').PinnedHostedObservation;scanIntent?:import('./scanExecution').ScanIntent;scanObservation?:import('./scanObservation').PinnedScanObservation};epoch:string;version:string;source:string;pin:string;owner?:string;actorHash?:string;roomRevisions?:Record<string,number>}
export function analysisBatches(task:AnalysisTask){if(task.prepared.scanIntent&&!task.prepared.scanObservation)return task.prepared.scanIntent.evidenceIds.map(id=>task.prepared.evidence.filter(e=>e.id===id));if(task.prepared.scanObservation)return task.prepared.scanObservation.units.map(u=>task.prepared.evidence.filter(e=>e.id===u.evidenceId));const groups=new Map<string,Evidence[]>();for(const e of task.prepared.evidence){const key=JSON.stringify([e.ownerId??null,e.captureEpoch,e.captureTarget?.areaId??null]);groups.set(key,[...(groups.get(key)??[]),e]);}return [...groups.values()].flatMap(es=>Array.from({length:Math.ceil(es.length/6)},(_,i)=>es.slice(i*6,i*6+6)));}
export async function taskTarget(store:Store,pins:PrivatePins,t:AnalysisTask){
 const current=await store.getSession(t.prepared.session.id);if(!current)throw new AnalysisJobError('기록을 찾을 수 없어요.',409);const pack=effectiveRecognitionPack(current.gamePack??t.prepared.pack);
 if(current.captureEpoch!==t.epoch||scopeVersion(current,pack,t.owner)!==t.version||await pins.configurationStamp(current.id,t.owner)!==t.pin||digest(current.evidence.filter(e=>t.prepared.evidence.some(x=>x.id===e.id)))!==t.source)throw new AnalysisJobError('기록이 바뀌었어요.',409);
 if(current.room){const actor=rooms.record(current)?.members.find(m=>m.hash===t.actorHash);if(!actor||(t.owner?actor.playerId!==t.owner:actor.role!=='host'))throw new AnalysisJobError('사진 읽기 권한이 바뀌었어요.',409);const scope=t.owner??'public';if(current.room.revisions[scope]!==t.roomRevisions?.[scope])throw new AnalysisJobError('기록이 바뀌었어요.',409);}
 if(t.owner&&!current.players.some(p=>p.id===t.owner))throw new AnalysisJobError('플레이어가 바뀌었어요.',409);
 if(t.prepared.scanIntent)photoDefinition(pack,t.prepared.scanIntent.selection.definitionSHA);
 if(t.prepared.scanObservation)photoDefinition(pack,t.prepared.scanObservation.plan.definitionSHA);
 if(t.prepared.localObservation||t.prepared.hostedObservation)photoDefinition(pack,(t.prepared.localObservation??t.prepared.hostedObservation)!.request.definitionSHA);
 return {current,pack};
}
export async function commitAnalysisTask(store:Store,pins:PrivatePins,t:AnalysisTask,job:AnalysisJob,results:AnalysisResult[]){
 if(t.prepared.scanIntent&&!t.prepared.scanObservation)throw new AnalysisJobError('준비가 완료되지 않은 스캔입니다.',409);
 const existing=await store.getSession(job.sessionId),receipt=existing?.assertions.filter(a=>a.analysisJobId===job.id);if(receipt?.length)return {state:'completed' as const,candidateCount:receipt.length,mode:'live' as const};
 const {current,pack}=await taskTarget(store,pins,t),evidence=t.prepared.evidence,ids=new Set((t.prepared.scanObservation?current.evidence.filter(e=>t.owner?e.ownerId===t.owner&&e.scope==='player':!e.ownerId&&e.scope==='public'):evidence).map(e=>e.id)),next:Assertion[]=[];
 const plan=t.prepared.localObservation??t.prepared.hostedObservation,observationReceipts=[...new Map(results.flatMap(r=>r.observationReceipts??r.assertions.flatMap(a=>a.observationReceipts??[])).map(r=>[digest(r),r])).values()];
 const validReceipt=(r:import('../shared/lightweightRecognition').ObservationReceipt)=>!!plan&&digest(r.request)===digest(plan.request)&&digest(r.reader)===digest(plan.reader)&&digest(r.taskProfile??null)===digest(plan.taskProfile??null)&&digest(r.transforms)===digest(plan.transforms)&&digest(r.frame??null)===digest(plan.frame??null)&&(!plan.sourceImageSHA||r.sourceImageSHA===plan.sourceImageSHA)&&(!plan.taskProfile||r.nativeWire?.id===plan.taskProfile.wire);
 if(plan&&(!observationReceipts.length||observationReceipts.some(r=>!validReceipt(r))||digest(job.taskProfile??null)!==digest(plan.taskProfile??null)||digest(job.reader)!==digest(plan.reader)||job.definitionSHA!==plan.request.definitionSHA||job.inputSHA!==plan.request.images[0].sha256))throw new AnalysisJobError('고정한 로컬 작업 profile과 관측 근거가 다릅니다.');
 if(t.prepared.scanObservation){
  const scan=t.prepared.scanObservation;
  for(const r of observationReceipts){const u=scan.units.find(u=>u.id===r.scanUnitId),p=u?.hosted??u?.local;if(!p||digest(r.request)!==digest(p.request)||digest(r.reader)!==digest(p.reader)||digest(r.transforms)!==digest(p.transforms)||digest(r.frame??null)!==digest(p.frame??null)||r.sourceImageSHA!==p.sourceImageSHA)throw new AnalysisJobError('고정한 스캔 단위와 결과가 다릅니다.');}
  if(results.length!==scan.units.length||results.some(r=>!r.scanBundle||digest(r.scanBundle.plan)!==digest(scan.plan)))throw new AnalysisJobError('고정한 읽기 단위 결과가 다릅니다.');
  results=[projectScanResults(current,pack,scan,results)];
 }
 const assertions=assembleSceneAssertions(results.flatMap(r=>r.assertions),evidence,new Set(pack.fields.filter(isSceneField).map(f=>f.key)));
 for(const a of assertions){const f=pack.fields.find(f=>f.key===a.field);if(!f||a.value===null)continue;
  const allowed=current.room?fieldScope(pack,a.field,a.ownerId)===(t.owner??'public'):t.owner?f.scope==='player'&&a.ownerId===t.owner:f.scope==='public'&&!a.ownerId||f.scope==='player'&&f.visibility==='public'&&current.players.some(p=>p.id===a.ownerId);
  if(!allowed||!a.evidenceIds.length||a.evidenceIds.some(id=>!ids.has(id)))throw new AnalysisJobError('결과 범위를 확인하세요.');
  if(!t.prepared.scanObservation)validateCaptureObservation(pack,a.field,a.value,evidence.filter(e=>a.evidenceIds.includes(e.id)));validateValue(f,a.value);let value:Value=a.value;
  if(!t.prepared.scanObservation&&recognitionCapability(pack).mode==='assisted')value=genericCandidateValue(value,pack,a.field,evidence.filter(e=>a.evidenceIds.includes(e.id)),a.ownerId);
  if(pack.runtime?.fieldBindings.some(b=>b.key===a.field&&b.editor==='component-catalog'))value=validateComponentRecord(current,pack,a.field,value,a.ownerId,a.evidenceIds) as unknown as Value;
  rooms.refsAllowed(value,ids);
  if(plan&&(!a.observationReceipts?.length||a.observationReceipts.some(r=>!validReceipt(r))))throw new AnalysisJobError('고정한 로컬 관측 근거와 결과가 다릅니다.');
  const candidate:Assertion={...a,value,analysisJobId:job.id,id:randomUUID(),basis:'observation',status:'accepted',turnInstanceId:current.turnInstanceId,updatedAt:new Date().toISOString()};
  // The reading is the current editable record, not a separate approval queue.
  if(pack.id==='catan-base'&&!candidate.ownerId&&candidate.field==='components.observed')candidate.field='board.layout';
  if(!t.prepared.scanObservation&&(value as any)?.pieces?.some((p:any)=>p.spatial)){
   const prior=current.assertions.filter(a=>a.field===candidate.field&&a.ownerId===candidate.ownerId&&a.status==='accepted').at(-1),old=(prior?.value as any)?.pieces??[],incoming=(value as any).pieces;
   candidate.value={...(value as any),pieces:[...old,...incoming.filter((p:any)=>!old.some((o:any)=>o.id===p.id||o.spatial&&p.spatial&&o.spatial.source.taskId===p.spatial.source.taskId&&o.spatial.observationRef===p.spatial.observationRef))]};
   candidate.observationReceipts=[...(prior?.observationReceipts??[]),...(candidate.observationReceipts??[])];
  }
  next.push(candidate);
 }
 for(const a of next){
  current.assertions=current.assertions.filter(old=>!(old.field===a.field&&old.ownerId===a.ownerId&&old.basis!=='rule'));
  appendGenericObservation(current,pack,a);
 }
 if(current.room&&next.length)rooms.bump(current,new Set(next.map(a=>fieldScope(pack,a.field,a.ownerId))));if(t.prepared.purpose==='restore')current.stage='restore';
 current.analysisSummary=results.map(r=>r.summary).join('\n');current.analysisSummaryOwnerId=t.owner??null;
 current.activity.push({id:randomUUID(),type:'analyze',message:'서버 사진 읽기 완료',at:new Date().toISOString()});await store.saveSession(current);
 return {state:results[0]?.scanBundle?.units.every(u=>u.state!=='completed')?'failed' as const:'completed' as const,candidateCount:next.length,mode:results[0]?.mode??'live' as const,...(plan||t.prepared.scanObservation?{observationReceipts}:{}),...(results[0]?.scanBundle?{scanBundle:results[0].scanBundle}:{})};
}
