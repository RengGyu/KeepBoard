import {useState} from 'react';
import {LockKeyhole} from 'lucide-react';
import type {SessionView} from '../shared/types';
import {api} from './api';
import type {Mutate} from './Fields';
import './private-pin.css';
export function PrivatePin({view,ownerId,busy,mutate,beforeChange}:{view:SessionView;ownerId:string;busy:boolean;mutate:Mutate;beforeChange:()=>Promise<void>}){
 const protectedNow=!!view.privacy?.protectedOwnerIds.includes(ownerId),locked=protectedNow&&!view.privacy?.unlockedOwnerIds.includes(ownerId);
 const [enabled,setEnabled]=useState(protectedNow),[changing,setChanging]=useState(false),[pin,setPin]=useState(''),[current,setCurrent]=useState(''),[error,setError]=useState(''),[waiting,setWaiting]=useState(false);
 const digits=(value:string)=>value.replace(/\D/g,'').slice(0,4);
 const pending=busy||waiting;
 const entry=(label:string,value:string,onChange:(value:string)=>void,isNew=false)=><label>{label}<input aria-label={label} type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete={isNew?'new-password':'current-password'} value={value} required disabled={pending} onChange={event=>onChange(digits(event.target.value))}/></label>;
 async function submit(){
  setWaiting(true);setError('');
  try{if(locked){if(!/^\d{4}$/.test(pin))throw new Error('숫자 4자리를 입력해 주세요.');await mutate(()=>api.unlockPrivate(view.session.id,ownerId,pin),undefined,{localError:true});}
   else{if(enabled&&!/^\d{4}$/.test(pin)||protectedNow&&!/^\d{4}$/.test(current))throw new Error('숫자 4자리를 입력해 주세요.');await beforeChange();await mutate(()=>api.configurePrivate(view.session.id,ownerId,{enabled,pin:enabled?pin:undefined,currentPin:protectedNow?current:undefined}),undefined,{localError:true});setPin('');setCurrent('');setChanging(false);}
  }catch(reason){setError(reason instanceof Error?reason.message:'다시 입력해 주세요.');}finally{setWaiting(false);}
 }
 return <section className={`private-pin ${locked?'is-locked':''}`} aria-label="개인 정보 보호"><form onSubmit={event=>{event.preventDefault();void submit();}}>
  {locked?<><h3><LockKeyhole size={18}/>개인 정보가 잠겨 있어요</h3>{entry('4자리 비밀번호',pin,setPin)}<button className="button primary" disabled={pending}>열기</button></>:<><label className="pin-checkbox"><input type="checkbox" checked={enabled} disabled={pending} onChange={event=>{setEnabled(event.target.checked);setChanging(false);setPin('');setCurrent('');setError('');}}/>4자리 비밀번호 설정</label>
  {protectedNow&&enabled&&!changing&&<button className="button text small-button" type="button" disabled={pending} onClick={()=>setChanging(true)}>비밀번호 변경</button>}
  {(enabled!==protectedNow||changing)&&<div className="pin-edit">{protectedNow&&entry('현재 비밀번호',current,setCurrent)}{enabled&&entry('새 비밀번호 4자리',pin,setPin,true)}<button className="button secondary small-button" disabled={pending}>{enabled?'설정':'보호 해제'}</button></div>}</>}
  {error&&<p role="alert" className="inline-error">{error}</p>}
 </form></section>;
}
