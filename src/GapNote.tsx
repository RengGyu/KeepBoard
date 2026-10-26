import type {GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import {GAP_REASON,type ObservationGap} from '../shared/observationGaps';
import {componentDefinition} from '../shared/readouts/registry';

/** Field ID → reason label, for the detail editor's highlight. */
export const gapReasons=(gaps:readonly ObservationGap[])=>Object.fromEntries(gaps.flatMap(g=>g.property?[[g.property,GAP_REASON[g.reason]]]:[]));

/** What the reader could not read for this piece, named by the pack's own field labels. Values the user has since filled in drop off the list. */
export function GapNote({pack,piece,gaps}:{pack:GamePack;piece:GenericPiece;gaps:readonly ObservationGap[]}){
 const fields=componentDefinition(pack,piece.componentId)?.fields??[],values=(piece.readout&&'values' in piece.readout?piece.readout.values:{}) as Record<string,unknown>;
 const open=gaps.filter(g=>g.property?values[g.property]==null:piece.quantity===null);
 if(!open.length)return <p className="gap-note is-done" role="status">사진에서 못 읽은 값을 모두 채웠어요.</p>;
 return <p className="gap-note" role="note"><b>확인 필요</b>{open.map(g=><span key={g.property??'quantity'}>{g.property?`${fields.find(f=>f.id===g.property)?.label??g.property} ${GAP_REASON[g.reason]}`:GAP_REASON.quantity}</span>)}</p>;
}
