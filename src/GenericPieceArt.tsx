import type {GenericPiece} from '../shared/genericRecord';
import type {GamePack} from '../shared/types';
import type {ArtMapping} from './artResolver';
import {GameComponentArt} from './GameComponentArt';
import {pieceSymbolFor,pieceSymbolHref} from './realBoards';
/** A null style is a known category, not a guessed first commercial subtype. Never writes to the record. */
export function GenericPieceArt({pack,piece,mapping,size=52,symbols}:{pack:GamePack;piece:GenericPiece;mapping?:ArtMapping;size?:number;symbols?:string[]}){
 const component=pack.runtime?.components.find(c=>c.id===piece.componentId);
 const gameId=pack.runtime?.source.gameId;
 // A completed real board ships symbols for pieces that had no dedicated art; they replace the neutral category shape.
 const symbol=!piece.variant&&component&&symbols?pieceSymbolFor(symbols,component.id):undefined;
 if(symbol&&gameId)return <svg className="real-piece" viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={piece.label||component!.name}><use href={pieceSymbolHref(gameId,symbol)}/></svg>;
 if(piece.variant||!component)return <GameComponentArt game={pack.runtime?.source.gameId} mapping={mapping} componentId={piece.componentId??'__unknown'} kind="unknown" variant={piece.variant??undefined} label={piece.label||component?.name||'미확인 실물'} size={size}/>;
 const asset=component.kind==='card'?'common.card-shell':component.kind==='tile'||component.kind==='board'?'common.area-zone':component.kind==='die'||component.kind==='dice'||component.kind==='cube'?'common.cube':'common.token-shell';
 const neutral:ArtMapping={game_id:'display-category',name_ko:'종류 대표 그림',name_en:'Category',components:[{component_id:component.id,name:component.name,kind:component.kind,status:'common-reuse',owner_color_supported:false,color_role:'fixed-semantic',variants:[{name:'category-only',layers:[{asset_id:asset}]}]}]};
 return <GameComponentArt game={pack.runtime?.source.gameId} mapping={neutral} componentId={component.id} kind={component.kind} variant="category-only" size={size} label={component.name+' · 종류 대표 그림'}/>;
}
