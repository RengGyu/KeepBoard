import type {GamePack,Session,Snapshot} from './types';
export interface RoomMetadata {version:'room-v1';capacity:number;hostPlayerId:string;revisions:Record<string,number>}
export interface RoomAccess {role:'host'|'member';playerId:string;revisions:Record<string,number>}
export interface SavedScope {scope:'public'|'owner';ownerId?:string}
export const roomScopeKey=(scope:SavedScope)=>scope.scope==='public'?'public':scope.ownerId!;
export function fieldScope(pack:GamePack,field:string,ownerId?:string){const f=pack.fields.find(f=>f.key===field);if(!f)throw new Error('알 수 없는 필드입니다.');if(f.scope==='public'){if(ownerId)throw new Error('공용 필드에는 소유자를 지정하지 마세요.');return 'public';}if(!ownerId)throw new Error('플레이어를 지정하세요.');return ownerId;}
export function inRoomScope(pack:GamePack,item:{field:string;ownerId?:string},key:string){return fieldScope(pack,item.field,item.ownerId)===key;}
export function latestSnapshot(session:Session,key?:string):Snapshot|undefined{return [...session.snapshots].reverse().find(s=>s.savedScope?roomScopeKey(s.savedScope)===(key??'public'):!session.room);}
