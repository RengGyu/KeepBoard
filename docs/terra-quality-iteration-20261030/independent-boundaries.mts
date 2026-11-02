import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {catalogPacks} from '../../gamepacks/catalog';import {effectiveRecognitionPack} from '../../shared/recognition';import {photoDefinition} from '../../server/photoDefinitions';
import {prepareScanObservation,projectScanResults} from '../../server/scanObservation';import {TerraGameReader,decodeTerraGameObservation} from '../../server/ai/terraGameReader';import {assembleObservations} from '../../server/ai/observationAssembly';
import type {Session,Evidence,AnalysisResult} from '../../shared/types';
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

const findings:any[]=[];
const snap=(r:AnalysisResult)=>({pieces:pieces(r).map(p=>({id:p.id,kind:p.componentId,quantity:p.quantity,value:p.readout?.values.dieValue})),refinements:r.scanBundle?.fusion?.refinements,decisions:r.scanBundle?.fusion?.decisions,links:r.scanBundle?.links,unresolved:r.scanBundle?.unresolvedGroups});
const grouped=await fixture([[item('group',[200,200,300,300],3,null)],[item('group',[400,400,600,600],3,null)],[item('single',[420,420,580,580],5,null)]],{id:'independent-group-child'});
const gp=grouped.project(),gd=snap(gp);
assert.equal(stable(gp),stable(grouped.project([...grouped.results].reverse())));assert.equal(stable(gp),stable(grouped.project([...grouped.results,grouped.results[1]])));
findings.push({id:'group-cluster-child',expected:'one editable single plus preserved retired group surface, not ambiguous duplicate parents',actual:gd,observedIssue:gd.refinements?.length===0&&gd.pieces.every(p=>p.value!==5),orderInvariant:true});
const first=await fixture([[item('group',[100,100,900,900],3,null)],[item('single',[400,400,600,600],5,null)]],{id:'independent-first'}),ip=first.project();first.session.assertions=ip.assertions;
const follow=await fixture([[item('group',[100,100,900,900],3,null)]],{session:first.session,id:'independent-later'}),fp=follow.project();
findings.push({id:'retired-parent-reappearance',expected:'same source retired group preserved as nonadditive evidence on subsequent job',initial:snap(ip),actual:snap(fp),observedIssue:pieces(fp).length>pieces(ip).length});
const quantity=await fixture([[item('group',[200,200,300,300],3,2)],[item('group',[400,400,600,600],3,4)]],{id:'independent-quantity'}),qp=quantity.project();
findings.push({id:'quantity-difference',expected:'anchor quantity retained, alternatives raw, optional quantity disagreement metadata',actual:snap(qp),rawQuantities:qp.observationReceipts?.flatMap(r=>r.result.observations.map(o=>o.quantity)),observedIssue:!qp.scanBundle?.fusion?.decisions.some(d=>d.fieldPath==='quantity'&&d.conflict)});
const freeze=JSON.parse(await fs.readFile('docs/terra-quality-iteration-20261030/implementation/source-freeze.json','utf8'));
const files=[];for(const f of freeze.files){const hash=createHash('sha256').update(await fs.readFile(f.path)).digest('hex');assert.equal(hash,f.postSHA);files.push({path:f.path,sha256:hash});}
await fs.writeFile('docs/terra-quality-iteration-20261030/independent-boundaries.json',JSON.stringify({kind:'synthetic-offline-not-vision-quality',newProviderCalls:0,sourceFiles:files,findings},null,2)+'\n');
console.log(JSON.stringify(findings.map(f=>({id:f.id,observedIssue:f.observedIssue,pieces:f.actual.pieces,refinements:f.actual.refinements?.length,unresolved:f.actual.unresolved?.length})),null,2));
