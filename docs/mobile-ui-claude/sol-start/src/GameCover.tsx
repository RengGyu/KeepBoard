import {ComponentArt} from './ComponentArt';
import {CarcassonneArt} from './CarcassonneArt';
import './home-board-story.css';

/** Representative cover art only; never substitutes a user's captured evidence. */
export function GameCover({gameId,label,className=''}:{gameId?:string;label?:string;className?:string}){
 const catan=gameId==='catan'||gameId==='catan-base',carcassonne=gameId==='carcassonne';
 return <div className={`game-cover ${catan?'game-cover--island':carcassonne?'game-cover--roads':'game-cover--neutral'} ${className}`} role="img" aria-label={label??(catan?'카탄 섬과 바다 · 대표 그림':carcassonne?'카르카손 길과 성 · 대표 그림':'게임 기록 · 표지 그림')}>
  <svg viewBox="0 0 600 180" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
   {catan?<><path d="M-20 125Q80 83 175 112t188-4 257-7M-20 149Q80 107 175 136t188-4 257-7" fill="none" stroke="#ffffff" strokeOpacity=".19" strokeWidth="2"/>{['forest','pasture','hills','fields','mountains'].map((v,i)=><g key={v} transform={`translate(${143+i*57} ${i%2?36:3})`}><ComponentArt kind="terrain" variant={v} size={84}/></g>)}<g transform="translate(286 93)"><ComponentArt kind="settlement" color="#bd5144" size={53}/></g><path d="M67 48h24m-12-12v24M506 130h24m-12-12v24" stroke="#f5fbfb" strokeOpacity=".35" fill="none"/></>:carcassonne?<><path d="M-10 155Q80 99 137 121T247 81 360 105 610 47" fill="none" stroke="#f0e0ba" strokeWidth="12"/>{(['road-bend','city-road','road-straight','monastery'] as const).map((v,i)=><g key={v} transform={`translate(${143+i*73} ${i%2?42:18}) rotate(${i%2?3:-3} 44 44)`}><CarcassonneArt kind="tile" variant={v} size={86}/></g>)}<g transform="translate(320 110)"><CarcassonneArt kind="follower" color="#416e96" size={46}/></g></>:<><path d="M0 132h110l45-37h130l42 29h114l53-50h106" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="2" strokeDasharray="4 7"/><g transform="translate(247 29) rotate(-7 50 50)"><ComponentArt kind="unknown" size={106}/></g><circle cx="110" cy="132" r="5" fill="none" stroke="currentColor" strokeOpacity=".24"/><circle cx="494" cy="74" r="5" fill="none" stroke="currentColor" strokeOpacity=".24"/></>}
  </svg>
 </div>;
}
