import type { SessionView } from '../shared/types';
let access:{sessionId:string;ownerId:string;token:string}|null=null;
let generation=0;
const images=new Map<string,string>();
const controllers=new Set<AbortController>();
export const privateGeneration=()=>generation;
export const privateToken=()=>access?.token;
export function clearPrivateAccess(){generation++;access=null;for(const controller of controllers)controller.abort();controllers.clear();for(const url of images.values())URL.revokeObjectURL(url);images.clear();}
export function setPrivateAccess(sessionId:string,ownerId:string,token:string){clearPrivateAccess();access={sessionId,ownerId,token};}
export async function privatePhotos(view:SessionView,expectedGeneration:number):Promise<SessionView>{
 if(!access||view.session.id!==access.sessionId||!view.privacy?.unlockedOwnerIds.includes(access.ownerId))return view;
 const credential=access,photos=[...view.session.evidence,...view.session.snapshots.flatMap(s=>s.evidence)].filter(e=>e.ownerId===credential.ownerId);
 for(const original of new Set(photos.map(e=>e.url))){
  if(images.has(original)||!original.startsWith('/uploads/'))continue;
  const controller=new AbortController();controllers.add(controller);
  try{const response=await fetch(original,{headers:{'X-KeepBoard-Private-Token':credential.token},cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('개인 사진을 다시 열어 주세요.');const blob=await response.blob();if(expectedGeneration!==generation)throw new Error('개인 영역을 닫았어요.');images.set(original,URL.createObjectURL(blob));}finally{controllers.delete(controller);}
 }
 if(expectedGeneration!==generation)throw new Error('개인 영역을 닫았어요.');
 for(const photo of photos)photo.url=images.get(photo.url)??photo.url;
 return view;
}
window.addEventListener('pagehide',clearPrivateAccess);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
