import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {register} from 'node:module';
import React from 'react';
import {fixture,assemble,item,image} from './fixtures/spatial/builders';
import {photoDrawingReference,projectRummikubDrawing} from '../shared/drawingProjection';
import {layoutDrawingItems} from '../shared/drawingLayout';
import {cropPhotoTransform} from '../shared/photoGeometry';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
(globalThis as any).document={body:{nodeType:1}};
const {PhotoLayoutBoard}=await import('../src/PhotoLayoutBoard');
const {RummikubBoardView}=await import('../src/RummikubBoard');
const {RummikubWorkspace}=await import('../src/RummikubWorkspace');
const {api}=await import('../src/api');
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children??t.children)];
const find=(t:any,p:(n:any)=>boolean)=>{const n=nodes(t).find(p);assert(n,'control missing');return n;};
function mount(component:any,props:any){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 function render(){cursor=0;pending=[];const old=internals.H;internals.H={useMemo:(f:any)=>f(),useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps:any[]){const i=cursor++,p=slots[i];if(!p||!deps||deps.some((v,j)=>!Object.is(v,p.deps?.[j])))pending.push(()=>{p?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=component(props);}finally{internals.H=old;}pending.forEach(f=>f());}
 render();return {render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
async function frozen58(){
 const raw=JSON.parse(await readFile(new URL('./fixtures/readable-rummikub-projection.json',import.meta.url),'utf8'));
 const f=fixture('rummikub','table'),{assembled}=assemble(f,{items:raw.map(()=>item('numbers'))}),a=assembled.assertions[0],r=a.observationReceipts![0],scene=a.value as any;
 raw.forEach((p:any,i:number)=>{scene.loose[i].id=p.id;scene.loose[i].region={...p.position.box};r.result.observations[i].bbox={...p.position.box};r.componentRefs[r.result.observations[i].ref]=p.id;});
 // Saved-service-shaped receipt with the existing 58 geometry fixture, not a newly read photograph.
 return {f,a,scene,photo:{id:image.evidenceId,url:'/original.jpg',width:1000,height:1000,kind:'photo',scope:'public',captureEpoch:'synthetic-epoch',capturedAt:'now',label:''} as const};
}
function display(boardProps:any){
 const board=RummikubBoardView(boardProps),photoProps=find(board,n=>n.type===PhotoLayoutBoard).props,ui=mount(PhotoLayoutBoard,photoProps),result=new Map<string,{row:number;x:number;y:number}>();
 const rows=nodes(ui.tree).filter(n=>n.props?.className==='photo-layout-row-pan');
 rows.forEach((row,index)=>nodes(row).filter(n=>n.props?.className==='photo-layout-group').forEach(group=>{const meld=group.props.children;assert(meld);meld.props.tiles.forEach((t:any,i:number)=>result.set(t.id,{row:index,x:group.props.style.left+i*64,y:group.props.style.top}));}));
 ui.dispose();return {positions:result,reference:photoProps.referenceItems,photoProps};
}
test('58 receipt geometries survive actual parent delete/correct/save/JSON/new-mount without resurrecting deleted tiles or moving other rows',async()=>{
 const {f,a,scene,photo}=await frozen58(),original=JSON.stringify(a),view:any={pack:f.pack,session:{id:'saved-rows',players:[],captureEpoch:'synthetic-epoch',evidence:[photo],assertions:[a],snapshots:[]}},oldUpdate=api.update;
 let savedView:any;api.update=async(_id,body)=>{const answer=body.answers!.find((v:any)=>v.field==='table.scene')!;savedView=JSON.parse(JSON.stringify({...view,session:{...view.session,assertions:[{...a,id:'saved-new-assertion',status:'accepted',value:answer.value}]}}));return savedView;};
 const create=(v:any,onSave?:(f:any)=>void)=>mount(RummikubWorkspace,{view:v,busy:false,onEvidence(){},mutate:async(task:any)=>task(),onReadyToSave:onSave});
 const initial=create(view),base=display(find(initial.tree,n=>n.type===RummikubBoardView).props);initial.dispose();assert.equal(base.reference.length,58);assert.equal(base.positions.size,58);
 try{for(const tile of scene.loose){let save:any;const ui=create(view,fn=>{save=fn;});
   try{find(ui.tree,n=>n.type===RummikubBoardView).props.onOpenTile(tile.id);ui.render();find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.includes('빼기')).props.onClick();ui.render();assert(save);await save();assert(savedView);assert.equal(savedView.session.assertions[0].value.loose.length,57);
    const reopened=create(savedView);try{const current=display(find(reopened.tree,n=>n.type===RummikubBoardView).props);assert.equal(current.reference.length,58);assert.equal(current.positions.size,57);assert(!current.positions.has(tile.id));const removedRow=base.positions.get(tile.id)!.row;for(const [id,rect]of base.positions)if(rect.row!==removedRow)assert.deepEqual(current.positions.get(id),rect,`other row moved after deleting ${tile.id}`);}finally{reopened.dispose();}
   }finally{ui.dispose();}
  }
  let saveEdit:any;const edit=create(view,fn=>{saveEdit=fn;});try{find(edit.tree,n=>n.type===RummikubBoardView).props.onOpenTile(scene.loose[0].id);edit.render();find(edit.tree,n=>n.type==='button'&&n.props.children===11).props.onClick();edit.render();await saveEdit();const reopened=create(savedView);try{const shown=find(reopened.tree,n=>n.type===RummikubBoardView);assert.equal(shown.props.scene.loose[0].number,11);assert.deepEqual([...display(shown.props).positions],[...base.positions],'value correction and a new assertion ID do not change reopened geometry');}finally{reopened.dispose();}}finally{edit.dispose();}
  assert.equal(JSON.stringify(a),original,'source assertion and receipt remain immutable');
 }finally{api.update=oldUpdate;}
});
test('JSON-rebuilt reference is independent of live coordinate noise/values and does not cross source, scope, epoch, area or conflicting geometry',async()=>{
 const {f,a,scene,photo}=await frozen58(),binding=f.pack.runtime!.fieldBindings.find(b=>b.key===a.field)!,raw=JSON.stringify(a),refs=photoDrawingReference(a,[photo],binding),input=projectRummikubDrawing(a,scene,[photo]),base=layoutDrawingItems(input,{reference:layoutDrawingItems(refs)});
 const round=JSON.parse(raw),rebuilt=photoDrawingReference(round,[photo],binding);assert.deepEqual(rebuilt,refs);
 const noisy=input.map((i,n)=>{assert(i.position.space==='photo');return {...i,position:{...i.position,box:{...i.position.box,x:i.position.box.x+Math.sin(n*1.618)*.005,y:i.position.box.y+Math.cos(n*2.414)*.005}}};});
 assert.deepEqual(layoutDrawingItems(noisy,{reference:layoutDrawingItems(rebuilt)}).tiles.map(t=>[t.pieceId,t.rect]),base.tiles.map(t=>[t.pieceId,t.rect]));
 const legacy=JSON.parse(raw);delete legacy.observationReceipts[0].request.scope;assert.deepEqual(photoDrawingReference(legacy,[photo],binding),[]);assert.equal(projectRummikubDrawing(legacy,scene,[photo])[0].position.space,'photo','missing legacy reference metadata must not hide the live tile');
 assert.deepEqual(photoDrawingReference(a,[{...photo,id:'another-source'}],binding),[]);assert.deepEqual(photoDrawingReference(a,[{...photo,captureEpoch:'new-epoch'}],binding),[]);assert.deepEqual(photoDrawingReference({...a,ownerId:'different-owner'},[photo],binding),[]);assert.deepEqual(photoDrawingReference(a,[photo],{...binding,areaIds:['other-area']}),[]);
 const conflicting=JSON.parse(raw),r=structuredClone(conflicting.observationReceipts[0]);r.result.observations[0].bbox.x+=.01;conflicting.observationReceipts.push(r);assert.equal(photoDrawingReference(conflicting,[photo],binding).length,57,'competing boxes for one ID cannot pick a convenient anchor');
 const otherDefinition=JSON.parse(raw);otherDefinition.observationReceipts[0].request.definitionSHA='d'.repeat(64);assert.notEqual(photoDrawingReference(otherDefinition,[photo],binding)[0].contextKey,refs[0].contextKey);
 const cropped=JSON.parse(raw),receipt=cropped.observationReceipts[0],t=cropPhotoTransform({transformId:'crop',sourceSHA:'b'.repeat(64),inputSHA:receipt.request.images[0].sha256,sourceDimensions:{width:1000,height:1000},inputDimensions:{width:500,height:500},region:{x:.2,y:.2,width:.5,height:.5}});receipt.request.images[0].transformId=t.transformId;receipt.transforms=[t];const cropRefs=photoDrawingReference(cropped,[photo],binding);assert.equal(cropRefs[0].position.sourceSHA,t.sourceSHA);const id=refs[0].pieceId,box=refs[0].position.box,mapped=cropRefs.find(g=>g.pieceId===id)!.position.box;assert(Math.abs(mapped.x-(.2+box.x*.5))<1e-9);assert(Math.abs(mapped.width-box.width*.5)<1e-9);assert.equal(JSON.stringify(a),raw);
});
