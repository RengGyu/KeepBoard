import type {SessionView} from '../shared/types';
const states=new Map<string,{revisions:Record<string,number>;ownerId?:string}>();
export function rememberRoom(view:SessionView,reset=false){if(!view.roomAccess)return;const old=states.get(view.session.id);if(reset||!old)states.set(view.session.id,{revisions:{...view.roomAccess.revisions},ownerId:old?.ownerId});else{const active=old.ownerId??'public';for(const [k,v]of Object.entries(view.roomAccess.revisions))if(k!==active)old.revisions[k]=v;}}
export function selectRoomScope(view:SessionView,ownerId?:string){rememberRoom(view,true);const state=states.get(view.session.id);if(state)state.ownerId=ownerId;}
export function roomBody(id:string,body:unknown,scoped=false){const state=states.get(id);if(!state)return body;return {...(body as object),...(scoped?state.ownerId?{scope:'owner',ownerId:state.ownerId}:{scope:'public'}:{}),expectedRevisions:{...state.revisions}};}
export function roomIsStale(current:SessionView,next:SessionView,ownerId?:string){const key=ownerId??'public';return !!current.roomAccess&&current.roomAccess.revisions[key]!==next.roomAccess?.revisions[key];}
