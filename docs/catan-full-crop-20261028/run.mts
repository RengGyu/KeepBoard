import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extractGeminiKey } from '../../server/ai/geminiGameReader.ts';
const dir='/private/tmp/kb-catan-full-crop-20261028';
const sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(await fs.readFile(dir+'/plan.json','utf8'));
const save=(n:string,d:unknown)=>fs.writeFile(dir+'/'+n,JSON.stringify(d,null,2)+'\n',{mode:0o600});
const requests=await Promise.all(plan.crops.map(async(c:any)=>{const body=await fs.readFile(c.requestPath);if(sha(body)!==c.requestSHA)throw new Error('Request SHA mismatch');return {c,body};}));
const source=await fs.readFile(plan.source.path);if(sha(source)!==plan.source.sha256)throw new Error('Source SHA mismatch');
const key=extractGeminiKey(await fs.readFile('/Users/jeonggyuju/.paseo/uploads/upload_6369b418-2c20-46c9-8a11-e5605bd97391/KeepBoader_Gemini_API','utf8'));
if(!key)throw new Error('Credential unavailable');
await fs.writeFile(dir+'/single-attempt.claim',JSON.stringify({createdAt:new Date().toISOString(),maxCalls:4,retries:0,planSHA:sha(await fs.readFile(dir+'/plan.json'))}),{flag:'wx',mode:0o600});
const startedAt=new Date().toISOString(),start=performance.now();
const rows=await Promise.all(requests.map(async({c,body}:any)=>{
 const t=performance.now();await save(c.id+'.dispatch.json',{id:c.id,startedAt:new Date().toISOString(),requestSHA:sha(body),attempt:1});
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body,redirect:'error',signal:AbortSignal.timeout(180000)});
  const raw=await response.text();await fs.writeFile(dir+'/'+c.id+'.native.json',raw,{mode:0o600});
  let native:any=null,parsed:any=null;try{native=JSON.parse(raw);const text=native.candidates?.[0]?.content?.parts?.filter((p:any)=>p.text&&!p.thought).map((p:any)=>p.text).join('');parsed=JSON.parse(text);}catch{}
  const row={id:c.id,http:response.status,elapsedMs:Math.round(performance.now()-t),rawSHA:sha(raw),requestSHA:sha(body),reportedModel:native?.modelVersion,responseId:native?.responseId,finishReason:native?.candidates?.[0]?.finishReason,usage:native?.usageMetadata??null,parsed,errorStatus:native?.error?.status??null,retryAfter:response.headers.get('retry-after')};
  await save(c.id+'.result.json',row);console.log(JSON.stringify({id:row.id,http:row.http,elapsedMs:row.elapsedMs,usage:row.usage,items:parsed?.items?.length??null}));return row;
 }catch(e){const row={id:c.id,elapsedMs:Math.round(performance.now()-t),requestSHA:sha(body),error:e instanceof Error?e.name:'unknown',http:null};await save(c.id+'.result.json',row);return row;}
}));
await save('result.json',{startedAt,endedAt:new Date().toISOString(),parallelWallMs:Math.round(performance.now()-start),calls:4,retries:0,rows});console.log('DONE');
