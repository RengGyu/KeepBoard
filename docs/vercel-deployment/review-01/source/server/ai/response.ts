import type { AISettings } from '../../shared/types.ts';

type Provider = AISettings['provider'];
type Diagnostics = Record<string, string | number | string[] | null>;
const enumValue = (value: unknown, allowed: string[]) => typeof value === 'string' && allowed.includes(value) ? value : value == null ? null : 'other';
const object = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const finishReasons = ['STOP','MAX_TOKENS','SAFETY','RECITATION','LANGUAGE','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL','IMAGE_SAFETY','MALFORMED_RESPONSE','CONTINUATION'];

// Metadata only: never retain response text, refusal text, thought content, IDs or arbitrary provider messages.
export function responseDiagnostics(payload: unknown, provider: Provider): Diagnostics {
  const p = object(payload) ? payload : {};
  if (provider === 'gemini') {
    const candidates = Array.isArray(p.candidates) ? p.candidates : [];
    const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
    return { provider, candidateCount:candidates.length, finishReason:enumValue(candidates[0]?.finishReason,finishReasons), blockReason:enumValue(p.promptFeedback?.blockReason,['SAFETY','OTHER','BLOCKLIST','PROHIBITED_CONTENT','IMAGE_SAFETY']), partCount:parts.length,
      partKinds:[...new Set<string>(parts.map((part: any)=>!object(part)?'invalid':part.thought===true?'thought':typeof part.text==='string'?'text':part.inlineData?'inlineData':part.functionCall?'functionCall':'other'))],
      thoughtPartCount:parts.filter((part: any)=>part?.thought===true).length,
      textLength:parts.reduce((n:number,part:any)=>n+(part?.thought!==true&&typeof part?.text==='string'?part.text.length:0),0) };
  }
  const output = Array.isArray(p.output) ? p.output : [];
  const parts = output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[]);
  return { provider, status:enumValue(p.status,['completed','incomplete','failed','in_progress','queued','cancelled']), incompleteReason:enumValue(p.incomplete_details?.reason,['max_output_tokens','content_filter']), outputCount:output.length,
    partKinds:[...new Set<string>(parts.map((part:any)=>enumValue(part?.type,['output_text','refusal'])??'other'))],
    textLength:typeof p.output_text==='string'&&p.output_text?p.output_text.length:parts.reduce((n:number,part:any)=>n+(part?.type==='output_text'&&typeof part.text==='string'?part.text.length:0),0) };
}

export class AIResponseError extends Error {
  constructor(readonly code: 'invalid-json' | 'no-text' | 'response-shape', readonly diagnostics: Diagnostics) {
    super(code==='invalid-json'?'모델 응답을 읽지 못했습니다. 원본을 유지했습니다. 다시 분석하거나 직접 입력해 주세요.':code==='no-text'?'모델이 판독 결과를 반환하지 않았습니다. 다른 사진으로 다시 시도해 주세요.':'모델 응답 구조를 읽지 못했습니다. 원본은 유지했습니다.');
    this.name = 'AIResponseError';
  }
}

export function parseModelJSON(text: string, diagnostics: Diagnostics = {}): unknown {
  if (typeof text !== 'string') throw new AIResponseError('response-shape',{...diagnostics,stage:'model-text'});
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(cleaned); }
  catch (error) { throw new AIResponseError('invalid-json',{...diagnostics,stage:'model-json',textLength:text.length,parserErrorClass:error instanceof SyntaxError?'SyntaxError':'other'}); }
}

export function decodeProviderJSON(payload: unknown, provider: Provider, httpStatus?: number): unknown {
  const diagnostics = {...responseDiagnostics(payload,provider),...(httpStatus===undefined?{}:{httpStatus})};
  const malformed = () => new AIResponseError('response-shape',{...diagnostics,stage:'response-text'});
  if (!object(payload)) throw malformed();
  let text: string;
  if (provider==='gemini') {
    if (payload.candidates!=null&&!Array.isArray(payload.candidates)) throw malformed();
    const parts=payload.candidates?.[0]?.content?.parts??[];
    if (!Array.isArray(parts)||parts.some(part=>!object(part)||(part.text!=null&&typeof part.text!=='string'))) throw malformed();
    // Gemini Part.thought is not final answer content. Never concatenate it into JSON.
    text=parts.filter(part=>part.thought!==true&&typeof part.text==='string').map(part=>part.text).join('');
  } else {
    if (payload.output_text!=null&&typeof payload.output_text!=='string') throw malformed();
    if (payload.output_text) text=payload.output_text;
    else {
      const output=payload.output??[];
      if (!Array.isArray(output)||output.some(item=>!object(item)||(item.content!=null&&!Array.isArray(item.content)))) throw malformed();
      const parts=output.flatMap(item=>item.content??[]);
      if (parts.some(part=>!object(part)||(part.type==='output_text'&&typeof part.text!=='string'))) throw malformed();
      text=parts.filter(part=>part.type==='output_text').map(part=>part.text).join('');
    }
  }
  if (!text) throw new AIResponseError('no-text',{...diagnostics,stage:'response-text'});
  return parseModelJSON(text,diagnostics);
}
