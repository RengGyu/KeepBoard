import {Check} from 'lucide-react';
import {ComponentArt} from './ComponentArt';
import './home-board-story.css';

const tiles=['forest','pasture','hills','fields','mountains','pasture','forest','hills','forest','desert','fields','mountains','pasture','fields','forest','mountains','fields','pasture','hills'];
const numbers=[5,2,6,9,10,4,3,11,8,null,12,5,9,4,6,11,8,10,3];

/** A staged illustration of the workflow, not a live recognition result. */
export function HomeBoardStory(){
 let index=0;
 return <figure className="home-head-art home-board-story" aria-label="예시 사진이 편집 가능한 그림판이 되고 저장되는 과정">
  <div className="board-story-table">
   <img className="board-story-photo" src="/brand/home/paused-table.jpg" alt="" fetchPriority="high"/>
   <div className="board-story-drawing" aria-hidden="true"><svg viewBox="0 0 420 310"><path d="m210 29 126 73v111l-126 73-126-73V102Z" fill="#78a7b4"/><path d="m210 40 116 68v99l-116 67-116-67v-99Z" fill="none" stroke="#d9edef" strokeWidth="1.5"/>{[3,4,5,4,3].flatMap((length,row)=>Array.from({length},(_,col)=>{const i=index++;return <g key={i} transform={`translate(${210-(length-1)*20+col*40-28} ${58+row*35})`}><ComponentArt kind="terrain" variant={tiles[i]} number={numbers[i]} size={56}/></g>;}))}<path d="m151 113 20 12v23l20 12m80 0 20 12v23" fill="none" stroke="#b94c39" strokeWidth="5" strokeLinecap="round"/><g transform="translate(157 109)"><ComponentArt kind="settlement" color="#b94c39" size={29}/></g><g transform="translate(278 169)"><ComponentArt kind="settlement" color="#416f9b" size={29}/></g><g transform="translate(195 148)"><ComponentArt kind="robber" size={29}/></g></svg></div>
   <div className="board-story-parts" aria-hidden="true"><span className="board-story-part part-hex"><ComponentArt kind="terrain" variant="forest" size={58}/></span><span className="board-story-part part-card"><ComponentArt kind="resource-card" variant="grain" size={58}/></span><span className="board-story-part part-house"><ComponentArt kind="settlement" color="#bb503d" size={47}/></span><svg className="board-story-part part-dice" viewBox="0 0 58 40" width="58" height="40"><g fill="#fff9e9" stroke="#776e5d" strokeWidth="1"><rect x="2" y="3" width="27" height="27" rx="5" transform="rotate(-8 15 16)"/><rect x="28" y="10" width="27" height="27" rx="5" transform="rotate(9 41 23)"/></g><g fill="#514d43"><circle cx="9" cy="10" r="2"/><circle cx="20" cy="22" r="2"/><circle cx="35" cy="17" r="2"/><circle cx="41" cy="23" r="2"/><circle cx="47" cy="29" r="2"/></g></svg></div>
   <span className="board-story-saved"><Check size={13}/>저장한 판</span>
  </div>
  <figcaption><span>사진</span><span aria-hidden="true">→</span><span>그림에서 정정</span><span aria-hidden="true">→</span><span>저장</span><small>연출 이미지</small></figcaption>
 </figure>;
}
