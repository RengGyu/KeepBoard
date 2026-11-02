import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../../../gamepacks/catalog';import {effectiveRecognitionPack} from '../../../shared/recognition';import {photoDefinition} from '../../../server/photoDefinitions';
import {prepareScanObservation,projectScanResults} from '../../../server/scanObservation';import {TerraGameReader,decodeTerraGameObservation} from '../../../server/ai/terraGameReader';import {assembleObservations} from '../../../server/ai/observationAssembly';
import type {Session,Evidence,AnalysisResult} from '../../../shared/types';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {register} from 'node:module';
register('../../../docs/board-story/feedback/skip-css.mjs',import.meta.url);
const {ScanObservationResults}=await import('../../../src/ScanObservationResults');
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9H8AAAAASUVORK5CYII=','base64');
const item=(unit:'single'|'group'|'unknown',box:number[]|null,value=6,quantity:number|null=null)=>({kind:'dice',physicalUnit:unit,box_1000:box?{ymin:box[0],xmin:box[1],ymax:box[2],xmax:box[3]}:null,face:'front',quantity,attributes:[{id:'dieValue',valueJson:String(value),unknownReason:null}]});
async function fixture(items:any[][],options:{session?:Session;id?:string;detail?:boolean}={}){
 const pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id==='sagrada')!),definition=photoDefinition(pack);
 const evidence=items.map((_,i)=>({id:'e'+i,kind:'photo',scope:'public',captureEpoch:'epoch',url:'/synthetic/'+i,label:'synthetic',...(i&&!options.detail?{sourceEvidenceId:'e0',sourceRegion:{x:0,y:0,width:.5,height:.5}}:{})})as Evidence);
 const session=options.session??({id:'synthetic',gamePack:pack,captureEpoch:'epoch',turnInstanceId:'turn',players:[],evidence,assertions:[],notes:{},activity:[],snapshots:[]}as unknown as Session),reader=new TerraGameReader({key:async()=> 'synthetic'});
 const scan=await prepareScanObservation({session,pack,evidence,selection:{kind:'terra-game-observation-v1',definitionSHA:definition.definitionSHA,areaId:'window'},taskId:options.id??'unit-scan',reader,cloud:false,readImage:async()=>({data:bytes,mimeType:'image/png'})});
 const results=scan.units.map((u,i)=>{const p=u.hosted!,native={status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({items:items[i]})}]}]},decoded=decodeTerraGameObservation(native,p.request,p.definition,p.transforms),r=assembleObservations({request:p.request,result:decoded.raw,definition:p.definition,pack,turnInstanceId:'turn',reader:p.reader,transforms:p.transforms,sourceImageSHA:p.sourceImageSHA,hostedWire:decoded.hostedWire});r.observationReceipts![0].scanUnitId=u.id;r.scanBundle={plan:scan.plan,units:[{unitId:u.id,state:'completed',observationCount:decoded.raw.observations.length}],links:[]};return r;});
 return {session,pack,scan,results,project:(rs=results)=>projectScanResults(session,pack,scan,rs)};
}
const pieces=(r:AnalysisResult)=>r.assertions.flatMap(a=>(a.value as any).pieces??[]),stable=(r:AnalysisResult)=>JSON.stringify({values:r.assertions.map(a=>a.value),bundle:r.scanBundle,raw:r.observationReceipts});

const first=await fixture([[item('group',[100,100,900,900])],[item('single',[400,400,600,600],9)]]),initial=first.project();first.session.assertions=initial.assertions;
const next=await fixture([[item('group',[100,100,900,900])]],{session:first.session,id:'whole-later'}),result=next.project();
console.log(JSON.stringify({initial:pieces(initial).map(p=>({id:p.id,quantity:p.quantity,value:p.readout.values.dieValue})),next:pieces(result).map(p=>({id:p.id,quantity:p.quantity,value:p.readout.values.dieValue})),refinements:result.scanBundle?.fusion?.refinements}));
