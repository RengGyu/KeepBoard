import type {GamePack} from '../shared/types';
import {captureAreas,captureProfile} from '../shared/photoCapture';
export function PhotoCaptureGuide({pack,ownerId,areaId,onChange,disabled}:{pack:GamePack;ownerId?:string;areaId:string;onChange:(id:string)=>void;disabled?:boolean}){
 const profile=captureProfile(pack);if(!profile)return null;
 const areas=captureAreas(pack,ownerId),selected=areas.find(a=>a.id===areaId);
 return <section className="panel" aria-label="게임별 촬영 안내"><h3>{pack.title} · {ownerId?'본인 사진':'공용 사진'}</h3><p>{profile.focus}</p><label className="field">촬영할 부분<select value={selected?.id??''} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">전체 · 부분 미지정</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>{selected&&<p>{selected.instruction}</p>}<p className="small muted">{ownerId?'비공개 앞면이 함께 보이면 사진 전체를 본인 범위에 보관해요.':'손패·개인 목표 앞면은 본인 탭에서 따로 찍어 주세요. 공개 개인물의 주인은 나중에 선택해요.'} 모르는 내용은 건너뛰어도 돼요.</p></section>;
}
