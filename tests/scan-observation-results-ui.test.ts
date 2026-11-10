import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {catalogPacks} from '../gamepacks/catalog.ts';
import type {Evidence,SessionView} from '../shared/types.ts';
import {OBSERVATION_VERSION,type ObservationReceipt} from '../shared/lightweightRecognition.ts';
import type {ScanBundleReceipt} from '../shared/scanObservation.ts';
import {loadPhotoDefinitions,photoDefinitionFor} from '../src/photoDefinitions.ts';

register('../docs/board-story/feedback/skip-css.mjs',import.meta.url);
globalThis.window={addEventListener(){},removeEventListener(){}} as unknown as Window&typeof globalThis;
const {ScanObservationResults,ScanUnresolvedGroups}=await import('../src/ScanObservationResults.tsx');
const {SceneWorkspace}=await import('../src/SceneWorkspace.tsx');
await loadPhotoDefinitions();
const pack=catalogPacks.find(p=>p.id==='catan-base')!;
const definition=photoDefinitionFor(pack)!;
const photo=(id:string,ownerId?:string):Evidence=>({id,url:`/synthetic/${id}.png`,kind:'photo',scope:ownerId?'player':'public',ownerId,captureEpoch:'epoch',capturedAt:'now',label:id});

function fixture(ownerId?:string):SessionView {
 const scope={partition:ownerId?'owner_private' as const:'common_public' as const,ownerId:ownerId??null,captureEpoch:'epoch'};
 const bundle:ScanBundleReceipt={
  plan:{version:'scan-observation-plan-v1',id:'scan',gameId:definition.gameId,definitionSHA:definition.definitionSHA,scope,anchorEvidenceId:'read',units:['read','failed','interrupted'].map((id,i)=>({id,evidenceId:id==='failed'?'crop':id,sourceEvidenceId:id,sourceSHA:'a'.repeat(64),inputSHA:'b'.repeat(64),areaId:'board',role:i?'detail':'anchor',target:null}))},
  units:[{unitId:'read',state:'completed',observationCount:1},{unitId:'failed',state:'failed',observationCount:0},{unitId:'interrupted',state:'interrupted',observationCount:0}],links:[]
 };
 const receipt:ObservationReceipt={version:OBSERVATION_VERSION,scanUnitId:'read',scanBundle:bundle,
  request:{version:OBSERVATION_VERSION,taskId:'scan-read',gameId:definition.gameId,packId:pack.id,editionId:definition.editionId,sourceSHA:definition.sourceSHA,definitionSHA:definition.definitionSHA,areaId:'board',scope,images:[{evidenceId:'read',sha256:'a'.repeat(64),width:100,height:100,inputId:'input',transformId:null}],allowedComponents:['number-token'],allowedPropertyIds:{'number-token':['number']},referenceSetId:null,geometryFrameId:null},
  result:{version:OBSERVATION_VERSION,coverage:'partial',completion:'complete',observations:[{ref:'number',imageIndex:0,panelRef:null,componentId:'number-token',bbox:{x:.1,y:.1,width:.2,height:.2},face:'front',quantity:1,rotationDegrees:null,properties:{number:{state:'observed',value:8}},referenceCandidates:[]}]},
  reader:{kind:'gemini-game-observation-v1',model:'gemini-3.8-flash',thinkingLevel:'LOW',mediaResolution:'MEDIA_RESOLUTION_HIGH',maxOutputTokens:32768},frame:null,transforms:[],geometryCandidates:[],componentRefs:{number:'piece'}
 };
 return {pack,session:{id:'synthetic',name:'synthetic',createdAt:'now',updatedAt:'now',gamePackId:pack.id,gamePackVersion:pack.version,captureEpoch:'epoch',turnInstanceId:'turn',stage:'capture',players:[],evidence:['read','failed','interrupted','crop'].map(id=>photo(id,ownerId)),assertions:[{id:'result',field:'components.observed',value:null,ownerId,basis:'observation',status:'accepted',evidenceIds:['read','failed','interrupted'],updatedAt:'now',observationReceipts:[receipt]}],preservations:[],snapshots:[],notes:{},activity:[],example:false},questions:[],derived:[],briefing:[],ready:true,progress:{resolved:0,total:0},differences:[]};
}
const render=(view:SessionView,ownerId?:string)=>renderToStaticMarkup(createElement(ScanObservationResults,{view,ownerId}));

test('failed and interrupted units expose their stored original without a success receipt; successful observations remain',()=>{
 const view=fixture(),before=structuredClone(view),html=render(view);
 assert.match(html,/1\/3장 읽음/);
 assert.match(html,/2번째 사진 · 읽기 실패 · 원본 보관/);
 assert.match(html,/3번째 사진 · 중단 · 원본 보관/);
 for(const id of ['read','failed','interrupted'])assert.match(html,new RegExp(`src="/synthetic/${id}\\.png"`));
 assert.doesNotMatch(html,/src="\/synthetic\/crop\.png"/,'a crop unit opens sourceEvidenceId, not the cropped input');
 assert.equal((html.match(/<summary>사진 원본 보기<\/summary>/g)??[]).length,2);
 assert.match(html,/사진 원본과 읽은 값 1개/);
 assert.match(html,/aria-label="원본 관측 1"/);
 assert.match(html,/수정 없이 저장할 수 있어요/);
 assert.doesNotMatch(html,/<input|<form|확인 필요/);
 assert.deepEqual(view,before,'read-only rendering preserves saved observations and state');
});

test('original photos remain accessible when the exact photo definition is unavailable',()=>{
 const view=fixture();view.pack={...view.pack,version:'unavailable-definition'};
 const html=render(view);
 assert.equal((html.match(/<summary>사진 원본 보기<\/summary>/g)??[]).length,3);
 assert.match(html,/src="\/synthetic\/read\.png"/);
 assert.doesNotMatch(html,/사진 원본과 읽은 값/);
});

test('missing original evidence shows an unavailable notice without guessing a source URL or using the crop',()=>{
 const view=fixture();view.session.evidence=view.session.evidence.filter(p=>p.id!=='failed');
 const html=render(view);
 assert.match(html,/읽기 실패 · 원본 보관/);
 assert.match(html,/원본 사진을 찾을 수 없어요/);
 assert.doesNotMatch(html,/src="\/synthetic\/(?:failed|crop)\.png"/);
 assert.match(html,/src="\/synthetic\/interrupted\.png"/);
});

test('original-photo fallback stays within the current owner and evidence scope',()=>{
 const personal=fixture('p1');
 personal.session.evidence.find(p=>p.id==='failed')!.ownerId='p2';
 personal.session.evidence.find(p=>p.id==='interrupted')!.scope='public';
 const html=render(personal,'p1');
 assert.match(html,/src="\/synthetic\/read\.png"/);
 assert.doesNotMatch(html,/src="\/synthetic\/(?:failed|interrupted)\.png"/);
 assert.equal((html.match(/원본 사진을 찾을 수 없어요/g)??[]).length,2);
 assert.equal(render(personal),'','a public viewer does not see a personal scan bundle');
 const publicView=fixture();publicView.session.evidence.find(p=>p.id==='failed')!.scope='player';
 assert.doesNotMatch(render(publicView),/src="\/synthetic\/failed\.png"/);
});

test('a view without a stored scan bundle does not create a scan or source photo',()=>{
 const view=fixture();delete view.session.assertions[0].observationReceipts;
 assert.equal(render(view),'');
});

test('unresolved source claims are visible near their game record without becoming editable inventory or mandatory input',()=>{
 const view=fixture();view.pack={...view.pack,runtime:{...view.pack.runtime!,support:{...view.pack.runtime!.support,recording:'generic'}}};
 const receipt=view.session.assertions[0].observationReceipts![0];receipt.scanBundle!.unresolvedGroups=[{id:'group',reason:'possible-same-object',members:[{unitId:'read',observationRef:'number'}],relatedPieceIds:[]}];delete receipt.componentRefs.number;
 const before=structuredClone(view),html=render(view);
 assert.match(html,/사진 참고 · 1곳/);assert.doesNotMatch(html,/같은 실물일 수 있는 겹침|미해결 관측 묶음/);assert.match(html,/숫자 토큰/);assert.match(html,/8/);assert.match(html,/원사진 영역/);assert.match(html,/수정 없이 저장/);assert.doesNotMatch(html,/필수 확인|확인해야 저장/);assert.deepEqual(view,before);
});

test('Catan unresolved observations follow the primary editable board, including unknown and zero quantities',()=>{
 const view=fixture(),a=view.session.assertions[0],r=a.observationReceipts![0];a.field='board.layout';a.value={version:2,coverage:'partial',components:[]};
 r.result.observations[0].quantity=null;r.scanBundle!.unresolvedGroups=[{id:'group',reason:'missing-source-box',members:[{unitId:'read',observationRef:'number'}],relatedPieceIds:[]}];
 const html=renderToStaticMarkup(createElement(SceneWorkspace,{view,busy:false,mutate:async()=>{},onEvidence(){}}));
 assert(html.indexOf('scene-primary-board')>=0&&html.indexOf('scene-primary-board')<html.indexOf('사진 참고 · 1곳'));
 assert.doesNotMatch(html,/관측 수량 [^0-9]/);assert.match(html,/사진 참고/);assert.match(html,/숫자 토큰/);assert.match(html,/원사진 영역/);
 r.result.observations[0].quantity=0;
 assert.match(renderToStaticMarkup(createElement(ScanUnresolvedGroups,{view})),/관측 수량 0/);
 r.request.scope.ownerId='other';
 assert.equal(renderToStaticMarkup(createElement(ScanUnresolvedGroups,{view})),'','other owner claims are never displayed');
});

test('fusion provenance resolves earlier job observations and keeps notes optional and read-only',async()=>{
 const {ScanFusionNotes}=await import('../src/ScanObservationResults.tsx'),view=fixture(),a=view.session.assertions[0],current=a.observationReceipts![0],old=structuredClone(current);
 old.scanUnitId='previous';old.scanBundle=structuredClone(old.scanBundle!);old.scanBundle.plan.id='previous-job';old.result.observations[0].properties.number={state:'observed',value:6};
 a.value={version:'game-component-record-v1',pieces:[{id:'piece',quantity:1,readout:{values:{number:8}}}]};
 a.observationReceipts=[old,current];current.scanBundle!.fusion={version:'scan-fusion-v1',decisions:[{pieceId:'piece',fieldPath:'readout.values.number',chosenMember:{unitId:'read',observationRef:'number'},basis:'focused-provisional',alternativeMembers:[{unitId:'previous',observationRef:'number'}],conflict:true}],refinements:[{aggregateMember:{unitId:'previous',observationRef:'number'},childMembers:[{unitId:'read',observationRef:'number'}],relation:'refines-partially-not-identity',exhaustive:false,residualQuantity:null,cropCoversAggregateBox:false}],projectionDigests:[]};
 const before=structuredClone(view),html=renderToStaticMarkup(createElement(ScanFusionNotes,{view}));assert.match(html,/숫자: 8/);assert.match(html,/임시 선택/);assert.match(html,/이전 사진 관측 · 6/);assert.match(html,/이번 사진 관측 · 8/);assert.match(html,/잔량 \?/);assert.doesNotMatch(html,/<input|<form|<details[^>]* open/);assert.deepEqual(view,before);
 old.request.scope.ownerId='other';assert.doesNotMatch(renderToStaticMarkup(createElement(ScanFusionNotes,{view})),/이전 사진 관측 · 6/);
});
