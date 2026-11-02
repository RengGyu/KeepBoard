import fs from 'node:fs/promises';import path from 'node:path';import {suppliedOpenAIKey} from './auth.mts';
const root=path.dirname(new URL(import.meta.url).pathname),model='gpt-6.1-terra';
const evidence:any={model,endpoint:'GET https://api.openai.com/v1/models/gpt-6.1-terra',credential:'provided-upload',inferenceCalls:0,retries:0,startedAt:new Date().toISOString()};
try{
 const key=await suppliedOpenAIKey();
 const response=await fetch('https://api.openai.com/v1/models/gpt-6.1-terra',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(30000),redirect:'error'});
 evidence.http=response.status;
 if(response.ok){const body=await response.json() as any;evidence.returnedModel=body.id===model?body.id:null;evidence.exactModelAccessible=body.id===model;}
 else evidence.exactModelAccessible=false; // Do not print or retain HTTP error body.
}catch(e){evidence.exactModelAccessible=false;evidence.errorName=(e as Error).name;evidence.http=null;}
evidence.finishedAt=new Date().toISOString();
await fs.writeFile(path.join(root,'access.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
