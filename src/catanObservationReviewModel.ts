import type {Assertion,SessionView} from '../shared/types';
import type {ComponentScene} from '../shared/scene';
import {normalizeScene,resolveSlotId,CATAN_TOPOLOGY,type SceneLocation} from '../shared/scene';
import {mergeBoardObservation} from '../shared/boardRecording';
import {moveSceneComponent,exclusiveLayer,slotOccupants} from '../shared/sceneMoves';
import {validatePhotoFrame} from '../shared/photoGeometry';
export function localCatanCandidates(view:SessionView){
 if(view.pack.id!=='catan-base')return [];
 const board=view.session.assertions.filter(a=>a.field==='board.layout'&&!a.ownerId&&a.status==='accepted').at(-1);
 return view.session.assertions.filter(a=>!a.ownerId&&a.status==='candidate'&&a.observationReceipts?.length&&['board.layout','components.observed'].includes(a.field)&&(!board||a.updatedAt>board.updatedAt));
}
export interface CatanReviewResult {scene:ComponentScene;placedRefs:string[];unresolved:{observationRef:string;reason:string}[]}
/** Geometry only prepares an explicit review copy; competing observations never win by iteration order. */
export function catanReviewScene(source:Assertion,base:ComponentScene,useLocations:boolean):CatanReviewResult {
 const raw=source.value;if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==2||!Array.isArray(raw.components))throw Error('사진 후보 장면의 버전·원본 형식을 확인해 주세요.');
 const incoming=normalizeScene(raw);
 if(incoming.components.some(c=>base.components.some(b=>b.id===c.id)))throw Error('새 사진 후보와 기존 기록의 ID가 겹쳐요. 원본 후보를 다시 확인해 주세요.');
 // A fresh observation is not a confirmed board position, even if its projection carries a location.
 incoming.components=incoming.components.map(c=>({...c,location:{type:'unplaced',id:null}}));
 const refs=new Map<string,string>(),proposals=new Map<string,Map<string,SceneLocation>>(),reasons=new Map<string,string>();
 for(const receipt of source.observationReceipts??[]){
  for(const [ref,id]of Object.entries(receipt.componentRefs)){if(refs.has(ref)&&refs.get(ref)!==id)throw Error('사진 후보의 원본 연결이 바뀌었어요.');refs.set(ref,id);}
  if(!useLocations||!receipt.geometryCandidates.length)continue;
  const {request,frame}=receipt,image=request.images[0],transform=receipt.transforms?.find(t=>t.transformId===image?.transformId);
  if(!frame||request.gameId!=='catan'||request.geometryFrameId!==frame.frameId||!image)throw Error('사진 frame/좌표 대응을 확인하세요.');
  validatePhotoFrame(frame,{evidenceId:image.evidenceId,sourceSHA:transform?.sourceSHA??image.sha256,definitionSHA:request.definitionSHA});
  for(const candidate of receipt.geometryCandidates){
   const {observationRef:ref,locationCandidate:location}=candidate,id=receipt.componentRefs[ref];
   if(candidate.frameId!==frame.frameId||candidate.method!=='confirmed-frame'||candidate.status!=='candidate'||!id||!incoming.components.some(c=>c.id===id))throw Error('사진 frame/후보 연결을 확인하세요.');
   const canonical=resolveSlotId(location.type,location.id);
   if(!canonical||!CATAN_TOPOLOGY.byId[location.type].has(canonical))throw Error('사진 후보의 좌표를 확인하세요.');
   const targets=proposals.get(ref)??new Map<string,SceneLocation>();targets.set(`${location.type}:${canonical}`,{type:location.type,id:canonical});proposals.set(ref,targets);
  }
 }
 const claims=new Map<string,Set<string>>();
 for(const [ref,targets]of proposals){
  if(targets.size!==1)reasons.set(ref,'한 실물에 서로 다른 위치 후보가 있어요.');
  const c=incoming.components.find(c=>c.id===refs.get(ref))!,layer=exclusiveLayer(c.kind);
  if(!layer){reasons.set(ref,'이 구성물의 판 위치는 직접 확인해 주세요.');continue;}
  for(const location of targets.values()){const key=`${layer}:${location.type}:${location.id}`,contenders=claims.get(key)??new Set<string>();contenders.add(ref);claims.set(key,contenders);}
 }
 for(const contenders of claims.values())if(contenders.size>1)for(const ref of contenders)reasons.set(ref,'같은 자리를 가리키는 실물이 여러 개예요. 모두 위치 확인이 필요해요.');
 let scene=incoming;const placedRefs:string[]=[],unresolved:CatanReviewResult['unresolved']=[];
 for(const c of incoming.components){
  const ref=[...refs].find(([,id])=>id===c.id)?.[0]??c.id,targets=proposals.get(ref),location=targets?.size===1?[...targets.values()][0]:null;
  let reason=reasons.get(ref);
  if(!useLocations||!location)reason??='위치 후보가 없어 직접 확인이 필요해요.';
  else if(c.quantity!==1)reason??='수량을 1개로 확인한 뒤 위치를 정해 주세요. 모름·0·묶음은 미배치로 남겨요.';
  else if(slotOccupants(base,c,location).length)reason??='기존 기록이 이 자리를 쓰고 있어요. 기존 값은 그대로 두고 직접 정정해 주세요.';
  if(!reason&&location){const result=moveSceneComponent(scene,c.id,location,{intent:'correct'});if(result.status==='rejected')reason=result.message;else{scene=result.scene;placedRefs.push(ref);}}
  if(reason)unresolved.push({observationRef:ref,reason});
 }
 const projected=mergeBoardObservation({...base,components:[]},scene);
 return {scene:{...projected,components:[...structuredClone(base.components),...projected.components]},placedRefs,unresolved};
}
