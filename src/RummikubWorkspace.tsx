import type {NativeObservationReview,ObservationReviewAnswer} from '../shared/observationReview';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Camera,Check,Minus,Plus,Trash2,Undo2,ArrowLeft,ArrowRight,Image as ImageIcon,Maximize2} from 'lucide-react';
import type {Assertion,Evidence,SessionView} from '../shared/types';
import {allRummikubTiles,createRummikubTile,emptyRummikub,normalizeRummikubDetailed,recordRummikub,rummikubField,rummikubSourceEvidence,undoRummikub,type RummikubColor,type RummikubCommand,type RummikubHistory,type RummikubScene,type RummikubTile} from '../shared/rummikub';
import {CLASSIC_COLORS,RummikubBoardView,TileFace,boardStyle,colorNames,colors,groupName,isLegacyColor,pickRummikubSource,tileName} from './RummikubBoard';
import {Modal} from './ui';
import {api} from './api';
import {fire,type Mutate} from './Fields';
import {rummikubDraftAnswers,prepareRummikubReview,type RummikubSaveOptions} from './rummikubSavePolicy';
import './rummikub-workspace.css';

const keyOf=(scene:RummikubScene)=>JSON.stringify(scene);
const ZOOMS=[1,1.5,2,3] as const;
export interface RummikubWorkspaceProps {view:SessionView;ownerId?:string;busy:boolean;mutate:Mutate;onEvidence:(evidence:Evidence,region?:Assertion['region'])=>void;onReadyToSave?:(save:((options?:RummikubSaveOptions)=>Promise<void>)|null)=>void;onCapture?:()=>void;captureLabel?:string;hasPhotos?:boolean;onOpenPublic?:()=>void;onReread?:()=>void}

/** Dedicated ordered tile editor: does not normalize through ComponentScene/Catan geometry. */
export function RummikubWorkspace({view,ownerId,busy,mutate,onEvidence,onReadyToSave,onCapture,captureLabel,hasPhotos=false,onOpenPublic,onReread}:RummikubWorkspaceProps){
 const context=`${view.session.id}:${ownerId??'public'}`,field=rummikubField(ownerId);
 const evidence=rummikubSourceEvidence(view.session.evidence,ownerId);
 const evidenceKey=evidence.map(e=>e.id).join('|');
 const assertions=view.session.assertions.filter(a=>a.field===field&&a.ownerId===ownerId);
 const {accepted,candidate}=pickRummikubSource(assertions);
 const [showAccepted,setShowAccepted]=useState(false);
 const [review,setReview]=useState<{context:string;marker:NativeObservationReview;sourceKey:string}|null>(null);
 const source=showAccepted?accepted??candidate:candidate??accepted;
 const incoming=useMemo(()=>source?normalizeRummikubDetailed(source.value,{ownerId,evidenceIds:evidence.map(e=>e.id)}):{scene:emptyRummikub(ownerId),recognized:true,warnings:[] as string[]},[source?.value,context,evidenceKey]);
 const incomingKey=keyOf(incoming.scene);
 const [state,setState]=useState<{context:string;history:RummikubHistory;base:string}>({context,history:{past:[],present:incoming.scene},base:incomingKey});
 const [selectedId,setSelectedId]=useState<string|null>(null),[adding,setAdding]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false);
 const [draft,setDraft]=useState(()=>createRummikubTile('draft')),[target,setTarget]=useState<string>(''),[mergeTarget,setMergeTarget]=useState('');
 const openedAssertion=view.session.assertions.filter(a=>a.field==='opened'&&a.ownerId===ownerId&&a.status==='accepted').at(-1);
 const pendingAssertion=view.session.assertions.filter(a=>a.field==='pending'&&!a.ownerId&&a.status==='accepted').at(-1);
 const openedBase=typeof openedAssertion?.value==='boolean'?String(openedAssertion.value):'';
 const pendingBase=typeof pendingAssertion?.value==='string'?pendingAssertion.value:'';
 const [opened,setOpened]=useState(openedBase),[pending,setPending]=useState(pendingBase);
 const [focus,setFocus]=useState<string|null>(null),[full,setFull]=useState(false),[zoom,setZoom]=useState<number>(1.5);
 // Personal screen shows the shared table above the owner's own rack; other players' racks are never included.
 const publicPick=pickRummikubSource(ownerId?view.session.assertions.filter(a=>a.field===rummikubField()&&!a.ownerId):[]);
 const publicSource=publicPick.accepted??publicPick.candidate;
 const publicScene=useMemo(()=>publicSource?normalizeRummikubDetailed(publicSource.value,{evidenceIds:rummikubSourceEvidence(view.session.evidence).map(e=>e.id)}):null,[publicSource?.value,evidenceKey]);
 const scene=state.history.present,dirty=keyOf(scene)!==state.base;
 const acceptedScene=accepted?normalizeRummikubDetailed(accepted.value,{ownerId,evidenceIds:evidence.map(e=>e.id)}):null;
 const needsReview=!!candidate?.observationReceipts?.length&&!!acceptedScene?.recognized&&allRummikubTiles(acceptedScene.scene).length>0;
 const reviewing=review?.context===context?review:null;
 const forceSave=!!reviewing||!!source&&source.status!=='accepted'&&!showAccepted&&incoming.recognized&&!needsReview;
 const contextDirty=ownerId?opened!==openedBase:pending!==pendingBase;
 const privacyLocked=!!ownerId&&!!view.privacy?.protectedOwnerIds.includes(ownerId)&&!view.privacy?.unlockedOwnerIds.includes(ownerId);
 const all=allRummikubTiles(scene),selected=all.find(t=>t.id===selectedId);
 const selectedGroup=selected?scene.groups.find(g=>g.tiles.some(t=>t.id===selected.id)):undefined;
 const selectedList=selectedGroup?.tiles??scene.loose,index=selectedList.findIndex(t=>t.id===selectedId);
 const blocked=busy||saving||privacyLocked||state.context!==context;
 const inFlight=useRef<Promise<void>|null>(null);
 useEffect(()=>{
  if(state.context!==context){setState({context,history:{past:[],present:incoming.scene},base:incomingKey});setSelectedId(null);setAdding(false);setFocus(null);setFull(false);setOpened(openedBase);setPending(pendingBase);setShowAccepted(false);setReview(null);setError('');return;}
  if(!reviewing&&!dirty&&incoming.recognized&&incomingKey!==state.base)setState({context,history:{past:[],present:incoming.scene},base:incomingKey});
 },[context,incomingKey]);
 useEffect(()=>{if(!contextDirty){setOpened(openedBase);setPending(pendingBase);}},[openedBase,pendingBase]);
 function change(cmd:RummikubCommand){if(blocked)return;try{const history=recordRummikub(state.history,cmd);setState({...state,history});setError('');setSaved(false);}catch(reason){setError(reason instanceof Error?reason.message:'타일을 바꾸지 못했어요.');}}
 function startReview(){
  if(blocked||dirty||contextDirty||!candidate||!acceptedScene?.recognized)return;
  try{const fresh=normalizeRummikubDetailed(candidate.value,{ownerId,evidenceIds:evidence.map(e=>e.id)});if(!fresh.recognized)throw Error('새 타일 기록 형식을 확인해 주세요.');const combined=prepareRummikubReview(acceptedScene.scene,fresh.scene);setReview({context,marker:{version:'native-observation-review-v1',sourceAssertionId:candidate.id,expectedBaselineAssertionId:accepted?.id??null},sourceKey:JSON.stringify(candidate.value)});setState({context,history:{past:[],present:combined},base:keyOf(combined)});setSelectedId(null);setFocus(null);setError('');setSaved(false);}catch(e){setError(e instanceof Error?e.message:'기존 판과 함께 정정하지 못했어요.');}
 }
 async function flush(options:RummikubSaveOptions={}){
  if(inFlight.current)return inFlight.current;
  if(privacyLocked||state.context!==context)throw new Error('개인 영역을 다시 열어 주세요.');
  const snapshot=scene;let answers:ObservationReviewAnswer[];
  try{answers=rummikubDraftAnswers({scene:snapshot,ownerId,dirty,candidate:forceSave,requiresReview:needsReview&&!showAccepted,observationReview:reviewing?.marker,opened:{value:opened,saved:openedBase},pending:{value:pending,saved:pendingBase}},options);
  if(!answers.length)return;
  if(reviewing&&answers.some(a=>a.field===field)&&((accepted?.id??null)!==reviewing.marker.expectedBaselineAssertionId||candidate?.id!==reviewing.marker.sourceAssertionId||JSON.stringify(candidate.value)!==reviewing.sourceKey))throw Error('기존 판이나 새 사진 후보가 바뀌었어요. 현재 정정 초안은 유지됩니다. 새 기록을 확인해 주세요.');
  if(!incoming.recognized)throw new Error('기존 타일 기록 형식을 확인해 주세요.');
  }catch(reason){setError(reason instanceof Error?reason.message:'정정 초안을 저장하지 못했어요.');throw reason;}
  setSaving(true);setError('');
  const task=(async()=>{try{await mutate(()=>api.update(view.session.id,{answers}));setState(current=>({...current,base:keyOf(snapshot)}));setReview(null);setSaved(true);}catch(reason){setError(reason instanceof Error?reason.message:'타일을 기록하지 못했어요. 다시 저장해 주세요.');throw reason;}finally{setSaving(false);inFlight.current=null;}})();
  inFlight.current=task;return task;
 }
 useEffect(()=>{onReadyToSave?.(!privacyLocked&&(dirty||forceSave||contextDirty)?flush:null);return()=>onReadyToSave?.(null);});
 if(privacyLocked)return <section className="rt-workspace"><p>PIN을 입력하면 내 받침대를 볼 수 있어요.</p></section>;
 if(state.context!==context)return null;
 if(!incoming.recognized)return <section className="rt-workspace"><p role="alert">기존 타일 기록 형식을 읽지 못했어요. 원본은 그대로 남아 있어요.</p></section>;
 const rack=!!ownerId;
 const focusIndex=focus&&focus!=='loose'?scene.groups.findIndex(g=>g.id===focus):-1;
 const focusGroup=focusIndex>=0?scene.groups[focusIndex]:undefined;
 const sheetOpen=focus==='loose'||!!focusGroup;
 const sheetTiles=focus==='loose'?scene.loose:focusGroup?.tiles??[];
 function openGroup(id:string){setFocus(id);setSelectedId(null);setAdding(false);setTarget(id==='loose'?'':id);setFull(false);setError('');}
 function closeSheet(){setFocus(null);setSelectedId(null);setAdding(false);}
 function newGroup(){const id=crypto.randomUUID();change({type:'group',id});setFocus(id);setTarget(id);setSelectedId(null);setAdding(true);setFull(false);}
 function addTile(){const id=crypto.randomUUID();change({type:'add',tile:{...draft,id},groupId:target||null});setSelectedId(id);setAdding(false);}
 function patch(patch:Partial<Omit<RummikubTile,'id'>>){if(selected)change({type:'edit',tileId:selected.id,patch});else setDraft(d=>({...d,...patch}));}
 const editing=selected??draft;
 const status=needsReview&&!reviewing&&!showAccepted?'새 사진 결과예요 · 기존 판과 함께 정정한 뒤 반영해 주세요':reviewing&&!dirty?'기존 판과 새 사진 후보를 함께 확인 중이에요 · 중복 실물은 직접 빼고 저장해 주세요':dirty||contextDirty?'고친 내용이 있어요':forceSave?'사진에서 읽은 후보예요 · 저장하면 기록돼요':saved?'저장했어요':'';
 const zoomIndex=ZOOMS.indexOf(zoom as typeof ZOOMS[number]);
 const baseTile=rack?42:28;
 return <section className="rt-workspace" aria-label={rack?'내 루미큐브 받침대':'루미큐브 공용판'}>
  {rack&&publicScene?.recognized&&<details className="rt-overview"><summary>공용판 보기</summary><div className="rt-heading"><h3>공용판</h3>{onOpenPublic&&<button className="button text small-button" disabled={blocked} onClick={onOpenPublic}>공용판으로</button>}</div>{allRummikubTiles(publicScene.scene).length?<div style={boardStyle(22)}><RummikubBoardView scene={publicScene.scene} rack={false} compact/></div>:<p className="small muted">아직 놓인 타일이 없어요.</p>}</details>}
  {needsReview&&!reviewing&&<button className="button secondary small-button" disabled={blocked||dirty||contextDirty} onClick={startReview}>기존 판과 함께 정정</button>}
  <header className="rt-heading"><h3>{rack?'내 받침대':'공용판'}</h3><div className="button-row">
   {source&&source.status!=='accepted'&&!showAccepted&&accepted&&<button className="button text small-button" disabled={blocked||dirty} onClick={()=>{setReview(null);setShowAccepted(true);}}>이전 기록 보기</button>}
   {showAccepted&&candidate&&<button className="button text small-button" disabled={blocked||dirty} onClick={()=>{setReview(null);setShowAccepted(false);}}>새 사진 결과 보기</button>}
   {onReread&&<button className="button text small-button" disabled={blocked} onClick={onReread}>다시 읽기</button>}
   <button className="icon-button" aria-label="타일 변경 되돌리기" disabled={blocked||!state.history.past.length} onClick={()=>{setState({...state,history:undoRummikub(state.history)});setError('');setSaved(false);}}><Undo2 size={18}/></button>
   {all.length>0&&<button className="button secondary small-button" disabled={blocked} onClick={()=>setFull(true)}><Maximize2 size={16}/>크게 보기</button>}
  </div></header>
  {dirty&&incomingKey!==state.base&&<p role="status" className="small muted">편집 중인 타일을 유지하고 있어요.</p>}
  {incoming.warnings.length>0&&<details className="rt-notes"><summary>사진 판독 확인</summary>{incoming.warnings.map(w=><p key={w}>{w}</p>)}</details>}
  {all.length||scene.groups.length?<div className="rt-board" style={boardStyle(baseTile)}><RummikubBoardView scene={scene} rack={rack} disabled={blocked} onOpenGroup={openGroup} onAddGroup={newGroup}/></div>
   :<div className="rt-empty-board"><p className="rt-empty-title">{hasPhotos?'타일을 놓아 주세요':rack?'내 받침대를 찍어 주세요':'판을 찍어 주세요'}</p><div className="button-row">{onCapture&&<button className="button primary" disabled={blocked} onClick={onCapture}><Camera size={18}/>{captureLabel??(rack?'받침대 찍기':'판 찍기')}</button>}<button className="button secondary" disabled={blocked} onClick={newGroup}><Plus size={17}/>직접 놓기</button></div></div>}
  <details className="rt-notes"><summary>{rack?'최초 등록 · 선택':'재배열 메모 · 선택'}</summary>{rack?<label>최초 등록<select value={opened} disabled={blocked} onChange={e=>setOpened(e.target.value)}><option value="">모름</option><option value="true">등록함</option><option value="false">아직</option></select></label>:<label>멈춘 지점<textarea value={pending} disabled={blocked} placeholder="예: 조커를 옮기는 중" onChange={e=>setPending(e.target.value)}/></label>}</details>
  {error&&!sheetOpen&&<p role="alert" className="rt-error">{error}</p>}
  {status&&<p className="rt-status small muted" role="status">{status}</p>}
  {full&&overlay(<Modal title={rack?'내 받침대 크게 보기':'공용판 크게 보기'} wide onClose={()=>setFull(false)}><div className="modal-body rt-full">
   <div className="rt-zoom" role="group" aria-label="확대·축소"><button className="icon-button" aria-label="축소" disabled={zoomIndex<=0} onClick={()=>setZoom(ZOOMS[Math.max(0,zoomIndex-1)])}><Minus size={18}/></button><span aria-live="polite">{Math.round(zoom*100)}%</span><button className="icon-button" aria-label="확대" disabled={zoomIndex>=ZOOMS.length-1} onClick={()=>setZoom(ZOOMS[Math.min(ZOOMS.length-1,zoomIndex+1)])}><Plus size={18}/></button></div>
   <div className="rt-pan" tabIndex={0} aria-label="가로·세로로 밀어 보기"><div className="rt-board" style={{...boardStyle(Math.round(baseTile*zoom)),width:`${Math.round(360*zoom)}px`}}><RummikubBoardView scene={scene} rack={rack} disabled={blocked} onOpenGroup={openGroup}/></div></div>
  </div></Modal>)}
  {sheetOpen&&overlay(<Modal title={focus==='loose'?'따로 둔 타일':groupName(focusGroup,focusIndex,rack)} onClose={closeSheet}><div className="modal-body rt-sheet">
   <div className="rt-sheet-tiles" aria-label="타일 순서">{sheetTiles.map((tile,i)=><TileButton key={tile.id} tile={tile} position={i} selected={selectedId===tile.id} disabled={blocked} onClick={()=>{setSelectedId(tile.id);setAdding(false);}}/>)}<button type="button" className="rt-sheet-add" aria-label="타일 추가" aria-pressed={adding} disabled={blocked} onClick={()=>{setSelectedId(null);setTarget(focus==='loose'?'':focus!);setAdding(true);}}><Plus size={22}/></button></div>
   {focusGroup&&!selected&&!adding&&<div className="rt-sheet-group"><button className="button secondary small-button" disabled={blocked||focusIndex===0} onClick={()=>change({type:'reorder-group',groupId:focusGroup.id,index:focusIndex-1})}><ArrowLeft size={15}/>{rack?'위 줄로':'앞 묶음으로'}</button><button className="button secondary small-button" disabled={blocked||focusIndex===scene.groups.length-1} onClick={()=>change({type:'reorder-group',groupId:focusGroup.id,index:focusIndex+1})}>{rack?'아래 줄로':'뒤 묶음으로'}<ArrowRight size={15}/></button>
    {scene.groups.length>1&&<div className="rt-merge"><select aria-label="합칠 묶음" value={mergeTarget} disabled={blocked} onChange={e=>setMergeTarget(e.target.value)}><option value="">뒤에 붙일 곳</option>{scene.groups.filter(g=>g.id!==focusGroup.id).map(g=><option key={g.id} value={g.id}>{groupName(g,scene.groups.indexOf(g),rack)}</option>)}</select><button className="button secondary small-button" disabled={blocked||!mergeTarget} onClick={()=>{const to=mergeTarget;change({type:'merge',fromId:focusGroup.id,toId:to});setMergeTarget('');setFocus(to);}}>합치기</button></div>}</div>}
   {(selected||adding)&&<div className="rt-inspector" aria-label={selected?'선택한 타일':'타일 추가'}>
    <NumberGrid value={editing.kind==='number'?editing.number:null} kind={editing.kind} disabled={blocked} onNumber={number=>patch({kind:'number',number})} onKind={kind=>patch({kind})}/>
    <ColorChips value={editing.color} disabled={blocked} onChange={color=>patch({color})}/>
    <div className="rt-input-row"><label>앞·뒤<select value={editing.face} disabled={blocked} onChange={e=>patch({face:e.target.value as RummikubTile['face']})}><option value="front">앞면</option><option value="back">뒷면</option><option value="unknown">모름</option></select></label><label>{selected?'옮길 곳':'놓을 곳'}<select aria-label="타일 묶음 선택" disabled={blocked} value={selected?selectedGroup?.id??'':target} onChange={e=>{if(selected){const g=scene.groups.find(g=>g.id===e.target.value);if((selectedGroup?.id??'')!==e.target.value){change({type:'move',tileId:selected.id,groupId:e.target.value||null,index:g?.tiles.length??scene.loose.length});setFocus(e.target.value||'loose');}}else setTarget(e.target.value);}}><option value="">따로 두기</option>{scene.groups.map((g,i)=><option value={g.id} key={g.id}>{groupName(g,i,rack)}</option>)}</select></label></div>
    {editing.kind==='joker'&&<details className="rt-notes"><summary>조커가 대신하는 값 · 선택</summary><label>대신하는 숫자<NumberSelect value={editing.representedNumber} disabled={blocked} onChange={representedNumber=>patch({representedNumber})}/></label><ColorChips label="대신하는 색" value={editing.representedColor} disabled={blocked} onChange={representedColor=>patch({representedColor})}/></details>}
    {!selected?<button className="button primary full" disabled={blocked} onClick={addTile}><Plus size={16}/>타일 추가</button>:<><div className="button-row"><button className="button secondary small-button" disabled={blocked||index<=0} onClick={()=>change({type:'move',tileId:selected.id,groupId:selectedGroup?.id??null,index:index-1})}><ArrowLeft size={16}/>앞으로</button><button className="button secondary small-button" disabled={blocked||index>=selectedList.length-1} onClick={()=>change({type:'move',tileId:selected.id,groupId:selectedGroup?.id??null,index:index+1})}>뒤로<ArrowRight size={16}/></button>{selectedGroup&&index>0&&<button className="button secondary small-button" disabled={blocked} onClick={()=>{const id=crypto.randomUUID();change({type:'split',groupId:selectedGroup.id,index,newGroupId:id});setFocus(id);}}>여기서 나누기</button>}<button className="button text small-button" disabled={blocked} onClick={()=>{change({type:'remove',tileId:selected.id});setSelectedId(null);}}><Trash2 size={15}/>빼기</button></div>
    {selected.evidenceIds.map((id,i)=>{const source=evidence.find(e=>e.id===id);return source?<button className="button text small-button" key={id} disabled={blocked} onClick={()=>onEvidence(source,i===0?selected.region??undefined:undefined)}><ImageIcon size={15}/>{i===0&&selected.region?'타일 원본 영역':'근거 원본 보기'}</button>:null;})}</>}
   </div>}
   {error&&<p role="alert" className="rt-error">{error}</p>}
   <button className="button primary full rt-sheet-done" onClick={closeSheet}><Check size={17}/>완료</button>
  </div></Modal>)}
 </section>;
}
// Dialogs render on document.body so no board layer (rack ledges, transformed panels) can stack above them.
function overlay(node:ReactNode){return typeof document==='undefined'?null:createPortal(node,document.body);}
function TileButton({tile,position,selected,disabled,onClick}:{tile:RummikubTile;position:number;selected:boolean;disabled:boolean;onClick:()=>void}){return <button type="button" className={`rt-tile${selected?' selected':''}`} aria-pressed={selected} aria-label={`${tileName(tile)}, ${position+1}번째 타일`} disabled={disabled} onClick={onClick}><TileFace tile={tile}/></button>;}
function NumberGrid({value,kind,disabled,onNumber,onKind}:{value:number|null;kind:RummikubTile['kind'];disabled:boolean;onNumber:(value:number|null)=>void;onKind:(kind:RummikubTile['kind'])=>void}){return <div className="rt-numbers" role="group" aria-label="숫자">{Array.from({length:13},(_,i)=><button type="button" key={i+1} aria-pressed={kind==='number'&&value===i+1} disabled={disabled} onClick={()=>onNumber(i+1)}>{i+1}</button>)}<button type="button" aria-pressed={kind==='number'&&value===null} aria-label="숫자 모름" disabled={disabled} onClick={()=>onNumber(null)}>?</button><button type="button" aria-pressed={kind==='joker'} disabled={disabled} onClick={()=>onKind('joker')}>조커</button><button type="button" aria-pressed={kind==='unknown'} aria-label="종류 모름" disabled={disabled} onClick={()=>onKind('unknown')}>모름</button></div>;}
function NumberSelect({value,disabled,onChange}:{value:number|null;disabled:boolean;onChange:(value:number|null)=>void}){return <select value={value??''} disabled={disabled} onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}><option value="">모름</option>{Array.from({length:13},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select>;}
// New choices offer the four Classic colors only; a stored legacy color stays visible until the user explicitly picks another.
function ColorChips({value,disabled,onChange,label='색'}:{value:RummikubColor|null;disabled:boolean;onChange:(value:RummikubColor|null)=>void;label?:string}){return <fieldset className="rt-colors"><legend>{label}</legend>{CLASSIC_COLORS.map(color=><button type="button" key={color} aria-pressed={value===color} aria-label={colorNames[color]} disabled={disabled} onClick={()=>onChange(color)}><span style={{background:colors[color]}} aria-hidden="true"/>{colorNames[color]}</button>)}<button type="button" aria-pressed={value===null} disabled={disabled} onClick={()=>onChange(null)}>모름</button>{isLegacyColor(value)&&<span className="rt-legacy-color" role="status"><span style={{background:colors[value!]}} aria-hidden="true"/>{colorNames[value!]} · 색 확인 필요</span>}</fieldset>;}
