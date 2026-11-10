import type {GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {componentDefinition,gameReadoutView} from '../shared/readouts/registry';

const colors=[
 ['blue','#3388dd',['blue','파랑','파란색','청색']],
 ['green','#46aa6a',['green','초록','초록색','녹색']],
 ['red','#ee6055',['red','빨강','빨간색','적색']],
 ['yellow','#ffc935',['yellow','노랑','노란색','황색']],
 ['purple','#9765c9',['purple','보라','보라색','자색']],
 ['white','#ffffff',['white','흰색','하양']],
 ['black','#343b48',['black','검정','검은색']],
 ['orange','#f28a32',['orange','주황','주황색']],
 ['pink','#e99ac6',['pink','분홍','분홍색']],
] as const;
/** Symbol grammar and the pinned readout contract, never game IDs or illustrative labels. */
export function readoutDieArt(pack:GamePack,piece:GenericPiece,symbols:readonly string[]){
 if(piece.variant||!piece.componentId)return;
 const component=pack.runtime?.components.find(c=>c.id===piece.componentId),definition=componentDefinition(pack,piece.componentId);
 const valueField=definition?.fields.find(f=>f.id==='dieValue'&&f.type==='integer');
 const prefix=`piece-${piece.componentId}-die-`,variants=symbols.filter(s=>s.startsWith(prefix)&&/^(?:[a-z]+-)?[0-9]+$/.test(s.slice(prefix.length)));
 if(!component||!valueField||!variants.length)return;
 const view=gameReadoutView(pack,piece),values=view.readout?.values;
 // A mixed component (e.g. playing tokens and dice) needs its explicit visible subtype.
 if(!['die','dice'].includes(component.kind)&&!['die','dice','주사위'].includes(String(values?.tokenType??'').trim().toLowerCase()))return;
 const colorField=definition!.fields.find(f=>f.id==='dieColor')??definition!.fields.find(f=>f.id==='observedColor');
 const raw=colorField?values?.[colorField.id]:null;
 const option=colorField?.options?.find(o=>Object.is(o.value,raw));
 const names=[raw,option?.label].filter((v):v is string=>typeof v==='string').map(v=>v.trim().toLowerCase());
 const color=colors.find(c=>names.some(n=>(c[2] as readonly string[]).includes(n)));
 const number=typeof values?.[valueField.id]==='number'?values[valueField.id] as number:null;
 const colored=variants.some(s=>/^[a-z]+-/.test(s.slice(prefix.length)));
 const suffix=number===null?null:colored?(color?`${color[0]}-${number}`:null):String(number);
 const symbol=suffix!==null?variants.find(s=>s===prefix+suffix):undefined;
 // Missing/unmatched observations get an honest literal fallback, never the first face.
 return {symbol,color:color?.[1],colorName:color?.[0]??null,number};
}
