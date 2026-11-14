import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Assertion,Evidence} from '../shared/types';
import type {DrawingItem} from '../shared/drawingProjection';
import {layoutDrawingItems,type DrawingLayout} from '../shared/drawingLayout';
import './photo-layout-board.css';

/** Display coordinates only. Selecting an item edits its original ID; this view never writes placement. */
export type PhotoLayoutItem=Pick<DrawingItem,'assertionId'|'pieceId'>&{position:Extract<DrawingItem['position'],{space:'photo'}>;contextKey?:string};
export const photoDrawingItems=(items:readonly DrawingItem[]):PhotoLayoutItem[]=>items.filter((item):item is DrawingItem&PhotoLayoutItem=>item.position.space==='photo');
/** Reference the fallback's source contexts only; keep deleted IDs within those contexts for row stability. */
export function photoFallbackReference(reference:readonly PhotoLayoutItem[],shown:readonly PhotoLayoutItem[],canonicalIds:ReadonlySet<string>,qualified=false){
 const context=(i:PhotoLayoutItem)=>JSON.stringify([i.assertionId,i.contextKey??null,i.position.evidenceId,i.position.sourceSHA]);
 const visibleContexts=new Set(shown.map(context));
 return reference.filter(i=>!canonicalIds.has(qualified?JSON.stringify([i.assertionId,i.pieceId]):i.pieceId)&&visibleContexts.has(context(i)));
}
/** Old photos may lack dimensions on Evidence, while their exact source receipt retains them. Display only. */
export function photoLayoutEvidence(assertions:readonly Assertion[],evidence:readonly Evidence[]):Evidence[]{
 return evidence.map(e=>{
  if(e.width&&e.height)return e;
  const sizes=assertions.flatMap(a=>(a.observationReceipts??[]).flatMap(r=>(r.request?.images??[]).filter(i=>i.evidenceId===e.id).map(i=>{
   const transform=(r.transforms??[]).find(t=>t.transformId===i.transformId&&t.inputSHA===i.sha256);
   return transform?.sourceDimensions??{width:i.width,height:i.height};
  }))).filter(d=>Number.isFinite(d.width)&&Number.isFinite(d.height)&&d.width>0&&d.height>0);
  const unique=[...new Map(sizes.map(d=>[`${d.width}:${d.height}`,d])).values()];
  return unique.length===1?{...e,...unique[0]}:e;
 });
}
export function visiblePhotoItems(items:readonly PhotoLayoutItem[],evidence:readonly Evidence[]){
 const key=(i:PhotoLayoutItem)=>JSON.stringify([i.assertionId,i.pieceId]),counts=new Map<string,number>();
 for(const i of items)counts.set(key(i),(counts.get(key(i))??0)+1);
 const sources=new Set(evidence.map(e=>e.id));
 return items.filter(item=>{const p=item.position;return !!p.box&&!!p.sourceSHA&&counts.get(key(item))===1&&sources.has(p.evidenceId)&&[p.box.x,p.box.y,p.box.width,p.box.height].every(Number.isFinite)&&p.box.x>=0&&p.box.y>=0&&p.box.width>0&&p.box.height>0&&p.box.x+p.box.width<=1.00000001&&p.box.y+p.box.height<=1.00000001;});
}
/** Reuses the source-outline presentation: full original pixels, one transparent outline, no labels over pixels. */
export function PhotoLayoutLocation({photo,box,label,onEvidence}:{photo:Evidence;box:PhotoLayoutItem['position']['box'];label:string;onEvidence?:(photo:Evidence,box:PhotoLayoutItem['position']['box'])=>void}){
 const width=Math.min(150,120*(photo.width&&photo.height?photo.width/photo.height:1));
 return <figure className="photo-layout-location"><button style={{width,flexBasis:width}} type="button" className="photo-layout-location-image" aria-label={label+' · 원사진 위치 보기'} disabled={!onEvidence} onClick={()=>onEvidence?.(photo,box)}><img src={photo.url} alt="선택한 실물의 원사진"/><span className="photo-layout-location-outline" aria-hidden="true" style={{left:`${box.x*100}%`,top:`${box.y*100}%`,width:`${box.width*100}%`,height:`${box.height*100}%`}}/></button><figcaption>{label}</figcaption></figure>;
}
export function PhotoLayoutBoard({items,evidence,renderItem,labelFor,onSelect,onEvidence,disabled=false,selected,renderGroup,tileSize,referenceItems=[],selectedRef,onSelectRef,renderTile,labelForRef}:{
 labelForRef?:(ref:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>)=>string;selectedRef?:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>;onSelectRef?:(ref:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>)=>void;renderTile?:(item:PhotoLayoutItem)=>ReactNode;
 referenceItems?:readonly PhotoLayoutItem[];items:readonly PhotoLayoutItem[];evidence:readonly Evidence[];renderItem:(id:string)=>ReactNode;labelFor:(id:string)=>string;
 onSelect?:(id:string)=>void;onEvidence?:(photo:Evidence,box?:PhotoLayoutItem['position']['box'])=>void;disabled?:boolean;selected?:string;renderGroup?:(ids:readonly string[],select:(id:string)=>void)=>ReactNode;tileSize?:{width:number;height:number};
}){
 const [choice,setChoice]=useState(''),[picked,setPicked]=useState<Pick<PhotoLayoutItem,'assertionId'|'pieceId'>|null>(null),references=useRef(new Map<string,DrawingLayout>());
 const valid=visiblePhotoItems(items,evidence),sources=[...new Set(valid.map(i=>i.position.evidenceId+'\u0000'+i.position.sourceSHA))];
 const key=sources.includes(choice)?choice:sources[0],shown=valid.filter(i=>i.position.evidenceId+'\u0000'+i.position.sourceSHA===key),photo=evidence.find(e=>e.id===shown[0]?.position.evidenceId);
 const rowPans=useRef(new Map<number,HTMLDivElement>());
 // One initial view per mounted photo. Editing/rerendering never resets a user's pan.
 useEffect(()=>{if(!photo)return;for(const pan of rowPans.current.values()){const x=Number(pan.dataset.firstPieceX);if(Number.isFinite(x))pan.scrollLeft=Math.max(0,x-8);}},[key]);
 if(!photo||!shown.length)return null;
 const aspect=photo.width&&photo.height?photo.width/photo.height:1,referenceKey=key+'\u0000'+aspect;
 const options={tileWidth:tileSize?.width??56,tileHeight:tileSize?.height??76,sourceAspectRatio:aspect};
 const sourceReference=visiblePhotoItems(referenceItems,evidence).filter(i=>i.position.evidenceId+'\u0000'+i.position.sourceSHA===key);
 const stableReference=sourceReference.length?layoutDrawingItems(sourceReference,options):references.current.get(referenceKey);
 const layout=layoutDrawingItems(shown,{...options,reference:stableReference});
 // Receipts rebuild the same reference on every mount. The cache is only a legacy fallback.
 if(!references.current.has(referenceKey))references.current.set(referenceKey,layout);
 const same=(a:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>,b:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>)=>a.assertionId===b.assertionId&&a.pieceId===b.pieceId;
 const selection=shown.find(i=>selectedRef?same(i,selectedRef):selected?i.pieceId===selected:picked?same(i,picked):false),selectRef=(ref:Pick<PhotoLayoutItem,'assertionId'|'pieceId'>)=>{setPicked(ref);if(onSelectRef)onSelectRef({assertionId:ref.assertionId,pieceId:ref.pieceId});else onSelect?.(ref.pieceId);},select=(id:string)=>{const item=shown.find(i=>i.pieceId===id);if(item)selectRef(item);};
 return <section className="photo-layout-board" aria-label="사진 배열 그림">
  <header><strong>사진 속 배열</strong>{sources.length>1&&<select aria-label="배열 원사진" value={key} onChange={e=>setChoice(e.target.value)}>{sources.map((source,i)=><option key={source} value={source}>원사진 {i+1}</option>)}</select>}{onEvidence&&<button type="button" className="button text small-button" onClick={()=>onEvidence(photo)}>원사진</button>}</header>
  <span className="photo-layout-hint">사진 줄 · 배열 추정</span>
  {selection&&<PhotoLayoutLocation photo={photo} box={selection.position.box} label={labelForRef?.(selection)??labelFor(selection.pieceId)} onEvidence={onEvidence}/>}
  <div className="photo-layout-rows" aria-label="사진 구성물 가로·세로로 밀어 보기">
   {layout.rows.map((row,index)=><div key={row.id} ref={node=>{if(node)rowPans.current.set(index,node);else rowPans.current.delete(index);}} data-first-piece-x={Math.min(...layout.tiles.filter(item=>row.groupIds.includes(item.groupId)).map(item=>item.rect.x))} className="photo-layout-row-pan" tabIndex={0} aria-label={`사진 줄 ${index+1} · 가로로 밀어 보기`}><div className="photo-layout-canvas" style={{width:row.rect.width,height:row.rect.height}}>
    {layout.groups.filter(group=>row.groupIds.includes(group.id)).map(group=><div key={group.id} className="photo-layout-group" data-layout-basis={group.basis} style={{left:group.rect.x,top:group.rect.y-row.rect.y,width:group.rect.width,height:group.rect.height}}>{renderGroup?.(group.members.map(m=>m.pieceId),select)}</div>)}
    {!renderGroup&&layout.tiles.filter(item=>row.groupIds.includes(item.groupId)).map(item=>renderTile?<div key={item.assertionId+':'+item.pieceId} className="photo-layout-piece" style={{left:item.rect.x,top:item.rect.y-row.rect.y,width:item.rect.width,height:item.rect.height}}>{renderTile(shown.find(i=>same(i,item))!)}</div>:<button type="button" key={item.assertionId+':'+item.pieceId} data-drawing-piece={item.pieceId} data-assertion-id={item.assertionId} className={'photo-layout-piece'+(!!selection&&same(selection,item)?' selected':'')} aria-label={labelForRef?.(item)??labelFor(item.pieceId)} aria-pressed={!!selection&&same(selection,item)} disabled={disabled} onClick={()=>selectRef(item)} style={{left:item.rect.x,top:item.rect.y-row.rect.y,width:item.rect.width,height:item.rect.height}}>{renderItem(item.pieceId)}</button>)}
   </div></div>)}
  </div>
 </section>;
}
