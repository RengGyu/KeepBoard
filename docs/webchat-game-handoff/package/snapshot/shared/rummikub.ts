import type {Assertion, Evidence, Value} from './types.ts';

export const RUMMIKUB_VERSION='rummikub-classic-v1' as const;
export const RUMMIKUB_COLORS=['red','blue','black','orange'] as const;
export type RummikubClassicColor=typeof RUMMIKUB_COLORS[number];
// Green is a historical stored value, never a new Classic color choice.
export type RummikubColor=RummikubClassicColor|'green';
export interface RummikubTile {
 id:string; kind:'number'|'joker'|'unknown'; color:RummikubColor|null; number:number|null;
 face:'front'|'back'|'unknown'; representedColor:RummikubColor|null; representedNumber:number|null;
 evidenceIds:string[]; region:Assertion['region']|null; note:string;
}
export interface RummikubGroup {id:string;label:string;tiles:RummikubTile[]}
export interface RummikubScene {
 version:typeof RUMMIKUB_VERSION;ownerId:string|null;coverage:'full'|'partial'|'unknown';
 groups:RummikubGroup[];loose:RummikubTile[];
}
export interface RummikubNormalizeOptions {ownerId?:string;evidenceIds?:readonly string[];colorPolicy?:'classic'|'preserve-legacy'}
const obj=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown)=>typeof v==='string'?v:'';
const color=(v:unknown,classic=false):RummikubColor|null=>RUMMIKUB_COLORS.includes(v as RummikubClassicColor)||!classic&&v==='green'?v as RummikubColor:null;
const number=(v:unknown)=>typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=13?v:null;
export function emptyRummikub(ownerId?:string):RummikubScene{return {version:RUMMIKUB_VERSION,ownerId:ownerId??null,coverage:'unknown',groups:[],loose:[]};}
export function rummikubField(ownerId?:string){return ownerId?'rack.scene':'table.scene';}
export function isRummikubField(field:string){return field==='table.scene'||field==='rack.scene';}
export function allRummikubTiles(scene:RummikubScene){return [...scene.groups.flatMap(g=>g.tiles),...scene.loose];}
// Manual rack corrections can cite a public photo, but never another player's private photo.
export function rummikubSourceEvidence(evidence:readonly Evidence[],ownerId?:string){return evidence.filter(e=>e.scope==='public'&&!e.ownerId||!!ownerId&&e.scope==='player'&&e.ownerId===ownerId);}
/** Stored known values may remain behind a back/unknown face; never expose them as its visible face. */
export function visibleRummikubFace(tile:RummikubTile){
 const kind=tile.face==='back'?'back':tile.face!=='front'||tile.kind==='unknown'?'unknown':tile.kind;
 return {kind,number:kind==='number'?tile.number:null,color:kind==='number'?tile.color:null};
}

/** Physical instances are never merged, inferred from quantities, sorted, or assigned by player color. */
export function normalizeRummikubDetailed(value:unknown,options:RummikubNormalizeOptions={}){
 const warnings:string[]=[];let raw=value;
 if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{return {scene:emptyRummikub(options.ownerId),recognized:false,warnings:['타일 기록 형식을 읽지 못했어요.']};}}
 const input=obj(raw),scene=emptyRummikub(options.ownerId);
 if(!Array.isArray(input.groups)||!Array.isArray(input.loose)||input.version!==RUMMIKUB_VERSION)return {scene,recognized:false,warnings:['루미큐브 전용 타일 기록이 아닙니다.']};
 if(input.ownerId!=null&&input.ownerId!==scene.ownerId)return {scene,recognized:false,warnings:['다른 소유자의 타일 기록은 이 영역에 넣을 수 없어요.']};
 scene.coverage=['full','partial'].includes(String(input.coverage))?input.coverage as 'full'|'partial':'unknown';
 const tileIds=new Set<string>(),groupIds=new Set<string>();
 function unique(rawId:unknown,used:Set<string>,prefix:string){let id=text(rawId);if(!id||used.has(id)){if(id)warnings.push('중복 ID를 분리해 실물 타일을 모두 유지했습니다.');let i=1;while(used.has(`${prefix}-${i}`))i++;id=`${prefix}-${i}`;}used.add(id);return id;}
 function tile(rawTile:unknown):RummikubTile {
  const t=obj(rawTile),ids=Array.isArray(t.evidenceIds)?[...new Set(t.evidenceIds.filter((id):id is string=>typeof id==='string'))]:[];
  const evidenceIds=options.evidenceIds?ids.filter(id=>options.evidenceIds!.includes(id)):ids;
  const r=obj(t.region);const validRegion=['x','y','width','height'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k]))&&Number(r.x)>=0&&Number(r.y)>=0&&Number(r.width)>0&&Number(r.height)>0&&Number(r.x)+Number(r.width)<=1&&Number(r.y)+Number(r.height)<=1;
  const kind=t.kind==='number'||t.kind==='joker'?t.kind:'unknown';
  if(t.number!=null&&number(t.number)===null)warnings.push('숫자는 1~13 또는 모름으로 남겼어요.');
  const readColor=(v:unknown)=>color(v,options.colorPolicy==='classic');
  if(t.color!=null&&!readColor(t.color)||t.representedColor!=null&&!readColor(t.representedColor))warnings.push('Classic의 네 색으로 확인되지 않은 타일 색은 모름으로 남겼어요.');
  if(typeof t.quantity==='number'&&t.quantity!==1)warnings.push('수량으로 타일을 생성하지 않았어요. 실물마다 개별 항목이 필요합니다.');
  return {id:unique(t.id,tileIds,'tile'),kind,color:readColor(t.color),number:number(t.number),face:t.face==='back'||t.face==='unknown'?t.face:'front',representedColor:readColor(t.representedColor),representedNumber:number(t.representedNumber),evidenceIds,region:validRegion&&ids[0]!==undefined&&evidenceIds[0]===ids[0]?{x:Number(r.x),y:Number(r.y),width:Number(r.width),height:Number(r.height)}:null,note:text(t.note)};
 }
 scene.groups=(input.groups as unknown[]).map(g=>{const group=obj(g);return {id:unique(group.id,groupIds,'group'),label:text(group.label),tiles:Array.isArray(group.tiles)?group.tiles.map(tile):[]};});
 scene.loose=(input.loose as unknown[]).map(tile);
 return {scene,recognized:true,warnings:[...new Set(warnings)]};
}
export function normalizeRummikub(value:unknown,options:RummikubNormalizeOptions={}){return normalizeRummikubDetailed(value,options).scene;}
export function rummikubAnswers(scene:RummikubScene,ownerId?:string){
 if(scene.ownerId!==(ownerId??null))throw new Error('개인 타일의 소유 영역을 확인하세요.');
 return [{field:rummikubField(ownerId),ownerId,value:scene as unknown as Value}];
}
export function createRummikubTile(id:string,patch:Partial<Omit<RummikubTile,'id'>>={}):RummikubTile{return {id,kind:'number',color:null,number:null,face:'front',representedColor:null,representedNumber:null,evidenceIds:[],region:null,note:'',...patch};}
export type RummikubCommand=
 |{type:'add';tile:RummikubTile;groupId:string|null;index?:number}
 |{type:'edit';tileId:string;patch:Partial<Omit<RummikubTile,'id'>>}
 |{type:'remove';tileId:string}
 |{type:'move';tileId:string;groupId:string|null;index:number}
 |{type:'group';id:string;label?:string}
 |{type:'rename';groupId:string;label:string}
 |{type:'reorder-group';groupId:string;index:number}
 |{type:'split';groupId:string;index:number;newGroupId:string}
 |{type:'merge';fromId:string;toId:string};
export function applyRummikubCommand(scene:RummikubScene,command:RummikubCommand):RummikubScene {
 const next=structuredClone(scene);
 const list=(id:string|null)=>{if(id===null)return next.loose;const g=next.groups.find(g=>g.id===id);if(!g)throw new Error('묶음을 찾지 못했어요.');return g.tiles;};
 const find=(id:string)=>{for(const tiles of [...next.groups.map(g=>g.tiles),next.loose]){const index=tiles.findIndex(t=>t.id===id);if(index>=0)return {tiles,index,tile:tiles[index]};}throw new Error('타일을 찾지 못했어요.');};
 const uniqueGroup=(id:string)=>{if(!id||next.groups.some(g=>g.id===id))throw new Error('새 묶음 ID가 필요합니다.');};
 const slot=(index:number,length:number)=>{if(!Number.isInteger(index)||index<0||index>length)throw new Error('타일 순서를 확인하세요.');return index;};
 switch(command.type){
  case 'group':uniqueGroup(command.id);next.groups.push({id:command.id,label:command.label??'',tiles:[]});break;
  case 'rename':{const g=next.groups.find(g=>g.id===command.groupId);if(!g)throw new Error('묶음을 찾지 못했어요.');g.label=command.label;break;}
  case 'add':{if(!command.tile.id||allRummikubTiles(next).some(t=>t.id===command.tile.id))throw new Error('새 실물 타일 ID가 필요합니다.');const tiles=list(command.groupId);tiles.splice(slot(command.index??tiles.length,tiles.length),0,structuredClone(command.tile));break;}
  case 'remove':{const found=find(command.tileId);found.tiles.splice(found.index,1);break;}
  case 'edit':{const found=find(command.tileId);Object.assign(found.tile,command.patch);found.tile.id=command.tileId;break;}
  case 'move':{const found=find(command.tileId);const target=list(command.groupId);found.tiles.splice(found.index,1);target.splice(slot(command.index,target.length),0,found.tile);break;}
  case 'reorder-group':{const i=next.groups.findIndex(g=>g.id===command.groupId);if(i<0)throw new Error('묶음을 찾지 못했어요.');const [g]=next.groups.splice(i,1);next.groups.splice(slot(command.index,next.groups.length),0,g);break;}
  case 'split':{uniqueGroup(command.newGroupId);const i=next.groups.findIndex(g=>g.id===command.groupId);if(i<0)throw new Error('묶음을 찾지 못했어요.');const g=next.groups[i];if(command.index<=0||command.index>=g.tiles.length)throw new Error('묶음 안의 나눌 위치를 선택하세요.');slot(command.index,g.tiles.length);next.groups.splice(i+1,0,{id:command.newGroupId,label:'',tiles:g.tiles.splice(command.index)});break;}
  case 'merge':{if(command.fromId===command.toId)return scene;const source=next.groups.find(g=>g.id===command.fromId),target=next.groups.find(g=>g.id===command.toId);if(!source||!target)throw new Error('합칠 묶음을 선택하세요.');target.tiles.push(...source.tiles);next.groups=next.groups.filter(g=>g!==source);break;}
 }
 // Commands reject invalid typed edits instead of silently changing a known face value.
 for(const tile of allRummikubTiles(next))if((tile.number!==null&&number(tile.number)===null)||(tile.representedNumber!==null&&number(tile.representedNumber)===null)||(tile.color!==null&&!color(tile.color))||(tile.representedColor!==null&&!color(tile.representedColor)))throw new Error('타일은 1~13과 지정 색 또는 모름으로 입력하세요.');
 validateRummikubColorEdits(next,[scene]);
 return JSON.stringify(next)===JSON.stringify(scene)?scene:next;
}
/** Only unchanged ink on an already recorded physical ID may retain historical green. */
export function validateRummikubColorEdits(next:RummikubScene,previous:readonly RummikubScene[]){
 const originals=new Map<string,RummikubTile[]>();
 for(const scene of previous)for(const tile of allRummikubTiles(scene)){const tiles=originals.get(tile.id)??[];tiles.push(tile);originals.set(tile.id,tiles);}
 for(const tile of allRummikubTiles(next))for(const key of ['color','representedColor'] as const){
  const value=tile[key];if(value===null||RUMMIKUB_COLORS.includes(value as RummikubClassicColor))continue;
  if(value==='green'&&originals.get(tile.id)?.some(old=>old[key]===value))continue;
  throw new Error('새 타일 색은 빨강·파랑·검정·주황 또는 모름으로 입력하세요. 기존 미지원색은 명시적으로 정정할 수 있어요.');
 }
}
export interface RummikubHistory {past:RummikubScene[];present:RummikubScene}
export function recordRummikub(history:RummikubHistory,command:RummikubCommand):RummikubHistory{const present=applyRummikubCommand(history.present,command);return present===history.present?history:{past:[...history.past.slice(-39),history.present],present};}
export function undoRummikub(history:RummikubHistory):RummikubHistory{const previous=history.past.at(-1);return previous?{past:history.past.slice(0,-1),present:previous}:history;}
