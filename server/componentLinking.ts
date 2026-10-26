import {randomUUID} from 'node:crypto';import type {Assertion,GamePack,Session,Value} from '../shared/types.ts';
import type {GenericPiece,GenericRecord} from '../shared/genericRecord.ts';
import {componentLinkTargets,componentRecord,latestComponentAssertion,linkedComponents,type ComponentLinkRequest} from '../shared/componentLinking.ts';
import {validateComponentRecord} from './engine.ts';import {runtimeBinding} from '../shared/gameEssentials.ts';import {ConflictError} from './objects.ts';
import {receiptsForValue} from './observationReceipts';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function accepted(session:Session,pack:GamePack,field:string,ownerId:string|undefined,value:GenericRecord){
 const checked=validateComponentRecord(session,pack,field,value as unknown as Value,ownerId,undefined,{trustedLink:true}),observationReceipts=receiptsForValue(session,value as unknown as Value,ownerId);
 session.assertions=session.assertions.filter(a=>a.status!=='accepted'||a.field!==field||a.ownerId!==ownerId);
 const a:Assertion={id:randomUUID(),field,ownerId,value:checked as unknown as Value,status:'accepted',basis:'user',evidenceIds:[...new Set(checked.pieces.flatMap(p=>p.evidenceId?[p.evidenceId]:[]))],...(observationReceipts.length?{observationReceipts}:{}),turnInstanceId:session.turnInstanceId,updatedAt:new Date().toISOString()};session.assertions.push(a);return a;
}
/** Caller authorizes room/PIN scopes; this transaction is staged in a clone until every record validates. */
export function linkComponents(session:Session,pack:GamePack,request:ComponentLinkRequest){
 const r=request;if(!r||typeof r.sourceAssertionId!=='string'||!Array.isArray(r.pieceIds)||!r.pieceIds.length||r.pieceIds.length>500||r.pieceIds.some(x=>typeof x!=='string'||!x)||new Set(r.pieceIds).size!==r.pieceIds.length||!r.target||typeof r.target.field!=='string'||r.target.ownerId!==undefined&&typeof r.target.ownerId!=='string'||r.expectedTargetAssertionId!==null&&typeof r.expectedTargetAssertionId!=='string')throw Error('연결할 실물과 목적지를 확인하세요.');
 const source=session.assertions.find(a=>a.id===r.sourceAssertionId&&['candidate','accepted'].includes(a.status)),record=componentRecord(source);if(!source||!record)throw new ConflictError();
 if(source.status==='accepted'&&latestComponentAssertion(session,source.field,source.ownerId)?.id!==source.id)throw new ConflictError();
 const selected=record.pieces.filter(p=>r.pieceIds.includes(p.id));if(selected.length!==r.pieceIds.length)throw new ConflictError();
 const links=linkedComponents(session),already=source.status==='candidate'?selected.map(p=>links.find(x=>x.origin.assertionId===source.id&&x.origin.pieceId===p.id)):[];
 if(already.some(x=>x&&(x.assertion.field!==r.target.field||x.assertion.ownerId!==r.target.ownerId)))throw new ConflictError();
 if(already.length&&already.every(Boolean))return {moved:0,idempotent:true};
 if(!componentLinkTargets(pack,session.players,selected).some(t=>t.field===r.target.field&&t.ownerId===r.target.ownerId))throw Error('이 실물은 선택한 기록 영역에 연결할 수 없어요.');
 if(source.status==='accepted'&&source.field===r.target.field&&source.ownerId===r.target.ownerId)return {moved:0,idempotent:true};
 const current=latestComponentAssertion(session,r.target.field,r.target.ownerId);if((current?.id??null)!==r.expectedTargetAssertionId)throw new ConflictError();
 const targetRecord=componentRecord(current);if(current&&!targetRecord)throw Error('기존 기록 형식은 그대로 보존됩니다. 다른 연결 영역을 선택해 주세요.');
 const corrections=r.corrections??selected;if(!Array.isArray(corrections)||corrections.length!==selected.length||new Set(corrections.map(p=>p.id)).size!==selected.length||corrections.some(p=>!selected.some(o=>o.id===p.id)))throw Error('선택한 실물만 정정할 수 있어요.');
 const added:GenericPiece[]=[];for(const original of selected){if(already.some(x=>x?.origin.pieceId===original.id))continue;const p=structuredClone(corrections.find(p=>p.id===original.id)!);
  if(p.evidenceId!==original.evidenceId||!same(p.region,original.region)||!same(p.linkOrigin,original.linkOrigin)||!same(p.placement,original.placement))throw Error('연결하면서 원본·사진 영역·실물 연결을 바꿀 수 없어요.');
  if((targetRecord?.pieces??[]).some(q=>q.id===p.id))throw new ConflictError();
  const origin=p.linkOrigin??{assertionId:source.id,pieceId:p.id,field:source.field,...(source.ownerId?{ownerId:source.ownerId}:{})};
  if(p.placement&&!runtimeBinding(pack,r.target.field)?.areaIds.includes(p.placement.areaId)){if(r.clearPlacement!==true)throw Error('다른 영역의 배치는 추측하지 않아요. 배치하지 않고 옮기기를 확인해 주세요.');origin.previousPlacement=structuredClone(p.placement);delete p.placement;}
  p.linkOrigin=origin;added.push(p);
 }
 const staged=structuredClone(session);accepted(staged,pack,r.target.field,r.target.ownerId,{version:'game-component-record-v1',pieces:[...(targetRecord?.pieces??[]),...added]});
 if(source.status==='accepted')accepted(staged,pack,source.field,source.ownerId,{version:'game-component-record-v1',pieces:record.pieces.filter(p=>!r.pieceIds.includes(p.id))});
 session.assertions=staged.assertions;return {moved:added.length,idempotent:false};
}
