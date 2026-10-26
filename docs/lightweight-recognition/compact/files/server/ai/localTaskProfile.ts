import {createHash} from 'node:crypto';
import type {ReaderIdentity,LocalTaskProfile} from '../../shared/lightweightRecognition';
import {QWEN_NUMBER_PROMPT,QWEN_NUMBER_SCHEMA,QWEN_NUMBER_WIRE} from './qwenNumberGrounding';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const pins={model:'Qwen/Qwen3-VL-4B-Instruct-GGUF',modelRevision:'1cd86afb9a95c410a6038ab3b40d8b578c892266',weightSHA:'66358cb18bb6b3b1b6675aa412c7a88ef01d228f481184d13668e5201c730a0a',projectorSHA:'256f3a43bd4205ffef48d6b92715e1e70b5b0e9aef06522584967513a9985331',runtimeRevision:'620d2225cc436ab0b001e3200e590e3b286ef9ab',contextTokens:8192};
/** The receipt is server-owned; verify its live command, not the health/model alias alone. */
export function verifiedNumeralProfile(config:{identity:ReaderIdentity;modelAlias:string},raw:unknown,liveCommand:string):LocalTaskProfile {
 const r=raw as {pid:number;args:string[];imageMinimumTokensOverride:number};
 if(!r||!Number.isSafeInteger(r.pid)||r.pid<1||!Array.isArray(r.args)||!r.args.length||r.args.some(a=>typeof a!=='string')||r.args.join(' ')!==liveCommand.trim()||r.imageMinimumTokensOverride!==1024||Object.entries(pins).some(([k,v])=>(config.identity as any)[k]!==v))throw Error('숫자 리더의 실제 실행 설정과 모델 pin을 확인할 수 없습니다.');
 const flag=(name:string,value:string)=>r.args.filter(a=>a===name).length===1&&r.args[r.args.indexOf(name)+1]===value;
 if(!flag('--image-min-tokens','1024')||!flag('--ctx-size','8192')||!flag('--parallel','1')||!flag('--alias',config.modelAlias))throw Error('숫자 리더의 image-min/context/parallel 실행 인자가 다릅니다.');
 return {id:'catan-numerals-v1',wire:QWEN_NUMBER_WIRE,promptSHA256:sha(QWEN_NUMBER_PROMPT),schemaSHA256:sha(JSON.stringify(QWEN_NUMBER_SCHEMA)),runtimeSettingsSHA256:sha(JSON.stringify({pid:r.pid,args:r.args,pins})),contextTokens:8192,maxOutputTokens:1024,imageMinTokens:1024,temperature:0,cachePrompt:false,stream:false,automaticRetries:0,parallelRequests:1};
}
