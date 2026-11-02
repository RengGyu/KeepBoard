/** Isolated research replay: no model calls, product writes, sessions, or copied photo/raw files. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {catalogPacks} from '../../gamepacks/catalog.ts';
import {effectiveRecognitionPack} from '../../shared/recognition.ts';
import {projectScanResults,observationObjects} from '../../server/scanObservation.ts';
import {mapObservationRegion} from '../../shared/photoGeometry.ts';
import {validateGenericRecord} from '../../shared/genericRecord.ts';
import {decodeGeminiGameObservation} from '../../server/ai/geminiGameReader.ts';

globalThis.fetch=async()=>{throw Error('Network disabled in offline research replay');};
const dir=path.dirname(new URL(import.meta.url).pathname);
const root=path.resolve(dir,'../..');
const priv=path.join(os.homedir(),'Library/Application Support/KeepBoard/research/multiview-followup-20261029');
const read=async(p:string)=>JSON.parse(await fs.readFile(p,'utf8'));
const clone=<T>(v:T):T=>structuredClone(v);
const canonical=(v:any):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const hash=(v:any)=>createHash('sha256').update(typeof v==='string'?v:canonical(v)).digest('hex');
type Box={x:number;y:number;width:number;height:number};
type Entry={key:string;unit:string;index:number;ref:string;role:string;source:string;field:string;kind:string;box:Box|null;roi:Box;density:number;piece:any;types:Record<string,string>};
const area=(b:Box)=>b.width*b.height;
const center=(b:Box)=>[b.x+b.width/2,b.y+b.height/2];
const inside=(p:number[],b:Box)=>p[0]>=b.x&&p[0]<=b.x+b.width&&p[1]>=b.y&&p[1]<=b.y+b.height;
const contains=(a:Box,b:Box)=>inside([b.x,b.y],a)&&inside([b.x+b.width,b.y+b.height],a);
function intersection(a:Box,b:Box){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
function iou(a:Box|null,b:Box|null){if(!a||!b)return 0;const i=intersection(a,b);return i/(area(a)+area(b)-i);}
const layer=(k:string)=>['settlement','city'].includes(k)?'building':k;
const compatible=(a:Entry,b:Entry)=>a.source===b.source&&a.field===b.field&&layer(a.kind)===layer(b.kind);
function identityEdge(a:Entry,b:Entry){return a.unit!==b.unit&&compatible(a,b)&&a.piece.quantity===1&&b.piece.quantity===1&&!!a.box&&!!b.box&&inside(center(a.box),b.box)&&inside(center(b.box),a.box);}
const values=(e:Entry)=>e.piece.readout?.values??{};
const known=(x:any)=>x!==null&&x!==undefined;
function specificity(a:Entry,b:Entry){
 // A smaller field of view is a task-specific preference, not calibrated correctness.
 if(!a.box||!b.box||!contains(a.roi,a.box)||!contains(b.roi,b.box))return false;
 return a.source===b.source&&a.density>=b.density-1e-8&&area(a.roi)<area(b.roi);
}
function entriesFrom(plan:any,units:any[],definition:any){
 const delivery=new Map<string,any>();
 for(const r of units){const id=r.scanBundle?.units[0]?.unitId??r.observationReceipts?.[0]?.scanUnitId;if(!plan.units.some((u:any)=>u.id===id))throw Error('foreign unit');const old=delivery.get(id);if(old&&canonical(old)!==canonical(r))throw Error('changed redelivery');delivery.set(id,r);}
 const entries:Entry[]=[];
 for(const [index,u]of plan.units.entries()){
  const result=delivery.get(u.id);if(!result)continue;
  for(const receipt of result.observationReceipts??[]){
   const q=receipt.request;
   if(canonical(q.scope)!==canonical(plan.scope)||q.definitionSHA!==plan.definitionSHA||q.areaId!==u.areaId||receipt.sourceImageSHA!==u.sourceSHA)throw Error('scope/source mismatch');
   const source=canonical([u.sourceEvidenceId,u.sourceSHA,u.areaId,plan.scope,plan.definitionSHA]);
   const objects=new Map(result.assertions.flatMap((a:any)=>observationObjects(a.value).map((p:any)=>[p.id,{piece:p,field:a.field}])));
   for(const o of receipt.result.observations){
    const found:any=objects.get(receipt.componentRefs[o.ref]);if(!found)throw Error('missing assembled observation');
    const image=q.images[o.imageIndex],tr=receipt.transforms.find((t:any)=>t.transformId===image.transformId);
    // This task's real cases are affine same-source crops; no new camera registration.
    if(tr&&tr.kind!=='crop')throw Error('Replay supports known affine crop only');
    const roi=tr?{x:tr.inverseMatrix[2],y:tr.inverseMatrix[5],width:tr.inverseMatrix[0],height:tr.inverseMatrix[4]}:{x:0,y:0,width:1,height:1};
    const dimensions=tr?.sourceDimensions??{width:image.width,height:image.height};
    const density=Math.min(image.width/(dimensions.width*roi.width),image.height/(dimensions.height*roi.height));
    const box=mapObservationRegion(o,q,receipt.transforms);const piece=clone(found.piece);
    const key=u.id+':'+o.ref;piece.id='scan-'+hash([plan.id,u.id,o.ref]).slice(0,28);piece.region=box;
    const types=Object.fromEntries((definition.components.find((c:any)=>c.id===o.componentId)?.properties??[]).map((p:any)=>[p.id,p.type]));
    entries.push({key,unit:u.id,index,ref:o.ref,role:u.role,source,field:found.field,kind:o.componentId,box,roi,density,piece,types});
   }
  }
 }
 return entries.sort((a,b)=>a.index-b.index||a.key.localeCompare(b.key));
}

export function fuse(entries:Entry[],primarySource:string,mode:'structural'|'focused'|'all-focused'='focused',manual:Record<string,Record<string,any>>={}){
 entries=clone(entries).sort((a,b)=>a.index-b.index||a.key.localeCompare(b.key));
 const adjacency=entries.map(()=>new Set<number>());
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(identityEdge(entries[i],entries[j])){adjacency[i].add(j);adjacency[j].add(i);}
 const seen=new Set<number>(),clusters:Entry[][]=[],ambiguous=new Set<string>();
 for(let i=0;i<entries.length;i++)if(!seen.has(i)){
  const stack=[i],group:number[]=[];while(stack.length){const j=stack.pop()!;if(seen.has(j))continue;seen.add(j);group.push(j);stack.push(...adjacency[j]);}
  const es=group.map(j=>entries[j]).sort((a,b)=>a.index-b.index||a.key.localeCompare(b.key));
  // At most one observation per unit, complete pairwise correspondence. No chain joining.
  const bad=new Set(es.map(e=>e.unit)).size!==es.length||group.some(j=>group.some(k=>j!==k&&!adjacency[j].has(k)));
  if(bad){for(const e of es){ambiguous.add(e.key);clusters.push([e]);}}else clusters.push(es);
 }
 const records=new Map<string,any[]>(),links:any[]=[],unplaced:any[]=[],refinements:any[]=[];
 const refinementGroups=new Set<string>();
 for(const group of entries){
  if(!(typeof group.piece.quantity==='number'&&group.piece.quantity>1)||!group.box||group.source!==primarySource||manual[group.key])continue;
  const byUnit=new Map<string,Entry[]>();
  for(const e of entries)if(e.unit!==group.unit&&compatible(e,group)&&e.role==='crop'&&e.piece.quantity===1&&e.box&&inside(center(e.box),group.box)&&!ambiguous.has(e.key))byUnit.set(e.unit,[...(byUnit.get(e.unit)??[]),e]);
  const choices=[...byUnit.values()].filter(es=>es.length>=1).sort((a,b)=>area(a[0].roi)-area(b[0].roi)||a[0].unit.localeCompare(b[0].unit));
  if(choices.length){refinementGroups.add(group.key);refinements.push({group:group.key,children:choices[0].map(e=>e.key).sort(),relation:'refines-partially-not-identity',cropCoversAggregateBox:contains(choices[0][0].roi,group.box),exhaustive:false,residualQuantity:null,oldQuantityNotAdded:true});}
 }
 for(const members of clusters){
  const base=members.find(e=>e.role==='anchor')??members[0];
  if(refinementGroups.has(base.key))continue;
  const protectedGroup=entries.find(g=>manual[g.key]&&typeof g.piece.quantity==='number'&&g.piece.quantity>1&&g.unit!==base.unit&&compatible(g,base)&&g.box&&base.box&&inside(center(base.box),g.box));
  if(protectedGroup){unplaced.push({members:members.map(e=>e.key),reason:'manual-aggregate-overlap'});continue;}
  if(!base.source||base.source!==primarySource||!base.box||ambiguous.has(base.key)&&base.role!=='anchor'){
   unplaced.push({members:members.map(e=>e.key),reason:!base.source?'missing-source':base.source!==primarySource?'unregistered-view':!base.box?'missing-source-box':'ambiguous-identity'});continue;
  }
  const p=clone(base.piece),conflicts:any[]=[],selections:any[]=[];
  const byKey=new Map(members.map(e=>[e.key,e]));
  const manualValues=members.map(e=>manual[e.key]).filter(Boolean);
  const keys=[...new Set(members.flatMap(e=>Object.keys(values(e))))].sort();
  for(const key of keys){
   const m=manualValues.find(x=>Object.hasOwn(x,key));
   if(m){p.readout.values[key]=clone(m[key]);p.readout.sources[key]=m[key]===null?null:'user';selections.push({field:key,basis:'user-protected',source:null});continue;}
   const claims=members.filter(e=>known(values(e)[key]));if(!claims.length)continue;
   const different=new Set(claims.map(e=>canonical(values(e)[key]))).size>1;
   const dominant=claims.filter(e=>claims.every(other=>e===other||specificity(e,other)));
   const canPrefer=mode==='all-focused'||mode==='focused'&&['integer','boolean','enum'].includes(base.types[key]);
   const chosen=canPrefer&&dominant.length===1?dominant[0]:claims.find(e=>e===base)??claims[0];
   p.readout.values[key]=clone(values(chosen)[key]);p.readout.sources[key]='observation';
   selections.push({field:key,source:chosen.key,basis:different?(chosen===dominant[0]&&canPrefer?'focused-source-provisional':'unresolved-preference'):'observed'});
   if(different)conflicts.push({field:key,members:claims.map(e=>e.key),selected:chosen.key,verified:false});
  }
  // Preserve observed quantity, no aggregate residual arithmetic and no owner/placement inference.
  records.set(base.field,[...(records.get(base.field)??[]),p]);
  links.push({id:p.id,members:members.map(e=>e.key),identity:members.length>1?'one-to-one-source-correspondence':'single-observation',ambiguous:ambiguous.has(base.key),selections,conflicts});
 }
 return {records:[...records].sort(([a],[b])=>a.localeCompare(b)).map(([field,pieces])=>({field,value:{version:'game-component-record-v1',pieces:pieces.sort((a,b)=>a.id.localeCompare(b.id))}})),links:links.sort((a,b)=>a.id.localeCompare(b.id)),unplaced,refinements};
}

/** Proposed snapshot comparison, synthetic only: current product does not persist this snapshot yet. */
function manualFieldLocks(current:any,emitted:any|null){
 return Object.fromEntries(Object.entries(current.readout.values).filter(([k,v])=>current.readout.sources[k]==='user'||!emitted||canonical(v)!==canonical(emitted.readout.values[k])));
}

// Maximum-weight one-to-one matching for evaluation only, not the fusion algorithm.
function assignment(weights:number[][]){
 if(!weights.length||!weights[0]?.length)return [];
 const n=weights.length,m=Math.max(n,weights[0].length),u=Array(n+1).fill(0),v=Array(m+1).fill(0),p=Array(m+1).fill(0),way=Array(m+1).fill(0);
 for(let i=1;i<=n;i++){p[0]=i;let j0=0;const min=Array(m+1).fill(Infinity),used=Array(m+1).fill(false);
  do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;for(let j=1;j<=m;j++)if(!used[j]){const cur=-(weights[i0-1][j-1]??0)-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}for(let j=0;j<=m;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;j0=j1;}while(p[j0]!==0);
  do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
 }
 return p.flatMap((i,j)=>i&&j&&j<=weights[0].length?[[i-1,j-1]]:[]);
}
function references(c:any){return c.objects.map((o:any)=>({id:o.id,kind:o.kind??o.canonicalKind,box:o.bbox??{x:o.box[0],y:o.box[1],width:o.box[2]-o.box[0],height:o.box[3]-o.box[1]},attrs:o.attributes??o.readableAttributes??{}}));}
function score(gt:any[],pieces:any[]){
 const weights=gt.map(g=>pieces.map(p=>g.kind===p.componentId&&p.quantity===1?iou(g.box,p.region):0));
 const matches=assignment(weights).filter(([i,j])=>weights[i][j]>=.25);
 const chosen=new Map(matches.map(([i,j])=>[i,j]));const metric=(key:string)=>{
  const eligible=gt.map((g,i)=>({g,i})).filter(({g})=>known(g.attrs[key]));let correct=0,missing=0;
  for(const {g,i}of eligible){const j=chosen.get(i),value=j===undefined?null:pieces[j].readout?.values[key];if(!known(value))missing++;else if(canonical(value)===canonical(g.attrs[key]))correct++;}
  const outcomes=eligible.map(({g,i})=>{const j=chosen.get(i),value=j===undefined?null:pieces[j].readout?.values[key];return {referenceId:g.id,outcome:!known(value)?'missing':canonical(value)===canonical(g.attrs[key])?'equal':'different'};});
  return {correct,missing,disagrees:eligible.length-correct-missing,denominator:eligible.length,outcomes};
 };
 const duplicateCandidates=pieces.flatMap((p,j)=>!matches.some(([,k])=>j===k)&&p.quantity===1&&gt.some((g,i)=>g.kind===p.componentId&&weights[i][j]>=.25)?[p.id]:[]);
 return {matched:matches.length,denominator:gt.length,editablePieces:pieces.length,matchedByKind:Object.fromEntries([...new Set(gt.map(g=>g.kind))].map(k=>[k,matches.filter(([i])=>gt[i].kind===k).length])),duplicateCandidates,attributes:{dieValue:metric('dieValue'),dieColor:metric('dieColor'),observedColor:metric('observedColor')},pairs:matches.map(([i,j])=>({referenceId:gt[i].id,pieceId:pieces[j].id,iou:weights[i][j]}))};
}

function synthetic(){
 const box={x:.1,y:.1,width:.1,height:.1};
 const mk=(unit:string,index:number,ref:string,b:Box|null=box,attrs:any={number:6},quantity:any=1,source='source',roi:Box={x:0,y:0,width:1,height:1}):Entry=>({key:unit+':'+ref,unit,index,ref,role:index===0?'anchor':'crop',source,field:'f',kind:'piece',box:b,roi,density:1,types:Object.fromEntries(Object.keys(attrs).map(k=>[k,'integer'])),piece:{id:unit+ref,componentId:'piece',quantity,region:b,evidenceId:'e',readout:{values:attrs,sources:Object.fromEntries(Object.keys(attrs).map(k=>[k,attrs[k]===null?null:'observation']))}}});
 const tests:any[]=[];const check=(name:string,fn:()=>void)=>{fn();tests.push({name,status:'PASS'});};const ps=(x:any)=>x.records.flatMap((r:any)=>r.value.pieces);
 check('same-unit adjacent equal-looking overlapping rectangles stay distinct',()=>{const x=fuse([mk('b',1,'x'),mk('b',1,'y',{...box,x:.18})],'source');assert.equal(ps(x).length,2);});
 check('cross-unit identical physical box produces one editable object',()=>{assert.equal(ps(fuse([mk('a',0,'x'),mk('b',1,'y')],'source')).length,1);});
 check('complementary value and zero survive; unknown never erases',()=>{const x=fuse([mk('a',0,'x',box,{number:6,cost:null}),mk('b',1,'x',box,{number:null,cost:0})],'source');assert.deepEqual(ps(x)[0].readout.values,{number:6,cost:0});});
 check('equal-support genuine conflict remains flagged without losing object or other values',()=>{const x=fuse([mk('a',0,'x',box,{number:6,cost:null}),mk('b',1,'x',box,{number:9,cost:0})],'source');assert.equal(ps(x).length,1);assert.equal(x.links[0].conflicts.length,1);assert.equal(ps(x)[0].readout.values.cost,0);assert.equal(x.links[0].selections.find(s=>s.field==='number').basis,'unresolved-preference');});
 check('focused AI can revise a wrong AI value, not a manual value or manual unknown',()=>{const a=mk('a',0,'x'),b=mk('b',1,'x',box,{number:9},1,'source',{x:.05,y:.05,width:.25,height:.25});assert.equal(ps(fuse([a,b],'source'))[0].readout.values.number,9);assert.equal(ps(fuse([a,b],'source','focused',{[a.key]:{number:4}}))[0].readout.values.number,4);assert.equal(ps(fuse([a,b],'source','focused',{[a.key]:{number:null}}))[0].readout.values.number,null);});
 check('group refinement does not sum aggregate quantity or infer a residual',()=>{const a=mk('a',0,'g',{x:.05,y:.05,width:.4,height:.3},{number:null},12),b=mk('b',1,'x'),c=mk('b',1,'y',{...box,x:.3});const x=fuse([a,b,c],'source');assert.equal(ps(x).length,2);assert.equal(x.refinements[0].residualQuantity,null);});
 check('partial crop keeps aggregate claim non-additive; never claims unseen remainder is zero',()=>{const a=mk('a',0,'g',{x:0,y:0,width:1,height:1},{number:null},12),b=mk('b',1,'x',box,{},1,'source',{x:.05,y:.05,width:.4,height:.4}),c=mk('b',1,'y',{...box,x:.3},{},1,'source',b.roi);const x=fuse([a,b,c],'source');assert.equal(ps(x).length,2);assert.equal(x.refinements[0].cropCoversAggregateBox,false);assert.equal(x.refinements[0].residualQuantity,null);assert.equal(x.refinements[0].exhaustive,false);});
 check('manual aggregate remains unchanged without adding its detail again',()=>{const a=mk('a',0,'g',{x:0,y:0,width:1,height:1},{number:null},12),b=mk('b',1,'x'),c=mk('b',1,'y',{...box,x:.3});const x=fuse([a,b,c],'source','focused',{[a.key]:{number:null}});assert.equal(ps(x).length,1);assert.equal(ps(x)[0].quantity,12);assert.equal(x.unplaced.length,2);});
 check('one visible child is a partial refinement, never group quantity plus one',()=>{const a=mk('a',0,'g',{x:0,y:0,width:1,height:1},{number:null},12),b=mk('b',1,'x');const x=fuse([a,b],'source');assert.equal(ps(x).length,1);assert.equal(x.refinements[0].residualQuantity,null);});
 check('unregistered changed-source view never becomes same-board identity',()=>{const x=fuse([mk('a',0,'x'),mk('b',1,'x',box,{},1,'other')],'source');assert.equal(ps(x).length,1);assert.equal(x.unplaced[0].reason,'unregistered-view');});
 check('missing source box is local uncertainty and does not block another crop object',()=>{const x=fuse([mk('b',1,'x',null),mk('b',1,'y')],'source');assert.equal(ps(x).length,1);assert.equal(x.unplaced.length,1);});
 check('same-unit contenders and cross-unit transitive chains never merge identities',()=>{const x=fuse([mk('a',0,'x'),mk('b',1,'x'),mk('b',1,'y')],'source');assert.equal(ps(x).length,1);assert.equal(x.unplaced.length,2);});
 check('empty response and absent source do not erase unrelated valid objects',()=>{assert.equal(ps(fuse([],'source')).length,0);const x=fuse([mk('a',0,'x'),mk('b',1,'x',box,{},1,'')],'source');assert.equal(ps(x).length,1);assert.equal(x.unplaced[0].reason,'missing-source');});
 check('explicit user unknown is detected by last emitted value despite null basis',()=>{const old=mk('a',0,'x').piece,now=clone(old);now.readout.values.number=null;now.readout.sources.number=null;assert.deepEqual(manualFieldLocks(now,old),{number:null});assert.deepEqual(manualFieldLocks(old,old),{});assert.deepEqual(manualFieldLocks(old,null),{number:6});});
 check('free text disagreement is preserved as an alternative, not automatic string rewrite',()=>{const a=mk('a',0,'x',box,{color:'yellow'}),b=mk('b',1,'x',box,{color:'yellow translucent'},1,'source',{x:0,y:0,width:.5,height:.5});a.types.color=b.types.color='text';const x=fuse([a,b],'source');assert.equal(ps(x)[0].readout.values.color,'yellow');assert.equal(x.links[0].conflicts.length,1);});
 return tests;
}

const plan=await read(path.join(root,'docs/multiview-followup-20261029/plan.json'));
const refs=(await Promise.all(['sol1','sol2'].map(x=>read(path.join(root,'docs/twenty-games-pack-study-20261029/references-'+x+'.json'))))).flatMap(x=>x.cases);
const ledger=await read(path.join(root,'docs/multiview-followup-20261029/ledger.json'));
const report:any={version:'observation-fusion-research-v1',date:'2026-10-29',calls:0,productWrites:0,referenceCaveat:'Frozen pre-output AI partial references, not human-certified truth; 3 selected same-original crops, no independent camera views.',cases:[],synthetic:synthetic()};
for(const c of plan.cases){
 const units=await read(path.join(priv,c.gameId+'.units.json')),saved=await read(path.join(priv,c.gameId+'.combined-projection.json'));
 const scanPlan=saved.scanBundle.plan,pack=effectiveRecognitionPack(catalogPacks.find(p=>p.id===c.packId)!);
 const scan:any={plan:scanPlan,units:await Promise.all(scanPlan.units.map(async(u:any,i:number)=>({id:u.id,evidenceId:u.evidenceId,hosted:await read(path.join(priv,c.gameId+'.'+(i?'crop':'whole')+'.prepared.json'))})))};
 for(const [i,u]of scan.units.entries()){
  const variant=i?'crop':'whole',raw=await fs.readFile(path.join(priv,c.gameId+'.'+variant+'.native.json'));
  assert.equal(createHash('sha256').update(raw).digest('hex'),ledger.find((x:any)=>x.gameId===c.gameId&&x.variant===variant).rawSHA);
  const decoded=decodeGeminiGameObservation(JSON.parse(raw.toString()),u.hosted.request,u.hosted.definition,undefined,u.hosted.transforms);
  assert.equal(canonical(decoded),canonical(units[i].observationReceipts[0].result),'Native decoded result differs from stored unit');
 }
 const session:any={assertions:[],players:[],captureEpoch:scanPlan.scope.captureEpoch};
 const before=canonical(units);const old=projectScanResults(session,pack,scan,units);
 assert.equal(canonical(old.assertions.map(a=>a.value)),canonical(saved.assertions.map((a:any)=>a.value)),'Production replay diverged');
 const definition=scan.units[0].hosted.definition;
 const es=entriesFrom(scanPlan,units,definition),primary=es.find(e=>e.role==='anchor')?.source??canonical([scanPlan.units[0].sourceEvidenceId,scanPlan.units[0].sourceSHA,scanPlan.units[0].areaId,scanPlan.scope,scanPlan.definitionSHA]);
 assert.equal(canonical(es.find(e=>e.role==='crop')?.roi),canonical(c.sourceRegion),'Crop transform/plan region differs');
 const t=performance.now(),proposed=fuse(es,primary),replayMs=performance.now()-t,structural=fuse(es,primary,'structural'),allFocused=fuse(es,primary,'all-focused');
 assert.equal(canonical(proposed),canonical(fuse(entriesFrom(scanPlan,[...units].reverse(),definition),primary)));
 assert.equal(canonical(proposed),canonical(fuse(entriesFrom(scanPlan,[...units,units[1]],definition),primary)));
 assert.equal(canonical(proposed),canonical(JSON.parse(JSON.stringify(proposed))));assert.equal(before,canonical(units));
 const failed=clone(units);failed[1].assertions=[];failed[1].observationReceipts=[];failed[1].scanBundle.units[0].state='failed';
 assert.equal(canonical(fuse(entriesFrom(scanPlan,failed,definition),primary)),canonical(fuse(entriesFrom(scanPlan,[units[0]],definition),primary)));
 let guardChecks=0;
 for(const key of ['ownerId','captureEpoch','partition']){const changed=clone(units);changed[1].observationReceipts[0].request.scope[key]='foreign';assert.throws(()=>entriesFrom(scanPlan,changed,definition));guardChecks++;}
 const changed=clone(units);changed[1].observationReceipts[0].result.observations[0].quantity=0;assert.throws(()=>entriesFrom(scanPlan,[...units,changed[1]],definition));guardChecks++;
 for(const r of proposed.records)validateGenericRecord(r.value as any,pack,r.field,scanPlan.units.flatMap((u:any)=>[u.evidenceId,u.sourceEvidenceId]),{mode:'ai'});
 const gt=references(refs.find(x=>x.gameId===c.gameId));const pieces=(r:any)=>r.records.flatMap((a:any)=>a.value.pieces);
 const baselinePieces=old.assertions.flatMap(a=>observationObjects(a.value));
 const evals={current:score(gt,baselinePieces),structuralOnly:score(gt,pieces(structural)),focusedFields:score(gt,pieces(proposed)),allFocusedIncludingText:score(gt,pieces(allFocused))};
 const memberGT=new Map<string,string>();for(const u of scanPlan.units){const subset=es.filter(e=>e.unit===u.id),s=score(gt,subset.map(e=>e.piece));for(const pair of s.pairs){const e=subset.find(e=>e.piece.id===pair.pieceId)!;memberGT.set(e.key,pair.referenceId);}}
 const wrongLinks=proposed.links.filter(l=>new Set(l.members.map((k:string)=>memberGT.get(k)).filter(Boolean)).size>1).map(l=>l.id);
 const retainedAnchorIds=es.filter(e=>e.role==='anchor'&&!proposed.refinements.some(r=>r.group===e.key)).map(e=>e.piece.id);
 assert(retainedAnchorIds.every(id=>pieces(proposed).some(p=>p.id===id)));
 assert(retainedAnchorIds.every(id=>baselinePieces.some(p=>p.id===id)));
 for(const r of old.observationReceipts??[])for(const o of r.result.observations){
  const represented=baselinePieces.some(p=>p.id===r.componentRefs[o.ref]);
  const unresolved=old.scanBundle?.unresolvedGroups?.some(g=>g.members.some(m=>m.unitId===r.scanUnitId&&m.observationRef===o.ref));
  assert(represented||unresolved,'Current raw observation orphan');
 }
 const checks={nativeHashAndDecodedReceiptsMatch:true,productionBeforeMatchesSaved:true,currentRawCoverageAlsoComplete:true,retainedAnchorIdsUnchanged:true,reverseCompletionEqual:true,exactRedeliveryEqual:true,JSONRoundtripEqual:true,failedCropPreservesWholeResult:true,rawUnchanged:true,currentGenericRecordValidation:true,scopeAndChangedRedeliveryRejections:guardChecks};
 const sourceKnown=es.reduce((n,e)=>n+Object.values(values(e)).filter(known).length,0);
 const selectedKnown=pieces(proposed).reduce((n:number,p:any)=>n+Object.values(p.readout?.values??{}).filter(known).length,0);
 const baselineKnown=baselinePieces.reduce((n:number,p:any)=>n+Object.values(p.readout?.values??{}).filter(known).length,0);
 const baselineMemberObservations=(old.observationReceipts??[]).reduce((n,r)=>n+Object.values(r.componentRefs).filter(id=>baselinePieces.some(p=>p.id===id)).length,0);
 const represented=new Set(proposed.links.flatMap(l=>l.members));const deferred=new Set(proposed.unplaced.flatMap(x=>x.members));const refined=new Set(proposed.refinements.map(r=>r.group));
 assert.equal(new Set([...represented,...deferred,...refined]).size,es.length);
 report.cases.push({gameId:c.gameId,sourceSHA:c.sourceSHA,cropSHA:c.cropSHA,localFusionMsSingleRun:replayMs,rawObservationCount:es.length,rawKnownFieldClaims:sourceKnown,beforeKnownEditableFields:baselineKnown,selectedKnownEditableFields:selectedKnown,beforeEditableMemberObservations:baselineMemberObservations,editableMemberObservations:represented.size,refinedAggregateObservations:refined.size,deferredObservations:deferred.size,allObservationKeysAccounted:true,records:proposed.records.map(r=>({field:r.field,pieces:r.value.pieces.length,digest:hash(r.value)})),evaluation:evals,conflicts:{objects:proposed.links.filter(l=>l.conflicts.length).length,fieldClaims:proposed.links.reduce((n,l)=>n+l.conflicts.length,0),provisionallyRevisedFields:proposed.links.flatMap(l=>l.selections).filter(s=>s.basis==='focused-source-provisional').length},wrongLinksWithinFrozenReference:wrongLinks,linksOutsideReferenceUnverified:proposed.links.filter(l=>l.members.length>1&&l.members.some(k=>!memberGT.has(k))).length,refinements:proposed.refinements,checks});
}
report.limits=['No model rerun or real HTTP/database/UI save/reopen.','Editable records validate, but source boxes are not calibrated game-board coordinates.','Focused-source precedence is a hypothesis; crops add no new pixels and can worsen attributes.','Frozen reference string equality is not semantic normalization; no reference corrections.','Three hand-picked failed cases cannot establish generalization or full-photo precision.'];
report.evidence={inputInventorySHA:hash(await fs.readFile(path.join(dir,'inputs.json'),'utf8')),prototypeSHA:hash(await fs.readFile(path.join(dir,'replay.mts'),'utf8')),sourceLinks:['https://arxiv.org/abs/2202.06934','https://obss.github.io/sahi/postprocess/combine/','https://arxiv.org/abs/1910.13302','https://github.com/ZFTurbo/Weighted-Boxes-Fusion','https://arxiv.org/abs/1602.00763','https://raw.githubusercontent.com/abewley/sort/master/sort.py']};
await fs.writeFile(path.join(dir,'replay-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:report.cases.map((c:any)=>({game:c.gameId,matched:[c.evaluation.current.matched,c.evaluation.focusedFields.matched,c.evaluation.current.denominator],pips:[c.evaluation.current.attributes.dieValue.correct,c.evaluation.focusedFields.attributes.dieValue.correct,c.evaluation.current.attributes.dieValue.denominator],editable:c.records.map(r=>r.pieces),wrongLinks:c.wrongLinksWithinFrozenReference.length,duplicates:c.evaluation.focusedFields.duplicateCandidates.length})),synthetic:report.synthetic.length},null,2));
