import './lightweight-reader.css';
import type {LocalReaderSelection,LocalReaderTaskCapability} from '../shared/lightweightRecognition';
type Mode='existing'|'local'|'gemini'|'luna'|'terra';
const parse=(value:string):Mode=>value==='local'||value==='gemini'||value==='luna'||value==='terra'?value:'existing';
/** UI selection never writes credentials. One row = method + read; the rest opens on demand. */
export function LightweightReaderControls({mode,onMode,available,availabilityMessage,terraAvailable=false,terraReason,lunaAvailable=false,lunaReason,geminiAvailable=false,geminiReason,geminiModel,busy,hasDefinition,definitionLoading=false,definitionError='',supportedArea=true,hasPhotos,onRead,onFrame,frameConfirmed,existingAvailable=true,showReadButton=true,numericScope=false,task,onTask,numberCapability,inputMode='original',onInputMode,sceneReading=false,onSceneReading}:{sceneReading?:boolean;onSceneReading?:(enabled:boolean)=>void;mode:Mode;onMode:(mode:Mode)=>void;available:boolean;availabilityMessage?:string;terraAvailable?:boolean;terraReason?:string;lunaAvailable?:boolean;lunaReason?:string;geminiAvailable?:boolean;geminiReason?:string;geminiModel?:string;busy:boolean;hasDefinition:boolean;definitionLoading?:boolean;definitionError?:string;supportedArea?:boolean;hasPhotos:boolean;onRead:()=>void;onFrame?:()=>void;frameConfirmed?:boolean;existingAvailable?:boolean;showReadButton?:boolean;numericScope?:boolean;task?:LocalReaderSelection['task'];onTask?:(task:LocalReaderSelection['task'])=>void;numberCapability?:LocalReaderTaskCapability;inputMode?:LocalReaderSelection['inputMode'];onInputMode?:(mode:NonNullable<LocalReaderSelection['inputMode']>)=>void}){
 const local=mode==='local',gemini=mode==='gemini',luna=mode==='luna',terra=mode==='terra',hosted=gemini||luna||terra,scoped=local||hosted,numeric=local&&task==='catan-numerals-v1',numberReady=!!numberCapability?.available&&!!numberCapability.profile;
 const providerReady=terra?terraAvailable:luna?lunaAvailable:gemini?geminiAvailable:numeric?numberReady:available;
 const enabled=scoped?(numeric?numericScope&&numberReady&&(inputMode!=='catan-atlas'||!!frameConfirmed):providerReady)&&hasDefinition&&supportedArea&&!definitionLoading&&!definitionError:existingAvailable;
 const selector=available||terraAvailable||lunaAvailable||geminiAvailable||numberReady||scoped,read=hasPhotos&&showReadButton;
 if(!selector&&!read)return null;
 const name=terra?'Terra high':luna?'Luna high':gemini?'Gemini':'로컬 판독기';
 // Only a blocker is shown inline; how the reader works lives under "읽기 설정".
 const blocker=scoped?(definitionLoading?'촬영 정의를 준비하고 있어요…':definitionError||(!hasDefinition?'이 저장본의 판본·촬영 정의가 일치하지 않아 시작하지 않아요.':!supportedArea?'이 촬영 부분은 수동 기록·실물 보관만 지원해요.':!providerReady?(numeric?numberCapability?.reason||'숫자 전용 판독기가 준비되지 않았어요.':(terra?terraReason:luna?lunaReason:gemini?geminiReason:availabilityMessage)||`${name}에 연결할 수 없어요.`):undefined)):!existingAvailable&&read?'기존 AI 미연결 · 원본은 보관돼요.':undefined;
 return <section className="lightweight-reader is-compact" aria-label="사진 판독기">
 {read&&<div className="lw-bar"><button className="button secondary lw-read" disabled={busy||!enabled} onClick={onRead}>{numeric?'숫자만 읽기':'사진 읽기'}</button></div>}
 {blocker&&<p role="status" className="small">{blocker}{scoped?' 원본은 보관돼요.':''}</p>}
 {numeric&&!numericScope&&<p role="status" className="small">현재 게임·공용 판에서는 숫자 전용 판독을 사용할 수 없어요.</p>}
 {numeric&&inputMode==='catan-atlas'&&!frameConfirmed&&<p role="status" className="small">맞춘 판으로 읽으려면 현재 사진의 기준점을 먼저 확인해 주세요.</p>}
 {selector&&<details className="lw-more"><summary>읽기 설정</summary>
  <label className="field lw-method">사진 읽기 방식<select aria-label="사진 읽기 방식" value={mode} disabled={busy} onChange={e=>onMode(parse(e.target.value))}>{(terraAvailable||terra)&&<option value="terra">Terra high 판독</option>}<option value="existing">기존 AI</option><option value="local">로컬 경량 판독</option>{(geminiAvailable||gemini)&&<option value="gemini">Gemini 판독</option>}{(lunaAvailable||luna)&&<option value="luna">Luna high 판독</option>}</select></label>
  {hosted&&onSceneReading&&<label className="field"><input type="checkbox" checked={sceneReading} disabled={busy} onChange={e=>onSceneReading(e.target.checked)}/>구역·묶음 관계 함께 읽기</label>}
  {scoped&&<p className="small muted">{hosted?`${name}${gemini&&geminiModel?`(${geminiModel})`:''}는 선택한 현재 사진을 각각 읽어요. 읽은 내용은 기존 그림에 연결되고, 불확실한 값은 ‘?’와 원사진으로 남아요. 필요한 부분만 직접 고칠 수 있어요.`:'로컬 판독은 현재 촬영 단계의 사진을 읽어요. 후보는 필요하면 고친 뒤 직접 반영할 수 있어요.'}</p>}
  {local&&numericScope&&<><label className="field">판독할 항목<select aria-label="판독할 항목" value={task??'general'} disabled={busy} onChange={e=>onTask?.(e.target.value==='catan-numerals-v1'?'catan-numerals-v1':undefined)}><option value="general">일반 로컬 판독</option><option value="catan-numerals-v1">카탄 숫자만 읽기</option></select></label>{numeric&&<label className="field">숫자 판독 입력<select aria-label="숫자 판독 입력" value={inputMode} disabled={busy} onChange={e=>onInputMode?.(e.target.value==='catan-atlas'?'catan-atlas':'original')}><option value="original">원본으로 읽기</option><option value="catan-atlas">맞춘 판으로 읽기 (기준점 필요)</option></select></label>}</>}
  {onFrame&&hasPhotos&&<><button className="button secondary" disabled={busy||!hasDefinition||!supportedArea||definitionLoading||!!definitionError} onClick={onFrame}>{frameConfirmed?'사진 위치 다시 맞추기':'사진 위치 맞추기'}</button><p className="small muted">{frameConfirmed?'기준점을 확인했어요. 계산된 위치도 반영 전에 확인해 주세요.':'위치를 맞추지 않으면 읽은 값은 미배치 후보로 남아요.'}</p></>}
 </details>}
 </section>;
}
