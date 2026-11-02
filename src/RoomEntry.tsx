import {useState} from 'react';
import type {GameCatalogEntry} from '../shared/gameEssentials';
import type {SessionView} from '../shared/types';
import {api} from './api';
import {GamePicker} from './GamePicker';
import {Modal,Busy} from './ui';
import './rooms.css';
import {SceneWorkspace} from './SceneWorkspace';
import {RummikubBoardView,boardStyle,pickRummikubSource} from './RummikubBoard';
import {normalizeRummikubDetailed} from '../shared/rummikub';
import {GameBoardRecord} from './GameBoardRecord';
import type {GenericRecord} from '../shared/genericRecord';
import {previewValue} from './presentation';
import {PlayerRows} from './Dialogs';
import {creationPlayers} from './creationPlayers';
import {preferredPublicBoard} from './genericDraft';
import {RoomPublicHoldings} from './GameEssentials';
import {realBoardVariantForValue,useRealAssets} from './realBoards';
const COLORS=['#c65d4b','#6285aa','#d5a44d','#78967a','#997ba6','#b68a64'];
export function RoomPublicBoard({view}:{view:SessionView}){const [key,setKey]=useState('');const fields=view.pack.fields.filter(f=>f.scope==='public'),boards=fields.filter(f=>view.pack.runtime?.fieldBindings.some(b=>b.key===f.key&&b.editor==='component-catalog')),field=preferredPublicBoard(boards,view.session,key);const assets=useRealAssets(view.pack.runtime?.source.gameId);const selector=assets?.variantSelector&&field&&assets.variantSelector.boardField===field.key?assets.variantSelector:undefined;const age=view.session.assertions.filter(a=>a.field===selector?.field&&!a.ownerId&&a.status==='accepted').at(-1)?.value;const layoutVariant=selector?realBoardVariantForValue(selector,field!.key,age):'base';const pick=pickRummikubSource(view.session.assertions.filter(a=>a.field==='table.scene'&&!a.ownerId)),source=pick.candidate??pick.accepted,scene=source?normalizeRummikubDetailed(source.value).scene:null;
 return <section className="room-public" aria-label="공용 보드 읽기 전용"><h3>공용 보드 <span className="small muted">보기 전용</span></h3>{view.pack.id==='rummikub'?scene?<div className="rt-board" style={boardStyle(28)}><RummikubBoardView scene={scene} rack={false}/></div>:<p>방장이 공용판을 기록하면 여기에 보여요.</p>:view.pack.runtime?.support.recording==='generic'?<>{boards.length>1&&<label>공용 영역<select value={field?.key} onChange={e=>setKey(e.target.value)}>{boards.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select></label>}{field&&(()=>{const a=view.session.assertions.filter(a=>a.field===field.key&&!a.ownerId&&a.status==='accepted').at(-1);return a?<GameBoardRecord players={view.session.players.length} playerDetails={view.session.players} pack={view.pack} fieldKey={field.key} record={a.value as unknown as GenericRecord} readonly busy={false} layoutVariant={layoutVariant}/>:<p>아직 기록한 구성물이 없어요.</p>;})()}</>:<div inert className="room-readonly"><SceneWorkspace view={view} busy mutate={async()=>{throw new Error('공용판은 보기 전용이에요.');}} onEvidence={()=>{}}/></div>}
 {fields.filter(f=>f.type!=='json').map(f=>{const a=view.session.assertions.filter(a=>a.field===f.key&&!a.ownerId&&a.status==='accepted').at(-1);return a?<p key={f.key}><strong>{f.label}</strong> · {previewValue(a.value,f,view.session.players)}</p>:null;})}{view.session.notes.public&&<p>{view.session.notes.public}</p>}<RoomPublicHoldings view={view} ownerId={view.roomAccess?.playerId} busy={false}/></section>;
}
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
export function RoomInvite({id,onClose}:{id:string;onClose:()=>void}){const [invite,setInvite]=useState<{token:string;code:string}|null>(null),[error,setError]=useState(''),[copied,setCopied]=useState(false);return <Modal title="친구 초대" onClose={onClose}><div className="modal-body form-stack">{!invite?<button className="button primary" onClick={()=>void api.roomInvite(id).then(setInvite).catch(e=>setError(e.message))}>초대 코드 보기</button>:<><p className="room-code">{invite.code.slice(0,4)}-{invite.code.slice(4)}</p><button className="button primary" onClick={()=>void navigator.clipboard.writeText(`${location.origin}/#join=${invite.token}`).then(()=>setCopied(true)).catch(()=>setError('아래 코드를 직접 전달해 주세요.'))}>{copied?'링크 복사했어요':'초대 링크 복사'}</button><p className="small muted">받은 사람이 자기 이름과 색으로 참가해요.</p></>}{error&&<p role="alert">{error}</p>}</div></Modal>;}
export function RoomProfile({view,onClose,onSave}:{view:SessionView;onClose:()=>void;onSave:(name:string,color:string)=>Promise<void>}){const p=view.session.players.find(p=>p.id===view.roomAccess!.playerId)!;const [name,setName]=useState(p.name),[color,setColor]=useState(p.color),[busy,setBusy]=useState(false),[error,setError]=useState('');return <Modal title="내 이름과 색" onClose={onClose}><form className="modal-body form-stack" onSubmit={e=>{e.preventDefault();setBusy(true);void onSave(name,color).then(onClose).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}><label>내 이름 · 선택<input maxLength={40} placeholder={`플레이어 ${view.session.players.findIndex(player=>player.id===p.id)+1}`} value={name} onChange={e=>setName(e.target.value)}/></label><label>내 표시색<input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy}>반영</button></form></Modal>;}
