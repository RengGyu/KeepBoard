// Read-only diagnostic. Never calls a reader, loads settings, or writes source/private data.
// Run from repository root: node --import tsx docs/multiphoto-link-research-20261029/diagnose.mts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mapObservationRegion,photoFrameTransform} from '../../shared/photoGeometry.ts';
import {linkScanObservations,observationOverlap} from '../../shared/scanObservation.ts';
import {CATAN_TOPOLOGY,COASTAL_EDGES} from '../../shared/scene.ts';

const root=process.cwd(),privateDir=path.join(os.homedir(),'Library/Application Support/KeepBoard/research/fastest-live-20261029');
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const read=(n:string)=>JSON.parse(fs.readFileSync(path.join(privateDir,n),'utf8'));
const native=Array.from({length:5},(_,i)=>read(`${i}.native.json`));
const payloads=native.map(x=>JSON.parse(x.candidates[0].content.parts.filter((p:any)=>p.text&&!p.thought).map((p:any)=>p.text).join('')));
const view=read('final-view.json'),a=view.session.assertions.find((x:any)=>x.field==='board.layout'),rs=a.observationReceipts,plan=rs[0].scanBundle.plan;
const entries=rs.flatMap((r:any)=>r.result.observations.map((o:any)=>{const u=plan.units.find((u:any)=>u.id===r.scanUnitId);return {unitId:u.id,observationRef:o.ref,sourceSHA:u.sourceEvidenceId+':'+u.sourceSHA+':'+u.areaId,componentId:o.componentId,bbox:mapObservationRegion(o,r.request,r.transforms),properties:o.properties,quantity:o.quantity,face:o.face,role:u.role};}));
const ports=entries.filter((e:any)=>e.componentId==='harbor');
const label=(e:any)=>({unitIndex:plan.units.findIndex((u:any)=>u.id===e.unitId),ref:e.observationRef});
const pairs=[];
for(let i=0;i<ports.length;i++)for(let j=i+1;j<ports.length;j++){
 const a=ports[i],b=ports[j],iou=observationOverlap(a.bbox,b.bbox);if(iou<=0)continue;
 const x=a.bbox,y=b.bbox,inter=Math.max(0,Math.min(x.x+x.width,y.x+y.width)-Math.max(x.x,y.x))*Math.max(0,Math.min(x.y+x.height,y.y+y.height)-Math.max(x.y,y.y));
 pairs.push({a:label(a),b:label(b),iou,intersectionOverSmallerArea:inter/Math.min(x.width*x.height,y.width*y.height),strongIdentityGatePass:iou>=.75,cropOnlyAnyOverlapGateBlocks:true});
}
const canon=(links:any[])=>JSON.stringify(links.map(l=>({...l,members:l.members.map((m:any)=>`${m.unitId}/${m.observationRef}`).sort()})).sort((a,b)=>a.members.join().localeCompare(b.members.join())));
const terrain=a.value.components.filter((c:any)=>c.kind==='terrain');
const points=terrain.filter((c:any)=>c.region&&CATAN_TOPOLOGY.byId.hex.has(c.location.id)).map((c:any)=>({photoPointNormalized:{x:c.region.x+c.region.width/2,y:c.region.y+c.region.height/2},canonicalPoint:{x:CATAN_TOPOLOGY.byId.hex.get(c.location.id)!.x,y:CATAN_TOPOLOGY.byId.hex.get(c.location.id)!.y},canonicalTopologyId:c.location.id}));
let existingFitAccepted=false;try{photoFrameTransform({correspondences:points} as any);existingFitAccepted=true;}catch{}
// Same least-squares formulation as current photoFrameTransform; reports fit, not registration truth.
const fit=JSON.parse(execFileSync('python3',['-c',`
import json,sys,numpy as np
p=json.load(sys.stdin);a=[];b=[]
for c in p:
 x,y=c['photoPointNormalized'].values();u,v=c['canonicalPoint'].values()
 a.extend([[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]]);b.extend([u,v])
a=np.array(a);b=np.array(b);h=np.r_[np.linalg.lstsq(a,b,rcond=None)[0],1].reshape(3,3)
errors=[]
for c in p:
 x,y=c['photoPointNormalized'].values();u,v=c['canonicalPoint'].values();q=h@np.array([x,y,1]);q=q[:2]/q[2];errors.append(float(np.linalg.norm(q-[u,v])))
print(json.dumps({'leastSquaresRank':int(np.linalg.matrix_rank(a)),'rmsCanonicalUnits':float(np.sqrt(np.mean(np.square(errors)))),'maxCanonicalUnits':max(errors),'pointsOverExistingPointOneResidual':sum(e>.1 for e in errors),'interpretation':'Model bbox centres and model slots, not independent landmarks or ground truth. No harbor positions inferred.'}))
`],{input:JSON.stringify(points),encoding:'utf8'}));
const anchor=payloads[0].assertions.find((x:any)=>x.field==='board.layout').value.components;
const inputFiles=['0.native.json','1.native.json','2.native.json','3.native.json','4.native.json','final-view.json','whole.jpg','upper-left.png','upper-right.png','lower-left.png','lower-right.png'];
const sourceFiles=['server/scanObservation.ts','shared/scanObservation.ts','shared/photoGeometry.ts','shared/scene.ts','shared/lightweightRecognition.ts','server/ai/observationAssembly.ts','src/ScanObservationResults.tsx','src/PhotoObservationOverlay.tsx','src/SceneWorkspace.tsx'];
const result={checkedAt:new Date().toISOString(),modelCalls:0,productWrites:0,scope:'Existing one-photo/four-crop experiment only; not whole-board accuracy',inputs:inputFiles.map(n=>({id:n,sha256:hash(fs.readFileSync(path.join(privateDir,n)))})),sources:sourceFiles.map(n=>({path:n,sha256:hash(fs.readFileSync(path.join(root,n)))})),nativeHarborCounts:payloads.map((p:any)=>p.items?p.items.filter((x:any)=>x.kind==='harbor').length:p.assertions.flatMap((a:any)=>a.value?.components??[]).filter((x:any)=>x.kind==='harbor').length),storedHarborObservationCount:ports.length,finalHarborCount:a.value.components.filter((c:any)=>c.kind==='harbor').length,placedHarborCount:a.value.components.filter((c:any)=>c.kind==='harbor'&&c.location.type!=='unplaced').length,missingHarborRefs:rs.flatMap((r:any)=>r.result.observations.filter((o:any)=>o.componentId==='harbor'&&!r.componentRefs[o.ref]).map((o:any)=>({unitIndex:plan.units.findIndex((u:any)=>u.id===r.scanUnitId),ref:o.ref}))),pairDiagnostics:pairs,allFramesNull:rs.every((r:any)=>r.frame===null),geometryCandidateCount:rs.reduce((n:number,r:any)=>n+r.geometryCandidates.length,0),currentLinkerReverseOrderSemanticEqual:canon(linkScanObservations(entries))===canon(linkScanObservations([...entries].reverse())),terrainRegistrationDiagnostic:{terrainCount:terrain.length,validBoxSlotPairs:points.length,invalidRawTerrainRegions:anchor.filter((c:any)=>c.kind==='terrain'&&c.region&&(c.region.y>1||c.region.x>1)).map((c:any)=>({id:c.id,invalidKey:c.region.y>1?'region.y':'region.x'})),existingPhotoFrameTransformAccepted:existingFitAccepted,...fit},coastalEdgeCount:COASTAL_EDGES.length,limitations:['No independent board landmarks, pier endpoints, or edition match were supplied.','Reverse-order check covers the actual observation linker only; final projector, new proposal, save/restore are acceptance tests, not executed here.']};
fs.writeFileSync(new URL('./diagnostic.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({nativeHarbors:result.nativeHarborCounts,finalHarbors:result.finalHarborCount,placed:result.placedHarborCount,pairs:result.pairDiagnostics,fit:result.terrainRegistrationDiagnostic,reverseOrderEqual:result.currentLinkerReverseOrderSemanticEqual}));
