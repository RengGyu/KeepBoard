// User-authorized bounded comparison. Whole original public photos; no crops or product sessions.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildTerraGameBody, TerraGameReader, extractOpenAIKey} from '../../server/ai/terraGameReader';
const out='docs/terra-compact-20261102', priv='/private/tmp/kb-terra-compact-20261102';
const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const profiles={legacy:'literal-named-fill-unit-original-v2',compact:'literal-compact-unit-original-v3'} as const;
const inputs=JSON.parse(await fs.readFile(priv+'/inputs.json','utf8'));
const oldSelection=JSON.parse(await fs.readFile('docs/terra-quality-iteration-20261030/selection.json','utf8'));
const oldProtocol=JSON.parse(await fs.readFile('docs/terra-quality-iteration-20261030/evaluation-preflight.json','utf8'));
const sourcePaths=['server/ai/terraGameReader.ts','server/ai/terraCompact.ts','server/ai/geminiGameReader.ts','shared/lightweightRecognition.ts'];
const sourceHashes=[];for(const p of sourcePaths){try{sourceHashes.push({path:p,sha256:hash(await fs.readFile(p))});}catch{}}
const cases=[];
for(const input of inputs){
 const old=oldSelection.cases.find((c:any)=>c.gameId===input.gameId);
 const task=JSON.parse(await fs.readFile(`/private/tmp/kb-terra-quality-eval-pbufdhgr/${input.gameId}.task.json`,'utf8'));
 const hosted=task.scan.units[0].hosted, request=structuredClone(hosted.request), image=await fs.readFile(input.path);
 assert.equal(hash(image),input.sha256);request.taskId=input.gameId+'-compact-20261102';
 Object.assign(request.images[0],{sha256:input.sha256,width:input.width,height:input.height});
 const refRow=oldProtocol.rows.find((r:any)=>r.gameId===input.gameId),refBytes=await fs.readFile(refRow.referencePath);
 assert.equal(hash(refBytes),refRow.referenceSHA);
 const pair=[];
 for(const condition of ['legacy','compact'] as const){
  const body=buildTerraGameBody(request,hosted.definition,image,'image/jpeg',profiles[condition] as any);
  assert.equal(body.reasoning.effort,'low');assert.equal(body.max_output_tokens,32768);
  assert.equal(body.input[0].content.filter((x:any)=>x.type==='input_image').length,1);
  const requestPath=`${priv}/${input.gameId}-${condition}.request.json`;
  await fs.writeFile(requestPath,JSON.stringify(body),{mode:0o600});
  pair.push({condition,profile:profiles[condition],requestPath,bodySHA:hash(JSON.stringify(body))});
 }
 cases.push({input,request,definition:hosted.definition,referencePath:refRow.referencePath,referenceSHA:refRow.referenceSHA,oldWidth:old.width,oldHeight:old.height,pair});
}
const preflight={version:'terra-compact-whole-pair-v1',at:new Date().toISOString(),maxCalls:6,peak:2,retries:0,model:'gpt-6.1-terra',effort:'low',detail:'high',maxOutputTokens:32768,sourceHashes,
 maxCalculatedUSD:2,privateDir:priv,referencePolicy:'Frozen existing partial AI references only; not exhaustive whole-photo accuracy or human ground truth. Reference content is never in requests.',
 capturePolicy:'Original public photo downloads, same scene as earlier web thumbnails. Not newly taken phone photos. No crop, no upscaling.',
 calls:cases.flatMap((c:any)=>c.pair.map((p:any)=>({...p,gameId:c.input.gameId,inputSHA:c.input.sha256,width:c.input.width,height:c.input.height,referenceSHA:c.referenceSHA})))};
if(process.argv[2]!=='execute'){
 await fs.writeFile(out+'/preflight.json',JSON.stringify(preflight,null,2)+'\n');
 console.log(JSON.stringify({prepared:preflight.calls.length,inputDimensions:inputs.map((i:any)=>[i.gameId,i.width,i.height]),newCalls:0}));process.exit(0);
}
const frozen=JSON.parse(await fs.readFile(out+'/preflight.json','utf8'));
assert.deepEqual(preflight.calls,frozen.calls,'Frozen request changed');assert.deepEqual(preflight.sourceHashes,frozen.sourceHashes,'Reader changed after freeze');
const keyFile=process.argv[3];assert(keyFile&&!keyFile.includes('/.keepboard/'));
const key=extractOpenAIKey(await fs.readFile(keyFile,'utf8'));
await fs.writeFile(priv+'/run.claim',JSON.stringify({at:new Date().toISOString(),preflightSHA:hash(await fs.readFile(out+'/preflight.json'))}),{flag:'wx',mode:0o600});
const rows:any[]=[];let calls=0,active=0,peak=0,halt=false,next=0;
// Alternate pair order; two requests concurrently. This remains a single-run developer comparison.
const jobs=cases.flatMap((c:any,i:number)=>(i%2?[...c.pair].reverse():c.pair).map((p:any)=>({c,p})));
const iou=(a:number[],b:number[])=>{const inter=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return inter/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter)||0;};
function score(result:any,reference:any,c:any){
 const preds=result.raw.observations.filter((o:any)=>o.bbox&&result.hostedWire.physicalUnits?.[o.ref]!=='group'&&(o.quantity===1||o.quantity===null&&result.hostedWire.physicalUnits?.[o.ref]==='single'));
 const boxes=preds.map((o:any)=>[o.bbox.x,o.bbox.y,o.bbox.x+o.bbox.width,o.bbox.y+o.bbox.height]);
 const refs=reference.objects;
 const matrix=refs.map((r:any)=>boxes.map((b:number[])=>iou([r.boxPx[0]/c.oldWidth,r.boxPx[1]/c.oldHeight,r.boxPx[2]/c.oldWidth,r.boxPx[3]/c.oldHeight],b)));
 let detected=0,correctKind=0;const numeric={correct:0,wrong:0,unknown:0,missing:0};
 const detail=refs.map((r:any,i:number)=>{
  const values=matrix[i],max=Math.max(0,...values),j=values.indexOf(max),column=matrix.map((v:number[])=>v[j]);
  const unique=max>=.25&&values.filter((v:number)=>Math.abs(v-max)<1e-9).length===1&&max===Math.max(...column)&&column.filter((v:number)=>Math.abs(v-max)<1e-9).length===1;
  const pred=unique?preds[j]:null;if(pred){detected++;if(pred.componentId===r.componentId)correctKind++;}
  const numbers=Object.entries(r.attributes).filter(([,v])=>typeof v==='number').map(([id,v])=>{const prop=pred?.properties[id];const actual=prop?.state==='observed'?prop.value:null;const state=!pred?'missing':actual===null?'unknown':actual===v?'correct':'wrong';numeric[state]++;return {id,expected:v,actual,state};});
  return {id:r.id,matched:!!pred,kindCorrect:pred?pred.componentId===r.componentId:null,numeric:numbers};
 });
 return {referenceObjects:refs.length,detected,correctKind,numeric,detail};
}
const start=performance.now();
await Promise.all(Array.from({length:2},async()=>{
 while(next<jobs.length&&!halt){
  const {c,p}=jobs[next++],id=c.input.gameId+'-'+p.condition;calls++;active++;peak=Math.max(peak,active);
  const row:any={id,gameId:c.input.gameId,condition:p.condition,state:'started',bodySHA:p.bodySHA};rows.push(row);let native:any;
  try{
   const body=await fs.readFile(p.requestPath,'utf8');assert.equal(hash(body),p.bodySHA);
   const responseStart=performance.now();
   const reader=new TerraGameReader({key:async()=>key,profile:p.profile as any,fetch:async(_url,options)=>{
    assert.equal(hash(String(options?.body)),p.bodySHA);
    const response=await fetch('https://api.openai.com/v1/responses',options);row.http=response.status;row.headersMs=performance.now()-responseStart;
    const text=await response.text();row.providerMs=performance.now()-responseStart;
    await fs.writeFile(`${priv}/${id}.native.txt`,text,{flag:'wx',mode:0o600});
    if(!response.ok){halt=true;return new Response(text,{status:response.status});}
    native=JSON.parse(text);row.usage=native.usage;row.model=native.model;row.status=native.status;
    const u=native.usage;row.estimatedUSD=u?(u.input_tokens+u.output_tokens*5)/1e6:null;
    if((u?.input_tokens??0)>100000||rows.reduce((n,r)=>n+(r.estimatedUSD??0),0)>2)halt=true;
    return new Response(text,{status:response.status,headers:{'content-type':'application/json'}});
   }});
   const result=await reader.read(c.request,c.definition,await fs.readFile(c.input.path),'image/jpeg');
   await fs.writeFile(`${priv}/${id}.decoded.json`,JSON.stringify(result),{flag:'wx',mode:0o600});
   const reference=JSON.parse(await fs.readFile(c.referencePath,'utf8'));assert.equal(hash(await fs.readFile(c.referencePath)),c.referenceSHA);
   row.score=score(result,reference,c);row.observations=result.raw.observations.length;
   row.physicalUnits=Object.fromEntries(['single','group','unknown'].map(u=>[u,Object.values(result.hostedWire.physicalUnits??{}).filter(v=>v===u).length]));
   row.state='completed';row.readerMs=result.timings.readerMs;row.decodedSHA=hash(JSON.stringify(result));
  }catch(e:any){row.state=native?'decode-failed':'request-failed';row.error=String(e?.message??e).replaceAll(key,'[REDACTED]');halt=true;}
  finally{active--;await fs.writeFile(out+'/execution.json',JSON.stringify({at:new Date().toISOString(),calls,peak,retries:0,halt,wallMs:performance.now()-start,rows},null,2)+'\n');console.log(JSON.stringify({id,state:row.state,http:row.http,seconds:row.providerMs/1000,observations:row.observations,detected:row.score?.detected,numeric:row.score?.numeric,estimatedUSD:row.estimatedUSD}));}
 }
}));
console.log(JSON.stringify({finished:true,calls,peak,halt,completed:rows.filter(r=>r.state==='completed').length}));
