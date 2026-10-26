import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const endpoints = { deepseek:'https://api.deepseek.com/responses', openai:'https://api.openai.com/v1/responses', gemini:'https://generativelanguage.googleapis.com/v1beta' };
const name = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export class GatewayError extends Error {
  constructor(code,status=502,diagnostics={}) { super(code); this.code=code; this.status=status; this.diagnostics=diagnostics; }
}
const requireValue = condition => { if(!condition) throw new GatewayError('config',503); };
export function validateConfig(config) {
  requireValue(object(config)&&config.version===1&&Number.isInteger(config.port)&&config.port>=1024&&config.port<=65535&&object(config.providers)&&object(config.aliases));
  requireValue(Object.keys(config).every(k=>['version','port','providers','aliases'].includes(k)));
  for(const [id,provider] of Object.entries(config.providers)) {
    requireValue(name.test(id)&&object(provider)&&Object.hasOwn(endpoints,provider.kind)&&Object.keys(provider).every(k=>['kind','apiKeyEnv','apiKeyFile'].includes(k)));
    requireValue(Boolean(provider.apiKeyEnv)!==Boolean(provider.apiKeyFile));
    if(provider.apiKeyEnv)requireValue(typeof provider.apiKeyEnv==='string'&&/^[A-Z][A-Z0-9_]*$/.test(provider.apiKeyEnv));
    if(provider.apiKeyFile)requireValue(typeof provider.apiKeyFile==='string'&&provider.apiKeyFile.length>0);
  }
  requireValue(Object.keys(config.aliases).length>0);
  for(const [id,a] of Object.entries(config.aliases)) {
    requireValue(name.test(id)&&object(a)&&Object.hasOwn(config.providers,a.provider)&&typeof a.model==='string'&&name.test(a.model)&&typeof a.vision==='boolean'&&Number.isInteger(a.timeoutMs)&&a.timeoutMs>=100&&a.timeoutMs<=240000);
    requireValue(Object.keys(a).every(k=>['provider','model','effort','vision','timeoutMs','maxOutputTokens'].includes(k)));
    if(a.effort!==undefined) requireValue(['none','low','high','max'].includes(a.effort)&&config.providers[a.provider].kind!=='gemini');
    if(a.maxOutputTokens!==undefined)requireValue(Number.isInteger(a.maxOutputTokens)&&a.maxOutputTokens>=128&&a.maxOutputTokens<=131072);
    if(config.providers[a.provider].kind==='deepseek'&&a.vision)requireValue(a.model==='deepseek-flash');
  }
  return config;
}
const loadConfig = async file => { try { return validateConfig(JSON.parse(await readFile(file,'utf8'))); } catch(error) { if(error instanceof GatewayError)throw error; throw new GatewayError('config',503); } };
const targetInfo = (alias,a,p) => ({alias,provider:p.kind,model:a.model,...(a.effort?{effort:a.effort}:{}),vision:a.vision});
function validateInput(input) {
  if(!object(input)||Object.keys(input).some(k=>!['alias','prompt','images'].includes(k))||typeof input.alias!=='string'||!name.test(input.alias)||typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>500000||!Array.isArray(input.images)||input.images.length>6)throw new GatewayError('invalid-request',400);
  for(const image of input.images)if(!object(image)||Object.keys(image).some(k=>!['mimeType','data'].includes(k))||!['image/jpeg','image/png','image/webp','image/gif'].includes(image.mimeType)||typeof image.data!=='string'||!image.data.length||image.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(image.data))throw new GatewayError('invalid-request',400);
}
function usageNumbers(payload) {
  const usage=payload?.usage??{},g=payload?.usageMetadata??{};
  const values={inputTokens:usage.input_tokens??g.promptTokenCount,outputTokens:usage.output_tokens??g.candidatesTokenCount,totalTokens:usage.total_tokens??g.totalTokenCount,reasoningTokens:usage.output_tokens_details?.reasoning_tokens??g.thoughtsTokenCount,cachedTokens:usage.input_tokens_details?.cached_tokens};
  return Object.fromEntries(Object.entries(values).filter(([,v])=>Number.isFinite(v)&&v>=0&&v<=1e10));
}
export function finalJSON(payload,kind) {
  if(!object(payload))throw new GatewayError('response-shape');
  let text='';
  if(kind==='gemini') {
    const candidate=payload.candidates?.[0],finish=candidate?.finishReason;
    if(finish&&finish!=='STOP')throw new GatewayError(finish==='MAX_TOKENS'?'incomplete':'no-final-output');
    const parts=candidate?.content?.parts;
    if(!Array.isArray(parts))throw new GatewayError('no-final-output');
    text=parts.filter(p=>object(p)&&p.thought!==true&&typeof p.text==='string').map(p=>p.text).join('');
  } else {
    if(payload.status&&payload.status!=='completed')throw new GatewayError(payload.status==='incomplete'?'incomplete':'no-final-output');
    if(typeof payload.output_text==='string'&&payload.output_text)text=payload.output_text;
    else {
      if(!Array.isArray(payload.output))throw new GatewayError('no-final-output');
      const messages=payload.output.filter(item=>object(item)&&item.type==='message'&&(!item.role||item.role==='assistant'));
      const parts=messages.flatMap(item=>Array.isArray(item.content)?item.content:[]);
      if(parts.some(p=>p?.type==='refusal'))throw new GatewayError('refusal');
      text=parts.filter(p=>p?.type==='output_text'&&typeof p.text==='string').map(p=>p.text).join('');
    }
  }
  if(!text)throw new GatewayError('no-final-output');
  try { return { data:JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')),textLength:text.length }; }
  catch { throw new GatewayError('invalid-json',502,{textLength:text.length}); }
}
function requestBody(prompt,images,a,p) {
  if(p.kind==='gemini')return {contents:[{role:'user',parts:[{text:prompt},...images.map(i=>({inline_data:{mime_type:i.mimeType,data:i.data}}))]}],generationConfig:{responseMimeType:'application/json',...(a.maxOutputTokens?{maxOutputTokens:a.maxOutputTokens}:{})}};
  return {model:a.model,input:[{role:'user',content:[{type:'input_text',text:prompt},...images.map(i=>({type:'input_image',image_url:`data:${i.mimeType};base64,${i.data}`,detail:'high'}))]}],text:{format:{type:'json_object'}},...(a.effort?{reasoning:{effort:a.effort}}:{}),...(a.maxOutputTokens?{max_output_tokens:a.maxOutputTokens}:{}),stream:false,store:false};
}
async function upstreamRequest(input,a,p,configFile,endpointOverride,signal) {
  let key;
  try { key=(p.apiKeyEnv?process.env[p.apiKeyEnv]:await readFile(path.resolve(path.dirname(configFile),p.apiKeyFile),'utf8'))?.trim(); }
  catch { throw new GatewayError('credential-unavailable',503); }
  if(!key||/[\r\n]/.test(key))throw new GatewayError('credential-unavailable',503);
  const endpoint=p.kind==='gemini'?`${endpoints.gemini}/models/${encodeURIComponent(a.model)}:generateContent`:endpoints[p.kind];
  const url=endpointOverride?endpointOverride(p.kind,a.model):endpoint;
  // Test injection is code-only and restricted to loopback; HTTP clients cannot choose a destination.
  if(endpointOverride) { const u=new URL(url); if(u.protocol!=='http:'||!['127.0.0.1','[::1]','localhost'].includes(u.hostname))throw new GatewayError('config',503); }
  let response;
  const started=performance.now();
  try { response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(p.kind==='gemini'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`})},body:JSON.stringify(requestBody(input.prompt,input.images,a,p)),signal,redirect:'error'}); }
  catch { throw new GatewayError(signal.aborted?'timeout':'connection',signal.aborted?504:502,{upstreamMs:Math.round(performance.now()-started)}); }
  let payload;
  try { payload=await response.json(); }
  catch { throw new GatewayError(response.ok?'response-shape':'upstream-http',502,{upstreamStatus:response.status,upstreamMs:Math.round(performance.now()-started)}); }
  const diagnostics={upstreamStatus:response.status,upstreamMs:Math.round(performance.now()-started),...usageNumbers(payload)};
  if(!response.ok)throw new GatewayError(response.status===401||response.status===403?'authentication':response.status===402?'quota':response.status===429?'rate-limit':'upstream-http',response.status>=400&&response.status<500?response.status:502,diagnostics);
  try {
    const parsed=finalJSON(payload,p.kind);
    return {...parsed,diagnostics:{...diagnostics,textLength:parsed.textLength,...(payload.model===a.model||payload.model==='deepseek-v4.1-flash-1017'?{reportedModel:payload.model}:{}),...(['none','low','high','max'].includes(payload.reasoning?.effort)?{reportedEffort:payload.reasoning.effort}:{})}};
  } catch(error) { if(error instanceof GatewayError){error.diagnostics={...diagnostics,...error.diagnostics};}throw error; }
}
export function createGateway({configFile,onDiagnostic=()=>{},endpointOverride}={}) {
  if(!configFile)throw new Error('configFile is required');
  const server=http.createServer(async(req,res)=>{
    const started=performance.now();let metadata={};
    const send=(status,value)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
    try {
      const host=req.headers.host?.split(':')[0];
      if(req.headers.origin||!['127.0.0.1','localhost'].includes(host))throw new GatewayError('local-clients-only',403);
      const config=await loadConfig(configFile);
      if(req.method==='GET'&&(req.url==='/health'||req.url==='/v1/aliases')) {
        send(200,{ok:true,aliases:Object.entries(config.aliases).map(([id,a])=>targetInfo(id,a,config.providers[a.provider])),fallback:false});return;
      }
      if(req.method!=='POST'||req.url!=='/v1/json')throw new GatewayError('not-found',404);
      if(!req.headers['content-type']?.startsWith('application/json'))throw new GatewayError('invalid-request',415);
      const chunks=[];let bytes=0;
      for await(const chunk of req) { bytes+=chunk.length;if(bytes>80*1024*1024)throw new GatewayError('request-too-large',413);chunks.push(chunk); }
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new GatewayError('invalid-request',400);}
      validateInput(input);
      if(!Object.hasOwn(config.aliases,input.alias))throw new GatewayError('unknown-alias',400);
      const a=config.aliases[input.alias],p=config.providers[a.provider];
      if(input.images.length&&!a.vision)throw new GatewayError('vision-not-enabled',400);
      const target=targetInfo(input.alias,a,p);
      metadata={...target,images:input.images.length,imageBytes:input.images.reduce((n,i)=>n+Buffer.byteLength(i.data,'base64'),0),promptChars:input.prompt.length};
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),a.timeoutMs);
      const disconnected=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnected);
      try {
        const result=await upstreamRequest(input,a,p,configFile,endpointOverride,controller.signal);
        const diagnostics={...result.diagnostics,totalMs:Math.round(performance.now()-started)};
        send(200,{data:result.data,target,diagnostics});onDiagnostic({event:'complete',...metadata,...diagnostics});
      } finally {clearTimeout(timer);res.off('close',disconnected);}
    } catch(error) {
      const e=error instanceof GatewayError?error:new GatewayError('internal',500);
      const diagnostics={...e.diagnostics,totalMs:Math.round(performance.now()-started)};
      send(e.status,{error:{code:e.code},diagnostics});onDiagnostic({event:'error',code:e.code,status:e.status,...metadata,...diagnostics});
    }
  });
  server.requestTimeout=30000;server.headersTimeout=10000;server.timeout=250000;
  return server;
}
export async function startGateway(configFile=process.env.AI_GATEWAY_CONFIG||fileURLToPath(new URL('./.local/config.json',import.meta.url))) {
  const config=await loadConfig(configFile);
  const server=createGateway({configFile,onDiagnostic:entry=>console.log(JSON.stringify(entry))});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(config.port,'127.0.0.1',resolve);});
  console.log(JSON.stringify({event:'started',host:'127.0.0.1',port:config.port}));
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  startGateway().then(server=>{for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close();server.closeIdleConnections();});}).catch(()=>{console.error(JSON.stringify({event:'startup-error',code:'configuration-or-port'}));process.exitCode=1;});
}

// Hosted execution reuses the same request/normalization contract, without a loopback server.
export async function hostedJSON(prompt,images){
  const p={kind:'deepseek',apiKeyEnv:'DEEPSEEK_API_KEY'},a={provider:'deepseek',model:'deepseek-flash',effort:'high',vision:true,timeoutMs:180000};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),a.timeoutMs);
  try{return (await upstreamRequest({prompt,images},a,p,'',undefined,controller.signal)).data;}finally{clearTimeout(timer);}
}
