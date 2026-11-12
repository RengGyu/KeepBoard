/** User layout only. Never a model observation, canonical board address, or human owner claim. */
export interface EstimatedStructureOverride {version:'estimated-structure-override-v1';areaId:string;groupId:string;order:number;slot:number|null;anchorPieceId:string|null;attachedToPieceId:string|null}
export const ESTIMATED_AREAS:Record<string,readonly {id:string;label:string}[]>={
 'lost-cities':[{id:'board',label:'원정판'},{id:'expeditions',label:'가까운·먼 쪽 색줄'},{id:'discard',label:'버림 카드'},{id:'unclassified',label:'미분류 추정 영역'}],
 'seven-wonders':[{id:'wonder',label:'관측 불가사의판'},{id:'tableau',label:'판 주변 색별 카드'},{id:'coins',label:'동전'},{id:'military',label:'군사 토큰'},{id:'unclassified',label:'미분류 추정 영역'}],
 sagrada:[{id:'window',label:'창문판·기존 칸'},{id:'round-track',label:'라운드 트랙'},{id:'tools',label:'도구 카드줄'},{id:'goals',label:'목표 카드줄'},{id:'favors',label:'특권 토큰'},{id:'unclassified',label:'미분류 추정 영역'}]
};
export function validateStructureOverride(q:EstimatedStructureOverride,gameId:string,mode?:'manual'|'ai'){
 if(mode==='ai'||!q||Object.keys(q).sort().join(',')!=='anchorPieceId,areaId,attachedToPieceId,groupId,order,slot,version'||q.version!=='estimated-structure-override-v1'||!ESTIMATED_AREAS[gameId]?.some(a=>a.id===q.areaId)||typeof q.groupId!=='string'||!q.groupId||q.groupId.length>2048||!Number.isSafeInteger(q.order)||q.order<0||q.order>100000||q.slot!==null&&!(gameId==='sagrada'&&['round-track','window'].includes(q.areaId)&&Number.isSafeInteger(q.slot)&&q.slot>=1&&q.slot<=(q.areaId==='window'?20:10))||[q.anchorPieceId,q.attachedToPieceId].some(v=>v!==null&&(typeof v!=='string'||!v||v.length>200)))throw Error('추정 판의 수동 그룹·순서·상대 자리를 확인하세요. 관측 값과 원사진은 유지됩니다.');
}
