// Exercises the actual product transport body; fetch is intercepted before any network send.
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {LocalReader} from '../../server/ai/localReader.ts';
const [preparedFile,configFile,reportFile]=process.argv.slice(2);if(!reportFile)throw Error('prepared config report required');
const prepared=JSON.parse(await readFile(preparedFile,'utf8')),config=JSON.parse(await readFile(configFile,'utf8')),receiptDirectory=await mkdtemp(path.join(os.tmpdir(),'kb-body-verification-')),reader=new LocalReader({...config,receiptDirectory}),originalFetch=globalThis.fetch,rows=[];
try{for(const row of prepared.plans){const plan=JSON.parse(await readFile(row.plan.path,'utf8')),bytes=await readFile(row.input.path);let captured:string|undefined;
 globalThis.fetch=(async(url,init)=>{if(String(url)!==config.endpoint+'/v1/chat/completions'||typeof init?.body!=='string')throw Error('Unexpected attempted transport');captured=init.body;return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'{"items":[]}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});}) as typeof fetch;
 await reader.read(plan.request,plan.definition,bytes,row.mode==='original'?'image/jpeg':'image/png',[],plan.taskProfile);
 if(captured===undefined)throw Error('Body not captured');const actualSHA=createHash('sha256').update(captured).digest('hex');if(actualSHA!==row.readerRequestBodySHA256)throw Error('Prepared/product reader body drift');rows.push({id:row.id,actualBodySHA256:actualSHA,preparedBodySHA256:row.readerRequestBodySHA256,match:true});
}}finally{globalThis.fetch=originalFetch;}
const result={status:'PASS',actualProductTransportBody:rows,networkSends:0,modelRequests:0,method:'Global fetch intercepted; real LocalReader.read profile check/claim/body building executed with fixed private inputs; no inference endpoint contacted.'};await writeFile(reportFile,JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
