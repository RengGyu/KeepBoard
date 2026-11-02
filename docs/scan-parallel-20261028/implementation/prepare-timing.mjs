import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Preparation only: no credential access, network, or provider execution.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const root=path.dirname(fileURLToPath(import.meta.url));
const planPath='/private/tmp/kb-catan-full-crop-20261028/plan.json';
const expectedPlanSHA='fc7d22843799559361b939903a4f16454c298dbb2c466351ccee0d34a9fa2d74';
const planBytes=await fs.readFile(planPath);
if(sha(planBytes)!==expectedPlanSHA)throw Error('Frozen plan changed');
const plan=JSON.parse(planBytes);
const source=await fs.readFile(plan.source.path);
if(sha(source)!==plan.source.sha256)throw Error('Source changed');
if(plan.crops.length!==4)throw Error('Expected the existing four requests');
if(sha(plan.prompt)!==plan.promptSHA)throw Error('Prompt changed');
const requests=[];
for(const crop of plan.crops){
 const bytes=await fs.readFile(crop.requestPath);
 if(sha(bytes)!==crop.requestSHA)throw Error('Frozen request changed: '+crop.id);
 const body=JSON.parse(bytes),parts=body.contents?.[0]?.parts;
 const image=parts?.find(p=>p.inlineData)?.inlineData;
 const text=parts?.filter(p=>p.text).map(p=>p.text).join('');
 if(text!==plan.prompt)throw Error('Prompt bytes differ: '+crop.id);
 if(JSON.stringify(body.generationConfig)!==JSON.stringify(plan.generationConfig))throw Error('Generation config differs: '+crop.id);
 if(!image||sha(Buffer.from(image.data,'base64'))!==crop.cropSHA)throw Error('Image bytes differ: '+crop.id);
 requests.push({id:crop.id,path:crop.requestPath,sha256:crop.requestSHA,bytes:bytes.length,imageSHA:crop.cropSHA,width:crop.width,height:crop.height,sourceBoxPx:crop.sourceBoxPx});
}
const manifest={version:'scan-parallel-timing-preparation-v1',status:'PREPARED_NO_CALLS_DESIGN_PENDING',preparedAt:new Date().toISOString(),source:plan.source,sourcePlan:{path:planPath,sha256:expectedPlanSHA},model:plan.model,promptSHA:plan.promptSHA,generationConfigSHA:sha(JSON.stringify(plan.generationConfig)),requests,conditions:[{id:'sequential',concurrency:1,requestOrder:requests.map(r=>r.id)},{id:'parallel',concurrency:null,requestOrder:requests.map(r=>r.id),note:'Await supervisor/Astra design for exact bounded concurrency.'}],providerCalls:0,retries:0,futureMaximumCalls:8,limits:['Preparation does not authorize API execution.','Future conditions must send the exact same saved request bytes; no re-encoding or prompt/schema edits.','Mock scheduling latency is not real provider latency.','No token or accuracy comparison was measured by preparation.']};
await fs.writeFile(path.join(root,'timing-preflight.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:manifest.status,requests:requests.length,providerCalls:0,manifestSHA:sha(await fs.readFile(path.join(root,'timing-preflight.json')))}));
