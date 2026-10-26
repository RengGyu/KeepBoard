import {readFile} from 'node:fs/promises';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=new URL('../..',import.meta.url).pathname.replace(/\/$/,'');
register(root+'/docs/board-story/feedback/skip-css.mjs','file://'+root+'/');
(globalThis as any).window={addEventListener(){}};globalThis.fetch=async()=>{throw new Error('x');};
const {recompute}=await import(root+'/server/engine.ts');
const {default:W}=await import(root+'/src/SessionWorkspace.tsx');
const packs=JSON.parse(await readFile(root+'/docs/game-essentials/runtime/fixture-packs.json','utf8'));
for(const id of process.argv.slice(2)){const pack=packs.find((p:any)=>p.id===id);const s:any={id:'s',name:'합성',createdAt:'n',updatedAt:'n',gamePackId:pack.id,gamePackVersion:pack.version,gamePack:pack,players:[{id:'p1',name:'하나',color:'red'}],captureEpoch:'e',turnInstanceId:'t',stage:'capture',evidence:[],assertions:[],preservations:[],snapshots:[],notes:{},activity:[],example:false};
const view=recompute(s,pack);view.privacy={protectedOwnerIds:[],unlockedOwnerIds:[],setupRequiredOwnerIds:[]};
const html=renderToStaticMarkup(createElement(W,{view,busy:false,status:{configured:false},mutate:async()=>{},onBack(){},setOwnerId:async()=>{},onToast(){}} as any));
console.log('=====',id);console.log(html.replace(/<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,'\n').split('\n').map(t=>t.trim()).filter(Boolean).join(' | '));}
