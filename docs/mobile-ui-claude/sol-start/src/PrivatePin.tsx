import {useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import type {SessionView} from '../shared/types';
import {api} from './api';
import type {Mutate} from './Fields';
import './private-pin.css';
/** Optional 4-digit lock: only owners who set a PIN are locked. Changing or removing an existing PIN still needs the current PIN. */
export function PrivatePin({view,ownerId,busy,mutate,beforeChange}:{view:SessionView;ownerId:string;busy:boolean;mutate:Mutate;beforeChange:()=>Promise<void>}){
 const setup=!!view.privacy?.setupRequiredOwnerIds?.includes(ownerId);
 const protectedNow=!setup&&!!view.privacy?.protectedOwnerIds.includes(ownerId),locked=protectedNow&&!view.privacy?.unlockedOwnerIds.includes(ownerId);
 const [mode,setMode]=useState<'idle'|'set'|'change'|'remove'>('idle'),[pin,setPin]=useState(''),[current,setCurrent]=useState(''),[error,setError]=useState(''),[waiting,setWaiting]=useState(false);
 const digits=(value:string)=>value.replace(/\D/g,'').slice(0,4);
 const pending=busy||waiting;
 const reset=(next:typeof mode='idle')=>{setMode(next);setPin('');setCurrent('');setError('');};
 const entry=(label:string,value:string,onChange:(value:string)=>void,isNew=false)=><label>{label}<input aria-label={label} type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete={isNew?'new-password':'current-password'} value={value} required disabled={pending} onChange={event=>onChange(digits(event.target.value))}/></label>;
 async function submit(){
  setWaiting(true);setError('');
  try{if(setup){if(!/^\d{4}$/.test(pin))throw new Error('숫자 4자리를 입력해 주세요.');await mutate(()=>api.configurePrivate(view.session.id,ownerId,{enabled:true,pin}),undefined,{localError:true});setPin('');}
   else if(locked){if(!/^\d{4}$/.test(pin))throw new Error('숫자 4자리를 입력해 주세요.');await mutate(()=>api.unlockPrivate(view.session.id,ownerId,pin),undefined,{localError:true});}
   else{const enabled=mode!=='remove';if(enabled&&!/^\d{4}$/.test(pin)||protectedNow&&!/^\d{4}$/.test(current))throw new Error('숫자 4자리를 입력해 주세요.');await beforeChange();await mutate(()=>api.configurePrivate(view.session.id,ownerId,{enabled,pin:enabled?pin:undefined,currentPin:protectedNow?current:undefined}),undefined,{localError:true});reset();}
  }catch(reason){setError(reason instanceof Error?reason.message:'다시 입력해 주세요.');}finally{setWaiting(false);}
 }
 return <section className={`private-pin ${locked?'is-locked':''} ${!setup&&!locked&&mode==='idle'?'is-quiet':''}`} aria-label="개인 정보 보호"><form onSubmit={event=>{event.preventDefault();void submit();}}>
  {setup?<><h3><LockKeyhole size={18}/>개인 기록 전에 PIN을 설정해 주세요</h3>{entry('새 비밀번호 4자리',pin,setPin,true)}<button className="button primary" disabled={pending}>설정</button></>
  :locked?<><h3><LockKeyhole size={18}/>개인 정보가 잠겨 있어요</h3>{entry('4자리 비밀번호',pin,setPin)}<button className="button primary" disabled={pending}>열기</button></>
  :mode==='idle'?(protectedNow?<><span className="pin-state"><LockKeyhole size={16}/>비밀번호로 보호 중</span><button className="button text small-button" type="button" disabled={pending} onClick={()=>reset('change')}>변경</button><button className="button text small-button" type="button" disabled={pending} onClick={()=>reset('remove')}>해제</button></>
   :<><button className="button text small-button" type="button" aria-expanded={false} disabled={pending} onClick={()=>reset('set')}><LockKeyhole size={16}/>비밀번호 걸기</button><span className="small muted">{view.roomAccess?'이 기기에서 내 정보를 추가로 잠가요.':'걸지 않으면 이 보드를 여는 사람이 볼 수 있어요.'}</span></>)
  :<div className="pin-edit">{protectedNow&&entry('현재 비밀번호',current,setCurrent)}{mode!=='remove'&&entry('새 비밀번호 4자리',pin,setPin,true)}<button className="button secondary small-button" disabled={pending}>{mode==='remove'?'보호 해제':'설정'}</button><button className="button text small-button" type="button" disabled={pending} onClick={()=>reset()}>취소</button></div>}
  {error&&<p role="alert" className="inline-error">{error}</p>}
 </form></section>;
}
