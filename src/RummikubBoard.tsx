import type {CSSProperties} from 'react';
import type {Assertion} from '../shared/types';
import {RUMMIKUB_COLORS,visibleRummikubFace,type RummikubColor,type RummikubGroup,type RummikubScene,type RummikubTile} from '../shared/rummikub';

// Classic set colors offered for new choices. Older records may still hold 'green'; it is shown as-is and flagged, never rewritten.
export const CLASSIC_COLORS=RUMMIKUB_COLORS;
export const colorNames:Record<RummikubColor,string>={red:'빨강',blue:'파랑',black:'검정',orange:'주황',green:'초록'};
export const colors:Record<RummikubColor,string>={red:'#be443a',blue:'#286eb6',black:'#303844',orange:'#ce7525',green:'#36864b'};
export const isLegacyColor=(color:RummikubColor|null)=>!!color&&!(CLASSIC_COLORS as readonly string[]).includes(color);

// Existing art assets, cropped to the tile body so tiles sit side by side like on a real table.
const NUMBER_TILE='/game-art/games/rummikub/numbers.number-tile.svg#ga--rummikub--numbers--number-tile';
const JOKER_TILE='/game-art/games/rummikub/jokers.joker-tile.svg#ga--rummikub--jokers--joker-tile';
const RACK='/game-art/common/rack.svg#ga--common--rack';

/** Latest accepted record, plus a candidate only when it is not older than that record (same rule for table and rack). */
export function pickRummikubSource(assertions:readonly Assertion[]){
 const accepted=assertions.filter(a=>a.status==='accepted').at(-1);
 const candidate=assertions.filter(a=>a.status!=='accepted'&&(!accepted||a.updatedAt>=accepted.updatedAt)).at(-1);
 return {accepted,candidate};
}
export function tileName(tile:RummikubTile){
 const face=visibleRummikubFace(tile);
 if(face.kind==='back')return '뒤집힌 타일';
 if(face.kind==='unknown')return '정체·앞뒤 모름';
 if(face.kind==='joker')return '조커';
 const color=face.color?`${colorNames[face.color]}${isLegacyColor(face.color)?'(색 확인 필요)':''}`:'색 모름';
 return `${color} ${face.number??'숫자 모름'}`;
}
export function groupName(group:RummikubGroup|undefined,index:number,rack:boolean){return group?.label||(rack?`${index+1}번째 줄`:`묶음 ${index+1}`);}

/** One tile drawn from the existing number/joker asset with the number laid over the asset's centre mark. */
export function TileFace({tile}:{tile:RummikubTile}){
 const face=visibleRummikubFace(tile),hidden=tile.face!=='front';
 const number=face.kind==='number'?face.number:null,color=face.kind==='number'&&face.color?colors[face.color]:'#64706c';
 return <svg className="rt-face" viewBox="20 8 79 105" aria-hidden="true">
  <use href={face.kind==='joker'&&!hidden?JOKER_TILE:NUMBER_TILE}/>
  {hidden?<rect x="27" y="16" width="62" height="86" rx="3" className="rt-face-back"/>
   :number!=null&&<><rect x="27" y="22" width="62" height="64" fill="#fff9e9"/><text x="58" y="75" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="700" fontSize={number>9?46:54} fill={color}>{number}</text></>}
  {!hidden&&face.kind==='number'&&isLegacyColor(face.color)&&<circle cx="86" cy="22" r="9" className="rt-face-flag"/>}
 </svg>;
}

function Meld({tiles,label,onOpen,disabled,dashed=false}:{tiles:RummikubTile[];label:string;onOpen?:()=>void;disabled:boolean;dashed?:boolean}){
 const content=<>{tiles.map(tile=><span className="rt-board-tile" key={tile.id}><TileFace tile={tile}/></span>)}{!tiles.length&&<span className="rt-board-gap" aria-hidden="true"/>}</>;
 const aria=`${label}: ${tiles.length?tiles.map(tileName).join(', '):'비어 있음'}`;
 return onOpen?<button type="button" className={`rt-meld${dashed?' is-aside':''}`} aria-label={aria} disabled={disabled} onClick={onOpen}>{content}</button>:<span className={`rt-meld${dashed?' is-aside':''}`} role="img" aria-label={aria}>{content}</span>;
}

/** Ordered overview: groups/rows and their order only; not photo coordinates. */
export function RummikubBoardView({scene,rack,disabled=false,onOpenGroup,onAddGroup,compact=false}:{scene:RummikubScene;rack:boolean;disabled?:boolean;onOpenGroup?:(id:string|'loose')=>void;onAddGroup?:()=>void;compact?:boolean}){
 const open=(id:string|'loose')=>onOpenGroup?()=>onOpenGroup(id):undefined;
 if(rack)return <div className="rt-rack">
  {scene.groups.map((group,i)=><div className="rt-rack-row" key={group.id}><svg className="rt-ledge" viewBox="8 34 102 78" preserveAspectRatio="none" aria-hidden="true"><use href={RACK}/></svg><Meld tiles={group.tiles} label={groupName(group,i,true)} onOpen={open(group.id)} disabled={disabled}/></div>)}
  {(scene.loose.length>0)&&<div className="rt-aside"><Meld tiles={scene.loose} label="따로 둔 타일" onOpen={open('loose')} disabled={disabled} dashed/><span>따로 둔 타일</span></div>}
  {onAddGroup&&<button type="button" className="rt-add-group" disabled={disabled} onClick={onAddGroup}>+ 새 줄</button>}
 </div>;
 return <div className={`rt-table${compact?' is-compact':''}`}>
  {scene.groups.map((group,i)=><Meld key={group.id} tiles={group.tiles} label={groupName(group,i,false)} onOpen={open(group.id)} disabled={disabled}/>)}
  {(scene.loose.length>0||!compact&&!!onOpenGroup)&&<Meld tiles={scene.loose} label="따로 둔 타일" onOpen={open('loose')} disabled={disabled} dashed/>}
  {onAddGroup&&<button type="button" className="rt-add-group" disabled={disabled} onClick={onAddGroup}>+ 묶음</button>}
 </div>;
}

export function boardStyle(tile:number):CSSProperties{return {'--rt-tile':`${tile}px`} as CSSProperties;}
