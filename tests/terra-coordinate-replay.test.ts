import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPacks} from '../gamepacks/catalog';
import {photoDefinition} from '../server/photoDefinitions';
import {compileObservationTask} from '../shared/lightweightRecognition';
import {buildTerraGameBody,decodeTerraGameObservation,TERRA_HIGH_IDENTITY} from '../server/ai/terraGameReader';
import {compactTerraKinds,LEAN_TERRA_PROFILE} from '../server/ai/terraCompact';
const pack=catalogPacks.find(p=>p.id==='catan-base')!,definition=photoDefinition(pack);
const request=compileObservationTask({pack,definition,areaId:'board',scope:{partition:'common_public',ownerId:null,captureEpoch:'fixture'},taskId:'coordinate-fixture',images:[{evidenceId:'photo',inputId:'photo',sha256:'a'.repeat(64),width:4752,height:3168,transformId:null}]});
const kinds=compactTerraKinds(request,definition,LEAN_TERRA_PROFILE),kind=kinds.find(k=>k.id==='number-token')!,property=kind.properties.find(p=>p.id==='number')!;
const row=(b:unknown)=>({k:kind.k,b,f:'f',q:1,u:'s',a:[{p:property.p,v:'8'}],x:[]});
const native=(items:unknown[])=>({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify({v:3,items})}]}]});
test('v7 coordinates obey requested y/x corners, independent of source dimensions, and preserve inverted native positions without guessed repair',()=>{
 const body=buildTerraGameBody(request,definition,Buffer.from('original'),'image/jpeg',LEAN_TERRA_PROFILE,{},TERRA_HIGH_IDENTITY);assert.match(body.input[0].content[0].text!,/b:\[ymin,xmin,ymax,xmax\]/);
 // Inverted examples from the frozen Seven Wonders response. None admits a unique lossless axis/frame interpretation.
 const invalid=[[895,446,540,999],[875,538,637,999],[805,945,999,921]],input=native([row([100,200,300,400]),...invalid.map(row),row(null)]),before=structuredClone(input);
 const result=decodeTerraGameObservation(input,request,definition,[],LEAN_TERRA_PROFILE);
 assert.deepEqual(input,before);assert.deepEqual(result.hostedWire.providerResponse,before);
 assert.deepEqual(result.raw.observations[0].bbox,{x:.2,y:.1,width:.2,height:.2});
 assert.equal(result.raw.observations.length,5);assert(result.raw.observations.every(o=>o.properties.number.value===8));
 for(const o of result.raw.observations.slice(1))assert.equal(o.bbox,null);
 assert.equal(result.hostedWire.deferred.filter(d=>d.reason==='invalid-box-geometry').length,3);
});
