import type {CSSProperties} from 'react';
import './splendor-readout.css';

/** Display-only Splendor readout. Values come in structured; this component never parses label text. */
export type SplendorGem='white'|'blue'|'green'|'red'|'black';
export type SplendorTokenColor=SplendorGem|'gold';
/** Missing key = not on the card (0). `null` = present but the number is unknown. */
export type SplendorGemCounts=Partial<Record<SplendorGem,number|null>>;
export type SplendorKind='development'|'noble'|'token'|'deck'|'unknown';
export interface SplendorReadoutProps{
 kind:SplendorKind;
 points:number|null;
 bonus:SplendorGem|null;
 /** Development card cost; `null` = cost not read. */
 cost:SplendorGemCounts|null;
 /** Noble requirement (owned card bonuses); `null` = not read. */
 requirements:SplendorGemCounts|null;
 /** Token (or deck back) colour. */
 color:SplendorTokenColor|null;
 quantity:number|null;
 level?:1|2|3|null;
 /** mini = small placed item on a record board (points, bonus, cost digits only). */
 size?:'mini'|'compact'|'detail';
 /** 'legacy-label' = values read from an older free-text label; flagged so they are confirmed, not trusted. */
 source?:'structured'|'legacy-label'|'unread';
}

export const GEM_ORDER:readonly SplendorGem[]=['white','blue','green','red','black'];
export const GEM_NAMES:Record<SplendorTokenColor,string>={white:'흰색',blue:'파랑',green:'초록',red:'빨강',black:'검정',gold:'금'};
const GEM_STONES:Record<SplendorTokenColor,string>={white:'다이아몬드',blue:'사파이어',green:'에메랄드',red:'루비',black:'오닉스',gold:'황금'};
const KIND_NAMES:Record<SplendorKind,string>={development:'개발 카드',noble:'귀족 타일',token:'보석 토큰',deck:'카드 더미',unknown:'구성물'};

/** Each colour also has its own cut, so the readout never depends on colour alone. */
export function Gem({color,size=16}:{color:SplendorTokenColor|null;size?:number}){
 const box={width:size,height:size};
 if(!color)return <svg className="sr-gem is-unknown" viewBox="0 0 24 24" style={box} aria-hidden="true"><circle cx="12" cy="12" r="9"/><text x="12" y="16.5" textAnchor="middle">?</text></svg>;
 const shape={
  white:<><path className="sr-gem-body" d="M6 4h12l4 6-10 11L2 10Z"/><path className="sr-gem-cut" d="M2 10h20M8.5 4 7 10l5 11 5-11-1.5-6"/></>,
  blue:<><ellipse className="sr-gem-body" cx="12" cy="12" rx="8.5" ry="10"/><ellipse className="sr-gem-cut" cx="12" cy="12" rx="4.5" ry="5.5"/></>,
  green:<><path className="sr-gem-body" d="M8 2h8l3.5 3.5v13L16 22H8l-3.5-3.5v-13Z"/><rect className="sr-gem-cut" x="8.5" y="6" width="7" height="12"/></>,
  red:<><path className="sr-gem-body" d="M12 2l9 5v10l-9 5-9-5V7Z"/><path className="sr-gem-cut" d="M12 7l4.5 2.5v5L12 17l-4.5-2.5v-5Z"/></>,
  black:<><rect className="sr-gem-body" x="3" y="4" width="18" height="16" rx="3.5"/><path className="sr-gem-cut" d="M7 8h10v8H7ZM3.5 5l4 3M20.5 5l-4 3"/></>,
  gold:<><path className="sr-gem-body" d="M2.5 18l3.5-10h12l3.5 10Z"/><path className="sr-gem-cut" d="M6 8l2 4h8l2-4M8 12l-3 6M16 12l3 6"/></>,
 }[color];
 return <svg className={`sr-gem is-${color}`} viewBox="0 0 24 24" style={box} aria-hidden="true">{shape}<path className="sr-gem-shine" d="M7 7.5l2.5-1.5" /></svg>;
}

const entries=(counts:SplendorGemCounts)=>GEM_ORDER.filter(gem=>gem in counts&&counts[gem]!==undefined&&counts[gem]!==0).map(gem=>[gem,counts[gem] as number|null] as const);
const numberText=(value:number|null)=>value===null?'?':String(value);

function countsText(counts:SplendorGemCounts|null){
 if(counts===null)return '확인 필요';
 const shown=entries(counts);
 return shown.length?shown.map(([gem,n])=>`${GEM_NAMES[gem]} ${n===null?'개수 확인 필요':n}`).join(' '):'없음';
}

/** Short spoken/screen-reader description built only from the structured props. */
export function describeSplendor(p:SplendorReadoutProps){
 const parts=[KIND_NAMES[p.kind]+(p.level?` ${p.level}레벨`:'')];
 if(p.kind==='development'||p.kind==='noble')parts.push(p.points===null?'점수 확인 필요':`${p.points}점`);
 if(p.kind==='development')parts.push(p.bonus?`보너스 ${GEM_NAMES[p.bonus]}`:'보너스 확인 필요',`비용 ${countsText(p.cost)}`);
 if(p.kind==='noble')parts.push(`필요 보너스 ${countsText(p.requirements)}`);
 if(p.kind==='token')parts.push(p.color?GEM_NAMES[p.color]:'색 확인 필요',p.quantity===null?'수량 확인 필요':`${p.quantity}개`);
 if((p.kind==='development'||p.kind==='deck')&&p.quantity!==null&&p.quantity!==1)parts.push(`${p.quantity}장`);
 if(p.kind==='unknown')parts.push('종류 확인 필요');
 if(p.source==='legacy-label')parts.push('글에서 읽은 값 · 확인 필요');
 return parts.join(', ');
}

function Counts({counts,variant,label,size}:{counts:SplendorGemCounts|null;variant:'cost'|'need';label:string;size:NonNullable<SplendorReadoutProps['size']>}){
 if(counts===null)return <p className="sr-counts is-unknown"><Check/>{label} ?</p>;
 const shown=entries(counts);
 if(!shown.length)return <p className="sr-counts is-empty">{label} 없음</p>;
 return <ul className={`sr-counts is-${variant}`}>{shown.map(([gem,n])=><li key={gem} className={n===null?'is-unknown':undefined}><Gem color={gem} size={size==='mini'?10:variant==='need'?15:16}/><b>{numberText(n)}</b></li>)}</ul>;
}
const Check=()=><span className="sr-check" aria-hidden="true">?</span>;

function Points({points}:{points:number|null}){
 return points===null?<span className="sr-points is-unknown"><Check/>점</span>:<span className={`sr-points${points===0?' is-zero':''}`}><b>{points}</b>점</span>;
}
const Dots=({level}:{level?:1|2|3|null})=>level?<span className="sr-level" aria-hidden="true">{'•'.repeat(level)}</span>:null;
const needsCheck=(p:SplendorReadoutProps)=>p.kind==='unknown'||
 (p.kind==='development'||p.kind==='noble')&&p.points===null||
 p.kind==='development'&&(!p.bonus||p.cost===null||Object.values(p.cost).some(v=>v===null))||
 p.kind==='noble'&&(p.requirements===null||Object.values(p.requirements).some(v=>v===null))||
 p.kind==='token'&&(!p.color||p.quantity===null);

export function SplendorReadout(props:SplendorReadoutProps){
 const {kind,points,bonus,cost,requirements,color,quantity,level,size='compact',source}=props;
 const tint=(kind==='development'?bonus:kind==='token'||kind==='deck'?color:null)??'none';
 const many=quantity!==null&&quantity!==1&&(kind==='development'||kind==='deck');
 let body;
 if(kind==='development')body=<><div className="sr-top"><Points points={points}/><Dots level={level}/><span className="sr-bonus"><Gem color={bonus} size={size==='detail'?40:size==='mini'?18:30}/></span></div><Counts counts={cost} variant="cost" label="비용" size={size}/></>;
 else if(kind==='noble')body=<><div className="sr-top"><Points points={points}/></div>{size!=='mini'&&<span className="sr-need-label">필요 보너스</span>}<Counts counts={requirements} variant="need" label="필요" size={size}/></>;
 else if(kind==='token')body=<><span className="sr-coin"><Gem color={color} size={size==='detail'?44:size==='mini'?22:34}/></span><span className="sr-qty">{quantity===null?<><Check/>개</>:<><b>{quantity}</b>개</>}</span></>;
 else if(kind==='deck')body=<><span className="sr-back"><Dots level={level}/></span>{level?<span className="sr-caption">{level}레벨 더미</span>:<span className="sr-caption"><Check/>레벨</span>}</>;
 else body=<><span className="sr-back is-unknown">?</span><span className="sr-caption">{level?`${level}레벨 · `:''}종류 확인 필요</span></>;
 return <div className={`splendor-readout is-${kind} is-${size}`} style={{'--sr-tint':`var(--sr-${tint})`} as CSSProperties} role="img" aria-label={describeSplendor(props)}>
  {body}
  {many&&<span className="sr-many">×{quantity}</span>}
  {source==='legacy-label'&&size!=='mini'&&<span className="sr-flag is-legacy">글에서 읽음</span>}
  {(needsCheck(props)||source==='legacy-label'&&size==='mini')&&kind!=='unknown'&&(size==='mini'?<span className="sr-flag-dot" aria-hidden="true"/>:<span className="sr-flag">확인 필요</span>)}
 </div>;
}
