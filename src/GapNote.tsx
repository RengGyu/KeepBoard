import type {GamePack} from '../shared/types';
import type {GenericPiece} from '../shared/genericRecord';
import type {ObservationGap} from '../shared/observationGaps';

/** Field ID → reason label, for the detail editor's highlight. */
export const gapReasons=(gaps:readonly ObservationGap[])=>Object.fromEntries(gaps.flatMap(g=>g.property?[[g.property,'사진 참고']]:[]));

export function unreadGaps(piece:GenericPiece,gaps:readonly ObservationGap[]){
 const values=(piece.readout?.schema==='splendor-v1'?piece.readout:piece.readout&&'values' in piece.readout?piece.readout.values:{}) as Record<string,unknown>;
 return gaps.filter(g=>g.property?values[g.property]==null:piece.quantity===null);
}

/** What the reader could not read for this piece, named by the pack's own field labels. Values the user has since filled in drop off the list. */
export function GapNote({pack,piece,gaps}:{pack:GamePack;piece:GenericPiece;gaps:readonly ObservationGap[]}){
 const open=unreadGaps(piece,gaps);
 if(!open.length)return null;
 return <p className="gap-note" role="note">사진 참고</p>;
}
