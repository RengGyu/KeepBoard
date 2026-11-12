import type {CSSProperties} from 'react';
import type {Assertion} from '../shared/types';
/** Latest accepted record, plus a candidate only when it is not older than that record (same rule for table and rack). */
export function pickRummikubSource(assertions:readonly Assertion[]){
 const accepted=assertions.filter(a=>a.status==='accepted').at(-1);
 const candidate=assertions.filter(a=>a.status!=='accepted'&&(!accepted||a.updatedAt>=accepted.updatedAt)).at(-1);
 return {accepted,candidate};
}
export function boardStyle(tile:number):CSSProperties{return {'--rt-tile':`${tile}px`} as CSSProperties;}
