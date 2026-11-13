import type {GenericPiece} from '../shared/genericRecord';
import type {GamePack} from '../shared/types';
import type {ArtMapping} from './artResolver';
import {GameComponentArt} from './GameComponentArt';
import {pieceSymbolFor,pieceSymbolHref} from './realBoards';
import {readoutColor,readoutDieArt} from './pieceReadoutArt';
import {pieceFaceValues} from './pieceFaceValues';
import './piece-face-values.css';
/** A null style is a known category, not a guessed first commercial subtype. Never writes to the record. */
export function GenericPieceArt({pack,piece,mapping,size=52,symbols,requestedPropertyIds,artPending=false,compact=false}:{pack:GamePack;piece:GenericPiece;mapping?:ArtMapping;size?:number;symbols?:string[];requestedPropertyIds?:readonly string[];artPending?:boolean;compact?:boolean}){
 const component=pack.runtime?.components.find(c=>c.id===piece.componentId);
 const gameId=pack.runtime?.source.gameId;
 const die=symbols?readoutDieArt(pack,piece,symbols):undefined;
 if(die&&gameId){
  const label=`${component!.name} · 색 ${readoutColor(die.colorName)?.label??'?'} · 눈 ${die.number??'?'}`;
  return <svg className="real-piece" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label} style={{color:die.color??'#d8dde5'}}>{die.symbol?<use href={pieceSymbolHref(gameId,die.symbol)}/>:<><rect x="13" y="13" width="94" height="94" rx="20" fill={die.color??'#d8dde5'} stroke="#16305c" strokeWidth="5"/><text x="60" y="62" textAnchor="middle" dominantBaseline="middle" fill={die.colorName==='black'?'#ffffff':'#16305c'} fontSize="48" fontWeight="700">{die.number??'?'}</text></>}</svg>;
 }
 const faceValues=pieceFaceValues(pack,piece,requestedPropertyIds),unknowns=faceValues.filter(f=>f.unknown),shown=compact?faceValues.filter(f=>!f.unknown&&!f.absent).filter((f,_,rows)=>f.numeric||!rows.some(other=>other.numeric&&other.text===f.text)):faceValues;
 const face=(art:import('react').ReactNode)=>faceValues.length?<span className={'piece-face-values'+(compact?' is-compact-face':'')+(component?.kind==='card'?' is-card-face':component?.kind==='tile'?' is-tile-face':' is-token-face')} style={{'--piece-size':`${size}px`,'--piece-color':faceValues.find(f=>f.color)?.color??'#eef1f4'} as import('react').CSSProperties}><span className="piece-face-art" aria-hidden="true">{art}</span><span className="piece-face-content">{shown.map(f=><span key={f.id} className={f.unknown?'is-unknown':f.numeric?'is-number':f.color?'is-color':'is-text'} title={f.label}><small>{f.label}</small><strong>{f.text}</strong></span>)}{compact&&!shown.length&&!unknowns.length&&<span className="compact-category"><strong>{component?.name??'종류 ?'}</strong></span>}{compact&&unknowns.length>0&&<span className="is-unknown compact-unknowns" aria-label={unknowns.map(f=>f.label+' ?').join(' · ')} title={unknowns.map(f=>f.label+' ?').join(' · ')}><small>미상 {unknowns.length}개</small><strong>?</strong></span>}</span></span>:art;
 if(artPending)return face(<GameComponentArt kind="unknown" label={(component?.name??'구성물')+' · 그림 확인 중'} size={size}/>);
 // A completed real board ships symbols for pieces that had no dedicated art; they replace the neutral category shape.
 const symbol=!piece.variant&&component&&symbols?pieceSymbolFor(symbols,component.id):undefined;
 if(symbol&&gameId)return face(<svg className="real-piece" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={piece.label||component!.name}><use href={pieceSymbolHref(gameId,symbol)}/></svg>);
 if(piece.variant||!component)return face(<GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={piece.componentId??'__unknown'} kind="unknown" variant={piece.variant??undefined} label={piece.label||component?.name||'미확인 실물'} size={size}/>);
 const asset=component.kind==='card'?'common.card-shell':component.kind==='tile'||component.kind==='board'?'common.area-zone':component.kind==='die'||component.kind==='dice'||component.kind==='cube'?'common.cube':'common.token-shell';
 const neutral:ArtMapping={game_id:'display-category',name_ko:'종류 대표 그림',name_en:'Category',components:[{component_id:component.id,name:component.name,kind:component.kind,status:'common-reuse',owner_color_supported:false,color_role:'fixed-semantic',variants:[{name:'category-only',layers:[{asset_id:asset}]}]}]};
 return face(<GameComponentArt game={pack.runtime?.source.gameId} mapping={neutral} componentId={component.id} kind={component.kind} variant="category-only" size={size} label={component.name+' · 종류 대표 그림'}/>);
}
