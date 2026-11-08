import type {GeminiGameReader} from './geminiGameReader';
import {GeminiGameReader as Gemini} from './geminiGameReader';
import {LunaGameReader,TERRA_HIGH_IDENTITY} from './terraGameReader';
import type {HostedReaderIdentity} from '../../shared/lightweightRecognition';
/** Structural interface lets each real provider retain its own wire and pinned profile. */
export interface HostedObservationReader {
 identity:HostedReaderIdentity;
 status():Promise<{kind:HostedReaderIdentity['kind'];available:boolean;cloudSupported:true;identity:HostedReaderIdentity|null;reason?:string}>;
 read:GeminiGameReader['read'];
 readCatanScene:GeminiGameReader['readCatanScene'];
}
export function hostedReaderFor(pinned:HostedReaderIdentity|HostedReaderIdentity['kind']):HostedObservationReader{
 const kind=typeof pinned==='string'?pinned:pinned.kind;
 if(kind==='luna-game-observation-v1')return new LunaGameReader(typeof pinned==='object'&&pinned.kind==='luna-game-observation-v1'?{profile:pinned.adapterVersion,automaticRetries:pinned.automaticRetries}:{});
 if(kind==='terra-high-game-observation-v1')return new LunaGameReader({identity:TERRA_HIGH_IDENTITY,...(typeof pinned==='object'&&pinned.kind==='terra-high-game-observation-v1'?{profile:pinned.adapterVersion,automaticRetries:pinned.automaticRetries}:{})});
 if(kind==='terra-game-observation-v1')throw Error('이전 Terra 판독 profile은 새 요청에 사용할 수 없습니다. Luna high를 다시 선택하세요. 자동 대체하지 않습니다.');
 if(kind==='gemini-game-observation-v1')return new Gemini();
 throw Error('지원하지 않는 hosted 판독기입니다. 자동 대체하지 않습니다.');
}
