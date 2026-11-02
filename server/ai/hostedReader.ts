import type {GeminiGameReader} from './geminiGameReader';
import {GeminiGameReader as Gemini} from './geminiGameReader';
import {TerraGameReader} from './terraGameReader';
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
 if(kind==='terra-game-observation-v1')return new TerraGameReader(typeof pinned==='object'&&pinned.kind==='terra-game-observation-v1'?{profile:pinned.adapterVersion}:{});
 if(kind==='gemini-game-observation-v1')return new Gemini();
 throw Error('지원하지 않는 hosted 판독기입니다. 자동 대체하지 않습니다.');
}
