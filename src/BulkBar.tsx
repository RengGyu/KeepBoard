/** One action for many pieces, then tap only the ones that differ. */
export function BulkBar({message,actions,tapping,tapHint,onDone,disabled}:{message:string;actions:readonly {label:string;onClick:()=>void}[];tapping:boolean;tapHint:string;onDone:()=>void;disabled?:boolean}){
 return <div className="bulk-bar" role="status"><span>{tapping?tapHint:message}</span><div>{tapping?<button type="button" className="button primary small-button" onClick={onDone}>완료</button>:actions.map(a=><button type="button" key={a.label} className="button secondary small-button" disabled={disabled} onClick={a.onClick}>{a.label}</button>)}</div></div>;
}
