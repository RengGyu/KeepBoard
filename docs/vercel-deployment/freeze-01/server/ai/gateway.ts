import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {hostedJSON} from '../../gateway/server.mjs';
import type { AISettings, AIStatus } from '../../shared/types.ts';

export function localGatewayURL(value: string): string {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(u.hostname) || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw new Error('AI 게이트웨이는 로컬 loopback 주소만 사용합니다.');
  return u.origin;
}
export async function gatewaySettings(directory: string): Promise<AISettings | null> {
  if(process.env.KEEPBOARD_CLOUD_AI==='1')return {provider:'gateway',model:'board-vision'};
  let route: any;
  if (process.env.KEEPBOARD_AI_GATEWAY_URL) route = { mode: 'gateway', url: process.env.KEEPBOARD_AI_GATEWAY_URL, alias: process.env.KEEPBOARD_AI_ALIAS || 'board-vision' };
  else {
    try { route = JSON.parse(await readFile(path.join(directory,'ai-routing.json'),'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw new Error('AI 라우팅 설정을 읽지 못했습니다.'); }
  }
  if (route?.mode === 'direct' && Object.keys(route).length === 1) return null;
  if (route?.mode !== 'gateway' || typeof route.url !== 'string' || typeof route.alias !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(route.alias) || Object.keys(route).some(k=>!['mode','url','alias'].includes(k))) throw new Error('AI 라우팅 설정을 확인하세요. 자동 대체 연결은 하지 않았습니다.');
  return { provider:'gateway',model:route.alias,baseUrl:localGatewayURL(route.url) };
}
export async function gatewayStatus(config: AISettings): Promise<AIStatus> {
  if(process.env.KEEPBOARD_CLOUD_AI==='1')return {configured:!!process.env.DEEPSEEK_API_KEY,provider:'gateway',alias:'board-vision',model:'deepseek-flash',upstreamProvider:'deepseek',reasoningEffort:'high'};
  const fallback: AIStatus = { configured:false,provider:'gateway',model:config.model,alias:config.model,baseUrl:config.baseUrl };
  try {
    const response=await fetch(`${localGatewayURL(config.baseUrl!)}/v1/aliases`,{signal:AbortSignal.timeout(2000)});
    const data=await response.json();
    const target=data.aliases?.find((a:any)=>a.alias===config.model);
    if (!response.ok || !target || !['deepseek','openai','gemini'].includes(target.provider) || typeof target.model!=='string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(target.model)) return fallback;
    return {...fallback,configured:true,model:target.model,upstreamProvider:target.provider,...(['none','low','high','max'].includes(target.effort)?{reasoningEffort:target.effort}:{})};
  } catch { return fallback; }
}
export async function requestGatewayJSON(prompt: string, images: {mimeType:string;data:string}[], config: AISettings): Promise<unknown> {
  if(process.env.KEEPBOARD_CLOUD_AI==='1')return hostedJSON(prompt,images);
  let response: Response;
  try { response=await fetch(`${localGatewayURL(config.baseUrl!)}/v1/json`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alias:config.model,prompt,images}),signal:AbortSignal.timeout(245000),redirect:'error'}); }
  catch { throw new Error('로컬 AI 게이트웨이에 연결하지 못했습니다. 원본은 유지되며 다른 모델로 자동 전환하지 않았습니다.'); }
  let payload: any;
  try { payload=await response.json(); } catch { throw new Error('AI 게이트웨이 응답 형식을 확인하세요. 원본은 유지했습니다.'); }
  if(!response.ok) {
    const known=['authentication','quota','rate-limit','timeout','connection','invalid-json','incomplete','refusal','no-final-output','response-shape','unknown-alias','config','credential-unavailable','vision-not-enabled','upstream-http'];
    const code=known.includes(payload?.error?.code)?payload.error.code:'gateway-error';
    throw new Error(`AI 게이트웨이 오류 (${response.status}, ${code}). 원본은 유지되며 자동 재시도·대체 연결은 하지 않았습니다.`);
  }
  if(!Object.hasOwn(payload,'data'))throw new Error('AI 게이트웨이에 최종 JSON 값이 없습니다.');
  return payload.data;
}
