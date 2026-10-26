import {emptySplendorObservation,unknownGemCounts,validateSplendorObservation,type SplendorColor,type SplendorGem} from '../../shared/splendor.ts';
const aliases:Record<string,SplendorColor>={white:'white',흰색:'white',하양:'white',백색:'white',blue:'blue',파랑:'blue',파란색:'blue',청색:'blue',green:'green',초록:'green',초록색:'green',녹색:'green',red:'red',빨강:'red',빨간색:'red',적색:'red',black:'black',검정:'black',검은색:'black',흑색:'black',gold:'gold',금색:'gold',황금:'gold',황금색:'gold'};
/** AI boundary only: exact language aliases, never derive symbols from price/position/labels. */
export function normalizeSplendorModelRecord(value:unknown,warnings:string[]=[]):unknown{
 if(!value||typeof value!=='object'||!Array.isArray((value as any).pieces))return value;
 const warned=()=>warnings.push('스플렌더 판독의 불명확한 세부 정보는 확인 필요로 남겼습니다. 원본과 실물 후보는 유지됩니다.');
 return {...value,pieces:(value as any).pieces.map((p:any)=>{
  if(!p||typeof p!=='object'||!Object.hasOwn(p,'readout'))return p;
  const color=(v:unknown,gemOnly=false)=>{if(v===null)return null;const c=typeof v==='string'?aliases[v.trim().toLowerCase()]:undefined;if(!c||gemOnly&&c==='gold'){warned();return null;}return c;};
  const map=(v:unknown)=>{if(v===null)return null;if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('invalid counts');const out=unknownGemCounts(),seen=new Set<string>();for(const [k,n]of Object.entries(v)){const c=aliases[k.trim().toLowerCase()];if(!c||c==='gold'||seen.has(c))throw new Error('ambiguous counts');seen.add(c);out[c as SplendorGem]=n as number|null;}return out;};
  try{
   const v={...p.readout,bonus:color(p.readout?.bonus,true),color:color(p.readout?.color),cost:map(p.readout?.cost),requirements:map(p.readout?.requirements)};
   const checked=validateSplendorObservation(v,p.componentId);
   if(checked.kind==='development'&&/더미|뒷면|pile|stack|back|deck/i.test(p.label??''))throw new Error('front/back mismatch');
   return {...p,readout:checked};
  }catch{warned();return {...p,readout:emptySplendorObservation()};}
 })};
}
