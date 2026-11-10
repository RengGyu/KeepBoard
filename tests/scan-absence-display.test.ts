import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog.ts';
import {loadPhotoDefinitions,photoDefinitionFor} from '../src/photoDefinitions.ts';
import {emptyGameReadout,setReadoutValue} from '../shared/readouts/registry.ts';
import type {ObservationProperty,PhotoDefinition} from '../shared/lightweightRecognition.ts';
import type {SessionView} from '../shared/types.ts';
import {scanReviewValue} from '../src/scanReviewValue.ts';

register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {PhotoObservationOverlay}=await import('../src/PhotoObservationOverlay.tsx');
const {ScanUnresolvedGroups,ScanFusionNotes}=await import('../src/ScanObservationResults.tsx');
const {GameDetailFields}=await import('../src/readouts/GameDetailFields.tsx');
const {ChipPick,Stepper}=await import('../src/QuickPick.tsx');
await loadPhotoDefinitions();
const pack=catalogPacks.find(p=>p.id==='carcassonne')!,definition=photoDefinitionFor(pack)!;

function fixture(claim:ObservationProperty):SessionView {
 const scope={partition:'common_public' as const,ownerId:null,captureEpoch:'epoch'};
 const request={version:'lightweight-observation-v1',taskId:'scan',gameId:definition.gameId,packId:pack.id,editionId:definition.editionId,sourceSHA:definition.sourceSHA,definitionSHA:definition.definitionSHA,areaId:'map',scope,images:[{evidenceId:'photo',inputId:'input',sha256:'a'.repeat(64),width:100,height:100,transformId:null}],allowedComponents:['tiles'],allowedPropertyIds:{tiles:['city']},referenceSetId:null,geometryFrameId:null};
 const bundle={plan:{version:'scan-observation-plan-v1',id:'scan',gameId:definition.gameId,definitionSHA:definition.definitionSHA,scope,anchorEvidenceId:'photo',units:[{id:'unit',evidenceId:'photo',sourceEvidenceId:'photo',sourceSHA:'a'.repeat(64),inputSHA:'a'.repeat(64),areaId:'map',role:'anchor',target:null}]},units:[{unitId:'unit',state:'completed',observationCount:1}],links:[],unresolvedGroups:[{id:'unresolved',reason:'missing-source-box',members:[{unitId:'unit',observationRef:'ref'}],relatedPieceIds:[]}],fusion:{version:'scan-fusion-v1',decisions:[{pieceId:'tile',fieldPath:'readout.values.city',chosenMember:{unitId:'unit',observationRef:'ref'},basis:'focused-provisional',alternativeMembers:[],conflict:true}],refinements:[],projectionDigests:[]}};
 const receipt={request,result:{version:'lightweight-observation-v1',coverage:'partial',completion:'complete',observations:[{ref:'ref',imageIndex:0,panelRef:null,componentId:'tiles',bbox:{x:.1,y:.1,width:.2,height:.2},face:'front',quantity:0,rotationDegrees:null,properties:{city:claim,shields:{state:'observed',value:0}},referenceCandidates:[]}]},scanUnitId:'unit',scanBundle:bundle,transforms:[],geometryCandidates:[],componentRefs:{ref:'tile'},hostedWire:{id:'terra-game-wire-v2',items:[{originalValue:claim}],providerResponse:{original:claim},deferred:[]}};
 return {pack,session:{id:'synthetic',captureEpoch:'epoch',players:[],evidence:[{id:'photo',url:'/synthetic.png',kind:'photo',scope:'public',captureEpoch:'epoch'}],assertions:[{id:'a',ownerId:undefined,status:'accepted',field:'map.scene',value:{version:'game-component-record-v1',pieces:[{id:'tile',quantity:0,readout:{values:{city:claim.state==='observed'?claim.value:null}}}]},observationReceipts:[receipt]}]}} as unknown as SessionView;
}
function overlay(claim:ObservationProperty){const v=fixture(claim),r=v.session.assertions[0].observationReceipts![0];return renderToStaticMarkup(React.createElement(PhotoObservationOverlay,{photos:v.session.evidence,request:r.request,result:r.result,geometry:[],definition,compact:true}));}

test('unknown and observed boolean absence use neutral property labels outside text-free source boxes',()=>{
 const unknown=overlay({state:'unknown',value:null,reason:'occluded'}),absent=overlay({state:'observed',value:false});
 assert.match(unknown,/사진 참고/);assert.doesNotMatch(unknown,/도시 표시:/);assert.match(absent,/도시 표시: 사진 참고/);
 for(const html of [unknown,absent]){assert.match(html,/class="lw-source-box"[^>]*aria-label="원본 관측 1"[^>]*><\/button>/);assert.match(html,/문장 표시 수: 0/);}
 assert.doesNotMatch(unknown,/도시 표시: 모름|가려져/);assert.doesNotMatch(absent,/도시 표시: 아니오|도시 표시: false/);
 assert.match(overlay({state:'observed',value:true}),/도시 표시: 예/);
});

test('unresolved and fusion property review share the neutral label without changing stored false, zero, null or raw',()=>{
 for(const claim of [{state:'unknown',value:null,reason:'unreadable'},{state:'observed',value:false}]as const){
  const view=fixture(claim),before=structuredClone(view);
  for(const component of [ScanUnresolvedGroups,ScanFusionNotes]){
   const html=renderToStaticMarkup(React.createElement(component,{view}));
   assert.match(html,/사진 참고/);if(component===ScanFusionNotes||claim.state==='observed')assert.match(html,/도시 표시: 사진 참고/);assert.doesNotMatch(html,/도시 표시: (?:\?|false|없음)/);assert.doesNotMatch(html,/required|disabled|<form/);
  }
  const html=renderToStaticMarkup(React.createElement(ScanUnresolvedGroups,{view}));assert.match(html,/관측 수량 0/);assert.match(html,/문장 표시 수: 0/);
  assert.deepEqual(view,before);
 }
});

test('meaningful zero, empty data and literal text are not guessed to mean absence; explicit enum absence uses its domain',()=>{
 const v=fixture({state:'observed',value:false}),r=v.session.assertions[0].observationReceipts![0];
 const render=(value:unknown,type:string,options?:{value:string|number;label:string}[])=>{
  const d=structuredClone(definition),c=d.components.find(c=>c.id==='tiles')!;c.properties=[{id:'test',label:'값',type,acquisition:'visible',sourceText:'synthetic domain',...(options?{options}:{})}] as PhotoDefinition['components'][number]['properties'];
  const result=structuredClone(r.result);result.observations[0].properties={test:{state:'observed',value:value as never}};
  const before=structuredClone(result),html=renderToStaticMarkup(React.createElement(PhotoObservationOverlay,{photos:[],request:r.request,result,geometry:[],definition:d}));assert.deepEqual(result,before);return html;
 };
 assert.match(render(0,'integer'),/값: 0/);
 assert.match(render(2,'integer'),/값: 2/);
 assert.match(render('없음','text'),/값: 없음/);
 assert.match(render(0,'enum',[{value:0,label:'기본 단계'}]),/값: 기본 단계/);
 for(const x of ['',[]])assert.doesNotMatch(render(x,typeof x==='string'?'text':'marks'),/사진 참고/);
 assert.match(render('absent','enum',[{value:'absent',label:'없음'}]),/값: 사진 참고/);
});

function nodes(t:any):any[]{if(!t||typeof t!=='object')return[];return Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];}
test('existing editable controls emit exact false/zero/unknown values without touching source observations',()=>{
 const source=fixture({state:'observed',value:false}),before=structuredClone(source);
 let piece:any={id:'tile',componentId:'tiles',quantity:null,readout:setReadoutValue(pack,emptyGameReadout(pack,'tiles'),'face','front')},changed:any;
 const controls=()=>GameDetailFields({pack,piece,record:{version:'game-component-record-v1',pieces:[piece]},players:[],disabled:false,onPatch:patch=>{changed=patch;piece={...piece,...patch};}});
 const field=(label:string,type:any)=>{const found=nodes(controls()).find(n=>n.type===type&&n.props.label===label);assert(found);assert.equal(found.props.disabled,false);return found;};
 field('도시 표시',ChipPick).props.onChange(false);assert.equal(changed.readout.values.city,false);
 field('문장 표시 수',Stepper).props.onChange(0);assert.equal(changed.readout.values.shields,0);assert.equal(changed.readout.values.city,false);
 field('도시 표시',ChipPick).props.onChange(null);assert.equal(changed.readout.values.city,null);assert.equal(changed.readout.values.shields,0);
 assert.deepEqual(source,before);
});

test('domain enum labeled unknown shares the neutral display while literal text and stored enum value stay intact',()=>{
 const field={type:'enum' as const,options:[{value:'unknown',label:'모름'},{value:'front',label:'앞면'}]},claim={state:'observed',value:'unknown'},before=structuredClone({field,claim});
 assert.equal(scanReviewValue(claim.value,field),'사진 참고');
 assert.equal(scanReviewValue(null,field),'사진 참고');
 assert.equal(scanReviewValue('front',field,v=>field.options.find(o=>o.value===v)!.label),'앞면');
 assert.equal(scanReviewValue('모름',{type:'text'}),'모름');
 assert.equal(scanReviewValue('unknown',{type:'text'}),'unknown');
 assert.deepEqual({field,claim},before);
});
