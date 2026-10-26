import type {Assertion,GamePack,Value} from './types.ts';
import {validateSplendorObservation,type SplendorObservation} from './splendor.ts';
import {runtimeBinding} from './gameEssentials.ts';
export interface GenericPlacement {areaId:string;x:number;y:number;rotation:0|90|180|270}
export interface GenericPiece {readout?:SplendorObservation;placement?:GenericPlacement;id:string;componentId:string|null;variant:string|null;quantity:number|null;label:string;anchor:string;evidenceId:string|null;region:Assertion['region']|null}
export interface GenericRecord {version:'game-component-record-v1';pieces:GenericPiece[]}
export function emptyGenericRecord():GenericRecord{return {version:'game-component-record-v1',pieces:[]};}
export function validateGenericRecord(value:Value,pack:GamePack,field:string,allowedEvidenceIds:string[]):GenericRecord {
 const binding=runtimeBinding(pack,field),raw=value as unknown as GenericRecord;
 if(!raw||raw.version!=='game-component-record-v1'||!Array.isArray(raw.pieces))throw new Error('구성물 목록 형식을 확인하세요. 원본은 그대로 유지됩니다.');
 const seen=new Set<string>();
 for(const p of raw.pieces){
  if(!p||typeof p.id!=='string'||!p.id||seen.has(p.id))throw new Error('실물별로 서로 다른 ID가 필요합니다.');seen.add(p.id);
  if(Object.hasOwn(p,'readout')){if((pack.runtime?.source.gameId??pack.id)!=='splendor')throw new Error('이 게임의 판독 정보가 아닙니다.');validateSplendorObservation(p.readout,p.componentId,p.label);}
  if(p.componentId!==null&&!binding?.componentIds.includes(p.componentId))throw new Error('이 기록의 구성물 종류를 선택하세요.');
  if(Object.hasOwn(p,'placement')){const q=p.placement;if(!q||!binding?.areaIds.includes(q.areaId)||!Number.isFinite(q.x)||!Number.isFinite(q.y)||q.x<0||q.x>1||q.y<0||q.y>1||![0,90,180,270].includes(q.rotation))throw new Error('기록 배치의 영역과 위치를 확인하세요. 원본 배치는 그대로 유지됩니다.');}
  if(p.quantity!==null&&(!Number.isInteger(p.quantity)||p.quantity<0))throw new Error('수량은 0 이상 정수 또는 모름으로 남겨 주세요.');
  if(typeof p.label!=='string'||typeof p.anchor!=='string'||p.variant!==null&&typeof p.variant!=='string')throw new Error('구성물 이름과 위치 메모를 확인하세요.');
  if(p.evidenceId!==null&&!allowedEvidenceIds.includes(p.evidenceId))throw new Error('이 영역에서 볼 수 있는 원본만 연결하세요.');
  if(p.region){const r=p.region;if(!p.evidenceId||![r.x,r.y,r.width,r.height].every(Number.isFinite)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw new Error('원본 영역을 확인하세요.');}
 }
 return structuredClone(raw);
}
