import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import React,{createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Evidence} from '../shared/types';
import type {RummikubScene} from '../shared/rummikub';
register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {PhotoLayoutBoard,PhotoLayoutLocation,photoLayoutEvidence}=await import('../src/PhotoLayoutBoard');
const {RummikubBoardView}=await import('../src/RummikubBoard');
const photo:Evidence={id:'photo',kind:'photo',url:'/original',scope:'public',captureEpoch:'epoch',capturedAt:'now',label:'',width:1600,height:900};
const item=(id:string,evidenceId='photo')=>({assertionId:'assertion',pieceId:id,position:{space:'photo' as const,evidenceId,sourceSHA:'a'.repeat(64),box:{x:.1,y:.2,width:.12,height:.18},rotationDegrees:null}});
test('photo arrangement reuses existing tile artwork at readable size, once, without rewriting manual groups',()=>{
 const tile=(id:string)=>({id,kind:'number' as const,color:'orange' as const,number:8,face:'front' as const,representedColor:null,representedNumber:null,evidenceIds:['photo'],region:item(id).position.box,note:''});
 const scene:RummikubScene={version:'rummikub-classic-v1',ownerId:null,coverage:'partial',groups:[{id:'manual',label:'내 묶음',tiles:[tile('manual-tile')]}],loose:[tile('loose'),tile('no-source')]},before=JSON.stringify(scene);
 const html=renderToStaticMarkup(createElement(RummikubBoardView,{scene,rack:false,evidence:[photo],drawingItems:[item('loose'),item('manual-tile'),item('no-source','missing')]}));
 assert.match(html,/사진 배열 그림/);assert.match(html,/사진 구성물 가로·세로로 밀어 보기/);assert.doesNotMatch(html,/aspect-ratio:1600 \/ 900|rotate\(/);assert.match(html,/left:12px;top:12px;width:56px;height:76px/);assert.equal((html.match(/data-drawing-piece="loose"/g)??[]).length,1);assert.doesNotMatch(html,/data-drawing-piece="manual-tile"|<image/);assert.match(html,/내 묶음/);assert.match(html,/따로 둔 타일/);assert.match(html,/fill="#ce7525"/);assert.equal(JSON.stringify(scene),before);
});
test('invalid or unavailable source regions remain outside the picture instead of being clamped',()=>{
 const invalid=item('bad');invalid.position.box.x=.95;
 const noBox=item('no-box');(noBox.position as any).box=null;assert.equal(renderToStaticMarkup(createElement(PhotoLayoutBoard,{items:[invalid,noBox,item('missing','absent')],evidence:[photo],renderItem:()=>null,labelFor:id=>id})), '');
});
test('selection edits the original piece ID and changing source never superimposes viewpoints',()=>{
 const internals=(React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H,slots:any[]=[];let cursor=0,picked='',opened:any;
 const props={items:[item('a'),item('b','second')],evidence:[photo,{...photo,id:'second'}],renderItem:(id:string)=>createElement('svg',{'data-art':id}),labelFor:(id:string)=>id,onSelect:(id:string)=>{picked=id;},onEvidence:(p:Evidence,box:any)=>{opened={p,box};}};
 const draw=()=>{cursor=0;internals.H={useState:(v:any)=>{const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],(v:any)=>{slots[i]=v;}];},useRef:(v:any)=>slots[cursor++]??={current:v},useEffect:()=>{}};try{return PhotoLayoutBoard(props);}finally{internals.H=old;}};
 const nodes=(n:any):any[]=>n&&typeof n==='object'?[n,...(Array.isArray(n)?n.flatMap(nodes):nodes(n.props?.children))]:[];
 let tree=draw(),all=nodes(tree),piece=all.find(n=>n.props?.['data-drawing-piece']);assert.equal(piece.props['data-drawing-piece'],'a');piece.props.onClick();assert.equal(picked,'a');assert.equal(all.filter(n=>n.props?.['data-drawing-piece']).length,1);
 tree=draw();let preview=nodes(tree).find(n=>n.type===PhotoLayoutLocation);assert.equal(preview.props.photo,photo);assert.equal(preview.props.box,props.items[0].position.box);let content=preview.type(preview.props),outline=nodes(content).find(n=>n.props?.className==='photo-layout-location-outline');assert.deepEqual(outline.props.style,{left:'10%',top:'20%',width:'12%',height:'18%'});assert.equal(outline.props.children,undefined);nodes(content).find(n=>n.type==='button').props.onClick();assert.deepEqual(opened,{p:photo,box:props.items[0].position.box});
 all.find(n=>n.type==='select').props.onChange({target:{value:'second\u0000'+'a'.repeat(64)}});tree=draw();assert.equal(nodes(tree).find(n=>n.props?.['data-drawing-piece']).props['data-drawing-piece'],'b');assert(!nodes(tree).some(n=>n.type===PhotoLayoutLocation),'previous photo selection cannot appear on another source');
});

test('a historical source uses receipt source dimensions rather than crop dimensions without modifying evidence',()=>{
 const old={...photo,width:undefined,height:undefined},before=JSON.stringify(old),assertion:any={observationReceipts:[{request:{images:[{evidenceId:old.id,sha256:'a'.repeat(64),width:500,height:300,transformId:'crop'}]},transforms:[{transformId:'crop',inputSHA:'a'.repeat(64),sourceDimensions:{width:1800,height:1200}}]}]};
 const displayed=photoLayoutEvidence([assertion],[old]);assert.equal(displayed[0].width,1800);assert.equal(displayed[0].height,1200);assert.equal(JSON.stringify(old),before);
 const conflict=structuredClone(assertion);conflict.observationReceipts[0].transforms[0].sourceDimensions.height=900;assert.equal(photoLayoutEvidence([assertion,conflict],[old])[0].height,undefined,'conflicting source dimensions are not guessed');
});
