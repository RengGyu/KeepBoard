import type {ObservationBox,ObservationRequest,ObservationResult,ObservationPartition} from './lightweightRecognition';
import {spatialArea,type SpatialAddress,type SpatialRequest} from './spatialDefinition';
export interface SpatialBoardInstance {ref:string;imageIndex:number;panelRef:string|null;sourceRegion:ObservationBox|null;templateFrameId:string|null;templateAreaIds:string[];registrationRef:string|null;bindingBasis:'request-registration'|'visible-landmarks'|'unknown';orientationDegrees:number|null;visibleIdentifier:string|null;unknownReasons:string[]}
export interface SpatialPlacement {observationRef:string;boardInstanceRef:string|null;areaId:string|null;namespace:'area-slots'|'structural'|'photo-local';anchorAddress:string|null;coveredAddresses:string[]|null;coverageComplete:boolean|null;boardRotationDegrees:number|null;reflected:boolean|null;unknowns:{field:string;reason:string}[]}
export interface SpatialRelation {fromRef:string;toRef:string;kind:'on'|'above'|'covers'|'attached-to'|'before'|'next-in-cycle'|'adjacent-to'|'same-visible-stack';basis:'observed-visible-relation';partial:boolean}
export interface SpatialCellState {boardInstanceRef:string;areaId:string;address:string;state:'empty'|'occupied'|'unknown';observedObjectRefs:string[];fullyVisible:boolean;reason:string|null}
export interface SpatialResult {version:'spatial-observation-v1';boardInstances:SpatialBoardInstance[];placements:SpatialPlacement[];relations:SpatialRelation[];cellStates:SpatialCellState[];deferred:{section:string;index:number;reason:string}[]}
export interface StoredSpatialPiece {version:'spatial-piece-v1';source:{taskId:string;evidenceId:string;imageSHA:string;captureEpoch:string;photoDefinitionSHA:string;spatialDefinitionSHA:string;runtimeDefinitionSHA:string;schemaSHA256:string;responseSchemaSHA:string;sourceSHA:string;partition:ObservationPartition;captureAreaId:string;ownerId:string|null};observationRef:string;board:SpatialBoardInstance|null;placement:SpatialPlacement|null;resolved:{frameId:string;frameSHA:string;placementFrame:string;templateAreaId:string;sourceAreaId:string;fieldKey:string;viewBox:[number,number,number,number];anchor:SpatialAddress|null;covered:SpatialAddress[]|null;requiresOwner:boolean}|null;relations:(SpatialRelation&{fromId:string;toId:string})[];boundOwnerId:string|null;manualAnchor?:SpatialAddress|null;manualCovered?:SpatialAddress[]|null;manualCoverageComplete?:boolean|null;manualOverride?:boolean;manualRotationDegrees?:number|null;manualReflected?:boolean|null}
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:unknown,keys:string[])=>obj(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const str=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=300;
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=512&&v.every(str)&&new Set(v).size===v.length;
const angle=(v:unknown)=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<360;
const nullableText=(v:unknown)=>v===null||str(v);
const box=(v:unknown)=>v===null||exact(v,['x','y','width','height'])&&Object.values(v as any).every(n=>typeof n==='number'&&Number.isFinite(n))&&(v as any).x>=0&&(v as any).y>=0&&(v as any).width>0&&(v as any).height>0&&(v as any).x+(v as any).width<=1.00000001&&(v as any).y+(v as any).height<=1.00000001;
const boardKeys=['ref','imageIndex','panelRef','sourceRegion','templateFrameId','templateAreaIds','registrationRef','bindingBasis','orientationDegrees','visibleIdentifier','unknownReasons'];
const placementKeys=['observationRef','boardInstanceRef','areaId','namespace','anchorAddress','coveredAddresses','coverageComplete','boardRotationDegrees','reflected','unknowns'];
const relationKeys=['fromRef','toRef','kind','basis','partial'];
const cellKeys=['boardInstanceRef','areaId','address','state','observedObjectRefs','fullyVisible','reason'];
export function validateSpatialResult(raw:unknown,request:ObservationRequest,result:Pick<ObservationResult,'observations'>):SpatialResult{
 const out:SpatialResult={version:'spatial-observation-v1',boardInstances:[],placements:[],relations:[],cellStates:[],deferred:[]},contract=request.spatial;
 if(!contract)return out;
 const defer=(section:string,index:number,reason:string)=>out.deferred.push({section,index,reason});
 if(!exact(raw,['version','boardInstances','placements','relations','cellStates'])||(raw as any).version!=='spatial-observation-v1'){defer('response',0,'missing-or-invalid-spatial-section');return out;}
 const payload=raw as any,refs=new Set(result.observations.map(o=>o.ref)),boards=new Map<string,SpatialBoardInstance>();
 const rows=(key:string)=>Array.isArray(payload[key])&&payload[key].length<=512?payload[key]:[];
 for(const [i,b]of rows('boardInstances').entries()){
  if(!exact(b,boardKeys)||!str(b.ref)||boards.has(b.ref)||refs.has(b.ref)||b.imageIndex!==0||b.panelRef!==null||!box(b.sourceRegion)||!nullableText(b.templateFrameId)||!strings(b.templateAreaIds)||!nullableText(b.registrationRef)||!['request-registration','visible-landmarks','unknown'].includes(b.bindingBasis)||!angle(b.orientationDegrees)||!nullableText(b.visibleIdentifier)||!Array.isArray(b.unknownReasons)||b.unknownReasons.some((s:any)=>!str(s))){defer('boardInstances',i,'invalid-board-instance');continue;}
  const copy=structuredClone(b)as SpatialBoardInstance,frame=contract.frames.find(f=>f.id===copy.templateFrameId);
  // Registrations are not silently synthesized; current requests carry no generic user registration.
  if(copy.bindingBasis==='request-registration'||!frame||copy.bindingBasis!=='visible-landmarks'||copy.orientationDegrees===null||!copy.sourceRegion&&!copy.visibleIdentifier||copy.templateAreaIds.some(id=>!frame.areas.some(a=>a.id===id)&&!contract.structuralNamespaces.some(n=>n.id===id))){copy.templateFrameId=null;copy.templateAreaIds=[];copy.bindingBasis='unknown';copy.registrationRef=null;if(!copy.unknownReasons.includes('board-frame-or-direction-not-established'))copy.unknownReasons.push('board-frame-or-direction-not-established');defer('boardInstances',i,'unregistered-board-instance');}
  boards.set(copy.ref,copy);out.boardInstances.push(copy);
 }
 const placements=new Set<string>();
 for(const [i,p]of rows('placements').entries()){
  if(!exact(p,placementKeys)||!refs.has(p.observationRef)||placements.has(p.observationRef)||!nullableText(p.boardInstanceRef)||!nullableText(p.areaId)||!['area-slots','structural','photo-local'].includes(p.namespace)||!nullableText(p.anchorAddress)||p.coveredAddresses!==null&&!strings(p.coveredAddresses)||![null,true,false].includes(p.coverageComplete)||!angle(p.boardRotationDegrees)||![null,true,false].includes(p.reflected)||!Array.isArray(p.unknowns)||p.unknowns.some((u:any)=>!exact(u,['field','reason'])||!placementKeys.includes(u.field)||!str(u.reason))){defer('placements',i,'invalid-placement');continue;}
  const copy=structuredClone(p)as SpatialPlacement,b=boards.get(copy.boardInstanceRef??''),o=result.observations.find(o=>o.ref===copy.observationRef)!;
  if(copy.boardInstanceRef!==null&&!b){copy.boardInstanceRef=null;copy.unknowns.push({field:'boardInstanceRef',reason:'unknown-board-instance'});}
  if(copy.namespace==='photo-local'&&copy.areaId!==null&&!contract.frames.some(f=>f.areas.some(a=>a.id===copy.areaId&&a.acceptedComponents.includes(o.componentId??'')))){copy.areaId=null;copy.unknowns.push({field:'areaId',reason:'out-of-scope-area'});defer('placements',i,'out-of-scope-area');}
  const resolved=b?.templateFrameId&&copy.areaId?spatialArea(contract,b.templateFrameId,copy.areaId):undefined;
  const ns=copy.namespace==='structural'?contract.structuralNamespaces.find(n=>n.id===copy.areaId):undefined;
  const authorizedArea=resolved?.area??(ns?contract.frames.flatMap(f=>f.areas).find(a=>a.fieldKey===ns.fieldKey&&a.acceptedComponents.includes(o.componentId??'')):undefined);
  const authorized=!!b?.templateFrameId&&!!copy.areaId&&b.templateAreaIds.includes(copy.areaId)&&!!authorizedArea&&authorizedArea.acceptedComponents.includes(o.componentId??'')&&(copy.namespace==='structural'?!!ns:copy.namespace==='area-slots'?resolved?.area.mode==='slot':true);
  const allowed=new Set(copy.namespace==='structural'?ns?.entries.map(e=>e.address):resolved?.area.addresses.map(a=>a.address));
  if(copy.namespace!=='photo-local'&&!authorized){copy.namespace='photo-local';copy.anchorAddress=null;copy.coveredAddresses=null;copy.coverageComplete=null;copy.unknowns.push({field:'anchorAddress',reason:'unregistered-or-out-of-scope-area'});defer('placements',i,'unregistered-or-out-of-scope-area');}
  else if(copy.namespace!=='photo-local'){
   if(copy.anchorAddress!==null&&!allowed.has(copy.anchorAddress)){copy.anchorAddress=null;copy.unknowns.push({field:'anchorAddress',reason:'invalid-address'});defer('placements',i,'invalid-anchor-address');}
   if(copy.coveredAddresses!==null&&copy.coveredAddresses.some(a=>!allowed.has(a))){copy.coveredAddresses=copy.coveredAddresses.filter(a=>allowed.has(a));if(!copy.coveredAddresses.length)copy.coveredAddresses=null;copy.coverageComplete=false;copy.unknowns.push({field:'coveredAddresses',reason:'invalid-covered-address'});defer('placements',i,'invalid-covered-address');}
  }else if(copy.anchorAddress!==null||copy.coveredAddresses!==null){copy.anchorAddress=null;copy.coveredAddresses=null;copy.unknowns.push({field:'anchorAddress',reason:'photo-local-has-no-canonical-address'});}
  for(const k of ['boardInstanceRef','areaId','anchorAddress','coveredAddresses','coverageComplete','boardRotationDegrees','reflected']as const)if(copy[k]===null&&!copy.unknowns.some(u=>u.field===k))copy.unknowns.push({field:k,reason:'not-observed'});
  placements.add(copy.observationRef);out.placements.push(copy);
 }
 const allRefs=new Set([...refs,...boards.keys()]),edges=new Map<string,Map<string,Set<string>>>();
 for(const [i,r]of rows('relations').entries()){
  if(!exact(r,relationKeys)||!allRefs.has(r.fromRef)||!allRefs.has(r.toRef)||r.fromRef===r.toRef||!['on','above','covers','attached-to','before','next-in-cycle','adjacent-to','same-visible-stack'].includes(r.kind)||r.basis!=='observed-visible-relation'||typeof r.partial!=='boolean'){defer('relations',i,'invalid-relation');continue;}
  if(['above','before'].includes(r.kind)){
   const graph=edges.get(r.kind)??new Map<string,Set<string>>(),visit=(at:string,seen=new Set<string>()):boolean=>at===r.fromRef||!seen.has(at)&&(seen.add(at),[...(graph.get(at)??[])].some(n=>visit(n,seen)));
   if(visit(r.toRef)){defer('relations',i,'relation-cycle');continue;}graph.set(r.fromRef,new Set([...(graph.get(r.fromRef)??[]),r.toRef]));edges.set(r.kind,graph);
  }
  if(!out.relations.some(e=>e.fromRef===r.fromRef&&e.toRef===r.toRef&&e.kind===r.kind))out.relations.push(structuredClone(r));
 }
 for(const [i,c]of rows('cellStates').entries()){
  const b=boards.get(c?.boardInstanceRef),a=b?.templateFrameId?spatialArea(contract,b.templateFrameId,c?.areaId)?.area:undefined;
  if(!exact(c,cellKeys)||!b||!a||a.mode!=='slot'||!b.templateAreaIds.includes(c.areaId)||!a.addresses.some(a=>a.address===c.address)||!['empty','occupied','unknown'].includes(c.state)||!strings(c.observedObjectRefs)||c.observedObjectRefs.some((r:string)=>!refs.has(r))||typeof c.fullyVisible!=='boolean'||!nullableText(c.reason)){defer('cellStates',i,'invalid-cell-state');continue;}
  const copy=structuredClone(c)as SpatialCellState;if(copy.state==='empty'&&(!copy.fullyVisible||copy.observedObjectRefs.length)){copy.state='unknown';copy.reason='empty-cell-not-fully-observed';defer('cellStates',i,copy.reason);}
  if(out.cellStates.some(s=>s.boardInstanceRef===copy.boardInstanceRef&&s.areaId===copy.areaId&&s.address===copy.address)){defer('cellStates',i,'duplicate-cell-state');continue;}out.cellStates.push(copy);
 }
 return out;
}
/** Pin normalized spatial state as well as the original response; no lookup of newer geometry during reopen. */
export function validateStoredSpatial(value:unknown,packSourceSHA:string|undefined,evidenceId:string|null):asserts value is StoredSpatialPiece{
 if(!obj(value)||value.version!=='spatial-piece-v1'||!obj(value.source)||value.source.sourceSHA!==packSourceSHA||value.source.evidenceId!==evidenceId||!str(value.source.taskId)||!str(value.source.captureEpoch)||!['common_public','player_public','owner_private'].includes(value.source.partition)||!nullableText(value.source.ownerId)||!nullableText(value.boundOwnerId)||!str(value.observationRef)||!Array.isArray(value.relations)||!angle(value.manualRotationDegrees??null)||![null,true,false].includes(value.manualReflected??null))throw Error('저장된 공간 관측의 출처·범위를 확인하세요.');
 for(const k of ['imageSHA','photoDefinitionSHA','spatialDefinitionSHA','runtimeDefinitionSHA','schemaSHA256','responseSchemaSHA'])if(typeof value.source[k]!=='string'||!/^[a-f0-9]{64}$/.test(value.source[k]))throw Error('공간 관측 정의 해시를 확인하세요.');
 if(value.manualCovered!==undefined&&value.manualCovered!==null&&!Array.isArray(value.manualCovered)||value.manualCoverageComplete!==undefined&&![null,true,false].includes(value.manualCoverageComplete)||value.manualOverride!==undefined&&typeof value.manualOverride!=='boolean')throw Error('공간 직접 수정 형식을 확인하세요.');
 const p=value.placement;if(p!==null&&(!exact(p,placementKeys)||p.observationRef!==value.observationRef||!angle(p.boardRotationDegrees)||![null,true,false].includes(p.reflected)||p.coveredAddresses!==null&&!strings(p.coveredAddresses)||!Array.isArray(p.unknowns)))throw Error('저장된 공간 배치를 확인하세요.');
 const b=value.board;if(b!==null&&(!exact(b,boardKeys)||!str(b.ref)||!angle(b.orientationDegrees)||!box(b.sourceRegion)||!strings(b.templateAreaIds)))throw Error('저장된 판 인스턴스를 확인하세요.');
 const q=value.resolved;if(q!==null){if(!obj(q)||!str(q.templateAreaId)||!str(q.sourceAreaId)||!str(q.fieldKey)||!str(q.frameId)||!Array.isArray(q.viewBox)||q.viewBox.length!==4||!q.viewBox.every(Number.isFinite)||q.viewBox[2]<=0||q.viewBox[3]<=0||typeof q.requiresOwner!=='boolean'||!Array.isArray(q.covered)&&q.covered!==null)throw Error('저장된 판 주소를 확인하세요.');for(const s of [q.anchor,...(q.covered??[]),value.manualAnchor,...(Array.isArray(value.manualCovered)?value.manualCovered:[])].filter(Boolean))if(!str(s.address)||!str(s.slotId)||![s.x,s.y,s.w,s.h].every(Number.isFinite)||s.w<=0||s.h<=0||s.x<q.viewBox[0]||s.y<q.viewBox[1]||s.x+s.w>q.viewBox[0]+q.viewBox[2]||s.y+s.h>q.viewBox[1]+q.viewBox[3])throw Error('저장된 칸의 좌표를 확인하세요.');}
 for(const r of value.relations)if(!obj(r)||!str(r.fromId)||!str(r.toId)||!['on','above','covers','attached-to','before','next-in-cycle','adjacent-to','same-visible-stack'].includes(r.kind)||typeof r.partial!=='boolean')throw Error('저장된 공간 관계를 확인하세요.');
}
