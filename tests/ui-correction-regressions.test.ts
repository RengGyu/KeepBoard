import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog.ts';
import {GapNote} from '../src/GapNote.tsx';

register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {GameBoardRecord}=await import('../src/GameBoardRecord.tsx');
const {ComponentLinkDialog}=await import('../src/ComponentLinkDialog.tsx');
const {api}=await import('../src/api.ts');
const pack=(id:string)=>catalogPacks.find(p=>p.id===id)!;
const piece=(id:string,componentId:string,quantity:number|null=1)=>({id,componentId,variant:null,quantity,label:id,anchor:'',evidenceId:null,region:null});

function mount(component:(props:any)=>any,props:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const dispatcher={useMemo(fn:any){cursor++;return fn();},useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return[slots[i],(next:any)=>slots[i]=typeof next==='function'?next(slots[i]):next];},useRef(value:any){const i=cursor++;return slots[i]??={current:value};},useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{if(typeof old?.cleanup==='function')old.cleanup();slots[i]={deps,cleanup:effect()};});}};
 const render=()=>{cursor=0;pending=[];const previous=internals.H;internals.H=dispatcher;try{tree=component(props);}finally{internals.H=previous;}for(const effect of pending)effect();return tree;};render();return{render,get tree(){return tree;},dispose(){for(const slot of slots)if(typeof slot?.cleanup==='function')slot.cleanup();}};
}
function nodes(t:any):any[]{if(!t||typeof t!=='object')return[];if(Array.isArray(t))return t.flatMap(nodes);return[t,...nodes(t.props?.children)];}
function find(t:any,p:(n:any)=>boolean){const n=nodes(t).find(p);assert(n,'expected control missing');return n;}

test('unknown quantity cannot be stepped, while a known count remains adjustable',()=>{
 const p=pack('carcassonne'),unknown=piece('follower','followers',null),known=piece('follower','followers',2);let changed:any;
 const props={pack:p,fieldKey:'map.scene',record:{version:'game-component-record-v1',pieces:[unknown]},selected:unknown.id,busy:false,onChange:(r:any)=>changed=r};
 const ui=mount(GameBoardRecord,props);try{
  assert.equal(find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='수량 줄이기').props.disabled,true);
  assert.equal(find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='수량 늘리기').props.disabled,true);
  assert.deepEqual([changed],[undefined]);
  props.record={...props.record,pieces:[known]};ui.render();
  find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='수량 늘리기').props.onClick();
  assert.ok(changed);
  assert.equal(changed.pieces[0].quantity,3);
 }finally{ui.dispose();}
});

test('corrected Splendor direct readout value clears its observation gap',()=>{
 const p=pack('splendor'),base={...piece('card','development'),readout:{schema:'splendor-v1',kind:'development',points:null,bonus:null,cost:null,requirements:null,color:null,level:null}};
 const draw=(points:number|null)=>renderToStaticMarkup(React.createElement(GapNote,{pack:p,piece:{...base,readout:{...base.readout,points}},gaps:[{property:'points',reason:'unreadable'}]} as any));
 assert.match(draw(null),/사진 참고/);
 assert.equal(draw(3),'');
});

test('link correction can reference an existing accepted target without adding it to selected corrections',async()=>{
 const p=pack('carcassonne'),follower=piece('new-follower','followers'),tile=piece('saved-tile','tiles');
 const source={id:'candidate',status:'candidate',field:'supply.scene',value:{version:'game-component-record-v1',pieces:[follower]},evidenceIds:[],observationReceipts:[{request:{allowedPropertyIds:{followers:['face']}},componentRefs:{ref:'new-follower'},result:{observations:[{ref:'ref',componentId:'followers',face:'unknown',quantity:null,properties:{face:{state:'unknown',reason:'unreadable'}}}]}}]};
 const session={id:'synthetic',players:[],assertions:[{id:'saved',status:'accepted',field:'map.scene',value:{version:'game-component-record-v1',pieces:[tile]}},source]};
 const original=api.componentLinkOptions;api.componentLinkOptions=async()=>({sourceAssertionId:source.id,pieces:[follower],targets:[{field:'map.scene',label:'지도',visibility:'public'}],targetVersions:{'["map.scene",null]':'saved'}} as any);
 const ui=mount(ComponentLinkDialog,{view:{pack:p,session},source,initialIds:[follower.id],initialTarget:{field:'map.scene'},busy:false,dirtyTarget:()=>false,mutate:async()=>{},onClose(){}});
 try{
  await new Promise(resolve=>setImmediate(resolve));ui.render();
  assert.equal(find(ui.tree,n=>n.type==='details'&&n.props.className==='cl-correct').props.open,false);
  find(ui.tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.join('')==='new-follower (사진 참고)').props.onClick();ui.render();
  const editor=find(ui.tree,n=>n.type?.name==='GameDetailFields');
  assert.deepEqual(editor.props.record.pieces.map((x:any)=>x.id),['saved-tile','new-follower']);
  assert.match(renderToStaticMarkup(React.createElement(editor.type,editor.props)),/<option value="saved-tile"/);
  assert.deepEqual(session.assertions[0].value.pieces.map(x=>x.id),['saved-tile']);
  assert.deepEqual(source.value.pieces.map(x=>x.id),['new-follower']);
 }finally{ui.dispose();api.componentLinkOptions=original;}
});
