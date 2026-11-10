import {useState} from 'react';
import type {GameCatalogEntry} from '../shared/gameEssentials';
import type {SessionView} from '../shared/types';
import {api} from './api';
import {GamePicker} from './GamePicker';
import {Modal,Busy} from './ui';
import {PlayerRows} from './Dialogs';
import {creationPlayers} from './creationPlayers';
import './rooms.css';
const COLORS=['#c65d4b','#6285aa','#d5a44d','#78967a','#997ba6','#b68a64'];
export function RoomEntry({packs,joining,initialInvite='',onClose,onCreated}:{packs:GameCatalogEntry[];joining:boolean;initialInvite?:string;onClose:()=>void;onCreated:(v:SessionView)=>Promise<void>}){
 const [mode,setMode]=useState<'single'|'invite'>('single');
 const [game,setGame]=useState(packs[0]?.id??''),[name,setName]=useState(''),[person,setPerson]=useState(''),[color,setColor]=useState(COLORS[0]),[capacity,setCapacity]=useState(4),[players,setPlayers]=useState(()=>creationPlayers(12)),[invite,setInvite]=useState(initialInvite),[preview,setPreview]=useState<Awaited<ReturnType<typeof api.roomPreview>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const [requestId]=useState(()=>crypto.randomUUID());
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{if(joining||mode==='invite')await api.roomDevice();await task();}catch(e){setError(e instanceof Error?e.message:'시작하지 못했어요.');}finally{setBusy(false);}};
 return <Modal title={joining?'방 참가':'새 보드'} onClose={onClose}><form className="modal-body form-stack room-entry" onSubmit={e=>{e.preventDefault();void run(async()=>{
  if(joining&&!preview){setPreview(await api.roomPreview(invite.trim()));return;}
  if(joining){await onCreated(await api.joinRoom({invite:invite.trim(),name:person,color,clientRequestId:requestId}));return;}
  const chosen=packs.find(p=>p.id===game);if(!chosen)throw new Error('게임을 선택해 주세요.');
  if(mode==='single')await onCreated(await api.create({gamePackId:game,gamePackVersion:chosen.version,name:name.trim()||undefined,players:players.slice(0,capacity)}));
  else await onCreated(await api.createRoom({gamePackId:game,gamePackVersion:chosen.version,name:name.trim()||undefined,capacity,me:{name:person,color},clientRequestId:requestId}));
 });}}>
 {joining?<>{initialInvite?<p>초대 링크로 참가해요.</p>:<label>초대 코드<input required value={invite} maxLength={100} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="go" onChange={e=>{setInvite(e.target.value);setPreview(null);}} placeholder="받은 코드를 입력하세요"/></label>}{preview&&<p>{preview.name} · {preview.game}<br/>{preview.remaining}자리 남음 / 총 {preview.capacity}명</p>}</>:<>
  <GamePicker packs={packs} value={game} onChange={setGame} disabled={busy}/>
  <details className="room-options"><summary>더 설정 · 선택</summary>
   <fieldset className="room-modes"><legend>기록 방식</legend><label><input type="radio" name="record-mode" value="single" checked={mode==='single'} disabled={busy} onChange={()=>setMode('single')}/>한 기기에서 모두 기록</label><label><input type="radio" name="record-mode" value="invite" checked={mode==='invite'} disabled={busy} onChange={()=>setMode('invite')}/>초대로 함께 기록</label></fieldset>
   <label>{mode==='single'?'보드 이름':'방 이름'}<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="예: 토요일 게임"/></label><label>총 플레이어 수<input type="number" min={1} max={12} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
   {mode==='single'&&<PlayerRows game={game} fixedCount players={players.slice(0,capacity)} onChange={next=>setPlayers([...next,...players.slice(next.length)])}/>}
  </details>
 </>}
 {(joining?preview&&!preview.joined:mode==='invite')&&<><label>내 이름 · 선택<input maxLength={40} autoComplete="nickname" value={person} placeholder={joining?'비워두면 플레이어 번호':'플레이어 1'} onChange={e=>setPerson(e.target.value)}/></label><label>내 표시색<div className="room-color-row"><input type="color" aria-label="내 표시색" value={color} onChange={e=>setColor(e.target.value)}/>{COLORS.map(c=><button type="button" key={c} aria-label={`색상 ${c}`} aria-pressed={c===color} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></label></>}
 {error&&<p role="alert" className="inline-error">{error}</p>}<button className="button primary full" disabled={busy||!joining&&!game}>{busy?<Busy/>:joining?preview?preview.joined?'방 다시 열기':'참가':'방 확인':mode==='single'?'기록 시작':'방 만들기'}</button>
 </form></Modal>;
}
