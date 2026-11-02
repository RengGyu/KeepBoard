import type {Assertion,GamePack,Session,Value} from './types';
import {CATAN_TOPOLOGY,normalizeScene,type ComponentScene} from './scene';

const complete=(scene:ComponentScene)=>scene.coverage==='full'&&scene.coverageByLayer?.numbers==='complete';
/** Scan projection deliberately stays partial. A single native receipt can retain its original
 * full-layer declaration, but only for exactly the same, unchanged set of projected objects. */
function completeNativeReceipt(source:Assertion,scene:ComponentScene,session:Session):boolean{
 const receipts=source.observationReceipts??[];
 if(receipts.length!==1)return false;
 const r=receipts[0];
 if(!['gemini-catan-scene-wire-v1','terra-catan-scene-wire-v1'].includes(r.hostedWire?.id??'')||r.request.scope.partition!=='common_public'||r.request.scope.ownerId!==null||r.request.areaId!=='board')return false;
 // Resume creates a new capture epoch but restores the saved evidence. Bind to that
 // evidence's original epoch, never borrow a receipt from a new/other photograph.
 if(!r.request.images.length||r.request.images.some(image=>!source.evidenceIds.includes(image.evidenceId)||!session.evidence.some(e=>e.id===image.evidenceId&&e.kind==='photo'&&e.scope==='public'&&!e.ownerId&&e.captureEpoch===r.request.scope.captureEpoch)))return false;
 const originals=(r.hostedWire?.items??[]).filter((a:any)=>['board.layout','components.observed'].includes(a?.field));
 if(originals.length!==1||!complete(normalizeScene((originals[0] as any).value)))return false;
 const observations=r.result.observations;
 if(observations.length!==scene.components.length||new Set(Object.values(r.componentRefs)).size!==scene.components.length)return false;
 // No merged/changed value may borrow an old completeness declaration.
 return observations.every(o=>{
  const c=scene.components.find(c=>c.id===r.componentRefs[o.ref]);
  if(!c||c.kind!==o.componentId||c.quantity!==o.quantity||c.evidenceId!==r.request.images[o.imageIndex]?.evidenceId)return false;
  if(c.kind!=='number-token')return true;
  const value=o.properties.number;
  return value?.state==='observed'?value.value===c.number:c.number==null;
 });
}

/** Only one residual slot/value is inferable. Other readings are assumed right, never confidence-gated. */
export function deriveCatanNumberAssertion(session:Session,pack:GamePack,base:Assertion[]):Assertion|null{
 const inventory=pack.catanNumberInventory;
 if(pack.id!=='catan-base'||!inventory||!pack.sources.some(s=>s.id===inventory.sourceId)||!inventory.values.length)return null;
 const source=base.filter(a=>a.field==='board.layout'&&!a.ownerId&&a.status==='accepted').at(-1);
 if(!source)return null;
 const scene=normalizeScene(source.value);
 if(!complete(scene)&&(source.basis!=='observation'||!completeNativeReceipt(source,scene,session)))return null;
 const terrain=scene.components.filter(c=>c.kind==='terrain'),tokens=scene.components.filter(c=>c.kind==='number-token');
 const uniqueHexes=(items:typeof terrain)=>items.every(c=>c.quantity===1&&c.location.type==='hex'&&!!c.location.id&&CATAN_TOPOLOGY.byId.hex.has(c.location.id))&&new Set(items.map(c=>c.location.id)).size===items.length;
 if(terrain.length!==CATAN_TOPOLOGY.hexes.length||tokens.length!==inventory.values.length||!uniqueHexes(terrain)||!uniqueHexes(tokens))return null;
 const unknown=tokens.filter(c=>c.number==null);
 if(unknown.length!==1)return null;
 const remaining=[...inventory.values];
 for(const token of tokens){
  if(token.number==null)continue;
  const index=remaining.indexOf(token.number);
  if(index<0)return null; // Multiset cannot be subtracted; do not repair another reading.
  remaining.splice(index,1);
 }
 if(remaining.length!==1)return null;
 const target=scene.components.find(c=>c.id===unknown[0].id)!;
 target.number=remaining[0];
 return {...source,id:`rule:catan-single-number:${source.id}`,basis:'rule',value:scene as unknown as Value,
  reason:`게임팩 전체 숫자 토큰 구성(${inventory.sourceId})에서 다른 판독값은 맞다고 가정하여 중복을 포함해 차감했습니다. 남은 한 슬롯 ${target.id}(${target.location.id})에 남은 값 ${remaining[0]}을 추론했습니다. 사진에서 직접 읽은 값이 아닙니다.`};
}
