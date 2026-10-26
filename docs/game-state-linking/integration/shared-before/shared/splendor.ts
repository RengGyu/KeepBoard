export const SPLENDOR_GEMS=['white','blue','green','red','black'] as const;
export type SplendorGem=typeof SPLENDOR_GEMS[number];
export type SplendorColor=SplendorGem|'gold';
export type SplendorKind='development'|'noble'|'token'|'deck'|null;
export type SplendorGemCounts=Record<SplendorGem,number|null>;
export interface SplendorObservation {schema:'splendor-v1';kind:SplendorKind;points:number|null;bonus:SplendorGem|null;cost:SplendorGemCounts|null;requirements:SplendorGemCounts|null;color:SplendorColor|null;level:1|2|3|null}
export function emptySplendorObservation(kind:SplendorKind=null):SplendorObservation{return {schema:'splendor-v1',kind,points:null,bonus:null,cost:null,requirements:null,color:null,level:null};}
export function unknownGemCounts():SplendorGemCounts{return {white:null,blue:null,green:null,red:null,black:null};}
const integer=(v:unknown)=>v===null||typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function counts(v:unknown):v is SplendorGemCounts|null{return v===null||!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===5&&SPLENDOR_GEMS.every(k=>Object.hasOwn(v,k)&&integer((v as any)[k]));}
export function validateSplendorObservation(value:unknown,componentId:string|null,_label?:string):SplendorObservation{
 const v=value as SplendorObservation;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='bonus,color,cost,kind,level,points,requirements,schema'||v.schema!=='splendor-v1'||![null,'development','noble','token','deck'].includes(v.kind)||!integer(v.points)||v.bonus!==null&&!SPLENDOR_GEMS.includes(v.bonus)||v.color!==null&&![...SPLENDOR_GEMS,'gold'].includes(v.color)||![null,1,2,3].includes(v.level)||!counts(v.cost)||!counts(v.requirements))throw new Error('스플렌더 점수·보석 정보를 확인하세요. 모르는 값은 비워 두세요.');
 const expected={development:'development',noble:'nobles',token:'chips',deck:'development'};
 if(v.kind!==null&&componentId!==expected[v.kind])throw new Error('스플렌더 구성물 종류와 판독 종류가 다릅니다.');
 if(v.kind!=='development'&&(v.bonus!==null||v.cost!==null)||!['development','noble'].includes(v.kind??'')&&v.points!==null||v.kind!=='noble'&&v.requirements!==null||!['token','deck'].includes(v.kind??'')&&v.color!==null||!['development','deck'].includes(v.kind??'')&&v.level!==null)throw new Error('비용·보너스·토큰색·귀족 조건을 구분해 주세요.');
 return structuredClone(v);
}
const colors:Record<SplendorColor,string>={white:'흰색|하양|다이아(?:몬드)?',blue:'파랑|파란(?:색)?|청색|사파이어',green:'초록|녹색|에메랄드',red:'빨강|빨간(?:색)?|적색|루비',black:'검정|검은(?:색)?|흑색|오닉스',gold:'금색|황금'};
const colorPattern=Object.values(colors).join('|');
function colorOf(s:string):SplendorColor|null{const found=(Object.keys(colors) as SplendorColor[]).filter(c=>new RegExp(`^(?:${colors[c]})$`).test(s));return found.length===1?found[0]:null;}
function one(values:number[]){if(values.some(v=>!Number.isSafeInteger(v)||v<0))return null;return values.length&&values.every(v=>v===values[0])?values[0]:null;}
function parseCounts(text:string):SplendorGemCounts|null{
 const out=unknownGemCounts(),seen=new Set<string>();let rest=text.trim().replace(/\s*판독\s*$/,'');
 const re=new RegExp(`(${colorPattern})\\s*[:：]?\\s*(\\d+)`,'g');let invalid=false;
 rest=rest.replace(re,(_all,c,n)=>{const gem=colorOf(c),number=Number(n);if(!gem||gem==='gold'||seen.has(gem)||!integer(number)){invalid=true;return '';}seen.add(gem);out[gem]=number;return '';});
 return !invalid&&seen.size>0&&!rest.replace(/[\s·,\/;+]+/g,'')?out:null;
}
/** Display-only fallback: never rewrite the original label or turn absent colours into zero. */
export function legacySplendorObservation(piece:{componentId:string|null;label:string}):SplendorObservation{
 const text=piece.label,kind:SplendorKind=piece.componentId==='nobles'?'noble':piece.componentId==='chips'?'token':piece.componentId==='development'?/더미|덱|뒷면/.test(text)?'deck':'development':null;
 const result=emptySplendorObservation(kind);
 if(/추정|불명|불확실|판독\s*불가|모름|아마|가능성|아님|아닌|아니라|[-−]\s*\d/.test(text))return result;
 if(kind==='development'||kind==='noble')result.points=one([...text.matchAll(/(?:점수\s*[:：]?\s*(\d+)|(\d+)\s*점)/g)].map(m=>Number(m[1]??m[2])));
 if(kind==='development'){
  const matches=[...text.matchAll(new RegExp(`보너스\\s*[:：]?\\s*(${colorPattern})`,'g'))].map(m=>colorOf(m[1]));const distinct=new Set(matches);if(distinct.size===1&&matches[0]!=='gold')result.bonus=matches[0] as SplendorGem;
  const cost=text.match(/비용\s*[:：]?\s*([^,;\n]*?)(?=보너스|점수|$)/);if(cost)result.cost=parseCounts(cost[1]);
 }
 if(kind==='noble'){const req=text.match(/(?:필요\s*보너스|요구\s*보너스|요구|조건|표시)\s*[:：]?\s*([^,;\n]*)/);if(req)result.requirements=parseCounts(req[1]);}
 if(kind==='token'||kind==='deck'){const values=[...text.matchAll(new RegExp(colorPattern,'g'))].map(m=>colorOf(m[0]));if(new Set(values).size===1)result.color=values[0];}
 if(kind==='development'||kind==='deck'){const levels=[...text.matchAll(/([123])\s*레벨/g)].map(m=>Number(m[1]));result.level=one(levels) as 1|2|3|null;}
 return result;
}
export type SplendorDisplayReadout=Omit<SplendorObservation,'schema'|'kind'>&{kind:Exclude<SplendorKind,null>|'unknown';quantity:number|null;source:'structured'|'legacy-label'|'unread'};
export function getSplendorReadout(piece:{componentId:string|null;label:string;quantity:number|null;readout?:unknown}):SplendorDisplayReadout{
 const v=piece.readout?validateSplendorObservation(piece.readout,piece.componentId,piece.label):legacySplendorObservation(piece);const {schema,kind,...rest}=v;
 const populated=[v.points,v.bonus,v.cost,v.requirements,v.color,v.level].some(x=>x!==null);
 return {...rest,kind:kind??'unknown',quantity:piece.quantity,source:piece.readout?'structured':populated?'legacy-label':'unread'};
}
