import type {GenericPiece} from '../shared/genericRecord';
import type {GamePack} from '../shared/types';
import {emptySplendorObservation,getSplendorReadout,unknownGemCounts,type SplendorDisplayReadout,type SplendorGemCounts,type SplendorObservation} from '../shared/splendor';
import {GEM_NAMES,GEM_ORDER,Gem,type SplendorGem,type SplendorReadoutProps,type SplendorTokenColor} from './SplendorReadout';

type Readout=SplendorObservation;
type Counts=SplendorGemCounts;
const KIND_BY_COMPONENT:Record<string,Readout['kind']>={development:'development',nobles:'noble',chips:'token'};

export const isSplendor=(pack:GamePack)=>pack.runtime?.source.gameId==='splendor';

/** Display props for a piece: structured readout first, strict legacy reading via the shared helper; never parses here. */
function read(piece:GenericPiece):SplendorDisplayReadout{
 // An invalid stored readout is shown as unread rather than breaking the whole record.
 try{return getSplendorReadout({...piece,readout:piece.readout?.schema==='splendor-v1'?piece.readout as SplendorObservation:undefined});}catch{return {...emptySplendorObservation(),kind:'unknown',quantity:piece.quantity,source:'unread'};}
}
export function splendorView(piece:GenericPiece):SplendorReadoutProps&{source:SplendorDisplayReadout['source']}{
 const r=read(piece);
 // A map with every colour unread is an unread cost, shown once as "비용 ?" instead of five question marks.
 const unread=(m:Partial<Counts>|null)=>m&&GEM_ORDER.every(g=>m[g]==null)?null:m;
 return {...r,kind:r.kind??'unknown',cost:unread(r.cost),requirements:unread(r.requirements)};
}

/** Editable starting point: the stored readout, else what the helper could read (becomes structured only when the user edits). */
function current(piece:GenericPiece):Readout{
 if(piece.readout?.schema==='splendor-v1'&&(piece.readout.kind!==null||piece.componentId==='development'))return piece.readout as SplendorObservation;
 const r=read(piece);
 if(r.kind==='unknown')return emptySplendorObservation(KIND_BY_COMPONENT[piece.componentId??'']??null);
 return {schema:'splendor-v1',kind:r.kind,points:r.points,bonus:r.bonus,cost:r.cost,requirements:r.requirements,color:r.color,level:r.level};
}
/** Changing the component kind drops an incompatible readout to an explicit unread one so stale numbers never show. */
export function readoutForComponent(piece:GenericPiece,componentId:string|null):Partial<GenericPiece>{
 const next=KIND_BY_COMPONENT[componentId??'']??null,old=current(piece).kind;
 const compatible=next===old||next==='development'&&old==='deck';
 return compatible?{componentId}:{componentId,readout:emptySplendorObservation(next)};
}

const numberValue=(value:string)=>value===''?null:Math.max(0,Math.floor(Number(value)));
function CountsInput({label,value,disabled,onChange}:{label:string;value:Counts|null;disabled:boolean;onChange:(v:Counts|null)=>void}){
 const map:Counts=value??unknownGemCounts();
 return <fieldset className="sr-edit-counts"><legend>{label}</legend>
  <div>{GEM_ORDER.map(g=><label key={g}><Gem color={g} size={18}/><span className="sr-sr">{GEM_NAMES[g]}</span><input type="number" inputMode="numeric" min="0" step="1" placeholder="?" aria-label={`${label} ${GEM_NAMES[g]}`} value={map[g]??''} disabled={disabled} onChange={e=>onChange({...map,[g]:numberValue(e.target.value)})}/></label>)}</div>
  <button type="button" className="button text small-button" disabled={disabled||!GEM_ORDER.some(g=>map[g]==null)} onClick={()=>onChange(Object.fromEntries(GEM_ORDER.map(g=>[g,map[g]??0])) as Counts)}>빈 칸은 없음(0)</button>
 </fieldset>;
}
function GemChoice<T extends SplendorTokenColor>({label,options,value,disabled,onChange}:{label:string;options:readonly T[];value:T|null;disabled:boolean;onChange:(v:T|null)=>void}){
 return <fieldset className="sr-edit-gems"><legend>{label}</legend><div>{options.map(g=><button type="button" key={g} aria-pressed={value===g} aria-label={GEM_NAMES[g]} disabled={disabled} onClick={()=>onChange(g)}><Gem color={g} size={20}/>{GEM_NAMES[g]}</button>)}<button type="button" aria-pressed={value===null} disabled={disabled} onClick={()=>onChange(null)}>모름</button></div></fieldset>;
}

/** Dedicated inputs for points / bonus / cost / noble requirement / token colour. null (모름) and 0 stay distinct. */
export function SplendorFields({piece,disabled,onPatch}:{piece:GenericPiece;disabled:boolean;onPatch:(change:Partial<GenericPiece>)=>void}){
 const r=current(piece),set=(change:Partial<Readout>)=>onPatch({readout:{...r,...change}});
 const card=piece.componentId==='development'||r.kind==='development'||r.kind==='deck';
 return <div className="sr-edit">
  {piece.componentId==='development'&&<div className="sr-edit-kind" role="group" aria-label="카드 종류"><button type="button" aria-pressed={r.kind==='development'} disabled={disabled} onClick={()=>onPatch({readout:{...emptySplendorObservation('development'),level:r.level}})}>앞면 카드</button><button type="button" aria-pressed={r.kind==='deck'} disabled={disabled} onClick={()=>onPatch({readout:{...emptySplendorObservation('deck'),level:r.level}})}>뒷면 더미</button></div>}
  {card&&<div className="sr-edit-kind" role="group" aria-label="레벨">{([1,2,3] as const).map(l=><button type="button" key={l} aria-pressed={r.level===l} disabled={disabled} onClick={()=>set({level:l})}>{l}레벨</button>)}<button type="button" aria-pressed={r.level===null} disabled={disabled} onClick={()=>set({level:null})}>모름</button></div>}
  {(r.kind==='development'||r.kind==='noble')&&<label className="sr-edit-points">점수<input type="number" inputMode="numeric" min="0" step="1" placeholder="모름" value={r.points??''} disabled={disabled} onChange={e=>set({points:numberValue(e.target.value)})}/></label>}
  {r.kind==='development'&&<GemChoice label="보너스 보석" options={GEM_ORDER} value={r.bonus} disabled={disabled} onChange={bonus=>set({bonus:bonus as SplendorGem|null})}/>}
  {r.kind==='development'&&<CountsInput label="비용" value={r.cost} disabled={disabled} onChange={cost=>set({cost})}/>}
  {r.kind==='noble'&&<CountsInput label="필요 보너스" value={r.requirements} disabled={disabled} onChange={requirements=>set({requirements})}/>}
  {r.kind==='token'&&<GemChoice label="토큰 색" options={[...GEM_ORDER,'gold'] as const} value={r.color} disabled={disabled} onChange={color=>set({color})}/>}
  {!r.kind&&<p className="small muted">구성물 종류를 먼저 골라 주세요.</p>}
 </div>;
}
