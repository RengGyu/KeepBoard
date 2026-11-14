/** Bounded in-memory counterexamples; synthetic edits never leave this task folder. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import React from 'react';
import {withRestoration} from '../../gamepacks/catalog.ts';
import {projectRestorationScene} from '../../shared/sceneProjection.ts';
import {projectGenericDrawing} from '../../shared/drawingProjection.ts';
import {estimateBoardStructure} from '../../shared/estimatedBoardStructure.ts';
import {layoutDrawingItems} from '../../shared/drawingLayout.ts';
import {sceneDigest} from '../../shared/restorationIdentity.ts';
import {decodeSceneReading} from '../../shared/sceneReading.ts';
import {carcassonneLayout} from '../../shared/readouts/carcassonneLayout.ts';
import {setReadoutValue} from '../../shared/readouts/registry.ts';

register('../board-story/feedback/skip-css.mjs',import.meta.url);
const {RestorationSceneView}=await import('../../src/RestorationSceneView.tsx');
const out=import.meta.dirname,root=path.resolve(out,'../..'),read=async(p:string)=>JSON.parse(await fs.readFile(path.resolve(root,p),'utf8'));
const nodes=(v:any):any[]=>!v||typeof v!=='object'?[]:Array.isArray(v)?v.flatMap(nodes):[v,...nodes(v.props?.children)];
// Same bounded tree observation technique as existing restoration-scene-ui tests.
// Effects are not executed: no fetch, event listener, file or server side effect.
function tree(scene:any,pack:any,s:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;
 internals.H={useState:(v:any)=>[typeof v==='function'?v():v,()=>{}],useRef:(v:any)=>({current:v}),useEffect:()=>{}};
 try{return RestorationSceneView({scene,pack,assertions:s.assertions,evidence:s.evidence,busy:false,onSelect:()=>{},onCommand:async()=>{}});}finally{internals.H=old;}
}
const uiProof=(scene:any,pack:any,s:any)=>{const ns=nodes(tree(scene,pack,s));return {rows:ns.filter(n=>n.props?.className==='estimated-row').length,grids:ns.filter(n=>n.props?.className==='estimated-grid').length,panels:ns.filter(n=>n.props?.['data-scene-region']).length,renderedPieceIds:ns.filter(n=>n.props?.['data-drawing-piece']).map(n=>n.props['data-drawing-piece']),hasGameBoardRecord:ns.some(n=>n.type?.name==='GameBoardRecord'),hasCarcassonneLayout:ns.some(n=>n.type?.name==='CarcassonneLayoutPreview'),rowSourceOrder:ns.filter(n=>n.props?.className==='estimated-row').map(n=>nodes(n).filter(x=>x.props?.['data-drawing-piece']).map(x=>x.props['data-drawing-piece']))};};
const fixture=async(id:string)=>{const v=await read('docs/real-photo-review-20261110/cases/final-pool-'+id+'/view.json');return {pack:withRestoration(v.pack),s:v.session};};
const results:any[]=[];

// A. Real saved data: profile topology exists; current generic UI never consumes photo rows.
const hanabi=await fixture('04'),hs=projectRestorationScene({session:hanabi.s,pack:hanabi.pack}),ha=hanabi.s.assertions[0],items=projectGenericDrawing(ha,ha.value.pieces,hanabi.s.evidence),photo=layoutDrawingItems(items,{sourceAspectRatio:4032/3024}),hu=uiProof(hs,hanabi.pack,hanabi.s);
assert.equal(hu.rows,1);assert.equal(hu.grids,0);assert.equal(photo.rows.length,5);assert.equal(hu.renderedPieceIds.length,35);
results.push({id:'A-real-bbox-not-consumed',synthetic:false,profileFamily:hs.profile.regions.find(r=>r.id==='fireworks')?.family,profileTopology:hs.profile.regions.find(r=>r.id==='fireworks')?.topology,sceneGroups:hs.groups.length,currentUI:hu,existingPhotoRows:photo.rows.length,allSourceObjects:35});

// B. A valid old manual placement is recognized with board assets, but scene omits that input.
const c=await fixture('06'),cs=structuredClone(c.s),ca=cs.assertions[0],tile=ca.value.pieces.find((p:any)=>p.componentId==='tiles'),boardRaw=await fs.readFile(path.join(root,'public/game-art/real-boards/carcassonne/board.json'),'utf8'),board={...JSON.parse(boardRaw),assetSHA:createHash('sha256').update(boardRaw).digest('hex')};
tile.placement={areaId:'landscape',x:.25,y:.5,rotation:90,layoutVariant:'base'};
const cp=projectGenericDrawing(ca,ca.value.pieces,cs.evidence,board),np=projectGenericDrawing(ca,ca.value.pieces,cs.evidence),ce=estimateBoardStructure({gameId:'carcassonne',items:cp,assertions:cs.assertions,evidence:cs.evidence}),cscene=projectRestorationScene({session:cs,pack:c.pack}),entity=cscene.entities.find(e=>e.bindings.some(b=>b.pieceId===tile.id))!;
assert.equal(cp.find(i=>i.pieceId===tile.id)!.position.space,'manual');assert.equal(np.find(i=>i.pieceId===tile.id)!.position.space,'photo');assert.equal(ce.retained.length,0);assert.equal(entity.presentation?.status,'unassigned');
results.push({id:'B-manual-position-two-disconnects',synthetic:true,pieceId:tile.id,storedPlacement:tile.placement,drawingWithBoard:cp.find(i=>i.pieceId===tile.id)!.position,drawingWithoutBoard:np.find(i=>i.pieceId===tile.id)!.position.space,estimatorWithManualInput:{retained:ce.retained.length,reason:ce.unassigned.find(p=>p.pieceId===tile.id)?.reason},scenePresentation:entity.presentation,ui:uiProof(cscene,c.pack,cs),note:'Original frozen Carcassonne has no manual position; only this in-memory copy has one.'});

// C. Actual saved Sagrada canonical addresses: valid under exact board SHA, unused by whole scene.
const d=await read('docs/pro-review-20261113/data/cases/sagrada-baseline.json'),sp=withRestoration(await read('docs/pro-review-20261113/data/packs/sagrada.json')),ss:any={id:d.caseId,turnInstanceId:d.assertions[0].turnInstanceId,players:[],preservations:[],snapshots:[],notes:{},evidence:d.photos,assertions:d.assertions.map((a:any)=>({...a,observationReceipts:a.observationReceiptRefs.map((i:number)=>d.receipts[i])}))},sbRaw=await fs.readFile(path.join(root,'public/game-art/real-boards/sagrada/board.json'),'utf8'),sb={...JSON.parse(sbRaw),assetSHA:createHash('sha256').update(sbRaw).digest('hex')},si=ss.assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,ss.evidence,sb)),sg=projectRestorationScene({session:ss,pack:sp}),addresses=si.filter((i:any)=>i.position.space==='board').map((i:any)=>({pieceId:i.pieceId,storedAddress:i.value.spatial.placement.anchorAddress,canonicalSlot:i.position.anchorSlotId,sceneCell:sg.entities.find(e=>e.bindings.some(b=>b.pieceId===i.pieceId))?.presentation}));
assert.equal(addresses.length,18);assert.equal(sg.entities.filter(e=>e.presentation?.status==='retained').length,0);
const matchingCells=addresses.filter((a:any)=>a.storedAddress===`r${a.sceneCell?.cell?.row}c${a.sceneCell?.cell?.column}`).length;
assert.equal(matchingCells,18);
results.push({id:'C-real-canonical-not-forwarded',synthetic:false,validatedBoardPositions:addresses.length,sceneRetained:0,sceneCells:sg.entities.filter(e=>e.presentation?.cell).length,estimatedCellsCoincidingWithStoredAddresses:matchingCells,addresses,ui:uiProof(sg,sp,ss),note:'All 18 estimated cells currently coincide with the stored addresses. Valid stored addresses do not certify correct physical cells; this proves which source the renderer uses, not current displacement.'});

// D. Typed map coordinates already supported by the old field renderer are not exposed in the scene.
const map=structuredClone(c.s),ma=map.assertions[0],mt=ma.value.pieces.filter((p:any)=>p.componentId==='tiles').slice(0,2);
for(const [index,p] of mt.entries()){p.readout=setReadoutValue(c.pack,p.readout,'gridX',index);p.readout=setReadoutValue(c.pack,p.readout,'gridY',0);}
const mapModel=carcassonneLayout(c.pack,ma.value),mapScene=projectRestorationScene({session:map,pack:c.pack});
assert.equal(mapModel.tiles.length,2);assert.equal(uiProof(mapScene,c.pack,map).hasCarcassonneLayout,false);
results.push({id:'D-typed-map-path-not-selected',synthetic:true,existingMapAdapterTiles:mapModel.tiles.map(t=>({id:t.piece.id,x:t.x,y:t.y})),sceneUI:uiProof(mapScene,c.pack,map),note:'Synthetic stored coordinates; no claim that old photo contains these grid positions.'});

// E. Valid scene-reading regions split groups; precedes survives but current UI order ignores it.
const rel=structuredClone(hanabi.s),ra=rel.assertions[0],rr=ra.observationReceipts[0],keep=rr.result.observations.slice(0,2);ra.value.pieces=ra.value.pieces.filter((p:any)=>keep.some((o:any)=>rr.componentRefs[o.ref]===p.id));rr.result.observations=keep;
rr.request.scene={version:'scene-reading-v1',profileSHA:hs.profile.pin.profileSHA,requested:['board-presence','region','frame','visible-support','relations'],allowedRoleIds:['fireworks'],roleHints:[],boardComponentIds:[],roleComponentIds:{fireworks:['cards']}};
const payload={version:'scene-reading-v1',profileSHA:hs.profile.pin.profileSHA,boardRefs:[],geometry:[],regions:[{ref:'test-region',imageIndex:0,boardRef:null,memberObservationRefs:keep.map((o:any)=>o.ref),roleCandidates:['fireworks']}],relations:[{kind:'precedes',fromObservationRef:keep[1].ref,toObservationRef:keep[0].ref}]};
rr.result.scene=decodeSceneReading(payload,rr.request,rr.result,rr.transforms);assert.equal(rr.result.scene.deferred.length,0);
const relBefore=sceneDigest(rel),rs=projectRestorationScene({session:rel,pack:hanabi.pack}),ru=uiProof(rs,hanabi.pack,rel),expectedOrder=keep.map((o:any)=>rr.componentRefs[o.ref]).reverse();
assert(rs.relations.some(r=>r.kind==='precedes'));assert.equal(rs.groups.reduce((n,g)=>n+g.physicalOrder.length,0),0);assert.notDeepEqual(ru.rowSourceOrder[0],expectedOrder);assert.equal(sceneDigest(rel),relBefore);
results.push({id:'E-validated-precedes-unused',synthetic:true,decoderDeferred:[],scenePrecedes:rs.relations.filter(r=>r.kind==='precedes'),physicalOrderCount:0,expectedSupportedOrder:expectedOrder,actualUIOrder:ru.rowSourceOrder[0]});

// F. One receipt is shared across fields: the local assertion lookup drops a cross-field relation.
const cross=structuredClone(rel),a1=cross.assertions[0],a2=structuredClone(a1);a2.id+='-other-field';a2.field='discard.scene';a2.value.pieces=[a1.value.pieces.pop()];cross.assertions.push(a2);
for(const a of cross.assertions)a.observationReceipts[0].result.scene.regions=[];
const xs=projectRestorationScene({session:cross,pack:hanabi.pack});assert.equal(xs.entities.length,2);assert.equal(xs.relations.filter(r=>r.kind==='precedes').length,0);
results.push({id:'F-cross-field-relation-lost',synthetic:true,receiptPrecedesCount:1,fields:cross.assertions.map((a:any)=>a.field),liveEntities:xs.entities.length,scenePrecedesCount:0,note:'Both refs are live in the same public scope and the same receipt; assertion-local get(ref) cannot join them.'});

// G. Re-decoded structure alone does not invalidate an already materialized scene.
const stale=structuredClone(rel),staleReceipt=stale.assertions[0].observationReceipts[0];
delete staleReceipt.result.scene;
const previous=projectRestorationScene({session:stale,pack:hanabi.pack});
staleReceipt.result.scene=decodeSceneReading({...payload,relations:[],regions:keep.map((o:any,i:number)=>({ref:'new-region-'+i,imageIndex:0,boardRef:null,memberObservationRefs:[o.ref],roleCandidates:['fireworks']}))},staleReceipt.request,staleReceipt.result,staleReceipt.transforms);
const fresh=projectRestorationScene({session:stale,pack:hanabi.pack}),reused=projectRestorationScene({session:stale,pack:hanabi.pack,previous});
assert.equal(fresh.groups.length,2);assert.equal(reused.groups.length,1);assert.equal(fresh.sourceDigest,previous.sourceDigest);
results.push({id:'G-structure-change-missing-from-digest',synthetic:true,sameSourceDigest:fresh.sourceDigest===previous.sourceDigest,freshGroups:fresh.groups.length,reusedGroups:reused.groups.length,note:'Same request origin/value, changed validated structure. Current sourceDigest omits result.scene and projector version. New provider taskIds normally change the digest; this is a replay/migration boundary.'});

await fs.writeFile(path.join(out,'counterexample-results.json'),JSON.stringify({codeBase:'7c921e25e096a7f5b4f4f2645eb2f6023da13651',providerCalls:0,tests:results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({id:r.id,synthetic:r.synthetic,verified:true})),null,2));
