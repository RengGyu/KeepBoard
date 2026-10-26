import React from 'react';
import {createRoot} from 'react-dom/client';
import {GameComponentArt} from '../../../src/GameComponentArt';
import {resolveArt,type ArtMapping} from '../../../src/artResolver';
import './preview.css';
const data=await(await fetch('./preview-data.json')).json();
const red='#bc6048',blue='#3978bd';
async function capture(){
 const rows=Array.from(document.querySelectorAll<HTMLElement>('article[data-finding]'));
 const content=rows.map((row,i)=>{
  const x=28+i%4*352,y=84+Math.floor(i/4)*232;
  const svgs=Array.from(row.querySelectorAll<SVGSVGElement>('[data-sheet] svg')).slice(0,4).map((svg,j)=>new XMLSerializer().serializeToString(svg).replace('<svg ',`<svg x="${x+j*78}" y="${y+64}" `)).join('');
  const name=row.dataset.finding+' '+row.dataset.game;
  return `<g><text x="${x}" y="${y+20}" font-size="14">${name}</text><text x="${x}" y="${y+44}" font-size="12">이전 / 고정색 / 소유색 또는 다른 유형</text>${svgs}</g>`;
 }).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1280"><rect width="1440" height="1280" fill="#f8f5eb"/><g fill="#33483c" font-family="sans-serif"><text x="28" y="42" font-size="25">F001–F020 · 실제 GameComponentArt 합성 렌더</text>${content}<text x="28" y="1260" font-size="13">실물/제품 화면이 아닌 교정 대표형 · 모든 카드/수량/인식 정확도 보증 아님</text></g></svg>`;
 await fetch('/__art-capture/svg',{method:'POST',body:svg});
 const im=new Image();im.src=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));await im.decode();
 const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=1280;canvas.getContext('2d')!.drawImage(im,0,0);URL.revokeObjectURL(im.src);
 const res=await fetch('/__art-capture/contact',{method:'POST',body:canvas.toDataURL('image/png')});
 if(!res.ok)throw new Error(await res.text());document.querySelector('#saved')!.textContent='대표 PNG 저장 완료';
}
function App(){return <main><header><h1>F001–F020 아트 교정</h1><p>실제 <code>GameComponentArt</code>를 사용한 합성 그림 검수입니다. 실제 사용자 기록·AI·제품 서버에 연결하지 않습니다.</p><button onClick={()=>capture().catch(e=>{document.querySelector('#saved')!.textContent=String(e);})}>대표 PNG 저장</button><span id="saved" role="status"/></header><div className="groups">{data.map((r:any)=>{
 const c=r.mapping.components.find((c:any)=>c.component_id===r.componentId);
 const known=c.variants.filter((v:any)=>!v.unresolved);const before=r.before.components[0].variants[0];
 const mixed=known.find((v:any)=>v.color_role==='owner')??known[1]??known[0];
 const items=[{v:before,m:r.before,color:red},{v:known[0],m:r.mapping,color:red},{v:known[0],m:r.mapping,color:blue},{v:mixed,m:r.mapping,color:blue}];
 return <article key={r.findingId} data-finding={r.findingId} data-game={r.gameId}><h2>{r.findingId} {r.gameId}</h2><p>{r.componentId}</p><div className="compare" data-sheet>{items.map(({v,m,color},i)=><figure key={i}><GameComponentArt game={r.gameId} mapping={m} componentId={r.componentId} kind={c.kind} variant={v.name} color={color} size={64}/><figcaption>{i===0?'이전: ':''}{v.name}<br/>{color}</figcaption></figure>)}</div><details open><summary>정확 유형 {known.length}개 / 기존 미확인 {c.variants.filter((v:any)=>v.unresolved).length}개</summary><div className="variants">{known.map((v:any)=><figure key={v.name}><GameComponentArt game={r.gameId} mapping={r.mapping} componentId={r.componentId} kind={c.kind} variant={v.name} color={blue} size={64}/><figcaption>{v.name}</figcaption></figure>)}</div></details><p className="checks">{known.every((v:any)=>v.color_role!=='fixed-semantic'||resolveArt(r.mapping,{componentId:r.componentId,variant:v.name,color:red}).color===resolveArt(r.mapping,{componentId:r.componentId,variant:v.name,color:blue}).color)?'고정 유형색 두 소유색 입력 동일':'색 검사 실패'}</p></article>;
 })}</div></main>}
createRoot(document.getElementById('root')!).render(<App/>);
