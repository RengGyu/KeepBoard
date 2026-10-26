import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type {SessionView} from '../shared/types.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){}} as unknown as Window&typeof globalThis;
const {GameEssentials}=await import('../src/GameEssentials.tsx');const {PreservationItem}=await import('../src/Packing.tsx');
const {api}=await import('../src/api.ts');const {setPrivateAccess,clearPrivateAccess}=await import('../src/privateAccess.ts');
const project=process.cwd(),bootstrap=await mkdtemp(path.join(os.tmpdir(),'kb-preserve-bootstrap-'));process.chdir(bootstrap);
const {createApp}=await import('../server/index.ts');const {Store}=await import('../server/store.ts');process.chdir(project);await rm(bootstrap,{recursive:true,force:true});

// Test-only controlled hook dispatcher: actual component functions/events/effects, no DOM/reconciler/browser simulation.
// shortcut: React internal dispatcher is version-sensitive; use a supported DOM runner if the project gains one.
function mount(component:(props:any)=>any,initial:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let props=initial,cursor=0,pending:(()=>void)[]=[],tree:any;
 const dispatcher={
  useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useRef(value:any){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},
  useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j]))){pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});}}
 };
 function render(next=props){props=next;cursor=0;pending=[];const previous=internals.H;internals.H=dispatcher;try{tree=component(props);}finally{internals.H=previous;}for(const effect of pending)effect();return tree;}
 render();return {render,get tree(){return tree;},dispose(){for(const slot of slots)slot?.cleanup?.();}};
}
function nodes(tree:any):any[]{if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
const find=(tree:any,predicate:(node:any)=>boolean)=>{const node=nodes(tree).find(predicate);assert(node,'actual component control missing');return node;};

async function fixture(){
 const directory=await mkdtemp(path.join(os.tmpdir(),'kb-preservation-draft-')),store=new Store(directory,path.join(project,'public'));
 const server=(await createApp({store})).listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const address=server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`,originalFetch=globalThis.fetch;
 let failure=false;globalThis.fetch=(input,init)=>failure&&typeof input==='string'&&input.includes('/preservations/')?Promise.resolve(new Response(JSON.stringify({error:'synthetic location failure'}),{status:500,headers:{'Content-Type':'application/json'}})):originalFetch(typeof input==='string'&&input.startsWith('/api')?base+input:input,init);
 let view=await api.create({gamePackId:'ticket-to-ride',players:[{id:'p1',name:'하나',color:'red'},{id:'p2',name:'둘',color:'blue'}]}),flush:(()=>Promise<void>)|null=null;const messages:string[]=[];
 const mutate=async(task:()=>Promise<SessionView>,message?:string)=>{view=await task();if(message)messages.push(message);};
 function parent(ownerId?:string){return mount(GameEssentials,{view,ownerId,busy:false,mutate,onEvidence(){},onReadyToSave:(save:(()=>Promise<void>)|null)=>{flush=save;}});}
 async function saveAll(){await flush?.();await mutate(()=>api.commit(view.session.id,true),'저장했어요');}
 return {store,parent,saveAll,messages,get view(){return view;},fail(value:boolean){failure=value;},async reload(){view=await api.session(view.session.id);return view;},async protect(owner:string){const response=await originalFetch(base+`/api/sessions/${view.session.id}/privacy/${owner}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:true,pin:'0007'})});assert.equal(response.status,200);view=await api.session(view.session.id);},async unlock(owner:string){if(!view.privacy?.protectedOwnerIds.includes(owner))await this.protect(owner);const unlocked=await originalFetch(base+`/api/sessions/${view.session.id}/privacy/${owner}/unlock`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:'0007'})});setPrivateAccess(view.session.id,owner,(await unlocked.json()).token);view=await api.session(view.session.id);},cleanup:async()=>{clearPrivateAccess();globalThis.fetch=originalFetch;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(directory,{recursive:true,force:true});}};
}
function itemMount(parent:ReturnType<typeof mount>){const element=find(parent.tree,n=>n.type===PreservationItem);return {child:mount(PreservationItem,element.props),props:element.props};}
function typeContainer(child:ReturnType<typeof mount>,value:string){find(child.tree,n=>n.type==='input').props.onChange({target:{value}});child.render();}

test('actual preservation draft event registers with parent flush; save/commit/reload retains location without packing',async()=>{
 const f=await fixture();let parent:any,child:any;try{
  parent=f.parent();({child}=itemMount(parent));typeContainer(child,'합성 빨간 봉투 · 순서 유지');await f.saveAll();const reloaded=await f.reload();
  const saved=reloaded.session.snapshots.at(-1)!.preservations.find(p=>p.id===find(child.tree,n=>n.type==='article').props.id.replace('preservation-',''))!;
  assert.equal(saved.container,'합성 빨간 봉투 · 순서 유지');assert.equal(saved.packed,false);assert.equal(saved.restored,false);assert.deepEqual(f.messages,['저장했어요']);
  assert.equal(reloaded.session.preservations.find(p=>p.id===saved.id)!.container,saved.container);
 }finally{child?.dispose();parent?.dispose();await f.cleanup();}
});
test('location write failure rejects whole save before commit/toast, keeps draft and permits retry',async()=>{
 const f=await fixture();let parent:any,child:any;try{
  parent=f.parent();({child}=itemMount(parent));typeContainer(child,'실패해도 남는 위치');f.fail(true);
  await assert.rejects(f.saveAll(),/synthetic location failure/);assert.equal((await f.store.getSession(f.view.session.id))!.snapshots.length,0);assert.deepEqual(f.messages,[]);child.render();assert.equal(find(child.tree,n=>n.type==='input').props.value,'실패해도 남는 위치');
  f.fail(false);await f.saveAll();assert.equal((await f.store.getSession(f.view.session.id))!.snapshots[0].preservations.find(p=>p.id===find(child.tree,n=>n.type==='article').props.id.replace('preservation-',''))!.container,'실패해도 남는 위치');
 }finally{child?.dispose();parent?.dispose();await f.cleanup();}
});
test('PIN-locked parent exposes no location input; unlocked owner flush stays inside its owner',async()=>{
 const f=await fixture();let locked:any,parent:any,child:any;try{
  await f.protect('p1');locked=f.parent('p1');assert.equal(locked.tree,null);locked.dispose();locked=null;
  const item=(await f.store.getSession(f.view.session.id))!.preservations.find(p=>p.ownerId==='p1')!;assert(item);await assert.rejects(api.preservation(f.view.session.id,item.id,{container:'blocked'}));
  await f.unlock('p1');const others=structuredClone((await f.store.getSession(f.view.session.id))!.preservations.filter(p=>p.ownerId!=='p1'));parent=f.parent('p1');({child}=itemMount(parent));typeContainer(child,'p1 봉투');await f.saveAll();
  const stored=(await f.store.getSession(f.view.session.id))!;assert.equal(stored.preservations.find(p=>p.id===item.id)!.container,'p1 봉투');assert.deepEqual(stored.preservations.filter(p=>p.ownerId!=='p1'),others);
 }finally{child?.dispose();parent?.dispose();locked?.dispose();await f.cleanup();}
});

test('individual location save and packing/restoring buttons keep their existing explicit flag semantics',async()=>{
 const f=await fixture();let parent:any,child:any;try{
  parent=f.parent();const mounted=itemMount(parent);let flight:Promise<void>|undefined;const props=mounted.props;child=mounted.child;child.dispose();
  const change=(body:any)=>flight=props.onChange(body);child=mount(PreservationItem,{...props,onChange:change});typeContainer(child,'별도 위치 저장');
  find(child.tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});await flight;
  let stored=(await f.store.getSession(f.view.session.id))!.preservations.find(p=>p.id===props.item.id)!;assert.equal(stored.container,'별도 위치 저장');assert.equal(stored.packed,false);
  child.render({...props,item:stored,onChange:change});find(child.tree,n=>n.props?.role==='checkbox').props.onClick();await flight;
  stored=(await f.store.getSession(f.view.session.id))!.preservations.find(p=>p.id===props.item.id)!;assert.equal(stored.packed,true);assert.equal(stored.restored,false);
  child.render({...props,item:stored,restoring:true,onChange:change});find(child.tree,n=>n.props?.role==='checkbox').props.onClick();await flight;
  stored=(await f.store.getSession(f.view.session.id))!.preservations.find(p=>p.id===props.item.id)!;assert.equal(stored.restored,true);assert.equal(stored.container,'별도 위치 저장');
 }finally{child?.dispose();parent?.dispose();await f.cleanup();}
});
