// Terra (OpenAI Responses) -> existing Gemini game decoder. Box order is judged per whole response, never per row,
// because a row can satisfy min<max under both orders while still being transposed.
export type BoxOrder='declared'|'ymin-xmin-xmax-ymax'|'ambiguous'|'unresolved';
type Box=[number,number,number,number];
const isBox=(b:unknown):b is Box=>Array.isArray(b)&&b.length===4&&b.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1000);
const declaredOk=(b:Box)=>b[0]<b[2]&&b[1]<b[3];
const yxxyOk=(b:Box)=>b[0]<b[3]&&b[1]<b[2];
/** declared = contract [ymin,xmin,ymax,xmax]; ymin-xmin-xmax-ymax = the only other order seen in stored Terra output. */
export function terraBoxOrder(items:{box_1000:unknown}[]):{order:BoxOrder;boxes:number;declaredInvalid:number;alternateInvalid:number}{
 const boxes=items.map(i=>i.box_1000).filter(b=>b!==null);
 if(boxes.some(b=>!isBox(b)))return {order:'unresolved',boxes:boxes.length,declaredInvalid:NaN,alternateInvalid:NaN};
 const d=(boxes as Box[]).filter(b=>!declaredOk(b)).length,a=(boxes as Box[]).filter(b=>!yxxyOk(b)).length;
 const order:BoxOrder=d===0&&a>0?'declared':d>0&&a===0?'ymin-xmin-xmax-ymax':d===0&&a===0?'ambiguous':'unresolved';
 return {order,boxes:boxes.length,declaredInvalid:d,alternateInvalid:a};
}
export type GeometryPolicy='withhold-unless-declared'|'adopt-consistent-alternate';
/** Returns the same wire items for the unchanged decoder. Values, kinds and attributes are never touched.
 * withhold-unless-declared (app default): geometry kept only when the whole response follows the contract
 * (an all-ambiguous response follows the contract by definition); otherwise every box becomes null = unplaced.
 * adopt-consistent-alternate (evaluation only): additionally maps a response that is valid only as [ymin,xmin,xmax,ymax]. */
export function adaptTerraItems<T extends {box_1000:unknown}>(items:T[],policy:GeometryPolicy='withhold-unless-declared'){
 const check=terraBoxOrder(items);
 const keep=check.order==='declared'||check.order==='ambiguous';
 const remap=policy==='adopt-consistent-alternate'&&check.order==='ymin-xmin-xmax-ymax';
 const out=items.map(i=>({...i,box_1000:i.box_1000===null||keep?i.box_1000:remap?[(i.box_1000 as Box)[0],(i.box_1000 as Box)[1],(i.box_1000 as Box)[3],(i.box_1000 as Box)[2]]:null}));
 return {items:out,check,geometry:keep?'contract':remap?'remapped-alternate-order':'withheld',policy};
}
