import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {register} from 'node:module';
import {catanPack} from '../gamepacks/catan.ts';
import type {SessionView} from '../shared/types.ts';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
(globalThis as any).window={addEventListener(){},removeEventListener(){}};

const {default:App}=await import('../src/App.tsx');
const {api}=await import('../src/api.ts');

function mount(component:()=>unknown){
  const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];
  let cursor=0,pending:(()=>void)[]=[];
  function render(){cursor=0;pending=[];const previous=internals.H;internals.H={
    useState(value:any){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useRef(value:any){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},
    useCallback(value:any){cursor++;return value;},
    useEffect(effect:()=>any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:effect()};});},
  };try{component();}finally{internals.H=previous;}for(const effect of pending)effect();}
  render();return {render,dispose(){for(const slot of slots)slot?.cleanup?.();}};
}

test('opened board performs its initial read but no periodic full-session storage reads over 60 seconds',async()=>{
  const original={roomDevice:api.roomDevice,sessions:api.sessions,catalog:api.catalog,status:api.status,session:api.session,interval:globalThis.setInterval,clear:globalThis.clearInterval,location:(globalThis as any).location,window:(globalThis as any).window};
  const timers=new Map<number,()=>void>();let nextTimer=0,reads=0;
  const view={pack:catanPack,session:{id:'opened',name:'합성',players:[],snapshots:[],assertions:[],evidence:[],preservations:[],notes:{},activity:[],updatedAt:''},questions:[],briefing:[]} as unknown as SessionView;
  (globalThis as any).location={search:'?session=opened',hash:'',href:'http://localhost/?session=opened'};
  (globalThis as any).window={addEventListener(){},removeEventListener(){}};
  globalThis.setInterval=((run:()=>void)=>{const id=++nextTimer;timers.set(id,run);return id;}) as typeof setInterval;
  globalThis.clearInterval=((id:number)=>{timers.delete(id);}) as typeof clearInterval;
  api.roomDevice=async()=>({} as any);api.sessions=async()=>[];api.catalog=async()=>[];api.status=async()=>({configured:true} as any);
  api.session=async()=>{reads++;return view;};
  let ui:ReturnType<typeof mount>|undefined;
  try{
    ui=mount(App);await new Promise(resolve=>setTimeout(resolve,0));ui.render();assert.equal(reads,1);
    for(let elapsed=0;elapsed<60000;elapsed+=500)for(const run of [...timers.values()])run();
    await Promise.resolve();assert.equal(reads,1);
  }finally{
    ui?.dispose();Object.assign(api,{roomDevice:original.roomDevice,sessions:original.sessions,catalog:original.catalog,status:original.status,session:original.session});
    globalThis.setInterval=original.interval;globalThis.clearInterval=original.clear;(globalThis as any).location=original.location;(globalThis as any).window=original.window;
  }
});
