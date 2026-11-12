/** User layout only. Never a model observation, canonical board address, or human owner claim. */
import {frameFromCorners,type BoardCorners} from './estimatedGeometry';
import type {StructureAnchorRef,StructurePieceRef} from './structureRelations';
interface StructureOverrideBase {areaId:string;groupId:string;order:number;slot:number|null;anchorPieceId:string|null;attachedToPieceId:string|null}
export type EstimatedStructureOverride=({version:'estimated-structure-override-v1'}&StructureOverrideBase)|({version:'estimated-structure-override-v2';sourceKey:string;anchorRef?:StructureAnchorRef|null;attachedToRef?:StructurePieceRef|null;beforeRefs?:StructurePieceRef[];frame?:{corners:BoardCorners}|null;active?:boolean}&StructureOverrideBase);
export const ESTIMATED_AREAS:Record<string,readonly {id:string;label:string}[]>={
 'lost-cities':[{id:'board',label:'원정판'},{id:'expeditions',label:'가까운·먼 쪽 색줄'},{id:'discard',label:'버림 카드'},{id:'unclassified',label:'미분류 추정 영역'}],
 'seven-wonders':[{id:'wonder',label:'관측 불가사의판'},{id:'tableau',label:'판 주변 색별 카드'},{id:'stages',label:'판 단계·끼운 카드'},{id:'coins',label:'동전'},{id:'military',label:'군사 토큰'},{id:'unclassified',label:'미분류 추정 영역'}],
 sagrada:[{id:'window',label:'창문판·기존 칸'},{id:'round-track',label:'라운드 트랙'},{id:'tools',label:'도구 카드줄'},{id:'goals',label:'목표 카드줄'},{id:'favors',label:'특권 토큰'},{id:'unclassified',label:'미분류 추정 영역'}]
};
const text=(v:unknown,max=2048):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const keys=(v:unknown,required:string[],optional:string[]=[])=>!!v&&typeof v==='object'&&!Array.isArray(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>[...required,...optional].includes(k));
const pieceRef=(r:unknown):r is StructurePieceRef=>keys(r,['assertionId','pieceId'])&&text((r as any).assertionId,200)&&text((r as any).pieceId,200);
const anchorRef=(r:unknown):r is StructureAnchorRef=>!!r&&((r as any).kind==='live-piece'?keys(r,['kind','assertionId','pieceId'])&&pieceRef({assertionId:(r as any).assertionId,pieceId:(r as any).pieceId}):(r as any).kind==='observed-board'&&keys(r,['kind','taskId','boardInstanceRef'])&&text((r as any).taskId,300)&&text((r as any).boardInstanceRef,600));
export function validateStructureOverride(q:EstimatedStructureOverride,gameId:string,mode?:'manual'|'ai'){
 const fail=()=>{throw Error('추정 판의 수동 그룹·순서·상대 자리를 확인하세요. 관측 값과 원사진은 유지됩니다.');},base=['version','areaId','groupId','order','slot','anchorPieceId','attachedToPieceId'],v2=q?.version==='estimated-structure-override-v2';
 if(mode==='ai'||!keys(q,v2?[...base,'sourceKey']:base,v2?['anchorRef','attachedToRef','beforeRefs','frame','active']:[])||!['estimated-structure-override-v1','estimated-structure-override-v2'].includes(q.version)||!ESTIMATED_AREAS[gameId]?.some(a=>a.id===q.areaId)||!text(q.groupId)||!Number.isSafeInteger(q.order)||q.order<0||q.order>100000||q.slot!==null&&!(gameId==='sagrada'&&['round-track','window'].includes(q.areaId)&&Number.isSafeInteger(q.slot)&&q.slot>=1&&q.slot<=(q.areaId==='window'?20:10))||[q.anchorPieceId,q.attachedToPieceId].some(v=>v!==null&&!text(v,200)))fail();
 if(!v2)return;const value=q as Extract<EstimatedStructureOverride,{version:'estimated-structure-override-v2'}>;let source:any;try{source=JSON.parse(value.sourceKey);}catch{fail();}
 if(!Array.isArray(source)||source.length!==5||source[0]!==null&&!text(source[0],200)||!text(source[1],200)||![source[2],source[4]].every(s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s))||!text(source[3],200))fail();
 if(value.anchorRef!==undefined&&value.anchorRef!==null&&!anchorRef(value.anchorRef)||value.attachedToRef!==undefined&&value.attachedToRef!==null&&!pieceRef(value.attachedToRef)||value.active!==undefined&&typeof value.active!=='boolean')fail();
 if(value.anchorRef&&value.anchorPieceId!==null&&(value.anchorRef.kind!=='live-piece'||value.anchorRef.pieceId!==value.anchorPieceId)||value.attachedToRef&&value.attachedToPieceId!==null&&value.attachedToRef.pieceId!==value.attachedToPieceId)fail();
 if(value.beforeRefs!==undefined&&(!Array.isArray(value.beforeRefs)||value.beforeRefs.length>128||value.beforeRefs.some(r=>!pieceRef(r))||new Set(value.beforeRefs.map(r=>JSON.stringify([r.assertionId,r.pieceId]))).size!==value.beforeRefs.length))fail();
 if(value.frame!==undefined&&value.frame!==null){const f=value.frame;if(!keys(f,['corners'])||!Array.isArray(f.corners)||f.corners.length!==4||f.corners.some(p=>!keys(p,['x','y'])||![p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))||!frameFromCorners(f.corners))fail();}
}
