import '/Users/jeonggyuju/Project_folder/KeepBoard/src/styles.css';
import '/Users/jeonggyuju/Project_folder/KeepBoard/src/app-shell.css';
import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {GameBoardRecord} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/GameBoardRecord';
import {GameDetailReadout} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/readouts/GameDetailReadout';
import {GameDetailFields} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/readouts/GameDetailFields';
import {PhotoObservationOverlay} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/PhotoObservationOverlay';
import {loadGameData,gameDataFor} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/gameData';
import {useRealAssets} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/realBoards';
import {runtimeBinding} from '/Users/jeonggyuju/Project_folder/KeepBoard/shared/gameEssentials';
import {projectGenericDrawing} from '/Users/jeonggyuju/Project_folder/KeepBoard/shared/drawingProjection';
import {estimateBoardStructure} from '/Users/jeonggyuju/Project_folder/KeepBoard/shared/estimatedBoardStructure';
import {EstimatedBoardSummary} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/EstimatedBoardView';
import {requestedFaceProperties} from '/Users/jeonggyuju/Project_folder/KeepBoard/src/pieceFaceValues';
import './style.css';
const choices=[['sagrada','사그라다'],['seven-wonders','세븐 원더스'],['lost-cities','로스트 시티']];
function App(){
 const [id,setId]=useState('sagrada'),[dataset,setDataset]=useState('sagrada-medium'),[data,setData]=useState<any>(null),[original,setOriginal]=useState<any>(null),[error,setError]=useState(''),[selected,setSelected]=useState<string>(),[editing,setEditing]=useState(false);
 const assets=useRealAssets(data?.pack.runtime.source.gameId,'base',true);
 useEffect(()=>{let active=true;setData(null);setError('');setSelected(undefined);setEditing(false);fetch('./data/'+dataset+'.json').then(r=>{if(!r.ok)throw Error('저장된 결과를 열지 못했어요.');return r.json();}).then(async d=>{await loadGameData(d.pack);if(active){setData(d);setOriginal(d);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id,dataset]);
 const assertion=data?.assertions.find((a:any)=>a.value.pieces.some((p:any)=>p.id===selected)),piece=assertion?.value.pieces.find((p:any)=>p.id===selected),definition=data&&gameDataFor(data.pack)?.photo;
 const receipts=data?[...new Map(data.assertions.flatMap((a:any)=>a.observationReceipts??[]).map((r:any)=>[r.request.taskId,r])).values()]:[];
 const structure=data?estimateBoardStructure({gameId:data.pack.runtime.source.gameId,items:data.assertions.flatMap((a:any)=>projectGenericDrawing(a,a.value.pieces,data.photos,assets?.board)),assertions:data.assertions,evidence:data.photos}):null;
 const change=(assertionId:string,record:any)=>setData((d:any)=>({...d,assertions:d.assertions.map((a:any)=>a.id===assertionId?{...a,value:record}:a)}));
 const sourcePhoto=data?.photos.find((p:any)=>p.id===piece?.evidenceId)??data?.photos[0];
 return <main><header><h1>추정 복원판</h1><select aria-label="확인할 게임" value={id} onChange={e=>{const next=e.target.value;setData(null);setId(next);setDataset(next==='sagrada'?'sagrada-medium':next+'-baseline');}}>{choices.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><select aria-label="저장 응답 선택" value={dataset} onChange={e=>{setData(null);setDataset(e.target.value);}}><option value={id+'-baseline'}>기존 저장본</option>{id!=='seven-wonders'&&['high','medium','low'].map(e=><option key={e} value={id+'-'+e}>{e} 기존 응답 · 추정</option>)}</select><button onClick={()=>setEditing(!editing)}>{editing?'수정 닫기':'정정 시험'}</button></header>
 {error&&<p role="alert">{error}</p>}{!data&&!error&&<p>저장된 판을 여는 중…</p>}
 {data&&<>{structure&&<section className="review-overall"><strong>배치 {structure.metrics.placed}/{structure.metrics.total} · 읽힌 값 {structure.metrics.readKnown}/{structure.metrics.readTotal} · 오독 {structure.metrics.errorKnown===null?'미확인':structure.metrics.errorKnown}</strong><details><summary>영역별 집계 · 미분류 {structure.unassigned.length}개</summary><EstimatedBoardSummary structure={structure} scope="all"/></details></section>}<p className="review-notice">{dataset.endsWith('baseline')?'기존 저장본':'기존 '+dataset.split('-').at(-1)+' 응답 · 현재 코드로 추정'} · {editing?'화면에서만 임시 수정 중 (새로 열면 원본)':'정정 시험은 서버 저장·판독을 하지 않습니다.'}</p>
 {piece&&<section className="selected" aria-live="polite"><strong>{data.pack.runtime.components.find((c:any)=>c.id===piece.componentId)?.name??'구성물'}</strong><GameDetailReadout pack={data.pack} piece={piece} compact requestedPropertyIds={requestedFaceProperties(assertion,piece.id)}/><small>원 ID: {piece.id}</small></section>}
 <div className="board-comparison"><aside><h2>원사진</h2>{sourcePhoto&&<div className="original-frame"><img src={sourcePhoto.url} alt="같은 저장본의 원사진"/>{piece?.region&&piece.evidenceId===sourcePhoto.id&&<span aria-hidden style={{left:`${piece.region.x*100}%`,top:`${piece.region.y*100}%`,width:`${piece.region.width*100}%`,height:`${piece.region.height*100}%`}}/>}</div>}</aside>
 <div><h2>현재 값으로 복원 · 추정은 별도 표시</h2>{data.assertions.map((a:any)=><section key={a.id}><h3>{a.field==='__photo.public'?'공개 사진 속 실물 · 사람 미배정':runtimeBinding(data.pack,a.field)?.label??a.field}</h3><GameBoardRecord readonly={!editing} busy={false} pack={data.pack} fieldKey={a.field} record={a.value} assertion={a} allAssertions={data.assertions} evidence={data.photos} players={data.playerCount} selected={selected} onSelect={setSelected} onChange={editing?record=>change(a.id,record):undefined} editor={piece&&assertion?.id===a.id?<GameDetailFields pack={data.pack} piece={piece} record={a.value} players={[]} disabled={!editing} onPatch={patch=>change(a.id,{...a.value,pieces:a.value.pieces.map((p:any)=>p.id===piece.id?{...p,...patch}:p)})}/>:undefined}/></section>)}</div></div>
 {editing&&<button onClick={()=>{setData(original);setSelected(undefined);}}>원저장본 다시 보기</button>}
 <details className="raw-details"><summary>원관측과 사진 테두리 보기</summary>{receipts.map((r:any,i)=><PhotoObservationOverlay key={i} photos={data.photos} request={r.request} result={r.result} definition={definition!} transforms={r.transforms??[]} geometry={r.geometryCandidates??[]} open compact/>)}</details>
 <footer><details><summary>출처·추정·한계</summary><p>{data.provenance}</p><p>현재 제품의 보드·구성물 그림·정정 UI와 코드 추정을 사용합니다. 추정은 정식 칸/사람 소유/원관측이 아닙니다. 오독은 사람 정답 근거가 없으면 미확인입니다. 창문 패턴 미확인 칸은 중립 표시이며 장식 색무늬를 실제 패턴으로 사용하지 않습니다. 이 공유 화면은 새 업로드·판독·서버 저장을 하지 않습니다.</p></details></footer></>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
