import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {register} from 'node:module';import packs from '../gamepacks/generated/game-essentials.json';import {effectiveRecognitionPack} from '../shared/recognition';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {default:SessionWorkspace}=await import('../src/SessionWorkspace');const {PhotoCaptureGuide,captureGuideText}=await import('../src/PhotoCaptureGuide');const {CameraDialog}=await import('../src/Capture');const {api}=await import('../src/api');
// Controlled actual component events/effects; not a DOM renderer or a browser-click claim.
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



function view(){const pack=effectiveRecognitionPack(structuredClone((packs as any[]).find(p=>p.id==='splendor')));return {pack,session:{id:'synthetic-photo-ui',name:'합성',players:[{id:'p1',name:'시험',color:'red'}],stage:'capture',captureEpoch:'epoch',turnInstanceId:'turn',assertions:[],evidence:[],preservations:[],snapshots:[],notes:{},activity:[]},questions:[],briefing:[]};}
test('actual workspace capture events bind selected part, postpone multi-photo analysis until explicit same-state answer, and show camera guidance',async()=>{
 const oldJobs=api.analysisJobs,oldEvidence=api.evidence,oldStart=api.startAnalysisJob;api.analysisJobs=async()=>({jobs:[]});let count=0,starts:any[]=[],uploads:any[]=[];
 api.evidence=async(_id,body)=>{uploads.push(body);const id='synthetic-'+(++count);return {createdEvidenceId:id,session:{evidence:[{id,...body,captureEpoch:'epoch',kind:'photo'}]}} as any;};api.startAnalysisJob=async(_id,body)=>{starts.push(body);return {job:{id:'synthetic-job',sessionId:'synthetic-photo-ui',evidenceIds:body.evidenceIds,captureEpoch:'epoch',state:'queued'}} as any;};
 const ui=mount(SessionWorkspace,{view:view(),busy:false,status:{configured:true},mutate:async(task:()=>Promise<any>)=>task(),onBack(){},setOwnerId:async()=>{},onToast(){}});
 try{
  find(ui.tree,n=>n.type===PhotoCaptureGuide).props.onChange('player');ui.render();find(ui.tree,n=>n.type==='button'&&n.props['aria-label']==='판 스캔').props.onClick();await new Promise(r=>setTimeout(r,0));ui.render();
  const camera=find(ui.tree,n=>n.type===CameraDialog);assert.match(camera.props.guidance,/구매 카드/);await camera.props.onCapture({dataUrl:'synthetic',label:'one'});await camera.props.onCapture({dataUrl:'synthetic',label:'two'});await camera.props.onClose();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(starts.length,0);assert(uploads.every(b=>b.captureTarget.areaId==='player'));
  find(ui.tree,n=>n.type==='button'&&n.props.children==='네, 함께 읽기').props.onClick();await new Promise(r=>setTimeout(r,0));ui.render();assert.equal(starts.length,1);assert.equal(starts[0].sameStaticState,true);assert.equal(starts[0].captureTarget.areaId,'player');assert.deepEqual(starts[0].evidenceIds,['synthetic-1','synthetic-2']);
 }finally{ui.dispose();api.analysisJobs=oldJobs;api.evidence=oldEvidence;api.startAnalysisJob=oldStart;}
});

test('Catan user guidance is Korean shooting help while machine profile and prompt remain unchanged',async()=>{
 const {captureProfile,captureAreas,capturePrompt}=await import('../shared/photoCapture');
 const all=packs as any[];const p=all.find(p=>p.id==='catan-base'),profile=captureProfile(p)!,before=structuredClone(profile);
 for(const a of [...captureAreas(p),...captureAreas(p,'p1')]){const text=captureGuideText(p,a);assert.doesNotMatch(text,/canonical|Owner-scoped|null|vertices|edges|hex|ID/);assert.match(text,/찍어/);}
 assert.deepEqual(captureProfile(p),before);const area=profile.areas.find(a=>a.id==='board')!;
 assert.match(capturePrompt(p,[{id:'synthetic',scope:'public',kind:'photo',captureTarget:{version:1,gameId:'catan',sourceSHA:profile.sourceSHA,areaId:area.id}} as any]),/Existing canonical/);
 for(const pack of all)for(const a of captureProfile(pack)!.areas)assert.doesNotMatch(captureGuideText(pack,a),/\b(?:null|ID|controllers|identity|axial|hex|layer|footprint|local)\b/);
});
