import type {GamePack} from '../shared/types';
import {captureAreas,captureProfile,type CaptureArea} from '../shared/photoCapture';
/** User copy only; the profile's machine instructions and scope remain exact. */
export function captureGuideText(pack:GamePack,area?:CaptureArea){
 if(pack.runtime?.source.gameId==='catan'&&area?.id==='board')return '섬 전체와 항구가 한 화면에 들어오게 찍어 주세요. 숫자 토큰과 도로·마을·도시가 겹친 곳은 같은 멈춘 상태에서 가까이 찍어 주세요.';
 if(pack.runtime?.source.gameId==='catan'&&area?.id==='hand')return '내 자원 카드와 개발 카드가 보이게 찍어 주세요. 겹친 카드는 종류와 수량을 확인할 수 있게 가까이 찍고, 손패 앞면은 본인 사진으로만 보관해 주세요.';
 const text=area?.instruction??captureProfile(pack)?.focus??'';
 const terms:Record<string,string>={'board instance':'판 구분','feature ID':'연결 영역','vertex ID':'모서리 위치','group ID':'묶음 구분','player ID':'참가자','hex ID':'육각 칸','layer ID':'층 구분','child anchor':'연결된 위치',controllers:'참가자 연결',identity:'읽히는 이름',axial:'육각 칸',footprint:'차지한 칸','x/y':'가로·세로 위치',hex:'육각 칸',local:'판 안의',layer:'층',phase:'진행 단계',null:'모름',ID:'구분 표시',z:'높이'};
 return Object.entries(terms).reduce((copy,[term,label])=>term.includes(' ')?copy.split(term).join(label):copy.replace(new RegExp('\\b'+term+'\\b','g'),label),text);
}
export function PhotoCaptureGuide({pack,ownerId,areaId,onChange,disabled}:{pack:GamePack;ownerId?:string;areaId:string;onChange:(id:string)=>void;disabled?:boolean}){
 const profile=captureProfile(pack);if(!profile)return null;
 const areas=captureAreas(pack,ownerId),selected=areas.find(a=>a.id===areaId);
 return <section className="panel" aria-label="게임별 촬영 안내"><h3>{pack.title} · {ownerId?'본인 사진':'공용 사진'}</h3><p>{captureGuideText(pack)}</p><label className="field">촬영할 부분<select value={selected?.id??''} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">전체 · 부분 미지정</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{selected&&<p>{captureGuideText(pack,selected)}</p>}<p className="small muted">{ownerId?'비공개 앞면이 함께 보이면 사진 전체를 본인 범위에 보관해요.':'손패·개인 목표 앞면은 본인 탭에서 따로 찍어 주세요. 공개 개인물의 주인은 나중에 선택해요.'} 모르는 내용은 건너뛰어도 돼요.</p></section>;
}
