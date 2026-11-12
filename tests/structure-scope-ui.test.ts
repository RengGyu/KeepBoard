import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {fixture,spatialFixture,board,placement,spatial,item,assemble,image} from './fixtures/spatial/builders';
import {setReadoutValue,emptyGameReadout} from '../shared/readouts/registry';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {GameBoardRecord}=await import('../src/GameBoardRecord');
const {PhotoLayoutBoard}=await import('../src/PhotoLayoutBoard');
const {loadRealAssets}=await import('../src/realBoards');
(globalThis as any).window={addEventListener(){},removeEventListener(){}};
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children??t.children)];
const find=(t:any,p:(n:any)=>boolean)=>{const found=nodes(t).find(p);assert(found,'UI control missing');return found;};
const cls=(n:any,c:string)=>String(n.props?.className??'').split(' ').includes(c);
function mount(props:any){const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 function render(){cursor=0;pending=[];const old=internals.H;internals.H={useMemo:(fn:any)=>fn(),useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=GameBoardRecord(props);}finally{internals.H=old;}pending.forEach(f=>f());}render();return {props,render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
async function assets(game:string){const old=globalThis.fetch;globalThis.fetch=(async(url:any)=>{try{return new Response(await readFile('public'+String(url)));}catch{return new Response('',{status:404});}}) as typeof fetch;await loadRealAssets(game,'base',true);await loadRealAssets(game);return()=>{globalThis.fetch=old;};}
async function ready(ui:ReturnType<typeof mount>){await new Promise(r=>setImmediate(r));ui.render();}
const photo={id:image.evidenceId,url:'/synthetic.png',width:1000,height:800,kind:'photo',scope:'public',captureEpoch:'synthetic-epoch',label:'',capturedAt:'now'} as const;

test('floor selection also filters source-only pieces; zero, unknown and all other layers remain stored',async()=>{
 const restore=await assets('descent-legends-dark'),f=fixture('descent-legends-dark','map'),a=assemble(f,{items:[item('figures'),item('terrain'),item('figures')]}),assertion=a.assembled.assertions[0];
 const layers=[0,2,null],pieces=a.pieces.map((p,i)=>({...p,quantity:i===0?0:null,readout:setReadoutValue(f.pack,emptyGameReadout(f.pack,p.componentId),'layer',layers[i])})),record={version:'game-component-record-v1',pieces},before=JSON.stringify(record);let writes=0;
 const ui=mount({pack:f.pack,fieldKey:assertion.field,assertion,record,evidence:[photo],selected:pieces[1].id,startEditing:true,editor:React.createElement('div',{'data-test-editor':true}),busy:false,onChange(){writes++;}});
 try{await ready(ui);const shown=()=>find(ui.tree,n=>n.type===PhotoLayoutBoard).props.items.map((i:any)=>i.pieceId),picker=()=>find(ui.tree,n=>n.props?.['aria-label']==='층 보기');assert.deepEqual(shown(),pieces.map(p=>p.id));
  picker().props.onChange({target:{value:'0'}});ui.render();assert.deepEqual(shown(),[pieces[0].id]);assert(!nodes(ui.tree).some(n=>n.props?.['data-test-editor']),'a hidden-layer selection cannot retain an open editor');
  picker().props.onChange({target:{value:'unknown'}});ui.render();assert.deepEqual(shown(),[pieces[2].id]);picker().props.onChange({target:{value:'2'}});ui.render();assert.deepEqual(shown(),[pieces[1].id]);assert.equal(writes,0);assert.equal(JSON.stringify(record),before);
 }finally{ui.dispose();restore();}
});

test('identical local board refs from different jobs stay independently selectable and edits preserve the other board',async()=>{
 const restore=await assets('blokus'),one=spatialFixture(),two=spatialFixture();one.request={...one.request,taskId:'job-one'};two.request={...two.request,taskId:'job-two'};const area=one.request.spatial!.frames[0].areas[0];
 const a=assemble(one,{items:[item()],spatial:spatial([board(one.request)],[placement(area.id,area.addresses[0].address)])}),b=assemble(two,{items:[item()],spatial:spatial([board(two.request)],[placement(area.id,area.addresses[1].address)])});
 const pieces=[...a.pieces,...b.pieces],assertion={...a.assembled.assertions[0],observationReceipts:[...a.assembled.assertions[0].observationReceipts!,...b.assembled.assertions[0].observationReceipts!]},record={version:'game-component-record-v1',pieces},before=JSON.stringify(record);let picked='',written:any;
 const ui=mount({pack:one.pack,fieldKey:assertion.field,assertion,record,evidence:[photo],selected:pieces[0].id,busy:false,onSelect:(id:string)=>{picked=id;},onChange:(next:any)=>{written=next;}});
 try{await ready(ui);const selector=find(ui.tree,n=>n.props?.['aria-label']==='사진 속 판 인스턴스'),options=nodes(selector).filter(n=>n.type==='option');assert.equal(options.length,2);assert.notEqual(options[0].props.value,options[1].props.value);
  assert.equal(nodes(ui.tree).filter(n=>cls(n,'gb-slot')&&cls(n,'filled')).length,1);selector.props.onChange({target:{value:options[1].props.value}});ui.render();assert.equal(nodes(ui.tree).filter(n=>cls(n,'gb-slot')&&cls(n,'filled')).length,1);
  find(ui.tree,n=>cls(n,'gb-slot')&&cls(n,'filled')).props.onClick();assert.equal(picked,pieces[1].id);assert.equal(typeof written,'undefined');ui.props.selected=pieces[1].id;ui.render();find(ui.tree,n=>cls(n,'gb-slot')&&!cls(n,'filled')&&!n.props.disabled).props.onClick();assert(written);assert.deepEqual(written.pieces[0],pieces[0]);assert.equal(written.pieces[1].id,pieces[1].id);assert.equal(written.pieces[1].spatial.manualOverride,true);assert.deepEqual(written.pieces[1].spatial.source,pieces[1].spatial!.source);assert.equal(JSON.stringify(record),before);
  ui.props.record=JSON.parse(JSON.stringify(written));ui.render();find(ui.tree,n=>n.props?.['aria-label']==='사진 속 판 인스턴스').props.onChange({target:{value:options[0].props.value}});ui.render();assert.equal(nodes(ui.tree).filter(n=>cls(n,'gb-slot')&&cls(n,'filled')).length,1,'a manually corrected piece cannot leak back onto the other source instance');picked='';find(ui.tree,n=>cls(n,'gb-slot')&&cls(n,'filled')).props.onClick();assert.equal(picked,pieces[0].id);
 }finally{ui.dispose();restore();}
});

test('verified covered cells without an anchor remain visible and editable without inventing the anchor or flattening to a photo row',async()=>{
 const restore=await assets('blokus'),f=spatialFixture(),area=f.request.spatial!.frames[0].areas[0],a=assemble(f,{items:[item()],spatial:spatial([board(f.request)],[placement(area.id,area.addresses[0].address,{anchorAddress:null,coveredAddresses:area.addresses.slice(0,3).map(a=>a.address),coverageComplete:false})])}),assertion=a.assembled.assertions[0],record={version:'game-component-record-v1',pieces:a.pieces},before=JSON.stringify(record);let picked='',writes=0;
 const ui=mount({pack:f.pack,fieldKey:assertion.field,assertion,record,evidence:[photo],busy:false,onSelect:(id:string)=>{picked=id;},onChange(){writes++;}});
 try{await ready(ui);assert.equal(a.pieces[0].spatial!.resolved!.anchor,null);const target=find(ui.tree,n=>cls(n,'gb-covered-piece'));assert.equal(target.props['data-drawing-piece'],a.pieces[0].id);assert.equal(nodes(ui.tree).filter(n=>n.props?.['data-spatial-cell']).length,3);assert(!nodes(ui.tree).some(n=>n.type===PhotoLayoutBoard&&n.props.items.length));target.props.onClick();assert.equal(picked,a.pieces[0].id);assert.equal(writes,0);assert.equal(JSON.stringify(record),before);
  ui.props.fieldKey='reserve.scene';ui.render();assert(!nodes(ui.tree).some(n=>cls(n,'gb-covered-piece')),'coverage cannot migrate to a different field');assert.equal(JSON.stringify(record),before);
 }finally{ui.dispose();restore();}
});

test('existing manually recorded tile coordinates and attachments take precedence over photo-band hypotheses; large unresolved grids keep fallback',async()=>{
 const {CarcassonneLayoutPreview}=await import('../src/readouts/CarcassonneLayoutPreview'),restore=await assets('carcassonne'),f=fixture('carcassonne','map'),a=assemble(f,{items:[item('tiles'),item('tiles'),item('followers')]}),assertion=a.assembled.assertions[0];
 const [first,second,follower]=a.pieces;first.readout=setReadoutValue(f.pack,setReadoutValue(f.pack,first.readout as any,'gridX',0),'gridY',0);second.readout=setReadoutValue(f.pack,setReadoutValue(f.pack,second.readout as any,'gridX',1),'gridY',0);follower.readout=setReadoutValue(f.pack,follower.readout as any,'attachedTo',{pieceId:first.id,featureId:null});second.quantity=0;
 const record={version:'game-component-record-v1',pieces:a.pieces},before=JSON.stringify(record);let picked='';const ui=mount({pack:f.pack,fieldKey:assertion.field,assertion,record,evidence:[photo],busy:false,onSelect:(id:string)=>{picked=id;}});
 try{await ready(ui);const picture=find(ui.tree,n=>n.type===PhotoLayoutBoard);assert.deepEqual(picture.props.items.map((i:any)=>i.pieceId),[follower.id]);const preview=find(ui.tree,n=>n.type===CarcassonneLayoutPreview),rendered=CarcassonneLayoutPreview(preview.props),targets=nodes(rendered).filter(n=>n.type==='button');assert.equal(targets.length,2);targets[0].props.onClick();assert.equal(picked,first.id);assert.equal(JSON.stringify(record),before);
  const far=structuredClone(record);far.pieces[1].readout=setReadoutValue(f.pack,far.pieces[1].readout as any,'gridX',100);ui.props.record=far;ui.render();assert.equal(find(ui.tree,n=>n.type===PhotoLayoutBoard).props.items.length,3,'a preview that cannot draw its coordinate range must not consume the source entries');
 }finally{ui.dispose();restore();}
});

test('UI gap summary consumes the same area applicability as correction gaps; unknown role remains conservative',async()=>{
 const {readingGaps}=await import('../src/readingGaps'),{observationGaps}=await import('../shared/observationGaps');
 const observations=Array.from({length:3},(_,i)=>({ref:'item-'+i,componentId:'cards',face:'front',quantity:0,sourceAreaId:'supply',properties:{printedName:{state:'observed',value:'visible name'},cardType:{state:'unknown',reason:'unreadable'}}}));
 const assertion:any={ownerId:undefined,observationReceipts:[{
  componentRefs:Object.fromEntries(observations.map(o=>[o.ref,o.ref])),
  request:{allowedPropertyIds:{cards:['printedName','cardType']},readingTarget:{mode:'public-scene',areaIds:['supply','played']},propertyApplicability:{frontOnlyPropertyIds:{cards:['printedName']},areaPropertyIds:{supply:{cards:['printedName']},played:{cards:['printedName','cardType']}}}},
  result:{observations}
 }]},before=JSON.stringify(assertion);
 assert.equal(readingGaps([assertion]),null);assert.equal(observationGaps(assertion).size,0);assert.equal(JSON.stringify(assertion),before);
 const ambiguous=structuredClone(assertion);for(const o of ambiguous.observationReceipts[0].result.observations)o.sourceAreaId=null;assert.deepEqual(readingGaps([ambiguous]),{unread:3,total:3});assert.equal(observationGaps(ambiguous).size,3);assert.equal(ambiguous.observationReceipts[0].result.observations[0].quantity,0);
});
