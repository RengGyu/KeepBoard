import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import path from 'node:path';
// Keyless preparation only. No fetch, credential access, model invocation, or mutation of prior evidence.
const sha=b=>createHash('sha256').update(b).digest('hex'),dir=path.dirname(fileURLToPath(import.meta.url));
const prior=JSON.parse(await fs.readFile(path.join(dir,'../timing-preflight.json'),'utf8'));
const missing=[];
for(const item of [{path:prior.source.path,sha256:prior.source.sha256},...prior.requests]){
 try{if(sha(await fs.readFile(item.path))!==item.sha256)throw Error('Frozen bytes changed: '+item.path);}
 catch(error){if(error.code!=='ENOENT')throw error;missing.push(item.path);}
}
const plan={version:'fastest-scan-timing-preparation-v1',status:'PREPARED_NO_API_CALLS',source:prior.source,model:prior.model,promptSHA:prior.promptSHA,generationConfigSHA:prior.generationConfigSHA,requests:prior.requests,conditions:[{id:'sequential',concurrency:1},{id:'immediate-hosted',concurrency:6,effectiveConcurrency:prior.requests.length}],maximumCalls:8,retries:0,providerCalls:0,executionRequiresSeparateSupervisorAuthorization:true,limitations:['Same existing four crop request bytes, not a new dataset.','Preparation measures no provider or product end-to-end time.','The latest five-photo cap2/cap5 artifacts are a separate frozen experiment, not replaced by this plan.']};
if(missing.length){plan.status='BLOCKED_FROZEN_INPUT_BYTES_MISSING';plan.missingPaths=missing;}
await fs.writeFile(path.join(dir,'timing-preparation.json'),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({status:plan.status,requests:plan.requests.length,missingFiles:missing.length,providerCalls:0,sha256:sha(await fs.readFile(path.join(dir,'timing-preparation.json')))}));
if(missing.length)process.exitCode=2;
