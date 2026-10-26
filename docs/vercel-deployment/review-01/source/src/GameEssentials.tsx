import {GameDetailFields} from './readouts/GameDetailFields';
import {GameDetailReadout} from './readouts/GameDetailReadout';
import {readoutDefinition,readoutForGameComponent,canRelinkReadoutEvidence} from '../shared/readouts/registry';
import {readoutReferrers} from '../shared/readouts/relations';
import {useEffect,useRef,useState} from 'react';
import type {Assertion,Evidence,FieldDefinition,SessionView,Value} from '../shared/types';
import {runtimeBinding} from '../shared/gameEssentials';
import {emptyGenericRecord,type GenericPiece,type GenericRecord} from '../shared/genericRecord';
import {api} from './api';
import {latestSnapshot} from '../shared/rooms';
import {FieldEditor,CandidateRow,fire,type Mutate} from './Fields';
import {GameBoardRecord} from './GameBoardRecord';
import {PreservationItem,restoreOrder} from './Packing';
import {loadArtMapping} from './artLoader';
import {artVariantLabel,type ArtMapping} from './artResolver';
import './game-essentials.css';
import {Modal} from './ui';
import {recognitionCapability} from '../shared/recognition';
import {GenericPieceArt} from './GenericPieceArt';
import {genericDraftConflict,preferredPublicBoard} from './genericDraft';
import {SplendorReadout} from './SplendorReadout';
import {SplendorFields,isSplendor,readoutForComponent,splendorView} from './SplendorEditor';

interface Props {view:SessionView;ownerId?:string;busy:boolean;mutate:Mutate;onEvidence:(e:Evidence,region?:Assertion['region'])=>void;onReadyToSave?:(save:(()=>Promise<void>)|null)=>void}
export function GameEssentials({view,ownerId,busy,mutate,onEvidence,onReadyToSave}:Props){
 const {pack,session}=view,runtime=pack.runtime,saves=useRef(new Map<string,()=>Promise<void>>());
 const [boardKey,setBoardKey]=useState(()=>preferredPublicBoard(pack.fields.filter(f=>f.scope===(ownerId?'player':'public')&&runtimeBinding(pack,f.key)?.editor==='component-catalog'),session,'',ownerId)?.key??''),[boardError,setBoardError]=useState('');
 const [review,setReview]=useState<Assertion|null>(null),[expanded,setExpanded]=useState<string[]>([]);
 useEffect(()=>{onReadyToSave?.(async()=>{for(const save of [...saves.current.values()])await save();});return()=>onReadyToSave?.(null);});
 if(!runtime)return null;
 const generic=runtime.support.recording==='generic';
 const locked=ownerId&&view.privacy?.protectedOwnerIds.includes(ownerId)&&!view.privacy?.unlockedOwnerIds.includes(ownerId);if(locked)return null;
 const fields=pack.fields.filter(f=>f.scope===(ownerId?'player':'public')&&runtimeBinding(pack,f.key)&&!['native','opaque-preserve','physical-only'].includes(runtimeBinding(pack,f.key)!.editor));
 const boardFields=fields.filter(f=>runtimeBinding(pack,f.key)?.editor==='component-catalog');
 const activeBoard=boardFields.find(f=>f.key===boardKey)??boardFields[0];
 const allCandidates=session.assertions.filter(a=>a.ownerId===ownerId&&a.status==='candidate'&&fields.some(f=>f.key===a.field));
 const {latest:candidates,older:olderCandidates}=splitCandidates(allCandidates);
 async function applyCandidate(a:Assertion,value:Value){if(saves.current.has(`${ownerId??'public'}:${a.field}`))throw new Error('같은 영역을 편집 중이에요. 먼저 기록하거나 초안을 되돌려 주세요.');if(!session.assertions.some(x=>x.id===a.id&&x.status==='candidate'))throw new Error('후보가 바뀌었어요. 새 후보를 확인해 주세요.');await mutate(()=>api.update(session.id,{answers:[{field:a.field,ownerId,value}]}),'확인한 후보를 적용했어요');setReview(null);if(!saves.current.size)setBoardKey(a.field);}
 const questions=view.questions.filter(q=>q.ownerId===ownerId&&fields.some(f=>f.key===q.field));
 const first=new Set([...questions.map(q=>q.field),...runtime.resume.pendingActionFields,...fields.filter(f=>f.key==='turn'||runtimeBinding(pack,f.key)?.editor==='component-catalog').map(f=>f.key)]);
 const render=(field:FieldDefinition,subject=ownerId)=>{
  const accepted=session.assertions.filter(a=>a.field===field.key&&a.ownerId===subject&&a.status==='accepted').at(-1);
  const save=(value:Value)=>mutate(()=>api.update(session.id,{answers:[{field:field.key,ownerId:subject,value}]}));
  const ready=(fn:(()=>Promise<void>)|null)=>{if(fn)saves.current.set(`${subject??'public'}:${field.key}`,fn);else saves.current.delete(`${subject??'public'}:${field.key}`);};
  return runtimeBinding(pack,field.key)?.editor==='component-catalog'?<GenericComponents key={field.key} view={view} field={field} ownerId={subject} value={accepted?.value} onSave={save} busy={busy} onReadyToSave={ready} onEvidence={onEvidence}/>:<FieldEditor key={field.key} field={{...field,id:`essential-${subject??'public'}-${field.key}`,description:'',reason:generic?'':questions.find(q=>q.field===field.key)?.reason??''}} value={accepted?.value} busy={busy} onSave={save} onReadyToSave={ready}/>;
 };
function candidateView(a:Assertion){const f=fields.find(f=>f.key===a.field)!;const record=a.value&&typeof a.value==='object'&&!Array.isArray(a.value)&&a.value.version==='game-component-record-v1'?a.value as unknown as GenericRecord:null;
  if(!record)return <CandidateRow key={a.id} assertion={a} field={f} owner={ownerId?'내 기록':'공용'} busy={busy} onAccept={()=>fire(applyCandidate(a,a.value))} onEdit={value=>applyCandidate(a,value)} onEvidence={()=>{const e=session.evidence.find(e=>e.id===a.evidenceIds[0]);if(e)onEvidence(e,a.region);}}/>;
  const open=expanded.includes(a.id),limit=open?record.pieces.length:6,splendor=isSplendor(pack);
  return <article key={a.id}><strong>{f.label} · {record.pieces.length}항목</strong><span className="small muted">아직 기록에 적용하지 않았어요.</span>
   <div className={splendor?'generic-candidate-cards':'generic-candidate-pieces'}>{record.pieces.slice(0,limit).map(p=>splendor?<SplendorReadout key={p.id} {...splendorView(p)}/>:<div key={p.id}><GenericPieceArt pack={pack} piece={p}/><GameDetailReadout pack={pack} piece={p} players={session.players} compact/><span>{p.label||pack.runtime?.components.find(c=>c.id===p.componentId)?.name||'미확인'}</span><small>{p.quantity===null?'수량 모름':p.quantity+'개'}</small></div>)}</div>
   {record.pieces.length>6&&<button className="button text small-button" aria-expanded={open} onClick={()=>setExpanded(list=>open?list.filter(id=>id!==a.id):[...list,a.id])}>{open?'접기':`모두 보기 (${record.pieces.length})`}</button>}
   <button className="button primary small-button" disabled={busy} onClick={()=>setReview(a)}>후보 확인·수정</button></article>;}
 const items=session.preservations.filter(p=>p.ownerId===ownerId&&p.templateId.startsWith('spec.'));
 return <section className="game-essentials" aria-label="게임별 기록과 보관"><header><h3>{generic?'게임 기록':'이어갈 기록·보관'}</h3>{generic&&<p className="small muted">{recognitionCapability(pack).mode==='assisted'?'사진 보조 인식 · 확인 후 적용':'수동 기록 · 사진 관측 미지원'}</p>}</header>
  {candidates.length>0&&<section className="generic-candidates" aria-label="사진에서 찾은 후보"><h4>사진에서 찾은 후보 · {candidates.length}개 영역</h4>{candidates.map(a=>candidateView(a))}{olderCandidates.length>0&&<details className="generic-older"><summary>이전 후보 {olderCandidates.length}개</summary>{olderCandidates.map(a=>candidateView(a))}</details>}</section>}
  {questions.length>0&&<p className="essentials-ask">확인할 기록 {questions.length}개 · 모르면 비워 둬도 돼요.</p>}
  {ownerId&&generic&&<PublicBoardOverview view={view} busy={busy}/>}
  {activeBoard&&<>{boardFields.length>1&&<label className="gb-field-picker">기록 영역<select aria-label="기록 영역" value={activeBoard.key} disabled={busy} onChange={event=>{const next=event.target.value;void(async()=>{try{for(const save of [...saves.current.values()])await save();setBoardKey(next);setBoardError('');}catch(e){setBoardError(e instanceof Error?e.message:'먼저 저장해 주세요.');}})();}}>{boardFields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select></label>}{render(activeBoard)}</>}
  {boardError&&<p role="alert">{boardError}</p>}
  {fields.filter(f=>first.has(f.key)&&runtimeBinding(pack,f.key)?.editor!=='component-catalog').map(f=>render(f))}
  {fields.some(f=>!first.has(f.key))&&<details><summary>선택 기록 더 보기 +</summary>{fields.filter(f=>!first.has(f.key)).map(f=>render(f))}</details>}
  {!ownerId&&!session.room&&pack.fields.some(f=>f.scope==='player'&&f.visibility==='public'&&!!runtimeBinding(pack,f.key)&&(['scalar','component-catalog'].includes(runtimeBinding(pack,f.key)!.editor)||runtimeBinding(pack,f.key)!.editor==='native'&&f.type!=='json'))&&<details><summary>플레이어 공개 기록 +</summary>{session.players.map(player=><section key={player.id}><h4>{player.name}</h4>{pack.fields.filter(f=>f.scope==='player'&&f.visibility==='public'&&!!runtimeBinding(pack,f.key)&&(['scalar','component-catalog'].includes(runtimeBinding(pack,f.key)!.editor)||runtimeBinding(pack,f.key)!.editor==='native'&&f.type!=='json')).map(f=>render(f,player.id))}</section>)}</details>}
  {runtime.fieldBindings.some(b=>(b.editor==='physical-only'||b.editor==='opaque-preserve')&&b.scope===(ownerId?'player':'public'))&&<p className="small muted">입력할 수 없는 상태는 실물 그대로 보관하세요. 비밀 내용은 입력하지 않아요.</p>}
  {items.length>0&&<details open={generic}><summary>실물 보관·복원 {items.length}개</summary>{restoreOrder(items).map(item=><PreservationItem key={item.id} item={item} onReadyToSave={save=>{const key=`preservation:${item.id}`;if(save)saves.current.set(key,save);else saves.current.delete(key);}} owner={ownerId?session.players.find(p=>p.id===ownerId)?.name??'개인':'공용'} busy={busy} restoring={session.stage==='restore'} onChange={body=>mutate(()=>api.preservation(session.id,item.id,body))}/>)}</details>}
  {latestSnapshot(session,ownerId??'public')&&<details><summary>저장 기록 복원 +</summary><p className="small muted">{ownerId?'내 기록만 복원해요. 공개 기록과 다른 사람 기록은 그대로예요.':'공개 기록만 복원해요. 개인 기록은 그대로예요.'}</p><button className="button secondary small-button" disabled={busy} onClick={()=>fire((async()=>{for(const save of [...saves.current.values()])await save();await mutate(()=>api.resume(session.id,ownerId?'owner':'public',ownerId),'선택한 범위의 저장 기록을 열었어요');})())}>{ownerId?'내 저장 기록 복원':'공개 저장 기록 복원'}</button></details>}
  {review&&<Modal title="사진 후보 확인" wide onClose={()=>setReview(null)}><div className="modal-body"><p className="small muted">확인한 이 영역만 교체해요. 다른 기록은 그대로예요.</p><GenericComponents key={review.id} review view={view} field={fields.find(f=>f.key===review.field)!} ownerId={ownerId} value={review.value} onSave={value=>applyCandidate(review,value)} busy={busy} onEvidence={onEvidence}/></div></Modal>}
 </section>;
}

/** Repeated reads of the same photos for the same field: newest is shown by default (ties: later in the list); older ones stay available, never deleted. */
export function splitCandidates(list:readonly Assertion[]){
 const key=(a:Assertion)=>`${a.field}|${[...(a.evidenceIds??[])].sort().join(',')}`;
 const newer=(b:Assertion,a:Assertion)=>b.updatedAt>a.updatedAt||b.updatedAt===a.updatedAt&&list.indexOf(b)>list.indexOf(a);
 const latest=list.filter(a=>!list.some(b=>b!==a&&key(b)===key(a)&&newer(b,a)));
 return {latest,older:list.filter(a=>!latest.includes(a))};
}
function GenericComponents({view,field,ownerId,value,onSave,busy,onReadyToSave,onEvidence,review=false}:Omit<Props,'mutate'>&{field:FieldDefinition;value?:Value;onSave:(v:Value)=>Promise<void>;review?:boolean}){
 const incoming=value&&typeof value==='object'&&!Array.isArray(value)&&value.version==='game-component-record-v1'?value as unknown as GenericRecord:emptyGenericRecord();
 const opaque=value!=null&&!(typeof value==='object'&&!Array.isArray(value)&&value.version==='game-component-record-v1');
 const [scene,setScene]=useState(incoming),[base,setBase]=useState(JSON.stringify(incoming)),[mapping,setMapping]=useState<ArtMapping>();
 const [selected,setSelected]=useState<string>(),[message,setMessage]=useState('');
 const dirty=JSON.stringify(scene)!==base;
 useEffect(()=>{if(!dirty){setScene(incoming);setBase(JSON.stringify(incoming));}},[JSON.stringify(value)]);
 useEffect(()=>{let alive=true;loadArtMapping(view.pack.runtime!.source.gameId).then(m=>{if(alive)setMapping(m);},()=>{});return()=>{alive=false;};},[view.pack.id]);
 const conflict=genericDraftConflict(base,incoming,dirty);
 async function save(){if(!dirty&&!review)return;try{if(conflict)throw new Error('이 영역의 기록이 바뀌었어요. 초안은 유지됩니다. 최신 기록을 확인해 주세요.');await onSave(scene as unknown as Value);setBase(JSON.stringify(scene));setMessage('기록했어요');}catch(e){setMessage(e instanceof Error?e.message:'다시 저장해 주세요.');throw e;}}
 useEffect(()=>{onReadyToSave?.(dirty?save:null);return()=>onReadyToSave?.(null);});
 const binding=runtimeBinding(view.pack,field.key)!;
 const components=view.pack.runtime!.components.filter(c=>binding.componentIds.includes(c.id));
 const piece=scene.pieces.find(p=>p.id===selected);
 const patch=(change:Partial<GenericPiece>)=>setScene(s=>({...s,pieces:s.pieces.map(p=>p.id===selected?{...p,...change}:p)}));
 if(opaque)return <div><strong>{field.label}</strong><p className="small muted">기존 기록은 그대로 보존돼요. 여기서는 고칠 수 없어요.</p></div>;
 return <section className="generic-components" aria-label={field.label}><h4>{field.label}</h4>
 <GameBoardRecord pack={view.pack} fieldKey={field.key} record={scene} mapping={mapping} selected={selected} onSelect={setSelected} onChange={setScene} ownerColor={ownerId?view.session.players.find(p=>p.id===ownerId)?.color:undefined} busy={busy} onAdd={()=>{const id=crypto.randomUUID();setScene(s=>({...s,pieces:[...s.pieces,{id,componentId:null,variant:null,quantity:null,label:'',anchor:'',evidenceId:null,region:null}]}));setSelected(id);}} editor={piece&&<div className="generic-piece-edit"><label>구성물<select value={piece.componentId??''} disabled={busy} onChange={e=>{const id=e.target.value||null;patch(isSplendor(view.pack)?{...readoutForComponent(piece,id),variant:null}:{...readoutForGameComponent(view.pack,piece,id),variant:null});}}><option value="">모름</option>{components.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>대표 그림<select disabled={busy} value={piece.variant??''} onChange={e=>patch({variant:e.target.value||null})}><option value="">세부 모름</option>{mapping?.components.find(c=>c.component_id===piece.componentId)?.variants.map((v,i)=><option key={v.name} value={v.name}>{artVariantLabel(v,i)}</option>)}</select></label>{isSplendor(view.pack)?<><SplendorFields piece={piece} disabled={busy} onPatch={patch}/><details className="sr-original"><summary>원문 메모</summary><label>표시·확인한 내용<input value={piece.label} disabled={busy} onChange={e=>patch({label:e.target.value})}/></label></details></>:<label>표시·확인한 내용<input value={piece.label} disabled={busy} onChange={e=>patch({label:e.target.value})}/></label>}{readoutDefinition(view.pack)&&<GameDetailFields pack={view.pack} piece={piece} record={scene} players={view.session.players} disabled={busy} onPatch={patch}/>}<label>수량<input type="number" min="0" step="1" placeholder="모름" value={piece.quantity??''} disabled={busy} onChange={e=>patch({quantity:e.target.value===''?null:Number(e.target.value)})}/></label><label>사진 기준 위치·순서<input value={piece.anchor} disabled={busy} placeholder="예: 왼쪽 두 번째, 방향 그대로" onChange={e=>patch({anchor:e.target.value})}/></label><label>연결할 원본<select disabled={busy||!canRelinkReadoutEvidence(view.pack,piece)} value={piece.evidenceId??''} onChange={e=>patch({evidenceId:e.target.value||null,region:null})}><option value="">연결 없음</option>{view.session.evidence.filter(e=>field.visibility==='public'?e.scope==='public'&&!e.ownerId:e.scope==='public'&&!e.ownerId||e.ownerId===ownerId).map((e,i)=><option key={e.id} value={e.id}>{e.label||`원본 ${i+1}`}</option>)}</select>{!canRelinkReadoutEvidence(view.pack,piece)&&<small>판독값의 근거 원본을 유지해요. 다른 사진은 새 후보로 읽어 주세요.</small>}</label><div className="button-row"><button className="button secondary small-button" disabled={busy||scene.pieces[0].id===piece.id} onClick={()=>{setScene(s=>{const pieces=[...s.pieces],i=pieces.findIndex(p=>p.id===piece.id);[pieces[i-1],pieces[i]]=[pieces[i],pieces[i-1]];return {...s,pieces};});}}>앞으로</button><button className="button text small-button" disabled={busy} onClick={()=>{if(readoutReferrers(scene.pieces,piece.id).length){setMessage('연결된 부품이 있어요. 부착 대상을 먼저 고쳐 주세요.');return;}setScene(s=>({...s,pieces:s.pieces.filter(p=>p.id!==piece.id)}));setSelected(undefined);}}>삭제</button>{piece.evidenceId&&<button className="button text small-button" disabled={busy} onClick={()=>{const e=view.session.evidence.find(e=>e.id===piece.evidenceId);if(e)onEvidence(e,piece.region??undefined);}}>원본 보기</button>}</div></div>}/>
 <button className="button secondary small-button" disabled={busy||!dirty&&!review} onClick={()=>fire(save())}>{review?'이 후보 적용':'구성물 기록'}</button>{conflict&&<button className="button text small-button" disabled={busy} onClick={()=>{setScene(incoming);setBase(JSON.stringify(incoming));setMessage('최신 기록을 열었어요');}}>초안 버리고 최신 기록</button>}{message&&<p role="status">{message}</p>}</section>;
}
function PublicBoardOverview({view,busy}:{view:SessionView;busy:boolean}){
 const fields=view.pack.fields.filter(f=>f.scope==='public'&&f.visibility==='public'&&runtimeBinding(view.pack,f.key)?.editor==='component-catalog');
 const [key,setKey]=useState('');const field=preferredPublicBoard(fields,view.session,key);
 if(!field)return null;
 const value=view.session.assertions.filter(a=>a.field===field.key&&!a.ownerId&&a.status==='accepted').at(-1)?.value;
 const record=value&&typeof value==='object'&&!Array.isArray(value)&&value.version==='game-component-record-v1'?value as unknown as GenericRecord:null;
 return <details className="gb-public-overview"><summary>공용 기록</summary>{fields.length>1&&<select aria-label="공용 기록 영역" value={field.key} onChange={e=>setKey(e.target.value)}>{fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select>}{record?<GameBoardRecord pack={view.pack} fieldKey={field.key} record={record} busy={busy} readonly/>:<p>아직 기록한 구성물이 없어요.</p>}</details>;
}
