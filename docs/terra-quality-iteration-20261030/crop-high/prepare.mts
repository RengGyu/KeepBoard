// Freeze three D=crop-high requests. Reuse B whole-high without any model invocation.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='docs/terra-quality-iteration-20261030',out=root+'/crop-high',sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const oldBytes=await fs.readFile(root+'/preflight-high.json'),old=JSON.parse(oldBytes.toString()),executionBytes=await fs.readFile(root+'/execution-high.json'),execution=JSON.parse(executionBytes.toString());
assert.equal(execution.calls,9);assert.equal(execution.retries,0);assert.equal(execution.preflightSHA,sha(oldBytes));
for(const f of old.sourceFiles)assert.equal(sha(await fs.readFile(f.path)),f.sha256,'Pinned source drift: '+f.path);
const privateDir=await fs.mkdtemp('/private/tmp/kb-terra-crop-high-');await fs.chmod(privateDir,0o700);
const calls:any[]=[],reuseWhole:any[]=[];
for(const gameId of ['carcassonne','sagrada','ticket-to-ride']){
 const b=old.calls.find((c:any)=>c.gameId===gameId&&c.condition==='B'),c=old.calls.find((c:any)=>c.gameId===gameId&&c.condition==='C');assert(b&&c);
 const row=execution.rows.find((r:any)=>r.id===b.id);assert.equal(row.state,'completed');assert.equal(row.httpStatus,200);assert.equal(row.model,'gpt-6.1-terra');assert.equal(row.returnedEffort,'high');
 const bRequest=JSON.parse(await fs.readFile(b.requestPath,'utf8')),cRequest=JSON.parse(await fs.readFile(c.requestPath,'utf8'));assert.equal(sha(JSON.stringify(bRequest)),b.bodySHA);assert.equal(sha(JSON.stringify(cRequest)),c.bodySHA);
 const nativePath=old.privateDir+'/'+b.id+'.native.json',resultPath=old.privateDir+'/'+b.id+'.result.json';assert.equal(sha(await fs.readFile(nativePath)),row.nativeSHA);assert.equal(sha(await fs.readFile(resultPath)),row.resultSHA);
 const native=JSON.parse(await fs.readFile(nativePath,'utf8'));assert.equal(native.model,'gpt-6.1-terra');assert.equal(native.reasoning.effort,'high');
 for(const v of [b,c])for(const [pathKey,hashKey]of [['inputPath','inputSHA'],['taskPath','taskSHA'],['referencePath','referenceSHA']])assert.equal(sha(await fs.readFile(v[pathKey])),v[hashKey]);
 const body=structuredClone(cRequest);body.reasoning.effort='high';const test=structuredClone(body);test.reasoning.effort='low';assert.deepEqual(test,cRequest);
 const wholeWithoutImage=structuredClone(bRequest);wholeWithoutImage.input[0].content[1]=body.input[0].content[1];assert.deepEqual(wholeWithoutImage,body,'B/D differ only in image');
 const id=gameId+'-D',requestPath=privateDir+'/'+id+'.request.json';await fs.writeFile(requestPath,JSON.stringify(body),{mode:0o600,flag:'wx'});
 calls.push({...c,id,condition:'D',effort:'high',requestPath,bodySHA:sha(JSON.stringify(body)),resultPath:privateDir+'/'+id+'.result.json',comparedToCBodySHA:c.bodySHA,onlyChangedField:'reasoning.effort'});
 reuseWhole.push({...b,nativePath,resultPath,executionRow:row,reused:true,newProviderCall:false});
}
const extraPaths=['server/observationFusion.ts','server/scanObservation.ts','shared/scanObservation.ts'],sourceFiles=[...old.sourceFiles];for(const path of extraPaths)if(!sourceFiles.some((f:any)=>f.path===path))sourceFiles.push({path,sha256:sha(await fs.readFile(path))});
const pre={version:'terra-crop-high-v1',frozenAt:new Date().toISOString(),authorization:'supervisor task2a7ffaec-2083-4b06-845e-c8e792c07823, user requested whole-high plus crop-high',privateDir,selectionPath:root+'/selection.json',evaluationPreflightPath:root+'/evaluation-preflight.json',selectionSHA:old.selectionSHA,referencePreflightSHA:old.referencePreflightSHA,previousPreflightPath:root+'/preflight-high.json',previousPreflightSHA:sha(oldBytes),previousExecutionPath:root+'/execution-high.json',previousExecutionSHA:sha(executionBytes),calls,reuseWhole,model:old.model,maxCalls:3,peak:2,retries:0,maxCalculatedUSD:1,worstPlannedUSD:calls.reduce((n,c)=>n+c.worstPlannedUSD,0),inputEstimateCaveat:old.inputEstimateCaveat,sourceFiles,sameCDExceptEffort:true,sameBDExceptImage:true,wholeHighNewCalls:0,apiCalls:0};
assert(pre.worstPlannedUSD<=1);await fs.writeFile(out+'/preflight.json',JSON.stringify(pre,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({calls:calls.length,reusedWhole:reuseWhole.length,worstPlannedUSD:pre.worstPlannedUSD,preflightSHA:sha(await fs.readFile(out+'/preflight.json')),newProviderCalls:0}));
