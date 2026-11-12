import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';
import {ClipboardPhotoPaste,clipboardImageFiles} from '../src/testOnly/ClipboardPhotoPaste';
import {catalogPacks} from '../gamepacks/catalog';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:Workspace}=await import('../src/SessionWorkspace');const {api}=await import('../src/api');
// Actual component events/effects with synthetic files. Browser clipboard permission and image decoding are not simulated as verified.
function mount(component:any,props:any){
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,slots:any[]=[];let cursor=0,tree:any,pending:(()=>void)[]=[];
 const render=(next=props)=>{props=next;cursor=0;pending=[];const prior=internals.H;internals.H={useState(v:any){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],(n:any)=>slots[i]=typeof n==='function'?n(slots[i]):n];},useRef(v:any){return slots[cursor++]??={current:v};},useEffect(fn:any,deps?:any[]){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((d,j)=>!Object.is(d,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};try{tree=component(props);}finally{internals.H=prior;}pending.forEach(f=>f());return tree;};render();return{render,get tree(){return tree;},dispose(){slots.forEach(s=>s?.cleanup?.());}};
}
const nodes=(t:any):any[]=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const find=(t:any,p:(n:any)=>boolean)=>{const n=nodes(t).find(p);assert(n,'actual control missing');return n;};
const image=()=>new File(['synthetic'],'clipboard.png',{type:'image/png'});
function event(files:File[],items:any[]=[]){let prevented=0;return{clipboardData:{files,items},preventDefault(){prevented++;},get prevented(){return prevented;}};}

test('clipboard image files preserve originals without duplicating files also listed as items; text and URLs are untouched',async()=>{
 const file=image(),item={kind:'file',type:'image/png',getAsFile:()=>file};assert.deepEqual(clipboardImageFiles(event([file],[item]).clipboardData as any),[file]);assert.deepEqual(clipboardImageFiles(event([],[item]).clipboardData as any),[file]);
 let calls=0;const ui=mount(ClipboardPhotoPaste,{enabled:true,disabled:false,onFiles:async()=>{calls++;}});
 try{for(const e of [event([], [{kind:'string',type:'text/plain',getAsFile:()=>null}]),event([new File(['https://example.test'],'link.txt',{type:'text/plain'})])]){await ui.tree.props.onPaste(e);assert.equal(e.prevented,0);}assert.equal(calls,0);}finally{ui.dispose();}
});

test('DEV false has no UI or paste handler, and disabled or pending paste never consumes another clipboard event',async()=>{
 let release!:()=>void,calls=0;const waiting=new Promise<void>(r=>release=r),props={enabled:false,disabled:false,onFiles:async()=>{calls++;await waiting;}};const ui=mount(ClipboardPhotoPaste,props);
 try{assert.equal(ui.tree,null);const blockedTarget=ui.render({...props,enabled:true,disabled:true});assert(blockedTarget);assert.equal(blockedTarget.props['aria-disabled'],true);const blocked=event([image()]);await blockedTarget.props.onPaste(blocked);assert.equal(blocked.prevented,0);assert.equal(calls,0);
  const activeTarget=ui.render({...props,enabled:true});assert(activeTarget);const first=event([image()]),job=activeTarget.props.onPaste(first);assert.equal(first.prevented,1);const second=event([image()]);await activeTarget.props.onPaste(second);assert.equal(second.prevented,0);assert.equal(calls,1);release();await job;
 }finally{release();ui.dispose();}
});

// Historical photo-only packs retain the ordinary upload/retry path; current product batch upload is covered in test-photo-reading-flow.
function fixture(ownerId?:string){return {pack:{...catalogPacks.find(p=>p.id==='sagrada')!,releaseTier:'photo',restorationPolicy:undefined},session:{id:'clipboard-test',name:'test',players:[{id:'p1',name:'one',color:'red'}],assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[],stage:'capture',captureEpoch:'epoch',turnInstanceId:'turn'},questions:[],briefing:[]};}
function browserFiles(){const reader=globalThis.FileReader,img=globalThis.Image;
 (globalThis as any).FileReader=class{result='data:image/png;base64,c3ludGhldGlj';onload?:()=>void;readAsDataURL(){queueMicrotask(()=>this.onload?.());}};
 (globalThis as any).Image=class{naturalWidth=10;naturalHeight=20;onload?:()=>void;set src(_value:string){queueMicrotask(()=>this.onload?.());}};
 return()=>{globalThis.FileReader=reader;globalThis.Image=img;};
}
test('image paste feeds the existing gallery input path with owner/scope intact and zero provider requests; normal file upload still works',async()=>{
 const restoreBrowser=browserFiles(),original={jobs:api.analysisJobs,evidence:api.evidence,start:api.startAnalysisJob};const uploads:any[]=[];let starts=0;
 api.analysisJobs=async()=>({jobs:[]});api.evidence=async(_id,body)=>{uploads.push(body);return{createdEvidenceId:'photo',session:{evidence:[{id:'photo',kind:'photo',captureEpoch:body.expectedCaptureEpoch,...body}]}} as any;};api.startAnalysisJob=async()=>{starts++;throw Error('Unexpected model');};
 try{for(const ownerId of [undefined,'p1']){
  const view=fixture(ownerId),ui=mount(Workspace,{view,ownerId,busy:false,status:{configured:true},mutate:async(task:any)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
  const input=find(ui.tree,n=>n.type==='input'&&n.props.type==='file');
  // DEV target and ordinary file selection share precisely this upload callback, not a separate storage API.
  const target=mount(ClipboardPhotoPaste,{enabled:true,disabled:false,onFiles:(files:File[])=>input.props.onChange({target:{files,value:'clipboard'}})});
  try{const e=event([image()]);await target.tree.props.onPaste(e);assert.equal(e.prevented,1);assert.equal(uploads.at(-1).scope,ownerId?'player':'public');assert.equal(uploads.at(-1).ownerId,ownerId);assert.equal(uploads.at(-1).expectedCaptureEpoch,'epoch');assert.equal(uploads.at(-1).width,10);assert.equal(uploads.at(-1).height,20);
   ui.render();await find(ui.tree,n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[image()],value:'file'}});assert.equal(uploads.length,ownerId?4:2);assert.equal(starts,0);
  }finally{target.dispose();ui.dispose();}
 }}finally{restoreBrowser();api.analysisJobs=original.jobs;api.evidence=original.evidence;api.startAnalysisJob=original.start;}
});

test('ordinary file handler refuses stale busy or read-only invocation, and production workspace exposes no TEST_ONLY target',async()=>{
 const restoreBrowser=browserFiles(),original=api.evidence;let calls=0;api.evidence=async()=>{calls++;throw Error('Must not upload');};
 try{for(const mode of ['busy','readonly'] as const){const view:any=fixture();if(mode==='readonly'){view.roomAccess={role:'member'};view.session.room={capacity:2};}const ui=mount(Workspace,{view,busy:mode==='busy',status:{configured:true},mutate:async(task:any)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
  try{assert(!nodes(ui.tree).some(n=>n.type===ClipboardPhotoPaste));await find(ui.tree,n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[image()],value:''}});assert.equal(calls,0);}finally{ui.dispose();}
 }}finally{restoreBrowser();api.evidence=original;}
});


test('a failed pasted upload keeps the existing retry action and does not replace the pending transfer with another paste',async()=>{
 const restoreBrowser=browserFiles(),original={jobs:api.analysisJobs,evidence:api.evidence,start:api.startAnalysisJob};let calls=0,starts=0;const bodies:any[]=[];
 api.analysisJobs=async()=>({jobs:[]});api.startAnalysisJob=async()=>{starts++;throw Error('Unexpected model');};
 api.evidence=async(_id,body)=>{calls++;bodies.push(body);if(calls===1)throw Error('synthetic upload failure');return{createdEvidenceId:'retry',session:{evidence:[{id:'retry',kind:'photo',captureEpoch:body.expectedCaptureEpoch,...body}]}} as any;};
 const ui=mount(Workspace,{view:fixture(),busy:false,status:{configured:true},mutate:async(task:any)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
 const input=find(ui.tree,n=>n.type==='input'&&n.props.type==='file'),target=mount(ClipboardPhotoPaste,{enabled:true,disabled:false,onFiles:(files:File[])=>input.props.onChange({target:{files,value:''}})});
 try{await target.tree.props.onPaste(event([image()]));ui.render();assert.equal(calls,1);assert(nodes(ui.tree).some(n=>n.type==='button'&&n.props.children==='전송 다시 시도'));
  await find(ui.tree,n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[image()],value:''}});assert.equal(calls,1,'pending failed transfer stays available');
  find(ui.tree,n=>n.type==='button'&&n.props.children==='전송 다시 시도').props.onClick();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));ui.render();assert.equal(calls,2);assert.deepEqual(bodies[0],bodies[1]);assert.equal(starts,0);assert(!nodes(ui.tree).some(n=>n.type==='button'&&n.props.children==='전송 다시 시도'));
 }finally{target.dispose();ui.dispose();restoreBrowser();api.analysisJobs=original.jobs;api.evidence=original.evidence;api.startAnalysisJob=original.start;}
});
